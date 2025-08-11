-- Create roles enum and user_roles table
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('citizen','officer','admin');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id AND ur.role = _role
  );
$$;

-- Basic RLS policies for user_roles
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Admins can manage roles (example policy, adjust as needed)
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Reports table to store citizen issues
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_status') THEN
    CREATE TYPE public.report_status AS ENUM ('open','resolved');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL,
  description text NOT NULL,
  image_url text,
  latitude double precision,
  longitude double precision,
  address text,
  status public.report_status NOT NULL DEFAULT 'open',
  resolved_image_url text,
  resolved_remark text,
  rating int CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
  citizen_remark text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Updated_at trigger function (idempotent)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger
DROP TRIGGER IF EXISTS update_reports_updated_at ON public.reports;
CREATE TRIGGER update_reports_updated_at
BEFORE UPDATE ON public.reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Policies for reports
DROP POLICY IF EXISTS "Citizens can insert their own reports" ON public.reports;
CREATE POLICY "Citizens can insert their own reports"
ON public.reports
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid() AND public.has_role(auth.uid(), 'citizen')
);

DROP POLICY IF EXISTS "Citizens can view their own reports" ON public.reports;
CREATE POLICY "Citizens can view their own reports"
ON public.reports
FOR SELECT
TO authenticated
USING (created_by = auth.uid());

DROP POLICY IF EXISTS "Officers can view all reports" ON public.reports;
CREATE POLICY "Officers can view all reports"
ON public.reports
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'officer') OR public.has_role(auth.uid(), 'admin')
);

-- Citizens can update only feedback fields on their own reports
DROP POLICY IF EXISTS "Citizens can rate resolved reports" ON public.reports;
CREATE POLICY "Citizens can rate resolved reports"
ON public.reports
FOR UPDATE
TO authenticated
USING (created_by = auth.uid())
WITH CHECK (
  created_by = auth.uid()
  AND NEW.description IS NOT DISTINCT FROM OLD.description
  AND NEW.image_url IS NOT DISTINCT FROM OLD.image_url
  AND NEW.latitude IS NOT DISTINCT FROM OLD.latitude
  AND NEW.longitude IS NOT DISTINCT FROM OLD.longitude
  AND NEW.address IS NOT DISTINCT FROM OLD.address
  AND NEW.status IS NOT DISTINCT FROM OLD.status
  AND NEW.resolved_image_url IS NOT DISTINCT FROM OLD.resolved_image_url
  AND NEW.resolved_remark IS NOT DISTINCT FROM OLD.resolved_remark
);

-- Officers can resolve reports (restrict updates to status/resolution fields)
DROP POLICY IF EXISTS "Officers can resolve reports" ON public.reports;
CREATE POLICY "Officers can resolve reports"
ON public.reports
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'officer') OR public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  (public.has_role(auth.uid(), 'officer') OR public.has_role(auth.uid(), 'admin'))
  AND NEW.created_by IS NOT DISTINCT FROM OLD.created_by
  AND NEW.description IS NOT DISTINCT FROM OLD.description
  AND NEW.image_url IS NOT DISTINCT FROM OLD.image_url
  AND NEW.latitude IS NOT DISTINCT FROM OLD.latitude
  AND NEW.longitude IS NOT DISTINCT FROM OLD.longitude
  AND NEW.address IS NOT DISTINCT FROM OLD.address
  AND NEW.rating IS NOT DISTINCT FROM OLD.rating
  AND NEW.citizen_remark IS NOT DISTINCT FROM OLD.citizen_remark
  AND (
    -- Transition to resolved requires proof
    (NEW.status = 'resolved' AND OLD.status <> 'resolved' AND NEW.resolved_image_url IS NOT NULL AND COALESCE(length(NEW.resolved_remark),0) > 0)
    OR
    -- Already resolved: allow further edits to resolution fields
    (NEW.status = 'resolved' AND OLD.status = 'resolved')
    OR
    -- No change to resolution fields or status
    (NEW.status IS NOT DISTINCT FROM OLD.status AND NEW.resolved_image_url IS NOT DISTINCT FROM OLD.resolved_image_url AND NEW.resolved_remark IS NOT DISTINCT FROM OLD.resolved_remark)
  )
);

-- Storage bucket for report images
INSERT INTO storage.buckets (id, name, public)
VALUES ('reports', 'reports', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public can view report images'
  ) THEN
    -- do nothing
  ELSE
    CREATE POLICY "Public can view report images"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'reports');
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated users can upload to their folder (reports)'
  ) THEN
    -- do nothing
  ELSE
    CREATE POLICY "Authenticated users can upload to their folder (reports)"
    ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
      bucket_id = 'reports' AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated users can update their files (reports)'
  ) THEN
    -- do nothing
  ELSE
    CREATE POLICY "Authenticated users can update their files (reports)"
    ON storage.objects
    FOR UPDATE TO authenticated
    USING (
      bucket_id = 'reports' AND auth.uid()::text = (storage.foldername(name))[1]
    )
    WITH CHECK (
      bucket_id = 'reports' AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;
END $$;

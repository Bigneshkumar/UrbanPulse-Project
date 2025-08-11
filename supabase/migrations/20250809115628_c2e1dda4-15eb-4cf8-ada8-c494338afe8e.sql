-- Create roles enum and user_roles table (idempotent)
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

DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Reports table
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

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_reports_updated_at ON public.reports;
CREATE TRIGGER update_reports_updated_at
BEFORE UPDATE ON public.reports
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Validation trigger to restrict updates based on roles
CREATE OR REPLACE FUNCTION public.validate_reports_update()
RETURNS TRIGGER AS $$
DECLARE
  is_officer boolean := public.has_role(auth.uid(), 'officer') OR public.has_role(auth.uid(), 'admin');
BEGIN
  IF is_officer THEN
    -- Officers can only change status and resolution fields
    IF (NEW.created_by IS DISTINCT FROM OLD.created_by
        OR NEW.description IS DISTINCT FROM OLD.description
        OR NEW.image_url IS DISTINCT FROM OLD.image_url
        OR NEW.latitude IS DISTINCT FROM OLD.latitude
        OR NEW.longitude IS DISTINCT FROM OLD.longitude
        OR NEW.address IS DISTINCT FROM OLD.address
        OR NEW.rating IS DISTINCT FROM OLD.rating
        OR NEW.citizen_remark IS DISTINCT FROM OLD.citizen_remark) THEN
      RAISE EXCEPTION 'Officers can only update status, resolved_image_url and resolved_remark';
    END IF;

    -- Transition to resolved requires both image and remark
    IF (NEW.status = 'resolved' AND OLD.status <> 'resolved') THEN
      IF NEW.resolved_image_url IS NULL OR COALESCE(length(NEW.resolved_remark),0) = 0 THEN
        RAISE EXCEPTION 'Resolving requires an image and a remark';
      END IF;
    END IF;

  ELSIF (auth.uid() = OLD.created_by) THEN
    -- Citizens can only change rating and citizen_remark
    IF (NEW.description IS DISTINCT FROM OLD.description
        OR NEW.image_url IS DISTINCT FROM OLD.image_url
        OR NEW.latitude IS DISTINCT FROM OLD.latitude
        OR NEW.longitude IS DISTINCT FROM OLD.longitude
        OR NEW.address IS DISTINCT FROM OLD.address
        OR NEW.status IS DISTINCT FROM OLD.status
        OR NEW.resolved_image_url IS DISTINCT FROM OLD.resolved_image_url
        OR NEW.resolved_remark IS DISTINCT FROM OLD.resolved_remark) THEN
      RAISE EXCEPTION 'Citizens can only update rating and remark on their own reports';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_reports_update_trigger ON public.reports;
CREATE TRIGGER validate_reports_update_trigger
BEFORE UPDATE ON public.reports
FOR EACH ROW EXECUTE FUNCTION public.validate_reports_update();

-- RLS policies (simplified; triggers enforce column restrictions)
DROP POLICY IF EXISTS "Citizens can insert their own reports" ON public.reports;
CREATE POLICY "Citizens can insert their own reports"
ON public.reports
FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid() AND public.has_role(auth.uid(), 'citizen'));

DROP POLICY IF EXISTS "Citizens can view their own reports" ON public.reports;
CREATE POLICY "Citizens can view their own reports"
ON public.reports
FOR SELECT TO authenticated
USING (created_by = auth.uid());

DROP POLICY IF EXISTS "Officers can view all reports" ON public.reports;
CREATE POLICY "Officers can view all reports"
ON public.reports
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'officer') OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Citizens can update their own reports (feedback only)" ON public.reports;
CREATE POLICY "Citizens can update their own reports (feedback only)"
ON public.reports
FOR UPDATE TO authenticated
USING (created_by = auth.uid());

DROP POLICY IF EXISTS "Officers can update any report (resolution only)" ON public.reports;
CREATE POLICY "Officers can update any report (resolution only)"
ON public.reports
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'officer') OR public.has_role(auth.uid(), 'admin'));

-- Storage bucket for images
INSERT INTO storage.buckets (id, name, public)
VALUES ('reports', 'reports', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for reports bucket
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public can view report images'
  ) THEN
    CREATE POLICY "Public can view report images"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'reports');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated users can upload to their folder (reports)'
  ) THEN
    CREATE POLICY "Authenticated users can upload to their folder (reports)"
    ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'reports' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated users can update their files (reports)'
  ) THEN
    CREATE POLICY "Authenticated users can update their files (reports)"
    ON storage.objects
    FOR UPDATE TO authenticated
    USING (bucket_id = 'reports' AND auth.uid()::text = (storage.foldername(name))[1])
    WITH CHECK (bucket_id = 'reports' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
END $$;

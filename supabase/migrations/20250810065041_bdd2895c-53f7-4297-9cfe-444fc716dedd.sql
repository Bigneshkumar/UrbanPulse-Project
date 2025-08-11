-- Fix function search_path warnings by setting explicit search_path
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id AND ur.role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public;

CREATE OR REPLACE FUNCTION public.validate_reports_update()
RETURNS TRIGGER AS $$
DECLARE
  is_officer boolean := public.has_role(auth.uid(), 'officer') OR public.has_role(auth.uid(), 'admin');
BEGIN
  IF is_officer THEN
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
    IF (NEW.status = 'resolved' AND OLD.status <> 'resolved') THEN
      IF NEW.resolved_image_url IS NULL OR COALESCE(length(NEW.resolved_remark),0) = 0 THEN
        RAISE EXCEPTION 'Resolving requires an image and a remark';
      END IF;
    END IF;
  ELSIF (auth.uid() = OLD.created_by) THEN
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
$$ LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public;
-- Create auth functions
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $func$
SELECT (current_setting('request.jwt.claims', true)::json->>'sub')::uuid;
$func$;

CREATE OR REPLACE FUNCTION auth.role()
RETURNS text
LANGUAGE sql
STABLE
AS $func$
SELECT current_setting('request.jwt.claims', true)::json->>'role';
$func$;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION auth.role() TO authenticated, anon; 
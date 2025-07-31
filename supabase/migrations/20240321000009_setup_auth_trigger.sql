-- Create auth trigger function
CREATE OR REPLACE FUNCTION auth.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
BEGIN
    INSERT INTO public.profiles (id, username, full_name, timezone, time_format, subscription_plan, subscription_status, preferred_session_length, onboard_complete, show_splash)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
        'UTC',
        '12h',
        'MiKare Health - free plan',
        'inactive',
        30,
        false,
        true
    );
    RETURN NEW;
END;
$func$;

-- Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION auth.handle_new_user();

-- Grant permissions on trigger function
GRANT EXECUTE ON FUNCTION auth.handle_new_user() TO authenticated, anon; 
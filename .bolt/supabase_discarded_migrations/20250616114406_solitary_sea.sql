/*
  # Step 2: Update Demo User with Correct Password Hash
  
  Replace 'REPLACE_WITH_ACTUAL_HASH_FROM_TEMP_USER' with the encrypted_password 
  value you copied from the temp-hash-user@example.com user in step 1.
  
  IMPORTANT: Make sure to replace the placeholder with the actual hash!
*/

-- Update the demo user with the correct password hash
-- REPLACE 'REPLACE_WITH_ACTUAL_HASH_FROM_TEMP_USER' with the actual hash from step 1
UPDATE auth.users 
SET 
  encrypted_password = 'REPLACE_WITH_ACTUAL_HASH_FROM_TEMP_USER',
  email_confirmed_at = now(),
  updated_at = now()
WHERE email = 'demo@example.com';

-- Verify the update was successful
SELECT 
  id, 
  email, 
  email_confirmed_at,
  created_at,
  updated_at,
  CASE 
    WHEN encrypted_password LIKE '$2a$%' OR encrypted_password LIKE '$2b$%' 
    THEN 'Valid bcrypt hash' 
    ELSE 'Invalid hash format' 
  END as hash_status
FROM auth.users 
WHERE email = 'demo@example.com';

-- Also verify the profile exists
SELECT 
  id,
  username,
  full_name,
  timezone
FROM public.profiles 
WHERE id = (SELECT id FROM auth.users WHERE email = 'demo@example.com');

SELECT 'Demo user password hash updated successfully!' as message;
/*
  # Step 3: Clean Up Temporary User
  
  This script removes the temporary user that was created to get the password hash.
  Run this after successfully updating the demo user in step 2.
*/

-- Remove the temporary user
DELETE FROM auth.users 
WHERE email = 'temp-hash-user@example.com';

-- Verify cleanup
SELECT 
  COUNT(*) as temp_user_count,
  CASE 
    WHEN COUNT(*) = 0 THEN 'Temporary user successfully removed'
    ELSE 'Temporary user still exists'
  END as cleanup_status
FROM auth.users 
WHERE email = 'temp-hash-user@example.com';

-- Final verification that demo user is ready
SELECT 
  'Demo user is ready for login' as status,
  email,
  email_confirmed_at IS NOT NULL as email_confirmed,
  CASE 
    WHEN encrypted_password LIKE '$2a$%' OR encrypted_password LIKE '$2b$%' 
    THEN 'Valid hash' 
    ELSE 'Invalid hash' 
  END as password_status
FROM auth.users 
WHERE email = 'demo@example.com';

SELECT 'Cleanup completed successfully!' as message;
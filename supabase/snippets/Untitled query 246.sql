SELECT
  id,
  email,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change_token_current,
  phone_change_token,
  reauthentication_token
FROM auth.users
WHERE email = 'alice@acme.com';
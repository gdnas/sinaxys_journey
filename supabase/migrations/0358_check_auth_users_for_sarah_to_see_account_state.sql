SELECT id, email, raw_user_meta_data, created_at, last_sign_in_at, email_confirmed_at, phone, confirmation_sent_at
FROM auth.users
WHERE email = 'sarah.tartarini@sinaxys.com';
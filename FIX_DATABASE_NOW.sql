-- RUN THIS IN YOUR RAILWAY DATABASE

-- Step 1: Check current users
SELECT id, email, company_name, client_type FROM users WHERE client_type = 'insurance';

-- Step 2: Update Joban user (REPLACE 'joban@example.com' with your actual Joban user email)
UPDATE users 
SET company_name = 'Joban Putra Insurance' 
WHERE email = 'YOUR_JOBAN_EMAIL_HERE@example.com';

-- Step 3: Update KMG user (REPLACE 'kmg@example.com' with your actual KMG user email)
UPDATE users 
SET company_name = 'KMG Insurance' 
WHERE email = 'YOUR_KMG_EMAIL_HERE@example.com';

-- Step 4: Verify the changes
SELECT id, email, company_name, client_type FROM users WHERE client_type = 'insurance';

-- You should see:
-- email                    | company_name
-- joban@example.com        | Joban Putra Insurance
-- kmg@example.com          | KMG Insurance

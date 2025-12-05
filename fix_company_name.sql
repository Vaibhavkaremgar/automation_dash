-- Check current company_name for insurance users
SELECT id, email, company_name, client_type FROM users WHERE client_type = 'insurance';

-- Fix Joban Putra user (UPDATE THE EMAIL TO MATCH YOUR JOBAN USER)
UPDATE users 
SET company_name = 'Joban Putra Insurance' 
WHERE client_type = 'insurance' 
AND (email LIKE '%joban%' OR company_name LIKE '%joban%');

-- Fix KMG user (UPDATE THE EMAIL TO MATCH YOUR KMG USER)
UPDATE users 
SET company_name = 'KMG Insurance' 
WHERE client_type = 'insurance' 
AND (email LIKE '%kmg%' OR company_name LIKE '%kmg%');

-- Verify the changes
SELECT id, email, company_name, client_type FROM users WHERE client_type = 'insurance';

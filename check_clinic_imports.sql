SELECT clinic_id, COUNT(*) as total, bank_account_id 
FROM conciliation_bank_statements 
GROUP BY clinic_id, bank_account_id 
ORDER BY total DESC;

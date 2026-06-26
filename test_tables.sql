SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND (
  table_name LIKE '%invoice%' 
  OR table_name LIKE '%receivable%' 
  OR table_name LIKE '%payable%' 
  OR table_name LIKE '%bill%'
)
ORDER BY table_name;

-- Run once against each environment after deploying Customer Management Write.
-- It creates the capability and preserves existing Customer Management users' current write access.
WITH inserted_function AS (
  INSERT INTO access_function (access_function_name, created_date, updated_date)
  SELECT 'Customer_Management_Write', NOW(), NOW()
  WHERE NOT EXISTS (
    SELECT 1 FROM access_function WHERE access_function_name = 'Customer_Management_Write'
  )
  RETURNING access_function_id
), write_function AS (
  SELECT access_function_id FROM inserted_function
  UNION ALL
  SELECT access_function_id FROM access_function WHERE access_function_name = 'Customer_Management_Write'
  LIMIT 1
), customer_view_function AS (
  SELECT access_function_id FROM access_function WHERE access_function_name = 'Customer_Management' LIMIT 1
)
INSERT INTO access_function_role (access_function_id, role_id)
SELECT write_function.access_function_id, existing.role_id
FROM write_function
CROSS JOIN customer_view_function
JOIN access_function_role existing ON existing.access_function_id = customer_view_function.access_function_id
ON CONFLICT (access_function_id, role_id) DO NOTHING;

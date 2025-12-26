-- Query FieldMappingConfigVersion
SELECT orgId, version, substr(payload, 1, 500) as payload_preview 
FROM FieldMappingConfigVersion 
ORDER BY version DESC 
LIMIT 1;


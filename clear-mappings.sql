-- Clear all field mapping versions
DELETE FROM FieldMappingConfigVersion;
SELECT 'Deleted ' || changes() || ' rows';


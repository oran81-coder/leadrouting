-- Check what's in LeadFact table
SELECT 
  boardId,
  itemId,
  assignedUserId,
  industry,
  dealAmount,
  statusValue,
  enteredAt
FROM LeadFact
ORDER BY enteredAt DESC
LIMIT 10;


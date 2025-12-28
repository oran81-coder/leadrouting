-- Create default organization for development
INSERT INTO Organization (
  id, 
  name, 
  displayName, 
  email, 
  isActive, 
  tier, 
  subscriptionStatus,
  createdAt, 
  updatedAt
) VALUES (
  'org_1',
  'Default Organization',
  'Default Organization',
  'admin@example.com',
  1,
  'standard',
  'active',
  datetime('now'),
  datetime('now')
);


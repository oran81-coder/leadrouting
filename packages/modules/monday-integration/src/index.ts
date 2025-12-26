// monday-integration module entry
export const monday_integration = true;
export * from './application/monday.extractors';
export * from './infrastructure/monday.client';
export * from './application/monday.clientFactory';
export * from './application/monday.writeback';
export * from './application/monday.people';
export * from './infrastructure/mondayUserCache.repo';
export * from './infrastructure/mondayCredential.repo';
export * from './application/monday.orgClient';
export * from './infrastructure/industryWatch.repo';

// Phase 2: Real-time Integration
export * from './application/monday.webhooks';
export * from './application/leadIntake.handler';

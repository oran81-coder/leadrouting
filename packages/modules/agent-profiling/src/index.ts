// agent-profiling module entry
export const agent_profiling = true;

// Export Agent Profiler
export {
  calculateAgentProfile,
  calculateAllAgentProfiles,
  getProfileSummary,
  isAgentEligible,
  compareAgents,
  type AgentProfile,
  type AgentProfilerConfig,
} from './application/agentProfiler';

// Export Agent Domain Learner
export {
  calculateAgentDomainProfile,
  calculateBulkAgentProfiles,
  getTopDomains,
  getDomainExpertise,
  findBestAgentsByDomain,
  getAgentDomainSummary,
  type AgentDomainProfile,
  type DomainExpertise,
} from './application/agentDomain.learner';

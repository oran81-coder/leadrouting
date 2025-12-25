/**
 * Decision Engine (Phase 1)
 * 
 * Routes leads through manual approval or auto-assign based on configuration.
 * Handles proposal creation, manager actions, and fallback behavior.
 */

import type { AgentProfile } from "../../../../agent-profiling/src/application/agentProfiler";
import type { NormalizedLead } from "../../../rule-engine/src/contracts/scoring.types";
import type { ScoringResult, AgentScore } from "../../../scoring/src/application/scoring.engine";
import type { RoutingExplanation } from "../../../explainability/src/application/explainer";
import { generateRoutingExplanation } from "../../../explainability/src/application/explainer";

/**
 * Routing proposal statuses
 */
export type ProposalStatus = 
  | "PENDING"           // Waiting for manager approval
  | "APPROVED"          // Manager approved
  | "REJECTED"          // Manager rejected
  | "OVERRIDDEN"        // Manager selected different agent
  | "APPLIED"           // Assignment written to Monday
  | "WRITEBACK_FAILED"  // Monday writeback failed
  | "EXPIRED";          // Proposal expired (timeout)

/**
 * Decision modes
 */
export type DecisionMode = 
  | "manual"            // Always requires manager approval
  | "auto"              // Auto-assign if score meets threshold
  | "hybrid";           // Auto for high-confidence, manual for low

/**
 * Routing proposal (stored in database)
 */
export interface RoutingProposal {
  id: string;
  orgId: string;
  
  // Lead info
  leadId: string;
  leadName?: string;
  boardId: string;
  itemId: string;
  
  // Recommended assignment
  recommendedAgentUserId: string;
  recommendedAgentName?: string;
  recommendedScore: number;
  confidence: "high" | "medium" | "low";
  
  // Alternatives
  alternativeAgents: Array<{
    agentUserId: string;
    agentName?: string;
    score: number;
  }>;
  
  // Explanation
  explanation: RoutingExplanation;
  
  // Decision
  status: ProposalStatus;
  decisionMode: DecisionMode;
  autoApplied: boolean;
  
  // Manager actions
  approvedBy?: string;
  approvedAt?: Date;
  rejectedBy?: string;
  rejectedAt?: Date;
  overriddenBy?: string;
  overriddenTo?: string;  // Agent user ID if overridden
  overriddenAt?: Date;
  rejectionReason?: string;
  
  // Applied assignment
  appliedAgentUserId?: string;
  appliedAt?: Date;
  appliedSuccess?: boolean;
  appliedError?: string;
  
  // Idempotency
  idempotencyKey: string;
  
  // Metadata
  schemaVersion: number;
  mappingVersion: number;
  rulesVersion?: number;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
}

/**
 * Decision engine configuration
 */
export interface DecisionConfig {
  mode: DecisionMode;
  
  // Auto-assign settings
  autoApproveThreshold: number;          // Score threshold (0-100) for auto-assign
  autoApproveMinConfidence?: "high" | "medium" | "low";  // Minimum confidence
  
  // Proposal settings
  proposalExpirationHours?: number;      // Default: 24
  allowOverride?: boolean;               // Default: true
  
  // Fallback settings
  enableRandomFallback?: boolean;        // Default: false (only in auto mode)
  randomFallbackInManual?: boolean;      // Default: false
}

const DEFAULT_CONFIG: DecisionConfig = {
  mode: "manual",
  autoApproveThreshold: 80,
  autoApproveMinConfidence: "high",
  proposalExpirationHours: 24,
  allowOverride: true,
  enableRandomFallback: false,
  randomFallbackInManual: false,
};

/**
 * Decision result
 */
export interface DecisionResult {
  proposal: RoutingProposal;
  shouldAutoApply: boolean;
  reason: string;
}

/**
 * Create idempotency key for proposal
 * Prevents duplicate proposals on retries
 */
export function createIdempotencyKey(
  boardId: string,
  itemId: string,
  schemaVersion: number,
  mappingVersion: number,
  rulesVersion?: number
): string {
  const parts = [boardId, itemId, schemaVersion, mappingVersion];
  if (rulesVersion) parts.push(rulesVersion.toString());
  return parts.join(":");
}

/**
 * Make routing decision
 * Returns proposal and whether to auto-apply
 */
export function makeDecision(
  lead: NormalizedLead,
  scoringResult: ScoringResult,
  agentProfiles: Map<string, AgentProfile>,
  config: Partial<DecisionConfig>,
  versions: { schemaVersion: number; mappingVersion: number; rulesVersion?: number }
): DecisionResult {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  
  // No eligible agents - handle fallback
  if (!scoringResult.recommendedAgent || scoringResult.eligibleAgents === 0) {
    return handleNoMatch(lead, scoringResult, agentProfiles, cfg, versions);
  }
  
  const recommended = scoringResult.recommendedAgent;
  
  // Check if should auto-apply
  const shouldAutoApply = shouldAutoApprove(recommended, cfg);
  
  // Generate explanation
  const explanation = generateRoutingExplanation(
    lead,
    scoringResult,
    agentProfiles,
    shouldAutoApply ? "scored" : undefined
  );
  
  // Create idempotency key
  const idempotencyKey = createIdempotencyKey(
    lead.boardId || "unknown",
    lead.itemId || lead.leadId,
    versions.schemaVersion,
    versions.mappingVersion,
    versions.rulesVersion
  );
  
  // Determine status
  const status: ProposalStatus = shouldAutoApply ? "APPLIED" : "PENDING";
  
  // Create proposal
  const proposal: RoutingProposal = {
    id: generateProposalId(),
    orgId: "org_1", // TODO: From context
    
    // Lead
    leadId: lead.leadId,
    leadName: lead.leadName,
    boardId: lead.boardId || "unknown",
    itemId: lead.itemId || lead.leadId,
    
    // Recommendation
    recommendedAgentUserId: recommended.agentUserId,
    recommendedAgentName: recommended.agentName,
    recommendedScore: Math.round(recommended.normalizedScore),
    confidence: explanation.recommendedAgent?.confidence || "low",
    
    // Alternatives
    alternativeAgents: scoringResult.alternativeAgents.map(alt => ({
      agentUserId: alt.agentUserId,
      agentName: alt.agentName,
      score: Math.round(alt.normalizedScore),
    })),
    
    // Explanation
    explanation,
    
    // Decision
    status,
    decisionMode: cfg.mode,
    autoApplied: shouldAutoApply,
    
    // Applied (if auto)
    appliedAgentUserId: shouldAutoApply ? recommended.agentUserId : undefined,
    appliedAt: shouldAutoApply ? new Date() : undefined,
    
    // Idempotency
    idempotencyKey,
    
    // Versions
    schemaVersion: versions.schemaVersion,
    mappingVersion: versions.mappingVersion,
    rulesVersion: versions.rulesVersion,
    
    // Metadata
    createdAt: new Date(),
    updatedAt: new Date(),
    expiresAt: cfg.proposalExpirationHours 
      ? new Date(Date.now() + cfg.proposalExpirationHours * 60 * 60 * 1000)
      : undefined,
  };
  
  const reason = shouldAutoApply
    ? `Auto-applied: score ${proposal.recommendedScore}/100 meets threshold (${cfg.autoApproveThreshold})`
    : `Manual approval required: score ${proposal.recommendedScore}/100 or confidence ${proposal.confidence}`;
  
  return { proposal, shouldAutoApply, reason };
}

/**
 * Handle no match scenario (fallback)
 */
function handleNoMatch(
  lead: NormalizedLead,
  scoringResult: ScoringResult,
  agentProfiles: Map<string, AgentProfile>,
  config: DecisionConfig,
  versions: { schemaVersion: number; mappingVersion: number; rulesVersion?: number }
): DecisionResult {
  const shouldAutoApply = config.mode === "auto" && config.enableRandomFallback;
  
  let selectedAgent: AgentScore | null = null;
  let decisionMode: "scored" | "random_fallback" = "random_fallback";
  
  if (shouldAutoApply) {
    // Random fallback in auto mode
    const allAgents = Array.from(agentProfiles.values());
    const randomIndex = Math.floor(Math.random() * allAgents.length);
    const agent = allAgents[randomIndex];
    
    selectedAgent = {
      agentUserId: agent.agentUserId,
      agentName: agent.agentName,
      totalScore: 0,
      normalizedScore: 0,
      rank: 1,
      ruleContributions: {
        agentUserId: agent.agentUserId,
        results: [],
        totalContribution: 0,
        rulesApplied: 0,
        rulesSkipped: 0,
      },
      tieBreakUsed: false,
      eligible: true,
    };
  }
  
  const explanation = generateRoutingExplanation(
    lead,
    { ...scoringResult, recommendedAgent: selectedAgent },
    agentProfiles,
    decisionMode
  );
  
  const idempotencyKey = createIdempotencyKey(
    lead.boardId || "unknown",
    lead.itemId || lead.leadId,
    versions.schemaVersion,
    versions.mappingVersion,
    versions.rulesVersion
  );
  
  const proposal: RoutingProposal = {
    id: generateProposalId(),
    orgId: "org_1",
    
    leadId: lead.leadId,
    leadName: lead.leadName,
    boardId: lead.boardId || "unknown",
    itemId: lead.itemId || lead.leadId,
    
    recommendedAgentUserId: selectedAgent?.agentUserId || "none",
    recommendedAgentName: selectedAgent?.agentName,
    recommendedScore: 0,
    confidence: "low",
    
    alternativeAgents: [],
    
    explanation,
    
    status: shouldAutoApply ? "APPLIED" : "PENDING",
    decisionMode: config.mode,
    autoApplied: shouldAutoApply,
    
    appliedAgentUserId: shouldAutoApply ? selectedAgent?.agentUserId : undefined,
    appliedAt: shouldAutoApply ? new Date() : undefined,
    
    idempotencyKey,
    
    schemaVersion: versions.schemaVersion,
    mappingVersion: versions.mappingVersion,
    rulesVersion: versions.rulesVersion,
    
    createdAt: new Date(),
    updatedAt: new Date(),
    expiresAt: config.proposalExpirationHours
      ? new Date(Date.now() + config.proposalExpirationHours * 60 * 60 * 1000)
      : undefined,
  };
  
  const reason = shouldAutoApply
    ? "No clear winner - random agent selected (auto mode)"
    : "No eligible agents - manual review required";
  
  return { proposal, shouldAutoApply, reason };
}

/**
 * Determine if should auto-approve
 */
function shouldAutoApprove(agent: AgentScore, config: DecisionConfig): boolean {
  if (config.mode === "manual") return false;
  
  // Check score threshold
  if (agent.normalizedScore < config.autoApproveThreshold) {
    return false;
  }
  
  // Check confidence requirement
  if (config.autoApproveMinConfidence) {
    const confidenceOrder = { high: 3, medium: 2, low: 1 };
    const agentConfidence = agent.eligible ? "medium" : "low"; // Simplified
    const minConfidence = config.autoApproveMinConfidence;
    
    if (confidenceOrder[agentConfidence] < confidenceOrder[minConfidence]) {
      return false;
    }
  }
  
  // In hybrid mode, always manual for low confidence
  if (config.mode === "hybrid") {
    // Additional hybrid logic could go here
  }
  
  return config.mode === "auto" || config.mode === "hybrid";
}

/**
 * Manager approves proposal
 */
export function approveProposal(
  proposal: RoutingProposal,
  approvedBy: string
): RoutingProposal {
  return {
    ...proposal,
    status: "APPROVED",
    approvedBy,
    approvedAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Manager rejects proposal
 */
export function rejectProposal(
  proposal: RoutingProposal,
  rejectedBy: string,
  reason?: string
): RoutingProposal {
  return {
    ...proposal,
    status: "REJECTED",
    rejectedBy,
    rejectedAt: new Date(),
    rejectionReason: reason,
    updatedAt: new Date(),
  };
}

/**
 * Manager overrides with different agent
 */
export function overrideProposal(
  proposal: RoutingProposal,
  overriddenBy: string,
  newAgentUserId: string
): RoutingProposal {
  return {
    ...proposal,
    status: "OVERRIDDEN",
    overriddenBy,
    overriddenTo: newAgentUserId,
    overriddenAt: new Date(),
    appliedAgentUserId: newAgentUserId,
    updatedAt: new Date(),
  };
}

/**
 * Mark proposal as applied (writeback successful)
 */
export function markProposalApplied(
  proposal: RoutingProposal,
  success: boolean,
  error?: string
): RoutingProposal {
  return {
    ...proposal,
    status: success ? "APPLIED" : "WRITEBACK_FAILED",
    appliedAt: new Date(),
    appliedSuccess: success,
    appliedError: error,
    updatedAt: new Date(),
  };
}

/**
 * Generate unique proposal ID
 */
function generateProposalId(): string {
  return `prop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Check if proposal is expired
 */
export function isProposalExpired(proposal: RoutingProposal): boolean {
  if (!proposal.expiresAt) return false;
  return new Date() > proposal.expiresAt;
}

/**
 * Check if proposal can be approved
 */
export function canApproveProposal(proposal: RoutingProposal): boolean {
  return proposal.status === "PENDING" && !isProposalExpired(proposal);
}

/**
 * Check if proposal can be overridden
 */
export function canOverrideProposal(proposal: RoutingProposal, config: DecisionConfig): boolean {
  if (!config.allowOverride) return false;
  return proposal.status === "PENDING" && !isProposalExpired(proposal);
}


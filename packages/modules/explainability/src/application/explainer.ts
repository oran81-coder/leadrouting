/**
 * Explainability Layer (Phase 1)
 * 
 * Generates human-readable explanations for every routing decision.
 * Critical for transparency and trust in the system.
 */

import type { AgentScore, ScoringResult } from "../../../scoring/src/application/scoring.engine";
import type { AgentRuleEvaluation } from "../../../rule-engine/src/contracts/scoring.types";
import type { AgentProfile } from "../../../agent-profiling/src/application/agentProfiler";
import type { NormalizedLead } from "../../../rule-engine/src/contracts/scoring.types";

/**
 * Complete routing explanation
 */
export interface RoutingExplanation {
  // Lead info
  leadId: string;
  leadName?: string;
  leadSummary: string;

  // Recommended agent
  recommendedAgent: {
    agentUserId: string;
    agentName?: string;
    score: number;
    confidence: "high" | "medium" | "low";
  } | null;

  // Explanation
  summary: string;
  breakdown: ExplanationBreakdown;

  // Alternatives
  alternatives: AlternativeAgent[];

  // Metadata
  totalAgentsEvaluated: number;
  eligibleAgents: number;
  decisionMode?: "scored" | "random_fallback" | "override";
  warnings?: string[];
}

export interface ExplanationBreakdown {
  primaryReasons: ExplanationReason[];    // Top 3 contributing factors
  secondaryFactors: ExplanationReason[];  // Next 2-3 factors
  gatingSummary?: string;                 // Why some agents were excluded
  allKpiScores?: Record<string, number>;  // All evaluated KPI scores (0-100)
}

export interface ExplanationReason {
  ruleName: string;
  ruleId?: string;       // Added for precise UI mapping
  matchScore: number;    // Raw score (0-1)
  contribution: number;  // Points contributed
  explanation: string;   // Human-readable
  category: string;
}

export interface AlternativeAgent {
  rank: number;
  agentUserId: string;
  agentName?: string;
  score: number;
  scoreDifference: number;  // vs recommended agent
  summary: string;
}

/**
 * Generate complete explanation for routing result
 */
export function generateRoutingExplanation(
  lead: NormalizedLead,
  scoringResult: ScoringResult,
  agentProfiles: Map<string, AgentProfile>,
  decisionMode?: "scored" | "random_fallback" | "override"
): RoutingExplanation {
  // Lead summary
  const leadSummary = generateLeadSummary(lead);

  // Recommended agent
  let recommendedAgent: RoutingExplanation["recommendedAgent"] = null;
  if (scoringResult.recommendedAgent) {
    recommendedAgent = {
      agentUserId: scoringResult.recommendedAgent.agentUserId,
      agentName: scoringResult.recommendedAgent.agentName,
      score: Math.round(scoringResult.recommendedAgent.normalizedScore),
      confidence: determineConfidence(scoringResult.recommendedAgent, scoringResult.scores),
    };
  }

  // Breakdown
  const breakdown = scoringResult.recommendedAgent
    ? generateBreakdown(scoringResult.recommendedAgent, lead, agentProfiles)
    : generateNoMatchBreakdown(scoringResult);

  // Summary
  const summary = generateSummary(lead, scoringResult, breakdown, decisionMode);

  // Alternatives
  const alternatives = scoringResult.alternativeAgents.map((alt, index) =>
    generateAlternative(alt, index + 2, scoringResult.recommendedAgent, lead, agentProfiles)
  );

  // Warnings
  const warnings = generateWarnings(lead, scoringResult, agentProfiles);

  return {
    leadId: lead.leadId,
    leadName: lead.leadName,
    leadSummary,
    recommendedAgent,
    summary,
    breakdown,
    alternatives,
    totalAgentsEvaluated: scoringResult.totalAgentsEvaluated,
    eligibleAgents: scoringResult.eligibleAgents,
    decisionMode,
    warnings,
  };
}

/**
 * Generate lead summary
 */
function generateLeadSummary(lead: NormalizedLead): string {
  const parts: string[] = [];

  if (lead.industry) parts.push(lead.industry);
  if (lead.dealSize) parts.push(`$${lead.dealSize.toLocaleString()} budget`);
  if (lead.source) parts.push(`from ${lead.source}`);

  return parts.length > 0 ? parts.join(", ") : "New lead";
}

/**
 * Generate explanation breakdown
 */
function generateBreakdown(
  score: AgentScore,
  lead: NormalizedLead,
  agentProfiles: Map<string, AgentProfile>
): ExplanationBreakdown {
  const agent = agentProfiles.get(score.agentUserId);

  // Sort contributions by points
  const sortedContributions = score.ruleContributions.results
    .filter(r => r.applied)
    .sort((a, b) => b.contribution - a.contribution);

  // Primary reasons (top 3)
  const primaryReasons: ExplanationReason[] = sortedContributions
    .slice(0, 3)
    .map(r => ({
      ruleName: r.ruleName,
      ruleId: r.ruleId,
      matchScore: r.matchScore,
      contribution: Math.round(r.contribution),
      explanation: enhanceExplanation(r.explanation, lead, agent),
      category: r.category,
    }));

  // Secondary factors (next 2-3)
  const secondaryFactors: ExplanationReason[] = sortedContributions
    .slice(3, 6)
    .filter(r => r.contribution > 1) // Only meaningful contributions
    .map(r => ({
      ruleName: r.ruleName,
      ruleId: r.ruleId,
      matchScore: r.matchScore,
      contribution: Math.round(r.contribution),
      explanation: enhanceExplanation(r.explanation, lead, agent),
      category: r.category,
    }));

  // Gating summary
  const ineligible = score.eligible ? 0 : 1;
  const gatingSummary = ineligible > 0
    ? `${ineligible} agent(s) excluded due to capacity or eligibility constraints`
    : undefined;

  // Map all evaluated rules to kpiScores for UI
  const allKpiScores: Record<string, number> = {};
  score.ruleContributions.results.forEach(r => {
    allKpiScores[r.ruleId] = Math.round(r.matchScore * 100);
  });

  return {
    primaryReasons,
    secondaryFactors,
    gatingSummary,
    allKpiScores,
  };
}

/**
 * Generate breakdown when no agents match
 */
function generateNoMatchBreakdown(scoringResult: ScoringResult): ExplanationBreakdown {
  return {
    primaryReasons: [{
      ruleName: "No Match",
      matchScore: 0,
      contribution: 0,
      explanation: "No agents met the eligibility criteria for this lead",
      category: "system",
    }],
    secondaryFactors: [],
    gatingSummary: `${scoringResult.totalAgentsEvaluated - scoringResult.eligibleAgents} agents excluded`,
  };
}

/**
 * Enhance explanation with context
 */
function enhanceExplanation(
  baseExplanation: string,
  lead: NormalizedLead,
  agent?: AgentProfile
): string {
  if (!agent) return baseExplanation;

  // Add specific metrics where relevant
  if (baseExplanation.includes("conversion") && agent.conversionRate) {
    const converted = agent.totalLeadsConverted;
    const total = agent.totalLeadsHandled;
    return `${baseExplanation} (${converted}/${total} historical deals)`;
  }

  if (baseExplanation.includes("availability") && agent.availability) {
    const activeLeads = agent.currentActiveLeads;
    return `${baseExplanation} (currently ${activeLeads} active leads)`;
  }

  return baseExplanation;
}

/**
 * Generate summary text
 */
function generateSummary(
  lead: NormalizedLead,
  scoringResult: ScoringResult,
  breakdown: ExplanationBreakdown,
  decisionMode?: string
): string {
  if (!scoringResult.recommendedAgent) {
    return "No suitable agent found. Consider adjusting eligibility criteria or adding more agents.";
  }

  const agent = scoringResult.recommendedAgent;
  const score = Math.round(agent.normalizedScore);
  const agentName = agent.agentName || agent.agentUserId;

  if (decisionMode === "random_fallback") {
    return `Assigned to ${agentName} (random selection). No clear scoring winner was identified across the evaluated metrics.`;
  }

  if (decisionMode === "override") {
    return `Manually assigned to ${agentName} by manager (override), bypassing automated scoring logic.`;
  }

  // Scored assignment
  const topReason = breakdown.primaryReasons[0];
  if (!topReason) {
    return `${agentName} is recommended for this lead with a match score of ${score}/100.`;
  }

  return `${agentName} was identified as the optimal candidate for this lead with a match score of ${score}/100. This recommendation is primarily driven by ${topReason.explanation}, showing high compatibility with the lead's requirements.`;
}

/**
 * Generate alternative agent explanation
 */
function generateAlternative(
  alt: AgentScore,
  rank: number,
  recommended: AgentScore | null,
  lead: NormalizedLead,
  agentProfiles: Map<string, AgentProfile>
): AlternativeAgent {
  const agent = agentProfiles.get(alt.agentUserId);
  const score = Math.round(alt.normalizedScore);
  const agentName = alt.agentName || alt.agentUserId;

  // Score difference
  const scoreDifference = recommended
    ? Math.round(recommended.normalizedScore - alt.normalizedScore)
    : 0;

  // Generate summary
  const topContributions = alt.ruleContributions.results
    .filter(r => r.applied)
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, 2);

  let summary = `${agentName} (${score}/100)`;
  if (topContributions.length > 0) {
    const strength = topContributions[0].ruleName.toLowerCase();
    summary += ` - Good ${strength}`;
  }

  if (agent) {
    if (agent.availability < 0.5) {
      summary += ", lower availability";
    } else if (agent.conversionRate && agent.conversionRate < 0.4) {
      summary += ", lower conversion rate";
    }
  }

  return {
    rank,
    agentUserId: alt.agentUserId,
    agentName: alt.agentName,
    score,
    scoreDifference,
    summary,
  };
}

/**
 * Determine confidence level
 */
function determineConfidence(
  recommended: AgentScore,
  allScores: AgentScore[]
): "high" | "medium" | "low" {
  // Only one eligible agent
  const eligibleScores = allScores.filter(s => s.eligible);
  if (eligibleScores.length === 1) {
    return "low";
  }

  // Check score gap with second-place
  const secondPlace = eligibleScores[1];
  if (!secondPlace) {
    return "low";
  }

  const gap = recommended.normalizedScore - secondPlace.normalizedScore;

  if (gap >= 10) return "high";    // 10+ point gap
  if (gap >= 5) return "medium";   // 5-10 point gap
  return "low";                    // < 5 point gap
}

/**
 * Generate warnings for edge cases
 */
function generateWarnings(
  lead: NormalizedLead,
  scoringResult: ScoringResult,
  agentProfiles: Map<string, AgentProfile>
): string[] {
  const warnings: string[] = [];

  // Low number of eligible agents
  if (scoringResult.eligibleAgents < 2) {
    warnings.push("Only one eligible agent available. Consider reviewing agent availability.");
  }

  // Low confidence match
  if (scoringResult.recommendedAgent) {
    const confidence = determineConfidence(
      scoringResult.recommendedAgent,
      scoringResult.scores
    );
    if (confidence === "low") {
      warnings.push("Low confidence match (small score difference between agents).");
    }
  }

  // Industry not found
  if (lead.industry && scoringResult.recommendedAgent) {
    const agent = agentProfiles.get(scoringResult.recommendedAgent.agentUserId);
    if (agent) {
      const industryScore = agent.industryScores[lead.industry];
      if (!industryScore || industryScore < 30) {
        warnings.push(`Agent has limited experience in ${lead.industry} industry.`);
      }
    }
  }

  // High burnout
  if (scoringResult.recommendedAgent) {
    const agent = agentProfiles.get(scoringResult.recommendedAgent.agentUserId);
    if (agent && agent.burnoutScore > 75) {
      warnings.push(`Agent may be experiencing high workload (burnout score: ${agent.burnoutScore}/100).`);
    }
  }

  return warnings;
}

/**
 * Format explanation for display
 */
export function formatExplanationForDisplay(explanation: RoutingExplanation): string {
  const lines: string[] = [];

  // Header
  lines.push(`Lead: ${explanation.leadName || explanation.leadId} (${explanation.leadSummary})`);
  lines.push("");

  // Recommended agent
  if (explanation.recommendedAgent) {
    const { agentName, agentUserId, score, confidence } = explanation.recommendedAgent;
    const name = agentName || agentUserId;
    const confidenceEmoji = confidence === "high" ? "✓" : confidence === "medium" ? "~" : "?";
    lines.push(`Recommended: ${name} (Score: ${score}/100 ${confidenceEmoji})`);
  } else {
    lines.push("Recommended: No suitable agent found");
  }
  lines.push("");

  // Summary
  lines.push(explanation.summary);
  lines.push("");

  // Primary reasons
  if (explanation.breakdown.primaryReasons.length > 0) {
    lines.push("Primary Reasons:");
    explanation.breakdown.primaryReasons.forEach((reason, i) => {
      lines.push(`  ${i + 1}. ${reason.explanation} (+${reason.contribution}pts)`);
    });
    lines.push("");
  }

  // Secondary factors
  if (explanation.breakdown.secondaryFactors.length > 0) {
    lines.push("Secondary Factors:");
    explanation.breakdown.secondaryFactors.forEach(factor => {
      lines.push(`  • ${factor.explanation} (+${factor.contribution}pts)`);
    });
    lines.push("");
  }

  // Alternatives
  if (explanation.alternatives.length > 0) {
    lines.push("Alternatives:");
    explanation.alternatives.forEach(alt => {
      lines.push(`  ${alt.rank}. ${alt.summary} (-${alt.scoreDifference}pts)`);
    });
    lines.push("");
  }

  // Warnings
  if (explanation.warnings && explanation.warnings.length > 0) {
    lines.push("Warnings:");
    explanation.warnings.forEach(warning => {
      lines.push(`  ⚠ ${warning}`);
    });
  }

  return lines.join("\n");
}

# Agent Domain Learning Module

## Overview

The **Agent Domain Learning Module** is one of the most critical components of the Lead Routing System. It automatically learns which agents excel in which industries (domains) based on historical performance data.

## Why It's Critical

### The Problem It Solves

Not all agents are equally effective across all industries:
- A tech-savvy agent may excel with SaaS leads but struggle with retail
- An agent with retail experience may close manufacturing deals poorly
- Industry expertise significantly impacts conversion rates

**Traditional Approach**: Manually assign domain expertise to each agent
- ❌ Time-consuming
- ❌ Subjective
- ❌ Doesn't adapt to changing performance
- ❌ Hard to maintain at scale

**Our Approach**: Learn from actual performance data
- ✅ Automatic
- ✅ Data-driven
- ✅ Continuously evolving
- ✅ Scales effortlessly

## How It Works

### 1. Data Collection

For each agent, the system tracks:
```typescript
{
  industry: "SaaS",
  leadsHandled: 42,
  leadsConverted: 28,
  conversionRate: 0.67,  // 67%
  avgDealSize: 75000,
  totalRevenue: 2100000
}
```

### 2. Expertise Score Calculation

**Formula** (Weighted 0-100 score):
```
Expertise Score = 
  (Conversion Rate × 60%) +
  (Volume Score × 25%) +
  (Deal Size Score × 15%)
```

**Components**:
- **Conversion Rate (60%)**: Most important - can they close?
  - 100% conversion = 60 points
  - 50% conversion = 30 points
  - 0% conversion = 0 points

- **Volume Score (25%)**: Experience matters
  - Normalized to 50 leads = perfect score
  - 50+ leads = 25 points
  - 25 leads = 12.5 points
  - 5 leads = 2.5 points

- **Deal Size Score (15%)**: Quality of deals
  - Normalized to $100k = perfect score
  - $100k+ avg = 15 points
  - $50k avg = 7.5 points
  - $10k avg = 1.5 points

### 3. Confidence Levels

The system also tracks confidence based on sample size:

- 🔴 **Low** (< 10 leads): Not statistically significant
- 🟡 **Medium** (10-30 leads): Moderate confidence
- 🟢 **High** (30+ leads): Strong confidence

### 4. Minimum Threshold

By default, domains with fewer than **5 leads** are not tracked (insufficient data).

## Real-World Examples

### Example 1: Experienced Agent

**Agent: Sarah**

| Industry | Leads | Converted | Conv. Rate | Avg Deal | Expertise | Confidence |
|----------|-------|-----------|------------|----------|-----------|------------|
| SaaS     | 42    | 28        | 67%        | $75k     | 85/100    | 🟢 High    |
| Tech     | 35    | 22        | 63%        | $60k     | 78/100    | 🟢 High    |
| Retail   | 18    | 7         | 39%        | $30k     | 52/100    | 🟡 Medium  |
| Finance  | 3     | 1         | 33%        | $45k     | -         | Not tracked |

**Routing Decision**: 
- New SaaS lead → Sarah is top choice (85 expertise)
- New Retail lead → Sarah is considered but not prioritized (52 expertise)
- New Finance lead → Sarah not prioritized (too few leads to assess)

### Example 2: New Agent

**Agent: Michael** (joined 2 months ago)

| Industry | Leads | Converted | Conv. Rate | Avg Deal | Expertise | Confidence |
|----------|-------|-----------|------------|----------|-----------|------------|
| SaaS     | 12    | 9         | 75%        | $55k     | 71/100    | 🟡 Medium  |
| Tech     | 4     | 3         | 75%        | $50k     | -         | Not tracked |

**Routing Decision**: 
- Michael shows promise in SaaS (71 expertise, 75% conversion)
- System will gradually assign more SaaS leads to build confidence
- Not enough data in other domains yet

## Integration with Routing Engine

### Priority Calculation

When a new lead arrives:

```typescript
// Example: New SaaS lead comes in

Step 1: Calculate domain expertise for all agents
  - Sarah: 85/100 (SaaS expert)
  - Michael: 71/100 (SaaS proficient)
  - Jessica: 45/100 (SaaS beginner)
  - Tom: No SaaS experience

Step 2: Filter by minimum threshold (default: 50)
  - Sarah: ✅ 85
  - Michael: ✅ 71
  - Jessica: ❌ 45 (below threshold)
  - Tom: ❌ No data

Step 3: Consider other factors (availability, workload, etc.)
  - Sarah: High expertise (85) but busy (20 leads today)
  - Michael: Good expertise (71) and available (8 leads today)

Step 4: Final decision
  → Route to Michael (good balance of expertise + availability)
```

## API Functions

### Calculate Single Agent Profile

```typescript
const profile = await calculateAgentDomainProfile(
  agentUserId: "user_123",
  orgId: "org_1",
  minLeadsThreshold: 5
);

console.log(profile);
// {
//   agentUserId: "user_123",
//   domains: Map {
//     "SaaS" => { expertiseScore: 85, confidence: "high", ... },
//     "Retail" => { expertiseScore: 52, confidence: "medium", ... }
//   },
//   lastUpdated: 2024-01-15T10:30:00Z
// }
```

### Get Top Domains

```typescript
const topDomains = getTopDomains(profile, 3);

console.log(topDomains);
// [
//   { industry: "SaaS", expertiseScore: 85, confidence: "high" },
//   { industry: "Tech", expertiseScore: 78, confidence: "high" },
//   { industry: "Retail", expertiseScore: 52, confidence: "medium" }
// ]
```

### Check Specific Domain

```typescript
const expertise = getDomainExpertise(profile, "SaaS", minScore: 50);

console.log(expertise);
// 85 (agent has expertise)

const noExpertise = getDomainExpertise(profile, "Healthcare", minScore: 50);

console.log(noExpertise);
// null (agent doesn't have expertise)
```

### Find Best Agents for Lead

```typescript
const allProfiles = await calculateBulkAgentProfiles(
  agentUserIds: ["user_123", "user_456", "user_789"],
  orgId: "org_1"
);

const bestAgents = findBestAgentsByDomain(
  leadIndustry: "SaaS",
  agentProfiles: Array.from(allProfiles.values()),
  minScore: 50
);

console.log(bestAgents);
// [
//   { agentUserId: "user_123", expertiseScore: 85, confidence: "high" },
//   { agentUserId: "user_456", expertiseScore: 71, confidence: "medium" },
//   // user_789 not included (below threshold)
// ]
```

## Performance Considerations

### Caching Strategy

Agent domain profiles should be **cached** and refreshed periodically:

```typescript
// Recommended: Cache for 24 hours
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Refresh daily at night (low traffic)
cron.schedule('0 2 * * *', async () => {
  const agents = await getAllAgentIds();
  await calculateBulkAgentProfiles(agents, "org_1");
});
```

### When to Recalculate

1. **Daily batch job**: Refresh all profiles overnight
2. **After deal closed**: Update specific agent's profile
3. **On-demand**: Admin requests refresh in UI
4. **New agent**: Calculate after first 5 leads

## UI Integration

### Outcomes Screen

Display each agent's top 3 domains:

```tsx
<AgentCard agent={agent}>
  <h3>{agent.name}</h3>
  <div className="domains">
    {agent.topDomains.map(domain => (
      <DomainBadge 
        industry={domain.industry}
        score={domain.expertiseScore}
        confidence={domain.confidence}
      />
    ))}
  </div>
</AgentCard>
```

### Agent Details Modal

Show full domain breakdown:

```tsx
<AgentDetailsModal agent={agent}>
  <h2>Domain Expertise</h2>
  <table>
    {agent.domains.map(domain => (
      <tr>
        <td>{domain.industry}</td>
        <td>{domain.expertiseScore}/100</td>
        <td>{domain.leadsHandled} leads</td>
        <td>{domain.conversionRate}% conversion</td>
        <td>{domain.confidence}</td>
      </tr>
    ))}
  </table>
</AgentDetailsModal>
```

### Routing Proposal

Show why agent was chosen:

```tsx
<ProposalCard proposal={proposal}>
  <h3>Why {agent.name}?</h3>
  <ul>
    <li>✅ Domain Expertise: {expertise}/100 in {industry}</li>
    <li>✅ Availability: {availabilityScore}/100</li>
    <li>✅ Recent Performance: {recentConversionRate}%</li>
  </ul>
</ProposalCard>
```

## Future Enhancements

### Phase 3 Ideas

1. **Composite Domains**: Track expertise in domain combinations
   - "SaaS + Enterprise" (different from "SaaS + SMB")
   - "Tech + Europe" (geographic expertise)

2. **Temporal Patterns**: Track expertise changes over time
   - "Sarah's SaaS expertise improved from 65 → 85 in last quarter"
   - Identify trending expertise

3. **Peer Comparison**: Benchmark against team
   - "Sarah is in top 10% for SaaS expertise"
   - Identify training opportunities

4. **Predictive Modeling**: Predict future expertise
   - "Based on current trajectory, Michael will reach expert level in 3 months"

5. **Skill Gaps**: Identify missing expertise
   - "No agents with strong Healthcare expertise - hire or train?"

## Related Documentation

- [Internal Schema](../packages/core/src/schema/internalSchema.ts)
- [Field Mapping Guide](./field-mapping-wizard-guide.md)
- [Routing Engine (Future)](./routing-engine.md)

## Troubleshooting

### "No domains tracked for agent"

**Cause**: Agent has fewer than 5 leads per industry
**Solution**: Lower `minLeadsThreshold` or wait for more data

### "All expertise scores are low"

**Cause**: Agent is new or performance is genuinely low
**Solution**: 
- Review conversion rates
- Consider training
- Adjust expectations for new agents

### "Expertise not updating"

**Cause**: Cache not refreshed
**Solution**: 
- Trigger manual recalculation
- Check cache refresh job is running

---

**Last Updated**: Phase 2 - December 2024


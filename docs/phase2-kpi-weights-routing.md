# KPI Weights & Routing Engine - Phase 2

## Overview

The Phase 2 routing engine calculates agent suitability scores using **8 configurable KPIs** with admin-defined weights. Each KPI is normalized to a 0-100 scale, weighted by its importance, and combined into a final routing score.

---

## 8 Core KPIs

### 1. Domain Expertise (Default: 30%)
**What it measures**: Agent's proven success rate in the lead's specific industry.

**How it works**:
- Analyzes historical performance per industry
- Calculates expertise score based on:
  - Conversion rate in that industry
  - Volume of deals handled
  - Average deal size
  - Total revenue generated
- Minimum 5 leads required for reliable score
- Confidence levels: Low (<10 leads), Medium (10-30), High (30+)

**Normalization**: Already 0-100 from `agentDomain.learner`

**Example**: Agent with 80% conversion in "SaaS" gets score of 85/100 for SaaS leads.

---

### 2. Availability (Default: 5%)
**What it measures**: Agent's current capacity based on active lead count.

**How it works**:
- Counts leads currently "in treatment" (configurable statuses)
- Compares to daily threshold (default: 20 leads/day)
- Score decreases as agent approaches capacity
- Formula: `100 - (currentLeads / threshold * 100)`

**Normalization**: Already 0-100 from `availability.calculator`

**Example**: Agent with 10/20 leads = 50% capacity = score 50/100.

---

### 3. Conversion Rate - Historical (Default: 20%)
**What it measures**: All-time conversion rate across all industries and time periods.

**How it works**:
- Total closed deals / Total assigned leads
- Long-term track record indicator
- Separate from recent performance

**Normalization**: Direct conversion (0.0-1.0 → 0-100)

**Example**: Agent closed 50 of 200 leads = 25% conversion = score 25/100.

---

### 4. Recent Performance (Default: 20%)
**What it measures**: Conversion rate in the recent time window (configurable, default 30 days).

**How it works**:
- Conversion rate for leads assigned in the last N days
- Indicates current form and momentum
- Helps identify agents who are "hot" or "cold" right now

**Normalization**: Direct conversion (0.0-1.0 → 0-100)

**Example**: Agent closed 8 of 20 leads in last 30 days = 40% = score 40/100.

---

### 5. Average Deal Size (Default: 5%)
**What it measures**: Average value of closed deals.

**How it works**:
- Sum of all deal amounts / Number of closed deals
- Measures ability to close high-value opportunities
- Target benchmark: $100,000 (configurable)

**Normalization**: Linear scale with target as 100%
- `score = min(100, (actual / target) * 100)`

**Example**: Agent averages $75k deals with $100k target = score 75/100.

---

### 6. Response Time (Default: 5%)
**What it measures**: Median time from lead assignment to first status update.

**How it works**:
- Calculates time difference: `firstTouchAt - enteredAt`
- Median used to avoid outlier bias
- LOWER time = HIGHER score (speed matters!)
- Target: 2 hours (120 minutes)

**Normalization**: Inverse scale
- <= target: score 100
- \>= 3x target: score 0
- Linear decay between

**Example**: Agent responds in 90 mins (under 2 hr target) = score 100/100.

---

### 7. Average Time to Close (Default: 5%)
**What it measures**: Average days from lead assignment to deal closure.

**How it works**:
- Calculates: `closedWonAt - enteredAt` for each closed deal
- Measures sales cycle efficiency
- LOWER time = HIGHER score (faster closing is better!)
- Target: 30 days

**Normalization**: Inverse scale (same as response time)
- <= 30 days: score 100
- \>= 90 days: score 0
- Linear decay between

**Example**: Agent closes deals in 25 days on average = score 100/100.

---

### 8. Hot Agent (Default: 10%)
**What it measures**: Agent is "on fire" - closed multiple deals recently.

**How it works**:
- Counts deals closed in recent time window
- Configuration (admin-defined):
  - Minimum deals (default: 3)
  - Time window (default: 7 days)
- Binary indicator of peak performance and momentum

**Normalization**: Binary (0 or 100)
- Is hot: score 100
- Not hot: score 0

**Example**: Agent closed 4 deals in last 7 days (min: 3) = score 100/100.

---

## How Weights Work

### Weight Configuration
- Admin configures weights in **Admin Dashboard → KPI Weights Configuration**
- Each KPI weight is a percentage (0-100)
- **Total must equal exactly 100%**
- No min/max limits for individual KPIs (fully flexible)

### Scoring Formula

```
Total Score = Σ (KPI_normalized_score × KPI_weight / 100)
            = (Score₁ × W₁ + Score₂ × W₂ + ... + Score₈ × W₈) / 100
```

**Example Calculation:**
```
Lead: SaaS, $50k deal size

Agent "Sarah":
- Domain Expertise (SaaS): 85/100 × 30% = 25.5 points
- Availability: 60/100 × 5% = 3.0 points
- Conversion Historical: 40/100 × 20% = 8.0 points
- Recent Performance: 50/100 × 20% = 10.0 points
- Avg Deal Size: 75/100 × 5% = 3.75 points
- Response Time: 100/100 × 5% = 5.0 points
- Avg Time to Close: 80/100 × 5% = 4.0 points
- Hot Agent: 100/100 × 10% = 10.0 points

Total Score = 69.25/100
Recommendation: Good
```

---

## Admin Configuration

### KPI Weights Section
Located in **Admin Dashboard → KPI Weights Configuration**.

**Features:**
- Input fields for each KPI weight (0-100%)
- Real-time total display (must = 100%)
- Tooltips explaining each KPI
- Save button (disabled if total ≠ 100%)

**Additional Settings:**
- **Recent Performance Window**: 7-90 days (default: 30)
- **Hot Agent Config**:
  - Minimum deals: 1-10 (default: 3)
  - Time window: 1-30 days (default: 7)

---

## UI Components

### 1. Agent Domain Card
`frontend/src/ui/components/AgentDomainCard.tsx`

Displays:
- Agent name
- Top 3 domain expertise with scores
- Quick stats (conversion, availability)
- Hot agent badge (🔥)
- "View Details" button

### 2. Agent KPI Details Modal
`frontend/src/ui/components/AgentKPIDetailsModal.tsx`

Comprehensive breakdown:
- Overall routing score (large display)
- KPI breakdown table:
  - Score (0-100)
  - Visual bar
  - Weight (%)
  - Contribution points
- Domain expertise table (all industries)

---

## API Endpoints

### GET /api/kpi-weights
**Returns**: Current KPI weights configuration

**Response:**
```json
{
  "ok": true,
  "weights": {
    "domainExpertise": 30,
    "availability": 5,
    "conversionHistorical": 20,
    "recentPerformance": 20,
    "avgDealSize": 5,
    "responseTime": 5,
    "avgTimeToClose": 5,
    "hotAgent": 10
  },
  "settings": {
    "hotAgentMinDeals": 3,
    "hotAgentWindowDays": 7,
    "recentPerfWindowDays": 30,
    "dailyLeadThreshold": 20
  }
}
```

---

### POST /api/kpi-weights
**Updates**: KPI weights configuration

**Body:**
```json
{
  "weights": { /* 8 KPIs, must sum to 100 */ },
  "settings": { /* hot agent + recent perf windows */ }
}
```

**Validations:**
- Weights must sum to 100% (±0.01 tolerance for floating point)
- Each weight: 0-100
- `hotAgentMinDeals`: >= 1
- `hotAgentWindowDays`: >= 1
- `recentPerfWindowDays`: 7-90

---

### POST /api/routing/calculate
**Calculates**: Agent scores for a given lead

**Body:**
```json
{
  "lead": {
    "industry": "SaaS",
    "dealSize": 50000,
    "source": "Website",
    "createdAt": "2024-12-24T10:00:00Z"
  },
  "agentUserIds": ["user_1", "user_2"] // optional
}
```

**Response:**
```json
{
  "ok": true,
  "topAgent": {
    "agentUserId": "user_1",
    "totalScore": 85.3,
    "breakdown": { /* full KPI details */ },
    "recommendation": "excellent"
  },
  "allScores": [ /* sorted by score */ ],
  "weightsUsed": { /* weights applied */ }
}
```

**Recommendations:**
- **Excellent**: 80-100
- **Good**: 60-79
- **Fair**: 40-59
- **Poor**: 0-39

---

## Backend Modules

### 1. routing.engine.ts
`packages/modules/routing-engine/src/application/routing.engine.ts`

**Main function**: `calculateAgentScores()`
- Accepts: lead context, agent IDs, org, weights, settings
- Returns: Sorted agent scores with full breakdown

**Features:**
- Parallel score calculation for all agents
- Error handling (skips failed agents)
- Weighted sum algorithm
- Automatic recommendation assignment

---

### 2. kpi.calculators.ts
`packages/modules/routing-engine/src/application/kpi.calculators.ts`

**Functions:**
- `calculateAvgTimeToClose()` - Sales cycle efficiency
- `calculateRecentPerformance()` - N-day conversion rate
- `calculateHotAgent()` - Momentum detection

**Normalization functions:**
- `normalizeDealSize()` - Linear scale to target
- `normalizeResponseTime()` - Inverse scale (faster = better)
- `normalizeTimeToClose()` - Inverse scale (faster = better)
- `normalizeConversionRate()` - Direct 0-1 → 0-100
- `normalizeAvailability()` - Pass-through (already 0-100)
- `normalizeHotAgent()` - Binary 0/100

---

### 3. agentDomain.learner.ts
`packages/modules/agent-profiling/src/application/agentDomain.learner.ts`

**Function**: `calculateAgentDomainProfile()`
- Analyzes all leads handled by agent
- Groups by industry
- Calculates expertise score per industry
- Returns confidence levels

**Confidence Calculation:**
- High: 30+ leads in industry
- Medium: 10-29 leads
- Low: 5-9 leads
- None: <5 leads (not shown)

---

## Database Schema

### MetricsConfig Table
```prisma
model MetricsConfig {
  // Phase 2: KPI Weights (must sum to 100%)
  weightDomainExpertise      Int @default(30)
  weightAvailability         Int @default(5)
  weightConversionHistorical Int @default(20)
  weightRecentPerformance    Int @default(20)
  weightAvgDealSize          Int @default(5)
  weightResponseTime         Int @default(5)
  weightAvgTimeToClose       Int @default(5)
  weightHotAgent             Int @default(10)

  // Phase 2: Hot Agent Configuration
  hotAgentMinDeals     Int @default(3)
  hotAgentWindowDays   Int @default(7)

  // Phase 2: Recent Performance window
  recentPerfWindowDays Int @default(30)

  // Phase 2: Daily Lead Threshold
  dailyLeadThreshold Int @default(20)
  
  // ... existing fields ...
}
```

---

## Future Enhancements

### 1. Custom KPI Targets
Allow admin to configure target benchmarks:
- Deal size target (currently: $100k)
- Response time target (currently: 2 hours)
- Time to close target (currently: 30 days)

### 2. Industry-Specific Weights
Different KPI weights per industry:
- "SaaS" → prioritize response time (30%)
- "Enterprise" → prioritize avg deal size (40%)

### 3. Time-Based Weights
Different weights for different times:
- Business hours: prioritize availability
- After hours: prioritize response time

### 4. Machine Learning
Use historical routing outcomes to auto-tune weights:
- Measure actual conversion rates per weight configuration
- Suggest optimal weights based on data

### 5. A/B Testing
Test different weight configurations:
- Split incoming leads
- Measure performance
- Determine best configuration

---

## Testing

### Unit Tests
```bash
npm test -- routing.engine.test.ts
npm test -- kpi.calculators.test.ts
```

### Integration Test
```bash
# Start backend
npm run dev

# Test routing calculation
curl -X POST http://localhost:3000/routing/calculate \
  -H "x-api-key: dev_key_123" \
  -H "Content-Type: application/json" \
  -d '{
    "lead": {
      "industry": "SaaS",
      "dealSize": 50000
    }
  }'
```

### UI Test
1. Navigate to Admin Dashboard
2. Open "KPI Weights Configuration"
3. Adjust weights (ensure total = 100%)
4. Save configuration
5. Navigate to Outcomes screen
6. View agent domain cards
7. Click "View Details" on any agent
8. Verify full KPI breakdown

---

## Documentation Files
- `docs/agent-domain-learning.md` - Domain expertise calculation
- `docs/field-mapping-wizard-guide.md` - Internal schema & computed fields
- `docs/40_metrics/success-metrics.md` - Metrics overview

---

## Summary

**Key Points:**
- ✅ 8 fully configurable KPIs with admin-defined weights
- ✅ Comprehensive scoring with 0-100 normalization
- ✅ Real-time weight adjustment with validation
- ✅ Detailed UI for agent comparison and KPI breakdown
- ✅ RESTful API for routing calculation
- ✅ Flexible and extensible architecture

**Default Configuration:**
```
Domain Expertise: 30%
Availability: 5%
Conversion Historical: 20%
Recent Performance: 20%
Avg Deal Size: 5%
Response Time: 5%
Avg Time to Close: 5%
Hot Agent: 10%
Total: 100%
```

This system provides a transparent, data-driven approach to lead routing with full admin control and detailed performance insights. 🚀


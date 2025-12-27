# 📋 TODO List - Future Enhancements

## 🔥 High Priority

- [ ] **Add Unit Tests**
  - Test scoring engine with various agent profiles
  - Test explainability generation
  - Test edge cases (no agents, all ineligible, etc.)
  
- [ ] **Replace console.log with Logger**
  ```typescript
  // Use winston or pino
  import logger from './logger';
  logger.info('[Module] Message', { metadata });
  ```

- [ ] **Add Error Boundaries**
  ```tsx
  // Wrap critical components
  <ErrorBoundary fallback={<ErrorFallback />}>
    <ProposalDetailModal />
  </ErrorBoundary>
  ```

- [ ] **Add Loading States**
  - Skeleton loaders for proposal list
  - Loading spinner for score breakdown
  - Progressive disclosure for heavy computations

## 🎯 Medium Priority

- [ ] **Extract Magic Numbers to Constants**
  ```typescript
  // In config.ts
  export const SCORING = {
    MAX_SCORE: 100,
    EPSILON: 0.01,
    INELIGIBLE_RANK: 999,
  };
  ```

- [ ] **Add Input Validation (Zod)**
  ```typescript
  import { z } from 'zod';
  const LeadSchema = z.object({
    industry: z.string().min(1).optional(),
    dealSize: z.number().positive().optional(),
  });
  ```

- [ ] **Replace Hardcoded ORG_ID**
  - Extract from JWT token
  - Or from user session
  - Pass as parameter, not global constant

- [ ] **Fetch Real Board Names from Monday.com**
  - Replace mock "Lead Board XXXX"
  - Cache with TTL (24 hours)
  - Update cache on webhook

## 🌟 Nice to Have

- [ ] **Add Performance Monitoring**
  - Sentry for error tracking
  - DataDog/New Relic for APM
  - Track scoring engine latency

- [ ] **Add Comparison View (Phase 2)**
  - Side-by-side agent comparison
  - Visual progress bars for each metric
  - Tooltips explaining each metric

- [ ] **Add Agent Profile Health Check**
  - Endpoint: `GET /agents/profiles/health`
  - Show last computed time
  - Show stale profiles warning

- [ ] **Add Retry Logic**
  - For Monday.com API calls
  - Exponential backoff
  - Circuit breaker pattern

- [ ] **Add Rate Limiting**
  ```typescript
  import rateLimit from 'express-rate-limit';
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
  });
  app.use('/routing/', limiter);
  ```

## 📚 Documentation

- [ ] **Add API Documentation**
  - Swagger/OpenAPI spec
  - Postman collection
  - Examples for each endpoint

- [ ] **Add Architecture Diagrams**
  - Scoring Engine flow
  - Data flow diagram
  - Component diagram

- [ ] **Add Runbook**
  - How to debug scoring issues
  - How to recompute agent profiles
  - How to handle Monday.com outages

## 🔐 Security

- [ ] **Add Authentication Middleware**
  - JWT validation
  - Role-based access control (RBAC)
  - API key rotation

- [ ] **Add CSRF Protection**
  - For state-changing operations
  - For webhook endpoints

- [ ] **Audit Logging**
  - Log all routing decisions
  - Log all manual overrides
  - Compliance with data regulations

## 🧪 Testing

- [ ] **Add E2E Tests (Playwright)**
  ```typescript
  test('Manager can approve proposal', async ({ page }) => {
    await page.goto('/manager');
    await page.click('[data-testid="proposal-0"]');
    await page.click('[data-testid="approve-btn"]');
    await expect(page.locator('.toast')).toContainText('Approved');
  });
  ```

- [ ] **Add Integration Tests**
  - Test full routing flow
  - Test Monday.com webhooks
  - Test database transactions

- [ ] **Add Load Tests**
  - k6 or Artillery
  - Test with 1000+ agents
  - Test with 10000+ proposals

## 📊 Analytics

- [ ] **Add Analytics Dashboard**
  - Success rate of automated routing
  - Average score distribution
  - Agent utilization metrics
  - Manager override frequency

- [ ] **Add A/B Testing**
  - Test different scoring algorithms
  - Compare manual vs auto routing
  - Measure business impact

---

## ✅ Completed This Session

- [x] Fix `eval` reserved word bug
- [x] Fix import paths in scoring engine
- [x] Fix null checks in frontend
- [x] Add match score display
- [x] Add collapsible score breakdown
- [x] Add board name caching
- [x] Display all 8 metrics
- [x] Show alternative agents
- [x] Improve UI/UX design
- [x] Create code review report

---

**Priority Legend:**
- 🔥 High = Do within 1-2 weeks
- 🎯 Medium = Do within 1-2 months  
- 🌟 Nice to Have = Future consideration



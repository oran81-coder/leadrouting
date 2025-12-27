/**
 * Scoring Engine Constants
 * 
 * Centralized constants for scoring engine configuration.
 * This makes the code more maintainable and easier to configure.
 */

/**
 * Score Thresholds
 */
export const SCORE = {
  /** Maximum possible score */
  MAX: 100,
  /** Minimum possible score */
  MIN: 0,
  /** Epsilon for float comparison (0.01 = within 1%) */
  EPSILON: 0.01,
} as const;

/**
 * Ranking Constants
 */
export const RANK = {
  /** Top rank for best match */
  TOP: 1,
  /** Rank assigned to ineligible agents */
  INELIGIBLE: 999,
  /** Maximum number of alternative agents to show */
  MAX_ALTERNATIVES: 3,
} as const;

/**
 * Confidence Thresholds
 * Determines confidence level based on normalized score
 */
export const CONFIDENCE = {
  /** High confidence threshold (score >= 80) */
  HIGH_THRESHOLD: 80,
  /** Medium confidence threshold (score >= 50) */
  MEDIUM_THRESHOLD: 50,
  /** Low confidence is anything below MEDIUM_THRESHOLD */
} as const;

/**
 * Gating Filter Defaults
 * Rules for filtering out ineligible agents
 */
export const GATING = {
  /** Require agents to have availability > 0 */
  REQUIRE_AVAILABILITY: true,
  /** Exclude agents with high burnout scores */
  EXCLUDE_HIGH_BURNOUT: false,
  /** Maximum acceptable burnout score */
  MAX_BURNOUT_SCORE: 90,
  /** Minimum availability level */
  MIN_AVAILABILITY: 1,
} as const;

/**
 * Performance Metrics Windows
 * Time windows for calculating various metrics
 */
export const TIME_WINDOW = {
  /** Days to look back for conversion rate calculation */
  CONVERSION_DAYS: 90,
  /** Days to look back for average deal size */
  AVG_DEAL_DAYS: 180,
  /** Hours for hot streak detection */
  HOT_STREAK_HOURS: 168, // 7 days
  /** Hours for burnout decay calculation */
  BURNOUT_DECAY_HOURS: 72, // 3 days
} as const;

/**
 * Rule Evaluation Constants
 */
export const RULES = {
  /** Default weight if not specified */
  DEFAULT_WEIGHT: 1.0,
  /** Maximum weight value */
  MAX_WEIGHT: 10.0,
  /** Minimum weight value */
  MIN_WEIGHT: 0.0,
} as const;

/**
 * Type-safe constant access
 */
export type ScoringConstants = {
  SCORE: typeof SCORE;
  RANK: typeof RANK;
  CONFIDENCE: typeof CONFIDENCE;
  GATING: typeof GATING;
  TIME_WINDOW: typeof TIME_WINDOW;
  RULES: typeof RULES;
};

/**
 * All constants exported as a single object
 */
export const SCORING_CONSTANTS: ScoringConstants = {
  SCORE,
  RANK,
  CONFIDENCE,
  GATING,
  TIME_WINDOW,
  RULES,
} as const;

/**
 * Helper function to validate scoring constants
 * Ensures constants are logically consistent
 */
export function validateScoringConstants(): void {
  if (CONFIDENCE.HIGH_THRESHOLD <= CONFIDENCE.MEDIUM_THRESHOLD) {
    throw new Error(
      `CONFIDENCE.HIGH_THRESHOLD (${CONFIDENCE.HIGH_THRESHOLD}) must be > MEDIUM_THRESHOLD (${CONFIDENCE.MEDIUM_THRESHOLD})`
    );
  }

  if (SCORE.EPSILON <= 0) {
    throw new Error(`SCORE.EPSILON (${SCORE.EPSILON}) must be > 0`);
  }

  if (RANK.MAX_ALTERNATIVES < 1) {
    throw new Error(`RANK.MAX_ALTERNATIVES (${RANK.MAX_ALTERNATIVES}) must be >= 1`);
  }

  if (GATING.MAX_BURNOUT_SCORE > SCORE.MAX) {
    throw new Error(
      `GATING.MAX_BURNOUT_SCORE (${GATING.MAX_BURNOUT_SCORE}) cannot exceed SCORE.MAX (${SCORE.MAX})`
    );
  }
}

// Validate on module load (only in development)
if (process.env.NODE_ENV !== 'production') {
  validateScoringConstants();
}


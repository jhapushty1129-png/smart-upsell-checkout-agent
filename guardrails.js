/**
 * Guardrails Module
 * Enforces strict financial safety rules on upsell approvals regardless of AI output.
 */

// Maximum allowable ratio for upsell price vs cart total (20%)
const MAX_UPSELL_RATIO = 0.20;

/**
 * Checks if an upsell item price is under 20% of the current cart total.
 * @param {number} upsellPrice - Price of candidate upsell
 * @param {number} currentCartTotal - Current total value of cart
 * @returns {string} 'auto_approved' | 'needs_approval'
 */
function checkItemPriceBounds(upsellPrice, currentCartTotal) {
  if (!currentCartTotal || currentCartTotal <= 0) {
    return 'needs_approval';
  }

  const ratio = upsellPrice / currentCartTotal;
  // Under 20% of current cart total
  if (ratio < MAX_UPSELL_RATIO) {
    return 'auto_approved';
  }

  return 'needs_approval';
}

/**
 * Session-level Cap Tracker
 * Tracks cumulative auto-approved spending across a single session
 * and stops auto-approving if running total would exceed 20% of original cart value.
 */
class SessionCapTracker {
  constructor(originalCartValue = 0) {
    this.originalCartValue = originalCartValue;
    this.cumulativeAutoApprovedAmount = 0;
  }

  /**
   * Initializes or updates original cart value.
   * @param {number} value 
   */
  setOriginalCartValue(value) {
    if (this.originalCartValue === 0 || value < this.originalCartValue) {
      this.originalCartValue = value;
    }
  }

  /**
   * Calculates maximum total auto-approval limit for the session (20% of original cart value).
   */
  getMaxSessionCap() {
    return this.originalCartValue * MAX_UPSELL_RATIO;
  }

  /**
   * Evaluates if a new auto-approved amount fits within the session cap.
   * @param {number} upsellPrice 
   * @returns {{ allowed: boolean, remainingCap: number, projectedTotal: number, maxCap: number }}
   */
  canAutoApprove(upsellPrice) {
    const maxCap = this.getMaxSessionCap();
    const projectedTotal = this.cumulativeAutoApprovedAmount + upsellPrice;
    const remainingCap = Math.max(0, maxCap - this.cumulativeAutoApprovedAmount);

    return {
      allowed: projectedTotal <= maxCap,
      remainingCap,
      projectedTotal,
      maxCap,
    };
  }

  /**
   * Records an accepted auto-approved amount into the running total.
   * @param {number} amount 
   */
  recordAutoApprovedAmount(amount) {
    this.cumulativeAutoApprovedAmount += amount;
    return this.getSummary();
  }

  /**
   * Resets session tracking state.
   */
  reset(newOriginalCartValue = 0) {
    this.originalCartValue = newOriginalCartValue;
    this.cumulativeAutoApprovedAmount = 0;
  }

  /**
   * Returns current session cap status.
   */
  getSummary() {
    const maxCap = this.getMaxSessionCap();
    return {
      originalCartValue: this.originalCartValue,
      maxSessionCap: maxCap,
      cumulativeAutoApprovedAmount: this.cumulativeAutoApprovedAmount,
      remainingSessionCap: Math.max(0, maxCap - this.cumulativeAutoApprovedAmount),
      capLimitReached: this.cumulativeAutoApprovedAmount >= maxCap,
    };
  }
}

// Global session cap tracker instance
const sessionTracker = new SessionCapTracker();

/**
 * Enforces both item bounds and session cumulative cap guardrails.
 * @param {number} upsellPrice - Price of candidate item
 * @param {number} currentCartTotal - Current active total
 * @param {number} originalCartValue - Original total before upsells
 * @param {boolean|object} [aiSuggest=true] - Result from Gemini AI evaluation (boolean or result object)
 * @returns {object} Safety decision and metadata
 */
function evaluateGuardrails(upsellPrice, currentCartTotal, originalCartValue, aiSuggest = true) {
  sessionTracker.setOriginalCartValue(originalCartValue);

  const priceRatio = upsellPrice / currentCartTotal;
  const initialApprovalStatus = checkItemPriceBounds(upsellPrice, currentCartTotal);
  const sessionCapCheck = sessionTracker.canAutoApprove(upsellPrice);

  let finalApprovalStatus = initialApprovalStatus;
  let overrideReason = null;

  const isUnavailable = typeof aiSuggest === 'object' && aiSuggest !== null ? aiSuggest.unavailable === true : false;
  const isRecommended = typeof aiSuggest === 'object' && aiSuggest !== null ? aiSuggest.suggest === true : aiSuggest === true;

  if (isUnavailable) {
    finalApprovalStatus = 'needs_approval';
    overrideReason = 'AI service temporarily unavailable (Manual review required).';
  } else if (!isRecommended) {
    finalApprovalStatus = 'needs_approval';
    overrideReason = 'AI model did not recommend this upsell item.';
  } else if (initialApprovalStatus === 'auto_approved' && !sessionCapCheck.allowed) {
    finalApprovalStatus = 'needs_approval';
    overrideReason = `Session cumulative auto-approval cap would be exceeded (Limit: ₹${sessionCapCheck.maxCap.toFixed(2)}, Projected: ₹${sessionCapCheck.projectedTotal.toFixed(2)}).`;
  }

  return {
    approvalStatus: finalApprovalStatus, // 'auto_approved' | 'needs_approval'
    isAutoApproved: finalApprovalStatus === 'auto_approved',
    priceRatio: priceRatio,
    priceRatioPercentage: (priceRatio * 100).toFixed(1) + '%',
    underSingleItemThreshold: initialApprovalStatus === 'auto_approved',
    sessionCapAllowed: sessionCapCheck.allowed,
    aiRecommended: isRecommended,
    aiUnavailable: isUnavailable,
    overrideReason,
    sessionCapSummary: sessionTracker.getSummary(),
  };
}

module.exports = {
  MAX_UPSELL_RATIO,
  checkItemPriceBounds,
  SessionCapTracker,
  sessionTracker,
  evaluateGuardrails,
};

/**
 * Activity Logger Module
 * Records generated AI suggestions immediately and updates their outcome status later.
 * Provides formatted, human-readable console logs and log list views.
 */

let logs = [];
let logCounter = 1;

/**
 * Formats a log entry into a human-readable console display.
 * @param {object} entry 
 * @param {string} eventType 
 */
function printHumanReadableConsoleLog(entry, eventType = 'SUGGESTION_GENERATED') {
  const line = '==========================================================';
  const subline = '----------------------------------------------------------';
  
  if (eventType === 'AI_SERVICE_UNAVAILABLE' || entry.isServiceUnavailable) {
    console.log(`\n${line}`);
    console.log(`⚠️ UPSELL AGENT AUDIT LOG - AI SERVICE UNAVAILABLE [${entry.timestamp}] - ID: ${entry.id}`);
    console.log(`${subline}`);
    console.log(`📦 Candidate Product : ${entry.productName} (₹${entry.productPrice})`);
    console.log(`💡 Gemini AI Fit     : ❌ SERVICE UNREACHABLE / TIMEOUT`);
    console.log(`📝 Status Reason     : "${entry.reason}"`);
    console.log(`🛡️ Guardrail Status  : ⚠️ MANUAL REVIEW REQUIRED (AI Unavailable)`);
    console.log(`⏳ User Outcome      : ${entry.outcome.toUpperCase()}`);
    console.log(`${line}\n`);
  } else if (eventType === 'SUGGESTION_GENERATED') {
    console.log(`\n${line}`);
    console.log(`🤖 UPSELL AGENT AUDIT LOG [${entry.timestamp}] - ID: ${entry.id}`);
    console.log(`${subline}`);
    console.log(`📦 Candidate Product : ${entry.productName} (₹${entry.productPrice})`);
    console.log(`💡 Gemini AI Fit     : ${entry.aiSuggest ? 'RECOMMENDED' : 'NOT RECOMMENDED'}`);
    console.log(`📝 Gemini AI Reason  : "${entry.reason}"`);
    console.log(`🛡️ Guardrail Status  : ${entry.approvalStatus === 'auto_approved' ? '✅ AUTO-APPROVED (<20% cart total)' : '⚠️ NEEDS APPROVAL (' + (entry.overrideReason || '>=20% cart total or cap reached') + ')'}`);
    console.log(`⏳ User Outcome      : ${entry.outcome.toUpperCase()}`);
    console.log(`${line}\n`);
  } else if (eventType === 'OUTCOME_UPDATED') {
    let outcomeBadge = '❓ UNKNOWN';
    if (entry.outcome === 'accepted') outcomeBadge = '✅ ACCEPTED';
    if (entry.outcome === 'rejected') outcomeBadge = '❌ REJECTED';
    if (entry.outcome === 'failed') outcomeBadge = '⚠️ FAILED';

    console.log(`\n${subline}`);
    console.log(`🔄 UPSELL OUTCOME UPDATED [${entry.outcomeTimestamp}] - ID: ${entry.id}`);
    console.log(`📦 Product : ${entry.productName} (₹${entry.productPrice})`);
    console.log(`📌 Final Outcome : ${outcomeBadge}`);
    console.log(`${subline}\n`);
  }
}

/**
 * Records a new suggestion or AI outage event immediately when generated.
 * @param {object} params
 * @returns {object} The created log entry
 */
function recordSuggestion({ product, aiResult, claudeResult, guardrailResult }) {
  const agentResult = aiResult || claudeResult || {};
  const id = `LOG-${Date.now()}-${logCounter++}`;
  const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  const isServiceUnavailable = agentResult.unavailable === true;

  const entry = {
    id,
    timestamp,
    productId: product.id,
    productName: product.name,
    productPrice: product.price,
    aiSuggest: agentResult.suggest === true,
    claudeSuggest: agentResult.suggest === true, // Backward compatibility alias
    isServiceUnavailable,
    reason: agentResult.reason || 'No detailed explanation available.',
    approvalStatus: guardrailResult.approvalStatus, // 'auto_approved' | 'needs_approval'
    overrideReason: guardrailResult.overrideReason || null,
    priceRatioPercentage: guardrailResult.priceRatioPercentage,
    outcome: 'pending', // 'pending' | 'accepted' | 'rejected' | 'failed'
    outcomeTimestamp: null,
  };

  logs.push(entry);
  printHumanReadableConsoleLog(
    entry,
    isServiceUnavailable ? 'AI_SERVICE_UNAVAILABLE' : 'SUGGESTION_GENERATED'
  );
  return entry;
}

/**
 * Updates an existing log entry's outcome status (accepted, rejected, failed).
 * @param {string} logId 
 * @param {'accepted' | 'rejected' | 'failed'} outcome 
 * @returns {object|null} Updated log entry or null if not found
 */
function updateSuggestionOutcome(logId, outcome) {
  const entry = logs.find((l) => l.id === logId);
  if (!entry) {
    console.warn(`[Logger] Log entry with ID ${logId} not found.`);
    return null;
  }

  entry.outcome = outcome;
  entry.outcomeTimestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  
  printHumanReadableConsoleLog(entry, 'OUTCOME_UPDATED');
  return entry;
}

/**
 * Retrieves all logs in memory.
 */
function getAllLogs() {
  return [...logs];
}

/**
 * Formats all recorded logs into a human-readable text report.
 * @returns {string}
 */
function generateReadableReport() {
  if (logs.length === 0) {
    return 'No activity logged yet.';
  }

  return logs
    .map((l, index) => {
      const aiStatusStr = l.isServiceUnavailable
        ? 'AI Service: TEMPORARILY UNAVAILABLE'
        : `AI Suggestion: ${l.aiSuggest ? 'YES' : 'NO'}`;

      return `[${index + 1}] ID: ${l.id} | Time: ${l.timestamp}
    Product: ${l.productName} (₹${l.productPrice})
    ${aiStatusStr} ("${l.reason}")
    Guardrail: ${l.approvalStatus.toUpperCase()} (${l.priceRatioPercentage} ratio)
    Status: ${l.outcome.toUpperCase()}${l.outcomeTimestamp ? ' at ' + l.outcomeTimestamp : ''}`;
    })
    .join('\n----------------------------------------\n');
}

/**
 * Clears logs (for testing/reset).
 */
function clearLogs() {
  logs = [];
}

module.exports = {
  recordSuggestion,
  updateSuggestionOutcome,
  getAllLogs,
  generateReadableReport,
  clearLogs,
};


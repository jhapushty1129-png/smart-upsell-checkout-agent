require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Safely parses JSON string returned from Gemini API.
 * @param {string} text 
 * @returns {{suggest: boolean, reason: string}|null}
 */
function parseAgentResponse(text) {
  if (!text || typeof text !== 'string') {
    return null;
  }

  try {
    let cleaned = text.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const parsed = JSON.parse(cleaned);

    if (typeof parsed === 'object' && parsed !== null && typeof parsed.suggest === 'boolean') {
      return {
        suggest: parsed.suggest,
        reason: typeof parsed.reason === 'string' && parsed.reason.trim() !== ''
          ? parsed.reason.trim()
          : 'No detailed explanation provided by AI.',
      };
    }

    return null;
  } catch (error) {
    console.warn('[AgentLogic] Failed to parse JSON response from Gemini:', error.message);
    return null;
  }
}

/**
 * Evaluates whether an upsell product is a good fit using Google Gemini API.
 * Handles timeouts, failures, and simulated failures gracefully.
 * 
 * @param {Array} cartItems 
 * @param {object} candidateUpsell 
 * @param {object} [options={}] - Options like { simulateFailure: boolean, timeoutMs: number }
 * @returns {Promise<{suggest: boolean, reason: string, unavailable?: boolean}>}
 */
async function evaluateUpsellWithGemini(cartItems, candidateUpsell, options = {}) {
  const { simulateFailure = false, timeoutMs = 15000 } = options;

  // 1. Trigger simulated failure on demand for demo/testing
  if (simulateFailure) {
    console.warn('⚠️ [AgentLogic] Simulated failure mode triggered via request parameter.');
    return {
      suggest: false,
      unavailable: true,
      reason: 'AI service temporarily unavailable (Simulated demo failure).',
    };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
    console.warn('⚠️ [AgentLogic] GEMINI_API_KEY is missing or unconfigured in .env.');
    return {
      suggest: false,
      unavailable: true,
      reason: 'AI service temporarily unavailable (API Key missing).',
    };
  }

  const candidateModels = [
    'gemini-3.6-flash',
    'gemini-2.5-flash'
  ];

  const cartSummary = cartItems
    .map((item) => `- ${item.name} (Price: ₹${item.price})`)
    .join('\n');
  
  const cartTotal = cartItems.reduce((sum, item) => sum + item.price, 0);

  const prompt = `Cart Items:\n${cartSummary}\nTotal Cart Value: ₹${cartTotal}\n\nCandidate Upsell Product:\nName: ${candidateUpsell.name}\nPrice: ₹${candidateUpsell.price}\nDescription: ${candidateUpsell.description || 'N/A'}\n\nIs this candidate upsell product a good fit for the customer's cart?`;

  const genAI = new GoogleGenerativeAI(apiKey);
  let lastError = null;

  for (const modelName of candidateModels) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
        systemInstruction: 'You are an intelligent e-commerce upsell recommendation agent. Evaluate if the candidate upsell product complements the items in the cart. You MUST reply STRICTLY in valid JSON with no markdown formatting or extra text. Format: {"suggest": true, "reason": "one sentence explanation"} or {"suggest": false, "reason": "one sentence explanation"}.',
      });

      // Wrap API call in a timeout promise
      const generatePromise = model.generateContent(prompt);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Gemini API call timed out after ${timeoutMs}ms`)), timeoutMs)
      );

      const result = await Promise.race([generatePromise, timeoutPromise]);
      const responseText = result.response?.text();
      console.log(`[AgentLogic] Raw Gemini API Response (${modelName}):`, responseText);

      const parsed = parseAgentResponse(responseText);
      if (parsed) {
        return parsed;
      }
    } catch (error) {
      lastError = error;
      console.warn(`[AgentLogic] Gemini model ${modelName} returned error/timeout (${error.message}), trying next candidate/fallback...`);
      continue;
    }
  }

  console.error('\n==========================================================');
  console.error('❌ [AgentLogic] GEMINI API SERVICE FAILURE / TIMEOUT');
  console.error('----------------------------------------------------------');
  if (lastError) {
    console.error('Error Message :', lastError.message);
  }
  console.error('==========================================================\n');

  return {
    suggest: false,
    unavailable: true,
    reason: 'AI service temporarily unavailable (API failure or timeout).',
  };
}

module.exports = {
  parseAgentResponse,
  evaluateUpsellWithGemini,
  evaluateUpsellWithClaude: evaluateUpsellWithGemini,
};


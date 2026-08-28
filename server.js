require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const {
  getCartState,
  calculateCartTotal,
  addItemToCart,
  resetCart,
  CANDIDATE_UPSELL_PRODUCT,
  HIGH_VALUE_UPSELL_PRODUCT,
} = require('./cart-data');
const { evaluateUpsellWithGemini } = require('./agent-logic');
const { evaluateGuardrails, sessionTracker } = require('./guardrails');
const {
  recordSuggestion,
  updateSuggestionOutcome,
  getAllLogs,
  generateReadableReport,
  clearLogs,
} = require('./logger');
const { createRazorpayOrder } = require('./razorpay-service');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Keep track of original cart value for session cap baseline
let originalCartValue = calculateCartTotal();
sessionTracker.setOriginalCartValue(originalCartValue);

/**
 * GET /api/cart
 * Returns current cart state, items, total, and session cap summary.
 */
app.get('/api/cart', (req, res) => {
  const state = getCartState();
  res.json({
    success: true,
    ...state,
    sessionCap: sessionTracker.getSummary(),
  });
});

/**
 * POST /api/upsell/evaluate
 * Evaluates upsell candidate using Gemini AI and enforces code guardrails.
 * Supports simulateFailure=true query or body flag for demo testing.
 */
app.post('/api/upsell/evaluate', async (req, res) => {
  try {
    const { upsellType } = req.body;
    const simulateFailure = req.query.simulateFailure === 'true' || req.body.simulateFailure === true || req.body.simulateFailure === 'true';
    
    // Choose upsell product candidate
    let targetUpsell = CANDIDATE_UPSELL_PRODUCT;
    if (upsellType === 'high_value') {
      targetUpsell = HIGH_VALUE_UPSELL_PRODUCT;
    } else if (req.body.customProduct) {
      targetUpsell = req.body.customProduct;
    }

    const currentCart = getCartState();

    // 1. Call Gemini AI agent
    console.log(`[Server] Evaluating upsell candidate "${targetUpsell.name}" (₹${targetUpsell.price}) ${simulateFailure ? '[SIMULATED FAILURE MODE]' : ''}...`);
    const aiResult = await evaluateUpsellWithGemini(currentCart.items, targetUpsell, { simulateFailure });

    // 2. Enforce code-level guardrails (20% threshold + session cumulative cap + AI recommendation)
    const guardrailResult = evaluateGuardrails(
      targetUpsell.price,
      currentCart.subtotal,
      originalCartValue,
      aiResult
    );

    // 3. Log suggestion immediately
    const logEntry = recordSuggestion({
      product: targetUpsell,
      aiResult,
      guardrailResult,
    });

    res.json({
      success: true,
      logId: logEntry.id,
      product: targetUpsell,
      aiResult,
      claudeResult: aiResult, // Alias for backward compatibility
      guardrailResult,
      guardrail: guardrailResult,
      sessionCap: sessionTracker.getSummary(),
    });
  } catch (error) {
    console.error('[Server] Error evaluating upsell:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/upsell/respond
 * Updates outcome of generated suggestion (accepted/rejected).
 */
app.post('/api/upsell/respond', (req, res) => {
  try {
    const { logId, action, product } = req.body; // action: 'accept' | 'reject'

    if (!logId || !action) {
      return res.status(400).json({ success: false, error: 'logId and action are required.' });
    }

    const logs = getAllLogs();
    const logEntry = logs.find((l) => l.id === logId);

    if (!logEntry) {
      return res.status(404).json({ success: false, error: 'Log entry not found.' });
    }

    const targetProduct = product || {
      id: logEntry.productId,
      name: logEntry.productName,
      price: logEntry.productPrice,
    };

    if (action === 'accept') {
      // Add item to cart
      addItemToCart(targetProduct);

      // Record accepted upsell amount in cumulative session tracker
      sessionTracker.recordAutoApprovedAmount(targetProduct.price);

      updateSuggestionOutcome(logId, 'accepted');
    } else if (action === 'reject') {
      updateSuggestionOutcome(logId, 'rejected');
    } else {
      updateSuggestionOutcome(logId, 'failed');
    }

    const updatedCart = getCartState();
    const currentSessionCap = sessionTracker.getSummary();

    res.json({
      success: true,
      logId,
      outcome: action === 'accept' ? 'accepted' : 'rejected',
      cart: {
        ...updatedCart,
        sessionCap: currentSessionCap,
      },
      sessionCap: currentSessionCap,
    });
  } catch (error) {
    console.error('[Server] Error updating upsell response:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/checkout
 * Creates a real test-mode Razorpay order for current cart total.
 */
app.post('/api/checkout', async (req, res) => {
  try {
    const cartState = getCartState();
    const totalAmountInINR = cartState.subtotal;

    console.log(`[Server] Initiating checkout for cart total ₹${totalAmountInINR}...`);

    const result = await createRazorpayOrder(totalAmountInINR, 'checkout_order', {
      itemCount: cartState.items.length,
      itemNames: cartState.items.map((i) => i.name).join(', '),
    });

    if (result.success) {
      res.json({
        success: true,
        order: result.order,
        cart: cartState,
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    console.error('[Server] Checkout error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/logs
 * Returns audit logs in raw JSON and formatted human-readable text.
 */
app.get('/api/logs', (req, res) => {
  res.json({
    success: true,
    rawLogs: getAllLogs(),
    readableReport: generateReadableReport(),
  });
});

/**
 * POST /api/reset
 * Resets cart, session cap tracker, and activity log.
 */
app.post('/api/reset', (req, res) => {
  const newCart = resetCart();
  originalCartValue = newCart.subtotal;
  sessionTracker.reset(originalCartValue);
  clearLogs();

  const currentSessionCap = sessionTracker.getSummary();

  res.json({
    success: true,
    message: 'Cart, session tracker, and activity logs have been reset.',
    cart: {
      ...newCart,
      sessionCap: currentSessionCap,
    },
    sessionCap: currentSessionCap,
  });
});

// Start server when executed directly
if (require.main === module || process.env.VERCEL !== '1') {
  const server = app.listen(PORT, () => {
    console.log(`\n🚀 Smart Upsell Checkout Agent server running on http://localhost:${PORT}`);
    console.log(`🛒 Base cart subtotal: ₹${originalCartValue} | 20% Session Cap: ₹${(originalCartValue * 0.2).toFixed(2)}`);
    console.log(`📌 Open http://localhost:${PORT} in your browser to test the interactive dashboard.\n`);
  });

  server.on('error', (err) => {
    console.error('[Server] Fatal startup error:', err);
  });
}

module.exports = app;

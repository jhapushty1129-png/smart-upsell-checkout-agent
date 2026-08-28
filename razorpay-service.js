require('dotenv').config();
const Razorpay = require('razorpay');

/**
 * Initializes Razorpay instance using environment credentials.
 */
function getRazorpayInstance() {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  if (!key_id || !key_secret) {
    throw new Error('Razorpay API keys (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET) are missing from .env');
  }

  return new Razorpay({
    key_id,
    key_secret,
  });
}

/**
 * Creates a Razorpay order in INR.
 * @param {number} amountInINR - Amount in Rupees (e.g. 3500 for ₹3500)
 * @param {string} receiptPrefix - Optional receipt prefix
 * @param {object} notes - Optional metadata notes
 * @returns {Promise<object>} The created Razorpay order object
 */
async function createRazorpayOrder(amountInINR, receiptPrefix = 'receipt_order', notes = {}) {
  try {
    const razorpay = getRazorpayInstance();

    // Razorpay accepts amounts in paise (1 INR = 100 paise)
    const amountInPaise = Math.round(amountInINR * 100);

    const options = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: `${receiptPrefix}_${Date.now()}`,
      notes: {
        project: 'Smart Upsell Checkout Agent',
        ...notes,
      },
    };

    const order = await razorpay.orders.create(options);
    return { success: true, order };
  } catch (error) {
    console.error('--- Failed to Create Razorpay Order ---');
    let errorMessage = error.message || 'Unknown error creating Razorpay order';
    
    if (error && error.error) {
      console.error('Razorpay Error Code   :', error.error.code);
      console.error('Description           :', error.error.description);
      console.error('Field                 :', error.error.field);
      errorMessage = error.error.description || error.error.code || errorMessage;
    } else {
      console.error('Error Details         :', errorMessage);
    }

    return { success: false, error: errorMessage, rawError: error };
  }
}

module.exports = {
  createRazorpayOrder,
  getRazorpayInstance,
};

// 1. Load environment variables from the .env file into process.env
require('dotenv').config();

// 2. Import the official Razorpay Node.js SDK
const Razorpay = require('razorpay');

// 3. Initialize the Razorpay instance with key_id and key_secret from process.env
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// 4. Async function to create a test order on Razorpay
async function createTestOrder() {
  try {
    // Define the order creation options
    // Razorpay accepts amounts in paise (the smallest currency sub-unit in INR).
    // ₹500 = 500 * 100 = 50000 paise.
    const options = {
      amount: 50000,
      currency: 'INR',
      receipt: `receipt_order_${Date.now()}`,
      notes: {
        project: 'Smart Upsell Checkout Agent',
      },
    };

    // 5. Call the Razorpay Orders API to create the order asynchronously
    const order = await razorpay.orders.create(options);

    // 6. Print key order details and full response object to the console
    console.log('--- Razorpay Order Created Successfully ---');
    console.log('Order ID :', order.id);
    console.log('Status   :', order.status);
    console.log('Amount   :', order.amount / 100, order.currency);
    console.log('\nFull API Response:');
    console.log(JSON.stringify(order, null, 2));
  } catch (error) {
    // 7. Error handling block to log failure details cleanly without crashing the script
    console.error('--- Failed to Create Razorpay Order ---');
    if (error && error.error) {
      // API error structure returned by Razorpay
      console.error('Razorpay Error Code   :', error.error.code);
      console.error('Description           :', error.error.description);
      console.error('Field                 :', error.error.field);
    } else {
      // Generic or network error message
      console.error('Error Details         :', error.message || error);
    }
  }
}

// 8. Execute the script
createTestOrder();

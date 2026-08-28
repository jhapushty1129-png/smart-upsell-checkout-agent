// Load environment variables
require('dotenv').config();

// Import reusable Razorpay order creation function
const { createRazorpayOrder } = require('./razorpay-service');

// Async function to run test order creation using refactored service
async function runTestOrder() {
  const amountInINR = 500; // ₹500
  console.log(`Initiating Razorpay test order for ₹${amountInINR}...`);

  const result = await createRazorpayOrder(amountInINR, 'test_cli_receipt', {
    source: 'CLI Test Order Script',
  });

  if (result.success) {
    const order = result.order;
    console.log('--- Razorpay Order Created Successfully ---');
    console.log('Order ID :', order.id);
    console.log('Status   :', order.status);
    console.log('Amount   :', order.amount / 100, order.currency);
    console.log('\nFull API Response:');
    console.log(JSON.stringify(order, null, 2));
  } else {
    console.error('Test order creation failed:', result.error);
  }
}

// Execute the test script
runTestOrder();

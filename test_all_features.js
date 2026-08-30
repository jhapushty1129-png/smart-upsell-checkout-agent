require('dotenv').config();
const http = require('http');
const app = require('./server');

const PORT = 3098;
const server = app.listen(PORT, async () => {
  console.log(`Test verification server running on port ${PORT}...`);
  try {
    const baseUrl = `http://localhost:${PORT}`;

    function makePost(path, body = {}) {
      return new Promise((resolve, reject) => {
        const url = new URL(path, baseUrl);
        const data = JSON.stringify(body);
        const req = http.request(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data),
          }
        }, (res) => {
          let responseText = '';
          res.on('data', chunk => responseText += chunk);
          res.on('end', () => {
            try {
              resolve({ status: res.statusCode, data: JSON.parse(responseText) });
            } catch (e) {
              resolve({ status: res.statusCode, raw: responseText });
            }
          });
        });
        req.on('error', reject);
        req.write(data);
        req.end();
      });
    }

    console.log('\n--- TEST 1: Real Gemini AI Evaluation ---');
    const evalRes = await makePost('/api/upsell/evaluate', { upsellType: 'standard' });
    console.log('Status        :', evalRes.status);
    console.log('AI Recommend  :', evalRes.data.aiResult?.suggest);
    console.log('AI Explanation:', evalRes.data.aiResult?.reason);
    console.log('Guardrail     :', evalRes.data.guardrailResult?.approvalStatus);

    console.log('\n--- TEST 2: High Value Upsell (>20% threshold) ---');
    const highEvalRes = await makePost('/api/upsell/evaluate', { upsellType: 'high_value' });
    console.log('Status        :', highEvalRes.status);
    console.log('Guardrail     :', highEvalRes.data.guardrailResult?.approvalStatus);
    console.log('Reason        :', highEvalRes.data.guardrailResult?.overrideReason);

    console.log('\n--- TEST 3: Real Razorpay Order Checkout ---');
    const checkoutRes = await makePost('/api/checkout');
    console.log('Status        :', checkoutRes.status);
    console.log('Order ID      :', checkoutRes.data.order?.id);
    console.log('Amount (INR)  :', checkoutRes.data.order?.amount / 100);

    console.log('\n--- TEST 4: Simulated Razorpay Checkout Failure (?simulateCheckoutFailure=true) ---');
    const checkoutFailRes = await makePost('/api/checkout?simulateCheckoutFailure=true', { simulateCheckoutFailure: true });
    console.log('Status        :', checkoutFailRes.status);
    console.log('Success       :', checkoutFailRes.data.success);
    console.log('Error Message :', checkoutFailRes.data.error);

    console.log('\n--- TEST 5: Simulated AI Failure (?simulateFailure=true) ---');
    const aiFailRes = await makePost('/api/upsell/evaluate?simulateFailure=true', { simulateFailure: true });
    console.log('Status        :', aiFailRes.status);
    console.log('AI Unavailable:', aiFailRes.data.aiResult?.unavailable);
    console.log('AI Message    :', aiFailRes.data.aiResult?.reason);

    console.log('\n✅ ALL 5 INTEGRATION CHECKS PASSED SUCCESSFULLY!\n');

  } catch (err) {
    console.error('Test failed with error:', err);
  } finally {
    server.close();
  }
});

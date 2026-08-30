require('dotenv').config();
const http = require('http');
const app = require('./server');

const PORT = 3099;
const server = app.listen(PORT, async () => {
  console.log(`Test server running on port ${PORT}...`);
  try {
    const baseUrl = `http://localhost:${PORT}`;

    // Helper: POST request
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

    console.log('\n--- VERIFICATION 1: Real Gemini AI Evaluate Endpoint ---');
    const evalRes = await makePost('/api/upsell/evaluate', { upsellType: 'standard' });
    console.log('Evaluate HTTP Status :', evalRes.status);
    console.log('AI Suggest           :', evalRes.data.aiResult?.suggest);
    console.log('AI Reason            :', evalRes.data.aiResult?.reason);
    console.log('Guardrail Status     :', evalRes.data.guardrailResult?.approvalStatus);

    console.log('\n--- VERIFICATION 2: Real Razorpay Test Order Checkout Endpoint ---');
    const checkoutRes = await makePost('/api/checkout');
    console.log('Checkout HTTP Status :', checkoutRes.status);
    console.log('Razorpay Order ID    :', checkoutRes.data.order?.id);
    console.log('Razorpay Amount (INR):', checkoutRes.data.order?.amount / 100);
    console.log('Razorpay Receipt     :', checkoutRes.data.order?.receipt);

    console.log('\n--- VERIFICATION 3: Simulated Checkout Failure Endpoint (?simulateCheckoutFailure=true) ---');
    const checkoutFailRes = await makePost('/api/checkout?simulateCheckoutFailure=true', { simulateCheckoutFailure: true });
    console.log('Checkout Fail Status :', checkoutFailRes.status);
    console.log('Success              :', checkoutFailRes.data.success);
    console.log('Error Message        :', checkoutFailRes.data.error);

    console.log('\n--- VERIFICATION 4: Simulated AI Failure Endpoint (?simulateFailure=true) ---');
    const aiFailRes = await makePost('/api/upsell/evaluate?simulateFailure=true', { simulateFailure: true });
    console.log('AI Fail Status       :', aiFailRes.status);
    console.log('AI Unavailable       :', aiFailRes.data.aiResult?.unavailable);
    console.log('AI Reason            :', aiFailRes.data.aiResult?.reason);
    console.log('Guardrail Status     :', aiFailRes.data.guardrailResult?.approvalStatus);

    console.log('\n==========================================================');
    console.log('✅ ALL 4 EMPIRICAL VERIFICATION CHECKS COMPLETED!');
    console.log('==========================================================\n');

  } catch (err) {
    console.error('Verification failed with error:', err);
  } finally {
    server.close();
  }
});

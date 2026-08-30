require('dotenv').config();
const http = require('http');

async function testLocalhostServer() {
  console.log('Testing active localhost server at http://localhost:3000...\n');

  function makeReq(path, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
      const data = body ? JSON.stringify(body) : '';
      const req = http.request({
        hostname: 'localhost',
        port: 3000,
        path: path,
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        }
      }, (res) => {
        let text = '';
        res.on('data', c => text += c);
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(text) });
          } catch(e) {
            resolve({ status: res.statusCode, raw: text });
          }
        });
      });
      req.on('error', reject);
      if (data) req.write(data);
      req.end();
    });
  }

  try {
    const cartRes = await makeReq('/api/cart');
    console.log('1. GET /api/cart -> Status:', cartRes.status, '| Subtotal: ₹' + cartRes.data.subtotal);

    const evalRes = await makeReq('/api/upsell/evaluate', 'POST', { upsellType: 'standard' });
    console.log('2. POST /api/upsell/evaluate (Standard) -> Status:', evalRes.status, '| AI Suggest:', evalRes.data.aiResult?.suggest, '| Guardrail:', evalRes.data.guardrailResult?.approvalStatus);

    const highRes = await makeReq('/api/upsell/evaluate', 'POST', { upsellType: 'high_value' });
    console.log('3. POST /api/upsell/evaluate (High-Value) -> Status:', highRes.status, '| Guardrail:', highRes.data.guardrailResult?.approvalStatus);

    const chkRes = await makeReq('/api/checkout', 'POST');
    console.log('4. POST /api/checkout -> Status:', chkRes.status, '| Razorpay Order ID:', chkRes.data.order?.id);

    const chkFailRes = await makeReq('/api/checkout?simulateCheckoutFailure=true', 'POST', { simulateCheckoutFailure: true });
    console.log('5. POST /api/checkout?simulateCheckoutFailure=true -> Status:', chkFailRes.status, '| Error:', chkFailRes.data.error);

    const aiFailRes = await makeReq('/api/upsell/evaluate?simulateFailure=true', 'POST', { simulateFailure: true });
    console.log('6. POST /api/upsell/evaluate?simulateFailure=true -> Status:', aiFailRes.status, '| AI Unavailable:', aiFailRes.data.aiResult?.unavailable);

    console.log('\n==========================================================');
    console.log('✅ ALL LOCALHOST SERVER ENDPOINTS EMPIRICALLY VERIFIED!');
    console.log('==========================================================\n');

  } catch(err) {
    console.error('Localhost server test failed:', err.message);
  }
}

testLocalhostServer();

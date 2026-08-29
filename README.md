# Smart Upsell Checkout Agent

An AI agent that suggests cart upsells, decides auto-approve vs. ask-permission based on a spending cap enforced in code, logs every decision, and completes checkout via Razorpay (test mode).

**🔗 Live Demo:** https://jhapushty1129-png.github.io/smart-upsell-checkout-agent/
**📦 Repo:** https://github.com/jhapushty1129-png/smart-upsell-checkout-agent

## How It Works

1. Gemini evaluates the cart and suggests an upsell with a reason.
2. A guardrail (enforced in code, not just prompted to the AI) auto-approves suggestions under 20% of cart total — capped per session — and requires approval above that.
3. Every suggestion + outcome is logged immediately (the audit trail).
4. Checkout creates a real Razorpay test-mode order.
5. If the AI service fails, the app shows a clear message and keeps working — no crashes.

## Tech Stack

Node.js + Express · Google Gemini API · Razorpay (test mode) · HTML/CSS/JS

## Project Structure

```
├── server.js              # API endpoints
├── agent-logic.js         # Gemini calls + suggestion parsing
├── guardrails.js          # Bounds-check + session cap (code-enforced)
├── cart-data.js           # Cart/product data
├── razorpay-service.js    # Order creation
├── logger.js              # Audit trail
└── public/index.html      # Frontend
```

## Run Locally

```
git clone https://github.com/jhapushty1129-png/smart-upsell-checkout-agent
cd smart-upsell-checkout-agent
npm install
```

Create `.env`:
```
RAZORPAY_KEY_ID=your_key_here
RAZORPAY_KEY_SECRET=your_key_here
GEMINI_API_KEY=your_key_here
```

```
node server.js
```
Open `http://localhost:3000`.

---
Built solo for Razorpay's AI Builder Buildathon.

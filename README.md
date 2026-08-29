# 🤖 Smart Upsell Checkout Agent
> **Razorpay AI Builder Buildathon** | Track: *AI Growth & Agentic Commerce*  
> **Mandatory Bar Fulfilling:** *"Every money action explainable, bounded and gated. Show the audit trail and one failure handled gracefully."*

[![Live Demo](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-brightgreen?logo=github)](https://jhapushty1129-png.github.io/smart-upsell-checkout-agent/)
[![Razorpay](https://img.shields.io/badge/Razorpay-Test%20Mode%20API-blue?logo=razorpay)](https://razorpay.com)
[![Google Gemini](https://img.shields.io/badge/Google%20Gemini-3.6%20Flash-4285F4?logo=googlegemini)](https://ai.google.dev)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18.0.0-green?logo=nodedotjs)](https://nodejs.org)

**🔗 Live Demo:** [https://jhapushty1129-png.github.io/smart-upsell-checkout-agent/](https://jhapushty1129-png.github.io/smart-upsell-checkout-agent/)  
**📦 Repository:** [https://github.com/jhapushty1129-png/smart-upsell-checkout-agent](https://github.com/jhapushty1129-png/smart-upsell-checkout-agent)

An intelligent, autonomous e-commerce upsell evaluation and gated checkout agent. It increases merchant average order value (AOV) by recommending relevant complementary products at checkout, while strictly enforcing code-level financial guardrails to protect customer and merchant funds.

---

## 🌟 Key Architectural Pillars

### 1. 💡 Explainable AI Recommendations
The agent uses **Google Gemini 3.6 Flash** to evaluate whether a candidate product complements the items currently in the customer's cart. Every AI suggestion includes a plain-language sentence explaining *why* the item is a good fit, rendered prominently on the UI evaluation card.

### 2. 🛡️ Bounded Financial Guardrails
Financial limits are **hard-enforced in pure JavaScript logic** ([guardrails.js](file:///c:/Users/hp/.gemini/antigravity-ide/scratch/smart-upsell-checkout-agent/guardrails.js)) and **cannot be bypassed by prompt manipulation**:
* **Single-Item Price Threshold:** Upsell items priced at `< 20%` of the active cart total qualify for auto-approval. Any item `≥ 20%` is overridden to `NEEDS APPROVAL`.
* **Session Cumulative Cap:** Auto-approved upsells are tracked cumulatively across a checkout session. Once the total auto-approved amount exceeds `20%` of the initial baseline cart value (e.g. ₹700 on a ₹3,500 cart), subsequent auto-approvals are locked and converted to `NEEDS APPROVAL`.

### 3. 🚧 Gated Approval Flow
Any upsell flagged with `NEEDS APPROVAL` requires explicit human confirmation before the item can be added to the cart or billed. Razorpay checkout requires explicit user trigger.

### 4. 📜 Live Human-Readable Audit Trail
Every AI evaluation, guardrail check, price ratio percentage, and user outcome is recorded immediately by [logger.js](file:///c:/Users/hp/.gemini/antigravity-ide/scratch/smart-upsell-checkout-agent/logger.js) with full Kolkata timestamps and rendered live in the UI's **Live Audit Logs** panel and available via `/api/logs`.

### 5. ⚠️ Graceful Runtime Failure Recovery
If the Gemini API times out, fails, or is missing credentials, the system handles it gracefully:
* Cart and Razorpay checkout remain **100% operational**.
* The UI displays an alert badge: `⚠️ AI SERVICE TEMPORARILY UNAVAILABLE`.
* The evaluation status defaults to manual review.
* Includes a built-in **`?simulateFailure=true` demo mode** for live judging verification.

### 6. 💳 Real Razorpay Test API Integration
Unlike simple chatbots, this agent takes real money actions using official `@razorpay` Node.js SDK to construct genuine test-mode Razorpay Order objects (`razorpay.orders.create`), producing verified Order IDs and receipt numbers.

---

## 🏗️ Project Architecture

```
smart-upsell-checkout-agent/
├── server.js               # Express server API endpoints (/api/cart, /api/upsell/evaluate, /api/checkout)
├── agent-logic.js          # Google Gemini AI agent logic & JSON parsing with model fallbacks
├── guardrails.js           # Deterministic financial rule engine (20% ratio & session cap tracker)
├── logger.js               # Synchronous audit logging & human-readable report formatting
├── razorpay-service.js     # Razorpay API client integration (Order creation in INR)
├── cart-data.js            # Initial cart data & state management
├── test-order.js           # Standalone CLI test script for Razorpay order verification
├── index.html / public/    # Interactive modern UI dashboard with real-time audit log viewer
├── package.json            # Node.js dependencies & scripts
├── .env.example            # Template for environment variables
└── vercel.json             # Vercel serverless deployment configuration
```

---

## 🚀 Quick Start Guide

### Prerequisites
* **Node.js**: `v18.0.0` or higher
* **Razorpay Test Keys**: Free account from [Razorpay Dashboard](https://dashboard.razorpay.com)
* **Google Gemini API Key**: Free key from [Google AI Studio](https://aistudio.google.com)

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/jhapushty1129-png/smart-upsell-checkout-agent.git
cd smart-upsell-checkout-agent
npm install
```

### 2. Configure Environment Variables
Copy the `.env.example` template to `.env`:
```bash
cp .env.example .env
```

Edit `.env` and fill in your keys:
```env
RAZORPAY_KEY_ID=rzp_test_YOUR_KEY_ID
RAZORPAY_KEY_SECRET=YOUR_KEY_SECRET
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
PORT=3000
```

### 3. Run the Application
Start the server:
```bash
npm start
```
Open your browser and navigate to **`http://localhost:3000`**.

---

## 🧪 Hackathon Demo Walkthrough for Judges

Follow these 5 steps to verify all hackathon criteria in under 2 minutes:

### 1️⃣ Standard Upsell (Auto-Approved)
* Click **"Evaluate Candidate (Wrist Rest ₹450)"**.
* **Observe:** Price ratio is `12.9%` (`< 20%` of ₹3,500).
* **Result:** Green badge `✅ AUTO-APPROVED (12.9% of cart total)` appears with Gemini's AI reasoning.
* **Audit Trail:** Check the *Live Audit Logs* panel to see the logged event.

### 2️⃣ High-Value Guardrail Test (Gated Approval)
* Click **"Evaluate High-Value (Monitor Stand ₹1200)"**.
* **Observe:** Price ratio is `24.0%` (`≥ 20%` threshold).
* **Result:** Yellow warning badge `⚠️ NEEDS APPROVAL (34.3% of cart total >=20% threshold)`.
* **Verification:** Proves code guardrails override AI recommendations when financial limits are breached.

### 3️⃣ Session Cumulative Cap Limit Test
* Click **"Accept Upsell"** on the Wrist Rest (₹450).
* Progress bar fills to `₹450 / ₹700` (`64%` of max session cap).
* Click **"Evaluate Candidate (Wrist Rest ₹450)"** again.
* **Result:** Status changes to `⚠️ NEEDS APPROVAL` because projected session total (`₹900`) would exceed the `₹700` session cap limit.

### 4️⃣ Graceful AI Failure Recovery Demo Mode
* Open **`http://localhost:3000/?simulateFailure=true`** in your browser.
* Notice the red alert banner indicating simulated failure mode is active.
* Click **"Evaluate Candidate"**.
* **Result:** Displays red badge `⚠️ AI SERVICE TEMPORARILY UNAVAILABLE`. The server does not crash, base shopping cart remains functional, and Razorpay checkout works seamlessly.

### 5️⃣ Real Razorpay Test Checkout Execution
* Click **"💳 Pay & Checkout with Razorpay"**.
* **Result:** Executes a real `razorpay.orders.create` API call and displays the live Razorpay Order ID (e.g. `order_TVUJ...`), total amount in INR, and receipt reference.

### ⚡ CLI Direct Razorpay Test Script
You can also test Razorpay order creation directly from terminal:
```bash
node test-order.js
```

---

## 📜 API Reference

| Endpoint | Method | Description |
| :--- | :---: | :--- |
| `GET /api/cart` | `GET` | Returns active cart items, subtotal, and session cap summary. |
| `POST /api/upsell/evaluate` | `POST` | Runs Gemini AI evaluation and applies `guardrails.js` code rules. |
| `POST /api/upsell/respond` | `POST` | Updates decision outcome (`accept` / `reject`) and updates session cap tracker. |
| `POST /api/checkout` | `POST` | Initiates real test-mode Razorpay order for current cart total. |
| `GET /api/logs` | `GET` | Returns audit logs in raw JSON and formatted text report. |
| `POST /api/reset` | `POST` | Resets session cart, cap tracker, and audit log history. |

---

## 📄 License
ISC License — Created for Razorpay AI Builder Buildathon 2026.

# 🧪 QA Checklist Generator v9 — AI-Powered Testing Tool

> *Instantly generate, prioritize, and manage comprehensive Quality Assurance checklists for any software feature. Now powered by Gemini 2.5 Pro and Claude 4.6 Sonnet for intelligent test case generation and risk analysis.*

[![Version](https://img.shields.io/badge/version-9.0.0-00e5ff?style=flat-square)](.)
[![Architecture](https://img.shields.io/badge/architecture-Vanilla_JS_&_Firebase-7c3aed?style=flat-square)](.)
[![AI Integrated](https://img.shields.io/badge/AI-Gemini_&_Claude-0052cc?style=flat-square)](.)
[![License](https://img.shields.io/badge/license-MIT-10b981?style=flat-square)](.)

---

## 🎯 The Problem it Solves

Every QA Engineer and Developer knows the struggle: under deadline pressure, obvious "Happy Path" test cases are verified, but critical edge cases (security vulnerabilities, accessibility issues, race conditions) are often overlooked.

**QA Checklist Generator instantly creates a structured, prioritized checklist with a single click, ensuring zero blind spots.**

---

## ✨ Key Features (v9)

### 🤖 AI-Powered Capabilities (New in v9)
- **✨ Smart Generation (Gemini 2.5 Pro):** Go beyond generic templates. The AI dynamically generates highly specific test scenarios based on your custom feature names.
- **💡 Missing Item Suggestions (Claude 4.6 Sonnet):** Have you missed something? The AI analyzes your current checklist and suggests edge cases focused on security and complex bugs.
- **🎯 Automated Risk Analysis:** Continuously evaluates your testing progress and generates a real-time risk score with actionable insights and deployment recommendations.

### ⚡ Core Functionalities
- **Instant Generation** — Over 300 pre-configured test cases across 10 major feature categories (API, Auth, Payment, Uploads, etc.).
- **Smart Prioritization** — Tags every test logically (Critical, High, Medium, Low).
- **Progress Tracking** — Real-time completion bars and metrics.
- **Local Persistence** — Close your tab and come back later; your session is automatically saved via `localStorage`.
- **Seamless Exports** — Export to Markdown (perfect for GitHub Issues & Jira), CSV, or fully formatted PDF reports.
- **Keyboard Shortcuts** — `G` to Genrerate, `E` for Markdown Export, `C` for CSV Export.
- **Zero Frontend Dependencies** — Built entirely with Vanilla JavaScript (ES Modules) for blazing-fast performance without React, Vue, or bundlers.

---

## 🏗️ Architecture & Tech Stack

This project was intentionally built using a modern, lightweight approach:

*   **Frontend:** HTML5, CSS3 (Custom Properties), Vanilla JavaScript (ES Modules).
*   **Backend / API Proxy:** Firebase Functions (Node.js) to securely handle AI API keys.
*   **Testing:** Cypress E2E Testing Pipeline.
*   **CI/CD:** GitHub Actions for automated testing and deployment.

### Modularity
The codebase strictly separates concerns (State/Engine, Storage, Renderer, Extractors, AI Adapters), making it highly maintainable without enforcing a massive framework.

---

## � Getting Started

To run this project locally, you must use a local HTTP server due to the reliance on ES Modules (the `file://` protocol will block module loading).

### Option 1: Using npx (Recommended)
```bash
# Clone the repository
git clone https://github.com/OussamaBelakhdar/qa-checklist-generator.git
cd qa-checklist-generator

# Serve the static files locally
npx serve .
```
Then open `http://localhost:3000` in your browser.

### Option 2: VS Code Live Server
1. Install the **Live Server** extension in VS Code.
2. Open `index.html` and click **"Go Live"** in the bottom right corner of your editor.

> **Note on AI Features:** The public codebase runs in **Mock Mode** by default (`__AI_MOCK__ = true`). This allows you to experience the UI and AI workflows locally without needing paid API keys for Gemini or Anthropic. 

---

## 🧪 Testing

The application is fully tested using Cypress to ensure core generation and export flows never break.

```bash
# Open Cypress interactive mode
npx cypress open

# Run all E2E tests headlessly
npx cypress run
```

---

## 👨‍💻 Author

**Oussama Belakhdar**  
*QA Automation Engineer*  
🌐 [AutomationDataCamp](https://automationdatacamp.com)  

---

*A cutting-edge SaaS solution designed to revolutionize the Quality Assurance process. Delivering autonomous test generation, proactive risk analysis, and seamless integration for modern engineering teams.*

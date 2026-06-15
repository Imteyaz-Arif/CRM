# AI Marketing CRM 🎯

**🚀 Live Application:** *crm3712.vercel.app*

An advanced, AI-powered marketing application that evaluates your customer database and generates highly targeted marketing campaigns. It uses Google's Gemini 3.1 Flash Lite model to instantly provide AI-driven audience segmentation, draft hyper-personalized marketing copy, and simulate live campaign dispatching across multiple channels.

## 📖 How to Use the Service
1. **Access the App**: Click the Live Application link above.
2. **Generate an Audience**: Navigate to the "Segments" tab and describe your target audience in plain English (e.g., "Find female shoppers who bought winter coats").
3. **Orchestrate a Campaign**: Navigate to the "Campaigns" tab, select your audience, and choose your delivery channel (WhatsApp, Email, etc.).
4. **Auto-Draft Copy**: Use the AI Auto-Draft feature to instantly generate personalized messaging based on the selected audience and customer profile.
5. **Launch & Monitor**: Click Launch and immediately view the live deployment feed on your main Dashboard to monitor pending, sent, and failed messages in real-time.

## ✨ Features
- **Intelligent Audience Segmentation**: Translates natural language prompts into precise SQL queries to instantly filter and match customer profiles from the PostgreSQL database.
- **Auto-Drafting AI Engine**: Powered by Gemini 3.1 Flash Lite to instantly draft contextual, personalized marketing messages tailored strictly to the matched demographic.
- **Premium UI**: A beautifully polished interface with dynamic animations, responsive layouts, dark-mode toggling, and real-time dashboard visualizations.
- **Live Dispatch Orchestration**: Simulates real-time campaign execution and logs message delivery statuses back to the database.

## 🛠️ Technology Stack
- **Frontend Architecture**: React, Vite, Tailwind CSS, Recharts
- **Backend Application**: Node.js, Express, TypeScript
- **AI Integration**: Google GenAI SDK (`gemini-3.1-flash-lite`)
- **Database**: PostgreSQL (NeonDB)

---
**Developed by Imteyaz Arif**
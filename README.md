# 🦷 AI Dental Growth System

> A production-ready full-stack patient acquisition and conversion system for premium dental clinics.

## System Overview

```
┌─────────────────────────────────────────────────────────┐
│                  AI DENTAL GROWTH SYSTEM                 │
├──────────────┬──────────────┬──────────────┬────────────┤
│  Landing     │  AI Chatbot  │   Booking    │  Analytics │
│  Page        │  (Sofia)     │   Funnel     │  Dashboard │
│  React+Vite  │  GPT-4o-mini │  Google Cal  │  Recharts  │
└──────────────┴──────────────┴──────────────┴────────────┘
                        │
         ┌──────────────▼──────────────┐
         │     Node.js + Express API    │
         │  /leads /chat /bookings      │
         │  /analytics /automation      │
         └──────────────┬──────────────┘
                        │
         ┌──────────────▼──────────────┐
         │         MongoDB Atlas        │
         │  Leads · Conversations       │
         │  Bookings · Admins           │
         └─────────────────────────────┘
                        │
         ┌──────────────▼──────────────┐
         │     Automation Services      │
         │  WhatsApp (Twilio)           │
         │  Email (SendGrid)            │
         │  Reminders (Scheduled)       │
         └─────────────────────────────┘
```

## Features

### 🌐 Conversion-Optimised Landing Page
- Hero with animated stats and CTA
- Services grid (Invisalign, Implants, Veneers, Whitening)
- Patient reviews and testimonials
- FAQ accordion
- Quick lead capture form
- Sticky CTA button
- Bilingual: English + Arabic (RTL)
- SEO optimised with Schema.org markup

### 🤖 AI Chatbot (Sofia)
- GPT-4o-mini powered conversational AI
- 7-stage qualification flow
- Real-time lead scoring (0-100)
- Hot/Warm/Cold classification
- Treatment recommendation engine
- Collects: name, email, phone, issue, budget, urgency
- Language detection (EN/AR)

### ⚡ Automated Follow-up
- **Hot leads**: Instant WhatsApp + email
- **Warm leads**: 3-email nurture sequence (Day 0, 2, 5)
- **Cold leads**: Educational content email
- **No-response**: 24h re-engagement WhatsApp
- All templates production-ready

### 📅 Smart Booking Funnel
- 4-step guided booking process
- Google Calendar integration
- Real-time slot availability
- Auto-confirmation emails
- 24h + 2h appointment reminders

### 📊 Analytics Dashboard
- Lead metrics (total, hot/warm/cold)
- Conversion rates
- Revenue pipeline estimation
- Time-series charts (Recharts)
- Lead source breakdown
- AI-powered growth insights

### 🧠 AI Optimization Engine
- Drop-off point detection
- Automated improvement suggestions
- Funnel health scoring
- Source ROI comparison

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS, Framer Motion |
| Backend | Node.js, Express.js |
| Database | MongoDB, Mongoose |
| AI | OpenAI GPT-4o-mini |
| WhatsApp | Twilio |
| Email | SendGrid / Nodemailer |
| Calendar | Google Calendar API |
| Auth | JWT |
| Charts | Recharts |
| Deployment | Vercel (frontend) + Render (backend) |

## Project Structure

```
dental-growth-system/
├── backend/
│   ├── src/
│   │   ├── models/
│   │   │   ├── Lead.js          # Lead schema + scoring
│   │   │   ├── Conversation.js  # Chat history
│   │   │   ├── Booking.js       # Appointments
│   │   │   └── Admin.js         # Auth users
│   │   ├── routes/
│   │   │   ├── leads.js         # Lead CRUD + re-engagement
│   │   │   ├── chat.js          # Chatbot API
│   │   │   ├── bookings.js      # Booking + Google Cal
│   │   │   ├── analytics.js     # Dashboard data
│   │   │   ├── automation.js    # Manual triggers
│   │   │   └── auth.js          # JWT auth
│   │   ├── services/
│   │   │   ├── chatbotService.js    # GPT-4o-mini + lead qual
│   │   │   └── automationService.js # WhatsApp + email
│   │   ├── middleware/
│   │   │   └── auth.js          # JWT middleware
│   │   └── server.js            # Express app
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LandingPage.jsx  # Main conversion page
│   │   │   ├── BookingPage.jsx  # 4-step booking funnel
│   │   │   ├── AdminLogin.jsx   # JWT login
│   │   │   └── Dashboard.jsx    # Analytics + leads
│   │   ├── components/
│   │   │   └── chatbot/
│   │   │       └── ChatWidget.jsx
│   │   ├── i18n/
│   │   │   └── translations.js  # EN + AR
│   │   └── utils/
│   │       └── api.js           # Axios client
│   ├── index.html               # SEO optimised
│   ├── vite.config.js
│   └── tailwind.config.js
│
├── DEPLOYMENT.md
└── README.md
```

## Quick Start

```bash
# 1. Clone and setup backend
cd backend
cp .env.example .env
# Edit .env with your API keys
npm install
npm run dev

# 2. Setup frontend
cd frontend
npm install
npm run dev

# 3. Create first admin
curl -X POST http://localhost:5000/api/auth/setup \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin","email":"admin@clinic.com","password":"Password123!"}'

# 4. Visit
# Landing page: http://localhost:5173
# Admin panel:  http://localhost:5173/admin/login
# API docs:     http://localhost:5000/api/health
```

## API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/login` | — | Admin login |
| POST | `/api/auth/setup` | — | First admin setup |
| GET | `/api/auth/me` | JWT | Current admin |
| POST | `/api/chat/start` | — | Start chat session |
| POST | `/api/chat/message` | — | Send message |
| GET | `/api/chat/history/:id` | — | Chat history |
| POST | `/api/leads` | — | Create lead (form) |
| GET | `/api/leads` | JWT | List leads |
| PATCH | `/api/leads/:id` | JWT | Update lead |
| POST | `/api/leads/:id/reengage` | JWT | Trigger re-engagement |
| GET | `/api/bookings/slots` | — | Available slots |
| POST | `/api/bookings` | — | Create booking |
| GET | `/api/bookings` | JWT | List bookings |
| GET | `/api/analytics/overview` | JWT | Dashboard metrics |
| GET | `/api/analytics/timeseries` | JWT | Chart data |
| GET | `/api/analytics/ai-insights` | JWT | AI recommendations |

## License

MIT — Built for real business impact.

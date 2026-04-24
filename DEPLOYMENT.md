# 🚀 AI Dental Growth System — Deployment Guide

## Prerequisites
- Node.js 18+
- MongoDB Atlas account (free tier works)
- Vercel account (frontend)
- Render.com account (backend)

---

## 1. MongoDB Atlas Setup

1. Go to [cloud.mongodb.com](https://cloud.mongodb.com) → Create free cluster
2. Database Access → Add user with read/write permissions
3. Network Access → Allow access from anywhere (0.0.0.0/0)
4. Get your connection string:
   ```
   mongodb+srv://USERNAME:PASSWORD@cluster.mongodb.net/dental_growth
   ```

---

## 2. Backend Setup (Render.com)

### Local Development
```bash
cd backend
cp .env.example .env
# Fill in your .env values

npm install
npm run dev
# Server runs on http://localhost:5000
```

### Create Admin Account (first time)
```bash
curl -X POST http://localhost:5000/api/auth/setup \
  -H "Content-Type: application/json" \
  -d '{"name":"Dr Smith","email":"admin@clinic.com","password":"SecurePass123!"}'
```

### Deploy to Render

1. Push code to GitHub
2. Go to [render.com](https://render.com) → New → Web Service
3. Connect your GitHub repo, select `backend` folder
4. Settings:
   - **Build Command**: `npm install`
   - **Start Command**: `node src/server.js`
   - **Node Version**: 18
5. Environment Variables — add all from `.env.example`:
   ```
   MONGODB_URI=mongodb+srv://...
   JWT_SECRET=your_32_char_secret_here
   OPENAI_API_KEY=sk-...
   TWILIO_ACCOUNT_SID=AC...
   TWILIO_AUTH_TOKEN=...
   TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
   SENDGRID_API_KEY=SG...
   FROM_EMAIL=hello@yourdentalclinic.com
   FROM_NAME=Smile Studio Dental
   FRONTEND_URL=https://your-frontend.vercel.app
   NODE_ENV=production
   ```
6. Deploy → Note your URL: `https://dental-api.onrender.com`

---

## 3. Google Calendar Integration

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create project → Enable Calendar API
3. Create OAuth 2.0 credentials (Web Application)
4. Add redirect URI: `https://your-api.onrender.com/api/booking/oauth/callback`
5. Get refresh token using OAuth playground
6. Add to backend env:
   ```
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   GOOGLE_REFRESH_TOKEN=...
   GOOGLE_CALENDAR_ID=your-calendar@gmail.com
   ```

---

## 4. Twilio WhatsApp Setup

1. Sign up at [twilio.com](https://twilio.com)
2. Get a WhatsApp-enabled number (or use Sandbox for testing)
3. **Sandbox testing**: Text `join [word]` to +14155238886 from each test number
4. **Production**: Apply for WhatsApp Business API approval
5. Add to env: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`

---

## 5. SendGrid Email Setup

1. Sign up at [sendgrid.com](https://sendgrid.com)
2. Settings → API Keys → Create API Key (Full Access)
3. Verify your sender email address
4. Add to env: `SENDGRID_API_KEY`, `FROM_EMAIL`, `FROM_NAME`

---

## 6. Frontend Setup (Vercel)

### Local Development
```bash
cd frontend
npm install
cp .env.example .env.local
# VITE_API_URL=http://localhost:5000/api

npm run dev
# Runs on http://localhost:5173
```

### Deploy to Vercel

1. Install Vercel CLI: `npm i -g vercel`
2. ```bash
   cd frontend
   vercel deploy --prod
   ```
3. Or connect GitHub repo at [vercel.com](https://vercel.com) → Import
4. Framework Preset: **Vite**
5. Root Directory: `frontend`
6. Environment Variables:
   ```
   VITE_API_URL=https://dental-api.onrender.com/api
   ```
7. Deploy → Note your URL: `https://your-clinic.vercel.app`
8. Update backend `FRONTEND_URL` env var with this URL

---

## 7. Vercel Configuration

Create `frontend/vercel.json`:
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-XSS-Protection", "value": "1; mode=block" }
      ]
    }
  ]
}
```

---

## 8. Custom Domain Setup

### Vercel (Frontend)
1. Vercel Dashboard → Project → Settings → Domains
2. Add `www.yourdentalclinic.com`
3. Update DNS: CNAME → `cname.vercel-dns.com`

### Render (Backend)
1. Render Dashboard → Service → Settings → Custom Domains
2. Add `api.yourdentalclinic.com`
3. Update DNS: CNAME → your Render URL

---

## 9. Post-Deployment Checklist

- [ ] MongoDB Atlas connection working
- [ ] Admin account created via `/api/auth/setup`
- [ ] OpenAI API key valid and chatbot responding
- [ ] Test WhatsApp message sent from Twilio sandbox
- [ ] Test email sent via SendGrid
- [ ] Google Calendar event created on test booking
- [ ] Frontend deployed and chatbot widget visible
- [ ] Admin dashboard login working at `/admin/login`
- [ ] Analytics data populating after first leads
- [ ] SSL certificates active on both domains

---

## 10. Performance Optimisations

### Frontend (already configured)
- Code splitting via Vite manual chunks
- Lazy loading of ChatWidget
- Image lazy loading via `loading="lazy"`
- Google Fonts preconnect

### Backend
```bash
# Add Redis for caching (optional)
npm install redis ioredis

# Add in server.js:
# Cache analytics queries for 5 minutes
# Cache slot availability for 1 minute
```

### MongoDB Indexes (auto-created by models)
- `leads`: email, phone, leadTemperature+status, createdAt, sessionId
- `conversations`: sessionId, leadId, converted
- `bookings`: appointmentDate, leadId, status

---

## 11. Environment Variables Quick Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | ✅ | MongoDB connection string |
| `JWT_SECRET` | ✅ | Min 32 chars, random string |
| `OPENAI_API_KEY` | ✅ | GPT-4o-mini for chatbot |
| `TWILIO_ACCOUNT_SID` | ⚠️ | WhatsApp messaging |
| `TWILIO_AUTH_TOKEN` | ⚠️ | WhatsApp messaging |
| `SENDGRID_API_KEY` | ⚠️ | Email automation |
| `GOOGLE_CLIENT_ID` | ⚠️ | Calendar integration |
| `GOOGLE_REFRESH_TOKEN` | ⚠️ | Calendar integration |
| `FRONTEND_URL` | ✅ | Your Vercel URL for CORS |
| `BOOKING_LINK` | ✅ | Full URL to /book page |

✅ = Required to start | ⚠️ = Required for full functionality (system works without these but degrades gracefully)

---

## 12. Monitoring & Alerts

### Render (Backend)
- Enable Health Checks: `/api/health`
- Set restart policy: Always
- Enable disk persistence for logs

### Set up uptime monitoring (free)
```
https://uptimerobot.com → Monitor URL: https://your-api.onrender.com/api/health
```

### Error tracking (optional)
```bash
npm install @sentry/node
# Add SENTRY_DSN to env
```

---

## Support

- Backend logs: Render Dashboard → Logs
- Frontend logs: Vercel Dashboard → Deployments → Functions
- Database: MongoDB Atlas → Collections (dental_growth)

**Estimated monthly costs:**
- MongoDB Atlas M0 (free): £0
- Render Free tier: £0 (spins down after inactivity — upgrade for production)
- Render Starter ($7/mo): Recommended for production
- Vercel Hobby (free): £0
- OpenAI API: ~£10-30/mo depending on chat volume
- Twilio WhatsApp: ~£0.005/message
- SendGrid Free (100 emails/day): £0

**Total production estimate: ~£20-50/month**

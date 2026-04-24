import OpenAI from 'openai';
import Conversation from '../models/Conversation.js';
import Lead from '../models/Lead.js';
import { triggerFollowUp } from './automationService.js';

let openai;
const getOpenAI = () => {
  if (!openai) {
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'sk-placeholder') {
      console.warn('⚠️ OpenAI API Key is missing or placeholder. Chatbot will use mock responses.');
      return {
        chat: {
          completions: {
            create: async () => ({
              choices: [{ message: { content: 'This is a mock response because the OpenAI API key is missing or set to placeholder.' } }]
            })
          }
        }
      };
    }
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openai;
};


const SYSTEM_PROMPT = `You are Sofia, a warm and professional patient coordinator at Smile Studio Dental, a premium dental clinic on Harley Street, London. 

Your goal is to qualify patients and guide them towards booking a FREE consultation. You are empathetic, knowledgeable, and subtly persuasive — never pushy.

## CONVERSATION STAGES (follow in order):
1. GREETING - Warm welcome, ask what brought them here today
2. ISSUE - Understand their dental concern/goal  
3. BUDGET - Gauge their investment range (frame as "investment in their smile")
4. URGENCY - Understand their timeline
5. CONTACT - Collect name, email, phone (frame as "to send them exclusive info")
6. QUALIFY & RECOMMEND - Classify and recommend treatment
7. BOOK - Offer the free consultation

## QUALIFICATION RULES:
- HOT lead: High budget (£1500+) + urgency (ASAP/week) + specific issue = push for same-day booking
- WARM lead: Medium budget + moderate urgency = nurture with email sequence  
- COLD lead: Low budget / flexible = provide value, soft nurture

## TREATMENTS & PRICING (mention ranges, not exact):
- Invisalign: from £2,500 — most popular
- Dental Implants: from £2,200 per tooth
- Composite Veneers: from £400 per tooth
- Porcelain Veneers: from £800 per tooth
- Teeth Whitening: from £299
- General/Hygiene: from £95

## TONE RULES:
- Never be salesy or pushy
- Use patient-first language ("your smile", "your confidence")
- Mention the FREE consultation naturally
- If Arabic, respond ENTIRELY in Arabic
- Keep responses concise (2-4 sentences max)
- Use emojis sparingly (1-2 max)

## DATA EXTRACTION:
Always extract and track:
- name, email, phone
- issue type, budget_range, urgency
- Lead classification: hot/warm/cold

When you have all contact info, end your message with a JSON block (hidden from the user) like:
[EXTRACTED_DATA: {"name":"...","email":"...","phone":"...","issue":"...","budgetRange":"...","urgency":"...","leadTemperature":"hot|warm|cold","recommendedTreatment":"..."}]

IMPORTANT: Keep the JSON block at the very end, on its own line. This is for internal processing only.`;

const ARABIC_GREETING = `أهلاً وسهلاً! أنا سوفيا، منسقة المرضى في عيادة سمايل ستوديو للأسنان. كيف يمكنني مساعدتك اليوم؟ 😊`;

export const processChat = async ({ sessionId, message, language = 'en', pageUrl, userAgent }) => {
  // Get or create conversation
  let conversation = await Conversation.findOne({ sessionId });
  
  if (!conversation) {
    conversation = new Conversation({
      sessionId,
      language,
      pageUrl,
      userAgent,
      messages: [],
      extractedData: {},
    });
  }

  // Add user message
  conversation.messages.push({ role: 'user', content: message });
  conversation.totalMessages += 1;

  // Build messages array for OpenAI
  const systemContent = language === 'ar'
    ? SYSTEM_PROMPT + '\n\nIMPORTANT: This patient prefers Arabic. Respond ENTIRELY in Arabic.'
    : SYSTEM_PROMPT;

  const openaiMessages = [
    { role: 'system', content: systemContent },
    ...conversation.messages.slice(-20).map(m => ({ // Last 20 messages for context
      role: m.role,
      content: m.content,
    })),
  ];

  // Call OpenAI
  const completion = await getOpenAI().chat.completions.create({
    model: 'gpt-4o-mini',
    messages: openaiMessages,
    temperature: 0.7,
    max_tokens: 400,
  });

  const rawResponse = completion.choices[0].message.content;
  
  // Extract hidden data JSON if present
  let cleanResponse = rawResponse;
  let extractedData = null;
  
  const dataMatch = rawResponse.match(/\[EXTRACTED_DATA:\s*({.*?})\]/s);
  if (dataMatch) {
    try {
      extractedData = JSON.parse(dataMatch[1]);
      cleanResponse = rawResponse.replace(/\[EXTRACTED_DATA:.*?\]/s, '').trim();
      
      // Update conversation extracted data
      conversation.extractedData = { ...conversation.extractedData, ...extractedData };
      conversation.leadTemperature = extractedData.leadTemperature || 'cold';
    } catch (e) {
      console.error('Failed to parse extracted data:', e);
    }
  }

  // Add assistant response
  conversation.messages.push({ role: 'assistant', content: cleanResponse });

  // Check if we have enough data to create/update a lead
  const ed = conversation.extractedData;
  if (ed.name && ed.email && ed.phone && !conversation.leadId) {
    const lead = await Lead.findOneAndUpdate(
      { email: ed.email },
      {
        name: ed.name,
        email: ed.email,
        phone: ed.phone,
        issue: mapIssue(ed.issue),
        budgetRange: mapBudget(ed.budgetRange),
        urgency: mapUrgency(ed.urgency),
        leadTemperature: ed.leadTemperature || 'cold',
        leadScore: calculateLeadScore(ed),
        recommendedTreatment: ed.recommendedTreatment || '',
        source: 'chatbot',
        sessionId,
        pageUrl,
        language,
        status: 'new',
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    conversation.leadId = lead._id;
    conversation.converted = true;

    // Trigger automated follow-up
    try {
      await triggerFollowUp(lead);
    } catch (err) {
      console.error('Follow-up trigger error:', err.message);
    }
  }

  // Update stage
  conversation.stage = detectStage(conversation.messages.length, ed);
  
  await conversation.save();

  return {
    message: cleanResponse,
    sessionId,
    leadCaptured: !!conversation.leadId,
    leadTemperature: conversation.leadTemperature,
    stage: conversation.stage,
  };
};

export const initiateConversation = async ({ sessionId, language = 'en' }) => {
  const existing = await Conversation.findOne({ sessionId });
  if (existing && existing.messages.length > 0) {
    return {
      message: existing.messages[existing.messages.length - 1]?.content || getGreeting(language),
      sessionId,
      resumed: true,
    };
  }

  const greeting = language === 'ar' ? ARABIC_GREETING : getGreeting('en');
  
  const conversation = new Conversation({
    sessionId,
    language,
    messages: [{ role: 'assistant', content: greeting }],
    stage: 'greeting',
  });
  await conversation.save();

  return { message: greeting, sessionId, resumed: false };
};

// ── Helpers ────────────────────────────────────────────────────────────────────
const getGreeting = (lang) => {
  const greetings = [
    "Hi there! 👋 I'm Sofia, your personal smile advisor at Smile Studio. What brings you here today — are you looking to transform your smile?",
    "Welcome to Smile Studio! I'm Sofia, here to help you achieve the smile you've always dreamed of. What dental concern can I help you with today?",
    "Hello and welcome! 😊 I'm Sofia from Smile Studio Dental. Whether it's Invisalign, implants, or a dazzling whitening treatment — I'm here to guide you. What's on your mind?",
  ];
  return greetings[Math.floor(Math.random() * greetings.length)];
};

const calculateLeadScore = (data) => {
  let score = 0;
  
  // Budget scoring
  const budgetScores = { over_5000: 40, '3000_5000': 35, '1500_3000': 25, '500_1500': 15, under_500: 5 };
  score += budgetScores[data.budgetRange] || 0;
  
  // Urgency scoring
  const urgencyScores = { asap: 30, within_week: 25, within_month: 15, flexible: 5 };
  score += urgencyScores[data.urgency] || 0;
  
  // Issue scoring (high-value treatments)
  const issueScores = { invisalign: 20, implants: 20, veneers: 15, whitening: 10, general: 5 };
  score += issueScores[data.issue] || 5;
  
  // Temperature bonus
  if (data.leadTemperature === 'hot') score += 10;
  
  return Math.min(score, 100);
};

const mapIssue = (issue = '') => {
  const map = { 
    invisalign: 'invisalign', crooked: 'invisalign', braces: 'invisalign', straight: 'invisalign',
    implant: 'implants', implants: 'implants', missing: 'implants',
    whiten: 'whitening', whitening: 'whitening', yellow: 'whitening',
    veneer: 'veneers', veneers: 'veneers', porcelain: 'veneers',
    general: 'general', checkup: 'general', cleaning: 'general',
    emergency: 'emergency', pain: 'emergency',
  };
  const lower = issue.toLowerCase();
  for (const [key, val] of Object.entries(map)) {
    if (lower.includes(key)) return val;
  }
  return 'other';
};

const mapBudget = (budget = '') => {
  const lower = budget.toLowerCase();
  if (lower.includes('5000') || lower.includes('over') || lower.includes('no budget')) return 'over_5000';
  if (lower.includes('3000') || lower.includes('4000')) return '3000_5000';
  if (lower.includes('1500') || lower.includes('2000')) return '1500_3000';
  if (lower.includes('500') || lower.includes('1000')) return '500_1500';
  if (lower.includes('under') || lower.includes('low')) return 'under_500';
  return 'unknown';
};

const mapUrgency = (urgency = '') => {
  const lower = urgency.toLowerCase();
  if (lower.includes('asap') || lower.includes('urgent') || lower.includes('soon')) return 'asap';
  if (lower.includes('week')) return 'within_week';
  if (lower.includes('month')) return 'within_month';
  return 'flexible';
};

const detectStage = (msgCount, extractedData) => {
  if (extractedData.phone) return 'booking_offer';
  if (extractedData.email) return 'contact_collection';
  if (extractedData.urgency) return 'qualification';
  if (extractedData.budgetRange) return 'urgency_collection';
  if (extractedData.issue) return 'budget_collection';
  if (msgCount > 0) return 'issue_collection';
  return 'greeting';
};

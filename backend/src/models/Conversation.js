import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  role: { type: String, enum: ['system', 'user', 'assistant'], required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  intent: String,       // detected intent
  entities: mongoose.Schema.Types.Mixed, // extracted entities
});

const conversationSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true, index: true },
  leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },

  messages: [messageSchema],

  // Extracted data during conversation
  extractedData: {
    name: String,
    email: String,
    phone: String,
    issue: String,
    budgetRange: String,
    urgency: String,
    preferredTime: String,
  },

  // Conversation state machine
  stage: {
    type: String,
    enum: ['greeting', 'issue_collection', 'budget_collection', 'urgency_collection',
           'contact_collection', 'qualification', 'booking_offer', 'completed', 'abandoned'],
    default: 'greeting',
  },

  // Quality metrics
  totalMessages: { type: Number, default: 0 },
  duration: { type: Number, default: 0 }, // seconds
  converted: { type: Boolean, default: false },
  abandonedAt: String, // which stage

  // AI analysis
  sentiment: { type: String, enum: ['positive', 'neutral', 'negative'], default: 'neutral' },
  leadTemperature: { type: String, enum: ['hot', 'warm', 'cold'], default: 'cold' },

  // Language
  language: { type: String, enum: ['en', 'ar'], default: 'en' },

  // Source
  pageUrl: String,
  userAgent: String,
  ipAddress: String,
}, {
  timestamps: true,
});

conversationSchema.index({ createdAt: -1 });
conversationSchema.index({ leadId: 1 });
conversationSchema.index({ converted: 1 });

const Conversation = mongoose.model('Conversation', conversationSchema);
export default Conversation;

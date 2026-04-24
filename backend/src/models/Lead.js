import mongoose from 'mongoose';

const leadSchema = new mongoose.Schema({
  // Contact Info
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  phone: { type: String, required: true, trim: true },

  // Qualification
  issue: {
    type: String,
    enum: ['invisalign', 'implants', 'whitening', 'veneers', 'general', 'emergency', 'other'],
    default: 'general',
  },
  budgetRange: {
    type: String,
    enum: ['under_500', '500_1500', '1500_3000', '3000_5000', 'over_5000', 'unknown'],
    default: 'unknown',
  },
  urgency: {
    type: String,
    enum: ['asap', 'within_week', 'within_month', 'flexible'],
    default: 'flexible',
  },

  // AI Classification
  leadScore: { type: Number, default: 0, min: 0, max: 100 },
  leadTemperature: {
    type: String,
    enum: ['hot', 'warm', 'cold'],
    default: 'cold',
  },
  recommendedTreatment: { type: String, default: '' },
  aiNotes: { type: String, default: '' },

  // Tracking
  source: {
    type: String,
    enum: ['chatbot', 'form', 'referral', 'google', 'instagram', 'facebook', 'direct'],
    default: 'chatbot',
  },
  utmSource: String,
  utmMedium: String,
  utmCampaign: String,
  pageUrl: String,
  sessionId: String,

  // Status
  status: {
    type: String,
    enum: ['new', 'contacted', 'qualified', 'booked', 'converted', 'lost', 'nurturing'],
    default: 'new',
  },

  // Follow-up
  followUpCount: { type: Number, default: 0 },
  lastContactedAt: Date,
  nextFollowUpAt: Date,
  followUpHistory: [{
    type: { type: String, enum: ['email', 'whatsapp', 'sms', 'call'] },
    sentAt: { type: Date, default: Date.now },
    template: String,
    status: { type: String, enum: ['sent', 'delivered', 'read', 'failed'], default: 'sent' },
  }],

  // Revenue
  estimatedRevenue: { type: Number, default: 0 },
  actualRevenue: { type: Number, default: 0 },

  // Language preference
  language: { type: String, enum: ['en', 'ar'], default: 'en' },

  // Booking reference
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },

  // Consent
  gdprConsent: { type: Boolean, default: false },
  marketingConsent: { type: Boolean, default: false },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
});

// Indexes for fast queries
leadSchema.index({ email: 1 });
leadSchema.index({ phone: 1 });
leadSchema.index({ leadTemperature: 1, status: 1 });
leadSchema.index({ createdAt: -1 });
leadSchema.index({ sessionId: 1 });

// Virtual: days since created
leadSchema.virtual('daysSinceCreated').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Pre-save: calculate estimated revenue based on treatment
leadSchema.pre('save', function(next) {
  const revenueMap = {
    invisalign: 4500,
    implants: 3000,
    whitening: 600,
    veneers: 2500,
    general: 300,
    emergency: 250,
    other: 500,
  };
  if (this.isModified('issue')) {
    this.estimatedRevenue = revenueMap[this.issue] || 500;
  }
  next();
});

const Lead = mongoose.model('Lead', leadSchema);
export default Lead;

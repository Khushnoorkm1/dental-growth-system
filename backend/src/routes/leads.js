import express from 'express';
import Lead from '../models/Lead.js';
import { protect } from '../middleware/auth.js';
import { triggerFollowUp, sendReEngagement } from '../services/automationService.js';

const router = express.Router();

// POST /api/leads — Create a lead (from landing page form)
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, issue, source = 'form', language, gdprConsent, marketingConsent } = req.body;

    if (!name || !email || !phone) {
      return res.status(400).json({ error: 'Name, email and phone are required' });
    }

    // Check for existing lead
    const existing = await Lead.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.json({ success: true, lead: existing, existing: true });
    }

    const lead = await Lead.create({
      name, email, phone, issue: issue || 'general',
      source, language, gdprConsent, marketingConsent,
      leadTemperature: 'warm', // form leads start as warm
    });

    // Trigger follow-up
    try { await triggerFollowUp(lead); } catch (e) { console.error(e); }

    res.status(201).json({ success: true, lead: { _id: lead._id, name: lead.name } });
  } catch (err) {
    console.error('Create lead error:', err);
    res.status(500).json({ error: 'Failed to create lead' });
  }
});

// GET /api/leads — Admin: list leads
router.get('/', protect, async (req, res) => {
  try {
    const { page = 1, limit = 25, temperature, status, search, sortBy = 'createdAt', order = 'desc' } = req.query;

    const filter = {};
    if (temperature) filter.leadTemperature = temperature;
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const sortOrder = order === 'asc' ? 1 : -1;
    const leads = await Lead.find(filter)
      .sort({ [sortBy]: sortOrder })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('bookingId', 'appointmentDate status');

    const total = await Lead.countDocuments(filter);

    res.json({
      success: true, leads, total,
      page: +page, pages: Math.ceil(total / limit),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get leads' });
  }
});

// GET /api/leads/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id).populate('bookingId');
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    res.json({ success: true, lead });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get lead' });
  }
});

// PATCH /api/leads/:id
router.patch('/:id', protect, async (req, res) => {
  try {
    const allowedUpdates = ['status', 'leadTemperature', 'clinicNotes', 'nextFollowUpAt'];
    const updates = {};
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const lead = await Lead.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    res.json({ success: true, lead });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update lead' });
  }
});

// POST /api/leads/:id/reengage
router.post('/:id/reengage', protect, async (req, res) => {
  try {
    await sendReEngagement(req.params.id);
    res.json({ success: true, message: 'Re-engagement triggered' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to re-engage lead' });
  }
});

export default router;

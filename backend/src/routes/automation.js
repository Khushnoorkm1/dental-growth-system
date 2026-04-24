import express from 'express';
import { triggerFollowUp, sendBookingReminder } from '../services/automationService.js';
import Lead from '../models/Lead.js';
import Booking from '../models/Booking.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// POST /api/automation/trigger-followup/:leadId — Manual trigger
router.post('/trigger-followup/:leadId', protect, async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.leadId);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    await triggerFollowUp(lead);
    res.json({ success: true, message: `Follow-up triggered for ${lead.name} (${lead.leadTemperature} lead)` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to trigger follow-up' });
  }
});

// POST /api/automation/send-reminder/:bookingId
router.post('/send-reminder/:bookingId', protect, async (req, res) => {
  try {
    const { type = '24h' } = req.body;
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    await sendBookingReminder(booking, type);
    res.json({ success: true, message: 'Reminder sent' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send reminder' });
  }
});

// GET /api/automation/pending — Leads needing follow-up
router.get('/pending', protect, async (req, res) => {
  try {
    const now = new Date();
    const pending = await Lead.find({
      status: { $in: ['new', 'contacted', 'nurturing'] },
      $or: [
        { nextFollowUpAt: { $lte: now } },
        { nextFollowUpAt: { $exists: false }, createdAt: { $lte: new Date(now - 24 * 60 * 60 * 1000) } },
      ],
    }).sort({ leadTemperature: 1, createdAt: 1 }).limit(50);

    res.json({ success: true, leads: pending, count: pending.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get pending leads' });
  }
});

export default router;

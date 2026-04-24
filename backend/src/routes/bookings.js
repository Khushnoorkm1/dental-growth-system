import express from 'express';
import { google } from 'googleapis';
import Booking from '../models/Booking.js';
import Lead from '../models/Lead.js';
import { protect } from '../middleware/auth.js';
import { sendBookingReminder } from '../services/automationService.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Google Calendar OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

const getCalendarClient = () => {
  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  });
  return google.calendar({ version: 'v3', auth: oauth2Client });
};

// GET /api/bookings/slots?date=YYYY-MM-DD — Available slots
router.get('/slots', async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'Date is required' });

    const dayDate = new Date(date);
    const dayOfWeek = dayDate.getDay();

    // Clinic hours: Mon-Fri 9-18, Sat 9-14, Sun closed
    if (dayOfWeek === 0) {
      return res.json({ success: true, slots: [], message: 'Clinic closed on Sundays' });
    }

    const startHour = 9;
    const endHour = dayOfWeek === 6 ? 14 : 18;
    const slotDuration = 60; // minutes

    // Generate all possible slots
    const allSlots = [];
    for (let hour = startHour; hour < endHour; hour++) {
      allSlots.push(`${hour.toString().padStart(2, '0')}:00`);
    }

    // Get booked slots from DB
    const startOfDay = new Date(date + 'T00:00:00.000Z');
    const endOfDay = new Date(date + 'T23:59:59.999Z');

    const bookedSlots = await Booking.find({
      appointmentDate: { $gte: startOfDay, $lte: endOfDay },
      status: { $nin: ['cancelled'] },
    }).select('appointmentDate');

    const bookedTimes = bookedSlots.map(b =>
      new Date(b.appointmentDate).toISOString().substr(11, 5)
    );

    const availableSlots = allSlots.filter(slot => !bookedTimes.includes(slot));

    res.json({ success: true, slots: availableSlots, date });
  } catch (err) {
    console.error('Get slots error:', err);
    res.status(500).json({ error: 'Failed to get available slots' });
  }
});

// POST /api/bookings — Create booking
router.post('/', async (req, res) => {
  try {
    const { leadId, treatmentType, appointmentDate, patientNotes } = req.body;

    if (!leadId || !treatmentType || !appointmentDate) {
      return res.status(400).json({ error: 'leadId, treatmentType, and appointmentDate are required' });
    }

    const lead = await Lead.findById(leadId);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    // Check slot availability
    const slotStart = new Date(appointmentDate);
    const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000); // 1hr slot

    const conflict = await Booking.findOne({
      appointmentDate: slotStart,
      status: { $nin: ['cancelled'] },
    });

    if (conflict) {
      return res.status(409).json({ error: 'This time slot is no longer available' });
    }

    // Create booking
    const booking = await Booking.create({
      leadId,
      treatmentType,
      appointmentDate: slotStart,
      appointmentEndDate: slotEnd,
      patientName: lead.name,
      patientEmail: lead.email,
      patientPhone: lead.phone,
      patientNotes,
      confirmationToken: uuidv4(),
      status: 'confirmed',
      confirmedAt: new Date(),
    });

    // Update lead
    await Lead.findByIdAndUpdate(leadId, {
      status: 'booked',
      bookingId: booking._id,
    });

    // Add to Google Calendar (if configured)
    try {
      if (process.env.GOOGLE_REFRESH_TOKEN) {
        const calendar = getCalendarClient();
        const event = await calendar.events.insert({
          calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
          requestBody: {
            summary: `🦷 ${treatmentType.toUpperCase()} - ${lead.name}`,
            description: `Patient: ${lead.name}\nEmail: ${lead.email}\nPhone: ${lead.phone}\nTreatment: ${treatmentType}\nNotes: ${patientNotes || 'None'}`,
            start: { dateTime: slotStart.toISOString() },
            end: { dateTime: slotEnd.toISOString() },
            attendees: [{ email: lead.email }],
            reminders: {
              useDefault: false,
              overrides: [
                { method: 'email', minutes: 24 * 60 },
                { method: 'popup', minutes: 120 },
              ],
            },
          },
        });
        await Booking.findByIdAndUpdate(booking._id, {
          googleEventId: event.data.id,
          calendarLink: event.data.htmlLink,
        });
      }
    } catch (calErr) {
      console.error('Calendar error:', calErr.message);
    }

    // Schedule reminders
    const now = Date.now();
    const apptTime = slotStart.getTime();

    const schedule24h = apptTime - 24 * 60 * 60 * 1000;
    const schedule2h = apptTime - 2 * 60 * 60 * 1000;

    if (schedule24h > now) {
      setTimeout(() => sendBookingReminder(booking, '24h'), schedule24h - now);
    }
    if (schedule2h > now) {
      setTimeout(() => sendBookingReminder(booking, '2h'), schedule2h - now);
    }

    res.status(201).json({ success: true, booking });
  } catch (err) {
    console.error('Create booking error:', err);
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

// GET /api/bookings — Admin: list bookings
router.get('/', protect, async (req, res) => {
  try {
    const { page = 1, limit = 25, status, from, to } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (from || to) {
      filter.appointmentDate = {};
      if (from) filter.appointmentDate.$gte = new Date(from);
      if (to) filter.appointmentDate.$lte = new Date(to);
    }

    const bookings = await Booking.find(filter)
      .populate('leadId', 'name email phone leadTemperature')
      .sort({ appointmentDate: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Booking.countDocuments(filter);
    res.json({ success: true, bookings, total, page: +page });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get bookings' });
  }
});

// PATCH /api/bookings/:id
router.patch('/:id', protect, async (req, res) => {
  try {
    const { status, clinicNotes, depositPaid } = req.body;
    const updates = {};
    if (status) { updates.status = status; if (status === 'cancelled') updates.cancelledAt = new Date(); }
    if (clinicNotes !== undefined) updates.clinicNotes = clinicNotes;
    if (depositPaid !== undefined) { updates.depositPaid = depositPaid; updates.depositPaidAt = new Date(); }

    const booking = await Booking.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    res.json({ success: true, booking });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update booking' });
  }
});

export default router;

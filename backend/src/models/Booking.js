import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
  leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true },

  // Appointment details
  treatmentType: {
    type: String,
    enum: ['invisalign', 'implants', 'whitening', 'veneers', 'general', 'emergency', 'consultation'],
    required: true,
  },
  appointmentDate: { type: Date, required: true },
  appointmentEndDate: { type: Date, required: true },
  duration: { type: Number, default: 60 }, // minutes

  // Patient Info snapshot
  patientName: { type: String, required: true },
  patientEmail: { type: String, required: true },
  patientPhone: { type: String, required: true },

  // Status
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed', 'no_show', 'rescheduled'],
    default: 'pending',
  },

  // Google Calendar
  googleEventId: String,
  calendarLink: String,

  // Reminders sent
  reminders: [{
    type: { type: String, enum: ['24h', '2h', '1h'] },
    channel: { type: String, enum: ['email', 'whatsapp', 'sms'] },
    sentAt: Date,
    status: { type: String, enum: ['sent', 'failed', 'delivered'] },
  }],

  // Notes
  clinicNotes: String,
  patientNotes: String,

  // Revenue
  quotedPrice: Number,
  depositPaid: { type: Number, default: 0 },
  depositPaidAt: Date,

  // Confirmation
  confirmationToken: String,
  confirmedAt: Date,
  cancelledAt: Date,
  cancellationReason: String,
}, {
  timestamps: true,
  toJSON: { virtuals: true },
});

bookingSchema.index({ appointmentDate: 1 });
bookingSchema.index({ leadId: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ patientEmail: 1 });

// Virtual: is upcoming
bookingSchema.virtual('isUpcoming').get(function() {
  return this.appointmentDate > new Date() && this.status === 'confirmed';
});

const Booking = mongoose.model('Booking', bookingSchema);
export default Booking;

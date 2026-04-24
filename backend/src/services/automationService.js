import twilio from 'twilio';
import nodemailer from 'nodemailer';
import Lead from '../models/Lead.js';

// ── Clients ────────────────────────────────────────────────────────────────────
let twilioClient;
try {
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }
} catch (e) { console.warn('Twilio not configured:', e.message); }

const emailTransport = nodemailer.createTransport({
  host: 'smtp.sendgrid.net',
  port: 587,
  auth: {
    user: 'apikey',
    pass: process.env.SENDGRID_API_KEY,
  },
});

// ── Main Trigger ───────────────────────────────────────────────────────────────
export const triggerFollowUp = async (lead) => {
  console.log(`🔥 Triggering follow-up for ${lead.name} | Temperature: ${lead.leadTemperature}`);

  const { leadTemperature } = lead;

  if (leadTemperature === 'hot') {
    await handleHotLead(lead);
  } else if (leadTemperature === 'warm') {
    await handleWarmLead(lead);
  } else {
    await handleColdLead(lead);
  }

  // Schedule reminders
  scheduleReminders(lead);
};

// ── Hot Lead: Instant WhatsApp + Email ────────────────────────────────────────
const handleHotLead = async (lead) => {
  const whatsappMsg = buildWhatsAppMessage('hot', lead);
  const emailContent = buildEmailTemplate('hot_instant', lead);

  await Promise.allSettled([
    sendWhatsApp(lead.phone, whatsappMsg, lead),
    sendEmail(lead.email, emailContent.subject, emailContent.html, lead),
  ]);

  await Lead.findByIdAndUpdate(lead._id, {
    status: 'contacted',
    lastContactedAt: new Date(),
    nextFollowUpAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
  });
};

// ── Warm Lead: Email Nurture Sequence ─────────────────────────────────────────
const handleWarmLead = async (lead) => {
  // Email 1: Immediate
  const email1 = buildEmailTemplate('warm_welcome', lead);
  await sendEmail(lead.email, email1.subject, email1.html, lead);

  // Email 2: 2 days later
  setTimeout(async () => {
    const email2 = buildEmailTemplate('warm_case_study', lead);
    await sendEmail(lead.email, email2.subject, email2.html, lead);
    await incrementFollowUp(lead._id, 'email', 'warm_case_study');
  }, 2 * 24 * 60 * 60 * 1000);

  // Email 3: 5 days later
  setTimeout(async () => {
    const email3 = buildEmailTemplate('warm_offer', lead);
    await sendEmail(lead.email, email3.subject, email3.html, lead);
    await incrementFollowUp(lead._id, 'email', 'warm_offer');
  }, 5 * 24 * 60 * 60 * 1000);

  await Lead.findByIdAndUpdate(lead._id, {
    status: 'nurturing',
    lastContactedAt: new Date(),
  });
};

// ── Cold Lead: Value Email ────────────────────────────────────────────────────
const handleColdLead = async (lead) => {
  const email = buildEmailTemplate('cold_education', lead);
  await sendEmail(lead.email, email.subject, email.html, lead);
};

// ── Re-engagement (no response after 24h) ────────────────────────────────────
export const sendReEngagement = async (leadId) => {
  const lead = await Lead.findById(leadId);
  if (!lead || lead.status === 'booked' || lead.status === 'converted') return;

  if (lead.followUpCount < 3) {
    const msg = buildWhatsAppMessage('reengagement', lead);
    await sendWhatsApp(lead.phone, msg, lead);
    await incrementFollowUp(leadId, 'whatsapp', 'reengagement');
  }
};

// ── Booking Reminders ─────────────────────────────────────────────────────────
export const sendBookingReminder = async (booking, type) => {
  const lead = await Lead.findById(booking.leadId);
  if (!lead) return;

  const emailContent = buildEmailTemplate('booking_reminder', { ...lead.toObject(), booking, reminderType: type });
  const whatsappMsg = buildWhatsAppMessage('booking_reminder', { ...lead.toObject(), booking, reminderType: type });

  await Promise.allSettled([
    sendEmail(lead.email, emailContent.subject, emailContent.html, lead),
    sendWhatsApp(lead.phone, whatsappMsg, lead),
  ]);
};

// ── WhatsApp Sender ───────────────────────────────────────────────────────────
const sendWhatsApp = async (phone, message, lead) => {
  if (!twilioClient) {
    console.log(`[WhatsApp MOCK] To: ${phone}\n${message}`);
    return { mock: true };
  }

  try {
    const normalizedPhone = phone.startsWith('+') ? phone : `+${phone}`;
    const result = await twilioClient.messages.create({
      from: process.env.TWILIO_WHATSAPP_FROM,
      to: `whatsapp:${normalizedPhone}`,
      body: message,
    });
    await incrementFollowUp(lead._id, 'whatsapp', 'sent');
    return result;
  } catch (err) {
    console.error('WhatsApp send error:', err.message);
    await incrementFollowUp(lead._id, 'whatsapp', 'failed');
  }
};

// ── Email Sender ──────────────────────────────────────────────────────────────
const sendEmail = async (to, subject, html, lead) => {
  if (!process.env.SENDGRID_API_KEY) {
    console.log(`[Email MOCK] To: ${to} | Subject: ${subject}`);
    return { mock: true };
  }

  try {
    const result = await emailTransport.sendMail({
      from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
      to,
      subject,
      html,
    });
    await incrementFollowUp(lead._id, 'email', 'sent');
    return result;
  } catch (err) {
    console.error('Email send error:', err.message);
    await incrementFollowUp(lead._id, 'email', 'failed');
  }
};

// ── Message Templates ─────────────────────────────────────────────────────────
const buildWhatsAppMessage = (type, data) => {
  const clinic = process.env.CLINIC_NAME || 'Smile Studio Dental';
  const bookingLink = process.env.BOOKING_LINK || 'https://yourdentalclinic.com/book';
  const phone = process.env.CLINIC_PHONE || '+44 20 7123 4567';

  const templates = {
    hot: `✨ *${clinic}*\n\nHi ${data.name}! 👋\n\nThank you for your interest in ${data.recommendedTreatment || 'our dental services'}. Based on your answers, you're a perfect candidate!\n\n🎯 Your FREE consultation is just one click away:\n👉 ${bookingLink}\n\nWe have slots available THIS WEEK. Don't miss out — limited spaces!\n\nQuestions? Call us: ${phone}\n\n_${clinic} — Where Beautiful Smiles Begin_ 🦷`,
    
    reengagement: `Hi ${data.name}! 👋\n\nWe noticed you haven't booked your FREE consultation yet at ${clinic}.\n\nYour dream smile is waiting! 😊\n\n✅ No obligation\n✅ Expert advice\n✅ Personalised treatment plan\n\nBook now: ${bookingLink}\n\nOr reply to this message — we're here to help!`,
    
    booking_reminder: `📅 *Appointment Reminder*\n\nHi ${data.name}!\n\nThis is a reminder for your appointment at *${clinic}*:\n\n📅 Date: ${data.booking?.appointmentDate ? new Date(data.booking.appointmentDate).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }) : 'TBD'}\n⏰ Time: ${data.booking?.appointmentDate ? new Date(data.booking.appointmentDate).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : 'TBD'}\n🏥 ${process.env.CLINIC_ADDRESS || '123 Harley Street, London'}\n\n${data.reminderType === '24h' ? "We look forward to seeing you tomorrow!" : "We look forward to seeing you in 2 hours!"}\n\nNeed to reschedule? Call: ${phone}`,
  };

  return templates[type] || templates.reengagement;
};

const buildEmailTemplate = (type, data) => {
  const clinic = process.env.CLINIC_NAME || 'Smile Studio Dental';
  const bookingLink = process.env.BOOKING_LINK || 'https://yourdentalclinic.com/book';

  const baseStyle = `
    font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; background: #fafaf8;
    border-radius: 16px; overflow: hidden; border: 1px solid #e8e4df;
  `;
  const headerStyle = `
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
    padding: 40px 32px; text-align: center;
  `;
  const btnStyle = `
    display: inline-block; background: linear-gradient(135deg, #d4af37, #f4d03f);
    color: #1a1a2e; padding: 14px 32px; border-radius: 50px; text-decoration: none;
    font-weight: bold; font-size: 16px; margin: 24px 0;
  `;

  const templates = {
    hot_instant: {
      subject: `🎉 Your FREE Consultation is Ready — ${clinic}`,
      html: `<div style="${baseStyle}">
        <div style="${headerStyle}">
          <h1 style="color:#d4af37;margin:0;font-size:28px;">Smile Studio</h1>
          <p style="color:#a0aec0;margin:8px 0 0;">Premium Dental Care • Harley Street</p>
        </div>
        <div style="padding:40px 32px;">
          <h2 style="color:#1a1a2e;font-size:24px;">Hi ${data.name}, great news! 🎉</h2>
          <p style="color:#4a5568;line-height:1.8;font-size:16px;">
            Based on your interest in <strong>${data.recommendedTreatment || 'our premium dental services'}</strong>, 
            we've reserved a FREE consultation slot for you this week.
          </p>
          <p style="color:#4a5568;line-height:1.8;">
            Our specialist will create a personalised treatment plan tailored to your goals and budget — 
            completely free, no obligation.
          </p>
          <div style="text-align:center;">
            <a href="${bookingLink}" style="${btnStyle}">Book My FREE Consultation →</a>
          </div>
          <hr style="border:none;border-top:1px solid #e8e4df;margin:24px 0;">
          <p style="color:#718096;font-size:14px;text-align:center;">
            ${clinic} · ${process.env.CLINIC_ADDRESS || '123 Harley Street, London W1G 7HF'}
          </p>
        </div>
      </div>`,
    },
    warm_welcome: {
      subject: `Your personalised smile guide from ${clinic}`,
      html: `<div style="${baseStyle}">
        <div style="${headerStyle}">
          <h1 style="color:#d4af37;margin:0;font-size:28px;">Your Smile Journey</h1>
          <p style="color:#a0aec0;margin:8px 0 0;">Starts Here</p>
        </div>
        <div style="padding:40px 32px;">
          <h2 style="color:#1a1a2e;">Hi ${data.name} 👋</h2>
          <p style="color:#4a5568;line-height:1.8;">
            Thank you for reaching out. We understand that choosing the right dental treatment is a big decision — 
            and we're here to make it easy for you.
          </p>
          <p style="color:#4a5568;line-height:1.8;">
            Based on your enquiry, <strong>${data.recommendedTreatment || 'we have the perfect solution'}</strong> 
            could transform your confidence and give you the smile you deserve.
          </p>
          <div style="background:#f0f4f8;border-radius:12px;padding:20px;margin:20px 0;">
            <h3 style="color:#1a1a2e;margin-top:0;">✨ What your free consultation includes:</h3>
            <ul style="color:#4a5568;line-height:2;">
              <li>Full dental assessment (worth £150)</li>
              <li>Personalised treatment plan</li>
              <li>Transparent pricing breakdown</li>
              <li>Flexible finance options discussed</li>
            </ul>
          </div>
          <div style="text-align:center;">
            <a href="${bookingLink}" style="${btnStyle}">Claim My Free Consultation</a>
          </div>
        </div>
      </div>`,
    },
    warm_case_study: {
      subject: `"I wish I did this sooner" — a patient's story | ${clinic}`,
      html: `<div style="${baseStyle}">
        <div style="${headerStyle}">
          <h1 style="color:#d4af37;margin:0;font-size:28px;">Real Results</h1>
          <p style="color:#a0aec0;margin:8px 0 0;">Real Stories</p>
        </div>
        <div style="padding:40px 32px;">
          <p style="color:#4a5568;line-height:1.8;">Hi ${data.name},</p>
          <p style="color:#4a5568;line-height:1.8;">
            We wanted to share Sarah's story — she came to us with the exact same concern as you, 
            and here's what she said after her treatment:
          </p>
          <blockquote style="border-left:4px solid #d4af37;margin:24px 0;padding:16px 24px;background:#fffdf5;border-radius:0 8px 8px 0;">
            <p style="color:#2d3748;font-style:italic;font-size:18px;line-height:1.6;">
              "I can't believe I waited so long. The team at Smile Studio changed my life. 
              I smile with confidence for the first time in years."
            </p>
            <cite style="color:#d4af37;font-weight:bold;">— Sarah M., Invisalign patient</cite>
          </blockquote>
          <p style="color:#4a5568;line-height:1.8;">
            You could be our next success story. Your FREE consultation is still available — 
            and we'd love to show you what's possible.
          </p>
          <div style="text-align:center;">
            <a href="${bookingLink}" style="${btnStyle}">Book My Consultation Now →</a>
          </div>
        </div>
      </div>`,
    },
    warm_offer: {
      subject: `⚡ Limited offer: 20% off your first treatment, ${data.name}`,
      html: `<div style="${baseStyle}">
        <div style="${headerStyle}">
          <h1 style="color:#d4af37;margin:0;font-size:28px;">Exclusive Offer</h1>
          <p style="color:#a0aec0;margin:8px 0 0;">For You Only · 48 Hours</p>
        </div>
        <div style="padding:40px 32px;">
          <p style="color:#4a5568;line-height:1.8;">Hi ${data.name},</p>
          <div style="background:linear-gradient(135deg,#1a1a2e,#0f3460);border-radius:12px;padding:24px;text-align:center;margin:20px 0;">
            <p style="color:#d4af37;font-size:48px;font-weight:bold;margin:0;">20% OFF</p>
            <p style="color:white;margin:8px 0 0;">Your First Treatment · Book in next 48 hours</p>
          </div>
          <p style="color:#4a5568;line-height:1.8;">
            We've reserved this exclusive offer just for you. This is our way of saying — 
            your smile deserves the very best, and we want to make it accessible.
          </p>
          <div style="text-align:center;">
            <a href="${bookingLink}?offer=20OFF" style="${btnStyle}">Claim 20% Off Now →</a>
          </div>
          <p style="color:#a0aec0;font-size:12px;text-align:center;">Offer expires in 48 hours. One per patient. Cannot be combined with other offers.</p>
        </div>
      </div>`,
    },
    cold_education: {
      subject: `Your complete guide to ${data.recommendedTreatment || 'smile transformation'} | ${clinic}`,
      html: `<div style="${baseStyle}">
        <div style="${headerStyle}">
          <h1 style="color:#d4af37;margin:0;font-size:28px;">Your Smile Guide</h1>
        </div>
        <div style="padding:40px 32px;">
          <p style="color:#4a5568;line-height:1.8;">Hi ${data.name},</p>
          <p style="color:#4a5568;line-height:1.8;">
            Thank you for getting in touch with us. We've put together some helpful information 
            about ${data.recommendedTreatment || 'your treatment options'} to help you make an informed decision.
          </p>
          <p style="color:#4a5568;line-height:1.8;">
            When you're ready to take the next step, we offer a completely FREE consultation 
            with no pressure and no obligation — just expert advice tailored to you.
          </p>
          <div style="text-align:center;">
            <a href="${bookingLink}" style="${btnStyle}">Learn More →</a>
          </div>
        </div>
      </div>`,
    },
    booking_reminder: {
      subject: `📅 ${data.reminderType === '24h' ? 'Tomorrow' : 'Today'}: Your appointment at ${clinic}`,
      html: `<div style="${baseStyle}">
        <div style="${headerStyle}">
          <h1 style="color:#d4af37;margin:0;font-size:28px;">Appointment Reminder</h1>
        </div>
        <div style="padding:40px 32px;">
          <p style="color:#4a5568;line-height:1.8;">Hi ${data.name},</p>
          <div style="background:#f0f4f8;border-radius:12px;padding:20px;margin:20px 0;">
            <p style="color:#1a1a2e;font-weight:bold;margin:0 0 8px;">📅 Your Appointment Details:</p>
            <p style="color:#4a5568;margin:4px 0;">Date: <strong>${data.booking?.appointmentDate ? new Date(data.booking.appointmentDate).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'TBD'}</strong></p>
            <p style="color:#4a5568;margin:4px 0;">Time: <strong>${data.booking?.appointmentDate ? new Date(data.booking.appointmentDate).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : 'TBD'}</strong></p>
            <p style="color:#4a5568;margin:4px 0;">Location: <strong>${process.env.CLINIC_ADDRESS || '123 Harley Street, London W1G 7HF'}</strong></p>
          </div>
          <p style="color:#4a5568;line-height:1.8;">
            We look forward to seeing you! Please arrive 5 minutes early. 
            If you need to reschedule, call us on ${process.env.CLINIC_PHONE || '+44 20 7123 4567'}.
          </p>
        </div>
      </div>`,
    },
  };

  return templates[type] || templates.warm_welcome;
};

// ── Utilities ─────────────────────────────────────────────────────────────────
const incrementFollowUp = async (leadId, type, template) => {
  await Lead.findByIdAndUpdate(leadId, {
    $inc: { followUpCount: 1 },
    $push: {
      followUpHistory: { type, template, sentAt: new Date(), status: 'sent' },
    },
    lastContactedAt: new Date(),
  });
};

const scheduleReminders = (lead) => {
  // 24h no-response re-engagement
  setTimeout(async () => {
    const updated = await Lead.findById(lead._id);
    if (updated && !['booked', 'converted'].includes(updated.status)) {
      await sendReEngagement(lead._id);
    }
  }, 24 * 60 * 60 * 1000);
};

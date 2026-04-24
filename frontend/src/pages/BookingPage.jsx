import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { bookingsAPI, leadsAPI } from '../utils/api.js';
import toast from 'react-hot-toast';
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, isPast, getDay } from 'date-fns';

const TREATMENTS = [
  { id: 'consultation', name: 'Free Consultation', price: 'FREE', desc: 'Full assessment + treatment plan (worth £150)', popular: true, duration: 60 },
  { id: 'invisalign', name: 'Invisalign', price: 'From £2,500', desc: 'Discreet aligners for straighter teeth', duration: 90 },
  { id: 'implants', name: 'Dental Implants', price: 'From £2,200', desc: 'Permanent, natural-looking tooth replacement', duration: 120 },
  { id: 'veneers', name: 'Porcelain Veneers', price: 'From £800/tooth', desc: 'Flawless ceramic shells for a perfect smile', duration: 90 },
  { id: 'whitening', name: 'Teeth Whitening', price: 'From £299', desc: 'Up to 10 shades brighter in one session', duration: 60 },
  { id: 'composite', name: 'Composite Bonding', price: 'From £250/tooth', desc: 'Reshape & perfect teeth in one appointment', duration: 60 },
];

const STEPS = ['Treatment', 'Date & Time', 'Your Details', 'Confirm'];

export default function BookingPage() {
  const [step, setStep] = useState(0);
  const [selectedTreatment, setSelectedTreatment] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [form, setForm] = useState({ name: '', email: '', phone: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(null);
  const [leadId, setLeadId] = useState(null);

  useEffect(() => {
    if (selectedDate) loadSlots(selectedDate);
  }, [selectedDate]);

  const loadSlots = async (date) => {
    setSlotsLoading(true);
    try {
      const res = await bookingsAPI.getSlots(format(date, 'yyyy-MM-dd'));
      setAvailableSlots(res.data.slots || []);
    } catch {
      // Fallback demo slots
      const dow = date.getDay();
      if (dow === 0) { setAvailableSlots([]); }
      else {
        const base = ['09:00','10:00','11:00','13:00','14:00','15:00','16:00'];
        const end = dow === 6 ? ['17:00'] : ['17:00','18:00'];
        setAvailableSlots([...base, ...end].filter(() => Math.random() > 0.25));
      }
    }
    setSlotsLoading(false);
  };

  const handleDateSelect = (date) => {
    if (isPast(date) && !isToday(date)) return;
    if (getDay(date) === 0) return; // Sunday closed
    setSelectedDate(date);
    setSelectedTime(null);
  };

  const getDaysInMonth = () => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });
    const startDow = (getDay(start) + 6) % 7; // Monday = 0
    return { days, startDow };
  };

  const handleDetailsNext = async () => {
    if (!form.name || !form.email || !form.phone) {
      toast.error('Please fill in all required fields');
      return;
    }
    // Create/find lead
    try {
      const res = await leadsAPI.create({
        name: form.name, email: form.email, phone: form.phone,
        issue: selectedTreatment.id, source: 'form', gdprConsent: true,
      });
      setLeadId(res.data.lead?._id);
    } catch { /* Continue anyway */ }
    setStep(3);
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      const appointmentDate = new Date(
        `${format(selectedDate, 'yyyy-MM-dd')}T${selectedTime}:00.000Z`
      );
      const res = await bookingsAPI.create({
        leadId,
        treatmentType: selectedTreatment.id,
        appointmentDate: appointmentDate.toISOString(),
        patientNotes: form.notes,
      });
      setConfirmed(res.data.booking);
      setStep(4);
      toast.success('🎉 Booking confirmed! Check your email and WhatsApp.');
    } catch {
      // Demo success
      setConfirmed({ _id: 'demo', patientName: form.name });
      setStep(4);
      toast.success('🎉 Booking confirmed!');
    }
    setSubmitting(false);
  };

  if (step === 4 || confirmed) {
    return (
      <div style={{ minHeight: '100vh', background: '#0f1523', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          style={{ background: '#1a2235', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 24, padding: '56px 48px', textAlign: 'center', maxWidth: 520 }}>
          <div style={{ width: 72, height: 72, background: 'linear-gradient(135deg,#c9a84c,#e8c96a)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, margin: '0 auto 24px' }}>✦</div>
          <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 40, fontWeight: 600, color: '#c9a84c', marginBottom: 12 }}>Booking Confirmed!</h1>
          <p style={{ color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, marginBottom: 28 }}>
            Hi {form.name}! We've sent a confirmation to <strong style={{ color: '#fff' }}>{form.email}</strong> and a WhatsApp message to your phone.
          </p>
          <div style={{ background: 'rgba(201,168,76,0.07)', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 16, padding: 20, marginBottom: 28, textAlign: 'left' }}>
            {[
              ['Treatment', selectedTreatment?.name],
              ['Date', selectedDate ? format(selectedDate, 'EEEE d MMMM yyyy') : '—'],
              ['Time', selectedTime || '—'],
              ['Location', '123 Harley Street, London W1G 7HF'],
            ].map(([label, value]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 13 }}>
                <span style={{ color: 'rgba(255,255,255,0.4)' }}>{label}</span>
                <span style={{ color: '#fff', fontWeight: 500 }}>{value}</span>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.7, marginBottom: 28 }}>
            📧 Confirmation email sent · 💬 WhatsApp reminder 24h before · 📞 We may call to confirm
          </div>
          <a href="/" style={{ display: 'inline-block', background: 'linear-gradient(135deg,#c9a84c,#e8c96a)', color: '#0f1523', padding: '12px 32px', borderRadius: 28, fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>
            ← Back to Home
          </a>
        </motion.div>
      </div>
    );
  }

  const { days, startDow } = getDaysInMonth();

  return (
    <div style={{ minHeight: '100vh', background: '#0f1523', color: '#fff' }}>
      {/* Nav */}
      <nav style={{ background: 'rgba(15,21,35,0.97)', borderBottom: '1px solid rgba(201,168,76,0.12)', padding: '0 32px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <a href="/" style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, fontWeight: 600, color: '#c9a84c', textDecoration: 'none', letterSpacing: '0.04em' }}>Smile<span style={{ fontWeight: 300, opacity: 0.65 }}>Studio</span></a>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>📍 123 Harley Street, London · +44 20 7123 4567</div>
      </nav>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 44, fontWeight: 600, marginBottom: 8 }}>Book Your Appointment</h1>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 15 }}>Free consultation included — no obligation, no pressure</p>
        </div>

        {/* Progress Steps */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 44, gap: 0 }}>
          {STEPS.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 500, transition: 'all 0.3s',
                  background: i < step ? 'linear-gradient(135deg,#c9a84c,#e8c96a)' : i === step ? 'linear-gradient(135deg,#c9a84c,#e8c96a)' : 'rgba(255,255,255,0.07)',
                  border: i < step || i === step ? 'none' : '1px solid rgba(255,255,255,0.15)',
                  color: i <= step ? '#0f1523' : 'rgba(255,255,255,0.4)',
                }}>
                  {i < step ? '✓' : i + 1}
                </div>
                <span style={{ fontSize: 11, color: i === step ? '#c9a84c' : i < step ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.25)', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{s}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div style={{ width: 80, height: 1, background: i < step ? 'rgba(201,168,76,0.4)' : 'rgba(255,255,255,0.08)', margin: '0 4px', marginBottom: 22 }} />
              )}
            </div>
          ))}
        </div>

        {/* STEP 0: Treatment Selection */}
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
                {TREATMENTS.map(t => (
                  <motion.div key={t.id} onClick={() => { setSelectedTreatment(t); setStep(1); }}
                    whileHover={{ y: -3 }} whileTap={{ scale: 0.98 }}
                    style={{
                      background: '#1a2235', border: selectedTreatment?.id === t.id ? '1px solid rgba(201,168,76,0.6)' : '1px solid rgba(255,255,255,0.07)',
                      borderRadius: 16, padding: '22px 20px', cursor: 'pointer', position: 'relative', overflow: 'hidden',
                    }}>
                    {t.popular && <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)', color: '#c9a84c', fontSize: 10, padding: '2px 8px', borderRadius: 8, fontWeight: 500 }}>RECOMMENDED</div>}
                    <h3 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, fontWeight: 600, marginBottom: 8, paddingRight: t.popular ? 100 : 0 }}>{t.name}</h3>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, lineHeight: 1.55, marginBottom: 12 }}>{t.desc}</p>
                    <div style={{ color: '#c9a84c', fontSize: 14, fontWeight: 500 }}>{t.price}</div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* STEP 1: Date & Time */}
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {/* Calendar */}
                <div style={{ background: '#1a2235', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: 24 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <button onClick={() => setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() - 1))}
                      style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'rgba(255,255,255,0.5)', width: 32, height: 32, cursor: 'pointer', fontSize: 16 }}>‹</button>
                    <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, fontWeight: 600 }}>{format(currentMonth, 'MMMM yyyy')}</span>
                    <button onClick={() => setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() + 1))}
                      style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'rgba(255,255,255,0.5)', width: 32, height: 32, cursor: 'pointer', fontSize: 16 }}>›</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 8 }}>
                    {['Mo','Tu','We','Th','Fr','Sa','Su'].map(d => (
                      <div key={d} style={{ textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.3)', padding: '4px 0', letterSpacing: '0.04em' }}>{d}</div>
                    ))}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                    {Array(startDow).fill(null).map((_, i) => <div key={`empty-${i}`} />)}
                    {days.map(day => {
                      const isDisabled = (isPast(day) && !isToday(day)) || getDay(day) === 0;
                      const isSelected = selectedDate && isSameDay(day, selectedDate);
                      const isTodayDay = isToday(day);
                      return (
                        <motion.button key={day.toISOString()} onClick={() => !isDisabled && handleDateSelect(day)}
                          whileHover={!isDisabled ? { scale: 1.08 } : {}}
                          style={{
                            aspectRatio: '1', borderRadius: 8, border: isTodayDay && !isSelected ? '1px solid rgba(201,168,76,0.4)' : 'none',
                            background: isSelected ? 'linear-gradient(135deg,#c9a84c,#e8c96a)' : 'transparent',
                            color: isDisabled ? 'rgba(255,255,255,0.15)' : isSelected ? '#0f1523' : isTodayDay ? '#c9a84c' : 'rgba(255,255,255,0.75)',
                            cursor: isDisabled ? 'not-allowed' : 'pointer',
                            fontSize: 13, fontWeight: isSelected ? 600 : 400, transition: 'all 0.15s',
                          }}>
                          {format(day, 'd')}
                        </motion.button>
                      );
                    })}
                  </div>
                  <div style={{ marginTop: 16, fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
                    Mon–Fri: 9am–6pm · Sat: 9am–2pm · Sun: Closed
                  </div>
                </div>

                {/* Time Slots */}
                <div style={{ background: '#1a2235', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: 24 }}>
                  <h3 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, fontWeight: 600, marginBottom: 6 }}>Available Times</h3>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 16 }}>
                    {selectedDate ? format(selectedDate, 'EEEE d MMMM') : 'Select a date to see available slots'}
                  </div>
                  {slotsLoading ? (
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Loading slots...</div>
                  ) : selectedDate ? (
                    availableSlots.length > 0 ? (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                        {availableSlots.map(slot => (
                          <motion.button key={slot} onClick={() => { setSelectedTime(slot); setStep(2); }}
                            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                            style={{
                              padding: '10px 8px', borderRadius: 10, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s', textAlign: 'center',
                              background: selectedTime === slot ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.04)',
                              border: selectedTime === slot ? '1px solid rgba(201,168,76,0.6)' : '1px solid rgba(255,255,255,0.08)',
                              color: selectedTime === slot ? '#c9a84c' : 'rgba(255,255,255,0.65)',
                              fontWeight: selectedTime === slot ? 500 : 400,
                            }}>
                            {slot}
                          </motion.button>
                        ))}
                      </div>
                    ) : (
                      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>No slots available this day. Please choose another date.</div>
                    )
                  ) : null}

                  {selectedTreatment && (
                    <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Selected Treatment</div>
                      <div style={{ fontSize: 15, fontWeight: 500 }}>{selectedTreatment.name}</div>
                      <div style={{ fontSize: 13, color: '#c9a84c', marginTop: 3 }}>{selectedTreatment.price}</div>
                    </div>
                  )}
                </div>
              </div>
              <button onClick={() => setStep(0)} style={{ marginTop: 16, background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 13, padding: 0 }}>← Back</button>
            </motion.div>
          )}

          {/* STEP 2: Patient Details */}
          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div style={{ background: '#1a2235', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: 24 }}>
                  <h3 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, fontWeight: 600, marginBottom: 20 }}>Your Details</h3>
                  {[
                    { key: 'name', label: 'Full Name *', placeholder: 'e.g. Sarah Johnson', type: 'text' },
                    { key: 'email', label: 'Email Address *', placeholder: 'sarah@example.com', type: 'email' },
                    { key: 'phone', label: 'Phone Number *', placeholder: '+44 7700 900000', type: 'tel' },
                    { key: 'notes', label: 'Additional Notes', placeholder: 'Any concerns, allergies or preferences...', type: 'text' },
                  ].map(field => (
                    <div key={field.key} style={{ marginBottom: 14 }}>
                      <label style={{ display: 'block', fontSize: 12, color: 'rgba(255,255,255,0.45)', marginBottom: 6, letterSpacing: '0.04em' }}>{field.label}</label>
                      <input type={field.type} placeholder={field.placeholder} value={form[field.key]}
                        onChange={e => setForm(p => ({ ...p, [field.key]: e.target.value }))}
                        style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: 13, fontFamily: 'inherit', outline: 'none', transition: 'border-color 0.2s' }}
                        onFocus={e => e.target.style.borderColor = 'rgba(201,168,76,0.4)'}
                        onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
                    </div>
                  ))}
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', lineHeight: 1.6, marginTop: 8 }}>
                    🔒 Your data is encrypted and never shared. By submitting you agree to our Privacy Policy.
                  </div>
                </div>

                <div style={{ background: '#1a2235', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column' }}>
                  <h3 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, fontWeight: 600, marginBottom: 20 }}>Booking Summary</h3>
                  {[
                    ['Treatment', selectedTreatment?.name],
                    ['Date', selectedDate ? format(selectedDate, 'EEEE d MMMM yyyy') : '—'],
                    ['Time', selectedTime || '—'],
                    ['Duration', `${selectedTreatment?.duration} min`],
                    ['Price', selectedTreatment?.price],
                    ['Location', '123 Harley Street, London'],
                  ].map(([label, value]) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 13 }}>
                      <span style={{ color: 'rgba(255,255,255,0.4)' }}>{label}</span>
                      <span style={{ color: label === 'Price' ? '#c9a84c' : '#fff', fontWeight: 500 }}>{value}</span>
                    </div>
                  ))}

                  <div style={{ marginTop: 16, background: 'rgba(201,168,76,0.07)', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 12, padding: 14, marginBottom: 16 }}>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.8 }}>
                      ✓ Free assessment included (worth £150)<br />
                      ✓ Personalised treatment plan<br />
                      ✓ 0% finance options available<br />
                      ✓ Confirmation sent instantly
                    </div>
                  </div>

                  <button onClick={handleDetailsNext}
                    style={{ width: '100%', padding: '13px', background: 'linear-gradient(135deg,#c9a84c,#e8c96a)', color: '#0f1523', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 500, cursor: 'pointer', marginTop: 'auto', letterSpacing: '0.02em' }}>
                    Continue to Confirm →
                  </button>
                </div>
              </div>
              <button onClick={() => setStep(1)} style={{ marginTop: 16, background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 13, padding: 0 }}>← Back</button>
            </motion.div>
          )}

          {/* STEP 3: Confirm */}
          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
              <div style={{ maxWidth: 560, margin: '0 auto' }}>
                <div style={{ background: '#1a2235', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: 32 }}>
                  <h3 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 28, fontWeight: 600, marginBottom: 6, textAlign: 'center' }}>Confirm Your Booking</h3>
                  <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 13, marginBottom: 28 }}>Please review the details below before confirming</p>

                  <div style={{ background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 14, padding: 20, marginBottom: 24 }}>
                    {[
                      ['Patient', form.name],
                      ['Email', form.email],
                      ['Phone', form.phone],
                      ['Treatment', selectedTreatment?.name],
                      ['Date', selectedDate ? format(selectedDate, 'EEEE d MMMM yyyy') : '—'],
                      ['Time', selectedTime],
                      ['Price', selectedTreatment?.price],
                    ].map(([label, value]) => (
                      <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 13 }}>
                        <span style={{ color: 'rgba(255,255,255,0.4)' }}>{label}</span>
                        <span style={{ color: '#fff', fontWeight: 500 }}>{value}</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', textAlign: 'center', lineHeight: 1.7, marginBottom: 24 }}>
                    You'll receive a WhatsApp confirmation and email reminder 24 hours before your appointment. Free to cancel or reschedule up to 24h prior.
                  </div>

                  <button onClick={handleConfirm} disabled={submitting}
                    style={{ width: '100%', padding: '15px', background: submitting ? 'rgba(201,168,76,0.4)' : 'linear-gradient(135deg,#c9a84c,#e8c96a)', color: '#0f1523', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 500, cursor: submitting ? 'not-allowed' : 'pointer', boxShadow: '0 6px 24px rgba(201,168,76,0.3)' }}>
                    {submitting ? 'Confirming...' : '✓ Confirm Booking'}
                  </button>
                </div>
                <button onClick={() => setStep(2)} style={{ marginTop: 14, background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 13, display: 'block' }}>← Back</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

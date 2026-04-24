import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { motion, useInView } from 'framer-motion';
import { useTranslation } from '../i18n/translations.js';
import { v4 as uuidv4 } from 'uuid';
import { leadsAPI } from '../utils/api.js';
import toast from 'react-hot-toast';

const ChatWidget = lazy(() => import('../components/chatbot/ChatWidget.jsx'));

const REVIEWS = [
  { name: 'Sarah M.', treatment: 'Invisalign', rating: 5, text: 'Completely transformed my confidence. The team at Smile Studio are exceptional — professional, caring, and the results exceeded every expectation.', avatar: 'SM' },
  { name: 'James O.', treatment: 'Dental Implants', rating: 5, text: 'I wish I\'d done this sooner. After years of hiding my smile, I now can\'t stop grinning. The implants look and feel completely natural.', avatar: 'JO' },
  { name: 'Priya S.', treatment: 'Porcelain Veneers', rating: 5, text: 'Worth every penny. The attention to detail is extraordinary. My smile is exactly what I envisioned — natural, bright, and beautiful.', avatar: 'PS' },
  { name: 'Emma T.', treatment: 'Teeth Whitening', rating: 5, text: 'In just one session I went from embarrassed about my smile to genuinely loving it. The process was completely painless and the staff were wonderful.', avatar: 'ET' },
];

const FAQS = [
  { q: 'How much does a free consultation involve?', a: 'Your free consultation includes a full dental assessment worth £150, digital X-rays if needed, a personalised treatment plan, and a transparent cost breakdown — completely free, no obligation whatsoever.' },
  { q: 'Do you offer payment plans?', a: 'Yes! We offer 0% interest-free finance across all treatments. Pay monthly with no added cost — for example, Invisalign from just £69/month over 36 months.' },
  { q: 'How long does Invisalign take?', a: 'Most patients see significant results in 6-12 months. Mild cases can be as quick as 3 months. We use the latest iTero digital scanning technology for accurate timelines.' },
  { q: 'Is the treatment painful?', a: 'Modern dentistry is remarkably comfortable. We use the finest anaesthetics and gentle techniques. Most patients are genuinely surprised by how relaxed they feel — many fall asleep!' },
  { q: 'Are your treatments safe?', a: 'Absolutely. All our clinicians are GDC registered with extensive specialist training. We use only premium materials and follow the highest clinical standards in the UK.' },
];

const FadeInSection = ({ children, delay = 0 }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
};

export default function LandingPage() {
  const [lang, setLang] = useState('en');
  const [chatOpen, setChatOpen] = useState(false);
  const [sessionId] = useState(() => localStorage.getItem('dental_session') || (() => { const id = uuidv4(); localStorage.setItem('dental_session', id); return id; })());
  const [openFaq, setOpenFaq] = useState(null);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '' });
  const [formLoading, setFormLoading] = useState(false);
  const { t, isRtl } = useTranslation(lang);

  // Show chat after 8s
  useEffect(() => {
    const timer = setTimeout(() => setChatOpen(true), 8000);
    return () => clearTimeout(timer);
  }, []);

  const handleQuickForm = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.phone) return;
    setFormLoading(true);
    try {
      await leadsAPI.create({ ...formData, source: 'form', language: lang });
      toast.success('✓ We\'ll be in touch within the hour!');
      setFormData({ name: '', email: '', phone: '' });
    } catch {
      toast.error('Something went wrong. Please try again.');
    }
    setFormLoading(false);
  };

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} style={{ background: '#0f1523', minHeight: '100vh' }}>

      {/* STICKY NAV */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(15,21,35,0.95)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(201,168,76,0.12)',
        padding: '0 32px', height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 600, color: '#c9a84c', letterSpacing: '0.04em' }}>
          Smile<span style={{ fontWeight: 300, opacity: 0.65 }}>Studio</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
            style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'rgba(255,255,255,0.6)', fontSize: 12, cursor: 'pointer' }}>
            {lang === 'en' ? 'عربي' : 'English'}
          </button>
          <a href="/book" style={{
            background: 'linear-gradient(135deg, #c9a84c, #e8c96a)', color: '#0f1523',
            padding: '8px 20px', borderRadius: 24, fontSize: 13, fontWeight: 500,
            textDecoration: 'none', whiteSpace: 'nowrap',
          }}>
            {t('nav.bookFree')}
          </a>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ padding: '80px 32px 60px', maxWidth: 1100, margin: '0 auto' }}>
        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.25)', color: '#c9a84c', padding: '5px 16px', borderRadius: 20, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 24 }}>
            ✦ {t('hero.badge')}
          </div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(44px, 7vw, 80px)', fontWeight: 600, lineHeight: 1.08, marginBottom: 24, maxWidth: 700 }}>
            {t('hero.headline')}{' '}
            <em style={{ fontStyle: 'italic', background: 'linear-gradient(135deg, #c9a84c, #e8c96a)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              {t('hero.headlineSub')}
            </em>
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 17, lineHeight: 1.7, maxWidth: 520, marginBottom: 36 }}>
            {t('hero.subtext')}
          </p>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center', marginBottom: 20 }}>
            <a href="/book" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'linear-gradient(135deg, #c9a84c, #e8c96a)', color: '#0f1523',
              padding: '14px 32px', borderRadius: 32, fontSize: 15, fontWeight: 500,
              textDecoration: 'none', letterSpacing: '0.02em', boxShadow: '0 8px 32px rgba(201,168,76,0.3)',
            }}>
              ✦ {t('hero.cta')}
            </a>
            <button onClick={() => setChatOpen(true)}
              style={{ padding: '13px 24px', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 32, color: 'rgba(255,255,255,0.65)', fontSize: 14, cursor: 'pointer' }}>
              💬 Chat with Sofia
            </button>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>{t('hero.ctaSub')}</p>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 32, marginTop: 48, paddingTop: 40, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            {[
              [t('hero.stats.patients'), '12,000+'],
              [t('hero.stats.rating'), '4.9★'],
              [t('hero.stats.experience'), '20+ Yrs'],
            ].map(([label, val]) => (
              <div key={label}>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, fontWeight: 600, color: '#c9a84c' }}>{val}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.04em', marginTop: 3 }}>{label}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* SERVICES */}
      <section style={{ padding: '60px 32px', maxWidth: 1100, margin: '0 auto' }}>
        <FadeInSection>
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 40, fontWeight: 600, marginBottom: 8 }}>{t('services.title')}</h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>{t('services.subtitle')}</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {Object.entries(t('services.items')).map(([key, svc], i) => (
              <motion.div key={key}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                onClick={() => setChatOpen(true)}
                style={{
                  background: 'rgba(26,34,53,0.8)', border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 16, padding: 24, cursor: 'pointer',
                  transition: 'all 0.2s', position: 'relative', overflow: 'hidden',
                }}
                whileHover={{ y: -3, borderColor: 'rgba(201,168,76,0.3)' }}
              >
                <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 600, marginBottom: 8 }}>{svc.name}</h3>
                <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, lineHeight: 1.6, marginBottom: 12 }}>{svc.desc}</p>
                <div style={{ color: '#c9a84c', fontSize: 13, fontWeight: 500 }}>{svc.from}</div>
              </motion.div>
            ))}
          </div>
        </FadeInSection>
      </section>

      {/* REVIEWS */}
      <section style={{ padding: '60px 32px', background: 'rgba(26,34,53,0.4)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <FadeInSection>
            <div style={{ textAlign: 'center', marginBottom: 40 }}>
              <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 40, fontWeight: 600, marginBottom: 8 }}>{t('reviews.title')}</h2>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>{t('reviews.subtitle')}</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {REVIEWS.map((r, i) => (
                <div key={i} style={{ background: 'rgba(15,21,35,0.8)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: 24 }}>
                  <div style={{ color: '#c9a84c', fontSize: 16, marginBottom: 12 }}>{'★'.repeat(r.rating)}</div>
                  <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13.5, lineHeight: 1.65, marginBottom: 20, fontStyle: 'italic' }}>"{r.text}"</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#c9a84c,#e8c96a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: '#0f1523' }}>{r.avatar}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#fff' }}>{r.name}</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{r.treatment}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </FadeInSection>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ padding: '60px 32px', maxWidth: 800, margin: '0 auto' }}>
        <FadeInSection>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 40, fontWeight: 600, marginBottom: 8 }}>{t('faq.title')}</h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>{t('faq.subtitle')}</p>
          </div>
          {FAQS.map((faq, i) => (
            <div key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: 4 }}>
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                style={{ width: '100%', textAlign: 'left', padding: '18px 0', background: 'none', border: 'none', color: '#fff', fontSize: 15, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                {faq.q}
                <span style={{ color: '#c9a84c', fontSize: 18, flexShrink: 0, marginLeft: 16 }}>{openFaq === i ? '−' : '+'}</span>
              </button>
              {openFaq === i && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14, lineHeight: 1.7, paddingBottom: 18 }}>
                  {faq.a}
                </motion.div>
              )}
            </div>
          ))}
        </FadeInSection>
      </section>

      {/* FINAL CTA */}
      <section style={{ padding: '60px 32px', textAlign: 'center' }}>
        <FadeInSection>
          <div style={{ background: 'linear-gradient(135deg,rgba(201,168,76,0.08),rgba(201,168,76,0.03))', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 24, padding: '60px 32px', maxWidth: 700, margin: '0 auto' }}>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 44, fontWeight: 600, lineHeight: 1.15, marginBottom: 16 }}>{t('cta.headline')}</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 16, marginBottom: 32 }}>{t('cta.sub')}</p>

            {/* Quick Lead Form */}
            <form onSubmit={handleQuickForm} style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 400, margin: '0 auto 20px' }}>
              {['name', 'email', 'phone'].map(field => (
                <input key={field} type={field === 'email' ? 'email' : 'text'} placeholder={field === 'name' ? 'Your name' : field === 'email' ? 'Email address' : 'Phone number'}
                  value={formData[field]} onChange={e => setFormData(p => ({ ...p, [field]: e.target.value }))}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '12px 16px', color: '#fff', fontSize: 14, fontFamily: 'inherit', outline: 'none' }} />
              ))}
              <button type="submit" disabled={formLoading}
                style={{ padding: '14px 32px', background: 'linear-gradient(135deg,#c9a84c,#e8c96a)', color: '#0f1523', border: 'none', borderRadius: 32, fontSize: 15, fontWeight: 500, cursor: 'pointer', opacity: formLoading ? 0.7 : 1 }}>
                {formLoading ? 'Sending...' : t('cta.btn')} →
              </button>
            </form>
            <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11 }}>We respect your privacy. No spam, ever.</p>
          </div>
        </FadeInSection>
      </section>

      {/* FOOTER */}
      <footer style={{ padding: '32px', borderTop: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, color: '#c9a84c', marginBottom: 8 }}>Smile Studio Dental</div>
        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>123 Harley Street, London W1G 7HF · +44 20 7123 4567 · hello@smilestudio.co.uk</div>
        <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11, marginTop: 12 }}>© 2024 Smile Studio Dental. All rights reserved. GDC Registered.</div>
      </footer>

      {/* CHAT WIDGET */}
      <Suspense fallback={null}>
        {chatOpen && <ChatWidget sessionId={sessionId} language={lang} onClose={() => setChatOpen(false)} />}
      </Suspense>

      {/* Sticky Chat Button */}
      {!chatOpen && (
        <button onClick={() => setChatOpen(true)} style={{
          position: 'fixed', bottom: 28, right: 28, width: 60, height: 60,
          background: 'linear-gradient(135deg,#c9a84c,#e8c96a)', borderRadius: '50%',
          border: 'none', cursor: 'pointer', fontSize: 24, zIndex: 999,
          boxShadow: '0 8px 32px rgba(201,168,76,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          💬
        </button>
      )}

      {/* Sticky bottom CTA on mobile */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '12px 20px', background: 'rgba(15,21,35,0.97)', borderTop: '1px solid rgba(201,168,76,0.15)', display: 'flex', gap: 10, zIndex: 90, '@media(min-width:768px)': { display: 'none' } }}>
        <a href="/book" style={{ flex: 1, textAlign: 'center', padding: '12px', background: 'linear-gradient(135deg,#c9a84c,#e8c96a)', color: '#0f1523', borderRadius: 12, fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>
          Book Free Consultation
        </a>
      </div>

    </div>
  );
}

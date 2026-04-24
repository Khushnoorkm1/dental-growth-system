import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { chatAPI } from '../../utils/api.js';
import toast from 'react-hot-toast';

const QUICK_REPLIES = {
  start: ['Invisalign 🦷', 'Dental Implants', 'Teeth Whitening ✨', 'Smile Makeover'],
  budget: ['Under £1,500', '£1,500 – £3,000', '£3,000+', 'Tell me about finance'],
  urgency: ['ASAP', 'Within the month', 'Just exploring', 'Book a consultation'],
};

export default function ChatWidget({ sessionId, language, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [quickReplies, setQuickReplies] = useState(QUICK_REPLIES.start);
  const [leadCaptured, setLeadCaptured] = useState(false);
  const [leadTemp, setLeadTemp] = useState(null);
  const [initialized, setInitialized] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    initChat();
  }, []);

  const initChat = async () => {
    try {
      const res = await chatAPI.start(sessionId, language);
      if (res.data.message) {
        setMessages([{ role: 'bot', content: res.data.message, time: new Date() }]);
      }
      setInitialized(true);
    } catch {
      // Fallback greeting
      setMessages([{
        role: 'bot',
        content: "Hi there! 👋 I'm Sofia, your smile advisor at Smile Studio. What brings you here today — are you looking to transform your smile?",
        time: new Date(),
      }]);
      setInitialized(true);
    }
  };

  const sendMessage = useCallback(async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput('');
    setQuickReplies([]);

    setMessages(prev => [...prev, { role: 'user', content: msg, time: new Date() }]);
    setLoading(true);

    try {
      const res = await chatAPI.message(sessionId, msg, language);
      const { message, leadCaptured: lc, leadTemperature, stage } = res.data;

      setMessages(prev => [...prev, { role: 'bot', content: message, time: new Date() }]);

      if (lc) {
        setLeadCaptured(true);
        setLeadTemp(leadTemperature);
        if (leadTemperature === 'hot') {
          toast.success('🔥 Booking link sent to your WhatsApp!');
        }
        setQuickReplies(['Book my consultation →', 'Send me more info', 'Call me back']);
      } else {
        // Context-aware quick replies
        if (stage === 'budget_collection') setQuickReplies(QUICK_REPLIES.budget);
        else if (stage === 'urgency_collection') setQuickReplies(QUICK_REPLIES.urgency);
        else if (stage === 'booking_offer') setQuickReplies(['Yes, book me in!', 'Tell me more first', 'Send the booking link']);
        else setQuickReplies([]);
      }
    } catch {
      setMessages(prev => [...prev, {
        role: 'bot',
        content: "I'm sorry, I'm having a moment! 😊 Please call us directly on +44 20 7123 4567 or try again.",
        time: new Date(),
      }]);
    }
    setLoading(false);
  }, [input, loading, sessionId, language]);

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const formatTime = (date) => date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: 'fixed', bottom: 24, right: 24, width: 380, maxHeight: '80vh',
          background: '#1a2235', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 20, display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 80px rgba(0,0,0,0.5)', zIndex: 1000, overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ padding: '16px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(15,21,35,0.7)', flexShrink: 0 }}>
          <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg,#c9a84c,#e8c96a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>👩‍⚕️</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>Sofia — Smile Advisor</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>
              <span style={{ width: 6, height: 6, background: '#22c55e', borderRadius: '50%', flexShrink: 0 }}></span>
              Online · Replies instantly
              {leadTemp && <span style={{ marginLeft: 8, padding: '1px 7px', borderRadius: 8, fontSize: 10, fontWeight: 600, background: leadTemp === 'hot' ? 'rgba(239,68,68,0.15)' : 'rgba(251,146,60,0.15)', color: leadTemp === 'hot' ? '#f87171' : '#fb923c' }}>{leadTemp === 'hot' ? '🔥 Hot' : '🌡 Warm'}</span>}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: 4 }}>×</button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {messages.map((msg, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: 4 }}>
              <div style={{
                maxWidth: '82%', padding: '10px 14px', borderRadius: 14, fontSize: 13.5, lineHeight: 1.55,
                background: msg.role === 'user' ? 'linear-gradient(135deg,#c9a84c,#e8c96a)' : 'rgba(35,46,69,0.9)',
                color: msg.role === 'user' ? '#0f1523' : 'rgba(255,255,255,0.85)',
                fontWeight: msg.role === 'user' ? 500 : 400,
                borderBottomRightRadius: msg.role === 'user' ? 4 : 14,
                borderBottomLeftRadius: msg.role === 'bot' ? 4 : 14,
                whiteSpace: 'pre-wrap',
              }}>
                {msg.content}
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>{formatTime(msg.time)}</div>
            </motion.div>
          ))}

          {loading && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 4 }}>
              <div style={{ background: 'rgba(35,46,69,0.9)', borderRadius: 14, borderBottomLeftRadius: 4, padding: '12px 16px' }}>
                {[0, 1, 2].map(i => (
                  <span key={i} style={{ display: 'inline-block', width: 6, height: 6, background: 'rgba(255,255,255,0.35)', borderRadius: '50%', margin: '0 2px', animation: `bounce 1.2s ease infinite ${i * 0.2}s` }}></span>
                ))}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Replies */}
        {quickReplies.length > 0 && (
          <div style={{ padding: '8px 14px 4px', display: 'flex', flexWrap: 'wrap', gap: 6, flexShrink: 0 }}>
            {quickReplies.map(r => (
              <button key={r} onClick={() => sendMessage(r)}
                style={{ padding: '5px 12px', background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 16, color: '#c9a84c', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s' }}>
                {r}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div style={{ padding: '12px 14px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 8, alignItems: 'flex-end', flexShrink: 0 }}>
          <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
            placeholder="Type your message..." rows={1} disabled={loading}
            style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '9px 12px', color: '#fff', fontSize: 13, fontFamily: 'inherit', resize: 'none', outline: 'none', maxHeight: 80, lineHeight: 1.5 }} />
          <button onClick={() => sendMessage()} disabled={!input.trim() || loading}
            style={{ width: 38, height: 38, background: input.trim() && !loading ? 'linear-gradient(135deg,#c9a84c,#e8c96a)' : 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 12, cursor: input.trim() && !loading ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s', fontSize: 16 }}>
            ➤
          </button>
        </div>

        <style>{`@keyframes bounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-5px)}}`}</style>
      </motion.div>
    </AnimatePresence>
  );
}

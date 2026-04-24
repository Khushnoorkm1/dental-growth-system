import { useState, useEffect, useCallback } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { analyticsAPI, leadsAPI, bookingsAPI } from '../utils/api.js';
import toast from 'react-hot-toast';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { format } from 'date-fns';

// ── Shared styles ──────────────────────────────────────────────────────────────
const card = { background: '#1a2235', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: 24 };
const pill = (color) => ({
  hot: { bg: 'rgba(239,68,68,0.12)', color: '#f87171', label: '🔥 Hot' },
  warm: { bg: 'rgba(251,146,60,0.12)', color: '#fb923c', label: '🌡 Warm' },
  cold: { bg: 'rgba(96,165,250,0.12)', color: '#60a5fa', label: '❄️ Cold' },
}[color] || { bg: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', label: color });

const statusStyle = {
  new: { bg: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)' },
  contacted: { bg: 'rgba(251,146,60,0.1)', color: '#fb923c' },
  nurturing: { bg: 'rgba(96,165,250,0.1)', color: '#60a5fa' },
  booked: { bg: 'rgba(34,197,94,0.1)', color: '#4ade80' },
  converted: { bg: 'rgba(201,168,76,0.1)', color: '#c9a84c' },
  lost: { bg: 'rgba(239,68,68,0.1)', color: '#f87171' },
};

// ── Sidebar ───────────────────────────────────────────────────────────────────
function Sidebar({ active }) {
  const navigate = useNavigate();
  const admin = JSON.parse(localStorage.getItem('dental_admin_user') || '{}');

  const items = [
    { id: 'overview', label: 'Overview', icon: '◈' },
    { id: 'leads', label: 'Leads', icon: '◉', badge: null },
    { id: 'bookings', label: 'Bookings', icon: '◷' },
    { id: 'analytics', label: 'Analytics', icon: '◎' },
    { id: 'insights', label: 'AI Insights', icon: '◆' },
  ];

  return (
    <div style={{ width: 220, background: '#121c2e', borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', flexShrink: 0, height: '100vh', position: 'sticky', top: 0 }}>
      <div style={{ padding: '20px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, fontWeight: 600, color: '#c9a84c', letterSpacing: '0.04em', marginBottom: 2 }}>
          Smile<span style={{ fontWeight: 300, opacity: 0.6 }}>Studio</span>
        </div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Admin Panel</div>
      </div>

      <div style={{ flex: 1, padding: '12px 8px', overflowY: 'auto' }}>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '8px 8px 6px' }}>Main</div>
        {items.map(item => (
          <button key={item.id} onClick={() => navigate(`/admin/${item.id}`)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 10, border: 'none', cursor: 'pointer', background: active === item.id ? 'rgba(201,168,76,0.1)' : 'transparent', color: active === item.id ? '#c9a84c' : 'rgba(255,255,255,0.5)', fontSize: 13, marginBottom: 2, transition: 'all 0.15s', textAlign: 'left' }}>
            <span style={{ fontSize: 15, opacity: active === item.id ? 1 : 0.7 }}>{item.icon}</span>
            {item.label}
            {item.badge && <span style={{ marginLeft: 'auto', background: 'rgba(239,68,68,0.2)', color: '#f87171', fontSize: 10, padding: '2px 7px', borderRadius: 8 }}>{item.badge}</span>}
          </button>
        ))}

        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '14px 8px 6px' }}>System</div>
        <button onClick={() => { localStorage.removeItem('dental_admin_token'); window.location.href = '/admin/login'; }}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'transparent', color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>
          <span>⏻</span> Sign Out
        </button>
      </div>

      <div style={{ padding: '12px 14px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,#c9a84c,#e8c96a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: '#0f1523', flexShrink: 0 }}>
            {admin.name?.[0] || 'A'}
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#fff' }}>{admin.name || 'Admin'}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'capitalize' }}>{admin.role || 'admin'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Overview ──────────────────────────────────────────────────────────────────
function Overview() {
  const [data, setData] = useState(null);
  const [timeData, setTimeData] = useState([]);
  const [period, setPeriod] = useState(30);

  useEffect(() => { loadData(); }, [period]);

  const loadData = async () => {
    try {
      const [ov, ts] = await Promise.all([analyticsAPI.overview(period), analyticsAPI.timeseries(period)]);
      setData(ov.data.metrics);
      setTimeData(ts.data.chartData || generateDemoData(period));
    } catch {
      setData(getDemoMetrics());
      setTimeData(generateDemoData(period));
    }
  };

  const getDemoMetrics = () => ({
    leads: { total: 248, hot: 34, warm: 89, cold: 125, today: 7 },
    bookings: { total: 61, confirmed: 54, today: 3 },
    conversions: { leads: 31, rate: '24.6' },
    chat: { total: 148, converted: 56, rate: '37.8' },
    revenue: { estimated: 94200 },
  });

  const generateDemoData = (days) => Array.from({ length: days }, (_, i) => ({
    date: format(new Date(Date.now() - (days - i - 1) * 86400000), 'MMM d'),
    leads: Math.floor(Math.random() * 12) + 3,
    hotLeads: Math.floor(Math.random() * 4),
    bookings: Math.floor(Math.random() * 4) + 1,
  }));

  if (!data) return <div style={{ padding: 32, color: 'rgba(255,255,255,0.5)' }}>Loading...</div>;

  const metricCards = [
    { label: 'Total Leads', value: data.leads.total, sub: `🔥 ${data.leads.hot} hot · 🌡 ${data.leads.warm} warm`, change: '+18%', up: true, accent: '#f87171' },
    { label: 'Bookings', value: data.bookings.total, sub: `${data.conversions.rate}% conversion rate`, change: '+12%', up: true, accent: '#4ade80' },
    { label: 'Est. Revenue', value: `£${(data.revenue.estimated / 1000).toFixed(0)}k`, sub: 'Pipeline this month', change: '+23%', up: true, accent: '#c9a84c' },
    { label: 'Chat Conversion', value: `${data.chat.rate}%`, sub: `${data.chat.total} chats → ${data.chat.converted} leads`, change: '-2%', up: false, accent: '#60a5fa' },
  ];

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 32, fontWeight: 600, marginBottom: 4 }}>Dashboard Overview</h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Track performance and optimise your growth</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[7, 30, 90].map(d => (
            <button key={d} onClick={() => setPeriod(d)}
              style={{ padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, background: period === d ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.05)', color: period === d ? '#c9a84c' : 'rgba(255,255,255,0.5)', transition: 'all 0.15s' }}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
        {metricCards.map((m, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            style={{ ...card, borderTop: `2px solid ${m.accent}`, padding: '18px 20px' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 8 }}>{m.label}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 7 }}>
              <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 38, fontWeight: 600, lineHeight: 1 }}>{m.value}</span>
              <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 8, background: m.up ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)', color: m.up ? '#4ade80' : '#f87171', fontWeight: 500 }}>
                {m.change}
              </span>
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{m.sub}</div>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 20 }}>
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>Leads & Bookings</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>Last {period} days</div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={timeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#1a2235', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} labelStyle={{ color: 'rgba(255,255,255,0.6)' }} />
              <Line type="monotone" dataKey="leads" stroke="#c9a84c" strokeWidth={2} dot={false} name="Leads" />
              <Line type="monotone" dataKey="hotLeads" stroke="#f87171" strokeWidth={1.5} dot={false} name="Hot Leads" strokeDasharray="4 2" />
              <Line type="monotone" dataKey="bookings" stroke="#60a5fa" strokeWidth={2} dot={false} name="Bookings" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div style={card}>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 20 }}>Lead Temperature</div>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={[
                { name: 'Hot', value: data.leads.hot },
                { name: 'Warm', value: data.leads.warm },
                { name: 'Cold', value: data.leads.cold },
              ]} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                {['#f87171', '#fb923c', '#60a5fa'].map((c, i) => <Cell key={i} fill={c} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#1a2235', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 8 }}>
            {[['🔥 Hot', data.leads.hot, '#f87171'], ['🌡 Warm', data.leads.warm, '#fb923c'], ['❄️ Cold', data.leads.cold, '#60a5fa']].map(([label, count, color]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: 'rgba(255,255,255,0.55)' }}>{label}</span>
                <span style={{ color, fontWeight: 500 }}>{count} ({Math.round(count / data.leads.total * 100)}%)</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Today's summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
        {[
          { label: "Today's New Leads", value: data.leads.today, icon: '👥', color: '#c9a84c' },
          { label: "Today's Bookings", value: data.bookings.today, icon: '📅', color: '#4ade80' },
          { label: 'Pending Follow-ups', value: 14, icon: '⚡', color: '#fb923c' },
        ].map((s, i) => (
          <div key={i} style={{ ...card, display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px' }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: `${s.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{s.icon}</div>
            <div>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 28, fontWeight: 600, lineHeight: 1, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 3 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Leads View ────────────────────────────────────────────────────────────────
function LeadsView() {
  const [leads, setLeads] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState({ temperature: '', status: '', search: '' });
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);

  const loadLeads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await leadsAPI.list({ page, limit: 20, ...filter });
      setLeads(res.data.leads);
      setTotal(res.data.total);
    } catch {
      // Demo data
      setLeads(getDemoLeads());
      setTotal(248);
    }
    setLoading(false);
  }, [page, filter]);

  useEffect(() => { loadLeads(); }, [loadLeads]);

  const getDemoLeads = () => [
    { _id: '1', name: 'Sarah Mitchell', email: 'sarah@example.com', phone: '+44 7700 900001', issue: 'invisalign', leadTemperature: 'hot', status: 'contacted', estimatedRevenue: 4500, createdAt: new Date(), source: 'chatbot' },
    { _id: '2', name: 'James Okafor', email: 'james@example.com', phone: '+44 7700 900002', issue: 'implants', leadTemperature: 'hot', status: 'booked', estimatedRevenue: 6200, createdAt: new Date(Date.now() - 86400000 * 2), source: 'chatbot' },
    { _id: '3', name: 'Priya Sharma', email: 'priya@example.com', phone: '+44 7700 900003', issue: 'veneers', leadTemperature: 'warm', status: 'nurturing', estimatedRevenue: 3200, createdAt: new Date(Date.now() - 86400000 * 3), source: 'form' },
    { _id: '4', name: 'Michael Chen', email: 'm.chen@example.com', phone: '+44 7700 900004', issue: 'whitening', leadTemperature: 'warm', status: 'new', estimatedRevenue: 299, createdAt: new Date(Date.now() - 86400000 * 4), source: 'google' },
    { _id: '5', name: 'Emma Thornton', email: 'emma@example.com', phone: '+44 7700 900005', issue: 'composite', leadTemperature: 'cold', status: 'new', estimatedRevenue: 750, createdAt: new Date(Date.now() - 86400000 * 5), source: 'instagram' },
    { _id: '6', name: 'Aisha Al-Rashid', email: 'aisha@example.com', phone: '+44 7700 900006', issue: 'invisalign', leadTemperature: 'hot', status: 'booked', estimatedRevenue: 2900, createdAt: new Date(Date.now() - 86400000 * 6), source: 'chatbot' },
    { _id: '7', name: 'David Williams', email: 'd.will@example.com', phone: '+44 7700 900007', issue: 'general', leadTemperature: 'cold', status: 'new', estimatedRevenue: 95, createdAt: new Date(Date.now() - 86400000 * 7), source: 'direct' },
  ];

  const handleReengage = async (id) => {
    try {
      await leadsAPI.reengage(id);
      toast.success('Re-engagement triggered — WhatsApp + email sent!');
    } catch {
      toast.success('Re-engagement would trigger in production');
    }
  };

  const temps = ['', 'hot', 'warm', 'cold'];
  const statuses = ['', 'new', 'contacted', 'nurturing', 'booked', 'converted', 'lost'];

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 32, fontWeight: 600, marginBottom: 4 }}>Leads</h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>{total} total leads in your pipeline</p>
        </div>
        <button onClick={loadLeads} style={{ padding: '8px 16px', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 10, color: '#c9a84c', fontSize: 13, cursor: 'pointer' }}>
          ↻ Refresh
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input placeholder="Search name, email, phone..." value={filter.search}
          onChange={e => setFilter(f => ({ ...f, search: e.target.value }))}
          style={{ flex: 1, minWidth: 200, background: '#1a2235', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '8px 14px', color: '#fff', fontSize: 13, fontFamily: 'inherit', outline: 'none' }} />
        <select value={filter.temperature} onChange={e => setFilter(f => ({ ...f, temperature: e.target.value }))}
          style={{ padding: '8px 14px', background: '#1a2235', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, color: 'rgba(255,255,255,0.6)', fontSize: 12, cursor: 'pointer', outline: 'none' }}>
          {temps.map(t => <option key={t} value={t}>{t || 'All temperatures'}</option>)}
        </select>
        <select value={filter.status} onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}
          style={{ padding: '8px 14px', background: '#1a2235', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, color: 'rgba(255,255,255,0.6)', fontSize: 12, cursor: 'pointer', outline: 'none' }}>
          {statuses.map(s => <option key={s} value={s}>{s || 'All statuses'}</option>)}
        </select>
      </div>

      {/* Table */}
      <div style={{ background: '#1a2235', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr 1fr 1fr 120px', padding: '10px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 11, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          <span>Patient</span><span>Treatment</span><span>Temperature</span><span>Status</span><span>Revenue Est.</span><span>Actions</span>
        </div>
        {loading ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Loading leads...</div>
        ) : leads.map((lead, i) => {
          const t = pill(lead.leadTemperature);
          const s = statusStyle[lead.status] || statusStyle.new;
          return (
            <motion.div key={lead._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
              onClick={() => setSelected(selected?._id === lead._id ? null : lead)}
              style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr 1fr 1fr 120px', padding: '13px 18px', borderBottom: '1px solid rgba(255,255,255,0.04)', alignItems: 'center', cursor: 'pointer', transition: 'background 0.15s', background: selected?._id === lead._id ? 'rgba(201,168,76,0.05)' : 'transparent' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
              onMouseLeave={e => e.currentTarget.style.background = selected?._id === lead._id ? 'rgba(201,168,76,0.05)' : 'transparent'}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#fff' }}>{lead.name}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{lead.email} · {format(new Date(lead.createdAt), 'MMM d')}</div>
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', textTransform: 'capitalize' }}>{lead.issue}</div>
              <div><span style={{ display: 'inline-block', padding: '3px 9px', borderRadius: 8, fontSize: 11, fontWeight: 500, background: t.bg, color: t.color }}>{t.label}</span></div>
              <div><span style={{ display: 'inline-block', padding: '3px 9px', borderRadius: 8, fontSize: 11, fontWeight: 500, background: s.bg, color: s.color, textTransform: 'capitalize' }}>{lead.status}</span></div>
              <div style={{ color: '#c9a84c', fontSize: 13, fontWeight: 500 }}>£{lead.estimatedRevenue?.toLocaleString()}</div>
              <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                <button onClick={() => handleReengage(lead._id)}
                  style={{ padding: '4px 10px', background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.2)', borderRadius: 7, color: '#25d166', fontSize: 11, cursor: 'pointer' }}>WA</button>
                <button onClick={() => window.location.href = `/book?leadId=${lead._id}`}
                  style={{ padding: '4px 10px', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 7, color: '#c9a84c', fontSize: 11, cursor: 'pointer' }}>Book</button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Expanded Lead Detail */}
      {selected && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          style={{ ...card, marginTop: 16, borderColor: 'rgba(201,168,76,0.2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, fontWeight: 600 }}>{selected.name}</h3>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 3 }}>{selected.email} · {selected.phone}</div>
            </div>
            <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 20 }}>×</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
            {[
              ['Treatment Interest', selected.issue],
              ['Budget Range', selected.budgetRange || 'Unknown'],
              ['Urgency', selected.urgency || 'Flexible'],
              ['Source', selected.source],
              ['Lead Score', `${selected.leadScore || 0}/100`],
              ['Follow-ups Sent', selected.followUpCount || 0],
              ['Created', format(new Date(selected.createdAt), 'dd MMM yyyy')],
              ['Language', selected.language === 'ar' ? 'Arabic 🇸🇦' : 'English 🇬🇧'],
            ].map(([label, value]) => (
              <div key={label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
                <div style={{ fontSize: 13, color: '#fff', fontWeight: 500, textTransform: 'capitalize' }}>{String(value)}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button onClick={() => handleReengage(selected._id)}
              style={{ padding: '9px 18px', background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.2)', borderRadius: 10, color: '#25d166', fontSize: 13, cursor: 'pointer' }}>
              💬 Send WhatsApp Re-engagement
            </button>
            <button onClick={() => toast.success('Nurture email sequence triggered')}
              style={{ padding: '9px 18px', background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)', borderRadius: 10, color: '#60a5fa', fontSize: 13, cursor: 'pointer' }}>
              📧 Trigger Email Sequence
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ── Bookings View ─────────────────────────────────────────────────────────────
function BookingsView() {
  const [bookings] = useState([
    { _id: '1', patientName: 'Sarah Mitchell', patientEmail: 'sarah@example.com', treatmentType: 'invisalign', appointmentDate: new Date(Date.now() + 86400000 * 2), status: 'confirmed', quotedPrice: 4500 },
    { _id: '2', patientName: 'James Okafor', patientEmail: 'james@example.com', treatmentType: 'implants', appointmentDate: new Date(Date.now() + 86400000 * 3), status: 'confirmed', quotedPrice: 6200 },
    { _id: '3', patientName: 'Aisha Al-Rashid', patientEmail: 'aisha@example.com', treatmentType: 'consultation', appointmentDate: new Date(Date.now() + 86400000), status: 'confirmed', quotedPrice: 0 },
    { _id: '4', patientName: 'Priya Sharma', patientEmail: 'priya@example.com', treatmentType: 'veneers', appointmentDate: new Date(Date.now() + 86400000 * 7), status: 'pending', quotedPrice: 3200 },
    { _id: '5', patientName: 'Emma Thornton', patientEmail: 'emma@example.com', treatmentType: 'whitening', appointmentDate: new Date(Date.now() - 86400000 * 2), status: 'completed', quotedPrice: 299 },
  ]);

  const bStatus = {
    confirmed: { bg: 'rgba(34,197,94,0.1)', color: '#4ade80' },
    pending: { bg: 'rgba(251,146,60,0.1)', color: '#fb923c' },
    completed: { bg: 'rgba(201,168,76,0.1)', color: '#c9a84c' },
    cancelled: { bg: 'rgba(239,68,68,0.1)', color: '#f87171' },
    no_show: { bg: 'rgba(239,68,68,0.1)', color: '#f87171' },
  };

  return (
    <div style={{ padding: 28 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 32, fontWeight: 600, marginBottom: 4 }}>Bookings</h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Upcoming and recent appointments</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
        {[
          ['Upcoming', bookings.filter(b => b.status === 'confirmed' && new Date(b.appointmentDate) > new Date()).length, '#4ade80'],
          ['This Week', 3, '#c9a84c'],
          ['Completed', bookings.filter(b => b.status === 'completed').length, '#60a5fa'],
          ['No-shows', 1, '#f87171'],
        ].map(([label, val, color]) => (
          <div key={label} style={{ ...card, borderTop: `2px solid ${color}` }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 36, fontWeight: 600, color }}>{val}</div>
          </div>
        ))}
      </div>

      <div style={{ background: '#1a2235', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.2fr 1fr 1fr 1fr 100px', padding: '10px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 11, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          <span>Patient</span><span>Treatment</span><span>Date & Time</span><span>Status</span><span>Price</span><span>Actions</span>
        </div>
        {bookings.map((b, i) => {
          const s = bStatus[b.status] || bStatus.pending;
          return (
            <motion.div key={b._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
              style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.2fr 1fr 1fr 1fr 100px', padding: '13px 18px', borderBottom: '1px solid rgba(255,255,255,0.04)', alignItems: 'center', fontSize: 13 }}>
              <div>
                <div style={{ fontWeight: 500, color: '#fff' }}>{b.patientName}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{b.patientEmail}</div>
              </div>
              <div style={{ color: 'rgba(255,255,255,0.65)', textTransform: 'capitalize' }}>{b.treatmentType}</div>
              <div>
                <div style={{ color: '#fff' }}>{format(new Date(b.appointmentDate), 'dd MMM')}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{format(new Date(b.appointmentDate), 'HH:mm')}</div>
              </div>
              <div><span style={{ padding: '3px 9px', borderRadius: 8, fontSize: 11, fontWeight: 500, background: s.bg, color: s.color, textTransform: 'capitalize' }}>{b.status}</span></div>
              <div style={{ color: '#c9a84c', fontWeight: 500 }}>{b.quotedPrice > 0 ? `£${b.quotedPrice.toLocaleString()}` : 'FREE'}</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => toast.success('Reminder sent!')} style={{ padding: '4px 8px', background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)', borderRadius: 7, color: '#60a5fa', fontSize: 11, cursor: 'pointer' }}>📅</button>
                <button onClick={() => toast.success('Reminder triggered')} style={{ padding: '4px 8px', background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.2)', borderRadius: 7, color: '#25d166', fontSize: 11, cursor: 'pointer' }}>💬</button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ── AI Insights View ──────────────────────────────────────────────────────────
function InsightsView() {
  const [insights, setInsights] = useState([]);
  const [sources, setSources] = useState([]);

  useEffect(() => {
    loadInsights();
  }, []);

  const loadInsights = async () => {
    try {
      const [ins, src] = await Promise.all([analyticsAPI.insights(), analyticsAPI.sources()]);
      setInsights(ins.data.insights);
      setSources(src.data.sources || []);
    } catch {
      setInsights(getDemoInsights());
      setSources([
        { _id: 'chatbot', count: 89, revenue: 42000 },
        { _id: 'google', count: 67, revenue: 31000 },
        { _id: 'instagram', count: 52, revenue: 24000 },
        { _id: 'form', count: 28, revenue: 13000 },
        { _id: 'referral', count: 12, revenue: 8000 },
      ]);
    }
  };

  const getDemoInsights = () => [
    { type: 'warning', category: 'chatbot', issue: 'Users drop at budget question (31% drop-off)', suggestion: 'Add "0% APR finance" messaging and a payment calculator at the budget stage to reduce anxiety and improve conversion.' },
    { type: 'opportunity', category: 'leads', issue: '14 warm leads have not been re-engaged in 7+ days', suggestion: 'Trigger a personalised WhatsApp sequence with a limited-time "20% off first treatment" offer to push warm leads to book.' },
    { type: 'warning', category: 'bookings', issue: '3 no-shows this month (5% rate)', suggestion: 'Implement a £50 refundable deposit at booking to reduce no-shows by up to 80%. Send 24h + 2h reminders.' },
    { type: 'opportunity', category: 'acquisition', issue: 'Chatbot conversion rate dropped 2% vs last month', suggestion: 'A/B test the opening chatbot message. "I\'m Sofia, your smile advisor" outperforms generic "How can I help?" by ~18%.' },
    { type: 'success', category: 'general', issue: 'Instagram traffic converts 2× better than Google Ads', suggestion: 'Increase Instagram ad spend by 30% and reduce Google Ads. Use before/after video content — highest engagement format.' },
    { type: 'info', category: 'seo', issue: 'SEO performance opportunity', suggestion: 'Create landing pages for "Invisalign Harley Street", "dental implants London", and "veneers London" — high-value local keywords with strong intent.' },
  ];

  const typeStyle = {
    warning: { icon: '⚠️', bg: 'rgba(251,146,60,0.08)', border: 'rgba(251,146,60,0.2)', label: 'rgba(255,255,255,0.8)' },
    opportunity: { icon: '✦', bg: 'rgba(201,168,76,0.08)', border: 'rgba(201,168,76,0.25)', label: 'rgba(255,255,255,0.8)' },
    success: { icon: '✓', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.2)', label: 'rgba(255,255,255,0.8)' },
    info: { icon: '◈', bg: 'rgba(96,165,250,0.08)', border: 'rgba(96,165,250,0.2)', label: 'rgba(255,255,255,0.8)' },
  };

  const maxCount = sources[0]?.count || 1;

  return (
    <div style={{ padding: 28 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 32, fontWeight: 600, marginBottom: 4 }}>AI Growth Insights</h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Automated analysis of your conversion funnel and lead quality</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 12 }}>Actionable Recommendations</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {insights.map((ins, i) => {
              const ts = typeStyle[ins.type] || typeStyle.info;
              return (
                <motion.div key={i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }}
                  style={{ background: ts.bg, border: `1px solid ${ts.border}`, borderRadius: 14, padding: '16px 18px', display: 'flex', gap: 14 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: ts.border, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>{ts.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: ts.label, marginBottom: 6 }}>{ins.issue}</div>
                    <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>{ins.suggestion}</div>
                    <div style={{ marginTop: 10 }}>
                      <span style={{ fontSize: 10, padding: '2px 8px', background: 'rgba(255,255,255,0.07)', borderRadius: 6, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{ins.category}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 12 }}>Lead Sources</div>
          <div style={{ ...card, padding: '20px 20px' }}>
            {sources.map((s, i) => (
              <div key={i} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
                  <span style={{ color: 'rgba(255,255,255,0.65)', textTransform: 'capitalize' }}>{s._id}</span>
                  <span style={{ color: '#c9a84c', fontWeight: 500 }}>£{(s.revenue / 1000).toFixed(0)}k · {s.count} leads</span>
                </div>
                <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                  <motion.div initial={{ width: 0 }} animate={{ width: `${(s.count / maxCount) * 100}%` }} transition={{ duration: 0.8, delay: i * 0.1 }}
                    style={{ height: '100%', background: 'linear-gradient(90deg,#c9a84c,#e8c96a)', borderRadius: 3 }} />
                </div>
              </div>
            ))}
          </div>

          <div style={{ ...card, marginTop: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>Funnel Health</div>
            {[
              ['Visitors → Leads', '4.2%', 'Average is 2.8%', '#4ade80'],
              ['Leads → Booked', '24.6%', 'Average is 18%', '#4ade80'],
              ['Booked → Attended', '89%', 'Target is 90%', '#fb923c'],
              ['Chat Conversion', '38%', 'Industry avg: 22%', '#4ade80'],
            ].map(([label, rate, bench, color]) => (
              <div key={label} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                  <span style={{ color: 'rgba(255,255,255,0.55)' }}>{label}</span>
                  <span style={{ color, fontWeight: 600 }}>{rate}</span>
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>{bench}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Dashboard Shell ──────────────────────────────────────────────────────
export default function Dashboard() {
  const location = useLocation();
  const active = location.pathname.split('/')[2] || 'overview';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0f1523', color: '#fff', fontFamily: "'DM Sans',system-ui,sans-serif" }}>
      <Sidebar active={active} />
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        <Routes>
          <Route index element={<Overview />} />
          <Route path="overview" element={<Overview />} />
          <Route path="leads" element={<LeadsView />} />
          <Route path="bookings" element={<BookingsView />} />
          <Route path="analytics" element={<Overview />} />
          <Route path="insights" element={<InsightsView />} />
          <Route path="*" element={<Overview />} />
        </Routes>
      </div>
    </div>
  );
}

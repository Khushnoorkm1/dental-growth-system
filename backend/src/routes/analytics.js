import express from 'express';
import Lead from '../models/Lead.js';
import Booking from '../models/Booking.js';
import Conversation from '../models/Conversation.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// GET /api/analytics/overview — Main dashboard metrics
router.get('/overview', protect, async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const daysAgo = parseInt(period);
    const since = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

    const [
      totalLeads,
      hotLeads,
      warmLeads,
      coldLeads,
      totalBookings,
      confirmedBookings,
      convertedLeads,
      totalConversations,
      convertedConversations,
      revenueData,
      newLeads,
      newBookings,
    ] = await Promise.all([
      Lead.countDocuments({ createdAt: { $gte: since } }),
      Lead.countDocuments({ leadTemperature: 'hot', createdAt: { $gte: since } }),
      Lead.countDocuments({ leadTemperature: 'warm', createdAt: { $gte: since } }),
      Lead.countDocuments({ leadTemperature: 'cold', createdAt: { $gte: since } }),
      Booking.countDocuments({ createdAt: { $gte: since } }),
      Booking.countDocuments({ status: 'confirmed', createdAt: { $gte: since } }),
      Lead.countDocuments({ status: 'converted', createdAt: { $gte: since } }),
      Conversation.countDocuments({ createdAt: { $gte: since } }),
      Conversation.countDocuments({ converted: true, createdAt: { $gte: since } }),
      Lead.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: null, estimated: { $sum: '$estimatedRevenue' }, actual: { $sum: '$actualRevenue' } } },
      ]),
      Lead.countDocuments({ createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }),
      Booking.countDocuments({ createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }),
    ]);

    const conversionRate = totalLeads > 0 ? ((totalBookings / totalLeads) * 100).toFixed(1) : 0;
    const chatConversionRate = totalConversations > 0 ? ((convertedConversations / totalConversations) * 100).toFixed(1) : 0;
    const estimatedRevenue = revenueData[0]?.estimated || 0;

    res.json({
      success: true,
      period: daysAgo,
      metrics: {
        leads: { total: totalLeads, hot: hotLeads, warm: warmLeads, cold: coldLeads, today: newLeads },
        bookings: { total: totalBookings, confirmed: confirmedBookings, today: newBookings },
        conversions: { leads: convertedLeads, rate: conversionRate },
        chat: { total: totalConversations, converted: convertedConversations, rate: chatConversionRate },
        revenue: { estimated: estimatedRevenue },
      },
    });
  } catch (err) {
    console.error('Analytics overview error:', err);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

// GET /api/analytics/timeseries — Charts data
router.get('/timeseries', protect, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const since = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);

    const [leadsOverTime, bookingsOverTime] = await Promise.all([
      Lead.aggregate([
        { $match: { createdAt: { $gte: since } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            leads: { $sum: 1 },
            hot: { $sum: { $cond: [{ $eq: ['$leadTemperature', 'hot'] }, 1, 0] } },
            warm: { $sum: { $cond: [{ $eq: ['$leadTemperature', 'warm'] }, 1, 0] } },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Booking.aggregate([
        { $match: { createdAt: { $gte: since } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            bookings: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    // Merge into single array
    const dateMap = {};
    leadsOverTime.forEach(d => {
      dateMap[d._id] = { date: d._id, leads: d.leads, hotLeads: d.hot, warmLeads: d.warm, bookings: 0 };
    });
    bookingsOverTime.forEach(d => {
      if (dateMap[d._id]) dateMap[d._id].bookings = d.bookings;
      else dateMap[d._id] = { date: d._id, leads: 0, hotLeads: 0, warmLeads: 0, bookings: d.bookings };
    });

    const chartData = Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date));
    res.json({ success: true, chartData });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get timeseries data' });
  }
});

// GET /api/analytics/sources — Lead source breakdown
router.get('/sources', protect, async (req, res) => {
  try {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const sources = await Lead.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: '$source', count: { $sum: 1 }, revenue: { $sum: '$estimatedRevenue' } } },
      { $sort: { count: -1 } },
    ]);

    const treatments = await Lead.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: '$issue', count: { $sum: 1 }, revenue: { $sum: '$estimatedRevenue' } } },
      { $sort: { count: -1 } },
    ]);

    res.json({ success: true, sources, treatments });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get source data' });
  }
});

// GET /api/analytics/ai-insights — AI optimization suggestions
router.get('/ai-insights', protect, async (req, res) => {
  try {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      abandonedStages,
      coldLeadCount,
      noShowCount,
      lowConversionSource,
    ] = await Promise.all([
      Conversation.aggregate([
        { $match: { converted: false, createdAt: { $gte: since } } },
        { $group: { _id: '$stage', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 3 },
      ]),
      Lead.countDocuments({ leadTemperature: 'cold', createdAt: { $gte: since } }),
      Booking.countDocuments({ status: 'no_show', createdAt: { $gte: since } }),
      Lead.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: '$source', total: { $sum: 1 }, booked: { $sum: { $cond: [{ $eq: ['$status', 'booked'] }, 1, 0] } } } },
        { $addFields: { convRate: { $divide: ['$booked', '$total'] } } },
        { $sort: { convRate: 1 } },
        { $limit: 1 },
      ]),
    ]);

    const insights = [];

    // Abandonment insights
    abandonedStages.forEach(stage => {
      const stageMessages = {
        budget_collection: { issue: 'Users dropping at budget question', suggestion: 'Add financing options section (0% APR finance) and remove price anxiety with "flexible payment plans" messaging' },
        contact_collection: { issue: 'Users reluctant to share contact info', suggestion: 'Add trust signals near contact collection — "We never spam", privacy badge, and GDPR statement' },
        issue_collection: { issue: 'Users not engaging with treatment questions', suggestion: 'Simplify first chatbot question with visual treatment options instead of open text' },
        urgency_collection: { issue: 'Users stalling on urgency', suggestion: 'Add social proof here — "We booked 12 patients this week" to create gentle urgency' },
      };
      const msg = stageMessages[stage._id];
      if (msg) insights.push({ type: 'warning', category: 'chatbot', ...msg, count: stage.count });
    });

    if (coldLeadCount > 10) {
      insights.push({ type: 'opportunity', category: 'leads', issue: `${coldLeadCount} cold leads not converting`, suggestion: 'Launch an educational email campaign with before/after content and a limited-time free whitening add-on offer' });
    }

    if (noShowCount > 2) {
      insights.push({ type: 'warning', category: 'bookings', issue: `${noShowCount} no-shows this month`, suggestion: 'Enable deposit collection (£50) at booking stage to reduce no-shows by up to 80%' });
    }

    if (lowConversionSource.length > 0 && lowConversionSource[0].convRate < 0.1) {
      insights.push({ type: 'info', category: 'acquisition', issue: `${lowConversionSource[0]._id} source has low conversion (${(lowConversionSource[0].convRate * 100).toFixed(0)}%)`, suggestion: 'Review landing page for this traffic source. Consider a dedicated, source-specific landing page.' });
    }

    // Default positive insight
    insights.push({ type: 'success', category: 'general', issue: 'System running optimally', suggestion: 'Consider A/B testing your CTA button color (gold vs blue) and headline copy to lift conversion by 10-20%' });

    res.json({ success: true, insights });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get AI insights' });
  }
});

export default router;

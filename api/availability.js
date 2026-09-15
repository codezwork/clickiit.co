// api/availability.js - Vercel Serverless Function
const { getSupabase, cors } = require('./_supabase');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = getSupabase();
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('eventDate, eventTime, sessionPlan, status')
      .in('status', ['confirmed', 'completed', 'blocked']);

    if (error) {
      console.error('Supabase availability error:', error);
      return res.status(200).json({
        bookedDates: [],
        details: [],
        timestamp: new Date().toISOString(),
        warning: error.message
      });
    }

    const bookedList = bookings || [];
    const bookedDates = [...new Set(bookedList.map(b => b.eventDate).filter(Boolean))];
    const details = bookedList.map(b => ({
      date: b.eventDate,
      time: b.eventTime,
      plan: b.sessionPlan,
      status: b.status
    }));

    return res.status(200).json({
      bookedDates,
      details,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Availability handler error:', err);
    return res.status(500).json({ error: 'Internal server error', message: err.message });
  }
};

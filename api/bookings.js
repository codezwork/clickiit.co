// api/bookings.js - Vercel Serverless Function
const { getSupabase, isAuthorized, cors } = require('./_supabase');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const supabase = getSupabase();

  // GET: Fetch bookings (admin only)
  if (req.method === 'GET') {
    if (!isAuthorized(req)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .order('createdAt', { ascending: false });

      if (error) throw error;
      return res.status(200).json(data || []);
    } catch (err) {
      console.error('Fetch bookings error:', err);
      return res.status(500).json({ error: 'Failed to fetch bookings', message: err.message });
    }
  }

  // POST: Create booking (Public)
  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      if (!body || !body.name || !body.whatsapp || !body.eventDate) {
        return res.status(400).json({ error: 'Name, WhatsApp number, and event date are required' });
      }

      const newBooking = {
        id: (body.id && String(body.id).trim()) || ('BK-' + Date.now().toString().slice(-6)),
        name: String(body.name).trim(),
        whatsapp: String(body.whatsapp).trim(),
        address: String(body.address || '').trim(),
        eventDate: body.eventDate,
        eventTime: body.eventTime || '18:00',
        eventType: body.eventType || 'Other Celebration',
        sessionPlan: body.sessionPlan || 'Classic — 200 Prints (₹12,999)',
        notes: String(body.notes || '').trim(),
        status: body.status || 'pending',
        createdAt: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('bookings')
        .insert([newBooking])
        .select()
        .single();

      if (error) throw error;

      return res.status(201).json({
        success: true,
        message: 'Booking request received successfully',
        booking: data || newBooking
      });
    } catch (err) {
      console.error('Insert booking error:', err);
      return res.status(400).json({ error: 'Failed to process booking', message: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};

// api/admin/block-date.js - Vercel Serverless Function
const { getSupabase, isAuthorized, cors } = require('../_supabase');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!isAuthorized(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!body || !body.date) {
      return res.status(400).json({ error: 'Date is required' });
    }

    const blockedItem = {
      id: 'BLK-' + Date.now().toString().slice(-6),
      name: body.reason || 'Admin Blocked / Maintenance',
      whatsapp: '-',
      address: '-',
      eventDate: body.date,
      eventTime: body.time || 'All Day',
      eventType: 'Reserved / Unavailable',
      sessionPlan: 'Full Day',
      notes: body.notes || 'Reserved by studio administrator',
      status: 'blocked',
      createdAt: new Date().toISOString()
    };

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('bookings')
      .insert([blockedItem])
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({ success: true, blockedItem: data || blockedItem });
  } catch (err) {
    console.error('Admin block date error:', err);
    return res.status(400).json({ error: 'Failed to block date', message: err.message });
  }
};

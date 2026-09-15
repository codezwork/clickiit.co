// api/admin/bookings.js - Vercel Serverless Function
const { getSupabase, isAuthorized, cors } = require('../_supabase');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (!isAuthorized(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabase = getSupabase();

  // GET: All Bookings
  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .order('createdAt', { ascending: false });

      if (error) throw error;
      return res.status(200).json(data || []);
    } catch (err) {
      console.error('Admin GET bookings error:', err);
      return res.status(500).json({ error: 'Failed to fetch bookings', message: err.message });
    }
  }

  // PATCH: Update booking
  if (req.method === 'PATCH') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const bookingId = req.query.id || (body && body.id);

      if (!bookingId) {
        return res.status(400).json({ error: 'Booking ID is required' });
      }

      const updates = { ...(body || {}) };
      delete updates.id;
      updates.updatedAt = new Date().toISOString();

      const { data, error } = await supabase
        .from('bookings')
        .update(updates)
        .eq('id', bookingId)
        .select()
        .single();

      if (error) throw error;

      return res.status(200).json({ success: true, booking: data });
    } catch (err) {
      console.error('Admin PATCH booking error:', err);
      return res.status(400).json({ error: 'Failed to update booking', message: err.message });
    }
  }

  // DELETE: Delete booking
  if (req.method === 'DELETE') {
    try {
      const bookingId = req.query.id || (req.body && req.body.id);
      if (!bookingId) {
        return res.status(400).json({ error: 'Booking ID is required' });
      }

      const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('id', bookingId);

      if (error) throw error;

      return res.status(200).json({ success: true, message: 'Booking deleted' });
    } catch (err) {
      console.error('Admin DELETE booking error:', err);
      return res.status(400).json({ error: 'Failed to delete booking', message: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};

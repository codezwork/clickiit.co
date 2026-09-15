// api/admin/strips.js - Vercel Serverless Function
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

  // POST: Add strip
  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      if (!body || !body.imageUrl) {
        return res.status(400).json({ error: 'Image is required' });
      }

      const newStrip = {
        id: (body.id && String(body.id).trim()) || ('strip-' + Date.now()),
        title: String(body.title || ('Strip ' + new Date().toISOString().slice(0, 10))).trim(),
        dateTag: String(body.dateTag || new Date().toLocaleDateString('en-IN')).trim(),
        imageUrl: body.imageUrl,
        displayTarget: body.displayTarget || 'both',
        createdAt: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('strips')
        .insert([newStrip])
        .select()
        .single();

      if (error) throw error;

      return res.status(201).json({ success: true, strip: data || newStrip });
    } catch (err) {
      console.error('Admin add strip error:', err);
      return res.status(400).json({ error: 'Failed to add photo strip', message: err.message });
    }
  }

  // DELETE: Delete strip
  if (req.method === 'DELETE') {
    try {
      const stripId = req.query.id || (req.body && req.body.id);
      if (!stripId) {
        return res.status(400).json({ error: 'Strip ID required' });
      }

      const { error } = await supabase
        .from('strips')
        .delete()
        .eq('id', stripId);

      if (error) throw error;

      return res.status(200).json({ success: true, message: 'Strip deleted' });
    } catch (err) {
      console.error('Admin delete strip error:', err);
      return res.status(400).json({ error: 'Failed to delete strip', message: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};

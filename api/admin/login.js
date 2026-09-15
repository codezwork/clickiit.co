// api/admin/login.js - Vercel Serverless Function
const { cors, ADMIN_TOKEN } = require('../_supabase');

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'clickit@admin2026';

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const password = body && body.password;

    if (password === ADMIN_PASSWORD) {
      return res.status(200).json({
        success: true,
        token: ADMIN_TOKEN,
        expiresIn: 86400
      });
    } else {
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }
  } catch (err) {
    return res.status(400).json({ error: 'Invalid request' });
  }
};

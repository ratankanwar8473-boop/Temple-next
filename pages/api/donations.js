import { connectDB } from '../../lib/db';
import { requireAdmin } from '../../lib/auth';
import Donation from '../../models/Donation';

export default async function handler(req, res) {
  try {
    await connectDB();
  } catch (error) {
    console.error('Donations database connection failed:', error.message);
    return res.status(503).json({ error: 'Database unavailable. Check MONGODB_URI and MongoDB network access.' });
  }

  // Public POST — submit donation
  if (req.method === 'POST') {
    const { name, phone, email, amount, purpose, message } = req.body;
    if (!name || !phone || !amount) return res.status(400).json({ error: 'name, phone, amount required' });
    const doc = await Donation.create({ name, phone, email, amount: Number(amount), purpose, message });
    return res.status(201).json({ success: true, id: doc._id });
  }

  // Admin GET — list all
  if (req.method === 'GET') {
    if (!requireAdmin(req, res)) return;
    const { page = 1, limit = 200, status } = req.query;
    const filter = status ? { status } : {};
    const total  = await Donation.countDocuments(filter);
    const data   = await Donation.find(filter).sort({ createdAt: -1 }).skip((page-1)*limit).limit(Number(limit)).lean();
    return res.json({ total, data });
  }

  res.status(405).json({ error: 'Method not allowed' });
}

import { connectDB } from '../../lib/db';
import { requireAdmin } from '../../lib/auth';
import Enquiry from '../../models/Enquiry';

export default async function handler(req, res) {
  try {
    await connectDB();
  } catch (error) {
    console.error('Enquiries database connection failed:', error.message);
    return res.status(503).json({ error: 'Database unavailable. Check MONGODB_URI and MongoDB network access.' });
  }

  if (req.method === 'POST') {
    const { name, phone, email, type, message } = req.body;
    if (!name || !phone || !message) return res.status(400).json({ error: 'name, phone, message required' });
    const doc = await Enquiry.create({ name, phone, email, type, message });
    return res.status(201).json({ success: true, id: doc._id });
  }

  if (req.method === 'GET') {
    if (!requireAdmin(req, res)) return;
    const { page = 1, limit = 200, status } = req.query;
    const filter = status ? { status } : {};
    const total  = await Enquiry.countDocuments(filter);
    const data   = await Enquiry.find(filter).sort({ createdAt: -1 }).skip((page-1)*limit).limit(Number(limit)).lean();
    return res.json({ total, data });
  }

  res.status(405).json({ error: 'Method not allowed' });
}

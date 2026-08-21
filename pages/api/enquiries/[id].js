import { connectDB } from '../../../lib/db';
import { requireAdmin } from '../../../lib/auth';
import Enquiry from '../../../models/Enquiry';

export default async function handler(req, res) {
  await connectDB();
  if (!requireAdmin(req, res)) return;
  const { id } = req.query;

  if (req.method === 'PATCH') {
    const doc = await Enquiry.findByIdAndUpdate(id, { $set: req.body }, { new: true });
    if (!doc) return res.status(404).json({ error: 'Not found' });
    return res.json({ success: true, doc });
  }

  if (req.method === 'DELETE') {
    await Enquiry.findByIdAndDelete(id);
    return res.json({ success: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
}

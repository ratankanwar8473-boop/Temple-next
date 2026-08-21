import { connectDB } from '../../lib/db';
import { requireAdmin } from '../../lib/auth';
import Config from '../../models/Config';

export default async function handler(req, res) {
  try {
    await connectDB();
  } catch (error) {
    console.error('Config database connection failed:', error.message);
    return res.status(503).json({ error: 'Database unavailable. Check MONGODB_URI and MongoDB network access.' });
  }

  if (req.method === 'GET') {
    let cfg = await Config.findOne({ key: 'main' }).lean();
    if (!cfg) cfg = await Config.create({ key: 'main' });
    return res.json(cfg);
  }

  if (req.method === 'PUT') {
    if (!requireAdmin(req, res)) return;
    const cfg = await Config.findOneAndUpdate(
      { key: 'main' },
      { $set: req.body },
      { upsert: true, new: true, runValidators: false }
    );
    return res.json({ success: true, cfg });
  }

  res.status(405).json({ error: 'Method not allowed' });
}

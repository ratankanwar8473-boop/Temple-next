export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { password } = req.body;
  const adminSecret  = process.env.ADMIN_SECRET || 'temple@123';

  // Accept: either the ADMIN_SECRET directly, OR the local UI password (temple@123 default)
  // Both give back the real ADMIN_SECRET token so API calls work
  if (password === adminSecret) {
    return res.json({ success: true, token: adminSecret });
  }

  // Also accept default 'temple@123' as UI login password always
  // This lets UI login work even when ADMIN_SECRET is a different strong key
  if (password === 'temple@123') {
    return res.json({ success: true, token: adminSecret });
  }

  return res.status(401).json({ error: 'Invalid password' });
}

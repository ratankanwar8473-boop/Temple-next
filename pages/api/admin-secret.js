// Returns a hashed/masked version - just to let frontend know what secret to use
// This exposes NOTHING sensitive - just confirms the env var is set
export default function handler(req, res) {
  const isSet = !!process.env.ADMIN_SECRET;
  res.json({ configured: isSet });
}

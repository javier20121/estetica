import { getSession } from './_lib/auth.js';

export default function handler(req, res) {
  const session = getSession(req);
  if (!session.ok) {
    res.status(session.status).json({ success: false, message: session.message });
    return;
  }

  res.status(200).json({
    success: true,
    usuario: session.payload.sub || '',
    role: session.payload.role || ''
  });
}

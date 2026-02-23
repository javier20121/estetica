import { verify } from './_lib/jwt.js';

const JWT_SECRET = process.env.JWT_SECRET || '';

function parseCookies(cookieHeader) {
  const list = {};
  if (!cookieHeader) {
    return list;
  }

  cookieHeader.split(';').forEach((cookie) => {
    const parts = cookie.split('=');
    const key = parts.shift().trim();
    const value = decodeURIComponent(parts.join('='));
    if (key) {
      list[key] = value;
    }
  });

  return list;
}

export default function handler(req, res) {
  if (!JWT_SECRET) {
    res.status(500).json({ success: false, message: 'JWT secret no configurado.' });
    return;
  }

  const cookies = parseCookies(req.headers.cookie || '');
  const token = cookies.session;
  const payload = verify(token, JWT_SECRET);

  if (!payload) {
    res.status(401).json({ success: false, message: 'Sesion invalida.' });
    return;
  }

  res.status(200).json({
    success: true,
    usuario: payload.sub || '',
    role: payload.role || ''
  });
}

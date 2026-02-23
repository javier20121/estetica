import { verify } from './jwt.js';

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

export function getSession(req) {
  if (!JWT_SECRET) {
    return { ok: false, status: 500, message: 'JWT secret no configurado.' };
  }

  const cookies = parseCookies(req.headers.cookie || '');
  const token = cookies.session;
  const payload = verify(token, JWT_SECRET);

  if (!payload) {
    return { ok: false, status: 401, message: 'Sesion invalida.' };
  }

  return { ok: true, payload };
}

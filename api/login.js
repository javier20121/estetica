import { sign } from './_lib/jwt.js';

const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwJMFjwwCLdxVq1c0Mh2WbPdlMXkY8_ipm9cgLDQ85S5Z_Br8z_l6VDS30ECLq3ikXB/exec';
const JWT_SECRET = process.env.JWT_SECRET || '';
const JWT_TTL_SECONDS = 60 * 60 * 2;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, message: 'Metodo no permitido.' });
    return;
  }

  const { usuario, password } = req.body || {};

  if (!usuario || !password) {
    res.status(400).json({ success: false, message: 'Faltan credenciales.' });
    return;
  }

  try {
    const body = new URLSearchParams({
      usuario: String(usuario),
      password: String(password)
    });

    const response = await fetch(WEB_APP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
      },
      body: body.toString()
    });

    const text = await response.text();
    let payload;

    try {
      payload = JSON.parse(text);
    } catch (err) {
      const snippet = text ? text.slice(0, 200) : '';
      const isHtml = /<!doctype html>|<html/i.test(text || '');
      const isAuthStatus = response.status === 401 || response.status === 403;
      payload = {
        success: false,
        message: (isHtml && isAuthStatus)
          ? 'El Web App de Apps Script no es accesible publicamente (401/403). En Deploy debe quedar en "Anyone".'
          : 'Respuesta invalida del servidor. Revisa el deploy de Apps Script.',
        detail: `status=${response.status} snippet=${snippet}`
      };
    }

    if (payload && payload.success) {
      if (!JWT_SECRET) {
        res.status(500).json({ success: false, message: 'JWT secret no configurado.' });
        return;
      }

      const token = sign(
        { sub: String(usuario), role: payload.role || '' },
        JWT_SECRET,
        JWT_TTL_SECONDS
      );

      res.setHeader(
        'Set-Cookie',
        `session=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${JWT_TTL_SECONDS}`
      );
    }

    res.status(200).json(payload);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error en el proxy.' });
  }
}

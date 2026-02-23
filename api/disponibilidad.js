import { callAppsScript } from './_lib/appsScript.js';
import { getSession } from './_lib/auth.js';

export default async function handler(req, res) {
  const session = getSession(req);
  if (!session.ok) {
    res.status(session.status).json({ success: false, message: session.message });
    return;
  }

  const fecha = String(req.query.fecha || '').trim();
  if (!fecha) {
    res.status(400).json({ success: false, message: 'Fecha requerida.' });
    return;
  }

  const payload = await callAppsScript({
    action: 'disponibilidad',
    usuario: session.payload.sub || '',
    fecha
  });
  res.status(200).json(payload);
}

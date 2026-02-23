import { callAppsScript } from './_lib/appsScript.js';
import { getSession } from './_lib/auth.js';

export default async function handler(req, res) {
  const session = getSession(req);
  if (!session.ok) {
    res.status(session.status).json({ success: false, message: session.message });
    return;
  }

  if (req.method === 'GET') {
    const payload = await callAppsScript({
      action: 'mis-turnos',
      usuario: session.payload.sub || ''
    });
    res.status(200).json(payload);
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ success: false, message: 'Metodo no permitido.' });
    return;
  }

  const { fecha, hora, servicioId } = req.body || {};
  const payload = await callAppsScript({
    action: 'reservar',
    usuario: session.payload.sub || '',
    fecha: String(fecha || '').trim(),
    hora: String(hora || '').trim(),
    servicioId: String(servicioId || '').trim()
  });
  res.status(200).json(payload);
}

import { callAppsScript } from './_lib/appsScript.js';
import { getSession } from './_lib/auth.js';

export default async function handler(req, res) {
  const session = getSession(req);
  if (!session.ok) {
    res.status(session.status).json({ success: false, message: session.message });
    return;
  }

  const payload = await callAppsScript({ action: 'perfil', usuario: session.payload.sub || '' });
  res.status(200).json(payload);
}

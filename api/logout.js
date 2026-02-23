export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, message: 'Metodo no permitido.' });
    return;
  }

  res.setHeader(
    'Set-Cookie',
    'session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0'
  );
  res.status(200).json({ success: true, message: 'Sesion cerrada.' });
}

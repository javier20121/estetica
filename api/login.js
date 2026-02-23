const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwDzrGr-iAhzmRUilES-D9PvAKz7XyXT3PB3EgJD9b2gI2NDZQBt_sNRIlFpgR38fS8/exec';
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
      payload = { success: false, message: 'Respuesta invalida del servidor.' };
    }

    res.status(200).json(payload);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error en el proxy.' });
  }
}

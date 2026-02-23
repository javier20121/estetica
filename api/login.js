const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzIas_E1TLMF2-rorXdRIW4YnYdHnGA09Uwd2K3FAOo7Odjpk_ZDZBkeGgIww9wKwLC/exec';
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
      payload = {
        success: false,
        message: 'Respuesta invalida del servidor. Revisa el deploy de Apps Script.',
        detail: `status=${response.status} snippet=${snippet}`
      };
    }

    res.status(200).json(payload);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error en el proxy.' });
  }
}

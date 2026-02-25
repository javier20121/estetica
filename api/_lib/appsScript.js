const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwtp_CFZei0m6i3d5IFJ7NqkfF-yWAsCJwzDZj4Aql8HYiN0FAi7A5GSqdC9bgiaEJe/exec';

export async function callAppsScript(payload) {
  const body = new URLSearchParams(payload);

  const response = await fetch(WEB_APP_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
    },
    body: body.toString()
  });

  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (err) {
    const snippet = text ? text.slice(0, 200) : '';
    return {
      success: false,
      message: 'Respuesta invalida del servidor. Revisa el deploy de Apps Script.',
      detail: `status=${response.status} snippet=${snippet}`
    };
  }
}

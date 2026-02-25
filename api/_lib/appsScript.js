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
    const isHtml = /<!doctype html>|<html/i.test(text || '');
    const isAuthStatus = response.status === 401 || response.status === 403;
    return {
      success: false,
      message: (isHtml && isAuthStatus)
        ? 'El Web App de Apps Script no es accesible publicamente (401/403). En Deploy debe quedar en "Anyone".'
        : 'Respuesta invalida del servidor. Revisa el deploy de Apps Script.',
      detail: `status=${response.status} snippet=${snippet}`
    };
  }
}

// URL del Web App de Apps Script (Implementacion -> URL).
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzWw64qF-sSImMRaVxwlurjjrH4b391dD7SWccFg8am-htdk8Vdewf2MKCX2PBK8QEZ/exec';

function handleLogin(e) {
	e.preventDefault();
	
	const form = e.target;
	const btn = document.getElementById('btnSubmit');
	const loader = document.getElementById('loader');
	
	btn.disabled = true;
	loader.style.display = 'block';
	
	// Enviar formulario directamente (sin CORS)
	form.action = WEB_APP_URL;
	form.method = 'POST';
	form.submit();
}

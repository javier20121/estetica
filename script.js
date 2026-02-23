// URL del Web App de Apps Script (Implementacion -> URL).
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbyMvS0n6EcAXYkRpKHylW5yJ-z4KZSADYLA3AUhw5RzBnwVn5Ex0oZNe8eTBMLE5dYf/exec';

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

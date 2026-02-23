// API local (Vercel) para evitar CORS.
const API_URL = '/api/login';
function handleLogin(e) {
	e.preventDefault();

	const user = document.getElementById('usuario').value;
	const pass = document.getElementById('password').value;
	const btn = document.getElementById('btnSubmit');
	const msgDiv = document.getElementById('message');
	const loader = document.getElementById('loader');

	msgDiv.textContent = '';
	msgDiv.className = 'message';
	btn.disabled = true;
	loader.style.display = 'block';

	fetch(API_URL, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ usuario: user, password: pass })
	})
		.then((res) => res.json())
		.then((response) => {
			loader.style.display = 'none';
			btn.disabled = false;

			if (response.success) {
			msgDiv.textContent = 'Acceso concedido. Redirigiendo...';
			msgDiv.classList.add('success');			// Guardar datos del usuario
			localStorage.setItem('usuario', user);
			localStorage.setItem('rol', response.role || '');			// Redirigir a la agenda
			setTimeout(() => {
				window.location.href = 'agenda.html';
			}, 800);
			} else {
				const detail = response.detail ? ` (${response.detail})` : '';
				msgDiv.textContent = (response.message || 'Acceso denegado.') + detail;
				msgDiv.classList.add('error');
			}
		})
		.catch(() => {
			loader.style.display = 'none';
			btn.disabled = false;
			msgDiv.textContent = 'Error al conectar con el servidor.';
			msgDiv.classList.add('error');
		});
}

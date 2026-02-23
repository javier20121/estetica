// URL del Web App de Apps Script (Implementacion -> URL).
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwZuSwwf_xhTYDjXcv5dESGEME9M9cSy9FvfHvcx2gMPkp1H5Dj4YaKufPRsAyon8Tf/exec';

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

	if (!WEB_APP_URL || WEB_APP_URL.indexOf('http') !== 0) {
		loader.style.display = 'none';
		btn.disabled = false;
		msgDiv.textContent = 'Configura WEB_APP_URL en script.js.';
		msgDiv.classList.add('error');
		return;
	}

	const body = new URLSearchParams({
		usuario: user,
		password: pass
	});

	fetch(WEB_APP_URL, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
		},
		body: body.toString()
	})
		.then((res) => res.json())
		.then((response) => {
			loader.style.display = 'none';
			btn.disabled = false;

			if (response.success) {
				msgDiv.textContent = 'Exito. Redirigiendo...';
				msgDiv.classList.add('success');

				// Redireccion por rol (opcional)
				// if (response.role === 'admin') window.location.href = 'URL_ADMIN';
			} else {
				msgDiv.textContent = response.message || 'Credenciales invalidas.';
				msgDiv.classList.add('error');
			}
		})
		.catch((err) => {
			console.error(err);
			loader.style.display = 'none';
			btn.disabled = false;
			msgDiv.textContent = 'Error al conectar con el servidor.';
			msgDiv.classList.add('error');
		});
}

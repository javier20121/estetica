// URL del Web App de Apps Script (Implementacion -> URL).
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbw47qOKv7HqPA-Igurkk6iRqbvrGGxRP5LOCpaqlv65toPYw2fpvadAZeGvmjgM3wEl/exec';
function handleLogin(e) {
	e.preventDefault();
	
	const form = e.target;
	const btn = document.getElementById('btnSubmit');
	const msgDiv = document.getElementById('message');
	const loader = document.getElementById('loader');
	
	msgDiv.textContent = '';
	msgDiv.className = 'message';
	btn.disabled = true;
	loader.style.display = 'block';
	
	// Crear iframe oculto si no existe
	let iframe = document.getElementById('responseFrame');
	if (!iframe) {
		iframe = document.createElement('iframe');
		iframe.id = 'responseFrame';
		iframe.name = 'responseFrame';
		iframe.style.display = 'none';
		document.body.appendChild(iframe);
	}
	
	// Configurar form para enviar al iframe
	form.action = WEB_APP_URL;
	form.method = 'POST';
	form.target = 'responseFrame';
	
	// Esperar respuesta del iframe
	setTimeout(() => {
		try {
			const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
			const body = iframeDoc.body;
			
			if (body && body.textContent) {
				const text = body.textContent;
				
				if (text.includes('Acceso Concedido') || text.includes('✓')) {
					msgDiv.textContent = 'Acceso concedido. Redirigiendo...';
					msgDiv.classList.add('success');
					// Aqui puedes redirigir: window.location.href = 'URL_DESTINO';
				} else if (text.includes('Denegado') || text.includes('✗')) {
					msgDiv.textContent = 'Acceso denegado. Usuario o contraseña incorrectos.';
					msgDiv.classList.add('error');
				} else {
					msgDiv.textContent = 'Error al validar credenciales.';
					msgDiv.classList.add('error');
				}
			} else {
				msgDiv.textContent = 'Error al procesar la respuesta.';
				msgDiv.classList.add('error');
			}
		} catch (err) {
			msgDiv.textContent = 'Error al conectar con el servidor.';
			msgDiv.classList.add('error');
		}
		
		loader.style.display = 'none';
		btn.disabled = false;
	}, 2000);
	
	form.submit();
}

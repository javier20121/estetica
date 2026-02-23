# Sistema de Login y Agenda con Google Sheets

## 📋 Descripción General

Este es un sistema web de autenticación que valida usuarios contra una base de datos en Google Sheets y, tras el login exitoso, muestra una agenda de turnos.

---

## 🏗️ Arquitectura del Sistema

```
┌─────────────┐
│   Usuario   │
│ (Navegador) │
└──────┬──────┘
       │
       │ 1. Ingresa credenciales
       ▼
┌─────────────────┐
│  index.html     │ ◄── Página de login
│  + script.js    │
└────────┬────────┘
         │
         │ 2. POST /api/login
         ▼
┌─────────────────┐
│ Vercel (Proxy)  │ ◄── Servidor intermedio
│  api/login.js   │
└────────┬────────┘
         │
         │ 3. POST al Web App
         ▼
┌─────────────────┐
│  Apps Script    │ ◄── Backend en Google
│    Code.gs      │
└────────┬────────┘
         │
         │ 4. Consulta datos
         ▼
┌─────────────────┐
│  Google Sheets  │ ◄── Base de datos
│ Hoja: Usuarios  │
└─────────────────┘
```

---

## 🔑 Componentes del Sistema

### 1. **Google Sheets (Base de Datos)**

**Ubicación:** `https://docs.google.com/spreadsheets/d/1fRSUwFLQ97PileszFIyZCdXkif6yk29R8u3qcgEG-Jw`

**Hoja: "Usuarios"**

Estructura de columnas:

| Columna | Nombre   | Descripción                                    | Ejemplo                                        |
|---------|----------|------------------------------------------------|------------------------------------------------|
| A       | usuario  | Nombre de usuario único                        | `prueba`                                       |
| B       | clave    | Hash SHA-256 de la contraseña                  | `8d969eef6ecad3c29a3a629280e686cf0c3f5d5...`  |
| C       | rol      | Rol del usuario (admin, usuario, etc.)         | `admin`                                        |
| D       | activo   | Estado del usuario (SI o NO)                   | `SI`                                           |

**Fila 1:** Encabezados  
**Fila 2+:** Datos de usuarios

---

### 2. **Apps Script (Backend)**

**Archivo:** `Code.gs`

Este código se ejecuta en los servidores de Google y actúa como **backend** del sistema.

#### **Funciones principales:**

##### `doGet(e)`
- **Propósito:** Maneja peticiones GET al Web App.
- **Funcionamiento:**
  - Si recibe `usuario` y `password` por query params, valida y devuelve JSON.
  - Si no, devuelve la página HTML básica del endpoint.

##### `doPost(e)`
- **Propósito:** Maneja peticiones POST (el login real).
- **Funcionamiento:**
  1. Recibe `usuario` y `password` desde el body (puede ser form-urlencoded o JSON).
  2. Valida que no estén vacíos.
  3. Llama a `verificarLogin()`.
  4. Devuelve el resultado en formato JSON.

##### `verificarLogin(usuario, password)`
- **Propósito:** Valida las credenciales contra Google Sheets.
- **Flujo:**
  1. Conecta con el Spreadsheet usando el `SPREADSHEET_ID`.
  2. Obtiene la hoja `"Usuarios"`.
  3. Lee todos los datos de la hoja.
  4. Hashea la contraseña ingresada con SHA-256.
  5. Recorre las filas buscando coincidencia de usuario y hash.
  6. Si encuentra:
     - Verifica que `activo = "SI"`.
     - Si está activo: devuelve `success: true` con el rol.
     - Si está inactivo: devuelve `success: false`.
  7. Si no encuentra: devuelve `success: false` con mensaje de error.

##### `hashString(str)`
- **Propósito:** Convierte una contraseña en texto plano a hash SHA-256.
- **Uso:** Se ejecuta tanto al validar como al generar hashes nuevos.
- **Algoritmo:** Usa `Utilities.computeDigest()` de Google Apps Script.

##### `generarHashClave(plain)`
- **Propósito:** Utilidad para generar el hash de una clave desde el editor de Apps Script.
- **Uso:** Ejecutar manualmente cuando necesitas agregar un nuevo usuario.

##### `jsonResponse_(obj)`
- **Propósito:** Crea una respuesta HTTP con formato JSON.
- **Nota:** No incluye CORS headers porque causaban error en Apps Script.

---

### 3. **Vercel Proxy (Servidor Intermedio)**

**Archivo:** `api/login.js`

**¿Por qué existe?**

Apps Script tiene un problema: **CORS bloqueado** cuando se llama directamente desde un navegador en otro dominio. La solución es usar un **proxy** en Vercel.

**Funcionamiento:**

1. Recibe petición POST desde el navegador con `{ usuario, password }`.
2. Convierte los datos a formato `application/x-www-form-urlencoded`.
3. Hace un `fetch` al Web App de Apps Script.
4. Recibe la respuesta (JSON).
5. Devuelve el JSON al navegador.

**Ventajas:**
- El navegador nunca toca Apps Script directamente (sin CORS).
- Vercel está en el mismo dominio que el frontend (sin problemas de CORS).

---

### 4. **Frontend (Páginas Web)**

#### **index.html** - Página de Login

**Elementos:**
- Formulario con campos `usuario` y `password`.
- Botón "Ingresar".
- Área de mensajes (éxito/error).
- Loader mientras valida.

**Flujo:**
1. Usuario ingresa credenciales.
2. Click en "Ingresar" → llama a `handleLogin()`.
3. `handleLogin()` hace POST a `/api/login`.
4. Si `success: true`:
   - El servidor crea una cookie `HttpOnly` con un JWT.
   - Redirige a `agenda.html`.
5. Si `success: false`:
   - Muestra mensaje de error.

#### **script.js** - Lógica del Login

```javascript
// 1. Define la URL del API local (Vercel)
const API_URL = '/api/login';

// 2. Función que maneja el envío del formulario
function handleLogin(e) {
  e.preventDefault(); // No recargar la página
  
  // 3. Obtiene los valores del formulario
  const user = document.getElementById('usuario').value;
  const pass = document.getElementById('password').value;
  
  // 4. Hace fetch al API
  fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usuario: user, password: pass })
  })
  .then(res => res.json())
  .then(response => {
    if (response.success) {
         // 5. Redirige a la agenda
      window.location.href = 'agenda.html';
    } else {
      // 7. Muestra error
      msgDiv.textContent = response.message;
    }
  });
}
```

#### **agenda.html** - Agenda de Turnos

**Características:**
- Muestra un calendario mensual visual.
- Protegido: verifica `localStorage` al cargar.
- Muestra el nombre del usuario logueado.
- Botón de cerrar sesión que limpia `localStorage`.

**Protección:**
```javascript
window.onload = function() {
   fetch('/api/session')
      .then(res => res.json())
      .then(data => {
         if (!data.success || !data.usuario) {
            window.location.href = 'index.html'; // Redirige al login
            return;
         }
         document.getElementById('userName').textContent = data.usuario;
      })
      .catch(() => {
         window.location.href = 'index.html';
      });
};
```

---

## 🔐 Sistema de Hash SHA-256

### ¿Por qué usar hash?

Las contraseñas **nunca** se guardan en texto plano por seguridad. Se usa **SHA-256**, un algoritmo que convierte cualquier texto en un código de 64 caracteres hexadecimales.

**Ejemplo:**
- Contraseña: `123456`
- Hash: `8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92`

**Características:**
- **Irreversible:** No se puede obtener la contraseña original del hash.
- **Única:** Cada contraseña genera un hash diferente.
- **Consistente:** La misma contraseña siempre genera el mismo hash.

### Cómo generar un hash para un nuevo usuario

**Opción 1: Desde Apps Script**
1. Abre el editor de Apps Script.
2. En el selector de funciones, elige `generarHashClave`.
3. Click en "Ejecutar" (no te preocupes por el parámetro).
4. Cambia esta línea en el código temporalmente:
   ```javascript
   const CLAVE = 'la_nueva_contraseña';
   const hash = hashString(CLAVE);
   Logger.log('Hash: ' + hash);
   ```
5. Ejecuta y ve a **Ver → Registros** para copiar el hash.

**Opción 2: Online**
- Usa https://emn178.github.io/online-tools/sha256.html
- Pega la contraseña, copia el hash resultante.

---

## 🌐 Flujo Completo de Login

### Paso a paso detallado:

```
1. Usuario abre: https://estetica-plum.vercel.app
   └─> Carga index.html

2. Usuario ingresa:
   - Usuario: "prueba"
   - Contraseña: "123456"
   - Click en "Ingresar"

3. JavaScript ejecuta handleLogin():
   └─> fetch('https://estetica-plum.vercel.app/api/login', {
         method: 'POST',
         body: JSON.stringify({ usuario: 'prueba', password: '123456' })
       })

4. Vercel recibe la petición en api/login.js:
   └─> Convierte JSON a form-urlencoded:
       usuario=prueba&password=123456
   └─> fetch('https://script.google.com/macros/s/XXXX/exec', {
         method: 'POST',
         body: 'usuario=prueba&password=123456'
       })

5. Apps Script recibe en doPost(e):
   └─> Lee: e.parameter.usuario = "prueba"
   └─> Lee: e.parameter.password = "123456"
   └─> Llama: verificarLogin("prueba", "123456")

6. verificarLogin() ejecuta:
   └─> Conecta a Google Sheets (ID: 1fRSUwFLQ97PileszFIyZCdXkif6yk29R8u3qcgEG-Jw)
   └─> Lee hoja "Usuarios"
   └─> Hashea "123456" → 8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92
   └─> Busca en la hoja:
       - Fila 2: usuario="prueba", clave="8d969eef...", activo="SI"
       - ¡Coincide!
   └─> Devuelve: { success: true, message: "Acceso concedido", role: "admin" }

7. Apps Script devuelve JSON a Vercel:
   └─> {"success":true,"message":"Acceso concedido","role":"admin"}

8. Vercel crea un JWT y lo guarda en cookie HttpOnly:
   └─> Set-Cookie: session=...; HttpOnly; Secure; SameSite=Strict

9. Vercel devuelve JSON al navegador:
   └─> script.js recibe el JSON

10. script.js procesa la respuesta:
    └─> window.location.href = 'agenda.html'

11. Navegador carga agenda.html:
    └─> window.onload llama /api/session
    └─> Si el JWT es valido, muestra el usuario ✓
```

---

## ⚙️ Configuración del Sistema

### 1. Google Sheets

1. Crea una hoja llamada **"Usuarios"** (exactamente así, con U mayúscula).
2. En la fila 1 pon los encabezados: `usuario | clave | rol | activo`
3. Agrega usuarios en las filas siguientes con el hash de la contraseña.

### 2. Apps Script

1. Abre https://script.google.com
2. Crea un nuevo proyecto.
3. Pega el contenido de `Code.gs`.
4. Ajusta `SPREADSHEET_ID` con el ID de tu hoja.
5. Crea un archivo HTML llamado `Index` (vacío o con mensaje básico).
6. **Implementar → Nueva implementación**:
   - Tipo: **Aplicación web**
   - Ejecutar como: **Yo**
   - Acceso: **Cualquiera**
7. Copia la URL del Web App (termina en `/exec`).

### 3. Vercel

1. En `api/login.js`, pega la URL del Web App en `WEB_APP_URL`.
2. Configura la variable de entorno `JWT_SECRET` en Vercel (un string largo y secreto).
3. Estructura de archivos en Vercel:
   ```
   /
   ├── index.html
   ├── agenda.html
   ├── script.js
   ├── style.css
   └── api/
       └── login.js
   ```
4. Deploy en Vercel.

---

## 🔧 Solución de Problemas

### Error: "Respuesta inválida del servidor"

**Causa:** Apps Script devuelve HTML en lugar de JSON.

**Solución:**
1. Verifica que `Code.gs` esté guardado correctamente.
2. Crea una **nueva implementación** del Web App.
3. Actualiza la URL en `api/login.js`.
4. Redeploy en Vercel.

### Error: "Usuario o contraseña incorrectos" (pero son correctos)

**Causas posibles:**
1. El hash en la hoja no coincide con la contraseña.
   - **Solución:** Genera el hash de nuevo y verifica que sea exacto.
2. El campo `activo` no dice exactamente "SI" (mayúsculas).
   - **Solución:** Cambia a "SI" en mayúsculas.
3. La hoja no se llama exactamente "Usuarios".
   - **Solución:** Renombra la hoja con U mayúscula.

### La agenda no carga después del login

**Causa:** `localStorage` no se guardó o la sesión expiró.

**Solución:**
1. Abre la consola del navegador (F12).
2. Ve a Application → Local Storage.
3. Verifica que existan `usuario` y `rol`.

---

## 📊 Ejemplo de Datos en Google Sheets

```
| usuario | clave                                                           | rol    | activo |
|---------|----------------------------------------------------------------|--------|--------|
| admin   | 8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918 | admin  | SI     |
| prueba  | 8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92 | usuario| SI     |
| test    | 9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08 | usuario| NO     |
```

**Contraseñas correspondientes:**
- `admin` → contraseña: `admin`
- `prueba` → contraseña: `123456`
- `test` → contraseña: `test` (inactivo, no puede loguearse)

---

## 🚀 URLs del Sistema

| Componente        | URL                                                                                                 |
|-------------------|-----------------------------------------------------------------------------------------------------|
| Google Sheet      | https://docs.google.com/spreadsheets/d/1fRSUwFLQ97PileszFIyZCdXkif6yk29R8u3qcgEG-Jw/edit          |
| Apps Script       | https://script.google.com (proyecto privado)                                                        |
| Web App (actual)  | https://script.google.com/macros/s/AKfycbzIas_E1TLMF2-rorXdRIW4YnYdHnGA09Uwd2K3FAOo7Odjpk_ZDZBkeGgIww9wKwLC/exec |
| Vercel (frontend) | https://estetica-plum.vercel.app                                                                    |

---

## 📝 Próximas Funcionalidades (Propuestas)

1. **Registro de nuevos usuarios** desde la web.
2. **Cambio de contraseña** por parte del usuario.
3. **Agenda funcional** con creación, edición y eliminación de turnos.
4. **Notificaciones** por email de turnos confirmados.
5. **Panel de administración** para gestionar usuarios.

---

## 🔐 Seguridad

**Implementado:**
- ✅ Contraseñas hasheadas (SHA-256).
- ✅ Validación en servidor (Apps Script).
- ✅ Sesión con JWT en cookie HttpOnly.

**Recomendaciones futuras:**
- 🔄 Usar tokens JWT en lugar de localStorage.
- 🔄 Agregar límite de intentos de login.
- 🔄 Registro de auditoría (quién accedió y cuándo).
- 🔄 HTTPS obligatorio (ya lo tienes con Vercel).

---

## 📧 Contacto

Si tienes dudas sobre el funcionamiento del sistema, revisa este documento o consulta los comentarios en el código.

**Archivos principales:**
- `Code.gs` - Backend en Apps Script
- `script.js` - Lógica del frontend
- `api/login.js` - Proxy en Vercel
- `README.md` - Este documento

---

**Última actualización:** 23 de febrero de 2026
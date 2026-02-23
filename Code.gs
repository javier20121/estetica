// Opcional: pega aqui el ID de tu Google Sheet si el script NO esta ligado.
// Si lo dejas vacio, se usara el spreadsheet actual (script ligado).
const SPREADSHEET_ID = '1fRSUwFLQ97PileszFIyZCdXkif6yk29R8u3qcgEG-Jw';

/**
 * Sirve el archivo HTML cuando se accede a la Web App.
 */
function doGet(e) {
  const user = e && e.parameter ? e.parameter.usuario : '';
  const pass = e && e.parameter ? e.parameter.password : '';

  if (user && pass) {
    const result = verificarLogin(user, pass);
    return jsonResponse_(result);
  }

  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Login Sistema')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Endpoint para validar login desde una pagina externa.
 * Espera POST con usuario y password (x-www-form-urlencoded).
 */
function doPost(e) {
  try {
    const user = e && e.parameter ? e.parameter.usuario : '';
    const pass = e && e.parameter ? e.parameter.password : '';
    const result = verificarLogin(user, pass);
    return jsonResponse_(result);
  } catch (err) {
    return jsonResponse_({ success: false, message: 'Error en el servidor.' });
  }
}

/**
 * Respuesta JSON con cabeceras CORS basicas.
 */
function jsonResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader('Access-Control-Allow-Origin', '*')
    .setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

/**
 * Obtiene el spreadsheet segun configuracion.
 */
function getSpreadsheet_() {
  if (SPREADSHEET_ID) {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

/**
 * Verifica las credenciales del usuario contra la hoja de cálculo.
 * Hoja: "Usuarios" con columnas:
 * A: usuario, B: clave (hash SHA-256), C: rol, D: activo (SI/NO)
 * 
 * @param {string} usuario - El nombre de usuario ingresado.
 * @param {string} password - La contraseña en texto plano.
 * @return {Object} Resultado del login {success: boolean, message: string, role: string|null}
 */
function verificarLogin(usuario, password) {
  try {
    const ss = getSpreadsheet_();
    const sheet = ss.getSheetByName("Usuarios");
    
    if (!sheet) {
      return { success: false, message: "Error: No se encuentra la hoja de base de datos." };
    }

    // Obtener todos los datos (asumiendo que la fila 1 son encabezados)
    const data = sheet.getDataRange().getValues();
    
    // Hashear la contraseña ingresada para compararla
    const passwordHash = hashString(password);
    const userInput = String(usuario).trim();

    // Iterar desde la fila 1 (saltando encabezados en índice 0)
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const dbUser = String(row[0]).trim(); // Columna A
      const dbPass = row[1];               // Columna B
      const dbRole = row[2];               // Columna C
      const dbActive = String(row[3]).trim().toUpperCase(); // Columna D

      // Comparación estricta
      if (dbUser === userInput && dbPass === passwordHash) {
        if (dbActive === "SI") {
          return { 
            success: true, 
            message: "Acceso concedido", 
            role: dbRole 
          };
        } else {
          return { success: false, message: "Acceso denegado: Usuario inactivo." };
        }
      }
    }

    return { success: false, message: "Usuario o contraseña incorrectos." };

  } catch (e) {
    Logger.log(e);
    return { success: false, message: "Error en el servidor." };
  }
}

/**
 * Función auxiliar para hashear un string con SHA-256.
 * Convierte el array de bytes de Google a string Hexadecimal.
 */
function hashString(str) {
  const rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, str);
  let txtHash = '';
  for (let i = 0; i < rawHash.length; i++) {
    let hashVal = rawHash[i];
    if (hashVal < 0) {
      hashVal += 256;
    }
    if (hashVal.toString(16).length === 1) {
      txtHash += '0';
    }
    txtHash += hashVal.toString(16);
  }
  return txtHash;
}

/**
 * Utilidad: genera el hash SHA-256 para una clave en texto plano.
 * Ejecuta desde el editor de Apps Script para cargar usuarios.
 */
function generarHashClave(plain) {
  if (plain === null || plain === undefined || String(plain).trim() === '') {
    throw new Error('La clave no puede ser vacia. Usa generarHashClavePrompt o pasa un valor.');
  }
  return hashString(String(plain));
}

/**
 * Pide la clave por un cuadro de dialogo y muestra el hash.
 * Funciona si el script esta ligado a un Sheet.
 */
function generarHashClavePrompt() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt('Generar hash', 'Ingresa la clave a hashear:', ui.ButtonSet.OK_CANCEL);
  if (response.getSelectedButton() !== ui.Button.OK) {
    return;
  }
  const plain = response.getResponseText();
  const hash = hashString(plain);
  ui.alert('Hash generado (SHA-256):\n' + hash);
}
// Opcional: pega aqui el ID de tu Google Sheet si el script NO esta ligado.
// Si lo dejas vacio, se usara el spreadsheet actual (script ligado).
const SPREADSHEET_ID = '1fRSUwFLQ97PileszFIyZCdXkif6yk29R8u3qcgEG-Jw';
const SHEET_USERS = 'Usuarios';
const SHEET_CLIENTES = 'Clientes';
const SHEET_MEMBRESIAS = 'Membresias';
const SHEET_SERVICIOS = 'Servicios';
const SHEET_HORARIOS = 'Horarios';
const SHEET_TURNOS = 'Turnos';
const SLOT_MINUTES = 60;

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
    let payload = null;
    let user = e && e.parameter ? e.parameter.usuario : '';
    let pass = e && e.parameter ? e.parameter.password : '';
    let action = e && e.parameter ? e.parameter.action : '';

    // Si llega JSON, leer desde postData
    if ((!user || !pass) && e && e.postData && e.postData.contents) {
      const contentType = String(e.postData.type || '').toLowerCase();
      if (contentType.indexOf('application/json') !== -1) {
        try {
          payload = JSON.parse(e.postData.contents);
          user = payload.usuario || user;
          pass = payload.password || pass;
          action = payload.action || action;
        } catch (err) {
          // ignore JSON parse errors
        }
      }
    }

    if (action && action !== 'login') {
      const result = handleAction_(action, payload, e);
      return jsonResponse_(result);
    }

    if (!user || !pass) {
      return jsonResponse_({ success: false, message: 'Faltan credenciales.' });
    }
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
    .setMimeType(ContentService.MimeType.JSON);
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
    if (!usuario || !password) {
      return { success: false, message: 'Faltan credenciales.' };
    }
    const ss = getSpreadsheet_();
    const sheet = ss.getSheetByName(SHEET_USERS);
    
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
  if (str === null || str === undefined) {
    return '';
  }
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

function handleAction_(action, payload, e) {
  const normalized = String(action || '').trim().toLowerCase();
  const usuario = String(getParam_(payload, e, 'usuario', '')).trim();

  if (!usuario) {
    return { success: false, message: 'Usuario requerido.' };
  }

  if (normalized === 'servicios') {
    return listarServicios_();
  }

  if (normalized === 'perfil') {
    return obtenerPerfil_(usuario);
  }

  if (normalized === 'disponibilidad') {
    const fecha = String(getParam_(payload, e, 'fecha', '')).trim();
    return obtenerDisponibilidad_(usuario, fecha);
  }

  if (normalized === 'reservar') {
    const fecha = String(getParam_(payload, e, 'fecha', '')).trim();
    const hora = String(getParam_(payload, e, 'hora', '')).trim();
    const servicioId = String(getParam_(payload, e, 'servicioId', '')).trim();
    return reservarTurno_(usuario, fecha, hora, servicioId);
  }

  if (normalized === 'mis-turnos') {
    return listarMisTurnos_(usuario);
  }

  return { success: false, message: 'Accion no valida.' };
}

function getParam_(payload, e, key, fallback) {
  if (payload && payload[key] !== undefined && payload[key] !== null) {
    return payload[key];
  }
  if (e && e.parameter && e.parameter[key] !== undefined) {
    return e.parameter[key];
  }
  return fallback;
}

function listarServicios_() {
  const sheet = getSpreadsheet_().getSheetByName(SHEET_SERVICIOS);
  if (!sheet) {
    return { success: false, message: 'No existe la hoja Servicios.' };
  }

  const data = sheet.getDataRange().getValues();
  const items = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const activo = String(row[4] || 'SI').trim().toUpperCase();
    if (activo !== 'SI') {
      continue;
    }
    items.push({
      id: String(row[0] || ''),
      nombre: String(row[1] || ''),
      duracionHoras: Number(row[2] || 0),
      descripcion: String(row[3] || '')
    });
  }

  return { success: true, servicios: items };
}

function obtenerPerfil_(usuario) {
  const cliente = buscarCliente_(usuario);
  if (!cliente) {
    return { success: false, message: 'Cliente no encontrado.' };
  }

  const membresia = buscarMembresia_(cliente.membresiaId);
  if (!membresia) {
    return { success: false, message: 'Membresia no encontrada.' };
  }

  const horasRestantes = Math.max(0, membresia.horasTotal - cliente.horasUsadas);
  return {
    success: true,
    usuario: cliente.usuario,
    nombre: cliente.nombre,
    membresia: membresia.nombre,
    horasTotal: membresia.horasTotal,
    horasUsadas: cliente.horasUsadas,
    horasRestantes: horasRestantes
  };
}

function obtenerDisponibilidad_(usuario, fecha) {
  if (!fecha) {
    return { success: false, message: 'Fecha requerida.' };
  }

  const perfil = obtenerPerfil_(usuario);
  if (!perfil.success) {
    return perfil;
  }

  if (perfil.horasRestantes <= 0) {
    return {
      success: true,
      horasRestantes: perfil.horasRestantes,
      slots: [],
      message: 'No tienes horas disponibles.'
    };
  }

  const slots = obtenerSlotsDisponibles_(fecha);
  return {
    success: true,
    horasRestantes: perfil.horasRestantes,
    slots: slots
  };
}

function reservarTurno_(usuario, fecha, hora, servicioId) {
  if (!fecha || !hora || !servicioId) {
    return { success: false, message: 'Datos incompletos para reservar.' };
  }

  const perfil = obtenerPerfil_(usuario);
  if (!perfil.success) {
    return perfil;
  }

  const servicio = buscarServicio_(servicioId);
  if (!servicio) {
    return { success: false, message: 'Servicio no valido.' };
  }

  const duracionHoras = Number(servicio.duracionHoras || 0);
  if (duracionHoras <= 0) {
    return { success: false, message: 'Duracion del servicio invalida.' };
  }

  if (perfil.horasRestantes < duracionHoras) {
    return { success: false, message: 'No tienes horas suficientes.' };
  }

  const slotsDisponibles = obtenerSlotsDisponibles_(fecha);
  const slotSet = construirSet_(slotsDisponibles);
  const requiredSlots = calcularSlotsRequeridos_(hora, duracionHoras);

  for (let i = 0; i < requiredSlots.length; i++) {
    if (!slotSet[requiredSlots[i]]) {
      return { success: false, message: 'Horario no disponible.' };
    }
  }

  const ss = getSpreadsheet_();
  const sheetTurnos = ss.getSheetByName(SHEET_TURNOS);
  if (!sheetTurnos) {
    return { success: false, message: 'No existe la hoja Turnos.' };
  }

  const nuevoId = Utilities.getUuid();
  const creadoEn = new Date();

  sheetTurnos.appendRow([
    nuevoId,
    usuario,
    fecha,
    hora,
    servicio.id,
    servicio.nombre,
    duracionHoras,
    duracionHoras,
    'pendiente',
    creadoEn
  ]);

  actualizarHorasCliente_(usuario, duracionHoras);

  return {
    success: true,
    message: 'Turno reservado.',
    turnoId: nuevoId
  };
}

function listarMisTurnos_(usuario) {
  const sheet = getSpreadsheet_().getSheetByName(SHEET_TURNOS);
  if (!sheet) {
    return { success: false, message: 'No existe la hoja Turnos.' };
  }

  const data = sheet.getDataRange().getValues();
  const turnos = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (String(row[1] || '').trim() !== usuario) {
      continue;
    }
    turnos.push({
      id: String(row[0] || ''),
      fecha: String(row[2] || ''),
      hora: String(row[3] || ''),
      servicio: String(row[5] || ''),
      horas: Number(row[7] || 0),
      estado: String(row[8] || '')
    });
  }

  return { success: true, turnos: turnos };
}

function obtenerSlotsDisponibles_(fecha) {
  const dayName = obtenerDiaSemana_(fecha);
  if (!dayName) {
    return [];
  }

  const horarios = obtenerHorariosDia_(dayName);
  const slots = [];

  horarios.forEach((h) => {
    const start = timeToMinutes_(h.inicio);
    const end = timeToMinutes_(h.fin);
    for (let t = start; t + SLOT_MINUTES <= end; t += SLOT_MINUTES) {
      slots.push(minutesToTime_(t));
    }
  });

  const ocupados = obtenerTurnosOcupados_(fecha);
  return slots.filter((slot) => !ocupados[slot]);
}

function obtenerHorariosDia_(dia) {
  const sheet = getSpreadsheet_().getSheetByName(SHEET_HORARIOS);
  if (!sheet) {
    return [];
  }

  const data = sheet.getDataRange().getValues();
  const items = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const activo = String(row[4] || 'SI').trim().toUpperCase();
    if (activo !== 'SI') {
      continue;
    }
    if (String(row[0] || '').trim().toLowerCase() !== dia.toLowerCase()) {
      continue;
    }
    items.push({
      inicio: String(row[1] || ''),
      fin: String(row[2] || ''),
      tipo: String(row[3] || '')
    });
  }
  return items;
}

function obtenerTurnosOcupados_(fecha) {
  const sheet = getSpreadsheet_().getSheetByName(SHEET_TURNOS);
  if (!sheet) {
    return {};
  }

  const data = sheet.getDataRange().getValues();
  const ocupados = {};
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (String(row[2] || '') !== fecha) {
      continue;
    }
    const estado = String(row[8] || '').trim().toLowerCase();
    if (estado === 'cancelado') {
      continue;
    }
    const hora = String(row[3] || '').trim();
    if (hora) {
      ocupados[hora] = true;
    }
  }
  return ocupados;
}

function buscarServicio_(servicioId) {
  const sheet = getSpreadsheet_().getSheetByName(SHEET_SERVICIOS);
  if (!sheet) {
    return null;
  }
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (String(row[0] || '').trim() === servicioId) {
      return {
        id: String(row[0] || ''),
        nombre: String(row[1] || ''),
        duracionHoras: Number(row[2] || 0),
        descripcion: String(row[3] || '')
      };
    }
  }
  return null;
}

function buscarCliente_(usuario) {
  const sheet = getSpreadsheet_().getSheetByName(SHEET_CLIENTES);
  if (!sheet) {
    return null;
  }
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (String(row[0] || '').trim() === usuario) {
      return {
        rowIndex: i + 1,
        usuario: String(row[0] || ''),
        nombre: String(row[1] || ''),
        telefono: String(row[2] || ''),
        membresiaId: String(row[3] || ''),
        horasUsadas: Number(row[4] || 0),
        activo: String(row[5] || 'SI')
      };
    }
  }
  return null;
}

function buscarMembresia_(membresiaId) {
  const sheet = getSpreadsheet_().getSheetByName(SHEET_MEMBRESIAS);
  if (!sheet) {
    return null;
  }
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (String(row[0] || '').trim() === membresiaId) {
      const activo = String(row[3] || 'SI').trim().toUpperCase();
      if (activo !== 'SI') {
        return null;
      }
      return {
        id: String(row[0] || ''),
        nombre: String(row[1] || ''),
        horasTotal: Number(row[2] || 0)
      };
    }
  }
  return null;
}

function actualizarHorasCliente_(usuario, horasExtra) {
  const sheet = getSpreadsheet_().getSheetByName(SHEET_CLIENTES);
  if (!sheet) {
    return;
  }

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (String(row[0] || '').trim() === usuario) {
      const current = Number(row[4] || 0);
      sheet.getRange(i + 1, 5).setValue(current + horasExtra);
      return;
    }
  }
}

function obtenerDiaSemana_(fecha) {
  try {
    const parts = fecha.split('-');
    if (parts.length !== 3) {
      return '';
    }
    const year = Number(parts[0]);
    const month = Number(parts[1]) - 1;
    const day = Number(parts[2]);
    const date = new Date(year, month, day);
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
    return dias[date.getDay()];
  } catch (err) {
    return '';
  }
}

function timeToMinutes_(time) {
  const parts = String(time || '').split(':');
  if (parts.length !== 2) {
    return 0;
  }
  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);
  return hours * 60 + minutes;
}

function minutesToTime_(minutes) {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return String(hrs).padStart(2, '0') + ':' + String(mins).padStart(2, '0');
}

function construirSet_(items) {
  const set = {};
  items.forEach((item) => {
    set[item] = true;
  });
  return set;
}

function calcularSlotsRequeridos_(hora, duracionHoras) {
  const start = timeToMinutes_(hora);
  const totalMinutes = Math.round(duracionHoras * 60);
  const slots = [];
  for (let t = start; t < start + totalMinutes; t += SLOT_MINUTES) {
    slots.push(minutesToTime_(t));
  }
  return slots;
}
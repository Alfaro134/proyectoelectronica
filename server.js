// EAI441 - Control de giro con sensor
// Opción 1: la página web y la API REST se sirven desde el mismo servidor.
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
// Clave opcional para que solo el Arduino pueda reportar lecturas.
const DEVICE_KEY = process.env.DEVICE_KEY || '';
// Si el dispositivo no reporta en este tiempo, se considera desconectado.
const DEVICE_TIMEOUT_MS = 5000;

const MODOS = ['manual', 'automatico'];
const ACCIONES = ['izquierda', 'derecha', 'detener'];

const estado = {
  modo: 'manual',
  motor: 'detener',
  distancia: null,
  ultimaLectura: null
};

// Reglas del modo automático según el enunciado.
function motorSegunDistancia(d) {
  if (d === null) return 'detener';
  if (d >= 10 && d <= 25) return 'derecha';
  if (d > 25 && d <= 40) return 'izquierda';
  return 'detener';
}

function respuestaEstado() {
  const conectado =
    estado.ultimaLectura !== null && Date.now() - estado.ultimaLectura < DEVICE_TIMEOUT_MS;
  return {
    modo: estado.modo,
    motor: estado.motor,
    distancia: estado.distancia,
    dispositivoConectado: conectado,
    ultimaLectura: estado.ultimaLectura ? new Date(estado.ultimaLectura).toISOString() : null
  };
}

app.use(express.json());
app.use((req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

// Estado completo del sistema (lo consulta la página web).
app.get('/api/estado', (req, res) => {
  res.json(respuestaEstado());
});

// Lectura actual del sensor ultrasónico.
app.get('/api/sensor', (req, res) => {
  const { distancia, ultimaLectura, dispositivoConectado } = respuestaEstado();
  res.json({ distancia, unidad: 'cm', ultimaLectura, dispositivoConectado });
});

// El dispositivo IoT reporta la distancia y recibe el comando que debe ejecutar.
app.post('/api/sensor', (req, res) => {
  if (DEVICE_KEY && req.get('X-API-Key') !== DEVICE_KEY) {
    return res.status(401).json({ error: 'Clave de dispositivo inválida' });
  }
  const d = Number(req.body && req.body.distancia);
  // Lecturas inválidas o fuera de rango del HC-SR04 se tratan como "sin objeto".
  estado.distancia = Number.isFinite(d) && d > 0 && d <= 400 ? Math.round(d * 10) / 10 : null;
  estado.ultimaLectura = Date.now();
  if (estado.modo === 'automatico') {
    estado.motor = motorSegunDistancia(estado.distancia);
  }
  res.json({ modo: estado.modo, motor: estado.motor });
});

// Comando de motor (solo válido en modo manual).
app.post('/api/motor', (req, res) => {
  const accion = req.body && req.body.accion;
  if (!ACCIONES.includes(accion)) {
    return res.status(400).json({ error: `Acción inválida. Use: ${ACCIONES.join(', ')}` });
  }
  if (estado.modo !== 'manual') {
    return res.status(409).json({ error: 'El motor está controlado por el sensor (modo automático)' });
  }
  estado.motor = accion;
  res.json(respuestaEstado());
});

// Cambio de modo de operación.
app.post('/api/modo', (req, res) => {
  const modo = req.body && req.body.modo;
  if (!MODOS.includes(modo)) {
    return res.status(400).json({ error: `Modo inválido. Use: ${MODOS.join(', ')}` });
  }
  estado.modo = modo;
  // Al cambiar de modo el motor arranca detenido o según el sensor.
  estado.motor = modo === 'automatico' ? motorSegunDistancia(estado.distancia) : 'detener';
  res.json(respuestaEstado());
});

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Endpoint no encontrado' });
});

app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});

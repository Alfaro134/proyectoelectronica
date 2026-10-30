// La API está en el mismo servidor que la página (Opción 1), por eso se usan rutas relativas.
const API = '/api';
const INTERVALO_MS = 500;
const DISTANCIA_MAX_BARRA = 50;

const TEXTO_MOTOR = {
  izquierda: { texto: 'Girando a la izquierda', icono: 'bi-arrow-counterclockwise' },
  derecha: { texto: 'Girando a la derecha', icono: 'bi-arrow-clockwise' },
  detener: { texto: 'Detenido', icono: 'bi-stop-circle' }
};

const el = {
  conexion: document.getElementById('conexion'),
  distancia: document.getElementById('distancia'),
  barra: document.getElementById('barra-distancia'),
  ultimaLectura: document.getElementById('ultima-lectura'),
  estadoMotor: document.getElementById('estado-motor'),
  avisoAuto: document.getElementById('aviso-auto'),
  botonesMotor: document.querySelectorAll('.btn-motor'),
  radiosModo: document.querySelectorAll('input[name="modo"]'),
  reglas: {
    derecha: document.getElementById('regla-derecha'),
    izquierda: document.getElementById('regla-izquierda'),
    detener: document.getElementById('regla-detener')
  },
  toast: document.getElementById('toast'),
  toastMsg: document.getElementById('toast-msg')
};

function mostrarError(msg) {
  el.toastMsg.textContent = msg;
  bootstrap.Toast.getOrCreateInstance(el.toast).show();
}

async function pedir(ruta, opciones = {}) {
  const res = await fetch(API + ruta, {
    headers: { 'Content-Type': 'application/json' },
    ...opciones
  });
  const datos = await res.json();
  if (!res.ok) throw new Error(datos.error || `Error ${res.status}`);
  return datos;
}

function render(estado) {
  // Conexión con el dispositivo IoT
  el.conexion.className = 'badge rounded-pill ' +
    (estado.dispositivoConectado ? 'text-bg-success' : 'text-bg-warning');
  el.conexion.innerHTML = estado.dispositivoConectado
    ? '<i class="bi bi-wifi"></i> Dispositivo conectado'
    : '<i class="bi bi-wifi-off"></i> Dispositivo desconectado';

  // Distancia
  const d = estado.distancia;
  el.distancia.textContent = d === null ? '---' : Math.round(d);
  el.barra.style.width = d === null ? '0%' : `${Math.min(d, DISTANCIA_MAX_BARRA) / DISTANCIA_MAX_BARRA * 100}%`;
  el.ultimaLectura.textContent = estado.ultimaLectura
    ? `Última lectura: ${new Date(estado.ultimaLectura).toLocaleTimeString()}`
    : 'Esperando lecturas del dispositivo…';

  // Motor
  const m = TEXTO_MOTOR[estado.motor] || TEXTO_MOTOR.detener;
  el.estadoMotor.className = `estado-motor ${estado.motor}`;
  el.estadoMotor.innerHTML = `<i class="bi ${m.icono}"></i> <span>${m.texto}</span>`;

  // Modo
  const automatico = estado.modo === 'automatico';
  el.radiosModo.forEach(r => { r.checked = r.value === estado.modo; });
  el.botonesMotor.forEach(b => { b.disabled = automatico; });
  el.avisoAuto.classList.toggle('d-none', !automatico);
  Object.entries(el.reglas).forEach(([accion, li]) => {
    li.classList.toggle('activa', automatico && estado.motor === accion);
  });
}

async function actualizar() {
  try {
    render(await pedir('/estado'));
  } catch {
    el.conexion.className = 'badge rounded-pill text-bg-danger';
    el.conexion.innerHTML = '<i class="bi bi-cloud-slash"></i> Sin conexión con la API';
  }
}

el.botonesMotor.forEach(boton => {
  boton.addEventListener('click', async () => {
    try {
      render(await pedir('/motor', {
        method: 'POST',
        body: JSON.stringify({ accion: boton.dataset.accion })
      }));
    } catch (e) {
      mostrarError(e.message);
    }
  });
});

el.radiosModo.forEach(radio => {
  radio.addEventListener('change', async () => {
    try {
      render(await pedir('/modo', {
        method: 'POST',
        body: JSON.stringify({ modo: radio.value })
      }));
    } catch (e) {
      mostrarError(e.message);
      actualizar();
    }
  });
});

actualizar();
setInterval(actualizar, INTERVALO_MS);

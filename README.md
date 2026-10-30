# Control de Giro con Sensor — EAI441

Proyecto de cátedra: control de un motor DC con Arduino UNO R4 WiFi, sensor ultrasónico HC-SR04 y shield L293D, gestionado desde una interfaz web a través de una API REST.

## Arquitectura (Opción 1)

La página web y la API REST se alojan **en el mismo servidor** (Node.js + Express). El código vive en este repositorio de GitHub y se despliega en una plataforma que ejecuta backend (Render). GitHub Pages no sirve para esta opción porque solo aloja archivos estáticos y no puede mantener viva la API.

```
Navegador ──HTTPS──► Servidor (Render)  ◄──HTTPS── Arduino UNO R4 WiFi ── HC-SR04 / L293D / Motor
                     ├─ /           página web (HTML, CSS, Bootstrap, JS)
                     └─ /api/...    API REST (JSON)
```

## Estructura

```
server.js            API REST + servidor de la página
public/index.html    Interfaz web (Bootstrap 5)
public/css/          Estilos
public/js/app.js     Consumo de la API en tiempo real
public/img/          Escudo del F.C. Barcelona y fotos de integrantes
render.yaml          Configuración de despliegue en Render
```

## API REST

| Método | Ruta          | Cuerpo (JSON)                                   | Uso                                   |
|--------|---------------|-------------------------------------------------|---------------------------------------|
| GET    | `/api/estado` | —                                               | Modo, motor, distancia y conexión     |
| GET    | `/api/sensor` | —                                               | Última lectura del sensor             |
| POST   | `/api/sensor` | `{ "distancia": 18.4 }`                         | El Arduino reporta la distancia       |
| POST   | `/api/motor`  | `{ "accion": "izquierda" \| "derecha" \| "detener" }` | Control manual del motor        |
| POST   | `/api/modo`   | `{ "modo": "manual" \| "automatico" }`          | Cambia el modo de operación           |

`POST /api/sensor` responde `{ "modo": "...", "motor": "..." }`: el Arduino ejecuta el valor de `motor` que recibe.

### Modo automático
- 10 – 25 cm → motor a la **derecha**
- 26 – 40 cm → motor a la **izquierda**
- Fuera de esos intervalos → motor **detenido**

### Modo manual
El motor responde solo a los botones de la página; el sensor sigue reportando lecturas.

### Seguridad (opcional)
Si se define la variable de entorno `DEVICE_KEY`, el Arduino debe enviar la cabecera `X-API-Key` con ese valor en `POST /api/sensor`.

## Ejecutar localmente

```bash
npm install
npm start
```

Abrir `http://localhost:3000`.

## Despliegue en Render

1. Entrar a <https://render.com> e iniciar sesión con GitHub.
2. **New → Blueprint** y seleccionar este repositorio (usa `render.yaml`).
3. Al terminar, Render entrega una URL `https://proyectoelectronica-xxxx.onrender.com` que sirve la página y la API.
4. Esa URL es la que se configura en el sketch del Arduino.

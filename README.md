# backend-api

API REST del Salón de Estudio Colaborativo en Tiempo Real. Expone los datos guardados en Firestore al frontend; el frontend nunca consulta Firestore directamente.

## Enlaces

- API en producción (Render): https://backend-api-aodp.onrender.com
- Documentación Swagger: https://backend-api-aodp.onrender.com/api/docs

## Requisitos

- Node.js 20 o superior
- Docker y Docker Compose
- Cuenta de Firebase con un proyecto que tenga Firestore, Authentication (correo y contraseña, y Google) y una clave de cuenta de servicio

## Variables de entorno

Copia `.env.example` a `.env` y completa los valores.

| Variable | Para qué sirve | Ejemplo |
|---|---|---|
| `PORT` | Puerto en el que escucha la API | `3000` |
| `CORS_ORIGINS` | Orígenes permitidos, separados por comas (sin espacios ni barra final) | `http://localhost:5173,https://tu-app.vercel.app` |
| `FIREBASE_SERVICE_ACCOUNT` | Ruta al archivo JSON de la cuenta de servicio (local) o el JSON completo (Render) | `./ruta/a/service-account.json` |
| `FIREBASE_KEY_PATH` | Ruta (genérica) al JSON de la cuenta de servicio, solo para docker compose | `C:/ruta/a/firebase-service-account.json` |

Nunca se sube la clave de servicio al repositorio.

## Cómo ejecutarlo

Con npm:

```bash
npm install
npm run dev      # desarrollo (tsx watch)
npm run build    # compila a dist/
npm start        # ejecuta node dist/index.js
```

Con Docker Compose:

```bash
docker compose up
```

## Endpoints

| Método | Ruta | Auth | Descripción | Respuestas |
|---|---|---|---|---|
| GET | `/api/health` | No | Estado del servicio | 200 `{"status":"ok"}` |
| GET | `/api/base` | No | Dato de la base técnica guardado en Firestore | 200 `{"mensaje":"...","actualizado":"..."}`, 404 `BASE_NOT_FOUND`, 503 `FIRESTORE_UNAVAILABLE`, 500 `INTERNAL_ERROR` |
| GET | `/api/docs` | No | Documentación Swagger | 200 |
| POST | `/api/auth/registro` | No | Crea la cuenta y el perfil | 201, 400 `VALIDATION_ERROR` / `INVALID_JSON`, 409 `USERNAME_TAKEN` / `EMAIL_TAKEN`, 503 |
| POST | `/api/usuarios/perfil` | Sí | Crea el perfil de quien ingresó con Google | 201, 400, 401 `UNAUTHORIZED`, 409 `PROFILE_EXISTS` / `USERNAME_TAKEN` |
| GET | `/api/usuarios/yo` | Sí | Devuelve el perfil propio | 200, 401, 404 `PROFILE_NOT_FOUND` |
| PATCH | `/api/usuarios/yo` | Sí | Edita nombres, apellidos, username o avatar | 200, 400, 401, 404, 409 `USERNAME_TAKEN` |
| DELETE | `/api/usuarios/yo` | Sí | Elimina la cuenta y el perfil | 204, 401 |

Formato de error:

```json
{ "error": { "code": "BASE_NOT_FOUND", "message": "..." } }
```

En los errores de validación se agrega `campos` con el detalle por campo. Una ruta inexistente responde 404 `ROUTE_NOT_FOUND`.

## Autenticación (TS-01)

El inicio de sesión lo hace el cliente con Firebase Authentication (correo y contraseña, o Google). La API solo verifica el ID token que llega en `Authorization: Bearer <token>`; si falta o es inválido responde `401 UNAUTHORIZED`. Las rutas con «Sí» en la columna Auth lo exigen.

El nombre de usuario es único (3 a 20 caracteres: letras, números o guion bajo) y se valida en el servidor con una transacción de Firestore: el perfil vive en la colección `usuarios` (id = uid) y el nombre reservado en `usernames`. Si el registro falla al crear el perfil, la cuenta recién creada se elimina. El detalle de cada ruta está en Swagger (`/api/docs`).

## Despliegue

Se despliega en Render como Web Service con entorno Docker, desde la rama `main`. Las variables de entorno se cargan en el panel de Render (en `FIREBASE_SERVICE_ACCOUNT` va el JSON completo). Ruta de verificación: `/api/health`.

## Problemas comunes

- **La primera petición tarda hasta un minuto:** el plan gratuito de Render duerme el servicio tras un periodo de inactividad. Espera a que despierte.
- **Error de CORS en el navegador:** revisa que el dominio del frontend esté en `CORS_ORIGINS`.
- **503 `FIRESTORE_UNAVAILABLE`:** revisa `FIREBASE_SERVICE_ACCOUNT` y que Firestore esté disponible.
- **401 `UNAUTHORIZED` en una ruta privada:** falta el encabezado `Authorization: Bearer <token>` o el token venció (dura 1 hora).
# backend-api

API REST del Salón de Estudio Colaborativo en Tiempo Real. Expone los datos guardados en Firestore al frontend; el frontend nunca consulta Firestore directamente.

## Enlaces

- API en producción (Render): <URL_DE_RENDER>
- Documentación Swagger: <URL_DE_RENDER>/api/docs

## Requisitos

- Node.js 20 o superior
- Docker y Docker Compose
- Cuenta de Firebase con un proyecto que tenga Firestore y una clave de cuenta de servicio

## Variables de entorno

Copia `.env.example` a `.env` y completa los valores.

| Variable | Para qué sirve | Ejemplo |
|---|---|---|
| `PORT` | Puerto en el que escucha la API | `3000` |
| `CORS_ORIGINS` | Orígenes permitidos, separados por comas | `http://localhost:5173,https://tu-app.vercel.app` |
| `FIREBASE_SERVICE_ACCOUNT` | Ruta al archivo JSON de la cuenta de servicio (local) o el JSON completo (Render) | `./ruta/a/service-account.json` |
| `FIREBASE_KEY_PATH` | Ruta (generica) al JSON de la cuenta de servicio, solo para docker compose | `C:/ruta/a/firebase-service-account.json` |

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

| Método | Ruta | Descripción | Respuestas |
|---|---|---|---|
| GET | `/api/health` | Estado del servicio | 200 `{"status":"ok"}` |
| GET | `/api/base` | Dato de la base técnica guardado en Firestore | 200 `{"mensaje":"...","actualizado":"..."}`, 404 `BASE_NOT_FOUND`, 503 `FIRESTORE_UNAVAILABLE`, 500 `INTERNAL_ERROR` |
| GET | `/api/docs` | Documentación Swagger | 200 |

Formato de error:

```json
{ "error": { "code": "BASE_NOT_FOUND", "message": "..." } }
```

Una ruta inexistente responde 404 `ROUTE_NOT_FOUND`.

## Despliegue

Se despliega en Render como Web Service con entorno Docker, desde la rama `main`. Las variables de entorno se cargan en el panel de Render (en `FIREBASE_SERVICE_ACCOUNT` va el JSON completo). Ruta de verificación: `/api/health`.

## Problemas comunes

- **La primera petición tarda hasta un minuto:** el plan gratuito de Render duerme el servicio tras un periodo de inactividad. Espera a que despierte.
- **Error de CORS en el navegador:** revisa que el dominio del frontend esté en `CORS_ORIGINS`.
- **503 `FIRESTORE_UNAVAILABLE`:** revisa `FIREBASE_SERVICE_ACCOUNT` y que Firestore esté disponible.

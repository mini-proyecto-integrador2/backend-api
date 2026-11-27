// Endpoints de salas (US-06). Se combinan con openApiSpec en app.ts.
const errorRef = { $ref: "#/components/schemas/Error" };
const resp = (descripcion: string) => ({
  description: descripcion,
  content: { "application/json": { schema: errorRef } },
});
const seguridad = [{ bearerAuth: [] }];
const salaOk = (descripcion: string) => ({
  description: descripcion,
  content: {
    "application/json": {
      schema: { type: "object", properties: { sala: { $ref: "#/components/schemas/Sala" } } },
    },
  },
});

export const esquemasSalas = {
  Sala: {
    type: "object",
    properties: {
      id: { type: "string", example: "MAT-4821", description: "3 letras y 4 números. Único." },
      nombre: { type: "string", example: "Cálculo multivariado" },
      anfitrion: {
        type: "object",
        properties: {
          uid: { type: "string", example: "k3J9...uid" },
          username: { type: "string", example: "camila_rojas" },
        },
      },
      creada: { type: "string", format: "date-time" },
      esCreador: { type: "boolean", example: true, description: "true si quien consulta es el anfitrión de la sala. Sirve para mostrar u ocultar editar y eliminar." },
    },
  },
  CrearSalaRequest: {
    type: "object",
    required: ["nombre"],
    properties: {
      nombre: { type: "string", example: "Cálculo multivariado", description: "Entre 3 y 40 caracteres." },
    },
  },

  EditarSalaRequest: {
    type: "object",
    required: ["nombre"],
    properties: {
      nombre: { type: "string", example: "Cálculo avanzado", description: "Entre 3 y 40 caracteres." },
    },
  },

  Mensaje: {
    type: "object",
    properties: {
      id: { type: "string", example: "Tdm4m2Si7COrwm2CgCkZ" },
      salaId: { type: "string", example: "MAT-4821" },
      autor: {
        type: "object",
        properties: {
          uid: { type: "string", example: "k3J9...uid" },
          username: { type: "string", example: "camila_rojas" },
        },
      },
      texto: { type: "string", example: "Hola a todos" },
      enviado: { type: "string", format: "date-time" },
    },
  },

};

export const rutasSalas = {
  "/api/salas": {
    post: {
      tags: ["Salas"],
      summary: "Crear una sala",
      description: "Crea la sala con un ID único y deja como anfitrión a quien tiene la sesión iniciada.",
      security: seguridad,
      requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CrearSalaRequest" } } } },
      responses: {
        "201": salaOk("Sala creada"),
        "400": resp("VALIDATION_ERROR: el nombre está vacío o no tiene entre 3 y 40 caracteres (campos.nombre)"),
        "401": resp("UNAUTHORIZED: falta el token o no es válido"),
        "404": resp("PROFILE_NOT_FOUND: el usuario aún no completó su perfil"),
        "503": resp("FIRESTORE_UNAVAILABLE"),
      },
    },
    get: {
      tags: ["Salas"],
      summary: "Mis salas y salas a las que me uní",
      description: "Lista las salas creadas por quien tiene la sesión iniciada y las salas a las que se unió, sin duplicados y las más nuevas primero. Cada sala incluye esCreador. Si no tiene salas, la lista viene vacía.",
      security: seguridad,
      responses: {
        "200": {
          description: "Lista de salas (puede estar vacía)",
          content: {
            "application/json": {
              schema: { type: "object", properties: { salas: { type: "array", items: { $ref: "#/components/schemas/Sala" } } } },
            },
          },
        },
        "401": resp("UNAUTHORIZED"),
        "503": resp("FIRESTORE_UNAVAILABLE"),
      },
    },
  },
  "/api/salas/{id}": {
    get: {
      tags: ["Salas"],
      summary: "Consultar una sala por su ID",
      description: "Devuelve la sala para entrar en ella. Se usa al crearla y, desde el Sprint 3, para unirse con el ID.",
      security: seguridad,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", example: "MAT-4821" } }],
      responses: {
        "200": salaOk("Sala encontrada"),
        "401": resp("UNAUTHORIZED"),
        "404": resp("ROOM_NOT_FOUND: no existe una sala con ese ID"),
        "503": resp("FIRESTORE_UNAVAILABLE"),
      },
    },

    patch: {
      tags: ["Salas"],
      summary: "Editar el nombre de una sala",
      description: "Solo el anfitrión puede editarla. El orden de validación es: existe (404), es el anfitrión (403) y el nombre es válido (400).",
      security: seguridad,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", example: "MAT-4821" } }],
      requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/EditarSalaRequest" } } } },
      responses: {
        "200": salaOk("Sala actualizada"),
        "400": resp("VALIDATION_ERROR: el nombre está vacío o no tiene entre 3 y 40 caracteres (campos.nombre)"),
        "401": resp("UNAUTHORIZED: falta el token o no es válido"),
        "403": resp("FORBIDDEN: solo el anfitrión puede editar la sala"),
        "404": resp("ROOM_NOT_FOUND: no existe una sala con ese ID"),
        "503": resp("FIRESTORE_UNAVAILABLE"),
      },
    },

    delete: {
      tags: ["Salas"],
      summary: "Eliminar una sala",
      description: "Solo el anfitrión puede eliminarla. Se borran también sus mensajes, para no dejar datos huérfanos.",
      security: seguridad,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", example: "MAT-4821" } }],
      responses: {
        "204": { description: "Sala eliminada (sin contenido)" },
        "401": resp("UNAUTHORIZED: falta el token o no es válido"),
        "403": resp("FORBIDDEN: solo el anfitrión puede eliminar la sala"),
        "404": resp("ROOM_NOT_FOUND: no existe una sala con ese ID"),
        "503": resp("FIRESTORE_UNAVAILABLE"),
      },
    },
  },
  
  "/api/salas/{id}/unirse": {
    post: {
      tags: ["Salas"],
      summary: "Unirse a una sala",
      description: "Agrega a quien tiene la sesión iniciada como miembro de la sala. Es idempotente: si ya era miembro, o es el anfitrión, responde 200 igual y no duplica nada. El ID se normaliza (se recortan espacios y se pasa a mayúsculas).",
      security: seguridad,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", example: "MAT-4821" } }],
      responses: {
        "200": salaOk("Dentro de la sala (también cuando ya era miembro)"),
        "401": resp("UNAUTHORIZED: falta el token o no es válido"),
        "404": resp("ROOM_NOT_FOUND: no existe una sala con ese ID"),
        "503": resp("FIRESTORE_UNAVAILABLE"),
      },
    },
  },

  "/api/salas/{id}/mensajes": {
    get: {
      tags: ["Salas"],
      summary: "Historial de mensajes de una sala",
      description: "Devuelve los mensajes de la sala del más viejo al más nuevo. Solo lo pueden leer el anfitrión y quienes se unieron. Sin parámetros trae los últimos 50. Para cargar los anteriores, envía en antes el campo enviado del primer mensaje que ya tienes. Los mensajes nuevos llegan en vivo por Socket.IO (chat:mensaje).",
      security: seguridad,
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string", example: "MAT-4821" } },
        { name: "limite", in: "query", required: false, description: "Cantidad de mensajes (1 a 100, por defecto 50). Si es mayor a 100 se recorta a 100.", schema: { type: "integer", minimum: 1, maximum: 100, default: 50 } },
        { name: "antes", in: "query", required: false, description: "Solo mensajes enviados antes de esta fecha ISO.", schema: { type: "string", format: "date-time" } },
      ],
      responses: {
        "200": {
          description: "Mensajes (la lista puede estar vacía) y si hay más anteriores",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  mensajes: { type: "array", items: { $ref: "#/components/schemas/Mensaje" } },
                  hayMas: { type: "boolean", description: "true si existen mensajes anteriores a los devueltos." },
                },
              },
            },
          },
        },
        "400": resp("VALIDATION_ERROR: limite no es un entero de 1 a 100, o antes no es una fecha ISO válida"),
        "401": resp("UNAUTHORIZED: falta el token o no es válido"),
        "403": resp("FORBIDDEN: no eres el anfitrión ni te uniste a la sala"),
        "404": resp("ROOM_NOT_FOUND: no existe una sala con ese ID"),
        "503": resp("FIRESTORE_UNAVAILABLE"),
      },
    },
  },

};

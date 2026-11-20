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
    },
  },
  CrearSalaRequest: {
    type: "object",
    required: ["nombre"],
    properties: {
      nombre: { type: "string", example: "Cálculo multivariado", description: "Entre 3 y 40 caracteres." },
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
      summary: "Mis salas",
      description: "Lista las salas creadas por quien tiene la sesión iniciada, las más nuevas primero. Si no tiene salas, la lista viene vacía.",
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
  },
};

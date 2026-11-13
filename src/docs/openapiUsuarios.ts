// Endpoints de usuarios (TS-01). Se combinan con openApiSpec en app.ts.
const errorRef = { $ref: "#/components/schemas/Error" };
const resp = (descripcion: string) => ({
  description: descripcion,
  content: { "application/json": { schema: errorRef } },
});
const perfilOk = (descripcion: string) => ({
  description: descripcion,
  content: {
    "application/json": {
      schema: { type: "object", properties: { perfil: { $ref: "#/components/schemas/Perfil" } } },
    },
  },
});
const seguridad = [{ bearerAuth: [] }];

export const esquemasUsuarios = {
  Perfil: {
    type: "object",
    properties: {
      uid: { type: "string", example: "k3J9...uid" },
      nombres: { type: "string", example: "Camila Andrea" },
      apellidos: { type: "string", example: "Rojas Pérez" },
      username: { type: "string", example: "camila_rojas" },
      avatar: { type: "string", example: "avatar-1" },
      correo: { type: "string", example: "camila.rojas@correounivalle.edu.co" },
      creado: { type: "string", format: "date-time" },
    },
  },
  RegistroRequest: {
    type: "object",
    required: ["nombres", "apellidos", "username", "correo", "contrasena"],
    properties: {
      nombres: { type: "string", example: "Camila Andrea" },
      apellidos: { type: "string", example: "Rojas Pérez" },
      username: { type: "string", example: "camila_rojas", description: "3 a 20 caracteres: letras, números y guion bajo. Único." },
      avatar: { type: "string", example: "avatar-1" },
      correo: { type: "string", example: "camila.rojas@correounivalle.edu.co" },
      contrasena: { type: "string", example: "Clave1234", description: "Mínimo 8 caracteres, con una letra y un número." },
    },
  },
};

export const rutasUsuarios = {
  "/api/auth/registro": {
    post: {
      tags: ["Usuarios"],
      summary: "Registro manual",
      description:
        "Crea la cuenta en Firebase Auth y el perfil en Firestore. La unicidad del username se garantiza en el servidor con una transacción.",
      requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/RegistroRequest" } } } },
      responses: {
        "201": perfilOk("Cuenta y perfil creados"),
        "400": resp("VALIDATION_ERROR: datos inválidos (el campo «campos» dice cuál falló)"),
        "409": resp("USERNAME_TAKEN o EMAIL_TAKEN"),
        "503": resp("AUTH_UNAVAILABLE o FIRESTORE_UNAVAILABLE"),
      },
    },
  },
  "/api/usuarios/yo": {
    get: {
      tags: ["Usuarios"],
      summary: "Perfil de quien tiene la sesión iniciada",
      security: seguridad,
      responses: {
        "200": perfilOk("Perfil de la persona autenticada"),
        "401": resp("UNAUTHORIZED: sin token o token inválido"),
        "404": resp("PROFILE_NOT_FOUND: entró con Google y aún no eligió su username"),
      },
    },
    patch: {
      tags: ["Usuarios"],
      summary: "Actualizar el perfil",
      security: seguridad,
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                nombres: { type: "string" },
                apellidos: { type: "string" },
                username: { type: "string" },
                avatar: { type: "string" },
              },
            },
          },
        },
      },
      responses: {
        "200": perfilOk("Perfil actualizado"),
        "400": resp("VALIDATION_ERROR"),
        "401": resp("UNAUTHORIZED"),
        "404": resp("PROFILE_NOT_FOUND"),
        "409": resp("USERNAME_TAKEN"),
      },
    },
    delete: {
      tags: ["Usuarios"],
      summary: "Borrar la cuenta",
      description: "Elimina el perfil, el username reservado y la cuenta de Firebase Auth.",
      security: seguridad,
      responses: { "204": { description: "Cuenta eliminada" }, "401": resp("UNAUTHORIZED") },
    },
  },
  "/api/usuarios/perfil": {
    post: {
      tags: ["Usuarios"],
      summary: "Crear el perfil tras entrar con Google",
      description: "Nombre, correo y foto salen del token de Google; la persona solo elige su username.",
      security: seguridad,
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { type: "object", required: ["username"], properties: { username: { type: "string", example: "camila_rojas" } } },
          },
        },
      },
      responses: {
        "201": perfilOk("Perfil creado"),
        "400": resp("VALIDATION_ERROR"),
        "401": resp("UNAUTHORIZED"),
        "409": resp("USERNAME_TAKEN o PROFILE_EXISTS"),
      },
    },
  },
};

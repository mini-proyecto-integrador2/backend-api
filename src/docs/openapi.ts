export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "API del Salón de Estudio Colaborativo",
    version: "1.0.0",
    description:
      "API REST del Salón de Estudio Colaborativo en Tiempo Real. El frontend accede a los datos solo a través de esta API.",
  },
  servers: [{ url: "/", description: "Servidor actual" }],
  tags: [
    { name: "Salud", description: "Estado del servicio" },
    { name: "Base técnica", description: "Dato de prueba leído de Firestore" },
  ],
    paths: {
    "/api/health": {
      get: {
        tags: ["Salud"],
        summary: "Comprueba que el servicio responde",
        responses: {
          "200": {
            description: "Servicio activo",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { status: { type: "string", example: "ok" } },
                },
              },
            },
          },
          "500": {
            description: "Error inesperado",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    },

        "/api/base": {
      get: {
        tags: ["Base técnica"],
        summary: "Devuelve el dato de prueba guardado en Firestore",
        responses: {
          "200": {
            description: "Dato leído de Firestore",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    mensaje: { type: "string", example: "Texto de ejemplo" },
                    actualizado: { type: "string", example: "Fecha de ejemplo" },
                  },
                },
              },
            },
          },
          "404": {
            description: "El documento no existe en Firestore",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
                example: {
                  error: { code: "BASE_NOT_FOUND", message: "Descripción del error" },
                },
              },
            },
          },
          "503": {
            description: "Firestore no está disponible",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
                example: {
                  error: { code: "FIRESTORE_UNAVAILABLE", message: "Descripción del error" },
                },
              },
            },
          },
          "500": {
            description: "Error inesperado",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    },

  },
  components: {
    schemas: {
      Error: {
        type: "object",
        properties: {
          error: {
            type: "object",
            properties: {
              code: { type: "string", example: "INTERNAL_ERROR" },
              message: { type: "string", example: "Error interno del servidor" },
            },
          },
        },
      },
    },
  },
};
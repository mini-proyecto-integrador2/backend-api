import { obtenerSaludo, BaseTecnica } from "../repositories/baseRepository";
import { AppError } from "../middleware/AppError";

export async function leerBase(): Promise<BaseTecnica> {
  let dato: BaseTecnica | null;
  try {
    dato = await obtenerSaludo();
  } catch (error) {
    console.error("Error leyendo Firestore:", error);
    throw new AppError(503, "FIRESTORE_UNAVAILABLE", "No se pudo leer el dato. Intenta de nuevo.");
  }
  if (!dato) {
    throw new AppError(404, "BASE_NOT_FOUND", "El dato de la base técnica no existe.");
  }
  return { mensaje: dato.mensaje, actualizado: dato.actualizado };
}
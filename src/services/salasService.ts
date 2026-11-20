import { AppError } from "../middleware/AppError";
import { obtenerPerfil } from "../repositories/usuariosRepository";
import { Sala, crearSala, listarSalasDe, obtenerSala } from "../repositories/salasRepository";

const NOMBRE_MIN = 3;
const NOMBRE_MAX = 40;
const RE_ID = /^[A-Z]{3}-\d{4}$/;

function errorNombre(mensaje: string): never {
  const error = new AppError(400, "VALIDATION_ERROR", "Revisa los campos marcados.");
  Object.assign(error, { campos: { nombre: mensaje } });
  throw error;
}

function sinFirestore(e: unknown): never {
  if (e instanceof AppError) throw e;
  console.error("Error en Firestore (salas):", e);
  throw new AppError(503, "FIRESTORE_UNAVAILABLE", "No pudimos guardar los datos. Intenta de nuevo en un momento.");
}

export async function crear(uid: string, cuerpo: any): Promise<Sala> {
  const nombre = typeof cuerpo?.nombre === "string" ? cuerpo.nombre.trim().replace(/\s+/g, " ") : "";
  if (!nombre) errorNombre("Escribe un nombre para la sala.");
  if (nombre.length < NOMBRE_MIN || nombre.length > NOMBRE_MAX) {
    errorNombre(`El nombre debe tener entre ${NOMBRE_MIN} y ${NOMBRE_MAX} caracteres.`);
  }
  try {
    const perfil = await obtenerPerfil(uid);
    if (!perfil) throw new AppError(404, "PROFILE_NOT_FOUND", "Completa tu perfil antes de crear salas.");
    return await crearSala({
      nombre,
      anfitrion: { uid, username: perfil.username },
      creada: new Date().toISOString(),
    });
  } catch (e) {
    sinFirestore(e);
  }
}

export async function listarMias(uid: string): Promise<Sala[]> {
  try {
    return await listarSalasDe(uid);
  } catch (e) {
    sinFirestore(e);
  }
}

export async function consultar(idCrudo: string): Promise<Sala> {
  const id = String(idCrudo ?? "").trim().toUpperCase();
  const noExiste = new AppError(404, "ROOM_NOT_FOUND", "No existe una sala con ese ID.");
  if (!RE_ID.test(id)) throw noExiste;
  let sala: Sala | null = null;
  try {
    sala = await obtenerSala(id);
  } catch (e) {
    sinFirestore(e);
  }
  if (!sala) throw noExiste;
  return sala;
}

import { AppError } from "../middleware/AppError";
import { obtenerPerfil } from "../repositories/usuariosRepository";
import { Sala, agregarMiembro, crearSala, listarSalasDeUsuario, obtenerSala } from "../repositories/salasRepository";

const NOMBRE_MIN = 3;
const NOMBRE_MAX = 40;
const RE_ID = /^[A-Z]{3}-\d{4}$/;

// Lo que ve el cliente: nunca se exponen los UIDs de los miembros.
export type SalaPublica = Omit<Sala, "miembros"> & { esCreador: boolean };

function aPublica(sala: Sala, uid: string): SalaPublica {
  const { miembros: _miembros, ...resto } = sala;
  return { ...resto, esCreador: sala.anfitrion.uid === uid };
}

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

export async function crear(uid: string, cuerpo: any): Promise<SalaPublica> {
  const nombre = typeof cuerpo?.nombre === "string" ? cuerpo.nombre.trim().replace(/\s+/g, " ") : "";
  if (!nombre) errorNombre("Escribe un nombre para la sala.");
  if (nombre.length < NOMBRE_MIN || nombre.length > NOMBRE_MAX) {
    errorNombre(`El nombre debe tener entre ${NOMBRE_MIN} y ${NOMBRE_MAX} caracteres.`);
  }
  try {
    const perfil = await obtenerPerfil(uid);
    if (!perfil) throw new AppError(404, "PROFILE_NOT_FOUND", "Completa tu perfil antes de crear salas.");
    const sala = await crearSala({
      nombre,
      anfitrion: { uid, username: perfil.username },
      creada: new Date().toISOString(),
    });
    return aPublica(sala, uid);
  } catch (e) {
    sinFirestore(e);
  }
}

export async function listarMias(uid: string): Promise<SalaPublica[]> {
  try {
    const salas = await listarSalasDeUsuario(uid);
    return salas.map((s) => aPublica(s, uid));
  } catch (e) {
    sinFirestore(e);
  }
}

// Uso interno: devuelve la sala completa (con miembros).
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

export async function consultarPublica(uid: string, idCrudo: string): Promise<SalaPublica> {
  return aPublica(await consultar(idCrudo), uid);
}

// US-08: idempotente. Si ya está dentro (o es el anfitrión) responde 200 igual.
export async function unirse(uid: string, idCrudo: string): Promise<SalaPublica> {
  const sala = await consultar(idCrudo);
  try {
    const yaDentro = sala.anfitrion.uid === uid || (sala.miembros ?? []).includes(uid);
    if (!yaDentro) await agregarMiembro(sala.id, uid);
  } catch (e) {
    sinFirestore(e);
  }
  return aPublica(sala, uid);
}
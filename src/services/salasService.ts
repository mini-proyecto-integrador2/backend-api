import { AppError } from "../middleware/AppError";
import { obtenerPerfil } from "../repositories/usuariosRepository";
import { Mensaje, Sala, actualizarNombre, agregarMiembro, crearSala, eliminarSala, listarMensajes, listarSalasDeUsuario, obtenerSala } from "../repositories/salasRepository";
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

//Validación compartida q usan crear y editar
function validarNombre(cuerpo: any): string {
  const nombre = typeof cuerpo?.nombre === "string" ? cuerpo.nombre.trim().replace(/\s+/g, " ") : "";
  if (!nombre) errorNombre("Escribe un nombre para la sala.");
  if (nombre.length < NOMBRE_MIN || nombre.length > NOMBRE_MAX) {
    errorNombre(`El nombre debe tener entre ${NOMBRE_MIN} y ${NOMBRE_MAX} caracteres.`);
  }
  return nombre;
}

function sinFirestore(e: unknown): never {
  if (e instanceof AppError) throw e;
  console.error("Error en Firestore (salas):", e);
  throw new AppError(503, "FIRESTORE_UNAVAILABLE", "No pudimos guardar los datos. Intenta de nuevo en un momento.");
}

export async function crear(uid: string, cuerpo: any): Promise<SalaPublica> {
  const nombre = validarNombre(cuerpo);
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

function soloAnfitrion(sala: Sala, uid: string): void {
  if (sala.anfitrion.uid !== uid) {
    throw new AppError(403, "FORBIDDEN", "Solo el anfitrión puede editar o eliminar esta sala.");
  }
}

// US-07: el orden es existencia (404), permiso (403) y validación (400).
export async function editar(uid: string, idCrudo: string, cuerpo: any): Promise<SalaPublica> {
  const sala = await consultar(idCrudo);
  soloAnfitrion(sala, uid);
  const nombre = validarNombre(cuerpo);
  try {
    await actualizarNombre(sala.id, nombre);
  } catch (e) {
    sinFirestore(e);
  }
  return aPublica({ ...sala, nombre }, uid);
}

// US-07: el orden es existencia (404) y permiso (403).
export async function eliminar(uid: string, idCrudo: string): Promise<void> {
  const sala = await consultar(idCrudo);
  soloAnfitrion(sala, uid);
  try {
    await eliminarSala(sala.id);
  } catch (e) {
    sinFirestore(e);
  }
}

const LIMITE_DEFECTO = 50;
const LIMITE_MAX = 100;

// US-11: historial paginado. Solo lo pueden leer el anfitrión y quienes se unieron a la sala.
export async function historial(
  uid: string,
  idCrudo: string,
  consulta: { limite?: unknown; antes?: unknown }
): Promise<{ mensajes: Mensaje[]; hayMas: boolean }> {
  const sala = await consultar(idCrudo);
  const esMiembro = sala.anfitrion.uid === uid || (sala.miembros ?? []).includes(uid);
  if (!esMiembro) throw new AppError(403, "FORBIDDEN", "Únete a la sala para ver su historial.");

  let limite = LIMITE_DEFECTO;
  if (consulta.limite !== undefined) {
    limite = Number(consulta.limite);
    if (!Number.isInteger(limite) || limite < 1) {
      throw new AppError(400, "VALIDATION_ERROR", "El parámetro limite debe ser un número entero de 1 a 100.");
    }
    limite = Math.min(limite, LIMITE_MAX);
  }

  let antes: string | undefined;
  if (consulta.antes !== undefined) {
    const fecha = new Date(String(consulta.antes));
    if (Number.isNaN(fecha.getTime())) {
      throw new AppError(400, "VALIDATION_ERROR", "El parámetro antes debe ser una fecha ISO válida.");
    }
    antes = fecha.toISOString();
  }

  try {
    return await listarMensajes(sala.id, limite, antes);
  } catch (e) {
    sinFirestore(e);
  }
}
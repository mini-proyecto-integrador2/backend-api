import { auth } from "../config/auth";
import { AppError } from "../middleware/AppError";
import type { UsuarioAutenticado } from "../middleware/auth";
import {
  Perfil,
  UsernameTakenError,
  PerfilExisteError,
  PerfilNoExisteError,
  actualizarPerfil,
  crearPerfil,
  eliminarPerfil,
  obtenerPerfil,
  usernameOcupado,
} from "../repositories/usuariosRepository";

const RE_USERNAME = /^[A-Za-z0-9_]{3,20}$/;
const RE_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MSG = {
  nombres: "Escribe tus nombres.",
  apellidos: "Escribe tus apellidos.",
  username: "Usa entre 3 y 20 caracteres: letras, números y guion bajo.",
  correo: "Escribe un correo válido, por ejemplo nombre@correounivalle.edu.co.",
  contrasena: "La contraseña debe tener mínimo 8 caracteres, una letra y un número.",
  usernameOcupado: "Ese nombre de usuario ya está en uso. Prueba con otro.",
};

const texto = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

function validacion(campos: Record<string, string>): never {
  const error = new AppError(400, "VALIDATION_ERROR", "Revisa los campos marcados.");
  Object.assign(error, { campos });
  throw error;
}

function traducirError(e: unknown): never {
  if (e instanceof AppError) throw e;
  if (e instanceof UsernameTakenError) throw new AppError(409, "USERNAME_TAKEN", MSG.usernameOcupado);
  if (e instanceof PerfilExisteError) throw new AppError(409, "PROFILE_EXISTS", "Tu perfil ya está creado.");
  if (e instanceof PerfilNoExisteError) throw new AppError(404, "PROFILE_NOT_FOUND", "Aún no tienes un perfil.");
  console.error("Error en usuarios:", e);
  throw new AppError(503, "FIRESTORE_UNAVAILABLE", "No se pudo completar la operación. Intenta de nuevo.");
}

export async function registrar(body: any): Promise<Perfil> {
  const nombres = texto(body?.nombres);
  const apellidos = texto(body?.apellidos);
  const username = texto(body?.username);
  const correo = texto(body?.correo).toLowerCase();
  const contrasena = typeof body?.contrasena === "string" ? body.contrasena : "";
  const avatar = texto(body?.avatar) || "avatar-1";

  const campos: Record<string, string> = {};
  if (!nombres || nombres.length > 60) campos.nombres = MSG.nombres;
  if (!apellidos || apellidos.length > 60) campos.apellidos = MSG.apellidos;
  if (!RE_USERNAME.test(username)) campos.username = MSG.username;
  if (!RE_CORREO.test(correo)) campos.correo = MSG.correo;
  if (contrasena.length < 8 || !/[A-Za-z]/.test(contrasena) || !/\d/.test(contrasena)) {
    campos.contrasena = MSG.contrasena;
  }
  if (Object.keys(campos).length) validacion(campos);

  try {
    if (await usernameOcupado(username)) throw new UsernameTakenError();
  } catch (e) {
    traducirError(e);
  }

  let uid: string;
  try {
    const u = await auth.createUser({
      email: correo,
      password: contrasena,
      displayName: `${nombres} ${apellidos}`,
    });
    uid = u.uid;
  } catch (e: any) {
    if (e?.code === "auth/email-already-exists") {
      throw new AppError(409, "EMAIL_TAKEN", "Este correo ya tiene una cuenta. Ingresa con ese correo o usa otro.");
    }
    if (e?.code === "auth/invalid-email") validacion({ correo: MSG.correo });
    if (e?.code === "auth/invalid-password") validacion({ contrasena: MSG.contrasena });
    console.error("Error creando usuario en Auth:", e);
    throw new AppError(503, "AUTH_UNAVAILABLE", "No se pudo crear la cuenta. Intenta de nuevo.");
  }

  try {
    return await crearPerfil({ uid, nombres, apellidos, username, avatar, correo, creado: new Date().toISOString() });
  } catch (e) {
    // Si el perfil no se pudo guardar (p. ej. username tomado en carrera), no dejamos la cuenta huérfana.
    await auth.deleteUser(uid).catch(() => undefined);
    traducirError(e);
  }
}

export async function leerPerfil(uid: string): Promise<Perfil> {
  let perfil: Perfil | null;
  try {
    perfil = await obtenerPerfil(uid);
  } catch (e) {
    traducirError(e);
  }
  if (!perfil) throw new AppError(404, "PROFILE_NOT_FOUND", "Aún no tienes un perfil. Elige tu nombre de usuario.");
  return perfil;
}

// Flujo de Google: nombre, correo y foto salen del token; la persona solo elige su username.
export async function crearPerfilGoogle(usuario: UsuarioAutenticado, body: any): Promise<Perfil> {
  const username = texto(body?.username);
  if (!RE_USERNAME.test(username)) validacion({ username: MSG.username });

  const partes = (usuario.nombre ?? "").trim().split(/\s+/).filter(Boolean);
  const apellidos = partes.length > 1 ? partes[partes.length - 1] : "";
  const nombres = partes.length > 1 ? partes.slice(0, -1).join(" ") : (partes[0] ?? "");
  try {
    return await crearPerfil({
      uid: usuario.uid,
      nombres,
      apellidos,
      username,
      avatar: usuario.foto ?? "avatar-1",
      correo: (usuario.correo ?? "").toLowerCase(),
      creado: new Date().toISOString(),
    });
  } catch (e) {
    traducirError(e);
  }
}

export async function actualizar(uid: string, body: any): Promise<Perfil> {
  const cambios: Partial<Pick<Perfil, "nombres" | "apellidos" | "avatar" | "username">> = {};
  const campos: Record<string, string> = {};
  if (body?.nombres !== undefined) {
    const v = texto(body.nombres);
    if (!v || v.length > 60) campos.nombres = MSG.nombres; else cambios.nombres = v;
  }
  if (body?.apellidos !== undefined) {
    const v = texto(body.apellidos);
    if (!v || v.length > 60) campos.apellidos = MSG.apellidos; else cambios.apellidos = v;
  }
  if (body?.username !== undefined) {
    const v = texto(body.username);
    if (!RE_USERNAME.test(v)) campos.username = MSG.username; else cambios.username = v;
  }
  if (body?.avatar !== undefined) {
    const v = texto(body.avatar);
    if (!v || v.length > 300) campos.avatar = "Elige un avatar válido."; else cambios.avatar = v;
  }
  if (Object.keys(campos).length) validacion(campos);
  if (!Object.keys(cambios).length) validacion({ general: "No enviaste ningún dato para actualizar." });
  try {
    return await actualizarPerfil(uid, cambios);
  } catch (e) {
    traducirError(e);
  }
}

export async function eliminar(uid: string): Promise<void> {
  try {
    await eliminarPerfil(uid);
  } catch (e) {
    traducirError(e);
  }
  try {
    await auth.deleteUser(uid);
  } catch (e: any) {
    if (e?.code !== "auth/user-not-found") {
      console.error("Error eliminando usuario de Auth:", e);
      throw new AppError(503, "AUTH_UNAVAILABLE", "Se borró tu perfil, pero no se pudo cerrar tu cuenta. Intenta de nuevo.");
    }
  }
}

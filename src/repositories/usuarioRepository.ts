import { db } from "../config/firebase";

export interface Usuario {
  uid: string;
  nombres: string;
  apellidos: string;
  usuario: string;
  avatar: string;
  correo: string;
  creadoEn: string;
}

export type DatosNuevoUsuario = Omit<Usuario, "creadoEn">;

// Errores de negocio que lanza la transacción (el servicio los traduce a AppError).
export class UsuarioTomadoError extends Error {}
export class PerfilExistenteError extends Error {}

export async function nombreUsuarioDisponible(usuario: string): Promise<boolean> {
  const doc = await db.collection("nombres_usuario").doc(usuario.toLowerCase()).get();
  return !doc.exists;
}

export async function obtenerPerfil(uid: string): Promise<Usuario | null> {
  const doc = await db.collection("usuarios").doc(uid).get();
  if (!doc.exists) return null;
  return doc.data() as Usuario;
}

export async function crearPerfil(datos: DatosNuevoUsuario): Promise<Usuario> {
  const refPerfil = db.collection("usuarios").doc(datos.uid);
  const refNombre = db.collection("nombres_usuario").doc(datos.usuario.toLowerCase());
  const perfil: Usuario = { ...datos, creadoEn: new Date().toISOString() };

  await db.runTransaction(async (tx) => {
    const [docPerfil, docNombre] = await Promise.all([tx.get(refPerfil), tx.get(refNombre)]);
    if (docPerfil.exists) throw new PerfilExistenteError();
    if (docNombre.exists) throw new UsuarioTomadoError();
    tx.set(refPerfil, perfil);
    tx.set(refNombre, { uid: datos.uid });
  });

  return perfil;
}
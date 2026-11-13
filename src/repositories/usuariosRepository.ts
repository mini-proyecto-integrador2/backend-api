import { db } from "../config/firebase";

export interface Perfil {
  uid: string;
  nombres: string;
  apellidos: string;
  username: string;
  avatar: string;
  correo: string;
  creado: string;
}

export class UsernameTakenError extends Error {}
export class PerfilExisteError extends Error {}
export class PerfilNoExisteError extends Error {}

const users = () => db.collection("users");
// Un documento por username (en minúsculas): garantiza la unicidad dentro de una transacción.
const usernames = () => db.collection("usernames");

export async function obtenerPerfil(uid: string): Promise<Perfil | null> {
  const doc = await users().doc(uid).get();
  return doc.exists ? (doc.data() as Perfil) : null;
}

export async function usernameOcupado(username: string): Promise<boolean> {
  const doc = await usernames().doc(username.toLowerCase()).get();
  return doc.exists;
}

export async function crearPerfil(perfil: Perfil): Promise<Perfil> {
  const uRef = users().doc(perfil.uid);
  const nRef = usernames().doc(perfil.username.toLowerCase());
  await db.runTransaction(async (tx) => {
    const [u, n] = await Promise.all([tx.get(uRef), tx.get(nRef)]);
    if (u.exists) throw new PerfilExisteError();
    if (n.exists) throw new UsernameTakenError();
    tx.set(nRef, { uid: perfil.uid });
    tx.set(uRef, perfil);
  });
  return perfil;
}

export async function actualizarPerfil(
  uid: string,
  cambios: Partial<Pick<Perfil, "nombres" | "apellidos" | "avatar" | "username">>
): Promise<Perfil> {
  const uRef = users().doc(uid);
  await db.runTransaction(async (tx) => {
    const uSnap = await tx.get(uRef);
    if (!uSnap.exists) throw new PerfilNoExisteError();
    const actual = uSnap.data() as Perfil;

    const cambiaUsername =
      cambios.username !== undefined &&
      cambios.username.toLowerCase() !== actual.username.toLowerCase();
    let nuevaRef: FirebaseFirestore.DocumentReference | null = null;
    if (cambiaUsername) {
      nuevaRef = usernames().doc(cambios.username!.toLowerCase());
      const nSnap = await tx.get(nuevaRef);
      if (nSnap.exists) throw new UsernameTakenError();
    }
    // Todas las lecturas van antes de las escrituras.
    if (nuevaRef) {
      tx.delete(usernames().doc(actual.username.toLowerCase()));
      tx.set(nuevaRef, { uid });
    }
    tx.update(uRef, cambios);
  });
  return (await obtenerPerfil(uid)) as Perfil;
}

export async function eliminarPerfil(uid: string): Promise<void> {
  const uRef = users().doc(uid);
  await db.runTransaction(async (tx) => {
    const uSnap = await tx.get(uRef);
    if (!uSnap.exists) return;
    const actual = uSnap.data() as Perfil;
    tx.delete(usernames().doc(actual.username.toLowerCase()));
    tx.delete(uRef);
  });
}

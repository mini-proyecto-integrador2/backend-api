import { db } from "../config/firebase";
import { FieldValue } from "firebase-admin/firestore";

export interface Sala {
  id: string;
  nombre: string;
  anfitrion: { uid: string; username: string };
  creada: string;
  miembros?: string[]; // UIDs de quienes se unieron (no incluye al anfitrión)
}

// Colección de salas (TS-02). Los mensajes del Sprint 3 irán en rooms/{id}/messages.
const rooms = () => db.collection("rooms");

// Sin I ni O para que el ID no se confunda con 1 y 0 al dictarlo.
const LETRAS = "ABCDEFGHJKLMNPQRSTUVWXYZ";

function generarId(): string {
  const letras = Array.from({ length: 3 }, () => LETRAS[Math.floor(Math.random() * LETRAS.length)]).join("");
  const numeros = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
  return `${letras}-${numeros}`;
}

// create() falla si el documento ya existe, así el ID nunca se repite.
export async function crearSala(datos: Omit<Sala, "id">): Promise<Sala> {
  for (let intento = 0; intento < 5; intento++) {
    const sala: Sala = { id: generarId(), ...datos };
    try {
      await rooms().doc(sala.id).create(sala);
      return sala;
    } catch (e: any) {
      if (e?.code !== 6) throw e; // 6 = ALREADY_EXISTS: se intenta con otro ID.
    }
  }
  throw new Error("No se pudo generar un ID único para la sala.");
}

export async function listarSalasDe(uid: string): Promise<Sala[]> {
  const snap = await rooms().where("anfitrion.uid", "==", uid).get();
  // Se ordena aquí (más nuevas primero) para no necesitar un índice compuesto en Firestore.
  return snap.docs.map((d) => d.data() as Sala).sort((a, b) => b.creada.localeCompare(a.creada));
}

export async function obtenerSala(id: string): Promise<Sala | null> {
  const doc = await rooms().doc(id).get();
  return doc.exists ? (doc.data() as Sala) : null;
}

// Al eliminar la cuenta (US-05) se borran sus salas con sus mensajes, para no dejar datos huérfanos.
export async function eliminarSalasDe(uid: string): Promise<void> {
  const snap = await rooms().where("anfitrion.uid", "==", uid).get();
  await Promise.all(snap.docs.map((d) => db.recursiveDelete(d.ref)));
}

// arrayUnion es atómico y no duplica: unirse es idempotente.
export async function agregarMiembro(id: string, uid: string): Promise<void> {
  await rooms().doc(id).update({ miembros: FieldValue.arrayUnion(uid) });
}

// Salas propias + salas donde el usuario se unió, sin duplicados y las más nuevas primero.
export async function listarSalasDeUsuario(uid: string): Promise<Sala[]> {
  const [propias, unidas] = await Promise.all([
    rooms().where("anfitrion.uid", "==", uid).get(),
    rooms().where("miembros", "array-contains", uid).get(),
  ]);
  const porId = new Map<string, Sala>();
  for (const d of [...propias.docs, ...unidas.docs]) porId.set(d.id, d.data() as Sala);
  return [...porId.values()].sort((a, b) => b.creada.localeCompare(a.creada));
}

export async function actualizarNombre(id: string, nombre: string): Promise<void> {
  await rooms().doc(id).update({ nombre });
}

// Borra la sala y su subcolección de mensajes.
export async function eliminarSala(id: string): Promise<void> {
  await db.recursiveDelete(rooms().doc(id));
}

export interface Mensaje {
  id: string;
  salaId: string;
  autor: { uid: string; username: string };
  texto: string;
  enviado: string;
}

// Los `limite` mensajes anteriores a `antes` (o los más recientes si no se indica),
// devueltos del más viejo al más nuevo. Se pide uno de más para saber si hay más.
export async function listarMensajes(
  salaId: string,
  limite: number,
  antes?: string
): Promise<{ mensajes: Mensaje[]; hayMas: boolean }> {
  let consulta = rooms().doc(salaId).collection("messages").orderBy("enviado", "desc");
  if (antes) consulta = consulta.where("enviado", "<", antes);
  const snap = await consulta.limit(limite + 1).get();
  const hayMas = snap.size > limite;
  const mensajes = snap.docs
    .slice(0, limite)
    .map((d) => d.data() as Mensaje)
    .reverse();
  return { mensajes, hayMas };
}

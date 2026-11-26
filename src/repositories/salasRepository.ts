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

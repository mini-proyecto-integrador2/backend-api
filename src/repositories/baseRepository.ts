import { db } from "../config/firebase";

export interface BaseTecnica {
  mensaje: string;
  actualizado: string;
}

export async function obtenerSaludo(): Promise<BaseTecnica | null> {
  const doc = await db.collection("base_tecnica").doc("saludo").get();
  if (!doc.exists) return null;
  return doc.data() as BaseTecnica;
}
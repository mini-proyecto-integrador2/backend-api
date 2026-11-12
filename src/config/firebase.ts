import "dotenv/config";
import fs from "node:fs";
import { initializeApp, cert, getApps, type ServiceAccount } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function cargarCredenciales(): ServiceAccount {
  const valor = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!valor) {
    throw new Error("Falta la variable de entorno FIREBASE_SERVICE_ACCOUNT");
  }
  // En Render viene el JSON completo; en local, la ruta al archivo.
  const json = valor.trim().startsWith("{")
    ? valor
    : fs.readFileSync(valor, "utf-8");
  return JSON.parse(json);
}

if (!getApps().length) {
  initializeApp({ credential: cert(cargarCredenciales()) });
}

export const db = getFirestore();
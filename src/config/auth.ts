import "./firebase"; // asegura que Firebase Admin ya fue inicializado
import { getAuth } from "firebase-admin/auth";

export const auth = getAuth();

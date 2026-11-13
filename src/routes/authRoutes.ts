import { Router } from "express";
import { registrar } from "../services/usuariosService";

const router = Router();

// Registro manual: crea la cuenta en Firebase Auth y el perfil en Firestore.
router.post("/auth/registro", async (req, res, next) => {
  try {
    res.status(201).json({ perfil: await registrar(req.body) });
  } catch (error) {
    next(error);
  }
});

export default router;

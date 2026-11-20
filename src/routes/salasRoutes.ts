import { Router } from "express";
import { requiereAuth } from "../middleware/auth";
import { consultar, crear, listarMias } from "../services/salasService";

// Salas de estudio (US-06). Todas las rutas exigen sesión.
const router = Router();

router.post("/salas", requiereAuth, async (req, res, next) => {
  try {
    res.status(201).json({ sala: await crear(req.usuario!.uid, req.body) });
  } catch (error) {
    next(error);
  }
});

router.get("/salas", requiereAuth, async (req, res, next) => {
  try {
    res.json({ salas: await listarMias(req.usuario!.uid) });
  } catch (error) {
    next(error);
  }
});

router.get("/salas/:id", requiereAuth, async (req, res, next) => {
  try {
    res.json({ sala: await consultar(String(req.params.id)) });
  } catch (error) {
    next(error);
  }
});

export default router;

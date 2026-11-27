import { Router } from "express";
import { requiereAuth } from "../middleware/auth";
import { consultarPublica, crear, editar, eliminar, historial, listarMias, unirse } from "../services/salasService";

// Salas de estudio (US-06, US-08). Todas las rutas exigen sesión.
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
    res.json({ sala: await consultarPublica(req.usuario!.uid, String(req.params.id)) });
  } catch (error) {
    next(error);
  }
});

router.post("/salas/:id/unirse", requiereAuth, async (req, res, next) => {
  try {
    res.json({ sala: await unirse(req.usuario!.uid, String(req.params.id)) });
  } catch (error) {
    next(error);
  }
});

router.patch("/salas/:id", requiereAuth, async (req, res, next) => {
  try {
    res.json({ sala: await editar(req.usuario!.uid, String(req.params.id), req.body) });
  } catch (error) {
    next(error);
  }
});

router.delete("/salas/:id", requiereAuth, async (req, res, next) => {
  try {
    await eliminar(req.usuario!.uid, String(req.params.id));
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.get("/salas/:id/mensajes", requiereAuth, async (req, res, next) => {
  try {
    res.json(await historial(req.usuario!.uid, String(req.params.id), req.query));
  } catch (error) {
    next(error);
  }
});

export default router;
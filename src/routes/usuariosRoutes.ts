import { Router } from "express";
import { requiereAuth } from "../middleware/auth";
import { actualizar, crearPerfilGoogle, eliminar, leerPerfil } from "../services/usuariosService";

const router = Router();

router.get("/usuarios/yo", requiereAuth, async (req, res, next) => {
  try {
    res.json({ perfil: await leerPerfil(req.usuario!.uid) });
  } catch (error) {
    next(error);
  }
});

// Solo para quien entró con Google y todavía no eligió su username.
router.post("/usuarios/perfil", requiereAuth, async (req, res, next) => {
  try {
    res.status(201).json({ perfil: await crearPerfilGoogle(req.usuario!, req.body) });
  } catch (error) {
    next(error);
  }
});

router.patch("/usuarios/yo", requiereAuth, async (req, res, next) => {
  try {
    res.json({ perfil: await actualizar(req.usuario!.uid, req.body) });
  } catch (error) {
    next(error);
  }
});

router.delete("/usuarios/yo", requiereAuth, async (req, res, next) => {
  try {
    await eliminar(req.usuario!.uid);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;

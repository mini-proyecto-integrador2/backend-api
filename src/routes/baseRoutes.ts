import { Router } from "express";
import { leerBase } from "../services/baseService";

const router = Router();

router.get("/base", async (_req, res, next) => {
  try {
    res.json(await leerBase());
  } catch (error) {
    next(error);
  }
});

export default router;
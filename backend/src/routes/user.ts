import { Router } from "express";
import prisma from "../db";

const router = Router();

router.get("/me", async (_req, res) => {
  try {
    const user = await prisma.user.findFirst();
    if (!user) {
      res.status(404).json({ error: "No user found" });
      return;
    }
    res.json(user);
  } catch (error) {
    console.error("Failed to fetch user:", error);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

export default router;

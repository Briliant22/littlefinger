import { Router } from "express";
import prisma from "../db";

const router = Router();

async function getDefaultUserId(): Promise<string> {
  const user = await prisma.user.findFirst();
  if (!user) throw new Error("No user found. Run db seed first.");
  return user.id;
}

router.get("/", async (_req, res) => {
  try {
    const userId = await getDefaultUserId();
    const people = await prisma.person.findMany({
      where: { userId },
      orderBy: { name: "asc" },
    });
    res.json(people);
  } catch (error) {
    console.error("Failed to fetch people:", error);
    res.status(500).json({ error: "Failed to fetch people" });
  }
});

router.post("/", async (req, res) => {
  try {
    const userId = await getDefaultUserId();
    const { name, contactInfo } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ error: "name is required" });
      return;
    }

    const person = await prisma.person.create({
      data: {
        userId,
        name: name.trim(),
        contactInfo: contactInfo?.trim() || null,
      },
    });

    res.status(201).json(person);
  } catch (error) {
    console.error("Failed to create person:", error);
    res.status(500).json({ error: "Failed to create person" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, contactInfo } = req.body;

    const existing = await prisma.person.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: "Person not found" });
      return;
    }

    if (name !== undefined && !name.trim()) {
      res.status(400).json({ error: "name cannot be empty" });
      return;
    }

    const person = await prisma.person.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(contactInfo !== undefined && { contactInfo: contactInfo?.trim() || null }),
      },
    });

    res.json(person);
  } catch (error) {
    console.error("Failed to update person:", error);
    res.status(500).json({ error: "Failed to update person" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.person.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: "Person not found" });
      return;
    }

    await prisma.person.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to delete person:", error);
    res.status(500).json({ error: "Failed to delete person" });
  }
});

export default router;

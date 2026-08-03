"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = __importDefault(require("../db"));
const router = (0, express_1.Router)();
async function getDefaultUserId() {
    const user = await db_1.default.user.findFirst();
    if (!user)
        throw new Error("No user found. Run db seed first.");
    return user.id;
}
router.get("/", async (_req, res) => {
    try {
        const userId = await getDefaultUserId();
        const people = await db_1.default.person.findMany({
            where: { userId },
            orderBy: { name: "asc" },
        });
        res.json(people);
    }
    catch (error) {
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
        const person = await db_1.default.person.create({
            data: {
                userId,
                name: name.trim(),
                contactInfo: contactInfo?.trim() || null,
            },
        });
        res.status(201).json(person);
    }
    catch (error) {
        console.error("Failed to create person:", error);
        res.status(500).json({ error: "Failed to create person" });
    }
});
router.put("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { name, contactInfo } = req.body;
        const existing = await db_1.default.person.findUnique({ where: { id } });
        if (!existing) {
            res.status(404).json({ error: "Person not found" });
            return;
        }
        if (name !== undefined && !name.trim()) {
            res.status(400).json({ error: "name cannot be empty" });
            return;
        }
        const person = await db_1.default.person.update({
            where: { id },
            data: {
                ...(name !== undefined && { name: name.trim() }),
                ...(contactInfo !== undefined && { contactInfo: contactInfo?.trim() || null }),
            },
        });
        res.json(person);
    }
    catch (error) {
        console.error("Failed to update person:", error);
        res.status(500).json({ error: "Failed to update person" });
    }
});
router.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const existing = await db_1.default.person.findUnique({ where: { id } });
        if (!existing) {
            res.status(404).json({ error: "Person not found" });
            return;
        }
        await db_1.default.person.delete({ where: { id } });
        res.json({ success: true });
    }
    catch (error) {
        console.error("Failed to delete person:", error);
        res.status(500).json({ error: "Failed to delete person" });
    }
});
exports.default = router;
//# sourceMappingURL=people.js.map
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = __importDefault(require("../db"));
const router = (0, express_1.Router)();
router.get("/me", async (_req, res) => {
    try {
        const user = await db_1.default.user.findFirst();
        if (!user) {
            res.status(404).json({ error: "No user found" });
            return;
        }
        res.json(user);
    }
    catch (error) {
        console.error("Failed to fetch user:", error);
        res.status(500).json({ error: "Failed to fetch user" });
    }
});
exports.default = router;
//# sourceMappingURL=user.js.map
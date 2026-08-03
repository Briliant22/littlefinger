"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = __importDefault(require("./db"));
const CATEGORIES = [
    { name: "Groceries", icon: "shopping-cart" },
    { name: "Dining", icon: "utensils" },
    { name: "Transport", icon: "car" },
    { name: "Utilities", icon: "zap" },
    { name: "Entertainment", icon: "film" },
    { name: "Shopping", icon: "shopping-bag" },
    { name: "Health", icon: "heart" },
    { name: "Housing", icon: "home" },
    { name: "Travel", icon: "plane" },
    { name: "Subscriptions", icon: "repeat" },
    { name: "Other", icon: "more-horizontal" },
];
async function seed() {
    console.log("Seeding categories...");
    for (const category of CATEGORIES) {
        await db_1.default.category.upsert({
            where: { name: category.name },
            update: { icon: category.icon },
            create: category,
        });
    }
    const existingUser = await db_1.default.user.findFirst();
    if (!existingUser) {
        console.log("Creating default user...");
        await db_1.default.user.create({
            data: {
                name: "Default User",
                email: "default@littlefinger.app",
                defaultCurrency: "IDR",
            },
        });
    }
    console.log("Seeding complete.");
    await db_1.default.$disconnect();
}
seed().catch((e) => {
    console.error("Seed failed:", e);
    db_1.default.$disconnect();
    process.exit(1);
});
//# sourceMappingURL=seed.js.map
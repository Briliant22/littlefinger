import prisma from "./db";

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
    await prisma.category.upsert({
      where: { name: category.name },
      update: { icon: category.icon },
      create: category,
    });
  }

  const existingUser = await prisma.user.findFirst();
  if (!existingUser) {
    console.log("Creating default user...");
    await prisma.user.create({
      data: {
        name: "Default User",
        email: "default@littlefinger.app",
        defaultCurrency: "IDR",
      },
    });
  }

  console.log("Seeding complete.");
  await prisma.$disconnect();
}

seed().catch((e) => {
  console.error("Seed failed:", e);
  prisma.$disconnect();
  process.exit(1);
});

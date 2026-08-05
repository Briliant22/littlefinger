-- CreateTable
CREATE TABLE "debts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "person_id" TEXT,
    "guest_name" TEXT,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "note" TEXT,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "debts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "debts_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "people" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

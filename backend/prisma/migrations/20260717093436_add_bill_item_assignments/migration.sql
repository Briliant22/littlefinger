-- CreateTable
CREATE TABLE "bill_item_assignments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bill_split_id" TEXT NOT NULL,
    "participant_id" TEXT NOT NULL,
    "item_index" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_price" REAL NOT NULL,
    "amount" REAL NOT NULL,
    "split_ratio" TEXT,
    CONSTRAINT "bill_item_assignments_bill_split_id_fkey" FOREIGN KEY ("bill_split_id") REFERENCES "bill_splits" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "bill_item_assignments_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "bill_participants" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

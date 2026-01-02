-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Variant" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "productId" INTEGER NOT NULL,
    "color" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "price" REAL NOT NULL,
    "frontImage" TEXT NOT NULL,
    "backImage" TEXT NOT NULL,
    "printAreaTop" REAL NOT NULL,
    "printAreaLeft" REAL NOT NULL,
    "printAreaWidth" REAL NOT NULL,
    "printAreaHeight" REAL NOT NULL,
    CONSTRAINT "Variant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Variant" ("backImage", "color", "frontImage", "id", "price", "printAreaHeight", "printAreaLeft", "printAreaTop", "printAreaWidth", "productId", "size", "stock") SELECT "backImage", "color", "frontImage", "id", "price", "printAreaHeight", "printAreaLeft", "printAreaTop", "printAreaWidth", "productId", "size", "stock" FROM "Variant";
DROP TABLE "Variant";
ALTER TABLE "new_Variant" RENAME TO "Variant";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateTable
CREATE TABLE "Token" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "userId" TEXT,
    "expiresIn" INTEGER NOT NULL DEFAULT 21600,
    "savedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "zipCode" TEXT NOT NULL DEFAULT '01001000',
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Item" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "mlb" TEXT NOT NULL,
    "proprio" BOOLEAN NOT NULL DEFAULT true,
    "variacaoIds" TEXT,
    "sku" TEXT,
    "variacaoSkus" TEXT,
    "marca" TEXT,
    "titulo" TEXT NOT NULL DEFAULT '',
    "precoDe" REAL NOT NULL DEFAULT 0,
    "precoPor" REAL NOT NULL DEFAULT 0,
    "frete" REAL,
    "freteAnterior" REAL,
    "freteMudou" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT,
    "dataCriacao" TEXT,
    "tipoAnuncio" TEXT,
    "visitas" INTEGER NOT NULL DEFAULT 0,
    "vendas" INTEGER NOT NULL DEFAULT 0,
    "estoque" INTEGER NOT NULL DEFAULT 0,
    "catalogo" BOOLEAN NOT NULL DEFAULT false,
    "full" BOOLEAN NOT NULL DEFAULT false,
    "categoria1" TEXT,
    "categoria2" TEXT,
    "categoria3" TEXT,
    "categoria4" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ShippingHistory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "itemId" INTEGER NOT NULL,
    "mlb" TEXT NOT NULL,
    "cost" REAL NOT NULL,
    "capturedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ShippingHistory_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Item_mlb_key" ON "Item"("mlb");

-- CreateIndex
CREATE INDEX "Item_titulo_idx" ON "Item"("titulo");

-- CreateIndex
CREATE INDEX "Item_frete_idx" ON "Item"("frete");

-- CreateIndex
CREATE INDEX "ShippingHistory_mlb_idx" ON "ShippingHistory"("mlb");

-- CreateIndex
CREATE INDEX "ShippingHistory_capturedAt_idx" ON "ShippingHistory"("capturedAt");

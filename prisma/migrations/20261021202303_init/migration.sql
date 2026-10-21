-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "storeName" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "MlAccount" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "appId" TEXT,
    "appSecret" TEXT,
    "redirectUri" TEXT,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "mlUserId" TEXT,
    "expiresIn" INTEGER NOT NULL DEFAULT 21600,
    "savedAt" DATETIME,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MlAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "zipCode" TEXT NOT NULL DEFAULT '01001000',
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BusinessRule" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "icms" REAL NOT NULL DEFAULT 0,
    "ipi" REAL NOT NULL DEFAULT 0,
    "difal" REAL NOT NULL DEFAULT 0,
    "custoOperacional" REAL NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BusinessRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Item" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
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
    "comissao" REAL,
    "comissaoPct" REAL,
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
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Item_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "MlAccount_userId_key" ON "MlAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Settings_userId_key" ON "Settings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessRule_userId_key" ON "BusinessRule"("userId");

-- CreateIndex
CREATE INDEX "Item_userId_idx" ON "Item"("userId");

-- CreateIndex
CREATE INDEX "Item_titulo_idx" ON "Item"("titulo");

-- CreateIndex
CREATE INDEX "Item_frete_idx" ON "Item"("frete");

-- CreateIndex
CREATE UNIQUE INDEX "Item_userId_mlb_key" ON "Item"("userId", "mlb");

-- CreateIndex
CREATE INDEX "ShippingHistory_mlb_idx" ON "ShippingHistory"("mlb");

-- CreateIndex
CREATE INDEX "ShippingHistory_capturedAt_idx" ON "ShippingHistory"("capturedAt");

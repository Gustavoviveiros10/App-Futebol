-- Contador de uso do Google e cache de quadras (aditivo)
CREATE TABLE "ApiUsage" (
    "month" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ApiUsage_pkey" PRIMARY KEY ("month","sku")
);

CREATE TABLE "CourtCache" (
    "cell" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CourtCache_pkey" PRIMARY KEY ("cell")
);

-- Endereço e coordenadas para o mapa do "Quero jogar" (aditivo)
ALTER TABLE "Group" ADD COLUMN "address" TEXT, ADD COLUMN "lat" DOUBLE PRECISION, ADD COLUMN "lng" DOUBLE PRECISION;
ALTER TABLE "Match" ADD COLUMN "address" TEXT, ADD COLUMN "lat" DOUBLE PRECISION, ADD COLUMN "lng" DOUBLE PRECISION;

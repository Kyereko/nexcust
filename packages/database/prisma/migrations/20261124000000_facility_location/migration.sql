-- Map position of each station and prison establishment, with what the point represents.
ALTER TABLE "facilities" ADD COLUMN "latitude" DOUBLE PRECISION, ADD COLUMN "longitude" DOUBLE PRECISION, ADD COLUMN "coordPrecision" TEXT;
ALTER TABLE "facilities" ADD CONSTRAINT "facilities_coordinates_pair" CHECK (("latitude" IS NULL) = ("longitude" IS NULL));
ALTER TABLE "facilities" ADD CONSTRAINT "facilities_coordinates_ghana" CHECK ("latitude" IS NULL OR ("latitude" BETWEEN 4.4 AND 11.3 AND "longitude" BETWEEN -3.4 AND 1.3));

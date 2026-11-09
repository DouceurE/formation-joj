CREATE TABLE "trips" (
	"id" uuid PRIMARY KEY NOT NULL,
	"vehicle" varchar(20) NOT NULL,
	"departure_place" varchar(100) NOT NULL,
	"site" varchar(20) NOT NULL,
	"departure_at" timestamp (3) with time zone NOT NULL,
	"seats" integer NOT NULL,
	"price_fcfa" integer NOT NULL,
	"driver_phone" varchar(20) NOT NULL,
	"management_code" varchar(8) NOT NULL,
	"created_at" timestamp (3) with time zone NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "trips_management_code_key" ON "trips" USING btree ("management_code");
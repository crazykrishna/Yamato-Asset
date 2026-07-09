BEGIN TRANSACTION;
CREATE TABLE asset (
	asset_name TEXT, 
	category TEXT, 
	price BIGINT
);
INSERT INTO "asset" VALUES('hp ','laptop',20000);
INSERT INTO "asset" VALUES('lenovo','desktop',25000);
INSERT INTO "asset" VALUES('intel i7 1350 H','processor',35000);
INSERT INTO "asset" VALUES('hp ','laptop',20000);
INSERT INTO "asset" VALUES('lenovo','desktop',25000);
INSERT INTO "asset" VALUES('intel i7 1350 H','processor',35000);
COMMIT;

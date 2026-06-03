UPDATE kedb
SET opis_greske = COALESCE(opis_greske, '')
WHERE opis_greske IS NULL;

ALTER TABLE kedb
ALTER COLUMN opis_greske SET DEFAULT '';

ALTER TABLE kedb
ALTER COLUMN opis_greske DROP NOT NULL;

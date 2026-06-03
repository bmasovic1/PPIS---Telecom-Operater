ALTER TABLE kedb
ADD COLUMN IF NOT EXISTS opis_greske TEXT;

COMMENT ON COLUMN kedb.opis_greske IS 'Opis greške / summary description for the KEDB entry.';


-- Correct Bahrain-Victorious bib numbers to match official PCS startlist
-- Use negative temp values to avoid unique constraint conflicts
UPDATE riders SET start_number = -14 WHERE name = 'Fran Miholjevic';
UPDATE riders SET start_number = -13 WHERE name = 'Robert Stannard';
UPDATE riders SET start_number = -15 WHERE name = 'Afonso Eulalio';
UPDATE riders SET start_number = -16 WHERE name = 'Mathijs Paasschens';
UPDATE riders SET start_number = -17 WHERE name = 'Alec Segaert';

UPDATE riders SET start_number = 13 WHERE name = 'Fran Miholjevic';
UPDATE riders SET start_number = 17 WHERE name = 'Robert Stannard';
UPDATE riders SET start_number = 14 WHERE name = 'Afonso Eulalio';
UPDATE riders SET start_number = 15 WHERE name = 'Mathijs Paasschens';
UPDATE riders SET start_number = 16 WHERE name = 'Alec Segaert';

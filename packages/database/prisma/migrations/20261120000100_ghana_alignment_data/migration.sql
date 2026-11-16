-- Data alignment for existing records (separate migration: new enum values must be committed before use).

-- Warrants: move legacy values to the Act 30 form-aligned types and record the form number.
UPDATE court_orders SET type = 'REMAND_COMMITMENT_FOR_TRIAL', "formNumber" = 'Form 14' WHERE type = 'REMAND_WARRANT';
UPDATE court_orders SET type = 'COMMITMENT_TO_UNDERGO_SENTENCE', "formNumber" = 'Form 21' WHERE type = 'COMMITTAL_WARRANT';

-- The 48-hour clock runs from arrest (Constitution art. 14(3); Act 30 s.15(1)), not from booking into cells.
UPDATE police_custody_episodes e SET "courtDeadlineAt" = a."arrestedAt" + interval '48 hours'
FROM arrests a WHERE a.id = e."arrestId";

-- Juvenile flag for existing episodes: under 18 on the day of arrest.
UPDATE police_custody_episodes e SET "isJuvenile" = true, "juvenileDetentionOrderDueAt" = a."arrestedAt" + interval '48 hours'
FROM arrests a JOIN persons p ON p.id = a."personId"
WHERE a.id = e."arrestId" AND p."dateOfBirth" IS NOT NULL AND a."arrestedAt" < (p."dateOfBirth" + interval '18 years');

-- Sentences start on and include the day pronounced (Act 30 s.315(2)).
UPDATE sentence_records SET "sentenceStartDate" = "sentencedAt" WHERE "sentenceStartDate" IS NULL;

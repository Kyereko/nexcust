-- Integrity rules that Prisma's schema language cannot express.

-- 1. audit_events is append-only: no UPDATE, no DELETE, even by the application role.
CREATE OR REPLACE FUNCTION j1_block_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION '% is append-only: % is not permitted', TG_TABLE_NAME, TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_events_append_only
  BEFORE UPDATE OR DELETE ON audit_events
  FOR EACH ROW EXECUTE FUNCTION j1_block_mutation();

-- 2. Movement log is immutable history.
CREATE TRIGGER custody_movements_append_only
  BEFORE UPDATE OR DELETE ON custody_movements
  FOR EACH ROW EXECUTE FUNCTION j1_block_mutation();

-- 3. A person can have at most one OPEN custody episode per institution.
CREATE UNIQUE INDEX police_custody_one_open_per_person
  ON police_custody_episodes ("personId") WHERE status = 'IN_CUSTODY';
CREATE UNIQUE INDEX prison_custody_one_open_per_prisoner
  ON prison_custody_episodes ("prisonerRecordId") WHERE status IN ('IN_CUSTODY', 'IN_TRANSIT');

-- 4. At most one current (open-ended, confirmed) posting per officer.
CREATE UNIQUE INDEX police_posting_one_current
  ON police_postings ("personnelId") WHERE status = 'CONFIRMED' AND "effectiveTo" IS NULL;
CREATE UNIQUE INDEX prison_posting_one_current
  ON prison_postings ("personnelId") WHERE status = 'CONFIRMED' AND "effectiveTo" IS NULL;

-- 5. Sanity checks.
ALTER TABLE police_custody_episodes ADD CONSTRAINT police_custody_closed_after_open
  CHECK ("closedAt" IS NULL OR "closedAt" >= "detainedAt");
ALTER TABLE prison_transfers ADD CONSTRAINT prison_transfer_distinct_facilities
  CHECK ("fromFacilityId" <> "toFacilityId");
ALTER TABLE facilities ADD CONSTRAINT facility_capacity_non_negative
  CHECK (capacity IS NULL OR capacity >= 0);

-- 6. Name search support for the National Person Index.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX persons_name_trgm ON persons USING gin ((surname || ' ' || "otherNames") gin_trgm_ops);

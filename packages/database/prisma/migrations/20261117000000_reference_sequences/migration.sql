-- Human-readable reference numbers are drawn from sequences (gap-tolerant, concurrency-safe).
-- Start above the seeded ranges so demo records never collide.
CREATE SEQUENCE j1_person_seq START 100001;
CREATE SEQUENCE j1_arrest_seq START 100001;
CREATE SEQUENCE j1_custody_seq START 100001;
CREATE SEQUENCE j1_case_seq START 100001;
CREATE SEQUENCE j1_incident_seq START 100001;
CREATE SEQUENCE j1_prison_seq START 100001;
CREATE SEQUENCE j1_bgcheck_seq START 100001;

-- At most one posting in flight per officer.
CREATE UNIQUE INDEX police_posting_one_pending ON police_postings ("personnelId") WHERE status IN ('PROPOSED', 'APPROVED');
CREATE UNIQUE INDEX prison_posting_one_pending ON prison_postings ("personnelId") WHERE status IN ('PROPOSED', 'APPROVED');

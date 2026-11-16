-- At most one transfer in flight per custody episode.
CREATE UNIQUE INDEX prison_transfer_one_pending ON prison_transfers ("episodeId") WHERE status IN ('INITIATED', 'APPROVED', 'IN_TRANSIT');
-- A prisoner is enrolled in a programme at most once at a time.
CREATE UNIQUE INDEX rehab_enrollment_one_active ON rehabilitation_enrollments ("programmeId", "prisonerRecordId") WHERE status = 'ENROLLED';

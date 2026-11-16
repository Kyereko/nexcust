-- Map first-prototype clearance stages onto the portal-aligned flow.
UPDATE background_check_applications SET status = 'PAYMENT_CONFIRMED' WHERE status = 'VALIDATED';
UPDATE background_check_applications SET status = 'BIOMETRICS_CAPTURED', "biometricCaptureMode" = 'LIVE_SCAN_AT_CENTRE', "attendedAt" = "updatedAt" WHERE status = 'IDENTITY_VERIFIED';
UPDATE background_check_applications SET "criminalIdent" = 'NOT_IDENT' WHERE status IN ('RECORDS_SEARCHED', 'UNDER_REVIEW') AND "criminalIdent" IS NULL;
UPDATE background_check_reviews SET stage = 'PAYMENT_CONFIRMED' WHERE stage = 'VALIDATED';
UPDATE background_check_reviews SET stage = 'BIOMETRICS_CAPTURED' WHERE stage = 'IDENTITY_VERIFIED';

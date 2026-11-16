-- CreateEnum
CREATE TYPE "InstitutionCode" AS ENUM ('POLICE', 'PRISONS');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('VERIFIED', 'PROVISIONAL', 'UNCONFIRMED');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DISABLED');

-- CreateEnum
CREATE TYPE "Sex" AS ENUM ('MALE', 'FEMALE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "IdentifierType" AS ENUM ('GHANA_CARD', 'PASSPORT', 'DRIVERS_LICENCE', 'VOTER_ID', 'INSTITUTIONAL', 'OTHER');

-- CreateEnum
CREATE TYPE "AuditOutcome" AS ENUM ('SUCCESS', 'DENIED', 'FAILURE');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PersonnelStatus" AS ENUM ('ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'RETIRED', 'SEPARATED');

-- CreateEnum
CREATE TYPE "PostingStatus" AS ENUM ('PROPOSED', 'APPROVED', 'CONFIRMED', 'ENDED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('REPORTED', 'UNDER_REVIEW', 'CASE_OPENED', 'CLOSED');

-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('OPEN', 'UNDER_INVESTIGATION', 'FORWARDED_FOR_ADVICE', 'BEFORE_COURT', 'CLOSED');

-- CreateEnum
CREATE TYPE "CasePersonRole" AS ENUM ('SUSPECT', 'COMPLAINANT', 'VICTIM', 'WITNESS');

-- CreateEnum
CREATE TYPE "ChargeStatus" AS ENUM ('PROPOSED', 'FILED', 'WITHDRAWN', 'DISMISSED', 'ACQUITTED', 'CONVICTED');

-- CreateEnum
CREATE TYPE "PoliceCustodyStatus" AS ENUM ('IN_CUSTODY', 'RELEASED_ON_BAIL', 'TRANSFERRED_TO_COURT', 'REMANDED_TO_PRISON', 'RELEASED_NO_CHARGE', 'TRANSFERRED_STATION', 'CLOSED_OTHER');

-- CreateEnum
CREATE TYPE "CustodyMovementType" AS ENUM ('CELL_ASSIGNMENT', 'STATION_TRANSFER', 'COURT_APPEARANCE', 'MEDICAL', 'RETURN');

-- CreateEnum
CREATE TYPE "BackgroundCheckStatus" AS ENUM ('SUBMITTED', 'VALIDATED', 'IDENTITY_VERIFIED', 'RECORDS_SEARCHED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'CERTIFICATE_ISSUED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "CertificateStatus" AS ENUM ('VALID', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "CourtOrderType" AS ENUM ('REMAND_WARRANT', 'COMMITTAL_WARRANT', 'PRODUCTION_ORDER', 'BAIL_ORDER', 'RELEASE_ORDER', 'TRANSFER_ORDER', 'OTHER');

-- CreateEnum
CREATE TYPE "PrisonerClassification" AS ENUM ('REMAND', 'CONVICTED', 'CONDEMNED', 'CIVIL', 'OTHER');

-- CreateEnum
CREATE TYPE "PrisonCustodyStatus" AS ENUM ('IN_CUSTODY', 'IN_TRANSIT', 'RELEASED', 'DECEASED', 'ESCAPED');

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('INITIATED', 'APPROVED', 'IN_TRANSIT', 'RECEIVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReleaseType" AS ENUM ('SENTENCE_SERVED', 'BAIL', 'COURT_ORDER', 'ACQUITTAL', 'PARDON_OR_AMNESTY', 'FINE_PAID', 'OTHER');

-- CreateEnum
CREATE TYPE "ReleaseStatus" AS ENUM ('INITIATED', 'APPROVED', 'COMPLETED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('ENROLLED', 'COMPLETED', 'WITHDRAWN');

-- CreateTable
CREATE TABLE "institutions" (
    "id" UUID NOT NULL,
    "code" "InstitutionCode" NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "institutions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regions" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "regions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_unit_types" (
    "id" UUID NOT NULL,
    "institutionId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'UNCONFIRMED',
    "sourceRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_unit_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizational_units" (
    "id" UUID NOT NULL,
    "institutionId" UUID NOT NULL,
    "typeId" UUID NOT NULL,
    "parentId" UUID,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "isSynthetic" BOOLEAN NOT NULL DEFAULT true,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'UNCONFIRMED',
    "sourceRef" TEXT,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizational_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facility_types" (
    "id" UUID NOT NULL,
    "institutionId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'UNCONFIRMED',
    "sourceRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "facility_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facilities" (
    "id" UUID NOT NULL,
    "institutionId" UUID NOT NULL,
    "orgUnitId" UUID NOT NULL,
    "facilityTypeId" UUID NOT NULL,
    "regionId" UUID,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "town" TEXT,
    "capacity" INTEGER,
    "functions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "operationalStatus" TEXT NOT NULL DEFAULT 'OPERATIONAL',
    "isSynthetic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "facilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "housing_units" (
    "id" UUID NOT NULL,
    "facilityId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "housing_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ranks" (
    "id" UUID NOT NULL,
    "institutionId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "abbreviation" TEXT,
    "category" TEXT NOT NULL,
    "seniorityOrder" INTEGER NOT NULL,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PROVISIONAL',
    "sourceRef" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ranks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" UUID NOT NULL,
    "institutionId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "isCommand" BOOLEAN NOT NULL DEFAULT false,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'UNCONFIRMED',
    "sourceRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "institutionId" UUID,
    "scopeLevel" TEXT NOT NULL,
    "workspace" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "roleId" UUID NOT NULL,
    "permissionId" UUID NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "user_role_assignments" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "roleId" UUID NOT NULL,
    "orgUnitId" UUID,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_role_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "persons" (
    "id" UUID NOT NULL,
    "indexNumber" TEXT NOT NULL,
    "surname" TEXT NOT NULL,
    "otherNames" TEXT NOT NULL,
    "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sex" "Sex" NOT NULL DEFAULT 'UNKNOWN',
    "dateOfBirth" DATE,
    "dobEstimated" BOOLEAN NOT NULL DEFAULT false,
    "nationality" TEXT,
    "hometown" TEXT,
    "isSynthetic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "persons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "person_identifiers" (
    "id" UUID NOT NULL,
    "personId" UUID NOT NULL,
    "type" "IdentifierType" NOT NULL,
    "value" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "person_identifiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" UUID NOT NULL,
    "ownerType" TEXT NOT NULL,
    "ownerId" UUID NOT NULL,
    "institutionId" UUID,
    "title" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "uploadedById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" UUID NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorId" UUID,
    "actorEmail" TEXT,
    "institution" TEXT,
    "action" TEXT NOT NULL,
    "outcome" "AuditOutcome" NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "permission" TEXT,
    "ipAddress" TEXT,
    "requestMethod" TEXT,
    "requestPath" TEXT,
    "detail" JSONB,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_requests" (
    "id" UUID NOT NULL,
    "institution" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" UUID NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "requestedById" UUID NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedById" UUID,
    "decidedAt" TIMESTAMP(3),
    "reason" TEXT,
    "payload" JSONB,

    CONSTRAINT "approval_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_exchange_requests" (
    "id" UUID NOT NULL,
    "requestingInstitution" TEXT NOT NULL,
    "providingInstitution" TEXT NOT NULL,
    "personId" UUID NOT NULL,
    "purpose" TEXT NOT NULL,
    "legalBasis" TEXT,
    "requestedById" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'FULFILLED',
    "disclosedSummary" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "data_exchange_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "police_personnel" (
    "id" UUID NOT NULL,
    "serviceNumber" TEXT NOT NULL,
    "surname" TEXT NOT NULL,
    "otherNames" TEXT NOT NULL,
    "sex" "Sex" NOT NULL DEFAULT 'UNKNOWN',
    "dateOfBirth" DATE,
    "enlistmentDate" DATE,
    "status" "PersonnelStatus" NOT NULL DEFAULT 'ACTIVE',
    "currentRankId" UUID NOT NULL,
    "currentOrgUnitId" UUID NOT NULL,
    "isSynthetic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "police_personnel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "police_postings" (
    "id" UUID NOT NULL,
    "personnelId" UUID NOT NULL,
    "fromOrgUnitId" UUID,
    "toOrgUnitId" UUID NOT NULL,
    "status" "PostingStatus" NOT NULL DEFAULT 'PROPOSED',
    "reason" TEXT,
    "initiatedById" UUID,
    "approvedById" UUID,
    "approvedAt" TIMESTAMP(3),
    "confirmedById" UUID,
    "confirmedAt" TIMESTAMP(3),
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "police_postings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "police_rank_history" (
    "id" UUID NOT NULL,
    "personnelId" UUID NOT NULL,
    "rankId" UUID NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,
    "authorityRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "police_rank_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "police_command_assignments" (
    "id" UUID NOT NULL,
    "personnelId" UUID NOT NULL,
    "appointmentId" UUID NOT NULL,
    "orgUnitId" UUID NOT NULL,
    "acting" BOOLEAN NOT NULL DEFAULT false,
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,
    "authorityRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "police_command_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "police_incidents" (
    "id" UUID NOT NULL,
    "reference" TEXT NOT NULL,
    "facilityId" UUID NOT NULL,
    "reportedAt" TIMESTAMP(3) NOT NULL,
    "category" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "location" TEXT,
    "status" "IncidentStatus" NOT NULL DEFAULT 'REPORTED',
    "recordedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "police_incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "police_cases" (
    "id" UUID NOT NULL,
    "caseNumber" TEXT NOT NULL,
    "facilityId" UUID NOT NULL,
    "incidentId" UUID,
    "title" TEXT NOT NULL,
    "offenceCategory" TEXT NOT NULL,
    "status" "CaseStatus" NOT NULL DEFAULT 'OPEN',
    "openedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),
    "investigatorId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "police_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "police_case_persons" (
    "id" UUID NOT NULL,
    "caseId" UUID NOT NULL,
    "personId" UUID NOT NULL,
    "role" "CasePersonRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "police_case_persons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "arrests" (
    "id" UUID NOT NULL,
    "reference" TEXT NOT NULL,
    "personId" UUID NOT NULL,
    "facilityId" UUID NOT NULL,
    "caseId" UUID,
    "arrestedAt" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "suspectedOffence" TEXT NOT NULL,
    "legalAuthority" TEXT,
    "arrestingOfficerId" UUID,
    "recordedById" UUID,
    "voidedAt" TIMESTAMP(3),
    "voidReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "arrests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "charges" (
    "id" UUID NOT NULL,
    "caseId" UUID NOT NULL,
    "arrestId" UUID,
    "personId" UUID NOT NULL,
    "offence" TEXT NOT NULL,
    "statuteRef" TEXT,
    "status" "ChargeStatus" NOT NULL DEFAULT 'PROPOSED',
    "filedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "charges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conviction_records" (
    "id" UUID NOT NULL,
    "personId" UUID NOT NULL,
    "caseId" UUID,
    "chargeId" UUID,
    "court" TEXT NOT NULL,
    "courtCaseRef" TEXT,
    "offence" TEXT NOT NULL,
    "convictedAt" DATE NOT NULL,
    "sentenceSummary" TEXT,
    "sourceDocumentId" UUID,
    "recordedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conviction_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "police_custody_episodes" (
    "id" UUID NOT NULL,
    "reference" TEXT NOT NULL,
    "personId" UUID NOT NULL,
    "arrestId" UUID NOT NULL,
    "facilityId" UUID NOT NULL,
    "status" "PoliceCustodyStatus" NOT NULL DEFAULT 'IN_CUSTODY',
    "detainedAt" TIMESTAMP(3) NOT NULL,
    "courtDeadlineAt" TIMESTAMP(3),
    "legalAuthority" TEXT,
    "cellRef" TEXT,
    "openedById" UUID,
    "reviewedById" UUID,
    "reviewedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "closedById" UUID,
    "dispositionAuthorizedById" UUID,
    "dispositionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "police_custody_episodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custody_movements" (
    "id" UUID NOT NULL,
    "episodeId" UUID NOT NULL,
    "type" "CustodyMovementType" NOT NULL,
    "fromFacilityId" UUID,
    "toFacilityId" UUID,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "recordedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "custody_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "background_check_applications" (
    "id" UUID NOT NULL,
    "reference" TEXT NOT NULL,
    "applicantUserId" UUID NOT NULL,
    "personId" UUID,
    "fullName" TEXT NOT NULL,
    "dateOfBirth" DATE NOT NULL,
    "identifierType" "IdentifierType" NOT NULL,
    "identifierValue" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "status" "BackgroundCheckStatus" NOT NULL DEFAULT 'SUBMITTED',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "background_check_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "background_check_reviews" (
    "id" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "stage" "BackgroundCheckStatus" NOT NULL,
    "reviewerId" UUID NOT NULL,
    "findings" JSONB,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "background_check_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clearance_certificates" (
    "id" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "certificateNumber" TEXT NOT NULL,
    "verificationCode" TEXT NOT NULL,
    "status" "CertificateStatus" NOT NULL DEFAULT 'VALID',
    "resultSummary" TEXT NOT NULL,
    "issuedById" UUID NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "clearance_certificates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prison_personnel" (
    "id" UUID NOT NULL,
    "serviceNumber" TEXT NOT NULL,
    "surname" TEXT NOT NULL,
    "otherNames" TEXT NOT NULL,
    "sex" "Sex" NOT NULL DEFAULT 'UNKNOWN',
    "dateOfBirth" DATE,
    "enlistmentDate" DATE,
    "status" "PersonnelStatus" NOT NULL DEFAULT 'ACTIVE',
    "currentRankId" UUID NOT NULL,
    "currentOrgUnitId" UUID NOT NULL,
    "isSynthetic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prison_personnel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prison_postings" (
    "id" UUID NOT NULL,
    "personnelId" UUID NOT NULL,
    "fromOrgUnitId" UUID,
    "toOrgUnitId" UUID NOT NULL,
    "status" "PostingStatus" NOT NULL DEFAULT 'PROPOSED',
    "reason" TEXT,
    "initiatedById" UUID,
    "approvedById" UUID,
    "approvedAt" TIMESTAMP(3),
    "confirmedById" UUID,
    "confirmedAt" TIMESTAMP(3),
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prison_postings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prison_rank_history" (
    "id" UUID NOT NULL,
    "personnelId" UUID NOT NULL,
    "rankId" UUID NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,
    "authorityRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prison_rank_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prison_command_assignments" (
    "id" UUID NOT NULL,
    "personnelId" UUID NOT NULL,
    "appointmentId" UUID NOT NULL,
    "orgUnitId" UUID NOT NULL,
    "acting" BOOLEAN NOT NULL DEFAULT false,
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,
    "authorityRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prison_command_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prisoner_records" (
    "id" UUID NOT NULL,
    "prisonerNumber" TEXT NOT NULL,
    "personId" UUID NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prisoner_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "court_orders" (
    "id" UUID NOT NULL,
    "personId" UUID NOT NULL,
    "type" "CourtOrderType" NOT NULL,
    "court" TEXT NOT NULL,
    "orderRef" TEXT NOT NULL,
    "issuedAt" DATE NOT NULL,
    "returnDate" DATE,
    "details" TEXT,
    "verifiedById" UUID,
    "verifiedAt" TIMESTAMP(3),
    "documentId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "court_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prison_admissions" (
    "id" UUID NOT NULL,
    "reference" TEXT NOT NULL,
    "prisonerRecordId" UUID NOT NULL,
    "facilityId" UUID NOT NULL,
    "courtOrderId" UUID NOT NULL,
    "classification" "PrisonerClassification" NOT NULL,
    "admittedAt" TIMESTAMP(3) NOT NULL,
    "identityCheckedById" UUID,
    "recordedById" UUID,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prison_admissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prison_custody_episodes" (
    "id" UUID NOT NULL,
    "prisonerRecordId" UUID NOT NULL,
    "admissionId" UUID NOT NULL,
    "facilityId" UUID NOT NULL,
    "housingUnitId" UUID,
    "classification" "PrisonerClassification" NOT NULL,
    "status" "PrisonCustodyStatus" NOT NULL DEFAULT 'IN_CUSTODY',
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prison_custody_episodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prison_transfers" (
    "id" UUID NOT NULL,
    "reference" TEXT NOT NULL,
    "episodeId" UUID NOT NULL,
    "fromFacilityId" UUID NOT NULL,
    "toFacilityId" UUID NOT NULL,
    "courtOrderId" UUID,
    "reason" TEXT NOT NULL,
    "status" "TransferStatus" NOT NULL DEFAULT 'INITIATED',
    "initiatedById" UUID,
    "approvedById" UUID,
    "approvedAt" TIMESTAMP(3),
    "dispatchedAt" TIMESTAMP(3),
    "receivedById" UUID,
    "receivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prison_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sentence_records" (
    "id" UUID NOT NULL,
    "prisonerRecordId" UUID NOT NULL,
    "courtOrderId" UUID NOT NULL,
    "offence" TEXT NOT NULL,
    "sentenceText" TEXT NOT NULL,
    "termMonths" INTEGER,
    "sentencedAt" DATE NOT NULL,
    "earliestReleaseDate" DATE,
    "latestReleaseDate" DATE,
    "recordedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sentence_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prison_releases" (
    "id" UUID NOT NULL,
    "reference" TEXT NOT NULL,
    "episodeId" UUID NOT NULL,
    "facilityId" UUID NOT NULL,
    "type" "ReleaseType" NOT NULL,
    "courtOrderId" UUID,
    "legalAuthority" TEXT NOT NULL,
    "status" "ReleaseStatus" NOT NULL DEFAULT 'INITIATED',
    "initiatedById" UUID,
    "approvedById" UUID,
    "approvedAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prison_releases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prison_incidents" (
    "id" UUID NOT NULL,
    "reference" TEXT NOT NULL,
    "facilityId" UUID NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "category" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'LOW',
    "recordedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prison_incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rehabilitation_programmes" (
    "id" UUID NOT NULL,
    "facilityId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "capacity" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rehabilitation_programmes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rehabilitation_enrollments" (
    "id" UUID NOT NULL,
    "programmeId" UUID NOT NULL,
    "prisonerRecordId" UUID NOT NULL,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'ENROLLED',
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rehabilitation_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "institutions_code_key" ON "institutions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "regions_code_key" ON "regions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "org_unit_types_institutionId_code_key" ON "org_unit_types"("institutionId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "organizational_units_code_key" ON "organizational_units"("code");

-- CreateIndex
CREATE INDEX "organizational_units_path_idx" ON "organizational_units"("path");

-- CreateIndex
CREATE INDEX "organizational_units_institutionId_typeId_idx" ON "organizational_units"("institutionId", "typeId");

-- CreateIndex
CREATE UNIQUE INDEX "facility_types_institutionId_code_key" ON "facility_types"("institutionId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "facilities_code_key" ON "facilities"("code");

-- CreateIndex
CREATE INDEX "facilities_orgUnitId_idx" ON "facilities"("orgUnitId");

-- CreateIndex
CREATE INDEX "facilities_institutionId_idx" ON "facilities"("institutionId");

-- CreateIndex
CREATE UNIQUE INDEX "housing_units_facilityId_code_key" ON "housing_units"("facilityId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "ranks_institutionId_code_key" ON "ranks"("institutionId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "appointments_institutionId_code_key" ON "appointments"("institutionId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_tokenHash_key" ON "sessions"("tokenHash");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "roles_code_key" ON "roles"("code");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_code_key" ON "permissions"("code");

-- CreateIndex
CREATE INDEX "user_role_assignments_userId_idx" ON "user_role_assignments"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "persons_indexNumber_key" ON "persons"("indexNumber");

-- CreateIndex
CREATE INDEX "persons_surname_otherNames_idx" ON "persons"("surname", "otherNames");

-- CreateIndex
CREATE INDEX "person_identifiers_personId_idx" ON "person_identifiers"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "person_identifiers_type_value_key" ON "person_identifiers"("type", "value");

-- CreateIndex
CREATE INDEX "documents_ownerType_ownerId_idx" ON "documents"("ownerType", "ownerId");

-- CreateIndex
CREATE INDEX "audit_events_occurredAt_idx" ON "audit_events"("occurredAt");

-- CreateIndex
CREATE INDEX "audit_events_actorId_idx" ON "audit_events"("actorId");

-- CreateIndex
CREATE INDEX "audit_events_action_outcome_idx" ON "audit_events"("action", "outcome");

-- CreateIndex
CREATE INDEX "approval_requests_entityType_entityId_idx" ON "approval_requests"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "approval_requests_status_idx" ON "approval_requests"("status");

-- CreateIndex
CREATE INDEX "data_exchange_requests_personId_idx" ON "data_exchange_requests"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "police_personnel_serviceNumber_key" ON "police_personnel"("serviceNumber");

-- CreateIndex
CREATE INDEX "police_personnel_currentOrgUnitId_idx" ON "police_personnel"("currentOrgUnitId");

-- CreateIndex
CREATE INDEX "police_postings_personnelId_idx" ON "police_postings"("personnelId");

-- CreateIndex
CREATE INDEX "police_rank_history_personnelId_idx" ON "police_rank_history"("personnelId");

-- CreateIndex
CREATE INDEX "police_command_assignments_orgUnitId_idx" ON "police_command_assignments"("orgUnitId");

-- CreateIndex
CREATE UNIQUE INDEX "police_incidents_reference_key" ON "police_incidents"("reference");

-- CreateIndex
CREATE INDEX "police_incidents_facilityId_idx" ON "police_incidents"("facilityId");

-- CreateIndex
CREATE UNIQUE INDEX "police_cases_caseNumber_key" ON "police_cases"("caseNumber");

-- CreateIndex
CREATE INDEX "police_cases_facilityId_idx" ON "police_cases"("facilityId");

-- CreateIndex
CREATE INDEX "police_case_persons_personId_idx" ON "police_case_persons"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "police_case_persons_caseId_personId_role_key" ON "police_case_persons"("caseId", "personId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "arrests_reference_key" ON "arrests"("reference");

-- CreateIndex
CREATE INDEX "arrests_personId_idx" ON "arrests"("personId");

-- CreateIndex
CREATE INDEX "arrests_facilityId_idx" ON "arrests"("facilityId");

-- CreateIndex
CREATE INDEX "charges_personId_idx" ON "charges"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "conviction_records_chargeId_key" ON "conviction_records"("chargeId");

-- CreateIndex
CREATE INDEX "conviction_records_personId_idx" ON "conviction_records"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "police_custody_episodes_reference_key" ON "police_custody_episodes"("reference");

-- CreateIndex
CREATE INDEX "police_custody_episodes_facilityId_status_idx" ON "police_custody_episodes"("facilityId", "status");

-- CreateIndex
CREATE INDEX "police_custody_episodes_personId_idx" ON "police_custody_episodes"("personId");

-- CreateIndex
CREATE INDEX "custody_movements_episodeId_idx" ON "custody_movements"("episodeId");

-- CreateIndex
CREATE UNIQUE INDEX "background_check_applications_reference_key" ON "background_check_applications"("reference");

-- CreateIndex
CREATE INDEX "background_check_applications_status_idx" ON "background_check_applications"("status");

-- CreateIndex
CREATE INDEX "background_check_applications_applicantUserId_idx" ON "background_check_applications"("applicantUserId");

-- CreateIndex
CREATE INDEX "background_check_reviews_applicationId_idx" ON "background_check_reviews"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "clearance_certificates_applicationId_key" ON "clearance_certificates"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "clearance_certificates_certificateNumber_key" ON "clearance_certificates"("certificateNumber");

-- CreateIndex
CREATE UNIQUE INDEX "clearance_certificates_verificationCode_key" ON "clearance_certificates"("verificationCode");

-- CreateIndex
CREATE UNIQUE INDEX "prison_personnel_serviceNumber_key" ON "prison_personnel"("serviceNumber");

-- CreateIndex
CREATE INDEX "prison_personnel_currentOrgUnitId_idx" ON "prison_personnel"("currentOrgUnitId");

-- CreateIndex
CREATE INDEX "prison_postings_personnelId_idx" ON "prison_postings"("personnelId");

-- CreateIndex
CREATE INDEX "prison_rank_history_personnelId_idx" ON "prison_rank_history"("personnelId");

-- CreateIndex
CREATE INDEX "prison_command_assignments_orgUnitId_idx" ON "prison_command_assignments"("orgUnitId");

-- CreateIndex
CREATE UNIQUE INDEX "prisoner_records_prisonerNumber_key" ON "prisoner_records"("prisonerNumber");

-- CreateIndex
CREATE UNIQUE INDEX "prisoner_records_personId_key" ON "prisoner_records"("personId");

-- CreateIndex
CREATE INDEX "court_orders_personId_idx" ON "court_orders"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "prison_admissions_reference_key" ON "prison_admissions"("reference");

-- CreateIndex
CREATE INDEX "prison_admissions_facilityId_idx" ON "prison_admissions"("facilityId");

-- CreateIndex
CREATE UNIQUE INDEX "prison_custody_episodes_admissionId_key" ON "prison_custody_episodes"("admissionId");

-- CreateIndex
CREATE INDEX "prison_custody_episodes_facilityId_status_idx" ON "prison_custody_episodes"("facilityId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "prison_transfers_reference_key" ON "prison_transfers"("reference");

-- CreateIndex
CREATE INDEX "prison_transfers_fromFacilityId_idx" ON "prison_transfers"("fromFacilityId");

-- CreateIndex
CREATE INDEX "prison_transfers_toFacilityId_idx" ON "prison_transfers"("toFacilityId");

-- CreateIndex
CREATE INDEX "sentence_records_prisonerRecordId_idx" ON "sentence_records"("prisonerRecordId");

-- CreateIndex
CREATE UNIQUE INDEX "prison_releases_reference_key" ON "prison_releases"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "prison_releases_episodeId_key" ON "prison_releases"("episodeId");

-- CreateIndex
CREATE INDEX "prison_releases_facilityId_idx" ON "prison_releases"("facilityId");

-- CreateIndex
CREATE UNIQUE INDEX "prison_incidents_reference_key" ON "prison_incidents"("reference");

-- CreateIndex
CREATE INDEX "prison_incidents_facilityId_idx" ON "prison_incidents"("facilityId");

-- CreateIndex
CREATE INDEX "rehabilitation_enrollments_prisonerRecordId_idx" ON "rehabilitation_enrollments"("prisonerRecordId");

-- AddForeignKey
ALTER TABLE "org_unit_types" ADD CONSTRAINT "org_unit_types_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organizational_units" ADD CONSTRAINT "organizational_units_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organizational_units" ADD CONSTRAINT "organizational_units_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "org_unit_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organizational_units" ADD CONSTRAINT "organizational_units_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "organizational_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facility_types" ADD CONSTRAINT "facility_types_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facilities" ADD CONSTRAINT "facilities_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facilities" ADD CONSTRAINT "facilities_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES "organizational_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facilities" ADD CONSTRAINT "facilities_facilityTypeId_fkey" FOREIGN KEY ("facilityTypeId") REFERENCES "facility_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facilities" ADD CONSTRAINT "facilities_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "regions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "housing_units" ADD CONSTRAINT "housing_units_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ranks" ADD CONSTRAINT "ranks_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES "organizational_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_identifiers" ADD CONSTRAINT "person_identifiers_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "police_personnel" ADD CONSTRAINT "police_personnel_currentRankId_fkey" FOREIGN KEY ("currentRankId") REFERENCES "ranks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "police_personnel" ADD CONSTRAINT "police_personnel_currentOrgUnitId_fkey" FOREIGN KEY ("currentOrgUnitId") REFERENCES "organizational_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "police_postings" ADD CONSTRAINT "police_postings_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES "police_personnel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "police_postings" ADD CONSTRAINT "police_postings_fromOrgUnitId_fkey" FOREIGN KEY ("fromOrgUnitId") REFERENCES "organizational_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "police_postings" ADD CONSTRAINT "police_postings_toOrgUnitId_fkey" FOREIGN KEY ("toOrgUnitId") REFERENCES "organizational_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "police_rank_history" ADD CONSTRAINT "police_rank_history_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES "police_personnel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "police_rank_history" ADD CONSTRAINT "police_rank_history_rankId_fkey" FOREIGN KEY ("rankId") REFERENCES "ranks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "police_command_assignments" ADD CONSTRAINT "police_command_assignments_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES "police_personnel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "police_command_assignments" ADD CONSTRAINT "police_command_assignments_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "police_command_assignments" ADD CONSTRAINT "police_command_assignments_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES "organizational_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "police_incidents" ADD CONSTRAINT "police_incidents_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "police_cases" ADD CONSTRAINT "police_cases_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "police_cases" ADD CONSTRAINT "police_cases_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "police_incidents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "police_case_persons" ADD CONSTRAINT "police_case_persons_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "police_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "police_case_persons" ADD CONSTRAINT "police_case_persons_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arrests" ADD CONSTRAINT "arrests_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arrests" ADD CONSTRAINT "arrests_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arrests" ADD CONSTRAINT "arrests_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "police_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charges" ADD CONSTRAINT "charges_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "police_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charges" ADD CONSTRAINT "charges_arrestId_fkey" FOREIGN KEY ("arrestId") REFERENCES "arrests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conviction_records" ADD CONSTRAINT "conviction_records_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conviction_records" ADD CONSTRAINT "conviction_records_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "police_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conviction_records" ADD CONSTRAINT "conviction_records_chargeId_fkey" FOREIGN KEY ("chargeId") REFERENCES "charges"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "police_custody_episodes" ADD CONSTRAINT "police_custody_episodes_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "police_custody_episodes" ADD CONSTRAINT "police_custody_episodes_arrestId_fkey" FOREIGN KEY ("arrestId") REFERENCES "arrests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "police_custody_episodes" ADD CONSTRAINT "police_custody_episodes_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custody_movements" ADD CONSTRAINT "custody_movements_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "police_custody_episodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custody_movements" ADD CONSTRAINT "custody_movements_fromFacilityId_fkey" FOREIGN KEY ("fromFacilityId") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custody_movements" ADD CONSTRAINT "custody_movements_toFacilityId_fkey" FOREIGN KEY ("toFacilityId") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "background_check_applications" ADD CONSTRAINT "background_check_applications_applicantUserId_fkey" FOREIGN KEY ("applicantUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "background_check_applications" ADD CONSTRAINT "background_check_applications_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "background_check_reviews" ADD CONSTRAINT "background_check_reviews_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "background_check_applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clearance_certificates" ADD CONSTRAINT "clearance_certificates_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "background_check_applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prison_personnel" ADD CONSTRAINT "prison_personnel_currentRankId_fkey" FOREIGN KEY ("currentRankId") REFERENCES "ranks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prison_personnel" ADD CONSTRAINT "prison_personnel_currentOrgUnitId_fkey" FOREIGN KEY ("currentOrgUnitId") REFERENCES "organizational_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prison_postings" ADD CONSTRAINT "prison_postings_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES "prison_personnel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prison_postings" ADD CONSTRAINT "prison_postings_fromOrgUnitId_fkey" FOREIGN KEY ("fromOrgUnitId") REFERENCES "organizational_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prison_postings" ADD CONSTRAINT "prison_postings_toOrgUnitId_fkey" FOREIGN KEY ("toOrgUnitId") REFERENCES "organizational_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prison_rank_history" ADD CONSTRAINT "prison_rank_history_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES "prison_personnel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prison_rank_history" ADD CONSTRAINT "prison_rank_history_rankId_fkey" FOREIGN KEY ("rankId") REFERENCES "ranks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prison_command_assignments" ADD CONSTRAINT "prison_command_assignments_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES "prison_personnel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prison_command_assignments" ADD CONSTRAINT "prison_command_assignments_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prison_command_assignments" ADD CONSTRAINT "prison_command_assignments_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES "organizational_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prisoner_records" ADD CONSTRAINT "prisoner_records_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "court_orders" ADD CONSTRAINT "court_orders_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prison_admissions" ADD CONSTRAINT "prison_admissions_prisonerRecordId_fkey" FOREIGN KEY ("prisonerRecordId") REFERENCES "prisoner_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prison_admissions" ADD CONSTRAINT "prison_admissions_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prison_admissions" ADD CONSTRAINT "prison_admissions_courtOrderId_fkey" FOREIGN KEY ("courtOrderId") REFERENCES "court_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prison_custody_episodes" ADD CONSTRAINT "prison_custody_episodes_prisonerRecordId_fkey" FOREIGN KEY ("prisonerRecordId") REFERENCES "prisoner_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prison_custody_episodes" ADD CONSTRAINT "prison_custody_episodes_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "prison_admissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prison_custody_episodes" ADD CONSTRAINT "prison_custody_episodes_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prison_custody_episodes" ADD CONSTRAINT "prison_custody_episodes_housingUnitId_fkey" FOREIGN KEY ("housingUnitId") REFERENCES "housing_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prison_transfers" ADD CONSTRAINT "prison_transfers_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "prison_custody_episodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prison_transfers" ADD CONSTRAINT "prison_transfers_fromFacilityId_fkey" FOREIGN KEY ("fromFacilityId") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prison_transfers" ADD CONSTRAINT "prison_transfers_toFacilityId_fkey" FOREIGN KEY ("toFacilityId") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prison_transfers" ADD CONSTRAINT "prison_transfers_courtOrderId_fkey" FOREIGN KEY ("courtOrderId") REFERENCES "court_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sentence_records" ADD CONSTRAINT "sentence_records_prisonerRecordId_fkey" FOREIGN KEY ("prisonerRecordId") REFERENCES "prisoner_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sentence_records" ADD CONSTRAINT "sentence_records_courtOrderId_fkey" FOREIGN KEY ("courtOrderId") REFERENCES "court_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prison_releases" ADD CONSTRAINT "prison_releases_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "prison_custody_episodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prison_releases" ADD CONSTRAINT "prison_releases_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prison_releases" ADD CONSTRAINT "prison_releases_courtOrderId_fkey" FOREIGN KEY ("courtOrderId") REFERENCES "court_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prison_incidents" ADD CONSTRAINT "prison_incidents_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rehabilitation_programmes" ADD CONSTRAINT "rehabilitation_programmes_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rehabilitation_enrollments" ADD CONSTRAINT "rehabilitation_enrollments_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "rehabilitation_programmes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rehabilitation_enrollments" ADD CONSTRAINT "rehabilitation_enrollments_prisonerRecordId_fkey" FOREIGN KEY ("prisonerRecordId") REFERENCES "prisoner_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

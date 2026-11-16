/**
 * NEXCUST shared contracts — the single source of truth for roles, permissions
 * and the authorization matrix. The Chief Architect workstream owns this file:
 * no other workstream may change it without an approved contract change.
 */

export const INSTITUTIONS = { POLICE: 'POLICE', PRISONS: 'PRISONS' } as const;
export type InstitutionCode = keyof typeof INSTITUTIONS;

/** Jurisdiction level at which a role is exercised (the ABAC attribute). */
/**
 * How a role is scoped (the ABAC attribute).
 *  - PLATFORM: platform-wide, no operational records.
 *  - ORG_UNIT: bound to one organizational unit; access covers that unit and all of its
 *    descendants in the command hierarchy (national HQ ⊃ region ⊃ division ⊃ district ⊃ station).
 *    The hierarchy is configurable reference data — no command level is hard-coded.
 *  - SELF: only the user's own records (public applicant).
 */
export type ScopeLevel = 'PLATFORM' | 'ORG_UNIT' | 'SELF';

export const PERMISSIONS = {
  // Platform
  'platform.users.manage': 'Provision users and role assignments',
  'platform.config.manage': 'Manage platform configuration and reference data',
  'audit.read': 'Read audit events (within own jurisdiction)',
  // Shared services
  'person.read': 'Search and view the National Person Index (identity only)',
  'person.write': 'Create identity records',
  'person.identity.amend': 'Amend identity records (sensitive; requires approval)',
  'exchange.request': 'Request authorized cross-institution information',
  // Police
  'police.dashboard.read': 'View police dashboards',
  'police.custody.read': 'View arrests and police custody episodes',
  'police.custody.write': 'Register arrests, open custody, record movements',
  'police.custody.close': 'Authorize custody disposition (sensitive)',
  'police.juvenile.read': 'See identifying details of juveniles in custody records (Juvenile Justice Act, 2003 (Act 653) s.3) — handling station only',
  'police.case.read': 'View incidents, cases and criminal history',
  'police.case.write': 'Create and update incidents and cases',
  'police.personnel.read': 'View police personnel and postings',
  'police.personnel.write': 'Maintain police personnel and initiate postings',
  'police.posting.approve': 'Approve police posting changes (sensitive)',
  'police.facility.read': 'View stations and regions',
  'police.bgcheck.read': 'View background-check applications',
  'police.bgcheck.review': 'Conduct record searches and record review findings',
  'police.bgcheck.approve': 'Approve or reject certificate issuance (sensitive)',
  // Prisons
  'prisons.dashboard.read': 'View prisons dashboards',
  'prisons.prisoner.read': 'View prisoner registry and custody records',
  'prisons.prisoner.write': 'Register admissions and maintain prisoner records',
  'prisons.transfer.initiate': 'Initiate prisoner transfers',
  'prisons.transfer.approve': 'Approve prisoner transfers (sensitive)',
  'prisons.release.initiate': 'Initiate prisoner release',
  'prisons.release.approve': 'Authorize prisoner release (sensitive)',
  'prisons.personnel.read': 'View prison personnel and postings',
  'prisons.personnel.write': 'Maintain prison personnel and initiate postings',
  'prisons.posting.approve': 'Approve prison posting changes (sensitive)',
  'prisons.facility.read': 'View prison facilities, housing and occupancy',
  'prisons.rehab.read': 'View rehabilitation programmes and enrollments',
  'prisons.rehab.write': 'Manage rehabilitation enrollments',
  // Public applicant
  'applicant.bgcheck.submit': 'Submit and track own background-check applications',
} as const;
export type Permission = keyof typeof PERMISSIONS;

export interface RoleDefinition {
  code: string;
  name: string;
  institution: InstitutionCode | null; // null = cross-institution / platform
  scopeLevel: ScopeLevel;
  /** Guidance only: the unit level this role is normally assigned at. */
  typicalScope?: string;
  workspace: 'admin' | 'police' | 'prisons' | 'audit' | 'applicant';
  permissions: Permission[];
}

const POLICE_READ: Permission[] = [
  'police.dashboard.read', 'police.custody.read', 'police.case.read',
  'police.personnel.read', 'police.facility.read', 'person.read',
];
const PRISONS_READ: Permission[] = [
  'prisons.dashboard.read', 'prisons.prisoner.read', 'prisons.personnel.read',
  'prisons.facility.read', 'prisons.rehab.read', 'person.read',
];

/**
 * Authorization matrix. Separation-of-duties notes:
 *  - PLATFORM_ADMIN manages accounts/config but has NO access to operational records.
 *  - Records officers initiate; commanders/superintendents approve (maker–checker).
 *  - AUDITOR is strictly read-only.
 *  - Background checks: the Background Check Officer searches and reviews; issuance is approved by a
 *    different officer holding police.bgcheck.approve (demo: Police National Administrator).
 *  - exchange.request lets records officers ask the OTHER institution for a minimal, purpose-bound summary.
 */
export const ROLES: RoleDefinition[] = [
  { code: 'PLATFORM_ADMIN', name: 'Platform Administrator', institution: null, scopeLevel: 'PLATFORM', workspace: 'admin',
    permissions: ['platform.users.manage', 'platform.config.manage', 'audit.read'] },
  { code: 'POLICE_NATIONAL_ADMIN', name: 'Police National Administrator', institution: 'POLICE', scopeLevel: 'ORG_UNIT', typicalScope: 'National HQ', workspace: 'police',
    permissions: [...POLICE_READ, 'police.bgcheck.read', 'police.bgcheck.approve', 'police.posting.approve', 'police.custody.close', 'audit.read', 'exchange.request'] },
  { code: 'POLICE_REGIONAL_COMMANDER', name: 'Police Regional Commander', institution: 'POLICE', scopeLevel: 'ORG_UNIT', typicalScope: 'Regional command', workspace: 'police',
    permissions: [...POLICE_READ, 'police.posting.approve', 'police.custody.close'] },
  { code: 'POLICE_STATION_COMMANDER', name: 'Police Station Commander', institution: 'POLICE', scopeLevel: 'ORG_UNIT', typicalScope: 'Station / establishment', workspace: 'police',
    permissions: [...POLICE_READ, 'police.custody.close', 'police.posting.approve', 'police.juvenile.read'] },
  { code: 'POLICE_RECORDS_OFFICER', name: 'Police Records Officer', institution: 'POLICE', scopeLevel: 'ORG_UNIT', typicalScope: 'Station / establishment', workspace: 'police',
    permissions: ['police.dashboard.read', 'police.custody.read', 'police.custody.write', 'police.case.read', 'police.case.write',
      'police.facility.read', 'person.read', 'person.write', 'exchange.request', 'police.juvenile.read'] },
  { code: 'POLICE_HR_OFFICER', name: 'Police HR Officer', institution: 'POLICE', scopeLevel: 'ORG_UNIT', typicalScope: 'National HQ', workspace: 'police',
    permissions: ['police.dashboard.read', 'police.personnel.read', 'police.personnel.write', 'police.facility.read'] },
  { code: 'BACKGROUND_CHECK_OFFICER', name: 'Background Check Officer', institution: 'POLICE', scopeLevel: 'ORG_UNIT', typicalScope: 'National HQ', workspace: 'police',
    permissions: ['police.dashboard.read', 'police.bgcheck.read', 'police.bgcheck.review', 'police.case.read', 'person.read'] },
  { code: 'PRISONS_NATIONAL_ADMIN', name: 'Prisons National Administrator', institution: 'PRISONS', scopeLevel: 'ORG_UNIT', typicalScope: 'National HQ', workspace: 'prisons',
    permissions: [...PRISONS_READ, 'prisons.transfer.approve', 'prisons.release.approve', 'prisons.posting.approve', 'audit.read', 'exchange.request'] },
  { code: 'PRISON_SUPERINTENDENT', name: 'Prison Superintendent', institution: 'PRISONS', scopeLevel: 'ORG_UNIT', typicalScope: 'Station / establishment', workspace: 'prisons',
    permissions: [...PRISONS_READ, 'prisons.transfer.approve', 'prisons.release.approve', 'prisons.posting.approve'] },
  { code: 'PRISON_RECORDS_OFFICER', name: 'Prison Records Officer', institution: 'PRISONS', scopeLevel: 'ORG_UNIT', typicalScope: 'Station / establishment', workspace: 'prisons',
    permissions: ['prisons.dashboard.read', 'prisons.prisoner.read', 'prisons.prisoner.write', 'prisons.transfer.initiate',
      'prisons.release.initiate', 'prisons.facility.read', 'prisons.rehab.read', 'prisons.rehab.write', 'person.read', 'person.write', 'exchange.request'] },
  { code: 'PRISON_HR_OFFICER', name: 'Prison HR Officer', institution: 'PRISONS', scopeLevel: 'ORG_UNIT', typicalScope: 'National HQ', workspace: 'prisons',
    permissions: ['prisons.dashboard.read', 'prisons.personnel.read', 'prisons.personnel.write', 'prisons.facility.read'] },
  { code: 'AUDITOR', name: 'Auditor', institution: null, scopeLevel: 'PLATFORM', workspace: 'audit',
    permissions: ['audit.read'] },
  { code: 'PUBLIC_APPLICANT', name: 'Public Applicant', institution: null, scopeLevel: 'SELF', workspace: 'applicant',
    permissions: ['applicant.bgcheck.submit'] },
  // Testers (prototype evaluation): every operational permission of one institution, national scope, no administration.
  // Assigned in pairs through the TESTER access profile below. Excluded on purpose:
  //  - platform.* (administration);
  //  - police.juvenile.read: the Juvenile Justice Act, 2003 s.3 confines identifying details to the handling station,
  //    so testers see the protected view a national officer sees.
  // Maker–checker still applies: a tester cannot approve their own request, so a full approval cycle needs two testers.
  { code: 'TESTER_POLICE', name: 'Tester · Police', institution: 'POLICE', scopeLevel: 'ORG_UNIT', typicalScope: 'National HQ', workspace: 'police',
    permissions: (Object.keys(PERMISSIONS) as Permission[]).filter((p) => p.startsWith('police.') && p !== 'police.juvenile.read')
      .concat(['person.read', 'person.write', 'person.identity.amend', 'exchange.request', 'audit.read']) },
  { code: 'TESTER_PRISONS', name: 'Tester · Prisons', institution: 'PRISONS', scopeLevel: 'ORG_UNIT', typicalScope: 'National HQ', workspace: 'prisons',
    permissions: (Object.keys(PERMISSIONS) as Permission[]).filter((p) => p.startsWith('prisons.'))
      .concat(['person.read', 'person.write', 'person.identity.amend', 'exchange.request', 'audit.read']) },
];

/**
 * Access profiles offered on an invitation. Each profile is a set of role assignments made when the invitation is
 * accepted; ORG_UNIT roles are assigned at their institution's national headquarters (the root of its command tree).
 */
export const ACCESS_PROFILES = {
  TESTER: {
    name: 'Tester',
    description: 'Everything in the Police and Prisons workspaces and the applicant portal, nationally. No administration.',
    roles: ['TESTER_POLICE', 'TESTER_PRISONS', 'PUBLIC_APPLICANT'],
  },
} as const satisfies Record<string, { name: string; description: string; roles: string[] }>;
export type AccessProfile = keyof typeof ACCESS_PROFILES;

/** Shape returned by GET /api/auth/me — the contract between API and web shell. */
export interface SessionUser {
  id: string;
  email: string;
  displayName: string;
  workspace: RoleDefinition['workspace'];
  assignments: Array<{
    roleCode: string;
    roleName: string;
    institution: InstitutionCode | null;
    scopeLevel: ScopeLevel;
    orgUnitId: string | null;
    orgUnitName: string | null;
    orgUnitType: string | null;
  }>;
  permissions: Permission[];
  /** Every workspace the caller's roles open, in the order of their role assignments (first = home). */
  workspaces: RoleDefinition['workspace'][];
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export const WORKSPACE_HOME: Record<RoleDefinition['workspace'], string> = {
  admin: '/admin',
  police: '/police',
  prisons: '/prisons',
  audit: '/audit',
  applicant: '/applicant',
};

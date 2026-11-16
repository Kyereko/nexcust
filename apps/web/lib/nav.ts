import type { Permission } from '@justiceone/contracts';

export interface NavItem { label: string; href: string; permission?: Permission; planned?: string }

/** Navigation is a convenience only — the API enforces every permission independently. */
export const NAV: Record<string, { title: string; accent: string; items: NavItem[] }> = {
  police: { title: 'POLICE', accent: 'bg-police', items: [
    { label: 'Dashboard', href: '/police', permission: 'police.dashboard.read' },
    { label: 'People & Records', href: '/police/people', permission: 'person.read' },
    { label: 'Arrests & Custody', href: '/police/custody', permission: 'police.custody.read' },
    { label: 'Cases & Investigations', href: '/police/cases', permission: 'police.case.read' },
    { label: 'Background Checks', href: '/police/background-checks', permission: 'police.bgcheck.read', planned: 'Day 4' },
    { label: 'Personnel & Postings', href: '/police/personnel', permission: 'police.personnel.read' },
    { label: 'Stations & Commands', href: '/police/stations', permission: 'police.facility.read' },
    { label: 'Reports & Analytics', href: '/police/reports', permission: 'police.dashboard.read', planned: 'Day 4' },
    { label: 'Administration', href: '/police/administration' },
  ] },
  prisons: { title: 'PRISONS', accent: 'bg-prisons', items: [
    { label: 'Dashboard', href: '/prisons', permission: 'prisons.dashboard.read' },
    { label: 'Prisoner Registry', href: '/prisons/prisoners', permission: 'prisons.prisoner.read' },
    { label: 'Admissions & Custody', href: '/prisons/admissions', permission: 'prisons.prisoner.write', planned: 'Day 3' },
    { label: 'Transfers & Releases', href: '/prisons/transfers', permission: 'prisons.prisoner.read', planned: 'Day 3' },
    { label: 'Facilities & Housing', href: '/prisons/facilities', permission: 'prisons.facility.read' },
    { label: 'Personnel & Postings', href: '/prisons/personnel', permission: 'prisons.personnel.read' },
    { label: 'Rehabilitation', href: '/prisons/rehabilitation', permission: 'prisons.rehab.read', planned: 'Day 3' },
    { label: 'Reports & Analytics', href: '/prisons/reports', permission: 'prisons.dashboard.read', planned: 'Day 4' },
    { label: 'Administration', href: '/prisons/administration' },
  ] },
  admin: { title: 'PLATFORM', accent: 'bg-neutralws', items: [
    { label: 'Users & Roles', href: '/admin', permission: 'platform.users.manage' },
    { label: 'Audit Trail', href: '/audit', permission: 'audit.read' },
  ] },
  audit: { title: 'AUDIT', accent: 'bg-neutralws', items: [{ label: 'Audit Trail', href: '/audit', permission: 'audit.read' }] },
  applicant: { title: 'APPLICANT', accent: 'bg-neutralws', items: [{ label: 'My Applications', href: '/applicant' }] },
};

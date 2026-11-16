import type { AuthContext } from './access';

/**
 * Juvenile Justice Act, 2003 (Act 653) s.3(2): no release of information that may identify a juvenile in the course
 * of arrest, investigation or trial. Identifying details are shown only to holders of police.juvenile.read (the
 * handling station's records officer and commander); everyone else sees a protected placeholder.
 */
export const canSeeJuvenile = (auth: AuthContext | undefined) => !!auth?.grants.some((g) => g.institution === 'POLICE' && g.permissions.has('police.juvenile.read'));

export function protectPerson<T extends Record<string, any>>(person: T): T {
  return { ...person, surname: 'Juvenile', otherNames: 'identity protected (Act 653 s.3)', indexNumber: 'PROTECTED', dateOfBirth: null, hometown: null,
    ...(Array.isArray(person.identifiers) ? { identifiers: [] } : {}), identityProtected: true };
}

export const ageAt = (dob: Date, at: Date) => {
  let a = at.getUTCFullYear() - dob.getUTCFullYear(); const m = at.getUTCMonth() - dob.getUTCMonth();
  if (m < 0 || (m === 0 && at.getUTCDate() < dob.getUTCDate())) a--; return a;
};

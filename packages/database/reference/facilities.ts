/**
 * Police units and prison establishments, read from the research register (docs/research/15-facilities-register.md).
 * Every row carries its evidence status and source; the seed copies both onto the organisational unit.
 * Names are as printed by the Services, shown in title case where a page printed them in capitals.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

type Status = 'VERIFIED' | 'PROVISIONAL' | 'UNCONFIRMED';
export interface PoliceUnitRow {
  regionalCommand: string; regionalHq: string | null; adminRegions: string[]; division: string | null; district: string | null; station: string | null;
  kind: 'REGIONAL_COMMAND' | 'DIVISION' | 'DISTRICT' | 'STATION' | 'POST'; town: string | null; lat: number | null; lng: number | null;
  status: Status; source: string; accessed: string; coordPrecision: 'STATION' | 'OFFICIAL_MAP' | 'TOWN' | null; note: string | null;
}
export interface PrisonRow {
  name: string; type: string; regionalCommand: string; town: string | null; adminRegion: string | null; capacity: number | null;
  lat: number | null; lng: number | null; status: Status; source: string; accessed: string; coordPrecision: 'FACILITY' | 'TOWN' | null; note: string | null;
}

const DATA = join(__dirname, '..', '..', '..', 'docs', 'research', 'data');
const load = <T>(file: string): T[] => JSON.parse(readFileSync(join(DATA, file), 'utf8')) as T[];
export const POLICE_UNITS = load<PoliceUnitRow>('police-units.json');
export const PRISON_ESTABLISHMENTS = load<PrisonRow>('prison-establishments.json');
export const REGISTER_REF = 'docs/research/15-facilities-register.md';

/** "ACHIMOTA MILE 7" → "Achimota Mile 7"; mixed-case names are kept as printed. */
export function displayName(raw: string): string {
  const s = raw.trim().replace(/\s+/g, ' ');
  if (s !== s.toUpperCase()) return s;
  return s.toLowerCase().replace(/(^|[\s\-/(])([a-z])/g, (_, p: string, c: string) => p + c.toUpperCase());
}

/** Unit name as shown in the app, e.g. "Nima Police Station", "Dwowulu Police Post", "Ada Division". */
export function policeUnitName(row: PoliceUnitRow): string {
  if (row.kind === 'REGIONAL_COMMAND') return `${row.regionalCommand} Regional Police Command`;
  if (row.kind === 'DIVISION') return `${displayName(row.division!)} Division`;
  if (row.kind === 'DISTRICT') return `${displayName(row.district!)} District`;
  const base = displayName(row.station!);
  if (/police/i.test(base)) return base;
  if (row.kind === 'POST') return `${base.replace(/\s+post$/i, '')} Police Post`;
  return `${base.replace(/\s+station$/i, '')} Police Station`;
}

/** Register prison types → the facility type codes in ghana-reference.ts. */
export const PRISON_TYPE: Record<string, string> = {
  central: 'CENTRAL', local: 'LOCAL', female: 'FEMALE', camp: 'CAMP', 'settlement camp': 'CAMP', 'medium security': 'MEDIUM_SECURITY',
  'maximum security': 'MAXIMUM_SECURITY', annex: 'ANNEX', 'communicable disease': 'COMMUNICABLE_DISEASE', 'senior correctional centre': 'SENIOR_CORRECTIONAL_CENTRE',
};

export const slug = (v: string) => v.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '');

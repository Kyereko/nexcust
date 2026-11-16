import { PersonnelTable } from '@/components/personnel-table';

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  return <PersonnelTable institution="police" sp={await searchParams} />;
}

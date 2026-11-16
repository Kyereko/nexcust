import { NewPersonForm } from '@/components/new-person-form';

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  return <NewPersonForm ws="prisons" sp={await searchParams} />;
}

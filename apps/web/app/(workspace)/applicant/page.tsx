import { Card, PageHeader, Badge } from '@/components/ui';

export default function Applicant() {
  return (
    <>
      <PageHeader title="My background-check applications" subtitle="Public applicant area — isolated from all internal police and prisons systems" />
      <Card className="p-6">
        <Badge tone="blue">Scheduled · Day 4</Badge>
        <p className="mt-3 max-w-2xl text-sm text-slate-600">Application submission and tracking will be demonstrated here. The Ghana Police Service already operates an official online clearance service; this prototype demonstrates internal case processing and certificate verification that could complement it, and does not accept real applications.</p>
      </Card>
    </>
  );
}

import { FieldRecordsWorkspace } from "@/components/field-progress/FieldRecordsWorkspace";

export const metadata = { title: "Field Workspace | EPCX Cloud" };

export default async function StartWorkPage({ searchParams }: { searchParams: Promise<{ view?: string; add?: string; record?: string }> }) {
  const params = await searchParams;
  return <FieldRecordsWorkspace view={params.view} add={params.add} record={params.record} />;
}

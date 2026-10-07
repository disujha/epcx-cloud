import { EpcxLoadingScreen } from "@/components/ui/EpcxSpinner";

export default function Loading() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center bg-slate-50 dark:bg-brand-950">
      <EpcxLoadingScreen
        title="Loading EPCX Cloud…"
        subtitle="Connecting to field intelligence engine"
        minHeight="320px"
      />
    </div>
  );
}

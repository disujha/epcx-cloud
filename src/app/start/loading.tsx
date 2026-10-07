import { EpcxLoadingScreen } from "@/components/ui/EpcxSpinner";

export default function StartLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f4f4ef]">
      <EpcxLoadingScreen
        title="Loading Field Workspace…"
        subtitle="Initializing drawings, DPR records, and execution register"
        minHeight="360px"
      />
    </div>
  );
}

import { redirect } from "next/navigation";

export default function SettingsPage() {
  redirect("/start?view=settings");
}

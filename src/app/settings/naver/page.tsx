import { redirect } from "next/navigation";

export default async function LegacyNaverSettingsPage() {
  redirect("/settings/account");
}

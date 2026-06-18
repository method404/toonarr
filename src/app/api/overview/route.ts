import { getDashboardSnapshot } from "@/lib/mock-data";

export async function GET() {
  const snapshot = await getDashboardSnapshot();

  return Response.json({
    generatedAt: new Date().toISOString(),
    snapshot,
  });
}

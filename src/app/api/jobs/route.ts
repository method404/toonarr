import { getJobRuns } from "@/lib/mock-data";

export async function GET() {
  const jobs = await getJobRuns();

  return Response.json({
    generatedAt: new Date().toISOString(),
    items: jobs,
  });
}

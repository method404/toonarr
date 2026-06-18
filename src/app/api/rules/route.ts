import { getRules } from "@/lib/mock-data";

export async function GET() {
  const rules = await getRules();

  return Response.json({
    generatedAt: new Date().toISOString(),
    items: rules,
  });
}

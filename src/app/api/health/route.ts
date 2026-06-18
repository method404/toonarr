export async function GET() {
  return Response.json({
    status: "ok",
    service: "naverrr-control",
    timestamp: new Date().toISOString(),
  });
}

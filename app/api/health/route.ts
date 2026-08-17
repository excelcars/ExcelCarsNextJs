export async function GET() {
  return Response.json({
    ok: true,
    service: "excelcars-web",
    timestamp: new Date().toISOString(),
  });
}

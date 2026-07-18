import { buildSearchIndex } from "@/lib/searchIndex";

export async function GET() {
  const index = await buildSearchIndex();
  return Response.json(index, {
    headers: {
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  });
}

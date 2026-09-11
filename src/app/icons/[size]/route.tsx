import { renderAppIcon } from "@/lib/app-icon";

const ALLOWED = new Set([48, 72, 96, 128, 144, 192, 256, 384, 512]);

/** PNG manifest icons, e.g. /icons/192 or /icons/512?maskable=1 */
export async function GET(request: Request, { params }: { params: { size: string } }) {
  const size = Number(params.size);
  if (!ALLOWED.has(size)) {
    return new Response("Not found", { status: 404 });
  }
  const maskable = new URL(request.url).searchParams.has("maskable");
  const response = renderAppIcon(size, { maskable });
  response.headers.set("Cache-Control", "public, max-age=31536000, immutable");
  return response;
}

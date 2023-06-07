import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { env } from "./env.mjs";

export const middleware = (req: NextRequest) => {
  // Ensure headers have Api-Key
  const secret = req.headers.get("Api-Key");

  if (!secret || secret !== env.PRIVATE_API_SECRET_KEY) {
    return new NextResponse(
      JSON.stringify({ success: false, message: "authentication failed" }),
      { status: 401, headers: { "content-type": "application/json" } }
    );
  }

  return NextResponse.next();
};

export const config = {
  // Use `*` instead of `/*` at the end of the pattern
  matcher: "/api/llm/:function*",
};

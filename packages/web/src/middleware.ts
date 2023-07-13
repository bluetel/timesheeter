import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const middleware = (_: NextRequest) => {
  return NextResponse.next();
};


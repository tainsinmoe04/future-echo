import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "AI is not connected in this phase." },
    { status: 501 },
  );
}

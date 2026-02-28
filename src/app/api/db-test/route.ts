import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const result = await db.query<{ now: string }>("select now()");
    return NextResponse.json({ now: result.rows[0]?.now ?? null });
  } catch (error) {
    console.error("DB test error:", error);
    return NextResponse.json(
      { error: "Database connection failed" },
      { status: 500 },
    );
  }
}


import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await db.query(
      `
        insert into app_users (clerk_user_id)
        values ($1)
        on conflict (clerk_user_id) do update set clerk_user_id = excluded.clerk_user_id
        returning id, clerk_user_id
      `,
      [userId],
    );

    return NextResponse.json(
      {
        id: result.rows[0]?.id,
        clerkUserId: result.rows[0]?.clerk_user_id,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("init-user error:", error);
    return NextResponse.json(
      { error: "Failed to init user in database" },
      { status: 500 },
    );
  }
}


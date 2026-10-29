
import { NextResponse } from "next/server";

import { isAdmin } from "@/lib/auth";
import { getContent } from "@/lib/content";
import { listUsers } from "@/lib/user-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json(
      {
        error: "دسترسی غیرمجاز.",
      },
      {
        status: 401,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }

  try {
    const [users, content] = await Promise.all([
      listUsers(),
      getContent(),
    ]);

    const result = users.map((user) => {
      const reviews = content.polls.filter(
        (poll) => poll.userId === user.id
      );

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,

        reviews: reviews.length,

        lastReviewAt:
          reviews
            .map((poll) => poll.createdAt)
            .sort()
            .at(-1) ?? null,
      };
    });

    return NextResponse.json(
      {
        users: result,
        total: users.length,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "Admin users GET failed:",
      error
    );

    return NextResponse.json(
      {
        error: "خطای داخلی سرور.",
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}

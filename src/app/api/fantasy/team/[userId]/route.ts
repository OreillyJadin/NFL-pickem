import { NextRequest, NextResponse } from "next/server";
import { FantasyController } from "@/controllers/FantasyController";

/**
 * GET /api/fantasy/team/[userId]
 * Get a user's fantasy team (public view for locked teams)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const { searchParams } = new URL(request.url);
    const season = parseInt(searchParams.get("season") || "2025");

    const team = await FantasyController.getUserTeam(userId, season);

    if (!team) {
      return NextResponse.json(
        { error: "Team not found" },
        { status: 404 }
      );
    }

    // Only return locked teams publicly
    if (!team.is_locked) {
      return NextResponse.json(
        { error: "Team is not yet locked" },
        { status: 403 }
      );
    }

    return NextResponse.json({ team });
  } catch (error) {
    console.error("Error getting user team:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get team" },
      { status: 500 }
    );
  }
}

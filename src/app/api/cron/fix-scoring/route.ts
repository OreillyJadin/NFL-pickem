import { NextRequest, NextResponse } from "next/server";
import { ScoringController } from "@/controllers/ScoringController";

// Safety net: Find and fix any games with incorrect scoring
async function findAndFixIncorrectScoring() {
  console.log("🔍 Looking for games with incorrect scoring...");
  return await ScoringController.fixIncorrectScoring();
}

// Main handler for the fix-scoring cron job
export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("Starting scoring fix check...");

    const result = await findAndFixIncorrectScoring();

    const message =
      result.gamesFixed > 0
        ? `⚠️ Fixed ${result.picksFixed} picks across ${result.gamesFixed} games`
        : `✅ All ${result.gamesChecked} games have correct scoring`;

    console.log(message);

    return NextResponse.json({
      success: true,
      message,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (error) {
    console.error("Fix scoring cron job error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

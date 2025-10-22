import { NextRequest, NextResponse } from "next/server";
import { AwardController } from "@/controllers/AwardController";

export async function POST(request: NextRequest) {
  try {
    console.log("Processing completed weeks for awards...");

    const result = await AwardController.processAwards();

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        awardsCreated: result.awardsCreated,
        timestamp: new Date().toISOString(),
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.message,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error processing awards:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Allow GET requests for testing
    const result = await AwardController.processAwards();

    return NextResponse.json({
      success: result.success,
      message: result.message,
      awardsCreated: result.awardsCreated,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error processing awards:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

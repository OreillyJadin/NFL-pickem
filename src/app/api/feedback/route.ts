import { NextRequest, NextResponse } from "next/server";
import { FeedbackController } from "@/controllers/FeedbackController";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, message, timestamp } = body;

    // Validate required fields
    if (!type || !message || !timestamp) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Create feedback using controller
    const feedback = await FeedbackController.createFeedback(type, message, {
      userId: null, // TODO: Get from auth session
      userAgent: request.headers.get("user-agent") || undefined,
      ipAddress:
        request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip") ||
        "unknown",
      timestamp,
    });

    console.log(`✅ Feedback stored in database with ID: ${feedback.id}`);

    return NextResponse.json({
      success: true,
      message: "Feedback submitted successfully",
      feedbackId: feedback.id,
    });
  } catch (error) {
    console.error("Error processing feedback:", error);

    // Fallback to console logging
    const body = await request.json().catch(() => ({}));
    console.log("=== USER FEEDBACK (FALLBACK) ===");
    console.log(`Type: ${body.type}`);
    console.log(`Message: ${body.message}`);
    console.log(`Timestamp: ${body.timestamp}`);
    console.log(`User Agent: ${request.headers.get("user-agent")}`);
    console.log(
      `IP: ${
        request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip") ||
        "unknown"
      }`
    );
    console.log("================================");

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to process feedback",
      },
      { status: 500 }
    );
  }
}

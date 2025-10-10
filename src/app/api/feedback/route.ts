import { NextRequest, NextResponse } from "next/server";

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

    // Validate feedback type
    if (!["bug", "suggestion", "general"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid feedback type" },
        { status: 400 }
      );
    }

    // For now, just log the feedback (you can integrate with a service like Sentry, email, or database later)
    console.log("=== USER FEEDBACK ===");
    console.log(`Type: ${type}`);
    console.log(`Message: ${message}`);
    console.log(`Timestamp: ${timestamp}`);
    console.log(`User Agent: ${request.headers.get("user-agent")}`);
    console.log(
      `IP: ${
        request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip") ||
        "unknown"
      }`
    );
    console.log("===================");

    // TODO: Store in database or send to external service
    // Example: await supabase.from('feedback').insert({ type, message, timestamp, user_id: userId });

    return NextResponse.json({
      success: true,
      message: "Feedback submitted successfully",
    });
  } catch (error) {
    console.error("Error processing feedback:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process feedback",
      },
      { status: 500 }
    );
  }
}

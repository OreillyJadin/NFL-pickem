import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { FantasyController } from "@/controllers/FantasyController";

// Create a Supabase client for auth
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * GET /api/fantasy/team
 * Get the current user's fantasy team
 */
export async function GET(request: NextRequest) {
  try {
    // Get auth token from header
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get or create team
    const team = await FantasyController.getOrCreateTeam(user.id);

    return NextResponse.json({ team });
  } catch (error) {
    console.error("Error getting fantasy team:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get team" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/fantasy/team
 * Create a new fantasy team (if doesn't exist)
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { season = 2025 } = body;

    const team = await FantasyController.getOrCreateTeam(user.id, season);

    return NextResponse.json({ team });
  } catch (error) {
    console.error("Error creating fantasy team:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create team" },
      { status: 500 }
    );
  }
}

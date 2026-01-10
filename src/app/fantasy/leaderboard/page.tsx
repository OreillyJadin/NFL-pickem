"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigation } from "@/components/Navigation";
import { FantasyLeaderboardTable } from "@/components/fantasy/FantasyLeaderboardTable";
import { ScoringFormatToggle } from "@/components/fantasy/ScoringFormatToggle";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { FantasyLeaderboardEntry, ScoringFormat } from "@/types/database";

export default function FantasyLeaderboardPage() {
  const { user, session } = useAuth();
  const router = useRouter();
  const [entries, setEntries] = useState<FantasyLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewingFormat, setViewingFormat] = useState<ScoringFormat>("ppr");

  // Fetch leaderboard and user's preferred format
  useEffect(() => {
    fetchLeaderboard();
    if (user && session) {
      fetchUserFormat();
    }
  }, [user, session]);

  async function fetchLeaderboard() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/fantasy/leaderboard");
      if (!response.ok) {
        throw new Error("Failed to load leaderboard");
      }
      const data = await response.json();
      setEntries(data.leaderboard);
    } catch (err) {
      console.error("Error fetching leaderboard:", err);
      setError(err instanceof Error ? err.message : "Failed to load leaderboard");
    } finally {
      setLoading(false);
    }
  }

  async function fetchUserFormat() {
    try {
      const response = await fetch("/api/fantasy/team", {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.team?.scoring_format) {
          setViewingFormat(data.team.scoring_format);
        }
      }
    } catch (err) {
      // Ignore - user might not have a team yet
    }
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Navigation />

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/fantasy")}
            className="text-gray-400 hover:text-white mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to My Team
          </Button>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white">Fantasy Leaderboard</h1>
              <p className="text-gray-400 mt-1">
                Playoff fantasy rankings
              </p>
            </div>
            <div className="flex items-center gap-3">
              <ScoringFormatToggle
                value={viewingFormat}
                onChange={setViewingFormat}
                size="sm"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchLeaderboard}
                className="text-gray-400 hover:text-white"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        </div>

        {/* Format Info */}
        <div className="mb-6 p-3 bg-purple-600/10 border border-purple-500/30 rounded-lg">
          <p className="text-sm text-purple-300">
            Viewing rankings by{" "}
            <span className="font-semibold">
              {viewingFormat === "ppr"
                ? "PPR"
                : viewingFormat === "half_ppr"
                ? "Half PPR"
                : "Standard"}
            </span>{" "}
            scoring. Switch formats to see different rankings!
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 text-center">
            <p className="text-red-400">{error}</p>
            <Button
              onClick={fetchLeaderboard}
              className="mt-4 bg-red-600 hover:bg-red-700"
            >
              Try Again
            </Button>
          </div>
        )}

        {/* Leaderboard */}
        {!loading && !error && (
          <FantasyLeaderboardTable
            entries={entries}
            viewingFormat={viewingFormat}
            currentUserId={user?.id}
          />
        )}

        {/* Stats Footer */}
        {!loading && !error && entries.length > 0 && (
          <div className="mt-8 p-4 bg-gray-800 rounded-lg border border-gray-700">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-white">
                  {entries.length}
                </div>
                <div className="text-sm text-gray-400">Teams Locked</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-400">
                  {entries.length > 0
                    ? Math.round(
                        entries.reduce(
                          (sum, e) =>
                            sum +
                            (viewingFormat === "ppr"
                              ? e.team.total_points_ppr
                              : viewingFormat === "half_ppr"
                              ? e.team.total_points_half_ppr
                              : e.team.total_points_standard),
                          0
                        ) / entries.length
                      )
                    : 0}
                </div>
                <div className="text-sm text-gray-400">Avg Points</div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

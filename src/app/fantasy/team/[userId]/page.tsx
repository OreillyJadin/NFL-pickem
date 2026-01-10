"use client";

import { useState, useEffect, use } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigation } from "@/components/Navigation";
import { ScoringFormatToggle, ScoringFormatBadge } from "@/components/fantasy/ScoringFormatToggle";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User, Lock, Trophy } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  FantasyTeamWithRoster,
  ScoringFormat,
  RosterSlotType,
} from "@/types/database";
import { getPointsByFormat, formatPoints } from "@/services/fantasy-scoring";

// Roster slot configuration
const ROSTER_SLOT_CONFIG: {
  slotType: RosterSlotType;
  label: string;
  shortLabel: string;
}[] = [
  { slotType: "QB", label: "Quarterback", shortLabel: "QB" },
  { slotType: "RB1", label: "Running Back 1", shortLabel: "RB" },
  { slotType: "RB2", label: "Running Back 2", shortLabel: "RB" },
  { slotType: "WR1", label: "Wide Receiver 1", shortLabel: "WR" },
  { slotType: "WR2", label: "Wide Receiver 2", shortLabel: "WR" },
  { slotType: "TE", label: "Tight End", shortLabel: "TE" },
  { slotType: "FLEX", label: "Flex (RB/WR/TE)", shortLabel: "FLEX" },
  { slotType: "DST", label: "Defense/ST", shortLabel: "D/ST" },
  { slotType: "K", label: "Kicker", shortLabel: "K" },
];

interface PageProps {
  params: Promise<{ userId: string }>;
}

export default function ViewTeamPage({ params }: PageProps) {
  const { userId } = use(params);
  const { user, session } = useAuth();
  const router = useRouter();
  const [team, setTeam] = useState<FantasyTeamWithRoster | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewingFormat, setViewingFormat] = useState<ScoringFormat>("ppr");

  const isOwnTeam = user?.id === userId;

  // Fetch team
  useEffect(() => {
    fetchTeam();
  }, [userId]);

  // Set viewing format to user's preference if logged in
  useEffect(() => {
    if (user && session) {
      fetchUserFormat();
    }
  }, [user, session]);

  async function fetchTeam() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/fantasy/team/${userId}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Team not found");
        }
        if (response.status === 403) {
          throw new Error("This team is not yet locked");
        }
        throw new Error("Failed to load team");
      }
      const data = await response.json();
      setTeam(data.team);
      // Set initial viewing format to the team owner's format
      setViewingFormat(data.team.scoring_format);
    } catch (err) {
      console.error("Error fetching team:", err);
      setError(err instanceof Error ? err.message : "Failed to load team");
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

  // Get roster slot by type
  const getSlot = (slotType: RosterSlotType) => {
    return team?.roster.find((s) => s.slot_type === slotType);
  };

  // Calculate total points for current format
  const totalPoints = team?.roster.reduce((sum, slot) => {
    return sum + getPointsByFormat(
      {
        points_ppr: slot.points_ppr,
        points_half_ppr: slot.points_half_ppr,
        points_standard: slot.points_standard,
      },
      viewingFormat
    );
  }, 0) || 0;

  return (
    <div className="min-h-screen bg-gray-900">
      <Navigation />

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/fantasy/leaderboard")}
          className="text-gray-400 hover:text-white mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Leaderboard
        </Button>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-500/20 border border-red-500 rounded-lg p-8 text-center">
            <p className="text-red-400 text-lg">{error}</p>
            <Button
              onClick={() => router.push("/fantasy/leaderboard")}
              className="mt-4 bg-gray-700 hover:bg-gray-600"
            >
              Go to Leaderboard
            </Button>
          </div>
        )}

        {/* Team View */}
        {!loading && !error && team && (
          <div className="space-y-6">
            {/* Team Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-gray-800 rounded-lg border border-gray-700">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-purple-600/30 flex items-center justify-center">
                  <User className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">
                    {team.user?.username || "Unknown User"}&apos;s Team
                  </h1>
                  <div className="flex items-center gap-2 mt-1">
                    <ScoringFormatBadge format={team.scoring_format} />
                    <span className="text-sm text-gray-400">preferred format</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-green-400" />
                <span className="text-sm text-green-400">Locked</span>
              </div>
            </div>

            {/* Format Toggle */}
            <div className="flex items-center justify-between p-3 bg-purple-600/10 border border-purple-500/30 rounded-lg">
              <span className="text-sm text-purple-300">View points as:</span>
              <ScoringFormatToggle
                value={viewingFormat}
                onChange={setViewingFormat}
                size="sm"
              />
            </div>

            {/* Roster */}
            <div className="grid gap-2">
              {ROSTER_SLOT_CONFIG.map(({ slotType, label, shortLabel }) => {
                const slot = getSlot(slotType);
                const player = slot?.player;
                const points = slot
                  ? getPointsByFormat(
                      {
                        points_ppr: slot.points_ppr,
                        points_half_ppr: slot.points_half_ppr,
                        points_standard: slot.points_standard,
                      },
                      viewingFormat
                    )
                  : 0;

                return (
                  <div
                    key={slotType}
                    className="flex items-center gap-3 p-3 rounded-lg bg-gray-800 border border-gray-600"
                  >
                    {/* Slot Label */}
                    <div className="w-12 text-center">
                      <span className="text-xs font-bold text-purple-400 uppercase">
                        {shortLabel}
                      </span>
                    </div>

                    {/* Player Info */}
                    {player ? (
                      <>
                        <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {player.headshot_url ? (
                            <img
                              src={player.headshot_url}
                              alt={player.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <User className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-white truncate">
                            {player.name}
                          </div>
                          <div className="text-xs text-gray-400">
                            {player.team} • {player.position}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-white">
                            {formatPoints(points)}
                          </div>
                          <div className="text-xs text-gray-400">pts</div>
                        </div>
                      </>
                    ) : (
                      <div className="flex-1 text-center text-gray-500">
                        Empty slot
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Total Points */}
            <div className="flex items-center justify-between p-4 bg-purple-600/20 rounded-lg border border-purple-500/30">
              <span className="text-lg font-medium text-white">Total Points</span>
              <span className="text-2xl font-bold text-purple-400">
                {formatPoints(totalPoints)}
              </span>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => router.push("/fantasy/leaderboard")}
                className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                <Trophy className="w-4 h-4 mr-2" />
                View Leaderboard
              </Button>
              {!isOwnTeam && (
                <Button
                  onClick={() => router.push("/fantasy")}
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                >
                  <User className="w-4 h-4 mr-2" />
                  My Team
                </Button>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigation } from "@/components/Navigation";
import { RosterBuilder } from "@/components/fantasy/RosterBuilder";
import { ScoringFormatBadge } from "@/components/fantasy/ScoringFormatToggle";
import { Button } from "@/components/ui/button";
import { Trophy, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  FantasyTeamWithRoster,
  ScoringFormat,
  RosterSlotType,
} from "@/types/database";

export default function FantasyPage() {
  const { user, session } = useAuth();
  const router = useRouter();
  const [team, setTeam] = useState<FantasyTeamWithRoster | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewingFormat, setViewingFormat] = useState<ScoringFormat>("ppr");
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Fetch user's fantasy team
  useEffect(() => {
    if (user && session) {
      fetchTeam();
    }
  }, [user, session]);

  async function fetchTeam() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/fantasy/team", {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to load team");
      }

      const data = await response.json();
      setTeam(data.team);
      setViewingFormat(data.team.scoring_format);
    } catch (err) {
      console.error("Error fetching team:", err);
      setError(err instanceof Error ? err.message : "Failed to load team");
    } finally {
      setLoading(false);
    }
  }

  async function handleFormatChange(format: ScoringFormat) {
    setViewingFormat(format);

    // Save as default if it's the user's own team
    if (team && session) {
      try {
        await fetch("/api/fantasy/team/format", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            teamId: team.id,
            format,
          }),
        });
      } catch (err) {
        console.error("Error saving format preference:", err);
      }
    }
  }

  async function handlePlayerSelect(slotType: RosterSlotType, playerId: string) {
    if (!team || !session) return;

    try {
      const response = await fetch("/api/fantasy/team/roster", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          teamId: team.id,
          slotType,
          playerId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to set player");
      }

      const data = await response.json();
      setTeam(data.team);
    } catch (err) {
      console.error("Error setting player:", err);
      alert(err instanceof Error ? err.message : "Failed to set player");
    }
  }

  async function handlePlayerRemove(slotType: RosterSlotType) {
    if (!team || !session) return;

    try {
      const response = await fetch("/api/fantasy/team/roster", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          teamId: team.id,
          slotType,
          playerId: null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to remove player");
      }

      const data = await response.json();
      setTeam(data.team);
    } catch (err) {
      console.error("Error removing player:", err);
      alert(err instanceof Error ? err.message : "Failed to remove player");
    }
  }

  async function handleLockTeam() {
    if (!team || !session) return;

    const confirmed = window.confirm(
      "Are you sure you want to lock your team? You won't be able to make any changes after locking."
    );
    if (!confirmed) return;

    try {
      const response = await fetch("/api/fantasy/team/lock", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          teamId: team.id,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to lock team");
      }

      const data = await response.json();
      setTeam(data.team);
      alert("Team locked successfully! Check the leaderboard to see your ranking.");
    } catch (err) {
      console.error("Error locking team:", err);
      alert(err instanceof Error ? err.message : "Failed to lock team");
    }
  }

  async function handleSyncStats() {
    if (!session) return;
    setSyncing(true);
    setSyncMessage(null);
    try {
      // Sync stats for week 1 of 2025 season (adjust as needed)
      const response = await fetch("/api/cron/sync-fantasy?week=1&season=2025", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const data = await response.json();

      if (data.success) {
        setSyncMessage(
          `Stats updated! ${data.gamesProcessed || 0} games processed, ${data.playersUpdated || 0} players updated.`
        );
        // Refresh team data to show updated points
        await fetchTeam();
      } else {
        setSyncMessage(`Sync failed: ${data.error || "Unknown error"}`);
      }
    } catch (err) {
      console.error("Error syncing stats:", err);
      setSyncMessage("Failed to sync stats. Please try again.");
    } finally {
      setSyncing(false);
      // Clear message after 5 seconds
      setTimeout(() => setSyncMessage(null), 5000);
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Please log in to access Fantasy Football.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Navigation />

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-white">Fantasy Football</h1>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/fantasy/leaderboard")}
              className="border-purple-500 text-purple-400 hover:bg-purple-500/20"
            >
              <Trophy className="w-4 h-4 mr-2" />
              Leaderboard
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
          <p className="text-gray-400">
            Build your playoff roster and compete against other players!
          </p>
          {/* Sync Status Message */}
          {syncMessage && (
            <div className={`mt-3 p-3 rounded-lg text-sm ${
              syncMessage.includes("failed") || syncMessage.includes("Failed")
                ? "bg-red-500/20 text-red-300 border border-red-500/30"
                : "bg-green-500/20 text-green-300 border border-green-500/30"
            }`}>
              {syncMessage}
            </div>
          )}
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
              onClick={fetchTeam}
              className="mt-4 bg-red-600 hover:bg-red-700"
            >
              Try Again
            </Button>
          </div>
        )}

        {/* Team Builder */}
        {!loading && !error && team && (
          <RosterBuilder
            team={team}
            viewingFormat={viewingFormat}
            onFormatChange={handleFormatChange}
            onPlayerSelect={handlePlayerSelect}
            onPlayerRemove={handlePlayerRemove}
            onLockTeam={handleLockTeam}
            onSyncStats={handleSyncStats}
            isSyncing={syncing}
            isOwner={true}
          />
        )}

        {/* Info Section */}
        <div className="mt-8 p-4 bg-gray-800 rounded-lg border border-gray-700">
          <h3 className="font-semibold text-white mb-2">Scoring Formats</h3>
          <div className="space-y-2 text-sm text-gray-400">
            <p>
              <ScoringFormatBadge format="ppr" />{" "}
              <span className="ml-2">1 point per reception</span>
            </p>
            <p>
              <ScoringFormatBadge format="half_ppr" />{" "}
              <span className="ml-2">0.5 points per reception</span>
            </p>
            <p>
              <ScoringFormatBadge format="standard" />{" "}
              <span className="ml-2">No points for receptions</span>
            </p>
          </div>
          <p className="mt-4 text-xs text-gray-500">
            Switch formats anytime to see how your team scores under different systems.
            Your preferred format is saved automatically.
          </p>
        </div>
      </main>
    </div>
  );
}

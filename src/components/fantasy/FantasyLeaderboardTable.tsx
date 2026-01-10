"use client";

import { useRouter } from "next/navigation";
import { User, Trophy, Medal } from "lucide-react";
import { FantasyLeaderboardEntry, ScoringFormat } from "@/types/database";
import { ScoringFormatBadge } from "./ScoringFormatToggle";
import { getPointsByFormat, formatPoints } from "@/services/fantasy-scoring";

interface FantasyLeaderboardTableProps {
  entries: FantasyLeaderboardEntry[];
  viewingFormat: ScoringFormat;
  currentUserId?: string;
}

export function FantasyLeaderboardTable({
  entries,
  viewingFormat,
  currentUserId,
}: FantasyLeaderboardTableProps) {
  const router = useRouter();

  // Sort entries by the viewing format
  const sortedEntries = [...entries].sort((a, b) => {
    const aPoints = getPointsByFormat(
      {
        points_ppr: a.team.total_points_ppr,
        points_half_ppr: a.team.total_points_half_ppr,
        points_standard: a.team.total_points_standard,
      },
      viewingFormat
    );
    const bPoints = getPointsByFormat(
      {
        points_ppr: b.team.total_points_ppr,
        points_half_ppr: b.team.total_points_half_ppr,
        points_standard: b.team.total_points_standard,
      },
      viewingFormat
    );
    return bPoints - aPoints;
  });

  // Add rank to sorted entries
  const rankedEntries = sortedEntries.map((entry, index) => ({
    ...entry,
    rank: index + 1,
  }));

  function getRankDisplay(rank: number) {
    if (rank === 1) {
      return (
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-yellow-500/20">
          <Trophy className="w-5 h-5 text-yellow-400" />
        </div>
      );
    }
    if (rank === 2) {
      return (
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-400/20">
          <Medal className="w-5 h-5 text-gray-300" />
        </div>
      );
    }
    if (rank === 3) {
      return (
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-500/20">
          <Medal className="w-5 h-5 text-orange-400" />
        </div>
      );
    }
    return (
      <div className="flex items-center justify-center w-8 h-8 text-gray-400 font-bold">
        {rank}
      </div>
    );
  }

  if (rankedEntries.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p className="text-lg">No locked teams yet</p>
        <p className="text-sm mt-2">Be the first to lock your team!</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {rankedEntries.map((entry) => {
        const points = getPointsByFormat(
          {
            points_ppr: entry.team.total_points_ppr,
            points_half_ppr: entry.team.total_points_half_ppr,
            points_standard: entry.team.total_points_standard,
          },
          viewingFormat
        );
        const isCurrentUser = entry.user.id === currentUserId;

        return (
          <button
            key={entry.team.id}
            onClick={() => router.push(`/fantasy/team/${entry.user.id}`)}
            className={`w-full flex items-center gap-4 p-4 rounded-lg transition-colors ${
              isCurrentUser
                ? "bg-purple-600/20 border border-purple-500/50"
                : "bg-gray-800 border border-gray-700 hover:border-gray-600"
            }`}
          >
            {/* Rank */}
            {getRankDisplay(entry.rank!)}

            {/* User Info */}
            <div className="flex-1 text-left min-w-0">
              <div className="flex items-center gap-2">
                <span className={`font-semibold truncate ${isCurrentUser ? "text-purple-300" : "text-white"}`}>
                  {entry.user.username || entry.user.email?.split("@")[0]}
                </span>
                {isCurrentUser && (
                  <span className="text-xs px-2 py-0.5 bg-purple-500/30 text-purple-300 rounded-full">
                    You
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <ScoringFormatBadge format={entry.team.scoring_format} />
              </div>
            </div>

            {/* Points */}
            <div className="text-right">
              <div className={`text-xl font-bold ${isCurrentUser ? "text-purple-300" : "text-white"}`}>
                {formatPoints(points)}
              </div>
              <div className="text-xs text-gray-400">pts</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

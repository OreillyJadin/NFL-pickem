"use client";

import { useState } from "react";
import { User, Plus, Lock, Trash2, RefreshCw } from "lucide-react";
import {
  FantasyTeamWithRoster,
  FantasyPlayer,
  RosterSlotType,
  ScoringFormat,
} from "@/types/database";
import { Button } from "@/components/ui/button";
import { PlayerPickerModal } from "./PlayerPickerModal";
import { ScoringFormatToggle } from "./ScoringFormatToggle";
import { getPointsByFormat, formatPoints } from "@/services/fantasy-scoring";

interface RosterBuilderProps {
  team: FantasyTeamWithRoster;
  viewingFormat: ScoringFormat;
  onFormatChange: (format: ScoringFormat) => void;
  onPlayerSelect: (slotType: RosterSlotType, playerId: string) => Promise<void>;
  onPlayerRemove: (slotType: RosterSlotType) => Promise<void>;
  onLockTeam: () => Promise<void>;
  onSyncStats?: () => Promise<void>;
  isSyncing?: boolean;
  isOwner: boolean;
}

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

export function RosterBuilder({
  team,
  viewingFormat,
  onFormatChange,
  onPlayerSelect,
  onPlayerRemove,
  onLockTeam,
  onSyncStats,
  isSyncing = false,
  isOwner,
}: RosterBuilderProps) {
  const [selectedSlot, setSelectedSlot] = useState<RosterSlotType | null>(null);
  const [loading, setLoading] = useState(false);
  const [lockingTeam, setLockingTeam] = useState(false);

  // Get roster slot by type
  const getSlot = (slotType: RosterSlotType) => {
    return team.roster.find((s) => s.slot_type === slotType);
  };

  // Get all selected player IDs (to exclude from picker)
  const selectedPlayerIds = team.roster
    .filter((s) => s.player_id)
    .map((s) => s.player_id!);

  // Check if roster is complete
  const isRosterComplete = team.roster.every((s) => s.player_id !== null);

  // Calculate total points for current format
  const totalPoints = team.roster.reduce((sum, slot) => {
    return sum + getPointsByFormat(
      {
        points_ppr: slot.points_ppr,
        points_half_ppr: slot.points_half_ppr,
        points_standard: slot.points_standard,
      },
      viewingFormat
    );
  }, 0);

  async function handlePlayerSelect(player: FantasyPlayer) {
    if (!selectedSlot) return;
    setLoading(true);
    try {
      await onPlayerSelect(selectedSlot, player.id);
    } finally {
      setLoading(false);
      setSelectedSlot(null);
    }
  }

  async function handleRemovePlayer(slotType: RosterSlotType) {
    setLoading(true);
    try {
      await onPlayerRemove(slotType);
    } finally {
      setLoading(false);
    }
  }

  async function handleLockTeam() {
    if (!isRosterComplete) return;
    setLockingTeam(true);
    try {
      await onLockTeam();
    } finally {
      setLockingTeam(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with format toggle and sync button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Your Roster</h2>
          <p className="text-sm text-gray-400">
            {team.is_locked ? "Team is locked" : "Fill all 9 positions to lock your team"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ScoringFormatToggle
            value={viewingFormat}
            onChange={onFormatChange}
            size="sm"
          />
          {onSyncStats && (
            <Button
              variant="outline"
              size="sm"
              onClick={onSyncStats}
              disabled={isSyncing}
              className="border-green-500 text-green-400 hover:bg-green-500/20"
              title="Update player stats from ESPN"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
            </Button>
          )}
        </div>
      </div>

      {/* Roster Grid */}
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
              className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                player
                  ? "bg-gray-800 border-gray-600"
                  : "bg-gray-800/50 border-gray-700 border-dashed"
              }`}
            >
              {/* Slot Label */}
              <div className="w-12 text-center">
                <span className="text-xs font-bold text-purple-400 uppercase">
                  {shortLabel}
                </span>
              </div>

              {/* Player Info or Empty Slot */}
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
                  {isOwner && !team.is_locked && (
                    <button
                      onClick={() => handleRemovePlayer(slotType)}
                      className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                      disabled={loading}
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  )}
                </>
              ) : (
                <button
                  onClick={() => isOwner && !team.is_locked && setSelectedSlot(slotType)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-colors ${
                    isOwner && !team.is_locked
                      ? "hover:bg-gray-700 cursor-pointer"
                      : "cursor-not-allowed opacity-50"
                  }`}
                  disabled={!isOwner || team.is_locked}
                >
                  <Plus className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-400">Add {label}</span>
                </button>
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

      {/* Lock Team Button */}
      {isOwner && !team.is_locked && (
        <Button
          onClick={handleLockTeam}
          disabled={!isRosterComplete || lockingTeam}
          className={`w-full py-6 text-lg font-bold ${
            isRosterComplete
              ? "bg-purple-600 hover:bg-purple-700"
              : "bg-gray-600 cursor-not-allowed"
          }`}
        >
          {lockingTeam ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Locking Team...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              {isRosterComplete ? "Lock Team" : `Fill ${9 - selectedPlayerIds.length} More Positions`}
            </div>
          )}
        </Button>
      )}

      {/* Locked Team Badge */}
      {team.is_locked && (
        <div className="flex items-center justify-center gap-2 p-4 bg-green-600/20 rounded-lg border border-green-500/30">
          <Lock className="w-5 h-5 text-green-400" />
          <span className="font-medium text-green-400">
            Team Locked - Good luck!
          </span>
        </div>
      )}

      {/* Player Picker Modal */}
      <PlayerPickerModal
        isOpen={selectedSlot !== null}
        onClose={() => setSelectedSlot(null)}
        onSelect={handlePlayerSelect}
        slotType={selectedSlot || "QB"}
        currentPlayerId={selectedSlot ? getSlot(selectedSlot)?.player_id : undefined}
        excludedPlayerIds={selectedPlayerIds}
      />
    </div>
  );
}

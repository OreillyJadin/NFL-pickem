"use client";

import { useState, useEffect } from "react";
import { X, Search, User } from "lucide-react";
import { FantasyPlayer, RosterSlotType, ScoringFormat } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface PlayerPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (player: FantasyPlayer) => void;
  slotType: RosterSlotType;
  currentPlayerId?: string;
  excludedPlayerIds: string[];
}

// Map slot types to display names
const slotDisplayNames: Record<RosterSlotType, string> = {
  QB: "Quarterback",
  RB1: "Running Back",
  RB2: "Running Back",
  WR1: "Wide Receiver",
  WR2: "Wide Receiver",
  TE: "Tight End",
  FLEX: "Flex (RB/WR/TE)",
  DST: "Defense/ST",
  K: "Kicker",
};

export function PlayerPickerModal({
  isOpen,
  onClose,
  onSelect,
  slotType,
  currentPlayerId,
  excludedPlayerIds,
}: PlayerPickerModalProps) {
  const [players, setPlayers] = useState<FantasyPlayer[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredPlayers, setFilteredPlayers] = useState<FantasyPlayer[]>([]);

  // Fetch players when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchPlayers();
    }
  }, [isOpen, slotType]);

  // Filter players based on search
  useEffect(() => {
    if (searchQuery.length >= 2) {
      const query = searchQuery.toLowerCase();
      setFilteredPlayers(
        players.filter(
          (p) =>
            p.name.toLowerCase().includes(query) ||
            p.team.toLowerCase().includes(query)
        )
      );
    } else {
      setFilteredPlayers(players);
    }
  }, [searchQuery, players]);

  async function fetchPlayers() {
    setLoading(true);
    try {
      const response = await fetch(`/api/fantasy/players?slotType=${slotType}`);
      const data = await response.json();
      if (data.players) {
        // Filter out already selected players
        const available = data.players.filter(
          (p: FantasyPlayer) => !excludedPlayerIds.includes(p.id)
        );
        setPlayers(available);
        setFilteredPlayers(available);
      }
    } catch (error) {
      console.error("Error fetching players:", error);
    } finally {
      setLoading(false);
    }
  }

  function handleSelect(player: FantasyPlayer) {
    onSelect(player);
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-gray-800 rounded-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col border border-gray-600 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-600">
          <div>
            <h2 className="text-lg font-bold text-white">Select Player</h2>
            <p className="text-sm text-gray-400">{slotDisplayNames[slotType]}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search players..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
            />
          </div>
        </div>

        {/* Player List */}
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
            </div>
          ) : filteredPlayers.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              {searchQuery ? "No players found" : "No players available"}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredPlayers.map((player) => (
                <button
                  key={player.id}
                  onClick={() => handleSelect(player)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                    player.id === currentPlayerId
                      ? "bg-purple-600/30 border border-purple-500"
                      : "hover:bg-gray-700 border border-transparent"
                  }`}
                >
                  {/* Player Avatar */}
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

                  {/* Player Info */}
                  <div className="flex-1 text-left">
                    <div className="font-medium text-white">{player.name}</div>
                    <div className="text-sm text-gray-400">
                      {player.team} • {player.position}
                    </div>
                  </div>

                  {/* Position Badge */}
                  <span className="px-2 py-1 text-xs font-medium rounded bg-gray-600 text-gray-300">
                    {player.position}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-600">
          <Button
            variant="outline"
            onClick={onClose}
            className="w-full border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

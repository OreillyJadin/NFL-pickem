"use client";

import { ScoringFormat } from "@/types/database";

interface ScoringFormatToggleProps {
  value: ScoringFormat;
  onChange: (format: ScoringFormat) => void;
  disabled?: boolean;
  size?: "sm" | "md";
}

const formats: { value: ScoringFormat; label: string }[] = [
  { value: "ppr", label: "PPR" },
  { value: "half_ppr", label: "Half" },
  { value: "standard", label: "Standard" },
];

/**
 * ScoringFormatToggle - 3-way toggle for switching between scoring formats
 * Used on fantasy page, leaderboard, and team viewer
 */
export function ScoringFormatToggle({
  value,
  onChange,
  disabled = false,
  size = "md",
}: ScoringFormatToggleProps) {
  const sizeClasses = size === "sm" 
    ? "px-2 py-1 text-xs" 
    : "px-3 py-1.5 text-sm";

  return (
    <div className="inline-flex rounded-lg bg-gray-700 p-1">
      {formats.map((format) => (
        <button
          key={format.value}
          onClick={() => onChange(format.value)}
          disabled={disabled}
          className={`${sizeClasses} font-medium rounded-md transition-all duration-200 ${
            value === format.value
              ? "bg-purple-600 text-white shadow-sm"
              : "text-gray-400 hover:text-white hover:bg-gray-600"
          } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        >
          {format.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Get display name for a scoring format
 */
export function formatDisplayName(format: ScoringFormat): string {
  switch (format) {
    case "ppr":
      return "PPR";
    case "half_ppr":
      return "Half PPR";
    case "standard":
      return "Standard";
    default:
      return "PPR";
  }
}

/**
 * ScoringFormatBadge - Small badge showing a user's scoring format
 */
export function ScoringFormatBadge({ format }: { format: ScoringFormat }) {
  const colors = {
    ppr: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    half_ppr: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    standard: "bg-green-500/20 text-green-300 border-green-500/30",
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${colors[format]}`}
    >
      {formatDisplayName(format)}
    </span>
  );
}

// NFL Team Colors and Styling
export interface TeamColors {
  primary: string;
  secondary: string;
  text: string;
  border: string;
}

export const TEAM_COLORS: Record<string, TeamColors> = {
  // AFC East
  "Buffalo Bills": {
    primary: "#00338D",
    secondary: "#C60C30",
    text: "white",
    border: "#00338D",
  },
  "Miami Dolphins": {
    primary: "#008E97",
    secondary: "#FC4C02",
    text: "white",
    border: "#008E97",
  },
  "New England Patriots": {
    primary: "#002244",
    secondary: "#C60C30",
    text: "white",
    border: "#002244",
  },
  "New York Jets": {
    primary: "#125740",
    secondary: "#000000",
    text: "white",
    border: "#125740",
  },

  // AFC North
  "Baltimore Ravens": {
    primary: "#241773",
    secondary: "#000000",
    text: "white",
    border: "#241773",
  },
  "Cincinnati Bengals": {
    primary: "#FB4F14",
    secondary: "#000000",
    text: "white",
    border: "#FB4F14",
  },
  "Cleveland Browns": {
    primary: "#311D00",
    secondary: "#FF3C00",
    text: "white",
    border: "#311D00",
  },
  "Pittsburgh Steelers": {
    primary: "#FFB612",
    secondary: "#000000",
    text: "black",
    border: "#FFB612",
  },

  // AFC South
  "Houston Texans": {
    primary: "#03202F",
    secondary: "#A71930",
    text: "white",
    border: "#03202F",
  },
  "Indianapolis Colts": {
    primary: "#002C5F",
    secondary: "#A2AAAD",
    text: "white",
    border: "#002C5F",
  },
  "Jacksonville Jaguars": {
    primary: "#006778",
    secondary: "#9F792C",
    text: "white",
    border: "#006778",
  },
  "Tennessee Titans": {
    primary: "#0C2340",
    secondary: "#4B92DB",
    text: "white",
    border: "#0C2340",
  },

  // AFC West
  "Denver Broncos": {
    primary: "#FB4F14",
    secondary: "#002244",
    text: "white",
    border: "#FB4F14",
  },
  "Kansas City Chiefs": {
    primary: "#E31837",
    secondary: "#FFB81C",
    text: "white",
    border: "#E31837",
  },
  "Las Vegas Raiders": {
    primary: "#000000",
    secondary: "#A5ACAF",
    text: "white",
    border: "#000000",
  },
  "Los Angeles Chargers": {
    primary: "#0080C6",
    secondary: "#FFC20E",
    text: "white",
    border: "#0080C6",
  },

  // NFC East
  "Dallas Cowboys": {
    primary: "#003594",
    secondary: "#869397",
    text: "white",
    border: "#003594",
  },
  "New York Giants": {
    primary: "#0B2265",
    secondary: "#A71930",
    text: "white",
    border: "#0B2265",
  },
  "Philadelphia Eagles": {
    primary: "#004C54",
    secondary: "#A5ACAF",
    text: "white",
    border: "#004C54",
  },
  "Washington Commanders": {
    primary: "#5A1414",
    secondary: "#FFB612",
    text: "white",
    border: "#5A1414",
  },

  // NFC North
  "Chicago Bears": {
    primary: "#0B162A",
    secondary: "#C83803",
    text: "white",
    border: "#0B162A",
  },
  "Detroit Lions": {
    primary: "#0076B6",
    secondary: "#B0B7BC",
    text: "white",
    border: "#0076B6",
  },
  "Green Bay Packers": {
    primary: "#203731",
    secondary: "#FFB612",
    text: "white",
    border: "#203731",
  },
  "Minnesota Vikings": {
    primary: "#4F2683",
    secondary: "#FFC62F",
    text: "white",
    border: "#4F2683",
  },

  // NFC South
  "Atlanta Falcons": {
    primary: "#A71930",
    secondary: "#000000",
    text: "white",
    border: "#A71930",
  },
  "Carolina Panthers": {
    primary: "#0085CA",
    secondary: "#101820",
    text: "white",
    border: "#0085CA",
  },
  "New Orleans Saints": {
    primary: "#D3BC8D",
    secondary: "#000000",
    text: "black",
    border: "#D3BC8D",
  },
  "Tampa Bay Buccaneers": {
    primary: "#D50A0A",
    secondary: "#FF7900",
    text: "white",
    border: "#D50A0A",
  },

  // NFC West
  "Arizona Cardinals": {
    primary: "#97233F",
    secondary: "#000000",
    text: "white",
    border: "#97233F",
  },
  "Los Angeles Rams": {
    primary: "#003594",
    secondary: "#FFA300",
    text: "white",
    border: "#003594",
  },
  "San Francisco 49ers": {
    primary: "#AA0000",
    secondary: "#B3995D",
    text: "white",
    border: "#AA0000",
  },
  "Seattle Seahawks": {
    primary: "#002244",
    secondary: "#69BE28",
    text: "white",
    border: "#002244",
  },
};

export function getTeamColors(teamName: string): TeamColors {
  return (
    TEAM_COLORS[teamName] || {
      primary: "#6B7280",
      secondary: "#9CA3AF",
      text: "white",
      border: "#6B7280",
    }
  );
}

export function getTeamAbbreviation(teamName: string): string {
  const abbreviations: Record<string, string> = {
    "Buffalo Bills": "BUF",
    "Miami Dolphins": "MIA",
    "New England Patriots": "NE",
    "New York Jets": "NYJ",
    "Baltimore Ravens": "BAL",
    "Cincinnati Bengals": "CIN",
    "Cleveland Browns": "CLE",
    "Pittsburgh Steelers": "PIT",
    "Houston Texans": "HOU",
    "Indianapolis Colts": "IND",
    "Jacksonville Jaguars": "JAX",
    "Tennessee Titans": "TEN",
    "Denver Broncos": "DEN",
    "Kansas City Chiefs": "KC",
    "Las Vegas Raiders": "LV",
    "Los Angeles Chargers": "LAC",
    "Dallas Cowboys": "DAL",
    "New York Giants": "NYG",
    "Philadelphia Eagles": "PHI",
    "Washington Commanders": "WAS",
    "Chicago Bears": "CHI",
    "Detroit Lions": "DET",
    "Green Bay Packers": "GB",
    "Minnesota Vikings": "MIN",
    "Atlanta Falcons": "ATL",
    "Carolina Panthers": "CAR",
    "New Orleans Saints": "NO",
    "Tampa Bay Buccaneers": "TB",
    "Arizona Cardinals": "ARI",
    "Los Angeles Rams": "LAR",
    "San Francisco 49ers": "SF",
    "Seattle Seahawks": "SEA",
  };

  return (
    abbreviations[teamName] ||
    teamName
      .split(" ")
      .map((word) => word[0])
      .join("")
  );
}

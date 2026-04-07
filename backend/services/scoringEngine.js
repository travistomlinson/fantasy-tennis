// ATP Fantasy Scoring Engine
// Two scoring components per match:
// A. Tournament Round Points — based on tournament category + round reached
// B. Match Bonus/Penalty Points — per-match stat bonuses

const ROUND_POINTS = {
  atp250:      { R32: 0, R16: 25, QF: 50, SF: 100, F: 165, W: 250 },
  atp500:      { R64: 0, R32: 25, R16: 50, QF: 100, SF: 200, F: 330, W: 500 },
  masters1000: { R128: 10, R64: 30, R32: 50, R16: 100, QF: 200, SF: 400, F: 650, W: 1000 },
  major:       { R128: 10, R64: 50, R32: 100, R16: 200, QF: 400, SF: 800, F: 1300, W: 2000 },
};

// Round progression order (earliest to latest)
const ROUND_ORDER = ['R128', 'R64', 'R32', 'R16', 'QF', 'SF', 'F', 'W'];

function getRoundIndex(round) {
  return ROUND_ORDER.indexOf(round);
}

// Given a round the player played in and whether they won,
// determine the furthest round they reached
function furthestRound(matchRound, isWinner) {
  if (!matchRound) return null;
  const idx = getRoundIndex(matchRound);
  if (idx === -1) return null;
  // If they won, they advance to the next round
  if (isWinner && idx + 1 < ROUND_ORDER.length) {
    return ROUND_ORDER[idx + 1];
  }
  // If they lost, they were eliminated at this round
  return matchRound;
}

// Get points for the specific round reached (NOT cumulative)
function getRoundPoints(category, reachedRound) {
  const table = ROUND_POINTS[category];
  if (!table || !reachedRound) return 0;
  return table[reachedRound] || 0;
}

function matchesPlayer(matchData, playerName) {
  const pLower = playerName.toLowerCase();
  const homeLower = matchData.homePlayer?.toLowerCase() || '';
  const awayLower = matchData.awayPlayer?.toLowerCase() || '';

  // Full name match or last-name match
  const isHome = homeLower.includes(pLower) || pLower.includes(homeLower.split(' ').pop() || '');
  const isAway = awayLower.includes(pLower) || pLower.includes(awayLower.split(' ').pop() || '');

  if (isHome) return 'home';
  if (isAway) return 'away';
  return null;
}

export function calculateMatchPoints(matchData, playerName) {
  const breakdown = [];
  let total = 0;

  const side = matchesPlayer(matchData, playerName);
  if (!side) return { total: 0, breakdown: [], matched: false };

  const isWinner = matchData.winner === side;
  const otherSide = side === 'home' ? 'away' : 'home';

  if (!matchData.isComplete) {
    return { total: 0, breakdown: [{ event: 'Match in progress', points: 0 }], matched: true };
  }

  // --- A. Tournament Round Points ---
  const category = matchData.tournamentCategory;
  const round = matchData.round;

  if (category && round) {
    const reached = furthestRound(round, isWinner);
    const roundPts = reached ? (ROUND_POINTS[category]?.[reached] || 0) : 0;
    if (roundPts > 0) {
      total += roundPts;
      breakdown.push({ event: `${reached} round points (${category})`, points: roundPts });
    }
  }

  // --- B. Match Bonus/Penalty Points ---

  // Straight sets win: +10
  if (isWinner && matchData.isStraightSets) {
    total += 10;
    breakdown.push({ event: 'Straight sets win', points: 10 });
  }

  // Upset detection (requires rank info on the match or players)
  const playerRank = side === 'home' ? matchData.homeRank : matchData.awayRank;
  const oppRank = side === 'home' ? matchData.awayRank : matchData.homeRank;
  if (playerRank && oppRank) {
    if (isWinner && playerRank > oppRank) {
      // Lower-ranked player beat higher-ranked: upset win
      total += 20;
      breakdown.push({ event: 'Upset win', points: 20 });
    } else if (!isWinner && playerRank < oppRank) {
      // Higher-ranked player lost to lower-ranked: upset loss
      total -= 20;
      breakdown.push({ event: 'Upset loss', points: -20 });
    }
  }

  // Bagel lost: -10 for each set lost 0-6
  if (matchData.sets) {
    for (const set of matchData.sets) {
      const playerGames = side === 'home' ? set.home : set.away;
      const oppGames = side === 'home' ? set.away : set.home;
      if (playerGames === 0 && oppGames === 6) {
        total -= 10;
        breakdown.push({ event: 'Bagel lost (0-6)', points: -10 });
      }
    }
  }

  // Aces: +2 per ace
  const aces = side === 'home' ? matchData.homeAces : matchData.awayAces;
  if (aces !== null && aces !== undefined) {
    const acePts = aces * 2;
    total += acePts;
    breakdown.push({ event: `Aces (${aces} × 2)`, points: acePts });
  } else if (matchData.dataSource === 'scraped' || matchData.dataSource === 'manual') {
    breakdown.push({ event: 'Aces (data unavailable)', points: 0, limited: true });
  }

  // Double faults: -2 per DF
  const dfs = side === 'home' ? matchData.homeDFs : matchData.awayDFs;
  if (dfs !== null && dfs !== undefined) {
    const dfPts = dfs * 2;
    total -= dfPts;
    breakdown.push({ event: `Double faults (${dfs} × 2)`, points: -dfPts });
  } else if (matchData.dataSource === 'scraped' || matchData.dataSource === 'manual') {
    breakdown.push({ event: 'Double faults (data unavailable)', points: 0, limited: true });
  }

  return {
    total,
    breakdown,
    matched: true,
    dataSource: matchData.dataSource,
    limitedData: matchData.limitedData || false,
    tournamentName: matchData.tournamentName || null,
    tournamentCategory: category || null,
    round: round || null,
  };
}

// Calculate weekly scores across all managers.
// Groups matches by tournament for round-point tracking.
export function recalculateWeeklyScores(leagueState, matches) {
  const results = {};

  for (const manager of leagueState.managers) {
    let weeklyTotal = 0;
    const playerScores = [];

    for (const playerSlot of manager.roster) {
      if (playerSlot.benched) continue;

      let playerTotal = 0;
      const matchResults = [];

      // Group this player's matches by tournament for round tracking
      const tournamentMatches = new Map(); // tournamentName -> matches[]

      for (const match of matches) {
        const side = matchesPlayer(match, playerSlot.player.name);
        if (!side) continue;

        const tName = match.tournamentName || '_unknown';
        if (!tournamentMatches.has(tName)) {
          tournamentMatches.set(tName, []);
        }
        tournamentMatches.get(tName).push({ match, side });
      }

      // For each tournament, determine the furthest round reached
      // and award cumulative round points (once per tournament) + match bonuses
      for (const [tName, tMatches] of tournamentMatches) {
        let furthestReached = null;
        let furthestIdx = -1;
        const category = tMatches[0].match.tournamentCategory;

        // Find the furthest round reached across all matches in this tournament
        for (const { match, side } of tMatches) {
          const isWinner = match.winner === side;
          const reached = furthestRound(match.round, isWinner);
          if (reached) {
            const idx = getRoundIndex(reached);
            if (idx > furthestIdx) {
              furthestIdx = idx;
              furthestReached = reached;
            }
          }
        }

        // Award cumulative round points for the tournament
        if (category && furthestReached) {
          const roundPts = getRoundPoints(category, furthestReached);
          if (roundPts > 0) {
            playerTotal += roundPts;
            matchResults.push({
              matchId: `round_${tName}`,
              event: 'tournament_round',
              tournamentName: tName === '_unknown' ? null : tName,
              tournamentCategory: category,
              furthestRound: furthestReached,
              total: roundPts,
              breakdown: [{ event: `${tName} — reached ${furthestReached}`, points: roundPts }],
              matched: true,
            });
          }
        }

        // Award match bonuses/penalties for each individual match
        for (const { match, side } of tMatches) {
          const score = calculateMatchBonuses(match, side);
          if (score.total !== 0 || score.breakdown.length > 0) {
            playerTotal += score.total;
            const otherSide = side === 'home' ? 'away' : 'home';
            matchResults.push({
              matchId: match.matchId,
              opponent: match[`${otherSide}Player`],
              ...score,
              tournamentName: match.tournamentName,
              tournamentCategory: match.tournamentCategory,
              round: match.round,
            });
          }
        }
      }

      weeklyTotal += playerTotal;
      playerScores.push({
        playerId: playerSlot.player.id,
        playerName: playerSlot.player.name,
        weeklyPoints: playerTotal,
        matches: matchResults,
      });
    }

    results[manager.id] = {
      weeklyPoints: weeklyTotal,
      playerScores,
    };
  }

  return results;
}

// Calculate only the match bonus/penalty points (no round points)
function calculateMatchBonuses(matchData, side) {
  const breakdown = [];
  let total = 0;

  const isWinner = matchData.winner === side;

  if (!matchData.isComplete) {
    return { total: 0, breakdown: [], matched: true };
  }

  // Straight sets win: +10
  if (isWinner && matchData.isStraightSets) {
    total += 10;
    breakdown.push({ event: 'Straight sets win', points: 10 });
  }

  // Upset detection
  const playerRank = side === 'home' ? matchData.homeRank : matchData.awayRank;
  const oppRank = side === 'home' ? matchData.awayRank : matchData.homeRank;
  if (playerRank && oppRank) {
    if (isWinner && playerRank > oppRank) {
      total += 20;
      breakdown.push({ event: 'Upset win', points: 20 });
    } else if (!isWinner && playerRank < oppRank) {
      total -= 20;
      breakdown.push({ event: 'Upset loss', points: -20 });
    }
  }

  // Bagel lost: -10
  if (matchData.sets) {
    for (const set of matchData.sets) {
      const playerGames = side === 'home' ? set.home : set.away;
      const oppGames = side === 'home' ? set.away : set.home;
      if (playerGames === 0 && oppGames === 6) {
        total -= 10;
        breakdown.push({ event: 'Bagel lost (0-6)', points: -10 });
      }
    }
  }

  // Aces: +2 per ace
  const aces = side === 'home' ? matchData.homeAces : matchData.awayAces;
  if (aces !== null && aces !== undefined) {
    const acePts = aces * 2;
    total += acePts;
    breakdown.push({ event: `Aces (${aces} × 2)`, points: acePts });
  } else if (matchData.dataSource === 'scraped' || matchData.dataSource === 'manual') {
    breakdown.push({ event: 'Aces (data unavailable)', points: 0, limited: true });
  }

  // Double faults: -2 per DF
  const dfs = side === 'home' ? matchData.homeDFs : matchData.awayDFs;
  if (dfs !== null && dfs !== undefined) {
    const dfPts = dfs * 2;
    total -= dfPts;
    breakdown.push({ event: `Double faults (${dfs} × 2)`, points: -dfPts });
  } else if (matchData.dataSource === 'scraped' || matchData.dataSource === 'manual') {
    breakdown.push({ event: 'Double faults (data unavailable)', points: 0, limited: true });
  }

  return {
    total,
    breakdown,
    matched: true,
    dataSource: matchData.dataSource,
    limitedData: matchData.limitedData || false,
  };
}

// ATP official credit pricing table — prices are purely rank-based
export function priceFromRank(rank) {
  if (rank === 1) return 40;
  if (rank === 2) return 36;
  if (rank === 3) return 33;
  if (rank === 4) return 30;
  if (rank === 5) return 27;
  if (rank === 6) return 24;
  if (rank === 7) return 21;
  if (rank === 8) return 19;
  if (rank === 9) return 17;
  if (rank === 10) return 15;
  if (rank === 11) return 14;
  if (rank === 12) return 13;
  if (rank === 13) return 12;
  if (rank === 14) return 11;
  if (rank === 15) return 10;
  if (rank === 16) return 9;
  if (rank >= 17 && rank <= 20) return 8;
  if (rank >= 21 && rank <= 25) return 7;
  if (rank >= 26 && rank <= 30) return 6;
  if (rank >= 31 && rank <= 36) return 5;
  if (rank >= 37 && rank <= 49) return 4;
  if (rank >= 50 && rank <= 74) return 3;
  if (rank >= 75 && rank <= 100) return 2;
  return 1; // 101+
}

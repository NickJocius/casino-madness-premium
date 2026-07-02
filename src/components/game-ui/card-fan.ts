// Reproduces the blackjack dev-preview's hardcoded 4-card rotation array
// ([-9, -3, 3, 9]) exactly for total=4, generalized to any hand size so a
// player hand can grow (hits) without falling back to an unrotated card.
export function fanRotationDeg(index: number, total: number, stepDeg = 6): number {
  return (index - (total - 1) / 2) * stepDeg;
}

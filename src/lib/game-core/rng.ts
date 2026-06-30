import seedrandom from 'seedrandom';

export type Rng = () => number;

export function makeRng(seed?: string): Rng {
  return seedrandom(seed);
}

import { z } from "zod";

export const placeBetInput = z.number().int().positive().max(100_000);
export type PlaceBetInput = z.infer<typeof placeBetInput>;

export const playerActionInput = z.enum(["hit", "stand"]);
export type PlayerActionInput = z.infer<typeof playerActionInput>;

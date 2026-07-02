import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  DATABASE_HOST: z.string().min(1),
  DATABASE_USER: z.string().min(1),
  // No .min(1): a local MariaDB dev user can legitimately have no password,
  // in which case DATABASE_PASSWORD is set to an empty string rather than
  // omitted - PrismaMariaDb (src/lib/prisma.ts) passes this straight through
  // as the connection password, and an empty string there is valid.
  DATABASE_PASSWORD: z.string(),
  DATABASE_NAME: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(1),
  BETTER_AUTH_URL: z.string().min(1),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  BLACKJACK_SESSION_SECRET: z.string().min(1),
});

export type Env = z.infer<typeof envSchema>;

export const env: Env = envSchema.parse(process.env);

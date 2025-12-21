export const env = {
  port: process.env.PORT ? Number(process.env.PORT) : 3000,
  jwtSecret: process.env.JWT_SECRET ?? "change_me",
  nodeEnv: process.env.NODE_ENV ?? "development",
  monday: {
    apiToken: process.env.MONDAY_API_TOKEN ?? "",
    apiVersion: process.env.MONDAY_API_VERSION ?? "2024-10",
  },
};


export function optionalEnv(key: string, fallback: string) {
  const v = process.env[key];
  if (v == null || String(v).trim() === "") return fallback;
  return String(v);
}

export function requireEnv(key: string) {
  const v = process.env[key];
  if (v == null || String(v).trim() === "") throw new Error(`Missing required env: ${key}`);
  return String(v);
}

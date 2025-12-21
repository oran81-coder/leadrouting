import crypto from "crypto";

function getKey(): Buffer | null {
  const raw = process.env.ROUTING_ENC_KEY ? String(process.env.ROUTING_ENC_KEY) : "";
  if (!raw) return null;

  // Accept hex(64 chars) or base64(32 bytes)
  if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, "hex");
  try {
    const b = Buffer.from(raw, "base64");
    if (b.length === 32) return b;
  } catch {}
  // Fallback: hash to 32 bytes (not ideal, but keeps dev moving)
  return crypto.createHash("sha256").update(raw).digest();
}

export function seal(plaintext: string): string {
  const key = getKey();
  if (!key) {
    // dev fallback (NOT secure): base64
    return `b64:${Buffer.from(plaintext, "utf8").toString("base64")}`;
  }

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `gcm:${iv.toString("base64")}:${tag.toString("base64")}:${enc.toString("base64")}`;
}

export function openSealed(sealed: string): string {
  const key = getKey();
  if (sealed.startsWith("b64:")) {
    return Buffer.from(sealed.slice(4), "base64").toString("utf8");
  }
  if (!key) throw new Error("ROUTING_ENC_KEY is required to decrypt Monday credentials");

  const parts = sealed.split(":");
  if (parts.length !== 4 || parts[0] !== "gcm") throw new Error("Invalid sealed payload");
  const iv = Buffer.from(parts[1], "base64");
  const tag = Buffer.from(parts[2], "base64");
  const enc = Buffer.from(parts[3], "base64");

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  return dec.toString("utf8");
}

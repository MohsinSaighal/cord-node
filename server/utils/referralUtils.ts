import { randomBytes } from "crypto";

export function generateReferralCode(): string {
  // Generate a random 8-character alphanumeric code
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  const bytes = randomBytes(8);
  
  for (let i = 0; i < 8; i++) {
    result += chars[bytes[i] % chars.length];
  }
  
  return result;
}

export function validateReferralCode(code: string): boolean {
  // Check if code is 8 characters and alphanumeric
  return /^[A-Z0-9]{8}$/.test(code);
}
import { createHash, randomBytes } from 'node:crypto';
import argon2 from 'argon2';
import { ApiError } from '../../../shared/http/api-error.js';

const MIN_PASSWORD_LENGTH = 12;
const MAX_PASSWORD_LENGTH = 1024;

export function normalizeEmail(value: string) {
  return String(value || '').trim().toLocaleLowerCase('en-US');
}

export function validatePasswordPolicy(password: string, email: string, displayName?: string) {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    throw new ApiError(422, 'WEAK_PASSWORD', `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    throw new ApiError(422, 'WEAK_PASSWORD', `Password must be at most ${MAX_PASSWORD_LENGTH} characters.`);
  }
  const normalizedPassword = password.toLocaleLowerCase('en-US');
  const normalizedEmail = normalizeEmail(email);
  if (normalizedEmail && normalizedPassword === normalizedEmail) {
    throw new ApiError(422, 'WEAK_PASSWORD', 'Password must not match the email address.');
  }
  const normalizedName = String(displayName || '').trim().toLocaleLowerCase('en-US');
  if (normalizedName.length >= 3 && normalizedPassword.includes(normalizedName)) {
    throw new ApiError(422, 'WEAK_PASSWORD', 'Password must not contain profile information.');
  }
}

export function hashPassword(password: string) {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
  });
}

export async function verifyPassword(passwordHash: string, password: string) {
  try {
    return await argon2.verify(passwordHash, password);
  } catch {
    return false;
  }
}

export function hashOpaqueToken(token: string) {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

export function issueOpaqueToken() {
  const token = randomBytes(32).toString('base64url');
  return { token, tokenHash: hashOpaqueToken(token) };
}

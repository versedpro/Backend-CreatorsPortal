import * as randomstring from 'randomstring';
import { scryptSync, randomBytes, timingSafeEqual } from 'crypto';

import { JWT_PUBLIC_KEY } from '../constants';

const Cryptr = require('cryptr');

const cryptr = new Cryptr(JWT_PUBLIC_KEY || 'testing');

export function toIntNumber(value: string | number, radix?: number): number {
  if (typeof value === 'number') {
    return value;
  }
  return parseInt(value, radix);
}

export function generateKey(size = 32) {
  return randomstring.generate(size);
}

export function encrypt(text: string): string {
  return cryptr.encrypt(text);
}

export function decrypt(encryptedString: string): string {
  return cryptr.decrypt(encryptedString);
}

export function generateSecretHash(key: string): string {
  const salt = randomBytes(8).toString('hex');
  const buffer = scryptSync(key, salt, 64) as Buffer;
  return `${buffer.toString('hex')}.${salt}`;
}

export function compareKeys(body: { storedKey: string, suppliedKey: string }) {
  const { storedKey, suppliedKey } = body;
  const [hashedPassword, salt] = storedKey.split('.');
  const buffer = scryptSync(suppliedKey, salt, 64) as Buffer;
  return timingSafeEqual(Buffer.from(hashedPassword, 'hex'), buffer);
}

/**
 * Rate limiting middleware
 */

import { type Request, type Response, type NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { hashIpAddress } from '../utils/crypto.js';

const WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'); // 15 minutes
const MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100');

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

export async function rateLimiter(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const ipHash = hashIpAddress(ip);

  const now = Date.now();
  const entry = rateLimitStore.get(ipHash);

  if (!entry || now > entry.resetAt) {
    // Create new entry
    rateLimitStore.set(ipHash, {
      count: 1,
      resetAt: now + WINDOW_MS
    });
    return next();
  }

  if (entry.count >= MAX_REQUESTS) {
    // Rate limit exceeded
    return res.status(429).json({
      error: 'Too many requests',
      retryAfter: Math.ceil((entry.resetAt - now) / 1000)
    });
  }

  // Increment count
  entry.count++;
  next();
}

// Cleanup old entries every hour
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}, 3600000);

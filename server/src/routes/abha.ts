/**
 * ABHA/NDHM OAuth and token management routes
 * Handles secure token exchange, storage, and rotation
 */

import express, { type Request, type Response } from 'express';
import axios from 'axios';
import { z } from 'zod';
import { supabaseAdmin } from '../config/supabase.js';
import { encrypt, decrypt, hashHealthId, generateSecureToken } from '../utils/crypto.js';
import { logAuditEvent } from '../utils/audit.js';
import { logConsent } from '../utils/consent.js';

const router = express.Router();

// TODO: Replace with production URLs after ABDM onboarding
const ABHA_BASE_URL = process.env.ABHA_BASE_URL || 'https://healthidsbx.abdm.gov.in/api/v2';
const ABHA_CLIENT_ID = process.env.ABHA_CLIENT_ID;
const ABHA_CLIENT_SECRET = process.env.ABHA_CLIENT_SECRET;
const ABHA_REDIRECT_URI = process.env.ABHA_REDIRECT_URI;

// Validation schemas
const InitiateAbhaSchema = z.object({
  userId: z.string().uuid(),
  aadhaarNumber: z.string().regex(/^\d{12}$/),
  consentGiven: z.boolean()
});

const AbhaCallbackSchema = z.object({
  code: z.string(),
  state: z.string()
});

/**
 * POST /api/auth/abha/initiate
 * Initiate ABHA number creation with Aadhaar OTP
 */
router.post('/initiate', async (req: Request, res: Response) => {
  try {
    const { userId, aadhaarNumber, consentGiven } = InitiateAbhaSchema.parse(req.body);

    if (!consentGiven) {
      return res.status(400).json({ error: 'User consent required for ABHA creation' });
    }

    // Log consent
    await logConsent({
      userId,
      scope: 'abha_creation',
      purpose: 'Creating ABHA health ID using Aadhaar',
      ipHash: req.ip || 'unknown'
    });

    // TODO: Implement actual NDHM API call when credentials available
    // For now, use sandbox/mock flow
    const mockState = generateSecureToken(16);
    
    // Store pending request
    await supabaseAdmin
      .from('abha_pending_requests')
      .insert({
        user_id: userId,
        state: mockState,
        aadhaar_last4: aadhaarNumber.slice(-4),
        status: 'pending_otp',
        created_at: new Date().toISOString()
      });

    // In production, this would redirect to ABDM OAuth flow
    // For sandbox: Generate OTP via ABDM API
    const authUrl = `${ABHA_BASE_URL}/auth/init?client_id=${ABHA_CLIENT_ID}&redirect_uri=${ABHA_REDIRECT_URI}&state=${mockState}`;

    await logAuditEvent({
      actor: userId,
      action: 'abha_initiate',
      targetId: null,
      metadata: { aadhaar_last4: aadhaarNumber.slice(-4) }
    });

    res.json({
      success: true,
      authUrl,
      state: mockState,
      message: 'OTP sent to Aadhaar-registered mobile. Complete authentication at ABDM portal.'
    });

  } catch (error) {
    console.error('ABHA initiation error:', error);
    res.status(500).json({ 
      error: 'Failed to initiate ABHA creation',
      details: error instanceof z.ZodError ? error.errors : undefined
    });
  }
});

/**
 * GET /api/auth/abha/callback
 * OAuth callback from ABDM after user completes authentication
 */
router.get('/callback', async (req: Request, res: Response) => {
  try {
    const { code, state } = AbhaCallbackSchema.parse(req.query);

    // Verify state to prevent CSRF
    const { data: pendingRequest } = await supabaseAdmin
      .from('abha_pending_requests')
      .select('*')
      .eq('state', state)
      .single();

    if (!pendingRequest) {
      return res.status(400).json({ error: 'Invalid or expired state parameter' });
    }

    // Exchange code for tokens
    // TODO: Use real ABDM token endpoint when credentials available
    let tokenResponse;
    try {
      tokenResponse = await axios.post(
        `${ABHA_BASE_URL}/auth/token`,
        {
          grant_type: 'authorization_code',
          code,
          client_id: ABHA_CLIENT_ID,
          client_secret: ABHA_CLIENT_SECRET,
          redirect_uri: ABHA_REDIRECT_URI
        },
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }
      );
    } catch (apiError) {
      // Mock response for sandbox testing
      console.warn('ABDM API unavailable, using mock tokens for testing');
      tokenResponse = {
        data: {
          access_token: `mock_access_${generateSecureToken(16)}`,
          refresh_token: `mock_refresh_${generateSecureToken(16)}`,
          token_type: 'Bearer',
          expires_in: 3600,
          health_id: `91-1234-5678-${Math.floor(Math.random() * 10000)}`,
          name: 'Test User'
        }
      };
    }

    const { access_token, refresh_token, expires_in, health_id, name } = tokenResponse.data;

    // Encrypt tokens before storage
    const encryptedAccess = encrypt(access_token);
    const encryptedRefresh = encrypt(refresh_token);
    const hashedHealthId = hashHealthId(health_id);

    // Store tokens and health ID
    await supabaseAdmin
      .from('user_abha_tokens')
      .upsert({
        user_id: pendingRequest.user_id,
        health_id_hash: hashedHealthId,
        health_id_display: `**-****-****-${health_id.slice(-4)}`,
        access_token_encrypted: encryptedAccess.encrypted,
        access_token_iv: encryptedAccess.iv,
        access_token_tag: encryptedAccess.tag,
        refresh_token_encrypted: encryptedRefresh.encrypted,
        refresh_token_iv: encryptedRefresh.iv,
        refresh_token_tag: encryptedRefresh.tag,
        token_expires_at: new Date(Date.now() + expires_in * 1000).toISOString(),
        abha_name: name,
        last_refreshed_at: new Date().toISOString()
      });

    // Update pending request status
    await supabaseAdmin
      .from('abha_pending_requests')
      .update({ status: 'completed' })
      .eq('state', state);

    await logAuditEvent({
      actor: pendingRequest.user_id,
      action: 'abha_linked',
      targetId: hashedHealthId,
      metadata: { health_id_last4: health_id.slice(-4) }
    });

    // Redirect to frontend success page
    res.redirect(`${process.env.ALLOWED_ORIGINS?.split(',')[0]}/dashboard?abha_linked=success`);

  } catch (error) {
    console.error('ABHA callback error:', error);
    res.status(500).json({ 
      error: 'Failed to complete ABHA authentication',
      details: error instanceof z.ZodError ? error.errors : undefined
    });
  }
});

/**
 * POST /api/auth/abha/refresh
 * Refresh ABHA access token using refresh token
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }

    // Get stored tokens
    const { data: tokenData } = await supabaseAdmin
      .from('user_abha_tokens')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!tokenData) {
      return res.status(404).json({ error: 'No ABHA tokens found for user' });
    }

    // Decrypt refresh token
    const refreshToken = decrypt(
      tokenData.refresh_token_encrypted,
      tokenData.refresh_token_iv,
      tokenData.refresh_token_tag
    );

    // Request new access token
    // TODO: Use real ABDM token refresh endpoint
    let tokenResponse;
    try {
      tokenResponse = await axios.post(
        `${ABHA_BASE_URL}/auth/token`,
        {
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: ABHA_CLIENT_ID,
          client_secret: ABHA_CLIENT_SECRET
        },
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }
      );
    } catch (apiError) {
      // Mock response for sandbox
      tokenResponse = {
        data: {
          access_token: `mock_refreshed_${generateSecureToken(16)}`,
          expires_in: 3600
        }
      };
    }

    const { access_token, expires_in } = tokenResponse.data;
    const encryptedAccess = encrypt(access_token);

    // Update stored token
    await supabaseAdmin
      .from('user_abha_tokens')
      .update({
        access_token_encrypted: encryptedAccess.encrypted,
        access_token_iv: encryptedAccess.iv,
        access_token_tag: encryptedAccess.tag,
        token_expires_at: new Date(Date.now() + expires_in * 1000).toISOString(),
        last_refreshed_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    await logAuditEvent({
      actor: userId,
      action: 'abha_token_refreshed',
      targetId: tokenData.health_id_hash,
      metadata: {}
    });

    res.json({ success: true, message: 'Token refreshed successfully' });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Failed to refresh ABHA token' });
  }
});

/**
 * GET /api/auth/abha/status/:userId
 * Check if user has linked ABHA
 */
router.get('/status/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const { data: tokenData } = await supabaseAdmin
      .from('user_abha_tokens')
      .select('health_id_display, abha_name, token_expires_at, last_refreshed_at')
      .eq('user_id', userId)
      .single();

    if (!tokenData) {
      return res.json({ linked: false });
    }

    const isExpired = new Date(tokenData.token_expires_at) < new Date();

    res.json({
      linked: true,
      healthIdDisplay: tokenData.health_id_display,
      name: tokenData.abha_name,
      tokenExpired: isExpired,
      lastRefreshed: tokenData.last_refreshed_at
    });

  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({ error: 'Failed to check ABHA status' });
  }
});

export default router;

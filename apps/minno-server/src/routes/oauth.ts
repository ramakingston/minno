import { Router, Request, Response } from 'express';
import { OAuthService } from '../services/OAuthService.js';

const router = Router();
const oauthService = new OAuthService();

// OAuth initiation endpoint
router.get('/:provider/install', async (req: Request, res: Response) => {
  try {
    const { provider } = req.params;
    const { state } = req.query;

    if (!['slack', 'notion'].includes(provider)) {
      return res.status(400).json({ error: 'Invalid provider' });
    }

    const authUrl = await oauthService.getAuthorizationUrl(
      provider as 'slack' | 'notion',
      state as string | undefined
    );

    res.redirect(authUrl);
  } catch (error) {
    console.error('OAuth initiation error:', error);
    res.status(500).json({ error: 'Failed to initiate OAuth flow' });
  }
});

// OAuth callback endpoint
router.get('/:provider/callback', async (req: Request, res: Response) => {
  try {
    const { provider } = req.params;
    const { code, state, error } = req.query;

    if (!['slack', 'notion'].includes(provider)) {
      return res.status(400).json({ error: 'Invalid provider' });
    }

    if (error) {
      console.error('OAuth error:', error);
      return res.status(400).json({ error: 'OAuth authorization failed' });
    }

    if (!code) {
      return res.status(400).json({ error: 'Missing authorization code' });
    }

    const result = await oauthService.handleCallback(
      provider as 'slack' | 'notion',
      code as string,
      state as string | undefined
    );

    // TODO: Redirect to success page or return success response
    res.json({
      success: true,
      message: `${provider} integration installed successfully`,
      ...result,
    });
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).json({ error: 'Failed to complete OAuth flow' });
  }
});

export default router;

import { Router } from 'express';
import healthRoutes from './health.js';
import slackRoutes from './slack.js';
import oauthRoutes from './oauth.js';

const router = Router();

// Mount route modules
router.use('/', healthRoutes);
router.use('/slack', slackRoutes);
router.use('/oauth', oauthRoutes);

// Root endpoint
router.get('/', (req, res) => {
  res.json({
    name: 'Minno Server',
    version: '0.1.0',
    endpoints: {
      health: '/health',
      slack_events: '/slack/events',
      slack_interactive: '/slack/interactive',
      oauth: '/oauth/:provider/install',
      oauth_callback: '/oauth/:provider/callback',
    },
  });
});

export default router;

import { Router, Request, Response } from 'express';
import { slackVerify } from '../middleware/slackVerify.js';

const router = Router();

// Slack Events API endpoint
router.post('/events', slackVerify, async (req: Request, res: Response) => {
  try {
    const { type, challenge, event } = req.body;

    // URL verification challenge
    if (type === 'url_verification') {
      return res.json({ challenge });
    }

    // Acknowledge the event immediately (Slack requires response within 3 seconds)
    res.status(200).send();

    // Process event asynchronously
    if (type === 'event_callback') {
      // TODO: Implement event processing with EdgeWorker
      console.log('Received Slack event:', event);
    }
  } catch (error) {
    console.error('Error handling Slack event:', error);
    // Don't send error response - already acknowledged
  }
});

// Slack interactive endpoint (buttons, modals, etc.)
router.post('/interactive', slackVerify, async (req: Request, res: Response) => {
  try {
    // Slack sends the payload as form-encoded JSON
    const payload = JSON.parse(req.body.payload);

    // Acknowledge immediately
    res.status(200).send();

    // TODO: Implement interactive component handling
    console.log('Received Slack interactive event:', payload);
  } catch (error) {
    console.error('Error handling Slack interactive event:', error);
    // Don't send error response - already acknowledged
  }
});

export default router;

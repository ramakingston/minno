import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { config } from '../config.js';

/**
 * Middleware to verify Slack request signatures
 * Protects against replay attacks and ensures requests are from Slack
 */
export function slackVerify(req: Request, res: Response, next: NextFunction): void {
  const signature = req.headers['x-slack-signature'] as string;
  const timestamp = req.headers['x-slack-request-timestamp'] as string;

  if (!signature || !timestamp) {
    res.status(400).send('Missing Slack signature headers');
    return;
  }

  // Verify timestamp to prevent replay attacks
  // Request timestamp must be within 5 minutes of current time
  const time = Math.floor(Date.now() / 1000);
  const requestTime = parseInt(timestamp, 10);

  if (Math.abs(time - requestTime) > 300) {
    res.status(400).send('Request timestamp is too old');
    return;
  }

  // Verify signature
  // Slack signs requests with HMAC-SHA256
  const body = JSON.stringify(req.body);
  const sigBasestring = `v0:${timestamp}:${body}`;
  const mySignature =
    'v0=' +
    crypto
      .createHmac('sha256', config.slack.signingSecret)
      .update(sigBasestring)
      .digest('hex');

  try {
    // Use timing-safe comparison to prevent timing attacks
    if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(mySignature))) {
      next();
    } else {
      res.status(401).send('Invalid signature');
    }
  } catch (error) {
    // timingSafeEqual throws if strings are different lengths
    res.status(401).send('Invalid signature');
  }
}

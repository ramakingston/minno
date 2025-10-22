import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  slack: {
    signingSecret: process.env.SLACK_SIGNING_SECRET!,
    clientId: process.env.SLACK_CLIENT_ID!,
    clientSecret: process.env.SLACK_CLIENT_SECRET!,
  },
  notion: {
    clientId: process.env.NOTION_CLIENT_ID,
    clientSecret: process.env.NOTION_CLIENT_SECRET,
  },
  database: {
    url: process.env.DATABASE_URL!,
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY!,
  },
};

// Validate required configuration
function validateConfig() {
  const required = [
    'SLACK_SIGNING_SECRET',
    'SLACK_CLIENT_ID',
    'SLACK_CLIENT_SECRET',
    'DATABASE_URL',
    'ANTHROPIC_API_KEY',
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }
}

// Only validate in production
if (config.nodeEnv === 'production') {
  validateConfig();
}

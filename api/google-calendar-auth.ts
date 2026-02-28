// api/google-calendar-auth.ts
import { NextApiRequest, NextApiResponse } from 'next';
import * as GoogleAuth from 'google-auth-library';

const oauth2Client = new GoogleAuth.OAuth2Client({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  redirectUri: `http://localhost:3000/api/google-calendar-auth/callback`,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/calendar.readonly'],
    });
    res.status(200).json({ url: authUrl });
  } else if (req.method === 'POST') {
    const code = req.body.code;
    try {
      const { tokens } = await oauth2Client.getToken(code);
      res.status(200).json(tokens);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get access token' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

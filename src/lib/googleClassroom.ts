import { OAuth2Client } from 'google-auth-library';
import * as googleClassroom from '@googleapis/classroom';

const oauth2Client = new OAuth2Client({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
});

export async function getCourses(accessToken: string) {
  oauth2Client.setCredentials({ access_token: accessToken });
  const classroom = googleClassroom('v1');
  try {
    const response = await classroom.courses.list({
      auth: oauth2Client,
    });
    return response.data.courses || [];
  } catch (error) {
    console.error('Failed to get courses:', error);
    return [];
  }
}

export async function getAnnouncements(courseId: string, accessToken: string) {
  oauth2Client.setCredentials({ access_token: accessToken });
  const classroom = googleClassroom('v1');
  try {
    const response = await classroom.courses.announcements.list({
      auth: oauth2Client,
      courseId,
    });
    return response.data.announcements || [];
  } catch (error) {
    console.error('Failed to get announcements:', error);
    return [];
  }
}

import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';

// Use Classroom-specific client so tokens don't conflict with YouTube (same env as auth/callback)
const oauth2Client = new OAuth2Client({
  clientId: process.env.GOOGLE_CLASSROOM_CLIENT_ID || process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLASSROOM_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET,
});

export async function getCourses(accessToken: string) {
  oauth2Client.setCredentials({ access_token: accessToken });
  const classroom = google.classroom({ version: 'v1', auth: oauth2Client });
  try {
    const response = await classroom.courses.list({});
    return response.data.courses || [];
  } catch (error: unknown) {
    const status = (error as { code?: number })?.code ?? (error as { response?: { status?: number } })?.response?.status;
    if (status === 401) {
      console.warn('[googleClassroom] getCourses: token invalid or expired (401)');
    } else {
      console.error('Failed to get courses:', error);
    }
    return [];
  }
}

export async function getAnnouncements(courseId: string, accessToken: string) {
  oauth2Client.setCredentials({ access_token: accessToken });
  const classroom = google.classroom({ version: 'v1', auth: oauth2Client });
  try {
    const response = await classroom.courses.announcements.list({ courseId });
    return response.data.announcements || [];
  } catch (error) {
    console.error('Failed to get announcements:', error);
    return [];
  }
}

export async function getCoursework(courseId: string, accessToken: string) {
  oauth2Client.setCredentials({ access_token: accessToken });
  const classroom = google.classroom({ version: 'v1', auth: oauth2Client });
  try {
    const response = await classroom.courses.courseWork.list({ courseId });
    return response.data.courseWork || [];
  } catch (error) {
    console.error('Failed to get coursework:', error);
    return [];
  }
}

export async function getCourseWorkMaterials(courseId: string, accessToken: string) {
  oauth2Client.setCredentials({ access_token: accessToken });
  const classroom = google.classroom({ version: 'v1', auth: oauth2Client });
  try {
    const response = await classroom.courses.courseWorkMaterials.list({ courseId });
    return response.data.courseWorkMaterial || [];
  } catch (error) {
    console.error('Failed to get course work materials:', error);
    return [];
  }
}

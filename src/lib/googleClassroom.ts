import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';

// Use Classroom-specific client so tokens don't conflict with YouTube (same env as auth/callback)
const oauth2Client = new OAuth2Client({
  clientId: process.env.GOOGLE_CLASSROOM_CLIENT_ID || process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLASSROOM_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET,
});

// Use string overload to avoid OAuth2Client type mismatch between google-auth-library and googleapis-common
const classroom = google.classroom('v1');

// Cast so auth is accepted (googleapis-common and google-auth-library use compatible but distinct OAuth2Client types)
function withAuth(accessToken: string) {
  oauth2Client.setCredentials({ access_token: accessToken });
  return oauth2Client as any;
}

export async function getCourses(accessToken: string) {
  try {
    const response = await classroom.courses.list({ auth: withAuth(accessToken) });
    return response.data.courses || [];
  } catch (error) {
    console.error('Failed to get courses:', error);
    return [];
  }
}

export async function getAnnouncements(courseId: string, accessToken: string) {
  try {
    const response = await classroom.courses.announcements.list({
      courseId,
      auth: withAuth(accessToken),
    });
    return response.data.announcements || [];
  } catch (error) {
    console.error('Failed to get announcements:', error);
    return [];
  }
}

export async function getCoursework(courseId: string, accessToken: string) {
  try {
    const response = await classroom.courses.courseWork.list({
      courseId,
      auth: withAuth(accessToken),
    });
    return response.data.courseWork || [];
  } catch (error) {
    console.error('Failed to get coursework:', error);
    return [];
  }
}

export async function getCourseWorkMaterials(courseId: string, accessToken: string) {
  try {
    const response = await classroom.courses.courseWorkMaterials.list({
      courseId,
      auth: withAuth(accessToken),
    });
    return response.data.courseWorkMaterial || [];
  } catch (error) {
    console.error('Failed to get course work materials:', error);
    return [];
  }
}

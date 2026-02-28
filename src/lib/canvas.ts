import axios, { type AxiosInstance } from 'axios';

function getBaseUrl(): string {
  const raw = process.env.CANVAS_BASE_URL?.trim();
  if (!raw) throw new Error('CANVAS_BASE_URL is not set');
  const base = raw.replace(/\/$/, '');
  return base.startsWith('http') ? base : `https://${base}`;
}

let canvasClient: AxiosInstance | null = null;

function getCanvas(): AxiosInstance {
  if (canvasClient) return canvasClient;
  const token = process.env.CANVAS_PERSONAL_TOKEN;
  if (!token) throw new Error('CANVAS_PERSONAL_TOKEN is not set');
  const base = getBaseUrl();
  canvasClient = axios.create({
    baseURL: `${base}/api/v1`,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return canvasClient;
}

/**
 * Fetch current user's courses
 */
export async function getUserCourses(): Promise<Course[]> {
  try {
    const canvas = getCanvas();
    const res = await canvas.get('/courses', {
      params: {
        enrollment_state: 'active',
        per_page: 50,
      },
    });
    return res.data;
  } catch (error) {
    console.error('Error fetching user courses:', error);
    throw error;
  }
}

/**
 * Fetch assignments for a specific course
 */
export async function getCourseAssignments(courseId: string | number): Promise<Assignment[]> {
  try {
    const canvas = getCanvas();
    const res = await canvas.get(`/courses/${courseId}/assignments`, {
      params: { per_page: 50 },
    });
    return res.data;
  } catch (error) {
    console.error('Error fetching course assignments:', error);
    throw error;
  }
}

/**
 * Fetch announcements / discussion topics for a course
 */
export async function getCourseAnnouncements(courseId: string | number): Promise<DiscussionTopic[]> {
  try {
    const canvas = getCanvas();
    const res = await canvas.get(`/courses/${courseId}/discussion_topics`, {
      params: { only_announcements: true },
    });
    return res.data;
  } catch (error) {
    console.error('Error fetching course announcements:', error);
    throw error;
  }
}

/**
 * Fetch modules for a course (with items)
 */
export async function getCourseModules(courseId: string | number): Promise<Module[]> {
  try {
    const canvas = getCanvas();
    const res = await canvas.get(`/courses/${courseId}/modules`, {
      params: { include: ['items'] },
    });
    return res.data;
  } catch (error) {
    console.error('Error fetching course modules:', error);
    throw error;
  }
}

/**
 * Fetch a single assignment's details (including description)
 */
export async function getAssignmentDetails(
  courseId: string | number,
  assignmentId: string | number
): Promise<Assignment> {
  try {
    const canvas = getCanvas();
    const res = await canvas.get(`/courses/${courseId}/assignments/${assignmentId}`);
    return res.data;
  } catch (error) {
    console.error('Error fetching assignment details:', error);
    throw error;
  }
}

// --- User token (OAuth) support ---

/**
 * Create a Canvas API client using a specific access token and base URL.
 * Used when the user has connected Canvas via OAuth.
 */
export function createCanvasClientWithToken(accessToken: string, baseUrl: string): AxiosInstance {
  const base = baseUrl.replace(/\/$/, '');
  return axios.create({
    baseURL: `${base}/api/v1`,
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

/**
 * Fetch current user's courses using an access token
 */
export async function getUserCoursesWithToken(accessToken: string, baseUrl: string): Promise<Course[]> {
  try {
    const client = createCanvasClientWithToken(accessToken, baseUrl);
    const res = await client.get('/courses', {
      params: { enrollment_state: 'active', per_page: 50 },
    });
    return res.data;
  } catch (error) {
    console.error('Error fetching user courses with token:', error);
    throw error;
  }
}

/**
 * Fetch assignments for a specific course using an access token
 */
export async function getCourseAssignmentsWithToken(
  accessToken: string,
  baseUrl: string,
  courseId: string | number
): Promise<Assignment[]> {
  try {
    const client = createCanvasClientWithToken(accessToken, baseUrl);
    const res = await client.get(`/courses/${courseId}/assignments`, {
      params: { per_page: 50 },
    });
    return res.data;
  } catch (error) {
    console.error('Error fetching course assignments with token:', error);
    throw error;
  }
}

/**
 * Fetch announcements / discussion topics for a course using an access token
 */
export async function getCourseAnnouncementsWithToken(
  accessToken: string,
  baseUrl: string,
  courseId: string | number
): Promise<DiscussionTopic[]> {
  try {
    const client = createCanvasClientWithToken(accessToken, baseUrl);
    const res = await client.get(`/courses/${courseId}/discussion_topics`, {
      params: { only_announcements: true },
    });
    return res.data;
  } catch (error) {
    console.error('Error fetching course announcements with token:', error);
    throw error;
  }
}

/**
 * Fetch modules for a course using an access token (with items)
 */
export async function getCourseModulesWithToken(
  accessToken: string,
  baseUrl: string,
  courseId: string | number
): Promise<Module[]> {
  try {
    const client = createCanvasClientWithToken(accessToken, baseUrl);
    const res = await client.get(`/courses/${courseId}/modules`, {
      params: { include: ['items'] },
    });
    return res.data;
  } catch (error) {
    console.error('Error fetching course modules with token:', error);
    throw error;
  }
}

// Define types for the responses
interface Course {}
interface Assignment {}
interface DiscussionTopic {}
interface Module {}

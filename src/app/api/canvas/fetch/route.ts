// app/api/canvas/fetch/route.ts
import { NextRequest, NextResponse } from 'next/server';
import * as canvasApi from '@/lib/canvas';
import { auth } from '@clerk/nextjs/server';

export async function GET(req: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');
  const courseId = searchParams.get('courseId');

  if (!type) {
    return NextResponse.json({ error: 'Missing query parameter: type' }, { status: 400 });
  }

  try {
    let data: unknown;

    switch (type) {
      case 'courses':
        data = await canvasApi.getUserCourses();
        break;
      case 'assignments':
        if (!courseId) {
          return NextResponse.json({ error: 'courseId required' }, { status: 400 });
        }
        data = await canvasApi.getCourseAssignments(courseId);
        break;
      case 'announcements':
        if (!courseId) {
          return NextResponse.json({ error: 'courseId required' }, { status: 400 });
        }
        data = await canvasApi.getCourseAnnouncements(courseId);
        break;
      case 'modules':
        if (!courseId) {
          return NextResponse.json({ error: 'courseId required' }, { status: 400 });
        }
        data = await canvasApi.getCourseModules(courseId);
        break;
      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch from Canvas';
    console.error('Canvas API error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
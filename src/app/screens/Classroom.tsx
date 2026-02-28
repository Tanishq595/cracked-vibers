import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  GraduationCap,
  Loader2,
  ExternalLink,
  AlertCircle,
  Link2,
  BookOpen,
  FileText,
  Megaphone,
  ClipboardList,
} from 'lucide-react';
import { AIChatAssistant } from '../components/AIChatAssistant';

type ClassroomCourse = {
  id: string;
  name: string;
  section: string;
  courseState: string;
  alternateLink: string;
  coursework?: Array<{
    id: string;
    title: string;
    dueDate?: { year?: number; month?: number; day?: number };
    dueTime?: { hours?: number; minutes?: number };
    maxPoints?: number;
    state?: string;
    alternateLink?: string;
  }>;
  announcements?: Array<{
    id: string;
    text: string;
    creationTime?: string;
    alternateLink?: string;
  }>;
  materials?: Array<{
    id: string;
    title: string;
    state?: string;
    alternateLink?: string;
  }>;
};

type ClassroomData = {
  connected: boolean;
  courses?: ClassroomCourse[];
  error?: string;
};

function formatDue(dueDate?: { year?: number; month?: number; day?: number }, dueTime?: { hours?: number; minutes?: number }): string {
  if (!dueDate) return '';
  const { year, month, day } = dueDate;
  if (year == null || month == null || day == null) return '';
  const d = new Date(year, month - 1, day, dueTime?.hours ?? 0, dueTime?.minutes ?? 0);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatTime(creationTime?: string): string {
  if (!creationTime) return '';
  try {
    return new Date(creationTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

export function Classroom() {
  const [data, setData] = useState<ClassroomData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/google-classroom-data', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : { connected: false }))
      .then((body) => {
        if (cancelled) return;
        setData(body ?? { connected: false });
      })
      .catch(() => {
        if (!cancelled) setData({ connected: false });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 text-[#ffb347] animate-spin" />
        <p className="text-slate-600 font-medium">Loading Classroom...</p>
      </div>
    );
  }

  const connected = data?.connected === true;
  const courses = Array.isArray(data?.courses) ? data.courses : [];

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-4xl mx-auto">
      <AIChatAssistant />

      <div className="flex items-center gap-3">
        <div className="p-3 rounded-2xl bg-emerald-100 border border-emerald-200">
          <GraduationCap className="w-8 h-8 text-emerald-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Google Classroom</h1>
          <p className="text-slate-600 text-sm">
            {connected
              ? `Connected — ${courses.length} course${courses.length !== 1 ? 's' : ''}`
              : 'Connect your account to see your courses'}
          </p>
        </div>
      </div>

      {!connected && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border-2 border-slate-200 bg-slate-50 p-6 flex flex-col items-center text-center gap-4"
        >
          <div className="p-4 rounded-full bg-slate-200">
            <Link2 className="w-10 h-10 text-slate-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-1">Not connected</h2>
            <p className="text-slate-600 text-sm max-w-sm">
              Connect your Google Classroom account in Onboarding to see your courses, assignments, announcements, and materials.
            </p>
          </div>
          <a
            href="/onboarding"
            className="px-5 py-2.5 rounded-xl font-semibold bg-[#ffb347] text-white hover:bg-[#ff8c42] transition-colors"
          >
            Go to Onboarding
          </a>
        </motion.div>
      )}

      {connected && data?.error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800">{data.error}</p>
        </div>
      )}

      {connected && courses.length === 0 && !data?.error && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
          <BookOpen className="w-12 h-12 text-slate-400 mx-auto mb-2" />
          <p className="text-slate-600 font-medium">No courses yet</p>
          <p className="text-slate-500 text-sm mt-1">Your active and archived courses will appear here.</p>
          <p className="text-slate-500 text-xs mt-2 max-w-sm mx-auto">
            When you have courses, each will show <strong>Assignments</strong>, <strong>Announcements</strong>, and <strong>Materials</strong> in one place.
          </p>
          <a
            href="https://classroom.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-4 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
          >
            Open Google Classroom <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      )}

      {connected && courses.length > 0 && (
        <div className="space-y-6">
          <a
            href="https://classroom.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
          >
            Open in Google Classroom <ExternalLink className="w-4 h-4" />
          </a>

          {courses.map((course) => (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border-2 border-slate-200 bg-card overflow-hidden"
            >
              <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-bold text-slate-900 text-lg">{course.name}</h2>
                    {course.section && <p className="text-xs text-slate-500 mt-0.5">{course.section}</p>}
                    {course.courseState === 'ARCHIVED' && (
                      <span className="inline-block mt-2 text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">Archived</span>
                    )}
                  </div>
                  <a
                    href={course.alternateLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-emerald-600 hover:text-emerald-700 text-sm font-medium flex items-center gap-1"
                  >
                    Open <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>

              <div className="p-4 space-y-4">
                {/* Coursework (assignments) */}
                {Array.isArray(course.coursework) && course.coursework.length > 0 && (
                  <div>
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                      <ClipboardList className="w-4 h-4 text-emerald-600" />
                      Assignments ({course.coursework.length})
                    </h3>
                    <ul className="space-y-2">
                      {course.coursework.map((w) => (
                        <li key={w.id} className="flex items-start justify-between gap-2 text-sm">
                          <div className="min-w-0">
                            <p className="font-medium text-slate-900 line-clamp-1">{w.title}</p>
                            {(w.dueDate || w.maxPoints != null) && (
                              <p className="text-xs text-slate-500 mt-0.5">
                                {w.dueDate && formatDue(w.dueDate, w.dueTime)}
                                {w.maxPoints != null && ` · ${w.maxPoints} pts`}
                              </p>
                            )}
                          </div>
                          {w.alternateLink && (
                            <a
                              href={w.alternateLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="shrink-0 text-emerald-600 hover:text-emerald-700"
                              aria-label="Open assignment"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Announcements */}
                {Array.isArray(course.announcements) && course.announcements.length > 0 && (
                  <div>
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                      <Megaphone className="w-4 h-4 text-amber-600" />
                      Announcements ({course.announcements.length})
                    </h3>
                    <ul className="space-y-2">
                      {course.announcements.map((a) => (
                        <li key={a.id} className="text-sm">
                          <p className="text-slate-900 line-clamp-2">{a.text || '—'}</p>
                          {a.creationTime && (
                            <p className="text-xs text-slate-500 mt-0.5">{formatTime(a.creationTime)}</p>
                          )}
                          {a.alternateLink && (
                            <a
                              href={a.alternateLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-emerald-600 hover:text-emerald-700 mt-1 inline-flex items-center gap-1"
                            >
                              View <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Course materials */}
                {Array.isArray(course.materials) && course.materials.length > 0 && (
                  <div>
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                      <FileText className="w-4 h-4 text-slate-600" />
                      Materials ({course.materials.length})
                    </h3>
                    <ul className="space-y-2">
                      {course.materials.map((m) => (
                        <li key={m.id} className="flex items-center justify-between gap-2 text-sm">
                          <p className="font-medium text-slate-900 line-clamp-1">{m.title || 'Material'}</p>
                          {m.alternateLink && (
                            <a
                              href={m.alternateLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="shrink-0 text-emerald-600 hover:text-emerald-700"
                              aria-label="Open material"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {(!course.coursework?.length && !course.announcements?.length && !course.materials?.length) && (
                  <p className="text-sm text-slate-500">No assignments, announcements, or materials for this course.</p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

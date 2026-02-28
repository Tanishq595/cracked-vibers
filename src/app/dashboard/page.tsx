'use client';

import { useState } from 'react';
import { Button } from '@/app/components/ui/button';
// import ReactMarkdown if you use it for rendering synthesis result

export default function Dashboard() {
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [synthesisResult, setSynthesisResult] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Load user's Canvas courses
  const fetchCourses = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/canvas/fetch?type=courses');
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? 'Failed to fetch courses');
      setCourses(json.data ?? []);
    } catch (err: any) {
      setError(err.message || 'Canvas connection failed');
    }
    setLoading(false);
  };

  // Step 2: Load assignments for selected course
  const fetchAssignments = async (courseId: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/canvas/fetch?type=assignments&courseId=${courseId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? 'Failed to fetch assignments');
      setAssignments(json.data ?? []);
      setSelectedCourseId(courseId);
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  // Step 3: The magic — send Canvas data to synthesis
  const handleSynthesizeWithCanvas = async () => {
    if (!selectedCourseId || assignments.length === 0) {
      setError('No course or assignments selected');
      return;
    }

    setLoading(true);
    setError('');
    setSynthesisResult('');

    try {
      // Format Canvas assignments into text for synthesis
      const canvasText = assignments
        .map((a: any) => 
          `Assignment: ${a.name}\n` +
          `Description: ${a.description?.replace(/<[^>]+>/g, '') || 'No description'}\n` + // strip HTML
          `Due: ${a.due_at || 'No due date'}\n` +
          `Points: ${a.points_possible || 'N/A'}`
        )
        .join('\n\n');

      // You can combine with other sources later (Notion, YouTube, uploads)
      const fullMaterials = `Canvas course data:\n${canvasText}`;

      const synthRes = await fetch('/api/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ materials: fullMaterials }),
      });

      if (!synthRes.ok) throw new Error('Synthesis failed');
      const synthJson = await synthRes.json();

      setSynthesisResult(synthJson.markdown ?? synthJson.result ?? 'No result returned');
    } catch (err: any) {
      setError(err.message || 'Failed to synthesize');
    }
    setLoading(false);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">M.U.S.T.Learn Dashboard</h1>

      {/* Canvas Section */}
      <div className="mb-10 border p-6 rounded-lg bg-gray-50">
        <h2 className="text-2xl font-semibold mb-4">Connect Canvas</h2>

        <Button 
          onClick={fetchCourses} 
          disabled={loading || courses.length > 0}
          className="mb-4"
        >
          {loading ? 'Loading...' : 'Load My Canvas Courses'}
        </Button>

        {error && <p className="text-red-600 mb-4">{error}</p>}

        {courses.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2">
            {courses.map((course) => (
              <div 
                key={course.id} 
                className={`border p-4 rounded cursor-pointer hover:bg-blue-50 transition ${selectedCourseId === course.id ? 'bg-blue-100 border-blue-500' : ''}`}
                onClick={() => fetchAssignments(course.id)}
              >
                <h3 className="font-bold">{course.name}</h3>
                <p className="text-sm text-gray-600">{course.course_code || 'No code'}</p>
              </div>
            ))}
          </div>
        )}

        {selectedCourseId && assignments.length > 0 && (
          <div className="mt-6">
            <h3 className="text-xl font-medium mb-3">Assignments in selected course</h3>
            <Button 
              onClick={handleSynthesizeWithCanvas}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700"
            >
              {loading ? 'Synthesizing...' : 'Synthesize This Course with AI'}
            </Button>
          </div>
        )}
      </div>

      {/* Synthesis Result */}
      {synthesisResult && (
        <div className="mt-10 border p-6 rounded-lg bg-white shadow">
          <h2 className="text-2xl font-semibold mb-4">AI Synthesis Result</h2>
          <div className="prose max-w-none">
            {/* Use react-markdown here if you have it installed */}
            <pre className="whitespace-pre-wrap bg-gray-100 p-4 rounded">{synthesisResult}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
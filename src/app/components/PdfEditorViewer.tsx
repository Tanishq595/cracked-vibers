'use client';

import { useState, useCallback, useMemo } from 'react';
import { Worker, Viewer } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import {
  highlightPlugin,
  type RenderHighlightTargetProps,
  type RenderHighlightContentProps,
  type RenderHighlightsProps,
  type HighlightArea,
} from '@react-pdf-viewer/highlight';
import { Button, Position, Tooltip } from '@react-pdf-viewer/core';
import { MessageIcon } from '@react-pdf-viewer/highlight';
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';
import '@react-pdf-viewer/highlight/lib/styles/index.css';
import { X, Highlighter } from 'lucide-react';

const PDF_ANNOTATIONS_KEY = 'mustlearn_pdf_annotations_';

export interface PdfNote {
  id: string;
  content: string;
  highlightAreas: HighlightArea[];
  quote: string;
}

function loadNotes(fileKey: string): PdfNote[] {
  try {
    const raw = localStorage.getItem(PDF_ANNOTATIONS_KEY + fileKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PdfNote[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveNotes(fileKey: string, notes: PdfNote[]) {
  try {
    localStorage.setItem(PDF_ANNOTATIONS_KEY + fileKey, JSON.stringify(notes));
  } catch {
    // ignore
  }
}

export interface PdfEditorViewerProps {
  fileUrl: string;
  fileKey: string;
  fileName?: string;
  onClose: () => void;
}

// Worker is copied to public/ by Vite (see vite.config.ts) so it loads from same origin
const PDF_WORKER_URL = '/pdf.worker.min.js';

export function PdfEditorViewer({ fileUrl, fileKey, fileName, onClose }: PdfEditorViewerProps) {
  const [notes, setNotes] = useState<PdfNote[]>(() => loadNotes(fileKey));
  const [noteMessage, setNoteMessage] = useState('');

  const persistNotes = useCallback(
    (next: PdfNote[] | ((prev: PdfNote[]) => PdfNote[])) => {
      setNotes((prev) => {
        const nextList = typeof next === 'function' ? next(prev) : next;
        saveNotes(fileKey, nextList);
        return nextList;
      });
    },
    [fileKey]
  );

  const renderHighlightTarget = useCallback(
    (props: RenderHighlightTargetProps) => (
      <div
        style={{
          background: 'rgba(255, 179, 71, 0.95)',
          borderRadius: '6px',
          display: 'flex',
          gap: '4px',
          padding: '4px 6px',
          position: 'absolute',
          left: `${props.selectionRegion.left}%`,
          top: `${props.selectionRegion.top + props.selectionRegion.height}%`,
          transform: 'translate(0, 8px)',
          zIndex: 10,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}
      >
        <Tooltip position={Position.TopCenter} target={<Button onClick={props.toggle}><Highlighter className="w-4 h-4" /></Button>} content={() => 'Highlight or add note'} offset={{ left: 0, top: -8 }} />
      </div>
    ),
    []
  );

  const renderHighlightContent = useCallback(
    (props: RenderHighlightContentProps) => {
      const addNote = () => {
        const content = noteMessage.trim();
        const note: PdfNote = {
          id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          content: content || '',
          highlightAreas: props.highlightAreas,
          quote: props.selectedText,
        };
        persistNotes((prev) => [...prev, note]);
        setNoteMessage('');
        props.cancel();
      };
      return (
        <div
          style={{
            background: '#fff',
            border: '1px solid rgba(0,0,0,0.2)',
            borderRadius: '8px',
            padding: '10px',
            position: 'absolute',
            left: `${props.selectionRegion.left}%`,
            top: `${props.selectionRegion.top + props.selectionRegion.height}%`,
            zIndex: 11,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            minWidth: 220,
          }}
        >
          <textarea
            rows={3}
            placeholder="Add a note (optional)"
            value={noteMessage}
            onChange={(e) => setNoteMessage(e.target.value)}
            className="w-full rounded border border-slate-200 p-2 text-sm focus:border-[#ffb347] focus:outline-none"
          />
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={addNote} className="rounded-lg bg-[#ffb347] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#ff8c42]">
              Add
            </button>
            <button type="button" onClick={props.cancel} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100">
              Cancel
            </button>
          </div>
        </div>
      );
    },
    [noteMessage, persistNotes]
  );

  const renderHighlights = useCallback(
    (props: RenderHighlightsProps) => (
      <div>
        {notes.map((note) => (
          <span key={note.id}>
            {note.highlightAreas
              .filter((area) => area.pageIndex === props.pageIndex)
              .map((area, idx) => (
                <div
                  key={`${note.id}-${idx}`}
                  style={{
                    ...props.getCssProperties(area, props.rotation),
                    background: 'rgba(255, 179, 71, 0.35)',
                  }}
                />
              ))}
          </span>
        ))}
      </div>
    ),
    [notes]
  );

  const highlightPluginInstance = useMemo(
    () =>
      highlightPlugin({
        renderHighlightTarget,
        renderHighlightContent,
        renderHighlights,
      }),
    [renderHighlightTarget, renderHighlightContent, renderHighlights]
  );

  const defaultLayoutPluginInstance = useMemo(
    () =>
      defaultLayoutPlugin({
        sidebarTabs: (defaultTabs) =>
          defaultTabs.concat({
            content: (
              <div className="p-4">
                <h3 className="mb-3 font-semibold text-foreground">Notes & highlights</h3>
                {notes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Select text in the PDF to highlight or add a note.</p>
                ) : (
                  <ul className="space-y-3">
                    {notes.map((note) => (
                      <li
                        key={note.id}
                        className="cursor-pointer rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
                        onClick={() => highlightPluginInstance.jumpToHighlightArea(note.highlightAreas[0])}
                      >
                        <blockquote className="mb-1 truncate border-l-2 border-[#ffb347] pl-2 text-slate-700 dark:text-slate-300">
                          &quot;{note.quote}&quot;
                        </blockquote>
                        {note.content ? <p className="text-slate-600 dark:text-slate-400">{note.content}</p> : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ),
            icon: <MessageIcon />,
            title: 'Notes',
          }),
      }),
    [notes, highlightPluginInstance]
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2 dark:border-slate-800 dark:bg-slate-900">
        <span className="truncate text-sm font-medium text-foreground">{fileName ?? 'PDF'}</span>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-foreground dark:hover:bg-slate-800"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="flex-1 overflow-hidden">
        <Worker workerUrl={PDF_WORKER_URL}>
          <Viewer
            fileUrl={fileUrl}
            plugins={[defaultLayoutPluginInstance, highlightPluginInstance]}
          />
        </Worker>
      </div>
    </div>
  );
}

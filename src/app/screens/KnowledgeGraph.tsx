import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { 
  Filter, 
  Download, 
  ZoomIn, 
  ZoomOut,
  Maximize2,
  Clock,
  TrendingUp,
  ExternalLink
} from 'lucide-react';

interface Node {
  id: number;
  label: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  confidence: number;
  lastReviewed: string;
  subject: string;
  links: number[];
}

interface Edge {
  from: number;
  to: number;
}

// Initialize nodes with physics properties
const initialNodes: Node[] = [
  { id: 1, label: 'Calculus I', x: 400, y: 300, vx: 0, vy: 0, difficulty: 'Intermediate', confidence: 92, lastReviewed: '2 days ago', subject: 'Math', links: [2, 3] },
  { id: 2, label: 'Physics', x: 600, y: 250, vx: 0, vy: 0, difficulty: 'Intermediate', confidence: 85, lastReviewed: '5 days ago', subject: 'Science', links: [1, 5] },
  { id: 3, label: 'Linear Algebra', x: 350, y: 450, vx: 0, vy: 0, difficulty: 'Advanced', confidence: 78, lastReviewed: '1 week ago', subject: 'Math', links: [1, 6] },
  { id: 4, label: 'Biology', x: 700, y: 400, vx: 0, vy: 0, difficulty: 'Beginner', confidence: 95, lastReviewed: '1 day ago', subject: 'Science', links: [5, 8] },
  { id: 5, label: 'Chemistry', x: 550, y: 450, vx: 0, vy: 0, difficulty: 'Intermediate', confidence: 88, lastReviewed: '3 days ago', subject: 'Science', links: [2, 4, 8] },
  { id: 6, label: 'Statistics', x: 500, y: 200, vx: 0, vy: 0, difficulty: 'Intermediate', confidence: 82, lastReviewed: '4 days ago', subject: 'Math', links: [3, 7] },
  { id: 7, label: 'Data Science', x: 650, y: 150, vx: 0, vy: 0, difficulty: 'Advanced', confidence: 65, lastReviewed: '2 weeks ago', subject: 'Tech', links: [6] },
  { id: 8, label: 'Biochemistry', x: 750, y: 300, vx: 0, vy: 0, difficulty: 'Advanced', confidence: 70, lastReviewed: '1 week ago', subject: 'Science', links: [4, 5] },
  { id: 9, label: 'French 101', x: 250, y: 250, vx: 0, vy: 0, difficulty: 'Beginner', confidence: 90, lastReviewed: '1 day ago', subject: 'Language', links: [] },
  { id: 10, label: 'Art History', x: 300, y: 150, vx: 0, vy: 0, difficulty: 'Beginner', confidence: 87, lastReviewed: '3 days ago', subject: 'Humanities', links: [] },
];

const edges: Edge[] = [
  { from: 1, to: 2 },
  { from: 1, to: 3 },
  { from: 2, to: 5 },
  { from: 3, to: 6 },
  { from: 4, to: 5 },
  { from: 4, to: 8 },
  { from: 5, to: 8 },
  { from: 6, to: 7 },
];

export function KnowledgeGraph() {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [hoveredNode, setHoveredNode] = useState<Node | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string>('All');
  const [zoom, setZoom] = useState(1);
  const svgRef = useRef<SVGSVGElement>(null);

  const subjects = ['All', 'Math', 'Science', 'Tech', 'Language', 'Humanities'];

  // Simple physics simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setNodes((prevNodes) => {
        return prevNodes.map((node) => {
          let fx = 0;
          let fy = 0;

          // Repulsion from other nodes
          prevNodes.forEach((other) => {
            if (other.id !== node.id) {
              const dx = node.x - other.x;
              const dy = node.y - other.y;
              const dist = Math.sqrt(dx * dx + dy * dy) || 1;
              const force = 2000 / (dist * dist);
              fx += (dx / dist) * force;
              fy += (dy / dist) * force;
            }
          });

          // Attraction to connected nodes
          edges.forEach((edge) => {
            if (edge.from === node.id) {
              const other = prevNodes.find((n) => n.id === edge.to);
              if (other) {
                const dx = other.x - node.x;
                const dy = other.y - node.y;
                const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                const force = dist * 0.001;
                fx += dx * force;
                fy += dy * force;
              }
            }
            if (edge.to === node.id) {
              const other = prevNodes.find((n) => n.id === edge.from);
              if (other) {
                const dx = other.x - node.x;
                const dy = other.y - node.y;
                const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                const force = dist * 0.001;
                fx += dx * force;
                fy += dy * force;
              }
            }
          });

          // Center attraction
          const centerX = 500;
          const centerY = 300;
          const dx = centerX - node.x;
          const dy = centerY - node.y;
          fx += dx * 0.0005;
          fy += dy * 0.0005;

          // Update velocity with damping
          const damping = 0.8;
          const newVx = (node.vx + fx) * damping;
          const newVy = (node.vy + fy) * damping;

          // Update position
          let newX = node.x + newVx;
          let newY = node.y + newVy;

          // Boundary constraints
          newX = Math.max(50, Math.min(950, newX));
          newY = Math.max(50, Math.min(550, newY));

          return {
            ...node,
            x: newX,
            y: newY,
            vx: newVx,
            vy: newVy,
          };
        });
      });
    }, 50);

    return () => clearInterval(interval);
  }, []);

  const filteredNodes = selectedSubject === 'All' 
    ? nodes 
    : nodes.filter((node) => node.subject === selectedSubject);

  const getNodeColor = (confidence: number) => {
    if (confidence >= 85) return { fill: 'rgba(34, 211, 238, 0.2)', stroke: 'rgba(34, 211, 238, 0.9)' }; // cyan
    if (confidence >= 70) return { fill: 'rgba(99, 102, 241, 0.2)', stroke: 'rgba(99, 102, 241, 0.9)' }; // indigo
    return { fill: 'rgba(239, 68, 68, 0.2)', stroke: 'rgba(239, 68, 68, 0.9)' }; // red
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-4xl font-bold mb-2 text-slate-900">Knowledge Graph</h1>
          <p className="text-slate-600 font-medium">
            Interactive visualization of your learning connections
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="p-3 bg-white hover:bg-slate-50 rounded-xl border-2 border-slate-200 hover:border-indigo-400 transition-all shadow-sm">
            <Download className="w-5 h-5 text-slate-600" />
          </button>
          <button className="p-3 bg-white hover:bg-slate-50 rounded-xl border-2 border-slate-200 hover:border-indigo-400 transition-all shadow-sm">
            <Maximize2 className="w-5 h-5 text-slate-600" />
          </button>
        </div>
      </motion.div>

      {/* Controls */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex items-center justify-between p-4 bg-white rounded-2xl border-2 border-slate-200 shadow-sm"
      >
        <div className="flex items-center gap-3">
          <Filter className="w-5 h-5 text-slate-500" />
          <span className="text-sm text-slate-600 font-semibold">Subject:</span>
          <div className="flex gap-2">
            {subjects.map((subject) => (
              <button
                key={subject}
                onClick={() => setSelectedSubject(subject)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  selectedSubject === subject
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                {subject}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
            className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all"
          >
            <ZoomOut className="w-4 h-4 text-slate-600" />
          </button>
          <span className="text-sm text-slate-700 font-semibold w-12 text-center">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom(Math.min(2, zoom + 0.1))}
            className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all"
          >
            <ZoomIn className="w-4 h-4 text-slate-600" />
          </button>
        </div>
      </motion.div>

      {/* Graph Container */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="relative rounded-2xl bg-gradient-to-br from-slate-50 via-blue-50/30 to-cyan-50/30 border-2 border-slate-200 p-8 overflow-hidden shadow-sm"
        style={{ height: '600px' }}
      >
        {/* Legend */}
        <div className="absolute top-6 right-6 bg-white/90 backdrop-blur-xl border-2 border-slate-200 rounded-xl p-4 space-y-2 z-10 shadow-lg">
          <div className="text-xs font-bold text-slate-600 mb-2 uppercase tracking-wide">Confidence Level</div>
          <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
            <div className="w-3 h-3 rounded-full bg-cyan-500/20 border-2 border-cyan-500" />
            <span>High (85%+)</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
            <div className="w-3 h-3 rounded-full bg-indigo-500/20 border-2 border-indigo-500" />
            <span>Medium (70-84%)</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
            <div className="w-3 h-3 rounded-full bg-red-500/20 border-2 border-red-500" />
            <span>Low (&lt;70%)</span>
          </div>
        </div>

        {/* SVG Graph */}
        <svg
          ref={svgRef}
          className="w-full h-full"
          viewBox="0 0 1000 600"
          style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
        >
          {/* Edges */}
          <g>
            {edges.map((edge, i) => {
              const fromNode = filteredNodes.find((n) => n.id === edge.from);
              const toNode = filteredNodes.find((n) => n.id === edge.to);
              if (!fromNode || !toNode) return null;

              return (
                <line
                  key={i}
                  x1={fromNode.x}
                  y1={fromNode.y}
                  x2={toNode.x}
                  y2={toNode.y}
                  stroke="rgba(99, 102, 241, 0.4)"
                  strokeWidth="2.5"
                  markerEnd="url(#arrowhead)"
                />
              );
            })}
          </g>

          {/* Arrow marker */}
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="3"
              orient="auto"
            >
              <polygon
                points="0 0, 10 3, 0 6"
                fill="rgba(99, 102, 241, 0.6)"
              />
            </marker>
          </defs>

          {/* Nodes */}
          <g>
            {filteredNodes.map((node) => {
              const colors = getNodeColor(node.confidence);
              const isHovered = hoveredNode?.id === node.id;
              const radius = isHovered ? 35 : 30;

              return (
                <g
                  key={node.id}
                  onMouseEnter={() => setHoveredNode(node)}
                  onMouseLeave={() => setHoveredNode(null)}
                  className="cursor-pointer"
                >
                  {/* Glow effect on hover */}
                  {isHovered && (
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={radius + 10}
                      fill={colors.stroke}
                      opacity="0.15"
                      className="animate-pulse"
                    />
                  )}
                  
                  {/* Node circle */}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={radius}
                    fill={colors.fill}
                    stroke={colors.stroke}
                    strokeWidth="3.5"
                    className="transition-all duration-200"
                  />
                  
                  {/* Node label */}
                  <text
                    x={node.x}
                    y={node.y + radius + 20}
                    textAnchor="middle"
                    className="text-xs fill-slate-700 font-bold pointer-events-none"
                  >
                    {node.label}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        {/* Hover Tooltip */}
        {hoveredNode && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-6 left-6 bg-white/95 backdrop-blur-xl border-2 border-indigo-200 rounded-2xl p-6 w-80 shadow-xl"
            style={{ zIndex: 20 }}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">{hoveredNode.label}</h3>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2.5 py-1 rounded-lg font-semibold ${
                    hoveredNode.difficulty === 'Beginner' ? 'bg-emerald-100 text-emerald-700' :
                    hoveredNode.difficulty === 'Intermediate' ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {hoveredNode.difficulty}
                  </span>
                  <span className="text-xs text-slate-600 font-semibold">{hoveredNode.subject}</span>
                </div>
              </div>
              <ExternalLink className="w-5 h-5 text-slate-400 hover:text-indigo-600 cursor-pointer transition-colors" />
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-600 mb-1 font-semibold">
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    Confidence
                  </span>
                  <span className="text-slate-900 font-bold">{hoveredNode.confidence}%</span>
                </div>
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                  <div 
                    className="h-full bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-full transition-all"
                    style={{ width: `${hoveredNode.confidence}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                <Clock className="w-3 h-3" />
                <span>Last reviewed {hoveredNode.lastReviewed}</span>
              </div>

              <div className="pt-3 border-t-2 border-slate-100">
                <div className="text-xs text-slate-600 mb-2 font-semibold">
                  Prerequisites: {hoveredNode.links.length > 0 ? hoveredNode.links.length : 'None'}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Topics', value: nodes.length, color: 'indigo' },
          { label: 'Connections', value: edges.length, color: 'cyan' },
          { label: 'Avg Confidence', value: '84%', color: 'emerald' },
          { label: 'Subjects', value: subjects.length - 1, color: 'amber' },
        ].map((stat, i) => {
          const colorClasses = {
            indigo: 'text-indigo-600 bg-indigo-50 border-indigo-200',
            cyan: 'text-cyan-600 bg-cyan-50 border-cyan-200',
            emerald: 'text-emerald-600 bg-emerald-50 border-emerald-200',
            amber: 'text-amber-600 bg-amber-50 border-amber-200',
          };

          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.05 }}
              className={`p-4 rounded-xl border-2 text-center shadow-sm ${colorClasses[stat.color as keyof typeof colorClasses]}`}
            >
              <div className={`text-2xl font-bold mb-1 ${colorClasses[stat.color as keyof typeof colorClasses].split(' ')[0]}`}>{stat.value}</div>
              <div className="text-xs text-slate-600 font-semibold">{stat.label}</div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
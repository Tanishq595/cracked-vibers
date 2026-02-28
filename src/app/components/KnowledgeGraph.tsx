import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  radius: number;
  connections: number;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
  strength: number;
}

export interface KnowledgeGraphData {
  nodes?: Array<{ id: string; label: string }>;
  edges?: Array<{ from: string; to: string; type?: string }>;
}

interface KnowledgeGraphProps {
  data?: KnowledgeGraphData | null;
}

export function KnowledgeGraph({ data }: KnowledgeGraphProps = {}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 420 });

  useEffect(() => {
    // Update dimensions based on container
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDimensions({ width, height });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
    if (!svgRef.current) return;

    const { width, height } = dimensions;

    // Clear previous content
    d3.select(svgRef.current).selectAll('*').remove();

    let nodes: GraphNode[];
    let links: GraphLink[];

    const inputNodes = Array.isArray(data?.nodes) ? data!.nodes : [];
    const inputEdges = Array.isArray(data?.edges) ? data!.edges : [];

    if (inputNodes.length > 0) {
      const nodeMap = new Map<string, GraphNode>();
      inputNodes.forEach((n) => {
        nodeMap.set(n.id, {
          id: n.id,
          label: n.label,
          radius: 18,
          connections: 0,
          x: width / 2,
          y: height / 2,
        });
      });

      inputEdges.forEach((e) => {
        const from = nodeMap.get(e.from);
        const to = nodeMap.get(e.to);
        if (!from || !to) return;
        from.connections += 1;
        to.connections += 1;
      });

      nodes = Array.from(nodeMap.values()).map((n) => ({
        ...n,
        radius: 16 + 2 * Math.max(1, Math.min(5, n.connections)),
      }));

      links = inputEdges
        .filter((e) => nodeMap.has(e.from) && nodeMap.has(e.to))
        .map((e) => ({
          source: e.from,
          target: e.to,
          strength: e.type === 'prerequisite' ? 3 : 2,
        }));
    } else {
      // Sample fallback data - generic knowledge topics
      nodes = [
        { id: 'calculus', label: 'Calculus', radius: 24, connections: 4, x: width / 2, y: height / 2 },
        { id: 'physics', label: 'Physics', radius: 20, connections: 3, x: width / 2, y: height / 2 },
        { id: 'chemistry', label: 'Chemistry', radius: 22, connections: 3, x: width / 2, y: height / 2 },
        { id: 'biology', label: 'Biology', radius: 18, connections: 2, x: width / 2, y: height / 2 },
        { id: 'stats', label: 'Statistics', radius: 16, connections: 2, x: width / 2, y: height / 2 },
        { id: 'algebra', label: 'Algebra', radius: 20, connections: 3, x: width / 2, y: height / 2 },
        { id: 'history', label: 'History', radius: 16, connections: 2, x: width / 2, y: height / 2 },
        { id: 'literature', label: 'Literature', radius: 14, connections: 1, x: width / 2, y: height / 2 },
      ];

      links = [
        { source: 'calculus', target: 'physics', strength: 3 },
        { source: 'calculus', target: 'stats', strength: 2 },
        { source: 'calculus', target: 'algebra', strength: 3 },
        { source: 'chemistry', target: 'biology', strength: 2 },
        { source: 'physics', target: 'biology', strength: 2 },
        { source: 'stats', target: 'algebra', strength: 2 },
        { source: 'physics', target: 'chemistry', strength: 2 },
        { source: 'history', target: 'literature', strength: 1 },
      ];
    }

    // Create SVG container
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    const container = svg.append('g');

    // Create gradient definitions
    const defs = svg.append('defs');
    
    const linkGradient = defs.append('linearGradient')
      .attr('id', 'linkGradient')
      .attr('gradientUnits', 'userSpaceOnUse');
    
    linkGradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#06B6D4')
      .attr('stop-opacity', 0.6);
    
    linkGradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#6366F1')
      .attr('stop-opacity', 0.6);

    const nodeGradient = defs.append('radialGradient')
      .attr('id', 'nodeGradient');
    
    nodeGradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#6366F1');
    
    nodeGradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#06B6D4');

    // Create force simulation
    const simulation = d3
      .forceSimulation(nodes)
      .force(
        'link',
        d3
          .forceLink<GraphNode, GraphLink>(links)
          .id((d) => d.id)
          .distance(80)
          .strength(0.3)
      )
      .force('charge', d3.forceManyBody().strength(-250))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide<GraphNode>().radius((d) => d.radius + 35))
      .force('x', d3.forceX(width / 2).strength(0.03))
      .force('y', d3.forceY(height / 2).strength(0.03));

    simulationRef.current = simulation;

    // Create links
    const link = container
      .append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', 'url(#linkGradient)')
      .attr('stroke-opacity', 0.4)
      .attr('stroke-width', (d) => Math.sqrt(d.strength * 2));

    // Create node groups
    const nodeGroup = container
      .append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .attr('class', 'node-group')
      .style('cursor', 'pointer')
      .call(
        d3.drag<SVGGElement, GraphNode>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      );

    // Add circles to nodes
    nodeGroup
      .append('circle')
      .attr('r', (d) => d.radius)
      .attr('fill', 'url(#nodeGradient)')
      .attr('stroke', '#06B6D4')
      .attr('stroke-width', 2)
      .style('filter', 'drop-shadow(0 4px 8px rgba(99, 102, 241, 0.3))')
      .on('mouseenter', function() {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('r', (d) => d.radius * 1.2)
          .attr('stroke-width', 3);
      })
      .on('mouseleave', function() {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('r', (d) => d.radius)
          .attr('stroke-width', 2);
      });

    // Add pulse effect circles
    nodeGroup
      .append('circle')
      .attr('r', (d) => d.radius)
      .attr('fill', 'none')
      .attr('stroke', '#06B6D4')
      .attr('stroke-width', 2)
      .attr('stroke-opacity', 0.6)
      .style('animation', 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite');

    // Add labels
    nodeGroup
      .append('text')
      .attr('dy', (d) => d.radius + 16)
      .attr('text-anchor', 'middle')
      .attr('class', 'node-label')
      .style('fill', '#0ea5e9')
      .style('font-size', '12px')
      .style('font-weight', '600')
      .style('pointer-events', 'none')
      .text((d) => d.label);

    // Update positions on tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d) => (d.source as GraphNode).x!)
        .attr('y1', (d) => (d.source as GraphNode).y!)
        .attr('x2', (d) => (d.target as GraphNode).x!)
        .attr('y2', (d) => (d.target as GraphNode).y!);

      nodeGroup.attr('transform', (d) => `translate(${d.x},${d.y})`);
    });

    // Cleanup
    return () => {
      simulation.stop();
    };
  }, [dimensions]);

  return (
    <div ref={containerRef} className="relative h-[420px] w-full bg-gradient-to-br from-indigo-50 to-cyan-50 rounded-xl overflow-hidden border border-slate-200">
      <svg ref={svgRef} className="w-full h-full" />
      
      {/* Zoom hint */}
      <div className="absolute bottom-4 right-4 px-3 py-2 bg-slate-900/80 backdrop-blur-sm rounded-lg border border-cyan-500/30">
        <p className="text-xs text-cyan-400 font-semibold flex items-center gap-2">
          <span>💡</span>
          Drag nodes to explore
        </p>
      </div>
      
      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

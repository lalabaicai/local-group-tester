import { useState, useRef, useCallback } from 'react';
import { Trash2, Plus, Link2, Unlink, MousePointer2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Edge } from '@/lib/graph';

interface Node {
  id: number;
  x: number;
  y: number;
}

interface GraphEditorProps {
  nodes: Node[];
  edges: Edge[];
  selectedVertex: number | null;
  onNodesChange: (nodes: Node[]) => void;
  onEdgesChange: (edges: Edge[]) => void;
  onSelectedVertexChange: (v: number | null) => void;
}

const NODE_RADIUS = 22;
const COLOR_DEFAULT = '#3b82f6';
const COLOR_SELECTED = '#ef4444';
const COLOR_HOVER = '#60a5fa';
const COLOR_DRAG = '#8b5cf6';

export default function GraphEditor({
  nodes,
  edges,
  selectedVertex,
  onNodesChange,
  onEdgesChange,
  onSelectedVertexChange,
}: GraphEditorProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredNode, setHoveredNode] = useState<number | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<number | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<number | null>(null);
  const [draggingNode, setDraggingNode] = useState<number | null>(null);
  const [connectingFrom, setConnectingFrom] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const getSvgPoint = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const svg = svgRef.current!;
      const pt = svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      return pt.matrixTransform(svg.getScreenCTM()!.inverse());
    },
    []
  );

  /** ====== 节点操作 ====== */

  // 独立按钮添加节点
  const handleAddNode = useCallback(() => {
    const newId = nodes.length > 0 ? Math.max(...nodes.map((n) => n.id)) + 1 : 1;
    // 使用伪随机位置，避免重叠
    const angle = newId * 2.4; // 黄金角
    const radius = 80 + Math.random() * 120;
    const cx = nodes.length === 0 ? 400 : 400 + Math.cos(angle) * radius;
    const cy = nodes.length === 0 ? 250 : 250 + Math.sin(angle) * radius;
    // 确保在画布内
    const x = Math.max(NODE_RADIUS + 10, Math.min(790 - NODE_RADIUS, cx));
    const y = Math.max(NODE_RADIUS + 10, Math.min(490 - NODE_RADIUS, cy));
    const newNode: Node = { id: newId, x, y };
    onNodesChange([...nodes, newNode]);
  }, [nodes, onNodesChange]);

  const handleNodeClick = useCallback(
    (e: React.MouseEvent, nodeId: number) => {
      e.stopPropagation();
      setSelectedEdge(null);
      if (connectingFrom === null) {
        if (selectedVertex === nodeId) {
          setConnectingFrom(nodeId);
        } else {
          onSelectedVertexChange(nodeId);
          setConnectingFrom(null);
        }
      } else if (connectingFrom === nodeId) {
        setConnectingFrom(null);
      } else {
        const u = connectingFrom;
        const v = nodeId;
        const exists = edges.some(
          (e) => (e.u === u && e.v === v) || (e.u === v && e.v === u)
        );
        if (!exists) {
          onEdgesChange([...edges, { u, v }]);
        }
        setConnectingFrom(null);
      }
    },
    [connectingFrom, selectedVertex, edges, onEdgesChange, onSelectedVertexChange]
  );

  const handleNodeRightClick = useCallback(
    (e: React.MouseEvent, nodeId: number) => {
      e.preventDefault();
      e.stopPropagation();
      const newNodes = nodes.filter((n) => n.id !== nodeId);
      const idMap = new Map<number, number>();
      newNodes.forEach((n, idx) => {
        idMap.set(n.id, idx + 1);
      });
      const renumberedNodes = newNodes.map((n, idx) => ({
        ...n,
        id: idx + 1,
      }));
      const newEdges = edges
        .filter((e) => e.u !== nodeId && e.v !== nodeId)
        .map((e) => ({
          u: idMap.get(e.u) || e.u,
          v: idMap.get(e.v) || e.v,
        }));
      onNodesChange(renumberedNodes);
      onEdgesChange(newEdges);
      setSelectedEdge(null);
      if (selectedVertex === nodeId) {
        onSelectedVertexChange(null);
      }
      setConnectingFrom(null);
    },
    [nodes, edges, selectedVertex, onNodesChange, onEdgesChange, onSelectedVertexChange]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, nodeId: number) => {
      e.stopPropagation();
      if (e.button === 0) {
        setDraggingNode(nodeId);
      }
    },
    []
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const pt = getSvgPoint(e);
      setMousePos({ x: pt.x, y: pt.y });
      if (draggingNode !== null) {
        const newNodes = nodes.map((n) =>
          n.id === draggingNode ? { ...n, x: pt.x, y: pt.y } : n
        );
        onNodesChange(newNodes);
      }
    },
    [draggingNode, nodes, getSvgPoint, onNodesChange]
  );

  const handleMouseUp = useCallback(() => {
    setDraggingNode(null);
  }, []);

  /** ====== 边操作 ====== */

  // 点击边选中
  const handleEdgeClick = useCallback(
    (e: React.MouseEvent, edgeIdx: number) => {
      e.stopPropagation();
      setSelectedEdge(edgeIdx);
      setConnectingFrom(null);
    },
    []
  );

  // 右键边删除
  const handleEdgeRightClick = useCallback(
    (e: React.MouseEvent, edgeIdx: number) => {
      e.preventDefault();
      e.stopPropagation();
      const newEdges = edges.filter((_, i) => i !== edgeIdx);
      onEdgesChange(newEdges);
      setSelectedEdge(null);
    },
    [edges, onEdgesChange]
  );

  // 删除选中边
  const handleDeleteSelectedEdge = useCallback(() => {
    if (selectedEdge !== null) {
      const newEdges = edges.filter((_, i) => i !== selectedEdge);
      onEdgesChange(newEdges);
      setSelectedEdge(null);
    }
  }, [selectedEdge, edges, onEdgesChange]);

  /** ====== 全局操作 ====== */

  const handleClearAll = useCallback(() => {
    onNodesChange([]);
    onEdgesChange([]);
    onSelectedVertexChange(null);
    setSelectedEdge(null);
    setConnectingFrom(null);
  }, [onNodesChange, onEdgesChange, onSelectedVertexChange]);

  const handleSvgClick = useCallback(() => {
    setSelectedEdge(null);
    if (connectingFrom !== null) {
      setConnectingFrom(null);
    }
  }, [connectingFrom]);

  /** ====== 渲染 ====== */

  const renderEdges = () => {
    return edges.map((edge, idx) => {
      const u = nodes.find((n) => n.id === edge.u);
      const v = nodes.find((n) => n.id === edge.v);
      if (!u || !v) return null;

      const isHighlighted =
        edge.u === connectingFrom ||
        edge.v === connectingFrom;
      const isHovered = hoveredEdge === idx;
      const isSelected = selectedEdge === idx;

      let strokeColor = '#94a3b8';
      let strokeWidth = 2;
      let strokeOpacity = 0.8;

      if (isSelected) {
        strokeColor = '#f59e0b';
        strokeWidth = 4;
        strokeOpacity = 1;
      } else if (isHighlighted) {
        strokeColor = '#ef4444';
        strokeWidth = 3;
        strokeOpacity = 1;
      } else if (isHovered) {
        strokeColor = '#f59e0b';
        strokeWidth = 3;
        strokeOpacity = 0.9;
      }

      return (
        <g
          key={`edge-${idx}`}
          onClick={(e) => handleEdgeClick(e, idx)}
          onContextMenu={(e) => handleEdgeRightClick(e, idx)}
          onMouseEnter={() => setHoveredEdge(idx)}
          onMouseLeave={() => setHoveredEdge(null)}
          style={{ cursor: 'pointer' }}
        >
          {/* 点击热区（更粗的透明线） */}
          <line
            x1={u.x}
            y1={u.y}
            x2={v.x}
            y2={v.y}
            stroke="transparent"
            strokeWidth={10}
          />
          <line
            x1={u.x}
            y1={u.y}
            x2={v.x}
            y2={v.y}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeOpacity={strokeOpacity}
            strokeLinecap="round"
          />
          {isSelected && (
            <line
              x1={u.x}
              y1={u.y}
              x2={v.x}
              y2={v.y}
              stroke="#f59e0b"
              strokeWidth={8}
              strokeOpacity={0.2}
              strokeLinecap="round"
            />
          )}
        </g>
      );
    });
  };

  const renderConnectingLine = () => {
    if (connectingFrom === null) return null;
    const fromNode = nodes.find((n) => n.id === connectingFrom);
    if (!fromNode) return null;
    return (
      <line
        x1={fromNode.x}
        y1={fromNode.y}
        x2={mousePos.x}
        y2={mousePos.y}
        stroke="#ef4444"
        strokeWidth={2}
        strokeDasharray="8 4"
        opacity={0.6}
      />
    );
  };

  const renderNodes = () => {
    return nodes.map((node) => {
      const isSelected = selectedVertex === node.id;
      const isHovered = hoveredNode === node.id;
      const isConnecting = connectingFrom === node.id;
      const isDrag = draggingNode === node.id;

      let fill = COLOR_DEFAULT;
      if (isConnecting) fill = '#f59e0b';
      else if (isSelected) fill = COLOR_SELECTED;
      else if (isDrag) fill = COLOR_DRAG;
      else if (isHovered) fill = COLOR_HOVER;

      return (
        <g
          key={`node-${node.id}`}
          onClick={(e) => handleNodeClick(e, node.id)}
          onContextMenu={(e) => handleNodeRightClick(e, node.id)}
          onMouseDown={(e) => handleMouseDown(e, node.id)}
          onMouseEnter={() => setHoveredNode(node.id)}
          onMouseLeave={() => setHoveredNode(null)}
          style={{ cursor: draggingNode === node.id ? 'grabbing' : 'pointer' }}
        >
          <circle
            cx={node.x}
            cy={node.y}
            r={NODE_RADIUS}
            fill={fill}
            stroke="white"
            strokeWidth={isSelected || isConnecting ? 3 : 2}
            filter="drop-shadow(0 2px 4px rgba(0,0,0,0.2))"
          />
          <text
            x={node.x}
            y={node.y}
            textAnchor="middle"
            dominantBaseline="central"
            fill="white"
            fontSize={14}
            fontWeight="bold"
            style={{ userSelect: 'none', pointerEvents: 'none' }}
          >
            {node.id}
          </text>
          {(isSelected || isConnecting) && (
            <circle
              cx={node.x}
              cy={node.y}
              r={NODE_RADIUS + 4}
              fill="none"
              stroke={isConnecting ? '#f59e0b' : COLOR_SELECTED}
              strokeWidth={2}
              strokeDasharray={isConnecting ? '4 2' : 'none'}
              opacity={0.5}
            />
          )}
        </g>
      );
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* 工具栏 */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-100 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-700">图编辑器</span>
          <span className="text-xs text-slate-500">
            {nodes.length} 节点, {edges.length} 边
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddNode}
            className="text-xs h-7 px-2 bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
            title="添加新节点"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            添加节点
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDeleteSelectedEdge}
            disabled={selectedEdge === null}
            className="text-xs h-7 px-2 disabled:opacity-40"
            title="删除选中边"
          >
            <Unlink className="w-3.5 h-3.5 mr-1" />
            删除边
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleClearAll}
            className="text-xs h-7 px-2"
            title="清空所有"
          >
            <Trash2 className="w-3 h-3 mr-1" />
            清空
          </Button>
        </div>
      </div>

      {/* 状态提示栏 */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-white border-b border-slate-100">
        <div className="flex items-center gap-3 text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <MousePointer2 className="w-3 h-3" />
            点击节点选中
          </span>
          <span className="flex items-center gap-1">
            <Link2 className="w-3 h-3" />
            再次点击选中节点进入连接模式
          </span>
          <span>拖拽移动</span>
          <span>右键删除节点</span>
          <span>点击边选中，右键删除边</span>
        </div>
        {connectingFrom !== null && (
          <span className="text-[11px] text-amber-600 font-medium animate-pulse">
            连接模式：点击另一节点创建边
          </span>
        )}
        {selectedEdge !== null && connectingFrom === null && (
          <span className="text-[11px] text-amber-600 font-medium">
            已选边 {edges[selectedEdge].u}-{edges[selectedEdge].v}
          </span>
        )}
        {selectedVertex !== null && connectingFrom === null && selectedEdge === null && (
          <span className="text-[11px] text-red-500 font-medium">
            已选顶点 {selectedVertex}
          </span>
        )}
      </div>

      {/* SVG 画布 */}
      <svg
        ref={svgRef}
        className="flex-1 bg-slate-50 w-full"
        viewBox="0 0 800 500"
        onClick={handleSvgClick}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: connectingFrom !== null ? 'crosshair' : 'default' }}
      >
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e2e8f0" strokeWidth={0.5} />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />

        {renderEdges()}
        {renderConnectingLine()}
        {renderNodes()}
      </svg>
    </div>
  );
}

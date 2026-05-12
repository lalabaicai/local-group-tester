import { useState, useCallback } from 'react';
import { Play, Info, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import GraphEditor from '@/components/GraphEditor';
import PermutationInput from '@/components/PermutationInput';
import ResultPanel from '@/components/ResultPanel';
import { checkMembership, analyzeGraph, getLocalGroupDescription } from '@/lib/algorithm';
import type { Edge } from '@/lib/graph';
import type { MembershipResult } from '@/lib/algorithm';

interface Node {
  id: number;
  x: number;
  y: number;
}

function App() {
  const [nodes, setNodes] = useState<Node[]>([
    { id: 1, x: 200, y: 250 },
    { id: 2, x: 400, y: 150 },
    { id: 3, x: 400, y: 350 },
    { id: 4, x: 600, y: 250 },
  ]);
  const [edges, setEdges] = useState<Edge[]>([
    { u: 1, v: 2 },
    { u: 2, v: 3 },
    { u: 3, v: 1 },
    { u: 2, v: 4 },
    { u: 3, v: 4 },
  ]);
  const [selectedVertex, setSelectedVertex] = useState<number | null>(1);
  const [permutation, setPermutation] = useState<number[]>(() => {
    const perm: number[] = [];
    for (let i = 0; i <= 4; i++) perm[i] = i;
    return perm;
  });
  const [result, setResult] = useState<MembershipResult | null>(null);
  const [showTheory, setShowTheory] = useState(false);
  const [vertexCount, setVertexCount] = useState(4);

  // 当节点变化时更新顶点数和置换
  const handleNodesChange = useCallback((newNodes: Node[]) => {
    setNodes(newNodes);
    const newCount = newNodes.length;
    setVertexCount(newCount);

    // 调整置换
    setPermutation((prev) => {
      const newPerm: number[] = [];
      for (let i = 0; i <= newCount; i++) {
        if (i <= prev.length - 1 && prev[i] <= newCount) {
          newPerm[i] = prev[i];
        } else {
          newPerm[i] = i;
        }
      }
      return newPerm;
    });

    // 如果选中的顶点不存在了，重置
    setSelectedVertex((prev) => {
      if (prev === null || !newNodes.find((n) => n.id === prev)) {
        return newNodes.length > 0 ? newNodes[0].id : null;
      }
      return prev;
    });

    setResult(null);
  }, []);

  const handleEdgesChange = useCallback((newEdges: Edge[]) => {
    setEdges(newEdges);
    setResult(null);
  }, []);

  const handleCheck = useCallback(() => {
    if (selectedVertex === null || nodes.length === 0) return;

    const n = nodes.length;
    // 确保置换完整
    const perm: number[] = [];
    for (let i = 1; i <= n; i++) {
      perm[i] = permutation[i] || i;
    }

    const res = checkMembership(n, edges, perm, selectedVertex);
    setResult(res);
  }, [selectedVertex, nodes, edges, permutation]);

  // 获取局部群描述
  const localGroupDesc = selectedVertex !== null && nodes.length > 0
    ? getLocalGroupDescription(nodes.length, edges, selectedVertex)
    : '';

  // 获取图分析
  const graphAnalysis = nodes.length > 0
    ? analyzeGraph(nodes.length, edges)
    : null;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* 顶部标题栏 */}
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800">局部群成员判定器</h1>
            <p className="text-xs text-slate-500">
              图的对换乘积与置换群 | Transposition Local Group Membership Tester
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTheory(!showTheory)}
            className="text-xs"
          >
            <Info className="w-3 h-3 mr-1" />
            {showTheory ? '隐藏' : '显示'}理论说明
            {showTheory ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
          </Button>
        </div>
      </header>

      {/* 理论说明面板 */}
      {showTheory && (
        <div className="bg-blue-50 border-b border-blue-200 px-6 py-4">
          <h2 className="text-sm font-bold text-blue-800 mb-2">理论基础</h2>
          <div className="text-xs text-blue-700 leading-relaxed space-y-1">
            <p>
              <strong>定义：</strong>给定连通图 G=(V,E)，每条边 {'{'}u,v{'}'} 对应 S(V) 中的对换 (u v)。
              顶点 v 的<strong>局部群</strong> G_v 是所有基于 v 的闭途径对应的对换乘积之集合。
            </p>
            <p>
              <strong>结构定理：</strong>设 B(v) 为含 v 的所有块（极大 2-连通子图或桥边），则
              G_v 为各块局部群 L(B,v) 的直积，其中：
            </p>
            <ul className="list-disc list-inside ml-4 space-y-0.5">
              <li>桥边贡献平凡群 {'{'}id{'}'}</li>
              <li>单环 C_n 贡献 {'<'}(n-1)-循环{'>'} ≅ Z/(n-1)Z</li>
              <li>2-连通多环<strong>二部</strong>块贡献 A(V_B)（偶置换子群）</li>
              <li>2-连通多环<strong>非二部</strong>块贡献 S(V_B)（完全对称群）</li>
            </ul>
            <p>
              <strong>成员判定：</strong>π ∈ G_v ⟺ π(v)=v 且对每个块 B，π|_{'{'}V_B{'}'} ∈ L(B,v)。
            </p>
          </div>
        </div>
      )}

      {/* 主体内容 */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* 左侧：图编辑器 */}
        <div className="flex-1 flex flex-col min-h-[400px] border-r border-slate-200">
          <GraphEditor
            nodes={nodes}
            edges={edges}
            selectedVertex={selectedVertex}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onSelectedVertexChange={(v) => {
              setSelectedVertex(v);
              setResult(null);
            }}
          />
        </div>

        {/* 右侧：控制面板 */}
        <div className="w-full lg:w-[420px] flex flex-col bg-white overflow-y-auto">
          <div className="p-4 space-y-4">
            {/* 图分析 */}
            {graphAnalysis && graphAnalysis.blockInfo.length > 0 && (
              <div className="p-3 border rounded-lg bg-slate-50">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  图结构分析
                </h3>
                <div className="space-y-1">
                  {graphAnalysis.blockInfo.map((b) => (
                    <div key={b.id} className="flex items-center gap-2 text-xs">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          b.type === 'bridge'
                            ? 'bg-slate-200 text-slate-600'
                            : b.type === 'cycle'
                            ? 'bg-amber-100 text-amber-700'
                            : b.type === '2-connected-bipartite'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-purple-100 text-purple-700'
                        }`}
                      >
                        {b.typeLabel}
                      </span>
                      <span className="text-slate-600">
                        V = {'{'}{b.vertices.join(', ')}{'}'}
                      </span>
                      {b.cyclomatic > 0 && (
                        <span className="text-slate-400">
                          环秩 = {b.cyclomatic}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 待判定点选择 */}
            <div className="p-4 border rounded-lg bg-white">
              <h3 className="text-sm font-semibold text-slate-800 mb-3">
                待判定点 v
              </h3>
              <div className="flex flex-wrap gap-2">
                {nodes.map((node) => (
                  <button
                    key={node.id}
                    onClick={() => {
                      setSelectedVertex(node.id);
                      setResult(null);
                    }}
                    className={`w-10 h-10 rounded-full font-bold text-sm transition-all ${
                      selectedVertex === node.id
                        ? 'bg-red-500 text-white ring-2 ring-red-300'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {node.id}
                  </button>
                ))}
              </div>
              {selectedVertex !== null && (
                <div className="mt-2 text-xs text-slate-500">
                  已选顶点：{selectedVertex}
                </div>
              )}
              {localGroupDesc && (
                <div className="mt-2 p-2 bg-blue-50 rounded text-xs font-mono text-blue-700">
                  {localGroupDesc}
                </div>
              )}
            </div>

            {/* 置换输入 */}
            <PermutationInput
              vertexCount={vertexCount}
              permutation={permutation}
              onPermutationChange={(perm) => {
                setPermutation(perm);
                setResult(null);
              }}
            />

            {/* 判定按钮 */}
            <Button
              onClick={handleCheck}
              disabled={selectedVertex === null || nodes.length === 0}
              className="w-full h-11 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Play className="w-4 h-4 mr-2" />
              判定 π 是否属于 G
              {selectedVertex !== null ? `_${selectedVertex}` : ''}
            </Button>

            {/* 结果面板 */}
            <ResultPanel result={result} targetVertex={selectedVertex} />
          </div>
        </div>
      </div>

      {/* 底部状态栏 */}
      <footer className="bg-white border-t border-slate-200 px-6 py-2 text-[11px] text-slate-400 flex justify-between">
        <span>基于块分解与置换群的数学理论</span>
        <span>顶点数: {nodes.length} | 边数: {edges.length}</span>
      </footer>
    </div>
  );
}

export default App;

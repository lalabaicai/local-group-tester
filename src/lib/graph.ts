/**
 * 图论基础算法：块分解(块树)、二部图检测、单环检测
 * Block Decomposition (Block Tree), Bipartite Check, Unicyclic Detection
 */

export interface Edge {
  u: number;
  v: number;
}

export interface Block {
  vertices: number[];  // 块内顶点列表
  edges: Edge[];       // 块内边列表
  isBridge: boolean;   // 是否为桥边块
  type: 'bridge' | 'cycle' | '2-connected-bipartite' | '2-connected-non-bipartite';
  cyclomatic: number;  // 环秩
  isBipartite: boolean;
}

/**
 * 使用 Tarjan 算法求图的桥边和块分解
 */
export function findBridgesAndBlocks(
  vertexCount: number,
  edges: Edge[]
): { bridges: Edge[]; blocks: Block[] } {
  const adj: number[][] = Array.from({ length: vertexCount + 1 }, () => []);
  for (const e of edges) {
    adj[e.u].push(e.v);
    adj[e.v].push(e.u);
  }

  let timer = 0;
  const disc: number[] = new Array(vertexCount + 1).fill(0);
  const low: number[] = new Array(vertexCount + 1).fill(0);
  const visited: boolean[] = new Array(vertexCount + 1).fill(false);
  const bridges: Edge[] = [];
  const blockEdges: Edge[][] = [];
  const stack: Edge[] = [];

  function dfs(u: number, parent: number) {
    visited[u] = true;
    disc[u] = low[u] = ++timer;
    for (const v of adj[u]) {
      if (!visited[v]) {
        stack.push({ u, v });
        dfs(v, u);
        low[u] = Math.min(low[u], low[v]);
        // 如果 (u,v) 是桥边
        if (low[v] > disc[u]) {
          bridges.push({ u, v });
          // 弹出属于这个2-点连通分量的所有边
          const componentEdges: Edge[] = [];
          while (stack.length > 0) {
            const top = stack[stack.length - 1];
            if (
              (top.u === u && top.v === v) ||
              (top.u === v && top.v === u)
            ) {
              componentEdges.push(top);
              stack.pop();
              break;
            }
            componentEdges.push(top);
            stack.pop();
          }
          if (componentEdges.length > 0) {
            blockEdges.push(componentEdges);
          }
        }
      } else if (v !== parent && disc[v] < disc[u]) {
        // 回边
        stack.push({ u, v });
        low[u] = Math.min(low[u], disc[v]);
      }
    }
  }

  for (let i = 1; i <= vertexCount; i++) {
    if (!visited[i]) {
      dfs(i, -1);
    }
  }

  // 剩余边构成最后一个块
  if (stack.length > 0) {
    blockEdges.push([...stack]);
  }

  // 构建块列表
  const blocks: Block[] = [];

  // 桥边单独成块
  for (const b of bridges) {
    blocks.push({
      vertices: [b.u, b.v],
      edges: [b],
      isBridge: true,
      type: 'bridge',
      cyclomatic: 0,
      isBipartite: true,
    });
  }

  // 非桥边的块
  const bridgeSet = new Set(bridges.map((b) => edgeKey(b.u, b.v)));
  for (const compEdges of blockEdges) {
    const nonBridgeEdges = compEdges.filter(
      (e) => !bridgeSet.has(edgeKey(e.u, e.v))
    );
    if (nonBridgeEdges.length === 0) continue;

    const vertices = extractVertices(nonBridgeEdges);
    const cyc = nonBridgeEdges.length - vertices.length + 1;
    const bip = isBipartiteGraph(vertices, nonBridgeEdges);
    const type =
      cyc === 1
        ? 'cycle'
        : bip
        ? '2-connected-bipartite'
        : '2-connected-non-bipartite';

    blocks.push({
      vertices,
      edges: nonBridgeEdges,
      isBridge: false,
      type,
      cyclomatic: cyc,
      isBipartite: bip,
    });
  }

  return { bridges, blocks };
}

function edgeKey(u: number, v: number): string {
  return u < v ? `${u}-${v}` : `${v}-${u}`;
}

function extractVertices(edges: Edge[]): number[] {
  const set = new Set<number>();
  for (const e of edges) {
    set.add(e.u);
    set.add(e.v);
  }
  return Array.from(set).sort((a, b) => a - b);
}

/**
 * 检测子图是否为二部图
 */
export function isBipartiteGraph(
  vertexList: number[],
  edges: Edge[]
): boolean {
  const color = new Map<number, number>();
  const adj: number[][] = [];
  const idxMap = new Map<number, number>();
  vertexList.forEach((v, i) => idxMap.set(v, i));
  for (let i = 0; i < vertexList.length; i++) adj.push([]);
  for (const e of edges) {
    const ui = idxMap.get(e.u)!;
    const vi = idxMap.get(e.v)!;
    adj[ui].push(vi);
    adj[vi].push(ui);
  }
  for (let i = 0; i < vertexList.length; i++) {
    if (!color.has(vertexList[i])) {
      color.set(vertexList[i], 0);
      const queue = [vertexList[i]];
      while (queue.length > 0) {
        const u = queue.shift()!;
        for (const v of adj[idxMap.get(u)!]) {
          const vv = vertexList[v];
          if (!color.has(vv)) {
            color.set(vv, color.get(u)! ^ 1);
            queue.push(vv);
          } else if (color.get(vv) === color.get(u)) {
            return false;
          }
        }
      }
    }
  }
  return true;
}

/**
 * 检测子图是否为单环（环秩 = 1）
 */
export function isSingleCycle(
  vertexList: number[],
  edges: Edge[]
): boolean {
  return edges.length - vertexList.length + 1 === 1;
}

/**
 * 计算二部图的顶点二部划分
 */
export function bipartitePartition(
  vertexList: number[],
  edges: Edge[]
): { partX: number[]; partY: number[] } {
  const color = new Map<number, number>();
  const adj: number[][] = [];
  const idxMap = new Map<number, number>();
  vertexList.forEach((v, i) => idxMap.set(v, i));
  for (let i = 0; i < vertexList.length; i++) adj.push([]);
  for (const e of edges) {
    const ui = idxMap.get(e.u)!;
    const vi = idxMap.get(e.v)!;
    adj[ui].push(vi);
    adj[vi].push(ui);
  }
  const queue = [vertexList[0]];
  color.set(vertexList[0], 0);
  while (queue.length > 0) {
    const u = queue.shift()!;
    for (const v of adj[idxMap.get(u)!]) {
      const vv = vertexList[v];
      if (!color.has(vv)) {
        color.set(vv, color.get(u)! ^ 1);
        queue.push(vv);
      }
    }
  }
  const partX: number[] = [];
  const partY: number[] = [];
  for (const v of vertexList) {
    if (color.get(v) === 0) partX.push(v);
    else partY.push(v);
  }
  return { partX, partY };
}

/**
 * 获取包含给定顶点的块
 */
export function getBlocksAtVertex(
  vertex: number,
  blocks: Block[]
): Block[] {
  return blocks.filter((b) => b.vertices.includes(vertex));
}

/**
 * 判断块是否为环图
 */
export function isCycleGraph(vertices: number[], edges: Edge[]): boolean {
  if (vertices.length <= 2) return false;
  if (edges.length !== vertices.length) return false;
  // 检查每个顶点的度是否恰好为2
  const deg = new Map<number, number>();
  for (const e of edges) {
    deg.set(e.u, (deg.get(e.u) || 0) + 1);
    deg.set(e.v, (deg.get(e.v) || 0) + 1);
  }
  for (const v of vertices) {
    if (deg.get(v) !== 2) return false;
  }
  return true;
}

/**
 * 判断块是否为2-连通的
 * （简单检查：非桥边，且删去任一顶点后仍连通）
 */
export function is2Connected(vertices: number[], edges: Edge[]): boolean {
  if (vertices.length <= 2) return vertices.length === 2 && edges.length >= 2;
  // 检查删去任一顶点后是否连通
  for (const vRemove of vertices) {
    const remaining = vertices.filter((v) => v !== vRemove);
    if (remaining.length === 0) continue;
    const subEdges = edges.filter(
      (e) => e.u !== vRemove && e.v !== vRemove
    );
    if (!isConnected(remaining, subEdges)) return false;
  }
  return true;
}

function isConnected(vertices: number[], edges: Edge[]): boolean {
  if (vertices.length === 0) return true;
  const adj = new Map<number, number[]>();
  for (const v of vertices) adj.set(v, []);
  for (const e of edges) {
    adj.get(e.u)?.push(e.v);
    adj.get(e.v)?.push(e.u);
  }
  const visited = new Set<number>();
  const queue = [vertices[0]];
  visited.add(vertices[0]);
  while (queue.length > 0) {
    const u = queue.shift()!;
    for (const v of adj.get(u) || []) {
      if (!visited.has(v)) {
        visited.add(v);
        queue.push(v);
      }
    }
  }
  return visited.size === vertices.length;
}

/**
 * 计算环图的基本n-1循环生成元
 * 返回一个映射：每个非v顶点 -> 其在循环中的下一个顶点
 */
export function computeCycleGenerator(
  vertex: number,
  block: Block
): Map<number, number> {
  const otherVertices = block.vertices.filter((v) => v !== vertex);
  const n = otherVertices.length;
  
  // 构建块内的邻接表
  const adj: Map<number, number[]> = new Map();
  for (const v of block.vertices) {
    adj.set(v, []);
  }
  for (const e of block.edges) {
    adj.get(e.u)!.push(e.v);
    adj.get(e.v)!.push(e.u);
  }
  
  // 从 vertex 出发遍历环
  const start = vertex;
  const neighbor = adj.get(start)!;
  if (neighbor.length < 2) {
    // 退化情况，返回恒等
    const map = new Map<number, number>();
    for (const v of otherVertices) map.set(v, v);
    return map;
  }
  
  // 从 start 的一个邻居出发沿环行走
  let prev = start;
  let curr = neighbor[0];
  const order: number[] = [curr];
  const visited = new Set<number>([start, curr]);
  
  while (curr !== start) {
    const neighbors = adj.get(curr)!;
    const next = neighbors.find((v) => v !== prev && !visited.has(v));
    if (next === undefined) {
      // 环结束
      break;
    }
    order.push(next);
    visited.add(next);
    prev = curr;
    curr = next;
  }
  
  // order 是从 start 出发沿环访问的其他顶点顺序
  // 置换为 order[0] -> order[n-1] -> order[n-2] -> ... -> order[1] -> order[0]
  // 即 (order[0] order[n-1] order[n-2] ... order[1])
  const map = new Map<number, number>();
  if (n === 1) {
    map.set(order[0], order[0]);
  } else {
    for (let i = 0; i < n; i++) {
      const src = order[i];
      const dst = i === 0 ? order[n - 1] : order[i - 1];
      map.set(src, dst);
    }
  }
  return map;
}

/**
 * 置换的奇偶性（符号）
 * 返回 1 表示偶置换，-1 表示奇置换
 */
export function permutationSign(perm: number[]): number {
  const n = perm.length - 1; // perm[1..n]
  const visited = new Array(n + 1).fill(false);
  let sign = 1;
  for (let i = 1; i <= n; i++) {
    if (!visited[i]) {
      let cycleLen = 0;
      let j = i;
      while (!visited[j]) {
        visited[j] = true;
        cycleLen++;
        j = perm[j];
      }
      if (cycleLen > 1) {
        // k-循环的符号为 (-1)^(k-1)
        sign *= Math.pow(-1, cycleLen - 1);
      }
    }
  }
  return sign;
}

/**
 * 置换的循环分解
 */
export function cycleDecomposition(perm: number[]): string {
  const n = perm.length - 1;
  const visited = new Array(n + 1).fill(false);
  const cycles: number[][] = [];
  for (let i = 1; i <= n; i++) {
    if (!visited[i] && perm[i] !== i) {
      const cycle: number[] = [];
      let j = i;
      while (!visited[j]) {
        visited[j] = true;
        cycle.push(j);
        j = perm[j];
      }
      cycles.push(cycle);
    }
  }
  if (cycles.length === 0) return "()";
  return cycles.map((c) => `(${c.join(' ')})`).join(' ');
}

/**
 * 将置换表示为带偏移的循环表示（perm[1..n]）
 */
export function permToCycles(perm: number[], n: number): string {
  const visited = new Array(n + 1).fill(false);
  const cycles: string[] = [];
  for (let i = 1; i <= n; i++) {
    if (!visited[i] && perm[i] !== i) {
      const cycle: number[] = [];
      let j = i;
      while (!visited[j]) {
        visited[j] = true;
        cycle.push(j);
        j = perm[j];
      }
      cycles.push(`(${cycle.join(' ')})`);
    }
  }
  return cycles.length === 0 ? '()' : cycles.join(' ');
}

/**
 * 判断一个映射是否为 n-1 循环的某次幂
 */
export function isCyclePower(
  mapping: Map<number, number>,
  expectedCycleLength: number
): boolean {
  if (mapping.size === 0) return true;
  const elements = Array.from(mapping.keys()).sort((a, b) => a - b);
  if (elements.length !== mapping.size) return false;
  
  // 检查每个元素是否恰好移动 k 步
  let first = elements[0];
  let current = first;
  let steps = 0;
  do {
    const next = mapping.get(current);
    if (next === undefined) return false;
    current = next;
    steps++;
    if (steps > expectedCycleLength) return false;
  } while (current !== first);
  
  return steps === expectedCycleLength;
}

/**
 * 计算映射作为 (n-1)-循环的幂次的偏移量
 */
export function getCyclePower(
  mapping: Map<number, number>,
  generator: Map<number, number>,
  n: number
): number {
  if (mapping.size === 0) return 0;
  // 尝试找到 k 使得 mapping = generator^k
  let current = new Map(generator);
  const identity = new Map<number, number>();
  for (const k of Array.from(mapping.keys())) identity.set(k, k);
  
  for (let power = 1; power <= n; power++) {
    if (mapsEqual(mapping, current)) return power;
    // current = current ∘ generator
    const next = new Map<number, number>();
    for (const [src] of generator) {
      const afterGen = generator.get(src)!;
      const afterCurrent = current.get(afterGen);
      if (afterCurrent !== undefined) {
        next.set(src, afterCurrent);
      } else {
        next.set(src, afterGen);
      }
    }
    // 合并
    for (const [src, dst] of current) {
      if (!next.has(src)) next.set(src, dst);
    }
    current = next;
  }
  return -1;
}

function mapsEqual(a: Map<number, number>, b: Map<number, number>): boolean {
  if (a.size !== b.size) return false;
  for (const [k, v] of a) {
    if (b.get(k) !== v) return false;
  }
  return true;
}

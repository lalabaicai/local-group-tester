/**
 * 局部群成员判定算法
 * Local Group Membership Algorithm
 * 
 * 定理：设 G = (V, E) 为连通图，v ∈ V。
 * 设 B(v) = {B₁, ..., Bₖ} 为含 v 的所有块。
 * 则 G_v = ∏_{B ∈ B(v)} L(B, v)，其中：
 *   - 桥边 B: L(B,v) = {id}
 *   - 单环 Cₙ: L(B,v) = <(n-1)-循环> ≅ Z/(n-1)Z
 *   - 2-连通多环二部: L(B,v) = A(V_B)
 *   - 2-连通多环非二部: L(B,v) = S(V_B)
 * 
 * π ∈ G_v ⟺ π(v)=v 且对每个 B ∈ B(v), π|_{V_B} ∈ L(B,v)
 */

import {
  type Edge,
  findBridgesAndBlocks,
  getBlocksAtVertex,
  permutationSign,
  computeCycleGenerator,
  getCyclePower,
} from './graph';

export interface MembershipResult {
  isMember: boolean;
  details: BlockCheckDetail[];
  summary: string;
}

export interface BlockCheckDetail {
  blockId: number;
  vertices: number[];
  type: string;
  typeLabel: string;
  satisfiesCondition: boolean;
  detailMessage: string;
}

/**
 * 检查置换 π 是否属于顶点 v 的局部群 G_v
 * 
 * π ∈ G_v ⟺ 
 *   (1) π(v) = v
 *   (2) 对每个含 v 的块 B: π|_{V(B)\{v}} ∈ L(B,v)
 */
export function checkMembership(
  vertexCount: number,
  edges: Edge[],
  permutation: number[],  // permutation[1..n], permutation[i] = π(i)
  targetVertex: number
): MembershipResult {
  const details: BlockCheckDetail[] = [];

  // 条件 (1): π(v) = v
  if (permutation[targetVertex] !== targetVertex) {
    return {
      isMember: false,
      details: [],
      summary: `置换不固定顶点 ${targetVertex}：π(${targetVertex}) = ${permutation[targetVertex]} ≠ ${targetVertex}，故 π ∉ G_${targetVertex}`,
    };
  }

  // 计算块分解
  const { blocks } = findBridgesAndBlocks(vertexCount, edges);
  const blocksAtV = getBlocksAtVertex(targetVertex, blocks);

  if (blocksAtV.length === 0) {
    return {
      isMember: true,
      details: [],
      summary: `顶点 ${targetVertex} 的所有块均为桥边，G_${targetVertex} = {id}。置换 π 固定 ${targetVertex}，故 π ∈ G_${targetVertex}。`,
    };
  }

  let allSatisfy = true;

  for (let i = 0; i < blocksAtV.length; i++) {
    const block = blocksAtV[i];
    const otherVertices = block.vertices.filter((v) => v !== targetVertex);

    if (block.type === 'bridge') {
      // 桥边贡献平凡
      details.push({
        blockId: i + 1,
        vertices: block.vertices,
        type: 'bridge',
        typeLabel: '桥边',
        satisfiesCondition: true,
        detailMessage: `桥边 {${block.vertices[0]}, ${block.vertices[1]}}，贡献平凡群 {id}，条件自动满足。`,
      });
      continue;
    }

    if (block.type === 'cycle' || block.cyclomatic === 1) {
      // 单环块: 检查 π|_{V_B} 是否为 (n-1)-循环的某次幂
      const generator = computeCycleGenerator(targetVertex, block);
      const n = otherVertices.length;

      // 检查 π 在 V_B 上的限制是否与生成元的某次幂匹配
      const restriction = new Map<number, number>();
      for (const u of otherVertices) {
        restriction.set(u, permutation[u]);
      }

      const power = getCyclePower(restriction, generator, n);
      const isPower = power >= 0;

      if (isPower) {
        details.push({
          blockId: i + 1,
          vertices: block.vertices,
          type: 'cycle',
          typeLabel: '单环块',
          satisfiesCondition: true,
          detailMessage: `块 C_${block.vertices.length}，顶点集 V_B = {${otherVertices.join(', ')}}。π|_{V_B} 为 ${n}-循环的第 ${power} 次幂（循环阶 = ${n}），满足 L(B, ${targetVertex}) = ⟨τ⟩ ≅ Z/${n}Z 的条件。`,
        });
      } else {
        details.push({
          blockId: i + 1,
          vertices: block.vertices,
          type: 'cycle',
          typeLabel: '单环块',
          satisfiesCondition: false,
          detailMessage: `块 C_${block.vertices.length}，顶点集 V_B = {${otherVertices.join(', ')}}。L(B, ${targetVertex}) = ⟨τ⟩ ≅ Z/${n}Z，其中 τ = ${cycleFromMap(generator)}。π|_{V_B} = ${cycleFromMap(restriction)} 不是该循环的幂次，条件不满足。`,
        });
        allSatisfy = false;
      }
      continue;
    }

    if (block.type === '2-connected-bipartite') {
      // 多环二部块: 检查 π|_{V_B} 是否为偶置换
      const subPerm = extractSubPermutation(permutation, otherVertices);
      const sign = permutationSign(subPerm);
      const isEven = sign === 1;

      if (isEven) {
        details.push({
          blockId: i + 1,
          vertices: block.vertices,
          type: '2-connected-bipartite',
          typeLabel: '多环二部块',
          satisfiesCondition: true,
          detailMessage: `块为 2-连通二部图，环秩 = ${block.cyclomatic}，顶点集 V_B = {${otherVertices.join(', ')}}。π|_{V_B} 为偶置换（符号 = +1），满足 L(B, ${targetVertex}) = A(V_B) 的条件。`,
        });
      } else {
        details.push({
          blockId: i + 1,
          vertices: block.vertices,
          type: '2-connected-bipartite',
          typeLabel: '多环二部块',
          satisfiesCondition: false,
          detailMessage: `块为 2-连通二部图，环秩 = ${block.cyclomatic}，顶点集 V_B = {${otherVertices.join(', ')}}。L(B, ${targetVertex}) = A(V_B)（偶置换子群），但 π|_{V_B} 为奇置换（符号 = −1），条件不满足。`,
        });
        allSatisfy = false;
      }
      continue;
    }

    if (block.type === '2-connected-non-bipartite') {
      // 多环非二部块: π|_{V_B} 自动满足（只需固定 v 即可）
      details.push({
        blockId: i + 1,
        vertices: block.vertices,
        type: '2-connected-non-bipartite',
        typeLabel: '多环非二部块',
        satisfiesCondition: true,
        detailMessage: `块为 2-连通非二部图，环秩 = ${block.cyclomatic}，顶点集 V_B = {${otherVertices.join(', ')}}。L(B, ${targetVertex}) = S(V_B)，π|_{V_B} ∈ S(V_B) 自动满足。`,
      });
      continue;
    }
  }

  // 生成总结
  let summary: string;
  if (allSatisfy) {
    const blockDesc = blocksAtV
      .filter((b) => !b.isBridge)
      .map((b) => {
        if (b.type === 'cycle') return `C_${b.vertices.length}`;
        if (b.type === '2-connected-bipartite') return 'A(V_B)';
        return 'S(V_B)';
      })
      .join(' × ');
    summary = `G_${targetVertex} = ${blockDesc}，π 满足所有块的条件，故 π ∈ G_${targetVertex}。`;
  } else {
    summary = `G_${targetVertex} 为各块局部群的直积，π 不满足其中至少一个块的条件，故 π ∉ G_${targetVertex}。`;
  }

  return {
    isMember: allSatisfy,
    details,
    summary,
  };
}

/**
 * 提取子置换（只保留指定顶点）
 */
function extractSubPermutation(
  perm: number[],
  vertices: number[]
): number[] {
  const sub: number[] = [];
  // 创建顶点索引映射
  const idxMap = new Map<number, number>();
  vertices.forEach((v, i) => idxMap.set(v, i + 1));
  for (let i = 0; i <= vertices.length; i++) sub.push(i);
  for (const v of vertices) {
    const mapped = perm[v];
    if (vertices.includes(mapped)) {
      sub[idxMap.get(v)!] = idxMap.get(mapped)!;
    } else {
      sub[idxMap.get(v)!] = idxMap.get(v)!; // 固定不在子集中的点
    }
  }
  return sub;
}

/**
 * 从映射生成循环字符串
 */
function cycleFromMap(map: Map<number, number>): string {
  const elements = Array.from(map.keys()).sort((a, b) => a - b);
  if (elements.length === 0) return '()';
  
  const visited = new Set<number>();
  const cycles: string[] = [];
  
  for (const start of elements) {
    if (visited.has(start)) continue;
    const cycle: number[] = [];
    let current = start;
    let steps = 0;
    while (!visited.has(current) && steps <= elements.length + 1) {
      visited.add(current);
      cycle.push(current);
      const next = map.get(current);
      if (next === undefined || next === current) break;
      current = next;
      steps++;
    }
    if (cycle.length > 1) {
      cycles.push(`(${cycle.join(' ')})`);
    }
  }
  
  return cycles.length === 0 ? '()' : cycles.join(' ');
}

/**
 * 获取图的块分解分析结果
 */
export function analyzeGraph(vertexCount: number, edges: Edge[]) {
  const { blocks } = findBridgesAndBlocks(vertexCount, edges);
  const blockInfo = blocks.map((b, idx) => ({
    id: idx + 1,
    vertices: b.vertices,
    edges: b.edges,
    type: b.type,
    typeLabel:
      b.type === 'bridge'
        ? '桥边'
        : b.type === 'cycle'
        ? '单环块'
        : b.type === '2-connected-bipartite'
        ? '多环二部块'
        : '多环非二部块',
    cyclomatic: b.cyclomatic,
    isBipartite: b.isBipartite,
  }));
  return { blocks, blockInfo };
}

/**
 * 获取顶点 v 处局部群的结构描述
 */
export function getLocalGroupDescription(
  vertexCount: number,
  edges: Edge[],
  vertex: number
): string {
  const { blocks } = findBridgesAndBlocks(vertexCount, edges);
  const blocksAtV = getBlocksAtVertex(vertex, blocks);

  if (blocksAtV.length === 0) {
    return `G_${vertex} = {id}`;
  }

  const parts: string[] = [];
  for (const b of blocksAtV) {
    if (b.type === 'bridge') continue;
    const n = b.vertices.length - 1;
    if (b.type === 'cycle') {
      parts.push(`Z/${n}Z`);
    } else if (b.type === '2-connected-bipartite') {
      parts.push(`A_{${n}}`);
    } else if (b.type === '2-connected-non-bipartite') {
      parts.push(`S_{${n}}`);
    }
  }

  if (parts.length === 0) {
    return `G_${vertex} = {id}`;
  }
  return `G_${vertex} = ${parts.join(' × ')}，|G_${vertex}| = ${parts
    .map((p) => {
      if (p.startsWith('Z/')) return p.match(/Z\/(\d+)Z/)?.[1] || '1';
      if (p.startsWith('A_')) {
        const n = parseInt(p.match(/A_(\d+)/)?.[1] || '0');
        return `${factorial(n) / 2}`;
      }
      if (p.startsWith('S_')) {
        const n = parseInt(p.match(/S_(\d+)/)?.[1] || '0');
        return `${factorial(n)}`;
      }
      return '1';
    })
    .reduce((a, b) => `${a} × ${b}`)}`;
}

function factorial(n: number): number {
  if (n <= 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

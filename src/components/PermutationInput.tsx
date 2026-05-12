import { useState, useEffect } from 'react';
import { Shuffle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PermutationInputProps {
  vertexCount: number;
  permutation: number[];
  onPermutationChange: (perm: number[]) => void;
}

export default function PermutationInput({
  vertexCount,
  permutation,
  onPermutationChange,
}: PermutationInputProps) {
  // permutation[1..n], permutation[i] = π(i)
  const [inputValues, setInputValues] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);

  // 初始化输入值
  useEffect(() => {
    const values: Record<number, string> = {};
    for (let i = 1; i <= vertexCount; i++) {
      values[i] = permutation[i]?.toString() || '';
    }
    setInputValues(values);
    setError(null);
  }, [vertexCount, permutation]);

  const handleInputChange = (pos: number, val: string) => {
    const newValues = { ...inputValues, [pos]: val };
    setInputValues(newValues);

    // 验证输入
    const perm: number[] = [];
    for (let i = 1; i <= vertexCount; i++) {
      perm[i] = i; // 默认恒等
    }
    const used = new Set<number>();
    let hasError = false;

    for (let i = 1; i <= vertexCount; i++) {
      const v = parseInt(newValues[i] || '');
      if (isNaN(v) || v < 1 || v > vertexCount) {
        hasError = true;
        break;
      }
      if (used.has(v)) {
        hasError = true;
        break;
      }
      used.add(v);
      perm[i] = v;
    }

    if (!hasError && used.size === vertexCount) {
      setError(null);
      onPermutationChange(perm);
    } else {
      setError(
        hasError
          ? '请输入 1 到 ' + vertexCount + ' 的不重复整数'
          : '请填写所有位置'
      );
    }
  };

  const handleRandom = () => {
    const arr = Array.from({ length: vertexCount }, (_, i) => i + 1);
    // Fisher-Yates shuffle
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    const perm: number[] = [];
    const values: Record<number, string> = {};
    for (let i = 1; i <= vertexCount; i++) {
      perm[i] = arr[i - 1];
      values[i] = arr[i - 1].toString();
    }
    setInputValues(values);
    setError(null);
    onPermutationChange(perm);
  };

  const handleReset = () => {
    const perm: number[] = [];
    const values: Record<number, string> = {};
    for (let i = 1; i <= vertexCount; i++) {
      perm[i] = i;
      values[i] = i.toString();
    }
    setInputValues(values);
    setError(null);
    onPermutationChange(perm);
  };

  if (vertexCount === 0) {
    return (
      <div className="p-4 border rounded-lg bg-slate-50 text-center text-sm text-slate-400">
        请先创建至少一个节点
      </div>
    );
  }

  return (
    <div className="p-4 border rounded-lg bg-white">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-800">待判定置换 π</h3>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRandom}
            className="h-7 px-2 text-xs"
          >
            <Shuffle className="w-3 h-3 mr-1" />
            随机
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="h-7 px-2 text-xs"
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            恒等
          </Button>
        </div>
      </div>

      <div className="text-xs text-slate-500 mb-2">
        输入 π(i) 的值：π 将 i 映射到 π(i)
      </div>

      <div className="grid grid-cols-6 gap-2">
        {Array.from({ length: vertexCount }, (_, i) => i + 1).map((pos) => (
          <div key={pos} className="flex flex-col items-center gap-1">
            <label className="text-xs font-medium text-slate-500">
              π({pos}) =
            </label>
            <input
              type="number"
              min={1}
              max={vertexCount}
              value={inputValues[pos] || ''}
              onChange={(e) => handleInputChange(pos, e.target.value)}
              className="w-full h-8 text-center text-sm border rounded-md focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none transition-all"
            />
          </div>
        ))}
      </div>

      {error && (
        <div className="mt-2 text-xs text-red-500">{error}</div>
      )}

      {!error && vertexCount > 0 && (
        <div className="mt-3 p-2 bg-slate-50 rounded text-xs font-mono text-slate-600">
          π = ({Array.from({ length: vertexCount }, (_, i) => permutation[i + 1] || i + 1).join(' ')})
        </div>
      )}
    </div>
  );
}

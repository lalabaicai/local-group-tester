import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import type { MembershipResult } from '@/lib/algorithm';
import type { BlockCheckDetail } from '@/lib/algorithm';

interface ResultPanelProps {
  result: MembershipResult | null;
  targetVertex: number | null;
}

export default function ResultPanel({ result }: ResultPanelProps) {
  if (result === null) {
    return (
      <div className="p-4 border rounded-lg bg-slate-50 text-center">
        <AlertTriangle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p className="text-sm text-slate-400">
          请完成图、置换和待判定顶点的输入，然后点击"判定"
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 border rounded-lg bg-white">
      <div className="flex items-center gap-2 mb-3">
        {result.isMember ? (
          <>
            <CheckCircle className="w-5 h-5 text-green-500" />
            <h3 className="text-sm font-bold text-green-700">判定结果：属于局部群</h3>
          </>
        ) : (
          <>
            <XCircle className="w-5 h-5 text-red-500" />
            <h3 className="text-sm font-bold text-red-700">判定结果：不属于局部群</h3>
          </>
        )}
      </div>

      <div className="mb-3 p-3 bg-slate-50 rounded text-sm text-slate-700 leading-relaxed">
        <strong>结论：</strong>{result.summary}
      </div>

      {result.details.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            各块条件验证
          </h4>
          {result.details.map((detail, idx) => (
            <BlockDetailCard key={idx} detail={detail} />
          ))}
        </div>
      )}
    </div>
  );
}

function BlockDetailCard({ detail }: { detail: BlockCheckDetail }) {
  const typeColorMap: Record<string, string> = {
    bridge: 'bg-slate-100 text-slate-600 border-slate-200',
    cycle: 'bg-amber-50 text-amber-700 border-amber-200',
    '2-connected-bipartite': 'bg-blue-50 text-blue-700 border-blue-200',
    '2-connected-non-bipartite': 'bg-purple-50 text-purple-700 border-purple-200',
  };

  return (
    <div
      className={`p-3 rounded border text-xs ${typeColorMap[detail.type] || 'bg-gray-50'}`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="font-semibold">
          块 {detail.blockId}（{detail.typeLabel}）
        </span>
        {detail.satisfiesCondition ? (
          <span className="text-green-600 font-medium">✓ 满足</span>
        ) : (
          <span className="text-red-500 font-medium">✗ 不满足</span>
        )}
      </div>
      <div className="text-slate-600 leading-relaxed">{detail.detailMessage}</div>
    </div>
  );
}

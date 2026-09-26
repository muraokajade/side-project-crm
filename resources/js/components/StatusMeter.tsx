import { ProjectType } from '../types/project';
import { STATUS_STEP_COUNT, statusStepOf, statusStyle } from '../constants/projectOptions';

/**
 * 進み具合の段階メーター。常に6マスで、到達した段階までを塗る。
 *
 * 色は補助で、塗られたマスの数そのものが進み具合を表す(色を見なくても読める)。
 * 見送りは段階として数えられないので、マスの代わりに点線を出して「終了」を形で示す。
 * 幅はどちらも同じにして、一覧の中でステータス名の開始位置がずれないようにしている。
 */
export default function StatusMeter({ type, status }: { type: ProjectType; status: string }) {
  const step = statusStepOf(type, status);

  if (step === null) {
    return (
      <span role="img" aria-label="進み具合 終了" className="flex h-2.5 w-[2.125rem] shrink-0 items-center">
        <span className="w-full border-t border-dashed border-slate-300" />
      </span>
    );
  }

  const filledClass = statusStyle(status).dot;

  return (
    <span role="img" aria-label={`進み具合 ${step}/${STATUS_STEP_COUNT}`} className="flex shrink-0 gap-0.5">
      {Array.from({ length: STATUS_STEP_COUNT }, (_, i) => (
        <span
          key={i}
          data-filled={i < step}
          className={`h-2.5 w-1 rounded-[1px] ${i < step ? filledClass : 'bg-slate-200'}`}
        />
      ))}
    </span>
  );
}

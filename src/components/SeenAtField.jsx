import { useEffect, useState } from 'react';
import { toSeenAtInput } from '../lib/format';

/**
 * §2.19 관측시각 입력. 「여기서 봤어요」 시트(CatDetailPage)와 냥이 등록 폼(CatRegisterForm)이
 * 같은 컴포넌트를 쓴다 — 두 화면이 서로 다르게 동작하지 않게 하려는 것이다.
 *
 *  - 기본값은 "지금"이다. 열릴 때 찍은 현재 시각을 **보여주기만** 하고 값으로 들고 있지 않는다.
 *    사용자가 손대지 않으면 value 는 '' 로 남고, 호출부는 seen_at 을 아예 보내지 않는다
 *    (DB default now() 가 채운다 — 클라이언트 시계로 now() 를 만들면 CHECK 위반).
 *  - 다시 기본값과 같은 시각을 고르면 '' 로 되돌린다. "바꿨을 때만 보낸다"는 규칙의 자리다.
 *  - max 는 '지금'이다. 미래 시각은 DB CHECK(seen_at <= created_at) 에 걸린다.
 *    브라우저 max 는 강제가 아니라 안내라서, 제출 직전에 lib/format.seenAtToIso 가 한 번 더 막는다.
 *
 * props:
 *   open       시트·폼이 열려 있는지. 열릴 때마다 기준 시각을 다시 찍는다
 *              (등록 폼은 항상 마운트돼 있어서, 이게 없으면 앱을 켠 시각이 그대로 남는다)
 *   value      '' 이면 미변경. 그 밖엔 'YYYY-MM-DDTHH:mm'
 *   onChange   값 변경 콜백
 *   className  입력칸에 붙일 호스트 쪽 클래스 — 라벨·여백은 호스트가 그린다
 */
export default function SeenAtField({ open, value, onChange, className = '' }) {
  const [now, setNow] = useState(() => toSeenAtInput(new Date()));

  useEffect(() => {
    if (open) setNow(toSeenAtInput(new Date()));
  }, [open]);

  return (
    <input
      type="datetime-local"
      className={className}
      value={value || now}
      max={now}
      onChange={(e) => onChange(e.target.value === now ? '' : e.target.value)}
    />
  );
}

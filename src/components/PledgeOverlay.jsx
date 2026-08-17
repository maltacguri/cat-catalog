// 가입 후 서약서(증서) + 에티켓 (§2.7-7). 완료 플래그는 profiles.onboarded_at.
// 서약서는 도장 한 번이 유일한 조작 지점 — 체크박스는 없다.
import { useEffect, useState } from 'react';
import { fetchMyProfile, markOnboarded } from '../api/auth';

const CLAUSES = [
  '목격 위치를 이용해 고양이를 추적하거나 찾아다니지 않겠습니다.',
  '고양이를 함부로 만지거나 데려가지 않겠습니다.',
  '밥을 준 자리는 반드시 치우겠습니다.',
  '보지 않은 목격, 주지 않은 밥을 기록하지 않겠습니다.',
  '다른 사람의 기록을 존중하고, 문제는 민원으로 알리겠습니다.',
];

const ETIQUETTE_ITEMS = [
  {
    title: '만지지 마세요',
    body: '길고양이는 반려묘가 아니에요. 사람 손을 타면 경계심이 사라져서 오히려 위험해져요. 먼저 다가오지 않는다면 눈으로만 봐주세요.',
  },
  {
    title: '아무거나 주지 마세요',
    body: '사람 음식은 대부분 위험해요. 특히 양파·마늘·파가 들어간 것, 우유, 사람용 참치캔, 초콜릿, 닭뼈는 절대 안 돼요. 고양이 사료나 간식, 깨끗한 물만 주세요.',
  },
  {
    title: '자리는 치우고 가세요',
    body: '남은 사료와 그릇을 두고 가면 벌레가 꼬이고 민원이 들어와요. 그 자리에서 다 먹을 만큼만 주세요.',
  },
];

function StampIcon() {
  return (
    <svg viewBox="0 0 100 100" width="72" height="72" aria-hidden="true">
      <g fill="#FAF7F0" stroke="#8A5A32" strokeWidth="7" strokeLinejoin="round">
        <circle cx="24" cy="43" r="15" /><circle cx="41" cy="31" r="16" />
        <circle cx="60" cy="31" r="16" /><circle cx="77" cy="43" r="15" />
        <ellipse cx="50" cy="63" rx="33" ry="27" />
      </g>
      <g fill="#FAF7F0">
        <circle cx="24" cy="43" r="15" /><circle cx="41" cy="31" r="16" />
        <circle cx="60" cy="31" r="16" /><circle cx="77" cy="43" r="15" />
        <ellipse cx="50" cy="63" rx="33" ry="27" />
      </g>
      <g fill="#F4A0A0">
        <ellipse cx="25" cy="45" rx="9" ry="10.5" transform="rotate(-18 25 45)" />
        <ellipse cx="41" cy="35" rx="9" ry="11" transform="rotate(-7 41 35)" />
        <ellipse cx="59" cy="35" rx="9" ry="11" transform="rotate(7 59 35)" />
        <ellipse cx="75" cy="45" rx="9" ry="10.5" transform="rotate(18 75 45)" />
        <path d="M50 52 C63 52 71 60 72 68 C73 77 64 83 56 81 C52 80 50 77 50 75 C50 77 48 80 44 81 C36 83 27 77 28 68 C29 60 37 52 50 52 Z" />
      </g>
    </svg>
  );
}

export default function PledgeOverlay({ onDone }) {
  const [step, setStep] = useState(1);
  const [stamped, setStamped] = useState(false);
  const [nickname, setNickname] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchMyProfile().then((p) => setNickname(p?.nickname ?? null)).catch((e) => console.error(e));
  }, []);

  function handleStamp() {
    if (stamped) return;
    setStamped(true);
  }

  async function handleAgree() {
    if (busy) return;
    setBusy(true);
    try {
      await markOnboarded();
    } catch (e) {
      console.error(e);
    }
    onDone();
  }

  if (step === 1) {
    const today = new Date();
    const dateLabel = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;

    return (
      <div className="pledge-cert">
        <div className="pledge-cert-outer">
          <div className="pledge-cert-inner">
            <p className="pledge-cert-preamble">
              나는 이 캠퍼스의 고양이를 기록하는<br />
              사람으로서 아래를 지킬 것을 서약합니다.
            </p>

            <b className="pledge-cert-heading">서약</b>

            <ul className="pledge-cert-clauses">
              {CLAUSES.map((text, i) => (
                <li key={i} className="pledge-cert-clause">
                  <span className="pledge-cert-num">{i + 1}.</span>
                  <span className="pledge-cert-clause-text">{text}</span>
                </li>
              ))}
            </ul>

            <p className="pledge-cert-date">{dateLabel}</p>

            <div className="pledge-cert-signee">
              <span className="pledge-cert-signee-label">서약자<br />{nickname ?? '집사'}</span>
              <button
                type="button"
                className={`pledge-cert-stampbtn ${stamped ? 'is-stamped' : 'is-empty'}`}
                aria-label="도장 찍기"
                onClick={handleStamp}
              >
                {stamped ? (
                  <StampIcon />
                ) : (
                  <>
                    <span className="pledge-cert-stamp-in">인</span>
                    <span className="pledge-cert-stamp-hint">눌러서 찍기</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="pledge-cert-bar">
          {!stamped && <span className="pledge-cert-hint">도장을 찍어주세요</span>}
          <button
            type="button"
            className="pledge-cert-submit"
            disabled={!stamped}
            onClick={() => setStep(2)}
          >
            서약합니다
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="sheet-backdrop">
      <div className="pledge-panel" onClick={(e) => e.stopPropagation()}>
        <div className="pledge-scroll">
          <b className="pledge-title">만나기 전에, 세 가지만</b>
          <ol className="pledge-etiquette">
            {ETIQUETTE_ITEMS.map((item) => (
              <li key={item.title}>
                <b>{item.title}</b> — {item.body}
              </li>
            ))}
          </ol>
          <blockquote className="pledge-quote">
            <b>새끼 고양이는 혼자 있어도 그냥 두세요.</b> 어미가 잠깐 밥 먹으러 간 거예요.
            만지면 어미가 새끼를 포기할 수 있어요. 다치거나, 몸이 차갑거나, 차도 위에 있을 때만 도움을 요청하세요.
          </blockquote>
        </div>

        <div className="pledge-footer">
          <button className="btn-primary" disabled={busy} onClick={handleAgree}>
            알겠어요
          </button>
        </div>
      </div>
    </div>
  );
}

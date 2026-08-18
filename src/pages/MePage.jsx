// 집사 프로필 — 닉네임 + 급식 카운터 3종(§2.8-15) + 설정 리스트(§2.10).
// 로드맵 §2.8-14 — profiles는 nickname 컬럼만 UPDATE 허용된다.
import { useEffect, useState } from 'react';
import { useSession, fetchMyProfile, signOut } from '../api/auth';
import { useAppUI } from '../components/AppUI';
import { fetchMyFeedCounts } from '../api/feedings';
import { updateNickname } from '../api/profile';
import { requestDeletion, fetchMyDeletionRequest } from '../api/account';
import MeInfoOverlay from '../components/MeInfoOverlay';
import NoticePanel from '../components/NoticePanel';
import ReportPanel from '../components/ReportPanel';
import { KIND_ORDER, KIND_KO } from '../lib/format';

function dateKo(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function MePage() {
  const { loggedIn } = useSession();
  const { openAuth } = useAppUI();

  const [nickname, setNickname] = useState(null);
  const [counts, setCounts] = useState(null);
  const [error, setError] = useState(null);
  const [pendingDeletion, setPendingDeletion] = useState(null);

  const [nickOpen, setNickOpen] = useState(false);
  const [nickDraft, setNickDraft] = useState('');
  const [nickError, setNickError] = useState(null);
  const [nickSaving, setNickSaving] = useState(false);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    if (!loggedIn) return;
    let alive = true;
    Promise.all([fetchMyProfile(), fetchMyFeedCounts(), fetchMyDeletionRequest()])
      .then(([profile, c, pending]) => {
        if (!alive) return;
        setNickname(profile?.nickname ?? null);
        setCounts(c);
        setPendingDeletion(pending);
      })
      .catch((e) => { if (alive) setError(e.message || String(e)); });
    return () => { alive = false; };
  }, [loggedIn]);

  function openNick() {
    setNickDraft(nickname ?? '');
    setNickError(null);
    setNickOpen(true);
  }

  async function saveNick() {
    setNickSaving(true);
    setNickError(null);
    try {
      const saved = await updateNickname(nickDraft);
      setNickname(saved);
      setNickOpen(false);
    } catch (e) {
      setNickError(e.message || String(e));
    } finally {
      setNickSaving(false);
    }
  }

  async function submitDeletion() {
    setDeleteSaving(true);
    setDeleteError(null);
    try {
      const row = await requestDeletion();
      setPendingDeletion(row);
      setDeleteConfirmOpen(false);
    } catch (e) {
      if (e.message === 'ALREADY_REQUESTED') {
        // 부분 unique 인덱스에 이미 걸려 있던 것 — 화면 상태를 최신으로 맞춘다
        try { setPendingDeletion(await fetchMyDeletionRequest()); } catch { /* 화면은 그대로 둔다 */ }
        setDeleteConfirmOpen(false);
      } else {
        setDeleteError(e.message || String(e));
      }
    } finally {
      setDeleteSaving(false);
    }
  }

  // /me 는 잠금 탭이지만 주소창 직접 입력을 막는 라우트 가드가 없어서 여기서 한 번 더 막는다
  if (!loggedIn) {
    return (
      <div className="me-gate">
        <p>집사 프로필은 로그인해야 볼 수 있어요.</p>
        <button className="me-login" onClick={() => openAuth()}>로그인하기</button>
      </div>
    );
  }

  return (
    <div className="me">
      <div className="me-nickname">{nickname ?? '—'}</div>
      {error ? (
        <p className="me-error">불러오지 못했어요: {error}</p>
      ) : (
        <div className="me-counts">
          {KIND_ORDER.map((k) => (
            <div className="me-count" key={k}>
              <div className="me-count-label">{KIND_KO[k]}</div>
              <div className="me-count-value">{counts ? counts[k] : '—'}</div>
            </div>
          ))}
        </div>
      )}

      <div className="me-settings">
        <div className="me-section">계정</div>
        <button className="me-row" onClick={openNick}>닉네임 변경</button>
        <button className="me-row" onClick={() => signOut()}>로그아웃</button>

        <div className="divider" />

        <div className="me-section">안내</div>
        <button className="me-row" onClick={() => setNoticeOpen(true)}>이용 안내</button>
        <button className="me-row" onClick={() => setReportOpen(true)}>고양이 관련 요청</button>
        <button className="me-row" onClick={() => setPrivacyOpen(true)}>개인정보 처리방침</button>
        {/* TODO: 실제 문의 메일 주소 확정되면 채운다 */}
        <a className="me-row" href="mailto:">문의하기</a>

        <div className="divider" />

        {pendingDeletion ? (
          <div className="me-pending">탈퇴 요청 접수됨 ({dateKo(pendingDeletion.created_at)})</div>
        ) : (
          <button className="me-row me-row-danger" onClick={() => setDeleteConfirmOpen(true)}>
            회원 탈퇴
          </button>
        )}

        <div className="divider" />

        <div className="me-version">버전 0.1.0</div>
      </div>

      {nickOpen && (
        <div className="rc-backdrop" onClick={() => setNickOpen(false)}>
          <div className="rc-sheet" onClick={(e) => e.stopPropagation()}>
            <p className="rc-q">닉네임 변경</p>
            <input
              className="rf-input"
              value={nickDraft}
              onChange={(e) => setNickDraft(e.target.value)}
              maxLength={12}
              placeholder="2~12자"
              autoFocus
            />
            {nickError && <p className="me-error">{nickError}</p>}
            <button className="rc-btn rc-line" onClick={() => setNickOpen(false)} disabled={nickSaving}>
              취소
            </button>
            <button className="rc-btn rc-fill" onClick={saveNick} disabled={nickSaving}>
              {nickSaving ? '저장 중…' : '저장'}
            </button>
          </div>
        </div>
      )}

      {deleteConfirmOpen && (
        <div className="rc-backdrop" onClick={() => setDeleteConfirmOpen(false)}>
          <div className="rc-sheet" onClick={(e) => e.stopPropagation()}>
            <p className="rc-q">정말 탈퇴하시겠어요?<br />요청을 남기면 검토 후 처리돼요.</p>
            {deleteError && <p className="me-error">{deleteError}</p>}
            <button
              className="rc-btn rc-line"
              onClick={() => setDeleteConfirmOpen(false)}
              disabled={deleteSaving}
            >
              취소
            </button>
            <button className="rc-btn me-danger-btn" onClick={submitDeletion} disabled={deleteSaving}>
              {deleteSaving ? '요청 중…' : '탈퇴 요청'}
            </button>
          </div>
        </div>
      )}

      <MeInfoOverlay open={privacyOpen} title="개인정보 처리방침" onClose={() => setPrivacyOpen(false)}>
        {/* TODO: 실제 개인정보 처리방침 본문으로 교체 — 지금은 플레이스홀더 */}
        <p>개인정보 처리방침 본문은 추후 채워집니다.</p>
      </MeInfoOverlay>

      <NoticePanel open={noticeOpen} onClose={() => setNoticeOpen(false)} />
      <ReportPanel open={reportOpen} onClose={() => setReportOpen(false)} />
    </div>
  );
}

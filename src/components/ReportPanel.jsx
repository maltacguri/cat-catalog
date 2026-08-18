import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useSession } from '../api/auth';
import { useAppUI } from './AppUI';
import { submitCatReport, fetchMyReports } from '../api/reports';
import { requestDeletion } from '../api/account';
import { REPORT_KIND_KO, REPORT_STATUS_KO } from '../lib/format';

/**
 * 고양이 관련 요청 접수 (§2.16). NoticePanel 안에서 열리는 오버레이 — 라우트 없음.
 * CatRegisterForm 의 색 아코디언(.rf-acc-*)을 그대로 재사용한다.
 *
 * 화면은 하나, 저장은 둘 — '계정·개인정보 삭제'만 deletion_requests 로 가고
 * 나머지 3종(profile/photo/other)은 cat_reports 로 간다.
 */
const OPTIONS = [
  { key: 'profile', label: '잘못된 정보 · 중복 등록', noteRequired: true },
  { key: 'photo', label: '사진 삭제 요청', noteRequired: true },
  { key: 'account', label: '계정 · 개인정보 삭제', noteRequired: false },
  { key: 'other', label: '기타', noteRequired: false },
];

function dateKo(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function ReportPanel({ open, onClose }) {
  const { loggedIn } = useSession();
  const { openAuth } = useAppUI();

  const [selected, setSelected] = useState(null);
  const [accOpen, setAccOpen] = useState(false);
  const [note, setNote] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  const [myReports, setMyReports] = useState(null);
  const [listError, setListError] = useState(null);

  useEffect(() => {
    if (!open || !loggedIn) return;
    let alive = true;
    fetchMyReports()
      .then((rows) => { if (alive) setMyReports(rows); })
      .catch((e) => { if (alive) setListError(e.message || String(e)); });
    return () => { alive = false; };
  }, [open, loggedIn, done]);

  const option = OPTIONS.find((o) => o.key === selected);
  const canSubmit = !!option && (!option.noteRequired || note.trim() !== '') && !submitting;

  function reset() {
    setSelected(null); setAccOpen(false); setNote('');
    setSubmitting(false); setError(null); setDone(false);
  }
  function close() { reset(); onClose(); }

  async function handleSubmit() {
    if (!loggedIn) { openAuth(); return; }
    if (!canSubmit) return;

    setSubmitting(true); setError(null);
    try {
      if (option.key === 'account') {
        await requestDeletion(note);
      } else {
        await submitCatReport({ kind: option.key, note });
      }
      setDone(true);
    } catch (err) {
      setError(err.message || String(err));
      setSubmitting(false);
    }
  }

  return (
    <div className={`register-page ${open ? 'show' : ''}`}>
      <div className="rf-header">
        <button className="rf-back" onClick={close} aria-label="닫기">←</button>
        <div className="rf-title">고양이 관련 요청</div>
      </div>

      <div className="rf-body">
        {done ? (
          <div className="rf-done">
            <div className="rf-done-title">접수되었어요</div>
            <button className="rf-submit" onClick={close}>닫기</button>
          </div>
        ) : (
          <>
            <div className="rf-field">
              <span className="rf-label">요청 종류</span>
              <div className="rf-acc">
                <button
                  type="button"
                  className={`rf-acc-head ${option ? 'picked' : ''}`}
                  onClick={() => setAccOpen((o) => !o)}
                  aria-expanded={accOpen}
                >
                  <span>{option ? option.label : '요청 종류를 선택하세요'}</span>
                  <ChevronDown size={18} className={`rf-acc-chev ${accOpen ? 'open' : ''}`} />
                </button>
                {accOpen && (
                  <div className="rf-acc-body">
                    {OPTIONS.map((o) => (
                      <button
                        key={o.key} type="button"
                        className={`rf-acc-item ${selected === o.key ? 'on' : ''}`}
                        onClick={() => { setSelected(o.key); setAccOpen(false); }}
                      >{o.label}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <label className="rf-field">
              <span className="rf-label">
                내용{option?.noteRequired && <em className="req">*</em>}
              </span>
              <textarea
                className="rf-input rf-textarea" value={note} rows={3} maxLength={500}
                onChange={(e) => setNote(e.target.value)}
                placeholder="도감번호나 고양이 이름을 함께 적어주세요"
              />
            </label>

            {error && (
              <div className="pf-upload-status pf-upload-error">접수 실패: {error}</div>
            )}

            <div className="report-list">
              <div className="report-list-title">내 요청 목록</div>
              {listError && <p className="me-error">{listError}</p>}
              {!listError && myReports && myReports.length === 0 && (
                <p className="report-list-empty">아직 접수한 요청이 없어요.</p>
              )}
              {myReports?.map((r) => (
                <div className="report-item" key={r.id}>
                  <div className="report-item-head">
                    <span className="report-item-date">{dateKo(r.created_at)}</span>
                    <span className="report-item-kind">{REPORT_KIND_KO[r.kind]}</span>
                    <span className={`report-badge report-badge-${r.status}`}>
                      {REPORT_STATUS_KO[r.status]}
                    </span>
                  </div>
                  {r.status === 'rejected' && r.admin_note && (
                    <div className="report-item-admin">{r.admin_note}</div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {!done && (
        <div className="rf-footer">
          <button className="rf-submit" disabled={!canSubmit} onClick={handleSubmit}>
            {submitting ? '접수 중…' : '접수하기'}
          </button>
        </div>
      )}
    </div>
  );
}

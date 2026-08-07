import { useEffect, useState } from 'react';
import { sanitizeImage, makeThumb } from '../lib/image';
import { uploadCoverPhoto, coverUrl } from '../api/photos';
import { supabase } from '../lib/supabaseClient';

/**
 * 대표 사진 필드 — 선택 → 변환 → Storage 업로드까지 (§2.4, §2.11).
 * `cats` INSERT는 부모(CatRegisterForm)가 한다. 여기서는 cover_path 만 얻어
 * onCoverReady 로 올려보낸다. 업로드 완료 전에는 null 이라 부모가 등록을 막는다.
 */
export default function PhotoField({ onCoverReady }) {
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);
  const [thumbPreview, setThumbPreview] = useState(null);
  const [uploadState, setUploadState] = useState('idle'); // idle | uploading | done | error
  const [uploadError, setUploadError] = useState(null);
  const [coverPath, setCoverPath] = useState(null);

  // 미리보기 URL은 다음 파일로 교체되거나 컴포넌트가 사라질 때 해제한다
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
    if (thumbPreview) URL.revokeObjectURL(thumbPreview);
  }, [preview, thumbPreview]);

  async function handleChange(e) {
    const picked = e.target.files?.[0];
    e.target.value = ''; // 같은 파일을 다시 골라도 onChange가 또 뜨게
    if (!picked) return;

    setFile(picked);
    setError(null);
    setPreview(null);
    setThumbPreview(null);
    setUploadState('idle');
    setUploadError(null);
    setCoverPath(null);
    onCoverReady?.(null);   // 재선택하면 이전 업로드 무효 → 부모 등록 다시 잠금
    setBusy(true);

    try {
      // 원칙 4 — EXIF 제거를 통과한 결과만 화면에 그린다 (lib/image.js)
      const [full, thumb] = await Promise.all([sanitizeImage(picked), makeThumb(picked)]);
      setPreview(URL.createObjectURL(full.blob));
      setThumbPreview(URL.createObjectURL(thumb.blob));
    } catch (err) {
      setError(err.message || String(err));
      setBusy(false);
      return;
    }
    setBusy(false);

    setUploadState('uploading');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('LOGIN_REQUIRED');
      const path = await uploadCoverPhoto(picked, { uid: user.id });
      setCoverPath(path);
      setUploadState('done');
      onCoverReady?.(path);          // 업로드 성공 → 부모가 등록 버튼 열 수 있다
    } catch (err) {
      setUploadError(err.message || String(err));
      setUploadState('error');
      onCoverReady?.(null);
    }
  }

  return (
    <div className="photo-field">
      <label className={`pf-picker ${busy ? 'is-busy' : ''}`}>
        <input type="file" accept="image/*" onChange={handleChange} disabled={busy} />
        {busy ? '변환 중…' : '대표 사진 선택'}
      </label>

      {file && (
        <div className="pf-filemeta">{file.name} · {file.type || '(타입 정보 없음)'}</div>
      )}

      {error && <div className="pf-error">변환 실패: {error}</div>}

      {preview && (
        <div className="pf-preview">
          <img src={preview} alt="대표 사진 미리보기" />
        </div>
      )}

      {thumbPreview && (
        <div className="pf-thumb">
          <span className="pf-thumb-label">썸네일</span>
          <img src={thumbPreview} alt="썸네일 미리보기" />
        </div>
      )}

      {uploadState === 'uploading' && (
        <div className="pf-upload-status">업로드 중…</div>
      )}
      {uploadState === 'done' && (
        <div className="pf-upload-status pf-upload-done">
          업로드 완료
          {coverPath && (
            <a href={coverUrl(coverPath)} target="_blank" rel="noreferrer"> · 확인</a>
          )}
        </div>
      )}
      {uploadState === 'error' && (
        <div className="pf-upload-status pf-upload-error">업로드 실패: {uploadError}</div>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { sanitizeImage, makeThumb } from '../lib/image';

/**
 * 대표 사진 필드 — 미리보기까지만 (§2.4, Phase D "업로드 UI" 선행 단계).
 * Storage 업로드·`cats` INSERT는 여기서 하지 않는다.
 */
export default function PhotoField() {
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);
  const [thumbPreview, setThumbPreview] = useState(null);

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
    setBusy(true);
    try {
      // 원칙 4 — EXIF 제거를 통과한 결과만 화면에 그린다 (lib/image.js)
      const [full, thumb] = await Promise.all([sanitizeImage(picked), makeThumb(picked)]);
      setPreview(URL.createObjectURL(full.blob));
      setThumbPreview(URL.createObjectURL(thumb.blob));
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setBusy(false);
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
    </div>
  );
}

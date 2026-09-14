import { coverUrl, useGalleryThumbUrl } from '../api/photos';

/**
 * kind="cover"   → 대표 사진. 누구나 보인다 (§2.4)
 * kind="gallery" → 목격 사진. 로그인해야 보인다. 썸네일 우선, 없으면 원본으로 폴백
 */
export default function CatPhoto({ path, kind = 'gallery', alt, className, loggedIn }) {
  // 훅은 조건부로 못 쓰니 항상 부르고, cover 일 때는 null 을 넘긴다.
  const signed = useGalleryThumbUrl(kind === 'gallery' ? path : null);
  const url = kind === 'cover' ? coverUrl(path) : signed;

  if (url) return <img className={className} src={url} alt={alt ?? ''} loading="lazy" />;

  const locked = kind === 'gallery' && !loggedIn && path;
  return (
    <div className={className} style={ph}>
      {locked ? '🔒 로그인하면 보여요' : '사진 준비 중'}
    </div>
  );
}

// 사진 없을 때의 자리. 토큰(--token-cream)을 참조해 다른 면과 같은 크림으로 앉는다.
const ph = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'var(--token-sunken)', color: 'var(--token-muted)', fontSize: 13,
  fontFamily: 'var(--token-font-body)',
  textAlign: 'center', padding: 12, width: '100%', height: '100%',
};

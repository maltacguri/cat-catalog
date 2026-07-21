import { coverUrl, useGalleryUrl } from '../api/photos';

/**
 * kind="cover"   → 대표 사진. 누구나 보인다 (§2.4)
 * kind="gallery" → 목격 사진. 로그인해야 보인다
 */
export default function CatPhoto({ path, kind = 'gallery', alt, className, loggedIn }) {
  // 훅은 조건부로 못 쓰니 항상 부르고, cover 일 때는 null 을 넘긴다.
  const signed = useGalleryUrl(kind === 'gallery' ? path : null);
  const url = kind === 'cover' ? coverUrl(path) : signed;

  if (url) return <img className={className} src={url} alt={alt ?? ''} loading="lazy" />;

  const locked = kind === 'gallery' && !loggedIn && path;
  return (
    <div className={className} style={ph}>
      {locked ? '🔒 로그인하면 보여요' : '사진 준비 중'}
    </div>
  );
}

const ph = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: '#efece4', color: '#a9a396', fontSize: 13,
  textAlign: 'center', padding: 12, width: '100%', height: '100%',
};

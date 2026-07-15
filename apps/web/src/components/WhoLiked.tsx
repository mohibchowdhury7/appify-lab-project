import { useState, useEffect, useRef } from 'react';
import { AXIOS_INSTANCE } from '../api/axios-instance';

import react1 from '../assets/images/react_img1.png';
import react2 from '../assets/images/react_img2.png';
import react3 from '../assets/images/react_img3.png';
import postImgDefault from '../assets/images/post_img.png';

interface LikerUser {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
}

interface WhoLikedProps {
  entityType: 'post' | 'comment';
  entityId: string;
  likeCount: number;
  recentLikers?: Array<{ avatarUrl: string | null }>;
}

export default function WhoLiked({ entityType, entityId, likeCount, recentLikers }: WhoLikedProps) {
  const [open, setOpen] = useState(false);
  const [likers, setLikers] = useState<LikerUser[]>([]);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const fetchLikers = async () => {
    try {
      const { data } = await AXIOS_INSTANCE.get(`/api/${entityType}s/${entityId}/likes`, {
        params: { limit: 20 },
      });
      setLikers(data.items);
    } catch {
      // Ignore
    }
  };

  const handleClick = () => {
    if (!open) {
      fetchLikers();
    }
    setOpen(!open);
  };

  if (likeCount === 0) return null;

  const reactImages = [react1, react2, react3];

  return (
    <div className="_feed_inner_timeline_total_reacts_image" ref={popoverRef} style={{ position: 'relative', cursor: 'pointer' }} onClick={handleClick}>
      {recentLikers && recentLikers.length > 0 && (
        <>
          {recentLikers.slice(0, 3).map((liker, i) => (
            <img
              key={i}
              src={liker.avatarUrl || reactImages[i % 3]}
              alt=""
              className={i === 0 ? '_react_img1' : '_react_img'}
              style={i >= 1 ? { marginLeft: '-8px' } : undefined}
            />
          ))}
          {likeCount > 3 && <p className="_feed_inner_timeline_total_reacts_para">{likeCount}+</p>}
        </>
      )}
      {(!recentLikers || recentLikers.length === 0) && (
        <p className="_feed_inner_timeline_total_reacts_para" style={{ margin: 0, color: '#767676' }}>
          {likeCount} {likeCount === 1 ? 'like' : 'likes'}
        </p>
      )}

      {open && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: 0,
          background: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 16px rgba(0,0,0,0.15)',
          padding: '12px',
          minWidth: '220px',
          maxHeight: '300px',
          overflowY: 'auto',
          zIndex: 1000,
          marginBottom: '8px',
          cursor: 'default',
        }}>
          <p style={{ fontWeight: 600, marginBottom: '8px', fontSize: '14px' }}>Liked by</p>
          {likers.map((liker) => (
            <div key={liker.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', borderBottom: '1px solid #f0f0f0' }}>
              <img
                src={liker.avatarUrl || postImgDefault}
                alt=""
                style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
              />
              <span style={{ fontSize: '13px', color: '#333' }}>{liker.firstName} {liker.lastName}</span>
            </div>
          ))}
          {likers.length === 0 && <p style={{ fontSize: '13px', color: '#999' }}>Loading...</p>}
        </div>
      )}
    </div>
  );
}

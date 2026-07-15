import { useState, useEffect, useRef } from 'react';
import { AXIOS_INSTANCE } from '../api/axios-instance';

import postImgDefault from '../assets/images/post_img.png';

interface LikerUser {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
}

interface CommentWhoLikedProps {
  entityType: 'post' | 'comment';
  entityId: string;
  likeCount: number;
  recentLikers?: Array<{ avatarUrl: string | null }>;
}

export default function CommentWhoLiked({ entityType, entityId, likeCount, recentLikers }: CommentWhoLikedProps) {
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

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!open) fetchLikers();
    setOpen(!open);
  };

  if (likeCount === 0) return null;

  return (
    <div className="_total_reactions" ref={popoverRef} onClick={handleClick}>
      <div className="_total_react">
        <span className="_reaction_like">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-thumbs-up">
            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
          </svg>
        </span>
        <span className="_reaction_heart">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-heart">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </span>
      </div>
      <span className="_total">{likeCount}</span>

      {open && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          right: 0,
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

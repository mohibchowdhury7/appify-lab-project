import { useState } from 'react';
import { AXIOS_INSTANCE } from '../api/axios-instance';

interface LikeButtonProps {
  entityType: 'post' | 'comment';
  entityId: string;
  likedByMe: boolean;
  likeCount: number;
}

export default function LikeButton({ entityType, entityId, likedByMe, likeCount }: LikeButtonProps) {
  const [optimisticLiked, setOptimisticLiked] = useState(false);
  const [optimisticCount, setOptimisticCount] = useState(0);

  const actualLiked = optimisticLiked ? !likedByMe : likedByMe;
  const actualCount = likeCount + optimisticCount;

  const handleToggle = async () => {
    setOptimisticLiked(true);
    setOptimisticCount(actualLiked ? -1 : 1);

    try {
      const url = `/api/${entityType}s/${entityId}/like`;
      const { data } = await AXIOS_INSTANCE.post(url);
      // Sync with server truth
      setOptimisticLiked(false);
      setOptimisticCount(data.liked === actualLiked ? 0 : (data.liked ? 1 : -1));
    } catch {
      // Revert on error
      setOptimisticLiked(false);
      setOptimisticCount(0);
    }
  };

  return (
    <button
      className={`_feed_inner_timeline_reaction_emoji _feed_reaction${actualLiked ? ' _feed_reaction_active' : ''}`}
      onClick={handleToggle}
    >
      <span className="_feed_inner_timeline_reaction_link">
        <span>
          <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" fill="none" viewBox="0 0 19 19">
            <path fill={actualLiked ? '#FFCC4D' : '#999'} d="M9.5 19a9.5 9.5 0 100-19 9.5 9.5 0 000 19z"/>
            <path fill="#664500" d="M9.5 11.083c-1.912 0-3.181-.222-4.75-.527-.358-.07-1.056 0-1.056 1.055 0 2.111 2.425 4.75 5.806 4.75 3.38 0 5.805-2.639 5.805-4.75 0-1.055-.697-1.125-1.055-1.055-1.57.305-2.838.527-4.75.527z"/>
            <path fill="#fff" d="M4.75 11.611s1.583.528 4.75.528 4.75-.528 4.75-.528-1.056 2.111-4.75 2.111-4.75-2.11-4.75-2.11z"/>
            <path fill="#664500" d="M6.333 8.972c.729 0 1.32-.827 1.32-1.847s-.591-1.847-1.32-1.847c-.729 0-1.32.827-1.32 1.847s.591 1.847 1.32 1.847zM12.667 8.972c.729 0 1.32-.827 1.32-1.847s-.591-1.847-1.32-1.847c-.729 0-1.32.827-1.32 1.847s.591 1.847 1.32 1.847z"/>
          </svg>
          {actualLiked ? `Liked (${actualCount})` : `Like${actualCount > 0 ? ` (${actualCount})` : ''}`}
        </span>
      </span>
    </button>
  );
}

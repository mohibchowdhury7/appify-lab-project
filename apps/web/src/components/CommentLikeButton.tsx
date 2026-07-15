import { useState } from 'react';
import { AXIOS_INSTANCE } from '../api/axios-instance';

interface CommentLikeButtonProps {
  entityType: 'post' | 'comment';
  entityId: string;
  likedByMe: boolean;
  likeCount: number;
}

export default function CommentLikeButton({ entityType, entityId, likedByMe, likeCount }: CommentLikeButtonProps) {
  const [optimisticLiked, setOptimisticLiked] = useState(false);
  const [optimisticCount, setOptimisticCount] = useState(0);

  const actualLiked = optimisticLiked ? !likedByMe : likedByMe;
  const actualCount = likeCount + optimisticCount;

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setOptimisticLiked(true);
    setOptimisticCount(actualLiked ? -1 : 1);

    try {
      const url = `/api/${entityType}s/${entityId}/like`;
      const { data } = await AXIOS_INSTANCE.post(url);
      setOptimisticLiked(false);
      setOptimisticCount(data.liked === actualLiked ? 0 : (data.liked ? 1 : -1));
    } catch {
      setOptimisticLiked(false);
      setOptimisticCount(0);
    }
  };

  return (
    <span style={{ cursor: 'pointer', color: actualLiked ? '#1890FF' : undefined }} onClick={handleToggle}>
      {actualLiked ? `Liked${actualCount > 0 ? ` (${actualCount})` : ''}` : 'Like'}
    </span>
  );
}

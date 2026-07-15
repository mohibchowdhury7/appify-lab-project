import { useState, useEffect } from 'react';
import CommentItem from './CommentItem';
import { AXIOS_INSTANCE } from '../api/axios-instance';
import { CommentSkeleton, TextSkeleton } from './Skeleton';

interface CommentAuthor {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
}

interface CommentData {
  id: string;
  text: string;
  createdAt: string;
  author: CommentAuthor;
  likeCount: number;
  likedByMe: boolean;
  recentLikers?: Array<{ avatarUrl: string | null }>;
  replyCount: number;
}

interface CommentPreview {
  id: string;
  text: string;
  createdAt: string;
  author: CommentAuthor;
  likeCount: number;
  likedByMe: boolean;
  replyCount: number;
}

interface CommentListProps {
  postId: string;
  commentCount: number;
  lastComment: CommentPreview | null;
  showAll?: boolean;
}

export default function CommentList({ postId, commentCount, lastComment, showAll = false }: CommentListProps) {
  const [comments, setComments] = useState<CommentData[]>([]);
  const [loaded, setLoaded] = useState(showAll);
  const [loading, setLoading] = useState(false);
  const [localShowAll, setLocalShowAll] = useState(showAll);

  const loadComments = async () => {
    setLoading(true);
    try {
      const { data } = await AXIOS_INSTANCE.get(`/api/posts/${postId}/comments`, {
        params: { limit: 50 },
      });
      setComments(data.items);
      setLoaded(true);
      setLocalShowAll(true);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  // Auto-load all comments if showAll is true
  useEffect(() => {
    if (showAll && !loaded && comments.length === 0) {
      loadComments();
    }
  }, [showAll, loaded, comments.length, postId]);

  // Also update localShowAll if showAll prop changes
  useEffect(() => {
    setLocalShowAll(showAll);
  }, [showAll]);

  // Loading all comments
  if (loading && comments.length === 0 && localShowAll) {
    return (
      <div style={{ padding: '8px 0' }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <CommentSkeleton key={i} />
        ))}
      </div>
    );
  }

  // Full comment list loaded
  if (localShowAll && comments.length > 0) {
    return (
      <>
        {commentCount > comments.length && (
          <div className="_previous_comment">
            <button type="button" className="_previous_comment_txt" onClick={loadComments} disabled={loading}>
              {loading ? <TextSkeleton width="80px" height={14} /> : `View ${commentCount - comments.length} more comments`}
            </button>
          </div>
        )}
        {comments.map((comment) => (
          <CommentItem key={comment.id} comment={comment} />
        ))}
      </>
    );
  }

  // No comments at all
  if (commentCount === 0) {
    return null;
  }

  // If localShowAll is false, show preview mode
  if (!localShowAll) {
    // If we have a last comment, show it with "View previous comments" button
    if (lastComment) {
      return (
        <>
          {commentCount > 1 && (
            <div className="_previous_comment">
              <button type="button" className="_previous_comment_txt" onClick={loadComments} disabled={loading}>
                View {commentCount - 1} previous {commentCount - 1 === 1 ? 'comment' : 'comments'}
              </button>
            </div>
          )}
          <CommentItem comment={lastComment} />
        </>
      );
    }
    // No last comment but comments exist - load them
    if (commentCount > 0 && !lastComment) {
      loadComments();
      return (
        <div style={{ padding: '8px 0' }}>
          {Array.from({ length: 2 }).map((_, i) => (
            <CommentSkeleton key={i} />
          ))}
        </div>
      );
    }
    return null;
  }

  // Fallback: show all comments if we have them
  if (comments.length > 0) {
    return (
      <>
        {commentCount > comments.length && (
          <div className="_previous_comment">
            <button type="button" className="_previous_comment_txt" onClick={loadComments} disabled={loading}>
              {loading ? <TextSkeleton width="80px" height={14} /> : `View ${commentCount - comments.length} more comments`}
            </button>
          </div>
        )}
        {comments.map((comment) => (
          <CommentItem key={comment.id} comment={comment} />
        ))}
      </>
    );
  }

  return null;
}

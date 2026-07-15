import { useState } from 'react';
import CommentLikeButton from './CommentLikeButton';
import CommentWhoLiked from './CommentWhoLiked';
import ReplyItem from './ReplyItem';
import CommentComposer from './CommentComposer';
import postImgDefault from '../assets/images/post_img.png';
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

interface CommentItemProps {
  comment: CommentData;
}

function timeAgoText(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return 'Just now';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return 'Just now';
  const mins = Math.floor(diff / 60);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

interface ReplyData {
  id: string;
  text: string;
  createdAt: string;
  author: CommentAuthor;
  likeCount: number;
  likedByMe: boolean;
  recentLikers?: Array<{ avatarUrl: string | null }>;
  replyCount: number;
}

export default function CommentItem({ comment }: CommentItemProps) {
  const [showReplyComposer, setShowReplyComposer] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [replies, setReplies] = useState<ReplyData[]>([]);
  const [repliesLoading, setRepliesLoading] = useState(false);

  const authorName = `${comment.author.firstName} ${comment.author.lastName}`;
  const avatarUrl = comment.author.avatarUrl || postImgDefault;

  const loadReplies = async () => {
    setRepliesLoading(true);
    try {
      const { data } = await AXIOS_INSTANCE.get(`/api/comments/${comment.id}/replies`, {
        params: { limit: 10 },
      });
      setReplies(data.items);
      setShowReplies(true);
    } catch {
      // ignore
    } finally {
      setRepliesLoading(false);
    }
  };

  const handleReplyCreated = () => {
    setShowReplyComposer(false);
    loadReplies();
  };

  return (
    <div className="_comment_main">
      <div className="_comment_image">
        <span className="_comment_image_link">
          <img src={avatarUrl} alt={authorName} className="_comment_img1" />
        </span>
      </div>
      <div className="_comment_area">
        <div className="_comment_details">
          <div className="_comment_details_top">
            <div className="_comment_name">
              <h4 className="_comment_name_title">{authorName}</h4>
            </div>
          </div>
          <div className="_comment_status">
            <p className="_comment_status_text"><span>{comment.text}</span></p>
          </div>

          {comment.likeCount > 0 && (
            <CommentWhoLiked
              entityType="comment"
              entityId={comment.id}
              likeCount={comment.likeCount}
              recentLikers={comment.recentLikers}
            />
          )}

          <div className="_comment_reply">
            <div className="_comment_reply_num">
              <ul className="_comment_reply_list">
                <li>
                  <CommentLikeButton
                    entityType="comment"
                    entityId={comment.id}
                    likedByMe={comment.likedByMe}
                    likeCount={comment.likeCount}
                  />
                </li>
                <li><span onClick={() => setShowReplyComposer(!showReplyComposer)}>Reply.</span></li>
                <li><span>Share</span></li>
                <li><span className="_time_link">.{timeAgoText(comment.createdAt)}</span></li>
              </ul>
            </div>
          </div>
        </div>

        {showReplyComposer && (
          <CommentComposer parentId={comment.id} onClose={handleReplyCreated} />
        )}

        {comment.replyCount > 0 && !showReplies && (
          <div className="_previous_comment" style={{ marginTop: '12px' }}>
            <button type="button" className="_previous_comment_txt" onClick={loadReplies} disabled={repliesLoading}>
              {repliesLoading ? <TextSkeleton width="80px" height={14} /> : `View ${comment.replyCount} ${comment.replyCount === 1 ? 'reply' : 'replies'}`}
            </button>
          </div>
        )}

        {showReplies && replies.length > 0 && (
          <div style={{ marginTop: '12px' }}>
            {replies.map((reply) => (
              <ReplyItem key={reply.id} reply={reply} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

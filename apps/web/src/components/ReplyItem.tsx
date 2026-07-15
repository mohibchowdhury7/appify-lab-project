import CommentLikeButton from './CommentLikeButton';
import CommentWhoLiked from './CommentWhoLiked';
import postImgDefault from '../assets/images/post_img.png';

interface ReplyAuthor {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
}

interface ReplyData {
  id: string;
  text: string;
  createdAt: string;
  author: ReplyAuthor;
  likeCount: number;
  likedByMe: boolean;
  recentLikers?: Array<{ avatarUrl: string | null }>;
  replyCount: number;
}

interface ReplyItemProps {
  reply: ReplyData;
}

function timeAgoText(dateStr: string): string {
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

export default function ReplyItem({ reply }: ReplyItemProps) {
  const authorName = `${reply.author.firstName} ${reply.author.lastName}`;
  const avatarUrl = reply.author.avatarUrl || postImgDefault;

  return (
    <div className="_comment_main" style={{ marginBottom: '12px' }}>
      <div className="_comment_image" style={{ flex: '0 0 28px', height: '28px', width: '28px' }}>
        <span className="_comment_image_link">
          <img src={avatarUrl} alt={authorName} className="_comment_img1" style={{ maxWidth: '28px' }} />
        </span>
      </div>
      <div className="_comment_area" style={{ marginLeft: '12px' }}>
        <div className="_comment_details">
          <div className="_comment_details_top">
            <div className="_comment_name">
              <h4 className="_comment_name_title">{authorName}</h4>
            </div>
          </div>
          <div className="_comment_status">
            <p className="_comment_status_text"><span>{reply.text}</span></p>
          </div>

          {reply.likeCount > 0 && (
            <CommentWhoLiked
              entityType="comment"
              entityId={reply.id}
              likeCount={reply.likeCount}
              recentLikers={reply.recentLikers}
            />
          )}

          <div className="_comment_reply">
            <div className="_comment_reply_num">
              <ul className="_comment_reply_list">
                <li>
                  <CommentLikeButton
                    entityType="comment"
                    entityId={reply.id}
                    likedByMe={reply.likedByMe}
                    likeCount={reply.likeCount}
                  />
                </li>
                <li><span className="_time_link">.{timeAgoText(reply.createdAt)}</span></li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

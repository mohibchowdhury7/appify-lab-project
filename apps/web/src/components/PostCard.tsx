import { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { AXIOS_INSTANCE } from '../api/axios-instance';
import postImgDefault from '../assets/images/post_img.png';
import LikeButton from './LikeButton';
import WhoLiked from './WhoLiked';
import CommentComposer from './CommentComposer';
import CommentList from './CommentList';

interface PostAuthor {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
}

interface CommentPreview {
  id: string;
  text: string;
  createdAt: string;
  author: PostAuthor;
  likeCount: number;
  likedByMe: boolean;
  replyCount: number;
}

interface FeedPost {
  id: string;
  text: string | null;
  imageUrl: string | null;
  visibility: 'PUBLIC' | 'PRIVATE';
  createdAt: string;
  author: PostAuthor;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  recentLikers?: Array<{ avatarUrl: string | null }>;
  lastComment?: CommentPreview | null;
}

interface PostCardProps {
  post: FeedPost;
}

function timeAgo(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return 'just now';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return `${diff}s ago`;
  const mins = Math.floor(diff / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function PostCard({ post }: PostCardProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showComments, setShowComments] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(post.text || '');
  const [editVisibility, setEditVisibility] = useState(post.visibility);
  const menuRef = useRef<HTMLDivElement>(null);

  const authorName = post.author ? `${post.author.firstName} ${post.author.lastName}` : 'Unknown User';
  const avatarUrl = post.author?.avatarUrl || postImgDefault;
  const isAuthor = user?.id === post.author?.id;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    if (showMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  const handleEdit = async () => {
    try {
      await AXIOS_INSTANCE.patch(`/api/posts/${post.id}`, {
        text: editText.trim() || null,
        visibility: editVisibility,
      });
      setEditing(false);
      setShowMenu(false);
      queryClient.invalidateQueries({ queryKey: ['posts', 'feed'] });
    } catch {
      // ignore
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this post?')) return;
    try {
      await AXIOS_INSTANCE.delete(`/api/posts/${post.id}`);
      setShowMenu(false);
      queryClient.invalidateQueries({ queryKey: ['posts', 'feed'] });
    } catch {
      // ignore
    }
  };

  return (
    <div className="_feed_inner_timeline_post_area _b_radious6 _padd_b24 _padd_t24 _mar_b16">
      <div className="_feed_inner_timeline_content _padd_r24 _padd_l24">
        <div className="_feed_inner_timeline_post_top">
          <div className="_feed_inner_timeline_post_box">
            <div className="_feed_inner_timeline_post_box_image">
              <img src={avatarUrl} alt={authorName} className="_post_img" />
            </div>
            <div className="_feed_inner_timeline_post_box_txt">
              <h4 className="_feed_inner_timeline_post_box_title">{authorName}</h4>
              <p className="_feed_inner_timeline_post_box_para">
                {timeAgo(post.createdAt)} . <a href="#0">{post.visibility === 'PUBLIC' ? 'Public' : 'Private'}</a>
              </p>
            </div>
          </div>

          <div className="_feed_inner_timeline_post_box_dropdown" ref={menuRef} style={{ position: 'relative' }}>
            <div className="_feed_timeline_post_dropdown">
              <button className="_feed_timeline_post_dropdown_link" onClick={() => setShowMenu(!showMenu)} type="button">
                <svg xmlns="http://www.w3.org/2000/svg" width="4" height="17" fill="none" viewBox="0 0 4 17">
                  <circle cx="2" cy="2" r="2" fill="#C4C4C4" />
                  <circle cx="2" cy="8" r="2" fill="#C4C4C4" />
                  <circle cx="2" cy="15" r="2" fill="#C4C4C4" />
                </svg>
              </button>
            </div>
            {showMenu && (
              <div className="_feed_timeline_dropdown" style={{ display: 'block', position: 'absolute', right: 0, top: '100%', zIndex: 100 }}>
                <ul className="_feed_timeline_dropdown_list">
                  <li className="_feed_timeline_dropdown_item">
                    <a href="#0" className="_feed_timeline_dropdown_link" onClick={(e) => { e.preventDefault(); setShowMenu(false); }}>
                      <span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 18 18">
                          <path stroke="#1890FF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" d="M14.25 15.75L9 12l-5.25 3.75v-12a1.5 1.5 0 011.5-1.5h7.5a1.5 1.5 0 011.5 1.5v12z"/>
                        </svg>
                      </span>
                      Save Post
                    </a>
                  </li>
                  <li className="_feed_timeline_dropdown_item">
                    <a href="#0" className="_feed_timeline_dropdown_link" onClick={(e) => { e.preventDefault(); setShowMenu(false); }}>
                      <span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="22" fill="none" viewBox="0 0 20 22">
                          <path fill="#377DFF" fillRule="evenodd" d="M7.547 19.55c.533.59 1.218.915 1.93.915.714 0 1.403-.324 1.938-.916a.777.777 0 011.09-.056c.318.284.344.77.058 1.084-.832.917-1.927 1.423-3.086 1.423h-.002c-1.155-.001-2.248-.506-3.077-1.424a.762.762 0 01.057-1.083.774.774 0 011.092.057zM9.527 0c4.58 0 7.657 3.543 7.657 6.85 0 1.702.436 2.424.899 3.19.457.754.976 1.612.976 3.233-.36 4.14-4.713 4.478-9.531 4.478-4.818 0-9.172-.337-9.528-4.413-.003-1.686.515-2.544.973-3.299l.161-.27c.398-.679.737-1.417.737-2.918C1.871 3.543 4.948 0 9.528 0zm0 1.535c-3.6 0-6.11 2.802-6.11 5.316 0 2.127-.595 3.11-1.12 3.978-.422.697-.755 1.247-.755 2.444.173 1.93 1.455 2.944 7.986 2.944 6.494 0 7.817-1.06 7.988-3.01-.003-1.13-.336-1.681-.757-2.378-.526-.868-1.12-1.851-1.12-3.978 0-2.514-2.51-5.316-6.111-5.316z" clipRule="evenodd"/>
                        </svg>
                      </span>
                      Turn On Notification
                    </a>
                  </li>
                  <li className="_feed_timeline_dropdown_item">
                    <a href="#0" className="_feed_timeline_dropdown_link" onClick={(e) => { e.preventDefault(); setShowMenu(false); }}>
                      <span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 18 18">
                          <path stroke="#1890FF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" d="M14.25 2.25H3.75a1.5 1.5 0 00-1.5 1.5v10.5a1.5 1.5 0 001.5 1.5h10.5a1.5 1.5 0 001.5-1.5V3.75a1.5 1.5 0 00-1.5-1.5zM6.75 6.75l4.5 4.5M11.25 6.75l-4.5 4.5"/>
                        </svg>
                      </span>
                      Hide
                    </a>
                  </li>
                  {isAuthor && (
                    <>
                      <li className="_feed_timeline_dropdown_item">
                        <a href="#0" className="_feed_timeline_dropdown_link" onClick={(e) => { e.preventDefault(); setEditing(true); setShowMenu(false); }}>
                          <span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 18 18">
                              <path stroke="#1890FF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" d="M8.25 3H3a1.5 1.5 0 00-1.5 1.5V15A1.5 1.5 0 003 16.5h10.5A1.5 1.5 0 0015 15V9.75"/>
                              <path stroke="#1890FF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" d="M13.875 1.875a1.591 1.591 0 112.25 2.25L9 11.25 6 12l.75-3 7.125-7.125z"/>
                            </svg>
                          </span>
                          Edit Post
                        </a>
                      </li>
                      <li className="_feed_timeline_dropdown_item">
                        <a href="#0" className="_feed_timeline_dropdown_link" onClick={(e) => { e.preventDefault(); handleDelete(); }}>
                          <span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 18 18">
                              <path stroke="#1890FF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" d="M2.25 4.5h13.5M6 4.5V3a1.5 1.5 0 011.5-1.5h3A1.5 1.5 0 0112 3v1.5m2.25 0V15a1.5 1.5 0 01-1.5 1.5h-7.5a1.5 1.5 0 01-1.5-1.5V4.5h10.5zM7.5 8.25v4.5M10.5 8.25v4.5"/>
                            </svg>
                          </span>
                          Delete Post
                        </a>
                      </li>
                    </>
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>

        {editing ? (
          <div style={{ marginTop: '12px' }}>
            <textarea
              className="form-control _textarea"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              maxLength={5000}
              style={{ marginBottom: '8px' }}
            />
            <select value={editVisibility} onChange={(e) => setEditVisibility(e.target.value as 'PUBLIC' | 'PRIVATE')} style={{ marginRight: '8px', padding: '4px 8px' }}>
              <option value="PUBLIC">🌐 Public</option>
              <option value="PRIVATE">🔒 Private</option>
            </select>
            <button className="_btn1" onClick={handleEdit} style={{ padding: '6px 16px', fontSize: '13px' }}>Save</button>
            <button onClick={() => setEditing(false)} style={{ marginLeft: '8px', padding: '6px 16px', fontSize: '13px', background: 'none', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
          </div>
        ) : (
          <>
            {post.text && <h4 className="_feed_inner_timeline_post_title">{post.text}</h4>}
            {post.imageUrl && (
              <div className="_feed_inner_timeline_image">
                <img src={post.imageUrl} alt="Post" className="_time_img" />
              </div>
            )}
          </>
        )}
      </div>

      <div className="_feed_inner_timeline_total_reacts _padd_r24 _padd_l24 _mar_b26">
        <WhoLiked entityType="post" entityId={post.id} likeCount={post.likeCount} recentLikers={post.recentLikers} />
        <div className="_feed_inner_timeline_total_reacts_txt">
          <p className="_feed_inner_timeline_total_reacts_para1"><span>{post.commentCount}</span> Comment</p>
        </div>
      </div>

      <div className="_feed_inner_timeline_reaction">
        <LikeButton entityType="post" entityId={post.id} likedByMe={post.likedByMe} likeCount={post.likeCount} />
        <button className="_feed_inner_timeline_reaction_comment _feed_reaction" onClick={() => setShowComments(!showComments)}>
          <span className="_feed_inner_timeline_reaction_link">
            <span>
              <svg className="_reaction_svg" xmlns="http://www.w3.org/2000/svg" width="21" height="21" fill="none" viewBox="0 0 21 21">
                <path stroke="#000" d="M1 10.5c0-.464 0-.696.009-.893A9 9 0 019.607 1.01C9.804 1 10.036 1 10.5 1v0c.464 0 .696 0 .893.009a9 9 0 018.598 8.598c.009.197.009.429.009.893v6.046c0 1.36 0 2.041-.317 2.535a2 2 0 01-.602.602c-.494.317-1.174.317-2.535.317H10.5c-.464 0-.696 0-.893-.009a9 9 0 01-8.598-8.598C1 11.196 1 10.964 1 10.5v0z"/>
                <path stroke="#000" strokeLinecap="round" strokeLinejoin="round" d="M6.938 9.313h7.125M10.5 14.063h3.563"/>
              </svg>
              Comment
            </span>
          </span>
        </button>
        <button className="_feed_inner_timeline_reaction_share _feed_reaction">
          <span className="_feed_inner_timeline_reaction_link">
            <span>
              <svg className="_reaction_svg" xmlns="http://www.w3.org/2000/svg" width="24" height="21" fill="none" viewBox="0 0 24 21">
                <path stroke="#000" strokeLinejoin="round" d="M23 10.5L12.917 1v5.429C3.267 6.429 1 13.258 1 20c2.785-3.52 5.248-5.429 11.917-5.429V20L23 10.5z"/>
              </svg>
              Share
            </span>
          </span>
        </button>
      </div>

      {/* Always show comment section area */}
      <div className="_feed_inner_timeline_cooment_area">
        {showComments && <CommentComposer postId={post.id} />}
        <div className="_timline_comment_main">
          <CommentList 
            postId={post.id} 
            commentCount={post.commentCount} 
            lastComment={post.lastComment ?? null}
            showAll={showComments}
          />
        </div>
      </div>
    </div>
  );
}

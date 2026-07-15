export enum PostVisibility {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
}

export interface AuthorSummary {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
}

export interface FeedPost {
  id: string;
  text: string | null;
  imageUrl: string | null;
  visibility: PostVisibility;
  createdAt: string;
  author: AuthorSummary;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  recentLikers: Array<{ avatarUrl: string | null }>;
}

export interface FeedResponse {
  items: FeedPost[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface CommentItem {
  id: string;
  text: string;
  createdAt: string;
  author: AuthorSummary;
  likeCount: number;
  likedByMe: boolean;
  recentLikers: Array<{ avatarUrl: string | null }>;
  replyCount: number;
}

export interface CommentListResponse {
  items: CommentItem[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface CreatePostInput {
  text?: string;
  imageUrl?: string;
  visibility?: PostVisibility;
}

export interface CreateCommentInput {
  text: string;
}

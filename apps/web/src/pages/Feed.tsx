import { useInfiniteQuery } from '@tanstack/react-query';
import { useRef, useEffect, useCallback } from 'react';
import { AXIOS_INSTANCE } from '../api/axios-instance';
import Header from '../components/Header';
import MobileHeader from '../components/MobileHeader';
import MobileNav from '../components/MobileNav';
import DarkModeToggle from '../components/DarkModeToggle';
import SidebarLeft from '../components/SidebarLeft';
import SidebarRight from '../components/SidebarRight';
import StoriesSection from '../components/StoriesSection';
import PostComposer from '../components/PostComposer';
import PostCard from '../components/PostCard';
import { PostCardSkeleton, TextSkeleton } from '../components/Skeleton';
import { useRealtimeFeed } from '../hooks/useRealtimeFeed';

interface CommentPreview {
  id: string;
  text: string;
  createdAt: string;
  author: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
  };
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
  author: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
  };
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  recentLikers?: Array<{ avatarUrl: string | null }>;
  lastComment?: CommentPreview | null;
}

interface FeedResponse {
  items: FeedPost[];
  nextCursor: string | null;
  hasMore: boolean;
}

async function fetchFeed({ pageParam }: { pageParam?: string }): Promise<FeedResponse> {
  const params: Record<string, string | number> = { limit: 20 };
  if (pageParam) params.cursor = pageParam;
  const { data } = await AXIOS_INSTANCE.get('/api/posts/feed', { params });
  return data;
}

export default function Feed() {
  // Enable real-time updates for feed
  useRealtimeFeed();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
  } = useInfiniteQuery({
    queryKey: ['posts', 'feed'],
    queryFn: fetchFeed,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: any) => lastPage?.hasMore ? lastPage.nextCursor : undefined,
    staleTime: 30000,
  });

  const posts = data?.pages?.flatMap((page) => page?.items || []) ?? [];

  const loadMoreRef = useRef<HTMLDivElement>(null);

  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    const [entry] = entries;
    if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(handleObserver, { rootMargin: '200px' });
    observer.observe(el);
    return () => observer.disconnect();
  }, [handleObserver]);

  return (
    <div className="_layout _layout_main_wrapper">
      <DarkModeToggle />
      <div className="_main_layout">
        <Header />
        <MobileHeader />
        <MobileNav />

        <div className="container _custom_container">
          <div className="_layout_inner_wrap">
            <div className="row">
              {/* Left Sidebar */}
              <div className="col-xl-3 col-lg-3 col-md-12 col-sm-12">
                <SidebarLeft />
              </div>

              {/* Center Feed */}
              <div className="col-xl-6 col-lg-6 col-md-12 col-sm-12">
                <div className="_layout_middle_wrap">
                  <div className="_layout_middle_inner">
                    <StoriesSection />
                    <PostComposer />

                    {isLoading && (
                      <div className="_skeleton_feed_container">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <PostCardSkeleton key={i} />
                        ))}
                      </div>
                    )}

                    {isError && (
                      <p style={{ textAlign: 'center', padding: '2rem', color: '#dc3545' }}>
                        Failed to load posts. {(error as any)?.response?.data?.message || 'Please try again later.'}
                      </p>
                    )}

                    {!isLoading && !isError && posts.length === 0 && (
                      <p style={{ textAlign: 'center', padding: '3rem', color: '#767676' }}>
                        No posts yet. Be the first to share something!
                      </p>
                    )}

                    {posts.map((post) => (
                      <PostCard key={post.id} post={post} />
                    ))}

                    <div ref={loadMoreRef} style={{ textAlign: 'center', padding: '20px' }}>
                      {isFetchingNextPage && <TextSkeleton width="150px" height={14} />}
                      {!hasNextPage && posts.length > 0 && (
                        <p style={{ color: '#767676', fontSize: '13px' }}>You've reached the end</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Sidebar */}
              <div className="col-xl-3 col-lg-3 col-md-12 col-sm-12">
                <SidebarRight />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRealtimeUpdates } from './useWebSocket';

type InfiniteFeedPage = {
  items?: any[];
  [key: string]: any;
};

type InfiniteFeedData = {
  pages?: InfiniteFeedPage[];
  pageParams?: any[];
  [key: string]: any;
};

function updateFeedPages(oldData: InfiniteFeedData | undefined, updater: (item: any) => any) {
  const pages = Array.isArray(oldData?.pages) ? oldData.pages : [];
  const nextPages = pages.map((page) => {
    const items = Array.isArray(page?.items) ? page.items : [];
    return {
      ...page,
      items: items.map(updater),
    };
  });

  if (nextPages.length === 0) {
    return oldData ?? { pages: [], pageParams: [] };
  }

  return {
    ...oldData,
    pages: nextPages,
    pageParams: Array.isArray(oldData?.pageParams) ? oldData.pageParams : [],
  };
}

function prependToFeedPages(oldData: InfiniteFeedData | undefined, item: any) {
  const pages = Array.isArray(oldData?.pages) ? oldData.pages : [];

  if (pages.length === 0) {
    return {
      pages: [{ items: [item], nextCursor: null, hasMore: false }],
      pageParams: [undefined],
    };
  }

  const firstPage = pages[0] ?? {};
  const firstItems = Array.isArray(firstPage.items) ? firstPage.items : [];

  return {
    ...oldData,
    pages: [
      {
        ...firstPage,
        items: firstItems.some((existing: any) => existing?.id === item?.id)
          ? firstItems
          : [item, ...firstItems],
      },
      ...pages.slice(1),
    ],
    pageParams: Array.isArray(oldData?.pageParams) ? oldData.pageParams : [],
  };
}

/**
 * Hook to handle real-time feed updates
 * Automatically updates query cache when WebSocket events arrive
 */
export function useRealtimeFeed() {
  const queryClient = useQueryClient();
  const { 
    newPost, 
    newComment, 
    newReply, 
    likeUpdate,
    clearNewPost,
    clearNewComment,
    clearNewReply,
    clearLikeUpdate,
  } = useRealtimeUpdates();

  // Handle new posts - prepend to feed
  useEffect(() => {
    if (newPost && newPost.post?.id) {
      try {
        queryClient.setQueryData(['posts', 'feed'], (oldData: any) => {
          return prependToFeedPages(oldData, newPost.post);
        });
      } catch (err) {
        console.error('Error updating feed cache with new post:', err);
      }
      clearNewPost();
    }
  }, [newPost, queryClient, clearNewPost]);

  // Handle new comments - update specific post
  useEffect(() => {
    if (newComment?.comment?.id) {
      try {
        const { postId, comment } = newComment;
        
        // Update comments for this post
        queryClient.setQueryData(['comments', postId], (oldData: any) => {
          if (!oldData) {
            return { items: [comment], total: 1 };
          }
          return {
            ...oldData,
            items: [comment, ...oldData.items],
            total: oldData.total + 1,
          };
        });

        // Update post in feed to increment comment count
        queryClient.setQueryData(['posts', 'feed'], (oldData: any) => {
          return updateFeedPages(oldData, (p: any) => {
            if (p?.id === postId) {
              return {
                ...p,
                commentCount: (p.commentCount || 0) + 1,
                // If this is the first comment, update lastComment
                lastComment: (p.commentCount || 0) === 0 ? comment : p.lastComment,
              };
            }
            return p;
          });
        });
      } catch (err) {
        console.error('Error updating cache with new comment:', err);
      }
      clearNewComment();
    }
  }, [newComment, queryClient, clearNewComment]);

  // Handle new replies - update specific comment
  useEffect(() => {
    if (newReply?.reply?.id) {
      try {
        const { postId, reply, parentCommentId } = newReply;
        
        // Update replies for this comment
        queryClient.setQueryData(['replies', parentCommentId], (oldData: any) => {
          if (!oldData) {
            return { items: [reply], total: 1 };
          }
          return {
            ...oldData,
            items: [reply, ...oldData.items],
            total: oldData.total + 1,
          };
        });

        // Update comment to increment reply count
        queryClient.setQueryData(['comments', postId], (oldData: any) => {
          if (!oldData || !Array.isArray(oldData.items)) return oldData;
          return {
            ...oldData,
            items: oldData.items.map((c: any) => {
              if (c?.id === parentCommentId) {
                return {
                  ...c,
                  replyCount: (c.replyCount || 0) + 1,
                };
              }
              return c;
            }),
          };
        });

        // Update post comment count
        queryClient.setQueryData(['posts', 'feed'], (oldData: any) => {
          return updateFeedPages(oldData, (p: any) => {
            if (p?.id === postId) {
              return {
                ...p,
                commentCount: (p.commentCount || 0) + 1,
              };
            }
            return p;
          });
        });
      } catch (err) {
        console.error('Error updating cache with new reply:', err);
      }
      clearNewReply();
    }
  }, [newReply, queryClient, clearNewReply]);

  // Handle like toggles
  useEffect(() => {
    if (likeUpdate?.entityId) {
      try {
        const { entityType, entityId, liked, likeCount, userId } = likeUpdate;

        if (entityType === 'post') {
          // Update post in feed
          queryClient.setQueryData(['posts', 'feed'], (oldData: any) => {
            return updateFeedPages(oldData, (p: any) => {
              if (p?.id === entityId) {
                return {
                  ...p,
                  likeCount: likeCount || 0,
                  likedByMe: userId ? true : (p.likedByMe || false),
                };
              }
              return p;
            });
          });
        } else if (entityType === 'comment') {
          // Find which post this comment belongs to and update it
          queryClient.invalidateQueries({ queryKey: ['comments'] });
        }
      } catch (err) {
        console.error('Error updating cache with like toggle:', err);
      }
      clearLikeUpdate();
    }
  }, [likeUpdate, queryClient, clearLikeUpdate]);
}

/**
 * Hook for real-time updates on a specific post
 */
export function useRealtimePost(postId: string) {
  const queryClient = useQueryClient();
  const { newComment, newReply, likeUpdate, clearNewComment, clearNewReply, clearLikeUpdate } = useRealtimeUpdates();

  // Update comments when new comment arrives for this post
  useEffect(() => {
    if (newComment?.comment?.id && newComment.postId === postId) {
      try {
        queryClient.setQueryData(['comments', postId], (oldData: any) => {
          if (!oldData) {
            return { items: [newComment.comment], total: 1 };
          }
          return {
            ...oldData,
            items: [newComment.comment, ...oldData.items],
            total: oldData.total + 1,
          };
        });
      
        // Update post's comment count and lastComment
        queryClient.setQueryData(['posts', 'feed'], (oldData: any) => {
          return updateFeedPages(oldData, (p: any) => {
            if (p?.id === postId) {
              return {
                ...p,
                commentCount: (p.commentCount || 0) + 1,
                lastComment: newComment.comment || null,
              };
            }
            return p;
          });
        });
      } catch (err) {
        console.error('Error updating post cache with new comment:', err);
      }
      clearNewComment();
    }
  }, [newComment, postId, queryClient, clearNewComment]);

  // Update when new reply arrives
  useEffect(() => {
    if (newReply?.reply?.id && newReply.postId === postId) {
      try {
        // Invalidate comments for this post to refetch
        queryClient.invalidateQueries({ queryKey: ['comments', postId] });
        queryClient.invalidateQueries({ queryKey: ['replies', newReply.parentCommentId] });
        
        // Update post comment count
        queryClient.setQueryData(['posts', 'feed'], (oldData: any) => {
          return updateFeedPages(oldData, (p: any) => {
            if (p?.id === postId) {
              return {
                ...p,
                commentCount: (p.commentCount || 0) + 1,
              };
            }
            return p;
          });
        });
      } catch (err) {
        console.error('Error updating post cache with new reply:', err);
      }
      clearNewReply();
    }
  }, [newReply, postId, queryClient, clearNewReply]);

  // Update when like changes on this post
  useEffect(() => {
    if (likeUpdate?.entityId && likeUpdate.entityType === 'post' && likeUpdate.entityId === postId) {
      try {
        queryClient.setQueryData(['posts', 'feed'], (oldData: any) => {
          return updateFeedPages(oldData, (p: any) => {
            if (p?.id === postId) {
              return {
                ...p,
                likeCount: likeUpdate.likeCount || 0,
                likedByMe: likeUpdate.liked || false,
              };
            }
            return p;
          });
        });
      } catch (err) {
        console.error('Error updating post cache with like:', err);
      }
      clearLikeUpdate();
    }
  }, [likeUpdate, postId, queryClient, clearLikeUpdate]);
}

import { useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { getAccessToken } from '../lib/auth';
import { useAuth } from './useAuth';

const SOCKET_URL = import.meta.env.VITE_WS_BASE_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

// Realtime event types
export interface PostCreatedEvent {
  post: any;
  authorId: string;
}

export interface CommentCreatedEvent {
  comment: any;
  postId: string;
  postAuthorId: string;
  commentAuthorId: string;
}

export interface ReplyCreatedEvent {
  reply: any;
  parentCommentId: string;
  postId: string;
  replyAuthorId: string;
  parentCommentAuthorId: string;
}

export interface LikeToggledEvent {
  entityType: 'post' | 'comment';
  entityId: string;
  liked: boolean;
  likeCount: number;
  userId: string | null; // null if unliked
  postAuthorId?: string;
  commentAuthorId?: string;
}

// Custom hook to manage WebSocket connection
export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const accessToken = user ? getAccessToken() : null;

    // Disconnect previous socket if exists
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
    }

    // Don't connect without token
    if (!accessToken) {
      return;
    }

    // Create new socket connection to the 'realtime' namespace
    const newSocket = io(`${SOCKET_URL}/realtime`, {
      path: '/socket.io',
      autoConnect: true,
      transports: ['websocket', 'polling'],
      auth: { token: accessToken },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    // Connection events
    newSocket.on('connect', () => {
      console.log('WebSocket connected:', newSocket.id);
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (err) => {
      console.error('WebSocket connection error:', err.message);
      setIsConnected(false);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [user]);

  return { socket, isConnected };
}

// Main hook for real-time updates in the app
export function useRealtimeUpdates() {
  const { socket } = useWebSocket();
  
  const [newPost, setNewPost] = useState<PostCreatedEvent | null>(null);
  const [newComment, setNewComment] = useState<CommentCreatedEvent | null>(null);
  const [newReply, setNewReply] = useState<ReplyCreatedEvent | null>(null);
  const [likeUpdate, setLikeUpdate] = useState<LikeToggledEvent | null>(null);
  const [likeUpdateByMe, setLikeUpdateByMe] = useState<LikeToggledEvent | null>(null);

  useEffect(() => {
    if (!socket) return;

    // Post created - someone created a new post
    socket.on('post:created', (data: PostCreatedEvent) => {
      if (data?.post) {
        setNewPost(data);
      }
    });

    // Comment created on a post
    socket.on('comment:created', (data: CommentCreatedEvent) => {
      if (data?.comment) {
        setNewComment(data);
      }
    });

    // Comment created by current user
    socket.on('comment:created:by_me', (data: CommentCreatedEvent) => {
      if (data?.comment) {
        setNewComment(data);
      }
    });

    // Reply created
    socket.on('reply:created', (data: ReplyCreatedEvent) => {
      if (data?.reply) {
        setNewReply(data);
      }
    });

    // Like toggled on post/comment
    socket.on('like:toggled', (data: LikeToggledEvent) => {
      if (data?.entityId) {
        setLikeUpdate(data);
      }
    });

    // Like toggled by current user
    socket.on('like:toggled:by_me', (data: LikeToggledEvent) => {
      if (data?.entityId) {
        setLikeUpdateByMe(data);
      }
    });

    return () => {
      socket.off('post:created');
      socket.off('comment:created');
      socket.off('comment:created:by_me');
      socket.off('reply:created');
      socket.off('like:toggled');
      socket.off('like:toggled:by_me');
    };
  }, [socket]);

  // Clear functions
  const clearNewPost = useCallback(() => setNewPost(null), []);
  const clearNewComment = useCallback(() => setNewComment(null), []);
  const clearNewReply = useCallback(() => setNewReply(null), []);
  const clearLikeUpdate = useCallback(() => setLikeUpdate(null), []);
  const clearLikeUpdateByMe = useCallback(() => setLikeUpdateByMe(null), []);

  return {
    isConnected: true, // Will be managed by useWebSocket
    newPost,
    newComment,
    newReply,
    likeUpdate,
    likeUpdateByMe,
    clearNewPost,
    clearNewComment,
    clearNewReply,
    clearLikeUpdate,
    clearLikeUpdateByMe,
  };
}

// Simplified hook for specific components
export function usePostRealtime(postId: string) {
  const { newComment, newReply, likeUpdate, clearNewComment, clearNewReply, clearLikeUpdate } = useRealtimeUpdates();

  useEffect(() => {
    if (newComment && newComment.postId === postId) {
      // Handle new comment for this post
      console.log('New comment for post:', postId, newComment);
      clearNewComment();
    }
  }, [newComment, postId, clearNewComment]);

  useEffect(() => {
    if (newReply) {
      // Handle new reply (check if it belongs to this post)
      console.log('New reply:', newReply);
      clearNewReply();
    }
  }, [newReply, clearNewReply]);

  useEffect(() => {
    if (likeUpdate && likeUpdate.entityType === 'post' && likeUpdate.entityId === postId) {
      // Handle like update for this post
      console.log('Like update for post:', postId, likeUpdate);
      clearLikeUpdate();
    }
  }, [likeUpdate, postId, clearLikeUpdate]);

  return { newComment, newReply, likeUpdate };
}

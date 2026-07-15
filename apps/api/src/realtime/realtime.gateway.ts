import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Injectable, Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: 'realtime',
})
@Injectable()
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(RealtimeGateway.name);
  private readonly jwtService: JwtService;
  private readonly configService: ConfigService;

  // Track connected users: userId -> Set<socketId>
  private connectedUsers: Map<string, Set<string>> = new Map();

  constructor(jwtService: JwtService, configService: ConfigService) {
    this.jwtService = jwtService;
    this.configService = configService;
  }

  async handleConnection(client: Socket) {
    try {
      // Extract token from handshake
      const token = this.extractToken(client);

      if (!token) {
        this.logger.warn(`Client ${client.id} connected without token`);
        client.disconnect(true);
        return;
      }

      // Verify JWT
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      const userId = payload.sub;

      // Join user's personal room
      client.join(userId);

      // Track connection
      if (!this.connectedUsers.has(userId)) {
        this.connectedUsers.set(userId, new Set());
      }
      this.connectedUsers.get(userId)?.add(client.id);

      this.logger.log(`User ${userId} connected via ${client.id}`);
    } catch (err) {
      this.logger.error(`WebSocket auth failed for ${client.id}:`, err);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    // Remove from tracking
    for (const [userId, sockets] of this.connectedUsers) {
      sockets.delete(client.id);
      if (sockets.size === 0) {
        this.connectedUsers.delete(userId);
      }
    }
    this.logger.log(`Client ${client.id} disconnected`);
  }

  private extractToken(client: Socket): string | null {
    // Try handshake.auth.token first
    if (client.handshake.auth?.token) {
      return client.handshake.auth.token;
    }
    // Try Authorization header
    const authHeader = client.handshake.headers?.authorization;
    if (authHeader && typeof authHeader === 'string') {
      const parts = authHeader.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        return parts[1];
      }
    }
    // Try query token
    if (client.handshake.query?.token) {
      return client.handshake.query.token as string;
    }
    return null;
  }

  // Emit to a specific user
  emitToUser(userId: string, event: string, data: any) {
    this.server.to(userId).emit(event, data);
  }

  // Broadcast to all connected clients
  broadcast(event: string, data: any) {
    this.server.emit(event, data);
  }

  // Emit to post author (if different from current user)
  emitToPostAuthor(postAuthorId: string, currentUserId: string, event: string, data: any) {
    if (postAuthorId !== currentUserId) {
      this.emitToUser(postAuthorId, event, data);
    }
  }

  // Get list of connected user IDs
  getConnectedUserIds(): string[] {
    return Array.from(this.connectedUsers.keys());
  }

  // Check if a user is connected
  isUserConnected(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }
}

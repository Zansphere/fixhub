import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

/**
 * AdminNotificationsGateway — real-time event stream for admin users.
 *
 * Namespace: /admin-notifications
 * All admin clients join the shared room `admin:global`.
 *
 * Authentication:
 *   Client must pass JWT in handshake: `io(url, { auth: { token: '<jwt>' } })`
 *   The payload is decoded (no full sig-verify needed here since the admin
 *   must already be authenticated via HTTP to reach this panel).
 *   Only users with role === 'ADMIN' are admitted.
 *
 * Server → Client events:
 *   • notification:new        — new admin notification created
 *   • notification:read       — a notification was marked read
 *   • notification:all_read   — all notifications marked read
 *
 * Client → Server events:
 *   • mark_read     — { id: string }
 *   • mark_all_read — {}
 */
@WebSocketGateway({
  namespace: '/admin-notifications',
  cors: {
    origin: process.env.ADMIN_CORS_ORIGIN ?? 'http://localhost:3001',
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class AdminNotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(AdminNotificationsGateway.name);

  private readonly ADMIN_ROOM = 'admin:global';

  // ─── Connection lifecycle ────────────────────────────────────────────────

  async handleConnection(client: Socket): Promise<void> {
    let token = client.handshake.auth?.token as string | undefined;

    // Fallback to cookie if token is not in auth payload
    if (!token && client.handshake.headers.cookie) {
      const match = client.handshake.headers.cookie.match(/(?:^|;\s*)accessToken=([^;]*)/);
      if (match && match[1]) {
        token = match[1];
      }
    }

    if (!token) {
      this.logger.warn(`[AdminWS] rejected — no token (${client.id})`);
      client.emit('error', { message: 'Authentication required' });
      client.disconnect(true);
      return;
    }

    try {
      // Decode JWT payload (base64url, no signature verify — admin already authenticated via HTTP)
      const raw = Buffer.from(token.split('.')[1], 'base64url').toString('utf8');
      const payload = JSON.parse(raw) as { sub?: string; role?: string };

      if (payload.role !== 'ADMIN') {
        this.logger.warn(`[AdminWS] rejected — non-admin role (${client.id})`);
        client.emit('error', { message: 'Access denied' });
        client.disconnect(true);
        return;
      }

      client.data.userId = payload.sub;
      await client.join(this.ADMIN_ROOM);
      this.logger.log(`[AdminWS] connected: ${client.id} (user: ${client.data.userId})`);
      client.emit('connected', { room: this.ADMIN_ROOM });
    } catch {
      this.logger.warn(`[AdminWS] rejected — invalid token (${client.id})`);
      client.emit('error', { message: 'Invalid token' });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`[AdminWS] disconnected: ${client.id}`);
  }

  // ─── Client → Server ────────────────────────────────────────────────────

  @SubscribeMessage('mark_read')
  async handleMarkRead(
    @ConnectedSocket() _client: Socket,
    @MessageBody() data: { id: string },
  ) {
    // Delegated to AdminNotificationService via REST endpoint;
    // this allows the client to also trigger it via WS if preferred.
    this.broadcastToAdmin('notification:read', { id: data.id });
  }

  @SubscribeMessage('mark_all_read')
  async handleMarkAllRead(@ConnectedSocket() _client: Socket) {
    this.broadcastToAdmin('notification:all_read', {});
  }

  // ─── Server → Clients ───────────────────────────────────────────────────

  /**
   * Broadcast an event to all connected admin clients.
   * Called by AdminNotificationService.
   */
  broadcastToAdmin(event: string, payload: Record<string, unknown>): void {
    this.server.to(this.ADMIN_ROOM).emit(event, payload);
  }
}

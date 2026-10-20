import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import type { IncomingMessage } from 'node:http';
import { WebSocket, WebSocketServer } from 'ws';
import { AuthService } from '../auth/auth.service.js';
import type { AuthUser } from '../auth/auth.types.js';
import { ChatService } from './chat.service.js';

type Client = WebSocket & { matchId?: number; user?: AuthUser | null };

@Injectable()
export class ChatGateway implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ChatGateway.name);
  private wss: WebSocketServer | null = null;
  private rooms = new Map<number, Set<Client>>();

  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    private readonly authService: AuthService,
    private readonly chatService: ChatService,
  ) {}

  onModuleInit() {
    const server = this.httpAdapterHost.httpAdapter.getHttpServer();
    this.wss = new WebSocketServer({ server, path: '/api/chat' });
    this.wss.on('connection', (socket: Client, req: IncomingMessage) => {
      void this.handleConnection(socket, req);
    });
    this.logger.log('응원방 WebSocket /api/chat');
  }

  onModuleDestroy() {
    this.wss?.close();
  }

  broadcast(matchId: number, payload: unknown) {
    const text = JSON.stringify(payload);
    for (const client of this.rooms.get(matchId) ?? []) {
      if (client.readyState === WebSocket.OPEN) client.send(text);
    }
  }

  online(matchId: number) {
    return this.rooms.get(matchId)?.size ?? 0;
  }

  private async handleConnection(socket: Client, req: IncomingMessage) {
    const url = new URL(req.url ?? '', 'http://localhost');
    const matchId = Number(url.searchParams.get('matchId'));
    if (!Number.isInteger(matchId) || matchId < 1) {
      socket.close();
      return;
    }
    const token = cookieValue(req.headers.cookie, 'sid');
    socket.user = token ? await this.authService.resolveSession(token) : null;
    socket.matchId = matchId;
    this.add(matchId, socket);
    this.send(socket, { type: 'ready', online: this.online(matchId) });
    this.broadcast(matchId, { type: 'online', online: this.online(matchId) });

    socket.on('message', (raw) => {
      void this.onMessage(socket, rawDataToString(raw));
    });
    socket.on('close', () => {
      this.remove(socket);
      if (socket.matchId) {
        this.broadcast(socket.matchId, { type: 'online', online: this.online(socket.matchId) });
      }
    });
  }

  private async onMessage(socket: Client, raw: string) {
    let data: { type?: string; body?: string; afterId?: number };
    try {
      data = JSON.parse(raw) as { type?: string; body?: string; afterId?: number };
    } catch {
      return;
    }
    const matchId = socket.matchId;
    if (!matchId) return;
    if (data.type === 'send') {
      if (!socket.user) {
        this.send(socket, { type: 'error', message: '로그인이 필요합니다.' });
        return;
      }
      try {
        const message = await this.chatService.create(matchId, socket.user, data.body ?? '');
        this.broadcast(matchId, { type: 'message', message });
      } catch (err) {
        this.send(socket, {
          type: 'error',
          message: err instanceof Error ? err.message : '메시지를 보내지 못했습니다.',
        });
      }
      return;
    }
    if (data.type === 'since' && typeof data.afterId === 'number') {
      const items = await this.chatService.listAfter(matchId, data.afterId, socket.user ?? undefined);
      this.send(socket, { type: 'catchup', items });
    }
  }

  private add(matchId: number, socket: Client) {
    const set = this.rooms.get(matchId) ?? new Set<Client>();
    set.add(socket);
    this.rooms.set(matchId, set);
  }

  private remove(socket: Client) {
    const matchId = socket.matchId;
    if (!matchId) return;
    const set = this.rooms.get(matchId);
    set?.delete(socket);
    if (set && set.size === 0) this.rooms.delete(matchId);
  }

  private send(socket: Client, payload: unknown) {
    if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(payload));
  }
}

function rawDataToString(raw: WebSocket.RawData) {
  if (typeof raw === 'string') return raw;
  if (Array.isArray(raw)) return Buffer.concat(raw).toString('utf8');
  if (raw instanceof ArrayBuffer) return Buffer.from(raw).toString('utf8');
  return Buffer.from(raw).toString('utf8');
}

function cookieValue(header: string | undefined, name: string) {
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return undefined;
}

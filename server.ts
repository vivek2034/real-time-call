import express from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';

interface ConnectedUser {
  id: string;
  name: string;
  status: 'available' | 'calling' | 'ringing' | 'in_call';
  partnerId?: string;
  avatarColor: string;
  ws: WebSocket;
  isAlive: boolean;
  joinedAt: number;
}

const AVATAR_COLORS = [
  '#2563eb', // Blue
  '#7c3aed', // Purple
  '#db2777', // Pink
  '#ea580c', // Orange
  '#059669', // Emerald
  '#0891b2', // Cyan
  '#4f46e5', // Indigo
  '#d97706', // Amber
];

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server });
  const PORT = 3000;

  // Active users map: id -> ConnectedUser
  const users = new Map<string, ConnectedUser>();

  function getRandomColor(): string {
    return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
  }

  function getPublicUserList() {
    return Array.from(users.values()).map((u) => ({
      id: u.id,
      name: u.name,
      status: u.status,
      avatarColor: u.avatarColor,
      joinedAt: u.joinedAt,
    }));
  }

  function broadcastUsers() {
    const list = getPublicUserList();
    const payload = JSON.stringify({
      type: 'users_updated',
      users: list,
    });

    for (const u of users.values()) {
      if (u.ws.readyState === WebSocket.OPEN) {
        u.ws.send(payload);
      }
    }
  }

  function sendToUser(userId: string, data: any) {
    const target = users.get(userId);
    if (target && target.ws.readyState === WebSocket.OPEN) {
      target.ws.send(JSON.stringify(data));
      return true;
    }
    return false;
  }

  // WebSocket signaling & presence
  wss.on('connection', (ws: WebSocket) => {
    // Generate unique temporary id for this socket
    const clientId = `u_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    let currentUser: ConnectedUser | null = null;

    ws.on('pong', () => {
      if (currentUser) {
        currentUser.isAlive = true;
      }
    });

    ws.on('message', (raw: string) => {
      try {
        if (currentUser) {
          currentUser.isAlive = true;
        }

        const msg = JSON.parse(raw.toString());

        switch (msg.type) {
          case 'register': {
            const rawName = typeof msg.name === 'string' ? msg.name.trim() : '';
            const finalName = rawName.slice(0, 30) || `Guest ${clientId.slice(-4)}`;
            const avatarColor = msg.avatarColor || getRandomColor();

            currentUser = {
              id: clientId,
              name: finalName,
              status: 'available',
              avatarColor,
              ws,
              isAlive: true,
              joinedAt: Date.now(),
            };

            users.set(clientId, currentUser);

            // Confirm registration to client
            ws.send(
              JSON.stringify({
                type: 'registered',
                id: clientId,
                name: finalName,
                avatarColor,
                users: getPublicUserList(),
              })
            );

            // Broadcast to other clients
            broadcastUsers();
            break;
          }

          case 'call_user': {
            if (!currentUser) return;
            const targetId = msg.targetId;
            const target = users.get(targetId);

            if (!target) {
              ws.send(
                JSON.stringify({
                  type: 'call_rejected',
                  reason: 'The selected user is no longer online.',
                })
              );
              return;
            }

            if (target.status !== 'available') {
              ws.send(
                JSON.stringify({
                  type: 'call_rejected',
                  reason: `${target.name} is currently busy in another call.`,
                })
              );
              return;
            }

            // Mark caller and target
            currentUser.status = 'calling';
            currentUser.partnerId = targetId;

            target.status = 'ringing';
            target.partnerId = clientId;

            // Notify target of incoming call
            target.ws.send(
              JSON.stringify({
                type: 'incoming_call',
                fromId: clientId,
                fromName: currentUser.name,
                fromAvatarColor: currentUser.avatarColor,
              })
            );

            broadcastUsers();
            break;
          }

          case 'accept_call': {
            if (!currentUser) return;
            const callerId = msg.callerId;
            const caller = users.get(callerId);

            if (!caller || caller.partnerId !== clientId) {
              ws.send(
                JSON.stringify({
                  type: 'call_ended',
                  reason: 'Caller is no longer available.',
                })
              );
              currentUser.status = 'available';
              currentUser.partnerId = undefined;
              broadcastUsers();
              return;
            }

            // Both move to in_call
            currentUser.status = 'in_call';
            currentUser.partnerId = callerId;

            caller.status = 'in_call';
            caller.partnerId = clientId;

            // Notify caller that call was accepted
            caller.ws.send(
              JSON.stringify({
                type: 'call_accepted',
                partnerId: clientId,
                partnerName: currentUser.name,
                partnerAvatarColor: currentUser.avatarColor,
              })
            );

            // Notify target that call has started
            ws.send(
              JSON.stringify({
                type: 'call_started',
                partnerId: callerId,
                partnerName: caller.name,
                partnerAvatarColor: caller.avatarColor,
              })
            );

            broadcastUsers();
            break;
          }

          case 'cancel_call': {
            // Caller cancels while outgoing
            if (!currentUser) return;
            const partnerId = currentUser.partnerId;
            currentUser.status = 'available';
            currentUser.partnerId = undefined;

            if (partnerId) {
              const partner = users.get(partnerId);
              if (partner && partner.partnerId === clientId) {
                partner.status = 'available';
                partner.partnerId = undefined;
                partner.ws.send(
                  JSON.stringify({
                    type: 'call_ended',
                    reason: 'Call was cancelled by caller.',
                  })
                );
              }
            }

            broadcastUsers();
            break;
          }

          case 'reject_call': {
            // Target declines incoming call
            if (!currentUser) return;
            const callerId = msg.callerId || currentUser.partnerId;
            const caller = callerId ? users.get(callerId) : null;

            currentUser.status = 'available';
            currentUser.partnerId = undefined;

            if (caller && caller.partnerId === clientId) {
              caller.status = 'available';
              caller.partnerId = undefined;
              caller.ws.send(
                JSON.stringify({
                  type: 'call_rejected',
                  reason: msg.reason || `${currentUser.name} declined the call.`,
                })
              );
            }

            broadcastUsers();
            break;
          }

          case 'end_call': {
            if (!currentUser) return;
            const partnerId = currentUser.partnerId || msg.partnerId;

            currentUser.status = 'available';
            currentUser.partnerId = undefined;

            if (partnerId) {
              const partner = users.get(partnerId);
              if (partner && partner.partnerId === clientId) {
                partner.status = 'available';
                partner.partnerId = undefined;
                partner.ws.send(
                  JSON.stringify({
                    type: 'call_ended',
                    reason: `${currentUser.name} ended the call.`,
                  })
                );
              }
            }

            broadcastUsers();
            break;
          }

          case 'signal': {
            // Forward WebRTC signal (offer/answer/ice candidate)
            if (!currentUser) return;
            const targetId = msg.targetId;
            if (targetId) {
              sendToUser(targetId, {
                type: 'signal',
                fromId: clientId,
                signal: msg.signal,
              });
            }
            break;
          }

          case 'ping': {
            if (currentUser) {
              currentUser.isAlive = true;
            }
            ws.send(JSON.stringify({ type: 'pong' }));
            break;
          }

          default:
            break;
        }
      } catch (err) {
        console.error('Error handling socket message:', err);
      }
    });

    ws.on('close', () => {
      if (currentUser) {
        const partnerId = currentUser.partnerId;
        if (partnerId) {
          const partner = users.get(partnerId);
          if (partner && partner.partnerId === clientId) {
            partner.status = 'available';
            partner.partnerId = undefined;
            partner.ws.send(
              JSON.stringify({
                type: 'call_ended',
                reason: `${currentUser.name} disconnected.`,
              })
            );
          }
        }
        users.delete(clientId);
        broadcastUsers();
      }
    });

    ws.on('error', (err) => {
      console.warn('Socket error on client', clientId, err);
    });
  });

  // Heartbeat ping interval to clean dead connections
  const interval = setInterval(() => {
    for (const [id, u] of users.entries()) {
      if (!u.isAlive) {
        u.ws.terminate();
        users.delete(id);
        continue;
      }
      u.isAlive = false;
      if (u.ws.readyState === WebSocket.OPEN) {
        u.ws.ping();
      }
    }
  }, 30000);

  wss.on('close', () => {
    clearInterval(interval);
  });

  // API routes
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', onlineCount: users.size });
  });

  app.get('/api/users', (_req, res) => {
    res.json({ users: getPublicUserList() });
  });

  // Vite middleware in dev or static serving in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Audio call server running on http://0.0.0.0:${PORT}`);
  });

  const shutdown = () => {
    server.close(() => {
      process.exit(0);
    });
    // Force close after 5s if still hanging
    setTimeout(() => process.exit(0), 5000).unref();
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

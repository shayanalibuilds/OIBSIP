import { io, type Socket } from 'socket.io-client';
import { api } from './api';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (socket) return socket;
  socket = io(api.base, {
    transports: ['websocket'],
    autoConnect: true,
    withCredentials: true,
  });
  return socket;
}

export function authSocket(payload: { userId?: string; role?: string }) {
  const s = getSocket();
  s.emit('auth', payload);
}

export function onOrderStatusChanged(cb: (p: { orderId: string; status: string; userId: string }) => void): () => void {
  const s = getSocket();
  s.on('order:status', cb);
  return () => {
    s.off('order:status', cb);
  };
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';

let socket: Socket | null = null;

function getSocket(): Socket {
  if (!socket) {
    socket = io('/', {
      autoConnect: false,
      transports: ['websocket'],
    });
  }
  return socket;
}

export function useSocket() {
  const socketRef = useRef(getSocket());

  useEffect(() => {
    const s = socketRef.current;
    const token = localStorage.getItem('accessToken');
    if (token && !s.connected) {
      s.auth = { token };
      s.connect();
    }

    return () => {
      // Don't disconnect on unmount — keep alive across navigations
    };
  }, []);

  return socketRef.current;
}

export function useUserSocket(userId: string | undefined) {
  const socket = useSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const handleConnect = () => {
      socket.emit('joinUser', { userId });
    };

    if (socket.connected) {
      socket.emit('joinUser', { userId });
    }
    socket.on('connect', handleConnect);

    const handleNotification = () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    };

    socket.on('notification', handleNotification);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('notification', handleNotification);
    };
  }, [userId, socket, queryClient]);

  return socket;
}

export function useBoardSocket(boardId: string | undefined) {
  const socket = useSocket();
  const queryClient = useQueryClient();

  const joinBoard = useCallback(() => {
    if (boardId && socket.connected) {
      socket.emit('joinBoard', { boardId });
    }
  }, [boardId, socket]);

  const leaveBoard = useCallback(() => {
    if (boardId && socket.connected) {
      socket.emit('leaveBoard', { boardId });
    }
  }, [boardId, socket]);

  useEffect(() => {
    if (!boardId) return;

    const handleConnect = () => {
      socket.emit('joinBoard', { boardId });
    };

    if (socket.connected) {
      socket.emit('joinBoard', { boardId });
    }
    socket.on('connect', handleConnect);

    const invalidateCards = () => {
      queryClient.invalidateQueries({ queryKey: ['cards', boardId] });
    };

    const invalidateColumns = () => {
      queryClient.invalidateQueries({ queryKey: ['columns', boardId] });
    };

    const invalidateSwimlanes = () => {
      queryClient.invalidateQueries({ queryKey: ['swimlanes', boardId] });
    };

    socket.on('cardCreated', invalidateCards);
    socket.on('cardUpdated', invalidateCards);
    socket.on('cardMoved', invalidateCards);
    socket.on('cardArchived', invalidateCards);
    socket.on('columnCreated', invalidateColumns);
    socket.on('columnUpdated', invalidateColumns);
    socket.on('columnMoved', invalidateColumns);
    socket.on('swimlaneCreated', invalidateSwimlanes);
    socket.on('swimlaneUpdated', invalidateSwimlanes);
    socket.on('swimlaneMoved', invalidateSwimlanes);
    socket.on('attachmentAdded', invalidateCards);
    socket.on('attachmentRemoved', invalidateCards);

    return () => {
      socket.emit('leaveBoard', { boardId });
      socket.off('connect', handleConnect);
      socket.off('cardCreated', invalidateCards);
      socket.off('cardUpdated', invalidateCards);
      socket.off('cardMoved', invalidateCards);
      socket.off('cardArchived', invalidateCards);
      socket.off('columnCreated', invalidateColumns);
      socket.off('columnUpdated', invalidateColumns);
      socket.off('columnMoved', invalidateColumns);
      socket.off('swimlaneCreated', invalidateSwimlanes);
      socket.off('swimlaneUpdated', invalidateSwimlanes);
      socket.off('swimlaneMoved', invalidateSwimlanes);
      socket.off('attachmentAdded', invalidateCards);
      socket.off('attachmentRemoved', invalidateCards);
    };
  }, [boardId, socket, queryClient]);

  return { socket, joinBoard, leaveBoard };
}

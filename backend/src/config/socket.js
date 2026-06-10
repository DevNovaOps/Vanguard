import { Server } from 'socket.io';

let io = null;

/**
 * Initialize Socket.IO server
 * @param {object} server - HTTP Server instance
 */
export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log(`[SOCKET] Client connected: ${socket.id}`);

    socket.on('disconnect', () => {
      console.log(`[SOCKET] Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

/**
 * Get active Socket.IO server instance
 * @returns {Server}
 */
export const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO is not initialized yet');
  }
  return io;
};

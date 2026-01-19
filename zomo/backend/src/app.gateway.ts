import {
  WebSocketGateway,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
  SubscribeMessage
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { SocketService } from './socket-io/socket.service';

@WebSocketGateway({ cors: true })  // Enable CORS for development
export class AppGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private connectedClients = new Map<string, Socket>(); // Store clientId to Socket mapping
  private logger: Logger = new Logger('AppGateway');

  @WebSocketServer() public server: Server;
  constructor(private readonly socketService: SocketService) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket server initialized');
    server['connectedClients'] = this.connectedClients;
    this.socketService.setServer(server);
  }

  handleConnection(client: Socket) {
    const clientId = client.handshake.query.user_id as string; // Get user_id from query

    if (!clientId) {
      this.logger.warn('Client connected without a clientId, disconnecting...');
      client.disconnect();
      return;
    }

    if (this.connectedClients.has(clientId)) {
      this.logger.warn(`Client already connected: ${clientId}`);
      this.connectedClients.delete(clientId);
      client.disconnect();
    } else {
      this.connectedClients.set(clientId, client); // Store the socket with its associated clientId
        this.socketService.setClientId(clientId, client);
      client.data.clientId = clientId;
      client.emit('connected', { clientId, socketId: client.id });
      this.logger.log(`Client connected: ${clientId}`);
    }
  }

  handleDisconnect(client: Socket) {
    const clientId = Array.from(this.connectedClients.entries())
      .find(([id, socket]) => socket.id === client.id)?.[0];

    if (clientId) {
      this.connectedClients.delete(clientId);
      this.logger.log(`Client disconnected: ${clientId}`);
    }
  }

  @SubscribeMessage('chatMessage')
  handleChatMessage(client: Socket, payload: { message: string; sender: string }) {
    // Ensure payload is valid
    if (!payload.message || !payload.sender) {
      this.logger.warn('Invalid message received', payload);
      return;
    }

    this.logger.log(`Message received from ${payload.sender}: ${payload.message}`);
    // Broadcast the message to all connected clients
    this.server.emit('chatMessage', payload);
  }

  @SubscribeMessage('checkUserStatus')
  checkUserStatus(client: Socket, payload: { userId: string; sender: string }) {
    if (!payload.userId || !payload.sender) {
      this.logger.warn('Invalid message received', payload);
      return;
    }
    let response = [];
    const userIds = payload.userId.split(',').map(id => id.trim());
    for (const userId of userIds) {
      const isConnected = this.connectedClients.has(userId);
      response.push({ userId, isConnected });
    }
    client.emit('checkUserStatus', response);
  }
}

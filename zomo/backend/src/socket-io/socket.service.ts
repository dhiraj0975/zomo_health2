import { Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
@Injectable()
export class SocketService {
  private socket: Server = null;
  // Method to set the Socket.IO server instance
  public setServer(server: Server): void {
    this.socket = server;
  }
  // Method to get a specific client socket using userId
  public getClientSocket(userId: string): Socket | undefined {
    return this.socket?.sockets.sockets.get(userId);
  }
  public getClientId(userId: string): Socket | undefined {
    return this.socket?.sockets.sockets.get(userId);
  }
  public setClientId(userId: string, socket: Socket): void {
    this.socket?.sockets.sockets.set(userId, socket);
  }
  public broadcast(event: string, data: any): void {
    if (this.socket) {
      this.socket.emit(event, data);
    }
  }
  // Method to send a message to a specific client
  public sendToClient(userId: string, event: string, data: any): void {
    if (this.socket) {
      const client = this.getClientSocket(userId);
      if (client) {
        client.emit(event, data);
      } else {
        console.warn(`No socket found for userId: ${userId}`);
      }
    }
  }
}

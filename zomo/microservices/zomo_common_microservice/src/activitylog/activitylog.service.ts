import { Inject, Injectable } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { lastValueFrom } from "rxjs";
@Injectable()
export class ActivityLogService {
    constructor(
        @Inject('ACTIVITYLOG_SERVICE')
        private client: ClientProxy,
    ) {
    }
    async error_log(sender_email: string = '',payload: any = '',message: any = '', log: any = '', attachment: any = ''): Promise<void> {
        try {
            await lastValueFrom(this.client.send({cmd: 'email_log'}, {sender_email: sender_email,payload: payload, message: JSON.stringify(message), log: `${JSON.stringify(log?.stack)} query: ${JSON.stringify(log?.query)}`, attachment: JSON.stringify(attachment) }));
        } catch (error) {
            console.error('Error occurred in ActivityLogService:', error);
        }
    }
}
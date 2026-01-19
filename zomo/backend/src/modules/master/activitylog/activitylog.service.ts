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
    async create(data: any, updatedData: any, table_name: string, user_id: number, event: string = 'update'): Promise<void> {
        try {
            let updatedValues = JSON.parse(JSON.stringify(updatedData));
            delete updatedValues?.id;
            delete updatedValues?.updated_by;
            delete updatedValues?.created_by;
            delete updatedValues?.modified_by;
            delete updatedValues?.added_by;
            await lastValueFrom(this.client.send({cmd: 'create_log'}, {id: data?.id, data: data, updatedData: updatedValues, event: event, table_name: table_name, remark: '', user_id: user_id }));
        } catch (error) {
            console.error('Error occurred in ActivityLogService:', error);
        }
    }
    async error_log(user_id: number = 0,endPoint: any = '',message: any = '', log: any = '', req: any = ''): Promise<void> {
        try {
            const filteredRequest = {
                file: req?.file,
                tokenUser: req?.tokenUser,
                route: req?.route,
                body: req?.body
            };
            await lastValueFrom(this.client.send({cmd: 'error_log'}, {user_id: user_id,end_point: endPoint, message: JSON.stringify(message), log: `${JSON.stringify(log?.stack)} query: ${JSON.stringify(log?.query)}`, req: JSON.stringify(filteredRequest) }));
        } catch (error) {
            console.error('Error occurred in ActivityLogService:', error);
        }
    }
}
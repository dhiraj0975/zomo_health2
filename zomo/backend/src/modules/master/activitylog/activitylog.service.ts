import { Inject, Injectable } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import pLimit from 'p-limit';
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
            return
        } catch (error) {
            console.error('Error occurred in ActivityLogService:', error);
            return
        }
    }
    
    async createMultiple(dataList: any, updatedData: any, table_name: string, user_id: number, event: string = 'update'): Promise<void> {
        try {
            let batchSize = 50;
            let concurrency = 4;
            let updatedValues = JSON.parse(JSON.stringify(updatedData));
            delete updatedValues?.id;
            delete updatedValues?.updated_by;
            delete updatedValues?.created_by;
            delete updatedValues?.modified_by;
            delete updatedValues?.added_by;
            const limit = pLimit(concurrency);
            setImmediate(() => {
                for (let i = 0; i < dataList.length; i += batchSize) {
                    const batch = dataList.slice(i, i + batchSize);
                    let batchData = batch.map(data => {
                        return {id: data?.id, data: data, updatedData: updatedValues, event: event, table_name: table_name, remark: '', user_id: user_id }
                    });
                    limit(() =>
                        lastValueFrom(this.client.send({cmd: 'create_multiple_log'}, batchData))
                    .catch(err => console.error(`Error creating log`, err))
                    );
                }
            });
            return
        } catch (error) {
            console.error('Error occurred in ActivityLogService:', error);
            return
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
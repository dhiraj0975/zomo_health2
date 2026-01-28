import { appConstant, CommonArrayService } from '@common-constants';
import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { EmailLogService } from './module/emaillog';
import { ErrorLogService } from './module/errorlog';
const BATCH_SIZE = 900;

@Injectable()
export class AppService {
    private readonly logger = new Logger(AppService.name);

    constructor(
        @InjectDataSource(appConstant.MAIN.toLowerCase())
        private readonly dataSource: DataSource,
        private readonly commonArrayService: CommonArrayService,
        private readonly errorLogService: ErrorLogService,
        private readonly emailLogService: EmailLogService,
    ) {}

    async create(data: any) {
        try {
            const targetTable = this.getAuditTableName(data.table_name);

            const changes = this.commonArrayService.compareObjects(data.data,data.updatedData);

            if (!changes || changes.length === 0) return true;

            const remark = data?.updatedData?.remark || '';
            const logEntries = changes.map((element) => ({
                reference_id: data.id,
                event: data.event || 'update',
                table_name: data.table_name,
                field: element.field,
                instring: element.instring,
                outstring: element.outstring,
                remark: remark,
                created_by: data.user_id,
            }));
            await this.insertInChunks(targetTable, logEntries);

            return true;
        } catch (error) {
            this.logger.error(`Audit failed for ${data.table_name}`, error.stack);
            return false;
        }
    }


    async createMultiple(dataList: any[]) {
        if (!dataList || dataList.length === 0) return true;

        for (const data of dataList) {
            try {
                await this.create(data);
            } catch (error) {
                const errorPayload = {
                    user_id: 0,
                    end_point: 'createMultiple',
                    message: error.message,
                    log: JSON.stringify(error),
                    req: JSON.stringify(data) 
                };
                await this.error_log(errorPayload);
                return
            }
        }
        return true;
    }

    private async insertInChunks(tableName: string, records: any[]) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            for (let i = 0; i < records.length; i += BATCH_SIZE) {
                const chunk = records.slice(i, i + BATCH_SIZE);

                await queryRunner.manager
                    .createQueryBuilder()
                    .insert()
                    .into(tableName)
                    .values(chunk)
                    .execute();
            }
            await queryRunner.commitTransaction();
            return
        } 
        catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } 
        finally {
            await queryRunner.release();
            return
        }
    }

    private getAuditTableName(sourceName: string): string {
        if (appConstant.TABLES[sourceName]) {
            return appConstant.TABLES[sourceName];
        }
        return appConstant.TABLES['default'];
    }


    async error_log(data: any) {
        try {
            if (data) await this.errorLogService.create(data);
        } catch (e) { console.error('Critical: Error logging failed', e); }
    }

    async email_log(data: any) {
        try {
            if (data) await this.emailLogService.create(data);
        } catch (e) { console.error('Critical: Email logging failed', e); }
    }
}
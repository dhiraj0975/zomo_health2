import {
    appConstant,
    BaseService,
    CommonArrayService,
    CommonFileService,
    RequestEventReportsEntity,
    tableConstant,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class RequestEventReportsService extends BaseService<RequestEventReportsEntity> {
    constructor(
        @InjectRepository(
            RequestEventReportsEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaEventRequestReportsRepository: Repository<RequestEventReportsEntity>,
        @InjectRepository(
            RequestEventReportsEntity,
            appConstant.MAIN.toLowerCase(),
        )
        private readonly writeReplicaEventRequestReportsRepository: Repository<RequestEventReportsEntity>,
        commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {
        super(
            readReplicaEventRequestReportsRepository,
            writeReplicaEventRequestReportsRepository,
            'eventreport',
            commonArrayService,
        );
    }
    async findOne(
        condition: any,
        orderBy: any = null,
        fields: any[] = ['eventreport'],
    ) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        let queryResult = await this.readReplicaEventRequestReportsRepository
            .createQueryBuilder('eventreport')
            .leftJoinAndMapOne(
                'eventreport.company',
                tableConstant.COMPANIES.TBL_COMPANY,
                'company',
                `company.id = eventreport.org_id`,
            )
            .where(condition)
            .select(fields)
            .orderBy(
                `eventreport.${Object.keys(orderBy)[0]}`,
                orderBy[Object.keys(orderBy)[0]],
            )
            .getOne();
        return queryResult;
    }
    async findWithAutoSetting(condition: any, fields: any = null) {
        const queryBuilder = this.readReplicaEventRequestReportsRepository
            .createQueryBuilder('event')
            .innerJoinAndMapOne(
                'event.automaticreportSetting',
                tableConstant.REPORT.TBL_AU_AUTO_REPORT_SETTINGS,
                'automaticreportSetting',
                `automaticreportSetting.id = event.report_setting_id`,
            )
            .where(condition);
        if (fields !== null) {
            queryBuilder.select(fields);
        }
        const result = await queryBuilder.getMany();
        return result;
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'ASC' };
        }
        const queryBuilder = this.readReplicaEventRequestReportsRepository
            .createQueryBuilder('event')
            .where(condition)
            .orderBy(orderBy);
        const result = await queryBuilder.getMany();
        return result;
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(
            data,
            this.writeReplicaEventRequestReportsRepository.metadata,
        );
        if (data.auto_report_zip_password) {
            const entityToUpdate = new RequestEventReportsEntity();
            Object.assign(entityToUpdate, data);
            await entityToUpdate.hashPassword();
            data.auto_report_zip_password =
                entityToUpdate.auto_report_zip_password;
        }
        return await this.writeReplicaEventRequestReportsRepository
            .createQueryBuilder('incentivereports')
            .update(RequestEventReportsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async save(data: any) {
        const savedResult = this.writeReplicaEventRequestReportsRepository.create(data);
        return await this.writeReplicaEventRequestReportsRepository.save(savedResult);
    }
}

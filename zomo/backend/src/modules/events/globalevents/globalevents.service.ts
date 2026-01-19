import { appConstant, CommonFileService, EventGlobalEventsEntity, tableConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class EventGlobalEventsService {
    constructor(
        @InjectRepository(EventGlobalEventsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaEventGlobalEventsRepository: Repository<EventGlobalEventsEntity>,
        @InjectRepository(EventGlobalEventsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaEventGlobalEventsRepository: Repository<EventGlobalEventsEntity>,
        private readonly commonFileService: CommonFileService,
    ) {}
    async save(data: any) {
        const savedResult = this.writeReplicaEventGlobalEventsRepository.create(data);
        return await this.writeReplicaEventGlobalEventsRepository.insert(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaEventGlobalEventsRepository.metadata);
        return await this.writeReplicaEventGlobalEventsRepository.createQueryBuilder('e_global')
            .update(EventGlobalEventsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async listRecord(fields: any, condition: any, orderBy: any = null,tableData: any[] = []) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        let queryResult: any = await this.readReplicaEventGlobalEventsRepository.createQueryBuilder('ge')
        if (tableData.includes(tableConstant.COMPANIES.TBL_COMPANY)) {
            queryResult = queryResult.leftJoinAndMapOne(
                'ge.company',
                tableConstant.COMPANIES.TBL_COMPANY,
                'company',
                `ge.organization_id = company.id`,
            )
        }
        if (tableData.includes(tableConstant.EVENTS.TBL_EV_EVENTS)) {
            queryResult = queryResult.leftJoinAndMapOne(
                'ge.ev',
                tableConstant.EVENTS.TBL_EV_EVENTS,
                'ev',
                `ge.event_id = ev.id`,
            )
        }
        queryResult = await queryResult.select(fields).where(condition)
            .orderBy(`ge.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
            .getMany();
        return queryResult;
    }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaEventGlobalEventsRepository.findOne({
            where: condition,
            order: orderBy,
        });
    }
    async delete(condition: any){
        await this.writeReplicaEventGlobalEventsRepository.delete(condition);
    }
    async globalEventIds(fields: any, condition: any) {
        return await this.readReplicaEventGlobalEventsRepository.find({
            select: fields,
            where: condition,
        });
    }
    async checkGlobalEvent(event_id: number, org_id: number): Promise<boolean> {
        try {
            const count = await this.readReplicaEventGlobalEventsRepository.count({
                where: {
                    event_id: event_id,
                    organization_id: org_id,
                    status: 1
                }
            });
            return count > 0;
        } catch (error) {
            throw new Error(error.message);
        }
    }
}

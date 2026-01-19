import { appConstant, CommonArrayService, CommonFileService, EventRemindersEntity } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginateWithCompanyInput } from "../../../input";
@Injectable()
export class EventRemindersService {
    constructor(
        @InjectRepository(EventRemindersEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaEventRemindersRepository: Repository<EventRemindersEntity>,
        @InjectRepository(EventRemindersEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaEventRemindersRepository: Repository<EventRemindersEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {}
    async paginateList(condition: any, paginationParam: PaginateWithCompanyInput) {
        const paginateObj = this.commonArrayService.getPaginationVar(
            paginationParam.page || 1,
            paginationParam.limit,
        );
        const order =
            paginationParam && paginationParam.order
                ? paginationParam.order
                : 'DESC';
        const orderBy =
            paginationParam && paginationParam.order_by
                ? paginationParam.order_by
                : 'e_reminders.created';
        var queryResult = await this.readReplicaEventRemindersRepository.createQueryBuilder('e_reminders')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async save(data: any) {
        const savedResult = this.writeReplicaEventRemindersRepository.create(data);
        return await this.writeReplicaEventRemindersRepository.insert(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaEventRemindersRepository.metadata);
        return await this.writeReplicaEventRemindersRepository.createQueryBuilder('e_reminders')
            .update(EventRemindersEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaEventRemindersRepository.delete(condition);
    }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaEventRemindersRepository.findOne({
            where: condition,
            order: orderBy,
        });
    }
}

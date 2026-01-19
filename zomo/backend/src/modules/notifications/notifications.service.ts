import { PaginateInput } from '@/input';
import { appConstant, CommonArrayService, CommonFileService, UserNotificationEntity } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
@Injectable()
export class NotificationsService {
    constructor(
        @InjectRepository(UserNotificationEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaNotificationsRepository: Repository<UserNotificationEntity>,
        @InjectRepository(UserNotificationEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaNotificationsRepository: Repository<UserNotificationEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {}
    async paginateList(condition: any, paginationParam: PaginateInput) {
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
                : 'notifications.added_date';
        const queryResult = await this.readReplicaNotificationsRepository.createQueryBuilder('notifications')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaNotificationsRepository.metadata);
        return await this.writeReplicaNotificationsRepository.createQueryBuilder('notifications')
            .update(UserNotificationEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async save(data: any) {
        const savedResult = this.writeReplicaNotificationsRepository.create(data);
        return await this.writeReplicaNotificationsRepository.save(savedResult);
    }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.writeReplicaNotificationsRepository.createQueryBuilder('notifications')
        .where(condition)
        .orderBy(`notifications.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
        .getOne();
    }
    async listRecord(fields: any = ['notifications'], condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.writeReplicaNotificationsRepository.createQueryBuilder('notifications')
        .where(condition)
        .select(fields)
        .orderBy(`notifications.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
        .getMany();
    }
    async delete(condition) {
        await this.writeReplicaNotificationsRepository.delete(condition);
    }

    async removeEntry(condition: any) {
        let record = await this.writeReplicaNotificationsRepository.createQueryBuilder('notifications')
        .where(condition)
        .getMany();
        if(record.length){
            // await this.writeReplicaNotificationsRepository.delete({id: In(record.map(ele => ele.id))});
            await this.writeReplicaNotificationsRepository.update({id: In(record.map(ele => ele.id))},{status : 2});
        }
    }
}

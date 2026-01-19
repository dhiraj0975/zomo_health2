import { appConstant, CommonArrayService, CommonFileService, HealthUsersActivityEntity, tableConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PaginateWithChallengeInput } from 'src/input';
import { Repository } from 'typeorm';
@Injectable()
export class HealthUsersActivityService {
    constructor(
        @InjectRepository(HealthUsersActivityEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaHealthUsersActivityRepository: Repository<HealthUsersActivityEntity>,
        @InjectRepository(HealthUsersActivityEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaHealthUsersActivityRepository: Repository<HealthUsersActivityEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {}
    async paginateList(condition: any, paginationParam: PaginateWithChallengeInput) {
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
                ? `hua.${paginationParam.order_by}`
                : 'hua.created';
        let queryResult = await this.readReplicaHealthUsersActivityRepository.createQueryBuilder('hua')
        .leftJoinAndMapOne(
            'hua.health_activity',
            tableConstant.CHALLENGE.TBL_CH_HEALTH_ACTIVITY,
            'health_activity',
            `health_activity.id = hua.act_id AND health_activity.status = 1`,
          )
        .leftJoinAndMapOne(
            'hua.user',
            tableConstant.TBL_USERS,
            'user',
            `user.id = hua.user_id AND user.status = 1`,
          )
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async save(data: any) {
        const savedResult = this.writeReplicaHealthUsersActivityRepository.create(data);
        return await this.writeReplicaHealthUsersActivityRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaHealthUsersActivityRepository.metadata);
        return await this.writeReplicaHealthUsersActivityRepository.createQueryBuilder('hua')
            .update(HealthUsersActivityEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaHealthUsersActivityRepository.delete(condition);
    }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaHealthUsersActivityRepository.findOne({
            where: condition,
            order: orderBy,
        });
    }
    async listRecord(condition: any, orderBy: any = null, fields: any = ['hua'], groupBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        let query = this.readReplicaHealthUsersActivityRepository.createQueryBuilder('hua')
        .leftJoinAndMapOne(
            'hua.health_activity',
            tableConstant.CHALLENGE.TBL_CH_HEALTH_ACTIVITY,
            'health_activity',
            `health_activity.id = hua.act_id AND health_activity.status = 1`,
        )
        .where(condition)
        .select(fields);
        if(groupBy){
            query = query
            .groupBy(groupBy)
            .orderBy(`hua.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]]);
            return await query.getRawMany();
        }
        return await query
        .where(condition)
        .select(fields)
        .getMany();
    }
}

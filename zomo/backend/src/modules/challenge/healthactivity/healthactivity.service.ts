import { appConstant, CommonArrayService, CommonFileService, HealthActivityEntity } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PaginateWithChallengeInput } from 'src/input';
import { Repository } from 'typeorm';
@Injectable()
export class HealthActivityService {
    constructor(
        @InjectRepository(HealthActivityEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaHealthActivityRepository: Repository<HealthActivityEntity>,
        @InjectRepository(HealthActivityEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaHealthActivityRepository: Repository<HealthActivityEntity>,
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
                ? paginationParam.order_by
                : 'ha.created';
        let queryResult = await this.readReplicaHealthActivityRepository.createQueryBuilder('ha')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async save(data: any) {
        const savedResult = this.writeReplicaHealthActivityRepository.create(data);
        return await this.writeReplicaHealthActivityRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaHealthActivityRepository.metadata);
        return await this.writeReplicaHealthActivityRepository.createQueryBuilder('ha')
            .update(HealthActivityEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaHealthActivityRepository.delete(condition);
    }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaHealthActivityRepository.findOne({
            where: condition,
            order: orderBy,
        });
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaHealthActivityRepository.find({
            where: condition,
            order: orderBy,
        });
    }
}

import { AgeGroupEntity, appConstant, CommonArrayService, CommonFileService } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginateWithCompanyInput } from "../../../input";
@Injectable()
export class AgeGroupService {
    constructor(
        @InjectRepository(AgeGroupEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaAgeGroupRepository: Repository<AgeGroupEntity>,
        @InjectRepository(AgeGroupEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaAgeGroupRepository: Repository<AgeGroupEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) { }
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
                : 'agegroup.created';
        var queryResult = await this.readReplicaAgeGroupRepository.createQueryBuilder('agegroup')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async save(data: any) {
        const savedResult = this.writeReplicaAgeGroupRepository.create(data);
        return await this.writeReplicaAgeGroupRepository.save(savedResult);
    }
    async delete(condition: any) {
        await this.writeReplicaAgeGroupRepository.delete(condition);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaAgeGroupRepository.metadata);
        return await this.writeReplicaAgeGroupRepository.createQueryBuilder('agegroup')
            .update(AgeGroupEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaAgeGroupRepository.findOne({
            where: condition,
            order: orderBy,
        });
    }
    async listRecord(condition: any, fields: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'ASC' };
        }
        return await this.readReplicaAgeGroupRepository.createQueryBuilder('agegroup')
            .where(condition)
            .select(fields)
            .orderBy(`agegroup.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
            .getMany();
    }
    async createUpdate(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.readReplicaAgeGroupRepository.metadata);
        let recordDetails = await this.readReplicaAgeGroupRepository.findOne({ where: condition });
        if (recordDetails) {
            await this.writeReplicaAgeGroupRepository.update(condition, data);
            return { ...recordDetails, update: 1 };
        } else {
            return await this.writeReplicaAgeGroupRepository.save(data);
        }
    }
    async getAgeGroup(condition: any) {
        let gender = 'f';
        let queryData =  this.readReplicaAgeGroupRepository.createQueryBuilder("agegroup")
        .where(condition);
        return await queryData.getMany();
    }
}
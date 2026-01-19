import { AgeActivityEntity, appConstant, CommonArrayService, CommonFileService } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PaginateWithCompanyInput } from 'src/module/company/input/paginateWithCompany.input';
import { Repository } from 'typeorm';
@Injectable()
export class AgeActivityService {
    constructor(
        @InjectRepository(AgeActivityEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaAgeActivityRepository: Repository<AgeActivityEntity>,
        @InjectRepository(AgeActivityEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaAgeActivityRepository: Repository<AgeActivityEntity>,
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
                : 'ageactivity.created';
        var queryResult = await this.readReplicaAgeActivityRepository.createQueryBuilder('ageactivity')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async save(data: any) {
        const savedResult = this.writeReplicaAgeActivityRepository.create(data);
        return await this.writeReplicaAgeActivityRepository.save(savedResult);
    }
    async delete(condition: any) {
        await this.writeReplicaAgeActivityRepository.delete(condition);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaAgeActivityRepository.metadata);
        return await this.writeReplicaAgeActivityRepository.createQueryBuilder('ageactivity')
            .update(AgeActivityEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaAgeActivityRepository.findOne({
            where: condition,
            order: orderBy,
        });
    }
    async listRecord(condition: any, fields: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'ASC' };
        }
        return await this.readReplicaAgeActivityRepository.createQueryBuilder('ageactivity')
            .where(condition)
            .select(fields)
            .orderBy(`ageactivity.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
            .getMany();
    }
    async createUpdate(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.readReplicaAgeActivityRepository.metadata);
        let recordDetails = await this.readReplicaAgeActivityRepository.findOne({ where: condition });
        if (recordDetails) {
            await this.writeReplicaAgeActivityRepository.update(condition, data);
            return { ...recordDetails, update: 1 };
        } else {
            return await this.writeReplicaAgeActivityRepository.save(data);
        }
    }
    async getAgeActivityIds(condition: any) {
        let queryData:any =  this.readReplicaAgeActivityRepository.createQueryBuilder("ageactivity")
        .where(condition);
        queryData = await queryData.getMany();
        const sortedUniqueIds = Array.from(new Set(
            queryData.flatMap(a => [Number(a.ref_activity_id), Number(a.common_activity_id)])
          )).sort((a:any, b:any) => a - b);
        return sortedUniqueIds;
    }
}
import { appConstant, CommonArrayService, CommonFileService, UcaSettingEntity } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository, UpdateResult } from 'typeorm';
import { PaginateWithCompanyInput } from "../../../input";
@Injectable()
export class SettingService {
    constructor(
        @InjectRepository(UcaSettingEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaUcaSettingRepository: Repository<UcaSettingEntity>,
        @InjectRepository(UcaSettingEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaUcaSettingRepository: Repository<UcaSettingEntity>,
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
                : 'setting.created';
        var queryResult = await this.readReplicaUcaSettingRepository.createQueryBuilder('setting')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async save(data: Partial<UcaSettingEntity>): Promise<UcaSettingEntity> {
        const savedResult = this.writeReplicaUcaSettingRepository.create(data);
        return await this.writeReplicaUcaSettingRepository.save(savedResult);
    }
    async update(condition: object | string, data: Partial<UcaSettingEntity>): Promise<UpdateResult> {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaUcaSettingRepository.metadata);
        return await this.writeReplicaUcaSettingRepository.createQueryBuilder('setting')
            .update(UcaSettingEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaUcaSettingRepository.delete(condition);
    }
    async findOne(condition: FindOptionsWhere<UcaSettingEntity>, orderBy: any = null): Promise<UcaSettingEntity> {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaUcaSettingRepository.findOne({
            where: condition,
            order: orderBy,
        });
    }
    async listRecord(fields: any, condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaUcaSettingRepository.find({
            select: fields,
            where: condition,
            order: orderBy,
        });
    }
}

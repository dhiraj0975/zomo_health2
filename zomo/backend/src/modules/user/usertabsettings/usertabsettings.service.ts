import { appConstant, CommonArrayService, CommonFileService, UserTabSettingsEntity } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginateInput } from "../../../input";
@Injectable()
export class UserTabSettingsService {
    constructor(
        @InjectRepository(UserTabSettingsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaUserTabSettingsRepository: Repository<UserTabSettingsEntity>,
        @InjectRepository(UserTabSettingsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaUserTabSettingsRepository: Repository<UserTabSettingsEntity>,
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
                : 'userTabSettings.created';
        const queryResult = await this.readReplicaUserTabSettingsRepository.createQueryBuilder('userTabSettings')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async save(data: any) {
        const savedResult = this.writeReplicaUserTabSettingsRepository.create(data);
        return await this.writeReplicaUserTabSettingsRepository.save(savedResult);
    }
    async delete(condition: any) {
        await this.writeReplicaUserTabSettingsRepository.delete(condition);
    }
    async findOne(condition: any, orderBy = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaUserTabSettingsRepository.findOne({
            where: condition,
            order: orderBy,
        });
    }
    async listRecord(condition: any, orderBy = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaUserTabSettingsRepository.createQueryBuilder('userTabSettings')
        .where(condition)
        .orderBy(`userTabSettings.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
        .getMany();
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaUserTabSettingsRepository.metadata);
        return await this.writeReplicaUserTabSettingsRepository.createQueryBuilder('userTabSettings')
            .update(UserTabSettingsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
}

import { appConstant, CommonArrayService, CommonFileService, tableConstant, UserSettingsEntity } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsSelect, FindOptionsWhere, Repository } from 'typeorm';
import { PaginateInput } from "../../../input";
@Injectable()
export class UserSettingsService {
    constructor(
        @InjectRepository(UserSettingsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaUserSettingsRepository: Repository<UserSettingsEntity>,
        @InjectRepository(UserSettingsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaUserSettingsRepository: Repository<UserSettingsEntity>,
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
                : 'userSettings.created';
        const queryResult = await this.readReplicaUserSettingsRepository.createQueryBuilder('userSettings')
            .leftJoinAndMapOne(
                'userSettings.user',
                tableConstant.TBL_USERS,
                'user',
                `user.id = userSettings.user_id`,
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
        const savedResult = this.writeReplicaUserSettingsRepository.create(data);
        return await this.writeReplicaUserSettingsRepository.save(savedResult);
    }
    async delete(condition: any) {
        await this.writeReplicaUserSettingsRepository.delete(condition);
    }
    async findOne(condition: any, orderBy = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaUserSettingsRepository.findOne({
            where: condition,
            order: orderBy,
        });
    }
    async findOneUserSetting(condition: FindOptionsWhere<UserSettingsEntity>, field: FindOptionsSelect<UserSettingsEntity>) {
        return await this.readReplicaUserSettingsRepository.findOne({
            where: condition,
            select: field
        });
    }
    async listRecord(condition: any, orderBy = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaUserSettingsRepository.find({
            where: condition,
            select: ['id', 'user_id', 'address', 'city', 'state', 'zip'],
            order: orderBy,
        });
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaUserSettingsRepository.metadata);
        return await this.writeReplicaUserSettingsRepository.createQueryBuilder('us')
            .update(UserSettingsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
}

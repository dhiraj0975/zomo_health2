import {
    appConstant,
    BaseService,
    CommonArrayService,
    CommonDateService,
    CommonFileService,
    CommonHealthService,
    CommonService,
    UserSettingsEntity,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class UserSettingsService extends BaseService<UserSettingsEntity> {
    constructor(
        @InjectRepository(
            UserSettingsEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaUserSettingsRepository: Repository<UserSettingsEntity>,
        @InjectRepository(UserSettingsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaUserSettingsRepository: Repository<UserSettingsEntity>,
        private readonly commonService: CommonService,
        commonArrayService: CommonArrayService,
        private readonly commonDateService: CommonDateService,
        private readonly commonFileService: CommonFileService,
        private readonly commonHealthService: CommonHealthService,
    ) {
        super(
            readReplicaUserSettingsRepository,
            writeReplicaUserSettingsRepository,
            'userSetting',
            commonArrayService,
        );
    }
    async save(data: any) {
        const savedResult =
            this.writeReplicaUserSettingsRepository.create(data);
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
        data = await this.commonFileService.filterDataByEntityColumns(
            data,
            this.writeReplicaUserSettingsRepository.metadata,
        );
        return await this.writeReplicaUserSettingsRepository
            .createQueryBuilder('us')
            .update(UserSettingsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
}

import { appConstant, CommonArrayService, CommonFileService, CovidPassportSettingsEntity } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaginateCovidPassportInput } from "../../../input";
@Injectable()
export class PassportSettingsService {
    constructor(
        @InjectRepository(CovidPassportSettingsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicapassportSettingsRepository: Repository<CovidPassportSettingsEntity>,
        @InjectRepository(CovidPassportSettingsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicapassportSettingsRepository: Repository<CovidPassportSettingsEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {
    }
    async paginateList(condition: any, paginationParam: PaginateCovidPassportInput) {
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
                : 'passportSettings.id';
        const queryResult = await this.readReplicapassportSettingsRepository.createQueryBuilder('passportSettings')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: any) {
        return await this.readReplicapassportSettingsRepository.findOne({
            where: condition,
        });
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicapassportSettingsRepository.find({
            where: condition,
            select: [],
            order: orderBy,
        });
    }
    async save(data: any) {
        const savedResult = this.writeReplicapassportSettingsRepository.create(data);
        return await this.writeReplicapassportSettingsRepository.insert(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicapassportSettingsRepository.metadata);
        return await this.writeReplicapassportSettingsRepository.createQueryBuilder('passportSettings')
            .update(CovidPassportSettingsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicapassportSettingsRepository.delete(condition);
    }
}
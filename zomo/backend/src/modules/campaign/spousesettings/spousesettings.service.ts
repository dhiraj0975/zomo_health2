import { appConstant, CommonArrayService, CommonFileService, CompaniesEntity, SpouseSettingsEntity, tableConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginateWithCampaignInput } from '../input';
@Injectable()
export class SpouseSettingsService {
    constructor(
        @InjectRepository(SpouseSettingsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaSpouseSettingsRepository: Repository<SpouseSettingsEntity>,
        @InjectRepository(SpouseSettingsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaSpouseSettingsRepository: Repository<SpouseSettingsEntity>,
        @InjectRepository(CompaniesEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicacompaniesRepository: Repository<CompaniesEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {}
    async paginateList(condition: any, paginationParam: PaginateWithCampaignInput, fields:any = ['company']) {
        const paginateObj = this.commonArrayService.getPaginationVar(
            paginationParam.page || 1,
            paginationParam.limit,
        );
        const order = paginationParam && paginationParam.order ? paginationParam.order : 'DESC';
        const orderBy = paginationParam && paginationParam.order_by ? paginationParam.order_by : 'spousesettings.id';
        const queryResult = await this.readReplicacompaniesRepository.createQueryBuilder('company')
        .leftJoinAndMapOne(
            'company.spousesettings',
            tableConstant.CAMPAIGN.TBL_IN_SPOUSE_SETTINGS,
            'spousesettings',
            `spousesettings.org_id = company.id`,
          )
            .where(condition)
            .select(fields)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: any) {
        return await this.readReplicaSpouseSettingsRepository.findOne({
            where: condition,
        });
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaSpouseSettingsRepository.find({
            where: condition,
            select: ['id', 'org_id','hide'],
            order: orderBy,
        });
    }
    async save(data: any) {
        const savedResult = this.writeReplicaSpouseSettingsRepository.create(data);
        return await this.writeReplicaSpouseSettingsRepository.insert(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaSpouseSettingsRepository.metadata);
        return await this.writeReplicaSpouseSettingsRepository.createQueryBuilder('spousesettings')
            .update(SpouseSettingsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
}

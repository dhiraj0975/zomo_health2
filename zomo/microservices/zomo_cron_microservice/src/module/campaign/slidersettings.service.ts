import { appConstant, CommonArrayService, CommonFileService, CompaniesEntity, SliderSettingsEntity, tableConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginateWithCampaignInput } from './input/paginateWithCampaign.input';
@Injectable()
export class SliderSettingsService {
    constructor(
        @InjectRepository(SliderSettingsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaSliderSettingsRepository: Repository<SliderSettingsEntity>,
        @InjectRepository(SliderSettingsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaSliderSettingsRepository: Repository<SliderSettingsEntity>,
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
        const orderBy = paginationParam && paginationParam.order_by ? paginationParam.order_by : 'company.id';
        const queryResult = await this.readReplicacompaniesRepository.createQueryBuilder('company')
        .leftJoinAndMapOne(
            'company.slidersettings',
            tableConstant.CAMPAIGN.TBL_IN_SLIDER_SETTINGS,
            'slidersettings',
            `slidersettings.org_id = company.id`,
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
        return await this.readReplicaSliderSettingsRepository.findOne({
            where: condition,
        });
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaSliderSettingsRepository.find({
            where: condition,
            select: ['id', 'org_id','activity_page_tab','dashboard_tab','hide'],
            order: orderBy,
        });
    }
    async save(data: any) {
        const savedResult = this.writeReplicaSliderSettingsRepository.create(data);
        return await this.writeReplicaSliderSettingsRepository.insert(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaSliderSettingsRepository.metadata);
        return await this.writeReplicaSliderSettingsRepository.createQueryBuilder('slidersettings')
            .update(SliderSettingsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
}

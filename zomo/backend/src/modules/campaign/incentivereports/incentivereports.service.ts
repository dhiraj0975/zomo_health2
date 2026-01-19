import {
    appConstant,
    BaseService,
    CensusCustomFieldsEntity,
    CommonArrayService,
    CommonFileService,
    CompanyReportMenuSettingsEntity,
    IncentiveReportsEntity,
    LocationsEntity,
    tableConstant
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ActivityService } from 'src/modules/activity/activity/activity.service';
import { Repository } from 'typeorm';
import { PaginateWithCampaignInput } from '../input';
@Injectable()
export class IncentiveReportsService extends BaseService<IncentiveReportsEntity> {
    constructor(
        @InjectRepository(IncentiveReportsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaIncentiveReportsRepository: Repository<IncentiveReportsEntity>,
        @InjectRepository(IncentiveReportsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaIncentiveReportsRepository: Repository<IncentiveReportsEntity>,
        @InjectRepository(CompanyReportMenuSettingsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicacompanyReportMenuSettingsRepository: Repository<CompanyReportMenuSettingsEntity>,
        @InjectRepository(LocationsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicalocationsRepository: Repository<LocationsEntity>,
        @InjectRepository(CensusCustomFieldsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicacensusCustomFieldsRepository: Repository<CensusCustomFieldsEntity>,
        commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
        private readonly activityService: ActivityService,
    ) {
        super(readReplicaIncentiveReportsRepository, writeReplicaIncentiveReportsRepository, 'incentiveReports', commonArrayService );
    }
    async paginateList(condition: any, paginationParam: PaginateWithCampaignInput) {
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
                : 'incentivereports.id';
        const queryResult = await this.readReplicaIncentiveReportsRepository.createQueryBuilder('incentivereports')
            .leftJoinAndMapOne(
                'incentivereports.company',
                tableConstant.COMPANIES.TBL_COMPANY,
                'company',
                `company.id = incentivereports.org_id AND company.status = 1`,
            )
            .leftJoinAndMapOne(
                'incentivereports.user',
                tableConstant.TBL_USERS,
                'user',
                `user.id = incentivereports.user_id AND user.status = 1`,
            )
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaIncentiveReportsRepository.findOne({
            where: condition,
            order: orderBy,
        });
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaIncentiveReportsRepository.find({
            where: condition,
            select: ['id', 'user_id', 'org_id', 'membership_code'],
            order: orderBy,
        });
    }
    async save(data: any) {
        const savedResult = this.writeReplicaIncentiveReportsRepository.create(data);
        return await this.writeReplicaIncentiveReportsRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaIncentiveReportsRepository.metadata);
        if (data.auto_report_zip_password) {
            const entityToUpdate = new IncentiveReportsEntity();
            Object.assign(entityToUpdate, data);
            await entityToUpdate.hashPassword();
            data.auto_report_zip_password = entityToUpdate.auto_report_zip_password
        }
        return await this.writeReplicaIncentiveReportsRepository.createQueryBuilder('incentivereports')
            .update(IncentiveReportsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async updateIncentiveReports() {
        return await this.writeReplicaIncentiveReportsRepository.createQueryBuilder()
            .update(IncentiveReportsEntity)
            .set({
                total_download: () => 'total_download + 1',
                status: 0,
            })
            .where({ report_type: 'FormSend' })
            .andWhere('created_date < NOW() - INTERVAL 4 HOUR')
            .andWhere('status = 2')
            .limit(1)
            .execute();
    }
    async getReportSettingMenu(condition: any) {
        return await this.readReplicacompanyReportMenuSettingsRepository.findOne({
            where: condition,
        });
    }
    async getSpecificCatActivityIds(catId:any = 0){
        let act_id_20 = await this.activityService.activityListRecord({category_id: catId, status: '1'},["id","activity_name"],{id: 'ASC'});
        let temp = Object.create(null);
        act_id_20.map(getAct => {
            temp[Number(getAct.id)] = Number(getAct.id);
        });
        if (Object.keys(temp)?.length > 0) {
            act_id_20 = temp;
            temp = Object.create(null);
        }
        let act_id_20_string = Object.keys(act_id_20).join('|');
        return act_id_20_string;
    }
    async getLocations(condition: any, fields: any = []) {
        return await this.readReplicalocationsRepository.find({
            where: condition,
            select: fields,
        });
    }
    async getCensusCustomFields(condition: any, fields: any = []) {
        return await this.readReplicacensusCustomFieldsRepository.find({
            where: condition,
            select: fields,
        });
    }
    async customQueryRun (query: string) {
        return await this.readReplicaIncentiveReportsRepository.query(query);
    }
}

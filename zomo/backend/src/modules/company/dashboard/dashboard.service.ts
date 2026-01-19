import { appConstant, CommonArrayService, CommonFileService, CompanyDashboardEntity, tableConstant } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaginateCompanyDashboardInput } from './input';
@Injectable()
export class DashboardService {
    constructor(
        @InjectRepository(CompanyDashboardEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaCompanyDashboardRepository: Repository<CompanyDashboardEntity>,
        @InjectRepository(CompanyDashboardEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaCompanyDashboardRepository: Repository<CompanyDashboardEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {
    }
    async paginateList(condition: any, paginationParam: PaginateCompanyDashboardInput) {
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
                : 'dashboard.id';
        const queryResult = await this.readReplicaCompanyDashboardRepository.createQueryBuilder('dashboard')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: any) {
        return await this.readReplicaCompanyDashboardRepository.findOne({
            where: condition,
        });
    }
    async listRecord(condition: any, orderBy: any = null, fieldfields: any = ['dashboard','language','internal_link','img_activity.id','img_activity.cust_name','campaign.campaign_name','activity.activity_name']) {
        let query = this.readReplicaCompanyDashboardRepository.createQueryBuilder('dashboard')
            .where(condition)
            .leftJoinAndMapOne(
                'dashboard.language',
                tableConstant.TBL_LANGUAGES,
                'language',
                `language.id = dashboard.imglug_id`,
              )
            .leftJoinAndMapOne(
                'dashboard.internal_link',
                tableConstant.COMPANIES.TBL_COMPANY_INTERLINKS,
                'internal_link',
                `dashboard.square_img_link_isin = 1 AND internal_link.id = dashboard.square_img_link_id`,
              )
            .leftJoinAndMapOne(
                'dashboard.img_activity',
                tableConstant.CAMPAIGN.TBL_CAMPAIGN_ACTIVITY,
                'img_activity',
                `img_activity.id = dashboard.square_img_activity`,
              )
            .leftJoinAndMapOne(
                'img_activity.campaign',
                tableConstant.CAMPAIGN.TBL_CAMPAIGN,
                'campaign',
                `campaign.id = img_activity.campaign_id`,
              )
            .leftJoinAndMapOne(
                'img_activity.activity',
                tableConstant.ACTIVITIES.TBL_ACTIVITIES,
                'activity',
                `activity.id = img_activity.activity_id`,
              )
            .where(condition)
            .select(fieldfields);
            if(orderBy) {
                query = query.orderBy(orderBy);
            }else{
                if (!orderBy) {
                    orderBy = { id: 'ASC' };
                }
                query = query.orderBy(`dashboard.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
            }
            return await query.getMany();
    }
    async save(data: any) {
        const savedResult = this.writeReplicaCompanyDashboardRepository.create(data);
        return await this.writeReplicaCompanyDashboardRepository.insert(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaCompanyDashboardRepository.metadata);
        return await this.writeReplicaCompanyDashboardRepository.createQueryBuilder('dashboard')
            .update(CompanyDashboardEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicaCompanyDashboardRepository.delete(condition);
    }
}
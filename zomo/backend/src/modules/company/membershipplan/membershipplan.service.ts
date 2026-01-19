import { appConstant, CommonArrayService, CommonFileService, MembershipPlanEntity, tableConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from "typeorm";
import { PaginateWithCompanyInput } from "../../../input";
@Injectable()
export class MembershipPlanService {
    constructor(
      @InjectRepository(MembershipPlanEntity, appConstant.READ_REPLICA.toLowerCase())
      private readonly readReplicaMembershipPlanRepository: Repository<MembershipPlanEntity>,
      @InjectRepository(MembershipPlanEntity, appConstant.MAIN.toLowerCase())
      private readonly writeReplicaMembershipPlanRepository: Repository<MembershipPlanEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {
    }
    async paginateList(condition: any, paginationParam: PaginateWithCompanyInput) {
            const paginateObj = this.commonArrayService.getPaginationVar(
                paginationParam.page || 1,
                paginationParam.limit,
            );
            const order =
                paginationParam && paginationParam.order
                    ? paginationParam.order
                    : 'ASC';
            const orderBy =
                paginationParam && paginationParam.order_by
                    ? paginationParam.order_by
                    : 'membership.id';
            const queryResult = await this.readReplicaMembershipPlanRepository.createQueryBuilder('membership')
                .leftJoinAndMapMany(
                    'membership.plugins',
                    tableConstant.TBL_INSTALL_PLUGINS,
                    'plugins',
                    `FIND_IN_SET(plugins.id, REPLACE(membership.default_plugins, ' ', '')) > 0`,
                )
                .where(condition)
                .orderBy(orderBy, <any>order)
                .take(paginateObj.take)
                .skip(paginateObj.skip)
                .getManyAndCount();
            const [result, total] = queryResult;
            return this.commonArrayService.paginationResponse(result, total, paginateObj);
        }
    async findOne(condition: any, orderBy: any = null,fields: any[] = ['membership','plugins']) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaMembershipPlanRepository.createQueryBuilder('membership')
        .leftJoinAndMapMany(
            'membership.plugins',
            tableConstant.TBL_INSTALL_PLUGINS,
            'plugins',
            `FIND_IN_SET(plugins.id, REPLACE(membership.default_plugins, ' ', '')) > 0`,
        )
        .select(fields)
        .where(condition)
        .orderBy(`membership.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
        .getOne();
    }
    async listRecord(condition: any, orderBy: any = null,fields: any[] = ['membership','plugins']) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaMembershipPlanRepository.createQueryBuilder('membership')
        .leftJoinAndMapMany(
            'membership.plugins',
            tableConstant.TBL_INSTALL_PLUGINS,
            'plugins',
            `FIND_IN_SET(plugins.id, REPLACE(membership.default_plugins, ' ', '')) > 0`,
        )
        .select(fields)
        .where(condition)
        .orderBy(`membership.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
        .getMany();
    }
    async save(data: any) {
        const savedResult = this.writeReplicaMembershipPlanRepository.create(data);
        return await this.writeReplicaMembershipPlanRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaMembershipPlanRepository.metadata);
        return await this.writeReplicaMembershipPlanRepository.createQueryBuilder('membership')
            .update(MembershipPlanEntity)
            .set(data)
            .where(condition)
            .execute();
    }
}

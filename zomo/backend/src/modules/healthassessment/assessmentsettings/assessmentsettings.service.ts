import { appConstant, AssessmentSettingsEntity, CommonArrayService, CommonFileService, tableConstant } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaginateWithHealthAssessmentInput } from "../../../input";
@Injectable()
export class AssessmentSettingsService {
    constructor(
        @InjectRepository(AssessmentSettingsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaAssessmentSettingsRepository: Repository<AssessmentSettingsEntity>,
        @InjectRepository(AssessmentSettingsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaAssessmentSettingsRepository: Repository<AssessmentSettingsEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {
    }
    async paginateList(condition: any, paginationParam: PaginateWithHealthAssessmentInput) {
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
                : 'healthassessment.id';
        const queryResult = await this.readReplicaAssessmentSettingsRepository.createQueryBuilder('healthassessment')
        .innerJoinAndMapOne(
            'healthassessment.from_org',
            tableConstant.COMPANIES.TBL_COMPANY,
            'from_org',
            `from_org.id = healthassessment.copied_organization AND from_org.status != 2`,
          )
        .innerJoinAndMapOne(
            'healthassessment.to_org',
            tableConstant.COMPANIES.TBL_COMPANY,
            'to_org',
            `to_org.id = healthassessment.organization_id AND to_org.status != 2`,
          )
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: any) {
        return await this.readReplicaAssessmentSettingsRepository.findOne({
            where: condition,
        });
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaAssessmentSettingsRepository.createQueryBuilder('healthassessment')
        .leftJoinAndMapOne(
            'healthassessment.from_org',
            tableConstant.COMPANIES.TBL_COMPANY,
            'from_org',
            `from_org.id = healthassessment.copied_organization AND from_org.status = 1`,
          )
        .leftJoinAndMapOne(
            'healthassessment.to_org',
            tableConstant.COMPANIES.TBL_COMPANY,
            'to_org',
            `to_org.id = healthassessment.organization_id AND to_org.status = 1`,
          )
        .where(condition)
        .orderBy(`healthassessment.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
        .getMany();
    }
    async save(data: any) {
        const savedResult = this.writeReplicaAssessmentSettingsRepository.create(data);
        return await this.writeReplicaAssessmentSettingsRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaAssessmentSettingsRepository.metadata);
        return await this.writeReplicaAssessmentSettingsRepository.createQueryBuilder('healthassessment')
            .update(AssessmentSettingsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicaAssessmentSettingsRepository.delete(condition);
    }
}
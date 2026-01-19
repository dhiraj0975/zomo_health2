import { appConstant, AssessmentHraBiometricEntity, BaseService, CommonArrayService, CommonFileService, tableConstant } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaginateWithHealthAssessmentInput } from "../../../input";
@Injectable()
export class AssessmentHraBiometricService extends BaseService<AssessmentHraBiometricEntity> {
    constructor(
        @InjectRepository(AssessmentHraBiometricEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaAssessmentHraBiometricsRepository: Repository<AssessmentHraBiometricEntity>,
        @InjectRepository(AssessmentHraBiometricEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaAssessmentHraBiometricsRepository: Repository<AssessmentHraBiometricEntity>,
        commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {
        super(readReplicaAssessmentHraBiometricsRepository,writeReplicaAssessmentHraBiometricsRepository,'hraBiometric',commonArrayService);
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
        const queryResult = await this.readReplicaAssessmentHraBiometricsRepository.createQueryBuilder('healthassessment')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: any, field: any[] = [],orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaAssessmentHraBiometricsRepository.findOne({
            where: condition,
            select: field,
            order: orderBy,
        });
    }
    async listRecord(condition: any, orderBy: any = null, select: any[] =[],tableData: any[] = []) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        let queryResult: any = this.readReplicaAssessmentHraBiometricsRepository.createQueryBuilder('healthassessment')
            if (tableData.includes(tableConstant.TBL_USERS)) {
                queryResult = queryResult.leftJoinAndMapOne(
                    'healthassessment.user',
                    tableConstant.TBL_USERS,
                    'user',
                    `user.id = healthassessment.user_id AND user.status = 1`,
                )
            }
        queryResult = await queryResult.where(condition)
        .select(select)
        .orderBy(`healthassessment.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
        .getRawMany();
        return queryResult;
    }
    async save(data: any) {
        const savedResult = this.writeReplicaAssessmentHraBiometricsRepository.create(data);
        return await this.writeReplicaAssessmentHraBiometricsRepository.insert(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaAssessmentHraBiometricsRepository.metadata);
        return await this.writeReplicaAssessmentHraBiometricsRepository.createQueryBuilder('healthassessment')
            .update(AssessmentHraBiometricEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicaAssessmentHraBiometricsRepository.delete(condition);
    }
}
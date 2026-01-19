import { appConstant, AssessmentCohortReportsEntity, AssessmentOptionsEntity, CommonArrayService, CommonFileService, tableConstant } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaginateWithHealthAssessmentInput } from "../../../input";
@Injectable()
export class AssessmentCohortReportsService {
    constructor(
        @InjectRepository(AssessmentCohortReportsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaAssessmentCohortReportsRepository: Repository<AssessmentCohortReportsEntity>,
        @InjectRepository(AssessmentCohortReportsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaAssessmentCohortReportsRepository: Repository<AssessmentCohortReportsEntity>,
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
        const queryResult = await this.readReplicaAssessmentCohortReportsRepository.createQueryBuilder('healthassessment')
        .leftJoinAndMapOne(
            'healthassessment.company',
            tableConstant.COMPANIES.TBL_COMPANY,
            'company',
            `company.id = healthassessment.org_id`
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
        return await this.readReplicaAssessmentCohortReportsRepository.findOne({
            where: condition,
        });
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaAssessmentCohortReportsRepository.find({
            where: condition,
            select: [],
            order: orderBy,
        });
    }
    async save(data: any) {
        const savedResult = this.writeReplicaAssessmentCohortReportsRepository.create(data);
        return await this.writeReplicaAssessmentCohortReportsRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaAssessmentCohortReportsRepository.metadata);
        return await this.writeReplicaAssessmentCohortReportsRepository.createQueryBuilder('healthassessment')
            .update(AssessmentOptionsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicaAssessmentCohortReportsRepository.delete(condition);
    }
    async getLocations(condition: any, fields: any = []) {
        return await this.readReplicaAssessmentCohortReportsRepository.find({
            where: condition,
            select: fields,
        });
    }
    async getAllUsers(condition: string) {
        try {
            const query = `
            SELECT 
                user.id,
                user.role_id,
                user.is_camp_eligible,
                user.code,
                user.first_name,
                user.middle_name,
                user.last_name,
                user.dob,
                UPPER(user.gender) as gender,
                department.dept_name,
                location.location_name,
                company.company_name
            FROM
                s_users as user
            LEFT JOIN 
                c_departments as department ON user.department_id = department.id
            LEFT JOIN
                c_locations as location ON user.location = location.id
            LEFT JOIN
                c_companies as company ON user.membership_code = company.code
            WHERE 
                ${condition}
        `;

            const users = await this.customQueryRun(query);
            return users;
        } catch (error) {
            throw error;
        }
    }

    async customQueryRun(query: string) {
        try {
            const result = await this.readReplicaAssessmentCohortReportsRepository.query(query);
            return result;
        } catch (error) {
            throw error;
        }
    }
}
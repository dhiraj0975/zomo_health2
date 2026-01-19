import {
    appConstant,
    BaseService,
    CommonArrayService,
    EmotionalWellBeingPostClickEntity,
    tableConstant,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class WellBeingPostClickService extends BaseService<EmotionalWellBeingPostClickEntity> {
    constructor(
        @InjectRepository(
            EmotionalWellBeingPostClickEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaWellbeingPostClickRepository: Repository<EmotionalWellBeingPostClickEntity>,
        @InjectRepository(
            EmotionalWellBeingPostClickEntity,
            appConstant.MAIN.toLowerCase(),
        )
        private readonly writeReplicaWellbeingPostClickRepository: Repository<EmotionalWellBeingPostClickEntity>,
        commonArrayService: CommonArrayService,
    ) {
        super(
            readReplicaWellbeingPostClickRepository,
            writeReplicaWellbeingPostClickRepository,
            'wellBeingPostClick',
            commonArrayService,
        );
    }
    async findOne(condition: any, fields: any = [], orderBy: any = null) {
        if (!orderBy) {
            orderBy = { 'wellbeing.id': 'DESC' };
        }
        return await this.readReplicaWellbeingPostClickRepository
            .createQueryBuilder('wellbeing')
            .where(condition)
            .select(fields)
            .orderBy(
                `${Object.keys(orderBy)[0]}`,
                orderBy[Object.keys(orderBy)[0]],
            )
            .getRawOne();
    }
    async listRecord(
        condition: any,
        orderBy: any = null,
        fields: any = ['wellbeing.*'],
    ) {
        if (!orderBy) {
            orderBy = { 'wellbeing.id': 'DESC' };
        }
        return await this.readReplicaWellbeingPostClickRepository
            .createQueryBuilder('wellbeing')
            .where(condition)
            .select(fields)
            .orderBy(
                `${Object.keys(orderBy)[0]}`,
                orderBy[Object.keys(orderBy)[0]],
            )
            .getMany();
    }
    async save(data: any) {
        const savedResult =
            this.writeReplicaWellbeingPostClickRepository.create(data);
        return await this.writeReplicaWellbeingPostClickRepository.insert(
            savedResult,
        );
    }
    async update(condition: any, data: any) {
        return await this.writeReplicaWellbeingPostClickRepository
            .createQueryBuilder('wellbeing')
            .update(EmotionalWellBeingPostClickEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicaWellbeingPostClickRepository.delete(condition);
    }
    /**
     * Function for fatching EWB report data
     */
    async ewdReports(
        condition: any,
        innerCondition: any,
        paginationParam: any = null,
        field: any[] = [
            'User.id', 'User.gender', 'User.role_id', 'User.new_password', 'User.timezone', 'User.is_camp_eligible', 'User.department_id', 'User.location', 'User.org_id',
            'User.email', 'User.on_insurance_plan', 'User.relationship_id', 'User.code', 'User.username', 'User.middle_name', 'User.dob', 'User.date_of_hire',
            'User.first_name', 'User.last_name', 'User.insurance_plan_name',
            'settings.id', 'settings.jobtitle', 'settings.wphone', 'settings.hphone',
            'company.id', 'company.company_name',
            'department.id', 'department.dept_name',
            'Location.id', 'Location.lname', 'Location.address1', 'Location.city', 'Location.state', 'Location.zip', 'Location.country',
            'emotionalwellbeingpostclick.id', 'emotionalwellbeingpostclick.created_date', 'emotionalwellbeingpost.id', 'emotionalwellbeingpost.title',
        ],
    ) {
        try {
            let paginateObj;
            if (paginationParam !== null) {
                paginateObj = paginationParam !== null ?
                    this.commonArrayService.getPaginationVar(
                        paginationParam.page || 1,
                        paginationParam.limit,
                    ) : '';
            }
            let data = this.readReplicaWellbeingPostClickRepository
                .createQueryBuilder('emotionalwellbeingpostclick')
                .innerJoinAndMapOne(
                    'emotionalwellbeingpostclick.User',
                    tableConstant.TBL_USERS,
                    'User',
                    `${innerCondition}`,
                )
                .leftJoinAndMapOne(
                    'User.company',
                    tableConstant.COMPANIES.TBL_COMPANY,
                    'company',
                    `company.id = User.org_id AND company.status = 1`,
                )
                .leftJoinAndMapOne(
                    'User.department',
                    tableConstant.COMPANIES.TBL_DEPARTMENT,
                    'department',
                    `department.id = User.department_id`,
                )
                .leftJoinAndMapOne(
                    'User.Location',
                    tableConstant.COMPANIES.TBL_LOCATION,
                    'Location',
                    `Location.id = User.location`,
                )
                .leftJoinAndMapOne(
                    'User.settings',
                    tableConstant.TBL_USERS_SETTINGS,
                    'settings',
                    `settings.user_id = User.id`,
                )
                .innerJoinAndMapOne(
                    'emotionalwellbeingpostclick.emotionalwellbeingpost',
                    tableConstant.REPORT.TBL_EM_POST,
                    'emotionalwellbeingpost',
                    `emotionalwellbeingpost.id = emotionalwellbeingpostclick.post_id`,
                )
                .where(condition)
                .orderBy('emotionalwellbeingpostclick.created_date', 'DESC')
                .select(field);
            let resultData;
            if (paginationParam === null) {
                resultData = await data.getMany();
            } else {
                data = data.take(paginateObj.take).skip(paginateObj.skip);
                let finalData = await data.getManyAndCount();
                const [result, total] = finalData;
                resultData = this.commonArrayService.paginationResponse(
                    result,
                    total,
                    paginateObj,
                );
            }
            return resultData;
        } catch (error) {
            throw new Error(error.message);
        }
    }
}

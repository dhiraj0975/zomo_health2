import { ReSubmitFormInterface } from '@/interface';
import { appConstant, CommonArrayService, CommonDateService, CommonFileService, ReimbursementSubmitedFormsEntity, tableConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginationSubmitFormInput } from "../../../input";
@Injectable()
export class SubmitFormsService {
    constructor(
        @InjectRepository(ReimbursementSubmitedFormsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaSubmitedFormsRepository: Repository<ReimbursementSubmitedFormsEntity>,
        @InjectRepository(ReimbursementSubmitedFormsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaSubmitedFormsRepository: Repository<ReimbursementSubmitedFormsEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonDateService: CommonDateService,
        private readonly commonFileService: CommonFileService,
    ) { }
    async paginateList(condition: any, paginationParam: PaginationSubmitFormInput) {
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
                ? `sf.${paginationParam.order_by}`
                : 'sf.added_date';
        let queryResult: any;
        if (paginationParam && paginationParam.role_id == 3) {
            queryResult = await this.readReplicaSubmitedFormsRepository.createQueryBuilder('sf')
                .innerJoinAndMapOne(
                    'sf.activity',
                    tableConstant.ACTIVITIES.TBL_ACTIVITIES,
                    'activity',
                    `sf.activity_id = activity.id`,
                )
                .innerJoinAndMapOne(
                    'sf.createForm',
                    tableConstant.REIMBURSEMENT.TBL_RE_CREATE_FORMS,
                    'createForm',
                    `sf.form_id = createForm.id AND createForm.status = 1 AND createForm.deleted = 0`,
                )
                .innerJoinAndMapOne(
                    'sf.company',
                    tableConstant.COMPANIES.TBL_COMPANY,
                    'company',
                    `sf.org_id = company.id AND company.status = 1`,
                )
                .innerJoinAndMapOne(
                    'sf.user',
                    tableConstant.TBL_USERS,
                    'user',
                    `sf.user_id = user.id`,
                )
                .where(condition)
                .orderBy(orderBy, <any>order)
                .take(paginateObj.take)
                .skip(paginateObj.skip)
                .getManyAndCount();
        } else {
            queryResult = await this.readReplicaSubmitedFormsRepository.createQueryBuilder('sf')
                .innerJoinAndMapOne(
                    'sf.activity',
                    tableConstant.ACTIVITIES.TBL_ACTIVITIES,
                    'activity',
                    `sf.activity_id = activity.id`,
                )
                .innerJoinAndMapOne(
                    'sf.createForm',
                    tableConstant.REIMBURSEMENT.TBL_RE_CREATE_FORMS,
                    'createForm',
                    `sf.form_id = createForm.id AND createForm.status = 1 AND createForm.deleted = 0`,
                )
                .innerJoinAndMapOne(
                    'sf.company',
                    tableConstant.COMPANIES.TBL_COMPANY,
                    'company',
                    `sf.org_id = company.id AND company.status = 1`,
                )
                .innerJoinAndMapOne(
                    'sf.user',
                    tableConstant.TBL_USERS,
                    'user',
                    `sf.user_id = user.id AND user.status = 1`,
                )
                .where(condition)
                .orderBy(orderBy, <any>order)
                .take(paginateObj.take)
                .skip(paginateObj.skip)
                .getManyAndCount();
        }
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async save(data: any) {
        const savedResult = this.writeReplicaSubmitedFormsRepository.create(data);
        return await this.writeReplicaSubmitedFormsRepository.save(savedResult);
    }
    async delete(condition: any) {
        await this.writeReplicaSubmitedFormsRepository.delete(condition);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaSubmitedFormsRepository.metadata);
        return await this.writeReplicaSubmitedFormsRepository.createQueryBuilder('sf')
            .update(ReimbursementSubmitedFormsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaSubmitedFormsRepository.createQueryBuilder('sf')
            .innerJoinAndMapOne(
                'sf.activity',
                tableConstant.ACTIVITIES.TBL_ACTIVITIES,
                'activity',
                `sf.activity_id = activity.id`,
            )
            .innerJoinAndMapOne(
                'sf.createForm',
                tableConstant.REIMBURSEMENT.TBL_RE_CREATE_FORMS,
                'createForm',
                `sf.form_id = createForm.id`,
            )
            .innerJoinAndMapOne(
                'sf.company',
                tableConstant.COMPANIES.TBL_COMPANY,
                'company',
                `sf.org_id = company.id AND company.status = 1`,
            )
            .innerJoinAndMapOne(
                'sf.user',
                tableConstant.TBL_USERS,
                'user',
                `sf.user_id = user.id`,
            )
            .where(condition)
            .getOne();
    }
    async listRecord(fields: any = ['sf.*'], condition: any, orderBy: any = null, joinTable: any = []): Promise<ReSubmitFormInterface[]> {
        if (!orderBy) {
            orderBy = { 'sf.id': 'DESC' };
        }
        let queryResult: any = this.readReplicaSubmitedFormsRepository.createQueryBuilder('sf')
        if (joinTable && joinTable.length > 0) {
            if (joinTable.includes(tableConstant.ACTIVITIES.TBL_ACTIVITIES)) {
                queryResult = queryResult.leftJoinAndMapOne(
                    'sf.activity',
                    tableConstant.ACTIVITIES.TBL_ACTIVITIES,
                    'activity',
                    `activity.id = sf.activity_id`
                )
            }
            if (joinTable.includes(tableConstant.REIMBURSEMENT.TBL_RE_CREATE_FORMS)) {
                queryResult = queryResult.leftJoinAndMapOne(
                    'sf.createForm',
                    tableConstant.REIMBURSEMENT.TBL_RE_CREATE_FORMS,
                    'createForm',
                    `sf.form_id = createForm.id`
                )
            }
            if (joinTable.includes(tableConstant.COMPANIES.TBL_COMPANY)) {
                queryResult = queryResult.leftJoinAndMapOne(
                    'sf.company',
                    tableConstant.COMPANIES.TBL_COMPANY,
                    'company',
                    `company.id = sf.org_id`
                )
            }
            if (joinTable.includes(tableConstant.TBL_USERS)) {
                queryResult = queryResult.leftJoinAndMapOne(
                    'sf.user',
                    tableConstant.TBL_USERS,
                    'user',
                    `user.id = sf.user_id`
                )
            }
        }
        queryResult = await queryResult.where(condition)
            .select(fields)
            .orderBy(`${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
            .getMany();
        return queryResult;
    }
    async reimbursementReport(condition: any, paginationParam: any = null, field: any[] =
        [
            'user.id',
            'user.role_id', 'user.new_password', 'user.timezone', 'user.is_camp_eligible', 'user.department_id', 'user.location', 'user.org_id', 'user.email',
            'user.on_insurance_plan', 'user.gender', 'user.relationship_id', 'user.code', 'user.username', 'user.middle_name', 'user.dob', 'user.date_of_hire',
            'user.first_name', 'user.last_name', 'user.insurance_plan_name', 'settings.id',
            'settings.jobtitle', 'settings.wphone', 'settings.hphone', 'company.id', 'department.id',
            'company.company_name', 'department.dept_name', 'locations.id',
            'locations.lname', 'locations.address1', 'locations.city', 'locations.state', 'locations.zip', 'locations.country',
            'resubmitedforms.user_id', 'resubmitedforms.id', 'resubmitedforms.org_id', 'resubmitedforms.form_id', 'resubmitedforms.activity_id', 'resubmitedforms.activity_date',
            'resubmitedforms.reim_amount', 'resubmitedforms.notes', 'resubmitedforms.decline_reason', 'resubmitedforms.popup_status', 'resubmitedforms.approve_reim_amount',
            'resubmitedforms.approval_type', 'resubmitedforms.status',
            'inactivity.id', 'inactivity.category_id', 'inactivity.activity_name', 'inactivity.status',
            'recreateforms.id', 'recreateforms.title', 'recreateforms.org_id', 'recreateforms.activity_id', 'recreateforms.activity_date', 'recreateforms.attachments', 'recreateforms.multiple_selection',
            'recreateforms.description', 'recreateforms.act_reim_amount', 'recreateforms.approval_type', 'recreateforms.status', 'recreateforms.added_date',
        ]
    ) {
        let paginateObj
        if (paginationParam !== null) {
            paginateObj = paginationParam !== null ? this.commonArrayService.getPaginationVar(
                paginationParam.page || 1,
                paginationParam.limit,
            ) : ''
        }
        let data = this.readReplicaSubmitedFormsRepository.createQueryBuilder('resubmitedforms')
            .leftJoinAndMapOne(
                'resubmitedforms.user',
                tableConstant.TBL_USERS,
                'user',
                `user.id = resubmitedforms.user_id`
            )
            .leftJoinAndMapOne(
                'resubmitedforms.inactivity',
                tableConstant.ACTIVITIES.TBL_ACTIVITIES,
                'inactivity',
                `inactivity.id = resubmitedforms.activity_id`
            )
            .leftJoinAndMapOne(
                'resubmitedforms.recreateforms',
                tableConstant.REIMBURSEMENT.TBL_RE_CREATE_FORMS,
                'recreateforms',
                `recreateforms.id = resubmitedforms.form_id`
            )
            .leftJoinAndMapOne(
                'user.company',
                tableConstant.COMPANIES.TBL_COMPANY,
                'company',
                `company.id = user.org_id AND company.status = 1`,
            )
            .leftJoinAndMapOne(
                'user.department',
                tableConstant.COMPANIES.TBL_DEPARTMENT,
                'department',
                `department.id = user.department_id`,
            )
            .leftJoinAndMapOne(
                'user.locations',
                tableConstant.COMPANIES.TBL_LOCATION,
                'locations',
                `locations.id = user.location`,
            )
            .leftJoinAndMapOne(
                'user.settings',
                tableConstant.TBL_USERS_SETTINGS,
                'settings',
                `settings.user_id = user.id`,
            )
            .where(condition)
            .orderBy('resubmitedforms.id', 'DESC')
            .select(field);
        let resultData
        if (paginationParam === null) {
            resultData = await data.getMany();
        }
        else {
            data = data.take(paginateObj.take).skip(paginateObj.skip)
            let finalData = await data.getManyAndCount();
            const [result, total] = finalData;
            resultData = this.commonArrayService.paginationResponse(result, total, paginateObj);
        }
        return resultData
    }
}

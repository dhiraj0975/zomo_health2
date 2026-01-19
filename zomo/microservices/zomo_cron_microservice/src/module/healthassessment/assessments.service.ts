import {
    appConstant,
    AssessmentsEntity,
    BaseService,
    CommonArrayService,
    CommonDateService,
    CommonFileService,
    CommonHealthService,
    CommonService,
    FormInstructionsEntity,
    tableConstant,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class AssessmentService extends BaseService<AssessmentsEntity> {
    constructor(
        private readonly commonService: CommonService,
        commonArrayService: CommonArrayService,
        private readonly commonDateService: CommonDateService,
        private readonly commonFileService: CommonFileService,
        private readonly commonHealthService: CommonHealthService,
        @InjectRepository(
            FormInstructionsEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaFormInstructionsRepository: Repository<FormInstructionsEntity>,
        @InjectRepository(
            FormInstructionsEntity,
            appConstant.MAIN.toLowerCase(),
        )
        private readonly writeReplicaFormInstructionsRepository: Repository<FormInstructionsEntity>,
        @InjectRepository(
            AssessmentsEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaAssessmentsRepository: Repository<AssessmentsEntity>,
        @InjectRepository(AssessmentsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaAssessmentsRepository: Repository<AssessmentsEntity>,
    ) {
        super(
            readReplicaAssessmentsRepository,
            writeReplicaAssessmentsRepository,
            'assessment',
            commonArrayService,
        );
    }
    async resetHraGenerate() {
        try {
            let sys_date = this.commonDateService
                .getTodayDate()
                .format('YYYY-MM-DD');
            let sys_date_compare = this.commonDateService
                .getTodayDate(sys_date)
                .unix();
            const where = [
                { pf_reset_date: sys_date },
                { dvf_reset_date: sys_date },
                { ovf_reset_date: sys_date },
                { ta_reset_date: sys_date },
                { reset_date: sys_date },
                { feature_hra_date: sys_date },
            ];
            let res_hra = await this.readReplicaFormInstructionsRepository.find(
                {
                    select: [
                        'id',
                        'company_id',
                        'pf_start_date',
                        'pf_end_date',
                        'pf_fax_date',
                        'ta_start_date',
                        'ta_end_date',
                        'ta_fax_date',
                        'dvf_start_date',
                        'dvf_end_date',
                        'dvf_fax_date',
                        'ovf_start_date',
                        'ovf_end_date',
                        'ovf_fax_date',
                        'start_date',
                        'end_date',
                        'fax_date',
                        'feture_pf_start_date',
                        'feture_pf_end_date',
                        'feture_pf_fax_date',
                        'pf_reset_date',
                        'feature_hra_date',
                        'feture_dvf_start_date',
                        'feture_dvf_end_date',
                        'feture_dvf_faxt_date',
                        'dvf_reset_date',
                        'feture_ovf_start_date',
                        'feture_ovf_end_date',
                        'feture_ovf_fax_date',
                        'ovf_reset_date',
                        'feture_ta_start_date',
                        'feture_ta_end_date',
                        'feture_ta_fax_date',
                        'ta_reset_date',
                        'feature_start_date',
                        'feature_end_date',
                        'feature_fax_date',
                        'reset_date',
                        'fax_number',
                        'program_selection',
                        'date_range',
                        'reset_date_range',
                        'forms_year',
                        'yearly_opts',
                    ],
                    where: where,
                    order: { id: 'DESC' },
                },
            );
            if (res_hra.length > 0) {
                for (let instr_arr of res_hra) {
                    let stordata = [];
                    const feature_hra_date = this.commonDateService
                        .getTodayDate(instr_arr.feature_hra_date)
                        .format('YYYY-MM-DD');
                    if (
                        instr_arr.feature_hra_date &&
                        instr_arr?.feature_hra_date != '' &&
                        sys_date_compare ==
                            this.commonDateService
                                .getTodayDate(feature_hra_date, 'YYYY-MM-DD')
                                .unix()
                    ) {
                        let condition = `user.role_id IN(2,16) AND user.status = 1 AND company.id = "${instr_arr.company_id}"`;
                        let fields = [
                            'healthassessment.id',
                            'healthassessment.hra_status',
                            'healthassessment.date',
                            'user.id',
                            'user.code',
                            'user.first_name',
                            'user.middle_name',
                            'user.last_name',
                            'user.username',
                            'user.gender',
                            'user.email',
                            'user.dob',
                            'user.date_of_hire',
                            'user.employeeid',
                            'user.user_type',
                            'user.on_insurance_plan',
                            'user.insurance_plan_name',
                            'company.id',
                            'company.company_name',
                            'settings.jobtitle',
                            'department.id',
                            'department.dept_name',
                            'location.id',
                            'location.location_name',
                        ];
                        let resultedData = await this.HRAReset(
                            condition,
                            null,
                            fields,
                            null,
                        );
                        const [result, total] = resultedData;
                        for (let ele of result) {
                            await this.assessmentsUpdate(
                                { id: ele['id'] },
                                { hra_reset: 1 },
                            );
                        }
                    }
                    if (instr_arr.reset_date_range == 1) {
                        const pf_reset_date = this.commonDateService
                            .getTodayDate(instr_arr.pf_reset_date)
                            .format('YYYY-MM-DD');
                        const dvf_reset_date = this.commonDateService
                            .getTodayDate(instr_arr.dvf_reset_date)
                            .format('YYYY-MM-DD');
                        const ovf_reset_date = this.commonDateService
                            .getTodayDate(instr_arr.ovf_reset_date)
                            .format('YYYY-MM-DD');
                        const ta_reset_date = this.commonDateService
                            .getTodayDate(instr_arr.ta_reset_date)
                            .format('YYYY-MM-DD');
                        if (
                            instr_arr.pf_reset_date &&
                            instr_arr?.pf_reset_date != '' &&
                            sys_date_compare >=
                                this.commonDateService
                                    .getTodayDate(pf_reset_date, 'YYYY-MM-DD')
                                    .unix()
                        ) {
                            stordata['pf_start_date'] =
                                instr_arr.feture_pf_start_date;
                            stordata['pf_end_date'] =
                                instr_arr.feture_pf_end_date;
                            stordata['pf_fax_date'] =
                                instr_arr.feture_pf_fax_date;
                            stordata['feture_pf_start_date'] =
                                stordata['feture_pf_end_date'] =
                                stordata['feture_pf_fax_date'] =
                                stordata['pf_reset_date'] =
                                    null;
                        }
                        if (
                            instr_arr.dvf_reset_date &&
                            instr_arr?.dvf_reset_date != '' &&
                            sys_date_compare >=
                                this.commonDateService
                                    .getTodayDate(dvf_reset_date, 'YYYY-MM-DD')
                                    .unix()
                        ) {
                            stordata['dvf_start_date'] =
                                instr_arr.feture_dvf_start_date;
                            stordata['dvf_end_date'] =
                                instr_arr.feture_dvf_end_date;
                            stordata['dvf_fax_date'] =
                                instr_arr.feture_dvf_faxt_date;
                            stordata['feture_dvf_start_date'] =
                                stordata['feture_dvf_end_date'] =
                                stordata['feture_dvf_faxt_date'] =
                                stordata['dvf_reset_date'] =
                                    null;
                        }
                        if (
                            instr_arr.ovf_reset_date &&
                            instr_arr?.ovf_reset_date != '' &&
                            sys_date_compare >=
                                this.commonDateService
                                    .getTodayDate(ovf_reset_date, 'YYYY-MM-DD')
                                    .unix()
                        ) {
                            stordata['ovf_start_date'] =
                                instr_arr.feture_ovf_start_date;
                            stordata['ovf_end_date'] =
                                instr_arr.feture_ovf_end_date;
                            stordata['ovf_fax_date'] =
                                instr_arr.feture_ovf_fax_date;
                            stordata['feture_ovf_start_date'] =
                                stordata['feture_ovf_end_date'] =
                                stordata['feture_ovf_fax_date'] =
                                stordata['ovf_reset_date'] =
                                    null;
                        }
                        if (
                            instr_arr.ta_reset_date &&
                            instr_arr?.ta_reset_date != '' &&
                            sys_date_compare >=
                                this.commonDateService
                                    .getTodayDate(ta_reset_date, 'YYYY-MM-DD')
                                    .unix()
                        ) {
                            stordata['ta_start_date'] =
                                instr_arr.feture_ta_start_date;
                            stordata['ta_end_date'] =
                                instr_arr.feture_ta_end_date;
                            stordata['ta_fax_date'] =
                                instr_arr.feture_ta_fax_date;
                            stordata['feture_ta_start_date'] =
                                stordata['feture_ta_end_date'] =
                                stordata['feture_ta_fax_date'] =
                                stordata['ta_reset_date'] =
                                    null;
                        }
                        stordata['date_range'] = instr_arr.reset_date_range;
                        stordata['start_date'] =
                            stordata['end_date'] =
                            stordata['fax_date'] =
                                null;
                        await this.formInstructionsUpdate(
                            { id: instr_arr.id },
                            stordata,
                        );
                    } else if (instr_arr.reset_date_range == 2) {
                        const reset_date = this.commonDateService
                            .getTodayDate(instr_arr.reset_date)
                            .format('YYYY-MM-DD');
                        if (
                            instr_arr.reset_date &&
                            instr_arr?.reset_date != '' &&
                            sys_date_compare >=
                                this.commonDateService
                                    .getTodayDate(reset_date, 'YYYY-MM-DD')
                                    .unix()
                        ) {
                            stordata['pf_start_date'] =
                                stordata['start_date'] =
                                stordata['dvf_start_date'] =
                                stordata['ovf_start_date'] =
                                stordata['ta_start_date'] =
                                    instr_arr.feature_start_date;
                            stordata['pf_end_date'] =
                                stordata['end_date'] =
                                stordata['dvf_end_date'] =
                                stordata['ovf_end_date'] =
                                stordata['ta_end_date'] =
                                    instr_arr.feature_end_date;
                            stordata['pf_fax_date'] =
                                stordata['fax_date'] =
                                stordata['dvf_fax_date'] =
                                stordata['ovf_fax_date'] =
                                stordata['ta_fax_date'] =
                                    instr_arr.feature_fax_date;
                            stordata['date_range'] = instr_arr.reset_date_range;
                            stordata['feature_start_date'] =
                                stordata['feature_end_date'] =
                                stordata['feature_fax_date'] =
                                stordata['reset_date'] =
                                stordata['feture_pf_start_date'] =
                                stordata['feture_pf_end_date'] =
                                stordata['feture_pf_fax_date'] =
                                stordata['feture_dvf_start_date'] =
                                stordata['feture_dvf_end_date'] =
                                stordata['feture_dvf_faxt_date'] =
                                stordata['feture_ovf_start_date'] =
                                stordata['feture_ovf_end_date'] =
                                stordata['feture_ovf_fax_date'] =
                                stordata['feture_ta_start_date'] =
                                stordata['feture_ta_end_date'] =
                                stordata['feture_ta_fax_date'] =
                                stordata['dvf_reset_date'] =
                                stordata['ovf_reset_date'] =
                                stordata['ta_reset_date'] =
                                stordata['pf_reset_date'] =
                                stordata['reset_date_range'] =
                                    null;
                            await this.formInstructionsUpdate(
                                { id: instr_arr.id },
                                stordata,
                            );
                        }
                    }
                }
                return 'success';
            } else {
                return 'data not available for reset';
            }
        } catch (error) {
            throw error.message;
        }
    }
    async HRAReset(
        condition: any,
        orderBy: any = null,
        select: any[] = ['healthassessment'],
        paginationParam: any = null,
    ) {
        try {
            if (!orderBy) {
                orderBy = { id: 'DESC' };
            }
            let paginateObj = null;
            if (paginationParam) {
                paginateObj = this.commonArrayService.getPaginationVar(
                    paginationParam.page || 1,
                    paginationParam.limit,
                );
            }
            let query = this.readReplicaAssessmentsRepository
                .createQueryBuilder('healthassessment')
                .leftJoinAndMapOne(
                    'healthassessment.user',
                    tableConstant.TBL_USERS,
                    'user',
                    `user.id = healthassessment.user_id AND user.role_id IN(2,16)`,
                )
                .leftJoinAndMapOne(
                    'user.settings',
                    tableConstant.TBL_USERS_SETTINGS,
                    'settings',
                    `settings.user_id = user.id`,
                )
                .leftJoinAndMapOne(
                    'user.company',
                    tableConstant.COMPANIES.TBL_COMPANY,
                    'company',
                    `company.id = user.org_id`,
                )
                .leftJoinAndMapOne(
                    'user.department',
                    tableConstant.COMPANIES.TBL_DEPARTMENT,
                    'department',
                    `department.id = user.department_id`,
                )
                .leftJoinAndMapOne(
                    'user.location',
                    tableConstant.COMPANIES.TBL_LOCATION,
                    'location',
                    `location.id = user.location`,
                )
                .where(condition);
            // .select(select)
            // .orderBy(` healthassessment.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
            // .getMany();
            if (paginateObj) {
                query = query
                    .take(paginateObj.take)
                    .skip(paginateObj.skip)
                    .select(select)
                    .orderBy(
                        `healthassessment.${Object.keys(orderBy)[0]}`,
                        orderBy[Object.keys(orderBy)[0]],
                    );
            }
            return await query.getManyAndCount();
        } catch (error) {
            throw new Error(error.message);
        }
    }
    async formInstructionsUpdate(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(
            data,
            this.writeReplicaFormInstructionsRepository.metadata,
        );
        return await this.writeReplicaFormInstructionsRepository
            .createQueryBuilder('forminstructions')
            .update(FormInstructionsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async assessmentsUpdate(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(
            data,
            this.writeReplicaAssessmentsRepository.metadata,
        );
        return await this.writeReplicaAssessmentsRepository
            .createQueryBuilder('healthassessment')
            .update(AssessmentsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
}

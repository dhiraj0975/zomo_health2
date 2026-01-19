import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { BaseModuleService } from '../shared/base.service';
import { EntityKeyMap, FieldDataResult } from '../shared/types';
import {
    appConstant,
    ActivityEntity,
    CreateFormsEntity,
    ReimbursementCreateFormsEntity,
    FormInstructionsEntity,
    UcaManualUpComingsEntity,
} from '@common-constants';
@Injectable()
export class ActivityModuleService extends BaseModuleService {
    constructor(
        @InjectRepository(
            ActivityEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly activityRepo: Repository<ActivityEntity>,

        @InjectRepository(
            CreateFormsEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly activityFormRepo: Repository<CreateFormsEntity>,

        @InjectRepository(
            ReimbursementCreateFormsEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly reimbursementFormRepo: Repository<ReimbursementCreateFormsEntity>,

        @InjectRepository(
            FormInstructionsEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly formInstructionRepo: Repository<FormInstructionsEntity>,

        @InjectRepository(
            UcaManualUpComingsEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly upcomingActivityRepo: Repository<UcaManualUpComingsEntity>,
    ) {
        super('ActivityModuleService');
    }

    async getActivityFormList(companyId?: string): Promise<EntityKeyMap> {
        return this.fetchAndMapEntities(
            this.activityRepo,
            this.buildCompanyWhereCondition(
                {
                    status: Not(2),
                    activity_name: Not(IsNull()),
                    enable_activity_tracker: 1,
                },
                companyId,
                'accebility',
            ),
            'id',
            'activity_name',
            'getActivityForms',
        );
    }

    async getActivitySubmitFormList(companyId?: string): Promise<EntityKeyMap> {
        return this.fetchAndMapEntities(
            this.activityFormRepo,
            this.buildCompanyWhereCondition(
                { deleted: 0, title: Not(IsNull()) },
                companyId,
                'org_id',
            ),
            'id',
            'title',
            'getActivitySubmitForms',
        );
    }

    async getReimbursementActivityList(
        companyId?: string,
    ): Promise<EntityKeyMap> {
        return this.fetchAndMapEntities(
            this.activityRepo,
            this.buildCompanyWhereCondition(
                {
                    status: Not(2),
                    activity_name: Not(IsNull()),
                    enable_reimbursement: 1,
                },
                companyId,
                'accebility',
            ),
            'id',
            'activity_name',
            'getReimbursementActivities',
        );
    }

    async getReimbursementSubmitFormList(
        companyId?: string,
    ): Promise<EntityKeyMap> {
        return this.fetchAndMapEntities(
            this.reimbursementFormRepo,
            this.buildCompanyWhereCondition(
                { deleted: 0, title: Not(IsNull()) },
                companyId,
                'org_id',
            ),
            'id',
            'title',
            'getReimbursementSubmitForms',
        );
    }

    async getUpcomingActivityList(companyId?: string): Promise<EntityKeyMap> {
        return this.fetchAndMapEntities(
            this.upcomingActivityRepo,
            this.buildCompanyWhereCondition(
                { status: Not(2), title: Not(IsNull()) },
                companyId,
                'org_id',
            ),
            'id',
            'title',
            'getUpcomingActivities',
        );
    }

    async getActivitiesFields(orgId: string): Promise<FieldDataResult> {
        const dataArray: Record<string, string> = {};
        const dataLabelArray: Record<string, string> = {};

        try {
            if (!orgId) return [{}, {}];

            const selectOrgFieldList = parseInt(orgId, 10);

            const formInstruction = await this.formInstructionRepo.findOne({
                where: [
                    {
                        company_id: selectOrgFieldList,
                        tobacco_cessation_text: Not(''),
                    },
                    {
                        company_id: selectOrgFieldList,
                        tobacco_para1: Not(''),
                    },
                    {
                        company_id: selectOrgFieldList,
                        dentists_text: Not(''),
                    },
                    {
                        company_id: selectOrgFieldList,
                        optometrists_text: Not(''),
                    },
                    {
                        company_id: selectOrgFieldList,
                        physician_text: Not(''),
                    },
                ],
                select: [
                    'id',
                    'tobacco_cessation_text',
                    'tobacco_para1',
                    'dentists_text',
                    'optometrists_text',
                    'physician_text',
                    'age_gender_title',
                    'age_gender_text',
                ],
            });

            if (formInstruction) {
                dataArray[`tobacco_cessation_text_${orgId}`] =
                    formInstruction.tobacco_cessation_text || '';
                dataArray[`tobacco_para1_${orgId}`] =
                    formInstruction.tobacco_para1 || '';
                dataLabelArray[`tobacco_cessation_text_${orgId}`] =
                    'Cessation Program Instructions';
                dataLabelArray[`tobacco_para1_${orgId}`] =
                    'Online Form Paragraph';

                dataArray[`dentists_text_${orgId}`] =
                    formInstruction.dentists_text || '';
                dataArray[`optometrists_text_${orgId}`] =
                    formInstruction.optometrists_text || '';
                dataLabelArray[`dentists_text_${orgId}`] = 'Dentists Text';
                dataLabelArray[`optometrists_text_${orgId}`] =
                    'Optometrists Text';

                dataArray[`physician_text_${orgId}`] =
                    formInstruction.physician_text || '';
                dataLabelArray[`physician_text_${orgId}`] = 'Physician Text';

                dataArray[`age_gender_title_${orgId}`] =
                    formInstruction.age_gender_title || '';
                dataLabelArray[`age_gender_title_${orgId}`] =
                    'Age Gender Title';

                dataArray[`age_gender_text_${orgId}`] =
                    formInstruction.age_gender_text || '';
                dataLabelArray[`age_gender_text_${orgId}`] = 'Age Gender Text';
            }
            return [dataArray, dataLabelArray];
        } catch (error) {
            this.logger.error(
                `Error in getActivitiesFields: ${error.message}`,
                error.stack,
            );
            return [dataArray, dataLabelArray];
        }
    }

    async getActivitySubmitFormFields(
        formId: string,
    ): Promise<FieldDataResult> {
        return this.fetchSingleEntityFields(
            this.activityFormRepo,
            formId,
            { deleted: 0 },
            { title: 'title', description: 'description' },
            'getActivitySubmitFormFields',
        );
    }

    async getActivityFormActivityFields(
        activityId: string,
    ): Promise<FieldDataResult> {
        return this.fetchSingleEntityFields(
            this.activityRepo,
            activityId,
            { status: Not(2) },
            { activity_name: 'activity_name' },
            'getActivityFormActivityFields',
        );
    }

    async getReimbursementSubmitFormFields(
        formId: string,
    ): Promise<FieldDataResult> {
        return this.fetchSingleEntityFields(
            this.reimbursementFormRepo,
            formId,
            { deleted: 0 },
            { title: 'title', description: 'description' },
            'getReimbursementSubmitFormFields',
        );
    }

    async getReimbursementActivityFields(
        activityId: string,
    ): Promise<FieldDataResult> {
        return this.fetchSingleEntityFields(
            this.activityRepo,
            activityId,
            { status: Not(2) },
            { activity_name: 'activity_name' },
            'getReimbursementActivityFields',
        );
    }

    async getUpcomingActivityFields(
        activityId: string,
    ): Promise<FieldDataResult> {
        return this.fetchSingleEntityFields(
            this.upcomingActivityRepo,
            activityId,
            { status: Not(2) },
            { title: 'title', description: 'description' },
            'getUpcomingActivityFields',
        );
    }

    async getHealthFormsSubmitFormFields(
        orgId: string,
    ): Promise<FieldDataResult> {
        const orgSubmissionArry: Record<string, string> = {};
        const translationsLabelArry: Record<string, string> = {};

        try {
            const defaultData: Record<number, string> = {
                1: 'Physician Visit Form',
                2: 'Dental Visit Form',
                3: 'Optometry/ Ophthalmology Visit Form',
                4: 'Tobacco Affidavit',
                5: 'Biometric Screening Form',
                6: 'Age/Gender Preventive Screening Form',
            };

            Object.keys(defaultData).forEach((key, index) => {
                const labelKey = `custo_customeLabel_${index}_${orgId}`;
                translationsLabelArry[labelKey] = defaultData[parseInt(key)];
            });

            const formInstruction = await this.formInstructionRepo.findOne({
                where: { company_id: parseInt(orgId, 10) },
                select: ['program_custom_name'],
            });

            if (formInstruction && formInstruction.program_custom_name) {
                let programCustomName: Record<string, string>;
                try {
                    programCustomName =
                        typeof formInstruction.program_custom_name === 'string'
                            ? JSON.parse(formInstruction.program_custom_name)
                            : formInstruction.program_custom_name;
                } catch (e) {
                    programCustomName = {};
                }

                let j = 0;
                for (const [tkey, tvalue] of Object.entries(defaultData)) {
                    const labelKey = `custo_customeLabel_${j}_${orgId}`;
                    orgSubmissionArry[labelKey] = tvalue;

                    if (
                        programCustomName[tkey] &&
                        programCustomName[tkey] !== ''
                    ) {
                        orgSubmissionArry[labelKey] = programCustomName[tkey];
                    }
                    j++;
                }
            } else {
                Object.keys(defaultData).forEach((key, index) => {
                    const labelKey = `custo_customeLabel_${index}_${orgId}`;
                    orgSubmissionArry[labelKey] = defaultData[parseInt(key)];
                });
            }

            return [orgSubmissionArry, translationsLabelArry];
        } catch (error) {
            this.logger.error(
                `Error in getHealthFormsSubmitFormFields: ${error.message}`,
                error.stack,
            );
            return [{}, {}];
        }
    }
}

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { BaseModuleService } from '../shared/base.service';
import { EntityKeyMap, FieldDataResult } from '../shared/types';
import {
    appConstant,
    SurveyPopupEntity,
    SurveyAnswersEntity,
    SurveyQuestionsEntity,
    CovidSettingsEntity,
    QuestionnaireSettingsEntity,
    CompanyMetaEntity,
    CompanySideMenuSettingsEntity,
    ActivePluginsEntity,
    CompaniesEntity,
    CovidQuestionsEntity,
    CovidAnswerEntity,
    CovidVaccinationTypeEntity,
} from '@common-constants';
@Injectable()
export class CommonModuleService extends BaseModuleService {
    constructor(
        @InjectRepository(
            SurveyPopupEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly surveyPopupRepo: Repository<SurveyPopupEntity>,

        @InjectRepository(
            SurveyAnswersEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly surveyanswerRepo: Repository<SurveyAnswersEntity>,

        @InjectRepository(
            SurveyQuestionsEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly surveyquestionRepo: Repository<SurveyQuestionsEntity>,

        @InjectRepository(
            CompaniesEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly companyRepo: Repository<CompaniesEntity>,

        @InjectRepository(
            CompanyMetaEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly companyMetaRepo: Repository<CompanyMetaEntity>,

        @InjectRepository(
            CompanySideMenuSettingsEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly sidemenusettingRepo: Repository<CompanySideMenuSettingsEntity>,

        @InjectRepository(
            ActivePluginsEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly activePluginRepo: Repository<ActivePluginsEntity>,

        @InjectRepository(
            CovidSettingsEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly covidsettingRepo: Repository<CovidSettingsEntity>,

        @InjectRepository(
            CovidQuestionsEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly covidquestionRepo: Repository<CovidQuestionsEntity>,

        @InjectRepository(
            CovidAnswerEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly covidanswerRepo: Repository<CovidAnswerEntity>,

        @InjectRepository(
            CovidVaccinationTypeEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly covidvaccinationtypeRepo: Repository<CovidVaccinationTypeEntity>,

        @InjectRepository(
            QuestionnaireSettingsEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly questionnairesettingRepo: Repository<QuestionnaireSettingsEntity>,
    ) {
        super('CommonModuleService');
    }

    async getSurveyPopupList(companyId?: string): Promise<EntityKeyMap> {
        return this.fetchAndMapEntities(
            this.surveyPopupRepo,
            companyId ? { org_id: companyId } : {},
            'id',
            'title',
            'getSurveys',
        );
    }

    async getMenuFields(orgId: string): Promise<FieldDataResult> {
        const menuArry: Record<string, string> = {};
        const menuLabelArry: Record<string, string> = {};

        try {
            if (!orgId) return [{}, {}];

            const selectOrgFieldList = parseInt(orgId, 10);

            const resSidemenusetting = await this.sidemenusettingRepo.findOne({
                where: { org_id: selectOrgFieldList },
                select: ['datasettingmenu'],
            });

            let activePlugins: string[] = [];
            const activePluginResult = await this.activePluginRepo.findOne({
                where: { company_id: selectOrgFieldList },
                select: ['plugin_name'],
            });

            if (activePluginResult && activePluginResult.plugin_name) {
                const pluginData = JSON.parse(activePluginResult.plugin_name);
                activePlugins = Object.keys(pluginData);
            }

            const jsonMenu = {
                Dashboard: 'Dashboard',
                Agreement: 'Agreement',
                Activities: 'Activities',
                'Activity Forms': 'Activity Forms',
                'Submit Form': 'Submit Form',
                'Submitted Forms': 'Submitted Forms',
                Reimbursements: 'Reimbursements',
                reimbursements_submit_form: 'Submit Form',
                reimbursements_submitted_forms: 'Submitted Forms',
                'Health Forms': 'Health Forms',
                'Submit Forms': 'Submit Forms',
                health_forms_submitted_forms: 'Submitted Forms',
                'Devices Sync': 'Fitbit Sync',
                'My Health': 'My Health',
                Assessment: 'Assessment',
                'Health Data': 'Health Data',
                Results: 'Results',
                Plans: 'My Plan',
                Trackers: 'Trackers',
                Nutrition: 'Nutrition',
                Exercise: 'Exercise',
                Measurements: 'Measurements',
                Biometrics: 'Biometrics',
                'Fitbit Sync': 'Fitbit Sync',
                Sleep: 'Sleep',
                'Covid Passport': 'Covid Passport',
                Events: 'Events',
                Challenges: 'Challenges',
                'Join Challenges': 'Join Challenges',
                'My Challenges': 'My Challenges',
                Quizzes: 'Quizzes',
                Support: 'Support',
                Internalmail: 'Internalmail',
                Email: 'Email',
                'Emotional Well-Being': 'Emotional Well-Being',
                Media: 'Media',
                'Fitness Videos': 'Fitness Videos',
                'Media Dashboard': 'Media Dashboard',
                Quicklink: 'Quicklink',
                'Weight Log': 'Weight Log',
                'Blood Pressure Log': 'Blood Pressure Log',
                'Cholesterol Log': 'Cholesterol Log',
                'Blood Glucose Log': 'Blood Glucose Log',
            };

            for (const [key, value] of Object.entries(jsonMenu)) {
                menuArry[`${key}_${orgId}`] = value;
                menuLabelArry[`${key}_${orgId}`] = value;
            }

            if (activePlugins.includes('Sidebar') && resSidemenusetting) {
                const resultdataSidemenusetting = JSON.parse(
                    resSidemenusetting.datasettingmenu || '{}',
                );

                for (const [key, value] of Object.entries(
                    resultdataSidemenusetting,
                )) {
                    if (!value) continue;

                    const simpleMenuKeys = [
                        'Dashboard',
                        'Agreement',
                        'Activities',
                        'Plans',
                        'Trackers',
                        'Events',
                        'Challenges',
                        'Quizzes',
                        'Support',
                        'Internalmail',
                        'Media',
                        'Quicklink',
                    ];

                    if (simpleMenuKeys.includes(key)) {
                        menuArry[`${key}_${orgId}`] = value as string;
                        menuLabelArry[`${key}_${orgId}`] = key;
                    }

                    const menuMappings: Record<string, string> = {
                        Activity_Forms: 'Activity Forms',
                        Activity_Forms_Submit_Form: 'Submit Form',
                        Activity_Forms_Submitted_Forms: 'Submitted Forms',
                        Reimbursements: 'Reimbursements',
                        Reimbursements_Submit_Form: 'Submit Form',
                        Reimbursements_Submitted_Forms: 'Submitted Forms',
                        Health_Forms: 'Health Forms',
                        Health_Forms_Submit_Forms: 'Submit Forms',
                        Devices_Sync: 'Devices Sync',
                        My_Health: 'My Health',
                        My_Health_Assessment: 'Assessment',
                        My_Health_Health_Data: 'Health Data',
                        My_Health_Results: 'Results',
                        Trackers_Fitbit_Sync: 'Fitbit Sync',
                        Trackers_Covid_Passport: 'Covid Passport',
                        Challenges_Join_Challenges: 'Join Challenges',
                        Challenges_My_Challenges: 'My Challenges',
                        Internalmail_Email: 'Email',
                        'Emotional_Well-Being': 'Emotional Well-Being',
                        Media_Fitness_Videos: 'Fitness Videos',
                        Media_Media_Dashboard: 'Media Dashboard',
                    };

                    if (menuMappings[key]) {
                        menuArry[`${menuMappings[key]}_${orgId}`] =
                            value as string;
                        menuLabelArry[`${menuMappings[key]}_${orgId}`] =
                            menuMappings[key];
                    }

                    if (
                        key.startsWith('Trackers_') &&
                        [
                            'Trackers_Nutrition',
                            'Trackers_Exercise',
                            'Trackers_Measurements',
                            'Trackers_Biometrics',
                        ].includes(key)
                    ) {
                        const trackerKey = key.replace('Trackers_', '');
                        menuArry[`${trackerKey}_${orgId}`] = value as string;
                        menuLabelArry[`${trackerKey}_${orgId}`] = trackerKey;
                    }
                }
            }

            return [menuArry, menuLabelArry];
        } catch (error) {
            this.logger.error(
                `Error in getMenuFields: ${error.message}`,
                error.stack,
            );
            return [menuArry, menuLabelArry];
        }
    }

    async getAgreementFields(orgId: string): Promise<FieldDataResult> {
        const dataArray: Record<string, string> = {};
        const dataLabelArray: Record<string, string> = {};

        try {
            if (!orgId) return [{}, {}];

            const selectOrgFieldList = parseInt(orgId, 10);

            const resultsData = await this.companyRepo
                .createQueryBuilder('company')
                .leftJoin(
                    'c_company_meta',
                    'companyMeta',
                    'companyMeta.org_id = company.id',
                ) // direct table join
                .where('company.id = :id', { id: selectOrgFieldList })
                .andWhere(
                    '(companyMeta.a_popup_title != :empty OR companyMeta.a_popup_text != :empty)',
                    { empty: '' },
                )
                .select([
                    'company.id',
                    'companyMeta.a_popup_title',
                    'companyMeta.a_popup_text',
                ])
                .getRawOne();

            if (resultsData) {
                dataArray[`agreement_title_content_${orgId}`] =
                    resultsData.companyMeta_a_popup_title || '';
                dataArray[`agreement_text_content_${orgId}`] =
                    this.safeDecodeAndParse(
                        resultsData.companyMeta_a_popup_text || '',
                    );
                dataLabelArray[`agreement_title_content_${orgId}`] =
                    'Agreement Title Content';
                dataLabelArray[`agreement_text_content_${orgId}`] =
                    'Agreement Text Content';
            }

            return [dataArray, dataLabelArray];
        } catch (error) {
            this.logger.error(
                `Error in getAgreementFields: ${error.message}`,
                error.stack,
            );
            return [dataArray, dataLabelArray];
        }
    }

    async getInformationPopupFields(orgId: string): Promise<FieldDataResult> {
        const dataArray: Record<string, string> = {};
        const dataLabelArray: Record<string, string> = {};

        try {
            if (!orgId) return [{}, {}];

            const selectOrgFieldList = parseInt(orgId, 10);

            const resultsData = await this.companyMetaRepo.findOne({
                where: {
                    org_id: selectOrgFieldList,
                },
                select: ['id', 'org_id', 'title', 'setting_dic'],
            });

            if (resultsData) {
                const companyMetaId = resultsData.id;
                dataArray[`inpo_pop_title_${orgId}_${companyMetaId}`] =
                    resultsData.title || '';
                dataArray[`inpo_setting_dic_${orgId}_${companyMetaId}`] =
                    this.safeDecodeAndParse(resultsData.setting_dic || '');
                dataLabelArray[`inpo_pop_title_${orgId}_${companyMetaId}`] =
                    'Title';
                dataLabelArray[`inpo_setting_dic_${orgId}_${companyMetaId}`] =
                    'Description';
            }

            return [dataArray, dataLabelArray];
        } catch (error) {
            this.logger.error(
                `Error in getInformationPopupFields: ${error.message}`,
                error.stack,
            );
            return [dataArray, dataLabelArray];
        }
    }

    async getSurveyPopupFields(
        orgId: string,
        formId: string,
    ): Promise<FieldDataResult> {
        const dataArray: Record<string, string> = {};
        const dataLabelArray: Record<string, string> = {};

        try {
            if (!orgId || !formId) return [{}, {}];

            const selectOrgFieldList = parseInt(orgId, 10);
            const selectFormFieldList = parseInt(formId, 10);

            const resultsSurveypopup = await this.surveyPopupRepo.findOne({
                where: {
                    id: selectFormFieldList,
                    org_id: selectOrgFieldList,
                },
                select: [
                    'id',
                    'title',
                    'description',
                    'additional_note',
                    'pass_need_text',
                    'pass_need_desc',
                    'fail_need_text',
                    'fail_need_desc',
                ],
            });

            if (resultsSurveypopup) {
                const surveypopupId = resultsSurveypopup.id;
                dataArray[`survey_popup_title_${orgId}_${surveypopupId}`] =
                    resultsSurveypopup.title || '';
                dataArray[
                    `survey_popup_description_${orgId}_${surveypopupId}`
                ] = this.safeDecodeAndParse(
                    resultsSurveypopup.description || '',
                );
                dataArray[`survey_popup_note_${orgId}_${surveypopupId}`] =
                    this.safeDecodeAndParse(
                        resultsSurveypopup.additional_note || '',
                    );
                dataArray[`pass_need_text_${orgId}_${surveypopupId}`] =
                    resultsSurveypopup.pass_need_text || '';
                dataArray[`pass_need_desc_${orgId}_${surveypopupId}`] =
                    this.safeDecodeAndParse(
                        resultsSurveypopup.pass_need_desc || '',
                    );
                dataArray[`fail_need_text_${orgId}_${surveypopupId}`] =
                    resultsSurveypopup.fail_need_text || '';
                dataArray[`fail_need_desc_${orgId}_${surveypopupId}`] =
                    this.safeDecodeAndParse(
                        resultsSurveypopup.fail_need_desc || '',
                    );

                dataLabelArray[`survey_popup_title_${orgId}_${surveypopupId}`] =
                    'Title';
                dataLabelArray[
                    `survey_popup_description_${orgId}_${surveypopupId}`
                ] = 'Description';
                dataLabelArray[`survey_popup_note_${orgId}_${surveypopupId}`] =
                    'Additional Note';
                dataLabelArray[`pass_need_text_${orgId}_${surveypopupId}`] =
                    'Pass Pop-up Text';
                dataLabelArray[`pass_need_desc_${orgId}_${surveypopupId}`] =
                    'Pass Pop-Up Description';
                dataLabelArray[`fail_need_text_${orgId}_${surveypopupId}`] =
                    'Fail Pop-up Test';
                dataLabelArray[`fail_need_desc_${orgId}_${surveypopupId}`] =
                    'Failed Pop-Up Description';
            }

            const resultsSurveyquestion = await this.surveyquestionRepo.find({
                where: {
                    popup_id: selectFormFieldList,
                    org_id: selectOrgFieldList,
                },
                select: ['id', 'title'],
            });

            if (resultsSurveyquestion && resultsSurveyquestion.length > 0) {
                for (const question of resultsSurveyquestion) {
                    const surveyquestionId = question.id;
                    dataArray[
                        `question_title_${orgId}_${formId}_${surveyquestionId}`
                    ] = question.title || '';
                }

                const questionIds = resultsSurveyquestion.map((q) => q.id);
                const resultsSurveyanswer = await this.surveyanswerRepo.find({
                    where: {
                        q_id: In(questionIds),
                    },
                    select: ['id', 'q_id', 'title'],
                });

                if (resultsSurveyanswer && resultsSurveyanswer.length > 0) {
                    for (const answer of resultsSurveyanswer) {
                        const surveyanswerId = answer.id;
                        const surveyQId = answer.q_id;
                        dataArray[
                            `surveyoptions_${surveyQId}_${surveyanswerId}`
                        ] = answer.title || '';
                    }
                }
            }

            return [dataArray, dataLabelArray];
        } catch (error) {
            this.logger.error(
                `Error in getSurveyPopupFields: ${error.message}`,
                error.stack,
            );
            return [dataArray, dataLabelArray];
        }
    }

    async getCovidPopupFields(orgId: string): Promise<FieldDataResult> {
        const dataArray: Record<string, string> = {};
        const dataLabelArray: Record<string, string> = {};

        try {
            if (!orgId) return [{}, {}];

            const selectOrgFieldList = parseInt(orgId, 10);

            const resultsCovidsetting = await this.covidsettingRepo.findOne({
                where: { org_id: selectOrgFieldList },
                select: [
                    'id',
                    'title',
                    'description',
                    'additional_note',
                    'need_checkup_text',
                    'need_checkup_desc',
                    'no_need_checkup_text',
                    'no_need_checkup_desc',
                ],
            });

            if (resultsCovidsetting) {
                const covidsettingId = resultsCovidsetting.id;
                dataArray[
                    `covidsetting_popup_title_${orgId}_${covidsettingId}`
                ] = resultsCovidsetting.title || '';
                dataArray[
                    `covidsetting_popup_description_${orgId}_${covidsettingId}`
                ] = this.safeDecodeAndParse(
                    resultsCovidsetting.description || '',
                );
                dataArray[
                    `covidsetting_popup_note_${orgId}_${covidsettingId}`
                ] = this.safeDecodeAndParse(
                    resultsCovidsetting.additional_note || '',
                );
                dataArray[`no_need_checkup_text_${orgId}_${covidsettingId}`] =
                    resultsCovidsetting.no_need_checkup_text || '';
                dataArray[`no_need_checkup_desc_${orgId}_${covidsettingId}`] =
                    this.safeDecodeAndParse(
                        resultsCovidsetting.no_need_checkup_desc || '',
                    );
                dataArray[`need_checkup_text_${orgId}_${covidsettingId}`] =
                    resultsCovidsetting.need_checkup_text || '';
                dataArray[`need_checkup_desc_${orgId}_${covidsettingId}`] =
                    this.safeDecodeAndParse(
                        resultsCovidsetting.need_checkup_desc || '',
                    );

                dataLabelArray[
                    `covidsetting_popup_title_${orgId}_${covidsettingId}`
                ] = 'Title';
                dataLabelArray[
                    `covidsetting_popup_description_${orgId}_${covidsettingId}`
                ] = 'Description';
                dataLabelArray[
                    `covidsetting_popup_note_${orgId}_${covidsettingId}`
                ] = 'Additional Note';
                dataLabelArray[
                    `no_need_checkup_text_${orgId}_${covidsettingId}`
                ] = 'Passed Pop-up Text';
                dataLabelArray[
                    `no_need_checkup_desc_${orgId}_${covidsettingId}`
                ] = 'Passed Pop-Up Description';
                dataLabelArray[`need_checkup_text_${orgId}_${covidsettingId}`] =
                    'Failed Pop-up Text';
                dataLabelArray[`need_checkup_desc_${orgId}_${covidsettingId}`] =
                    'Failed Pop-Up Description';
            }

            const resultsCovidquestion = await this.covidquestionRepo.find({
                where: { org_id: selectOrgFieldList },
                select: ['id', 'title'],
            });

            if (resultsCovidquestion && resultsCovidquestion.length > 0) {
                for (const question of resultsCovidquestion) {
                    const covidquestionId = question.id;
                    dataArray[`covidquestion_title_${covidquestionId}`] =
                        question.title || '';
                }

                const questionIds = resultsCovidquestion.map((q) => q.id);
                const resultsCovidanswer = await this.covidanswerRepo.find({
                    where: { q_id: In(questionIds) },
                    select: ['id', 'q_id', 'title'],
                });

                if (resultsCovidanswer && resultsCovidanswer.length > 0) {
                    for (const answer of resultsCovidanswer) {
                        const covidanswerId = answer.id;
                        const covidanswerQId = answer.q_id;
                        dataArray[
                            `covidanswer_${covidanswerQId}_${covidanswerId}`
                        ] = answer.title || '';
                    }
                }
            }

            const resultsCovidvaccinationtype =
                await this.covidvaccinationtypeRepo.find({
                    where: { org_id: selectOrgFieldList },
                    select: ['id', 'title'],
                });

            if (
                resultsCovidvaccinationtype &&
                resultsCovidvaccinationtype.length > 0
            ) {
                for (const vaccinationType of resultsCovidvaccinationtype) {
                    const covidvaccinationtypeId = vaccinationType.id;
                    dataArray[`vaccination_type_${covidvaccinationtypeId}`] =
                        vaccinationType.title || '';
                }
            }

            return [dataArray, dataLabelArray];
        } catch (error) {
            this.logger.error(
                `Error in getCovidPopupFields: ${error.message}`,
                error.stack,
            );
            return [dataArray, dataLabelArray];
        }
    }

    async getLoginPopupFields(orgId: string): Promise<FieldDataResult> {
        const dataArray: Record<string, string> = {};
        const dataLabelArray: Record<string, string> = {};

        try {
            if (!orgId) return [{}, {}];

            const selectOrgFieldList = parseInt(orgId, 10);

            const resultsData = await this.companyRepo
                .createQueryBuilder('company')
                .leftJoin(
                    'c_company_meta',
                    'companyMeta',
                    'companyMeta.org_id = company.id',
                ) // direct table join
                .where('company.id = :id', { id: selectOrgFieldList })
                .andWhere(
                    'companyMeta.user_popup_title != :empty AND companyMeta.user_popup_title IS NOT NULL',
                    { empty: '' },
                )
                .select(['company.id', 'companyMeta.user_popup_title'])
                .getRawOne();

            if (resultsData) {
                dataArray[`user_popup_title_${orgId}`] =
                    resultsData.companyMeta_user_popup_title || '';
                dataLabelArray[`user_popup_title_${orgId}`] = 'Popup Title';
            }

            return [dataArray, dataLabelArray];
        } catch (error) {
            this.logger.error(
                `Error in getLoginPopupFields: ${error.message}`,
                error.stack,
            );
            return [dataArray, dataLabelArray];
        }
    }

    async getQuestionnairePopupFields(orgId: string): Promise<FieldDataResult> {
        const dataArray: Record<string, string> = {};
        const dataLabelArray: Record<string, string> = {};

        try {
            if (!orgId) return [{}, {}];

            const selectOrgFieldList = parseInt(orgId, 10);

            const resultsQuestionnairesetting =
                await this.questionnairesettingRepo.findOne({
                    where: { org_id: selectOrgFieldList },
                    select: ['id', 'title', 'header_text'],
                });

            if (resultsQuestionnairesetting) {
                dataArray[`title_${orgId}`] =
                    resultsQuestionnairesetting.title || '';
                dataLabelArray[`title_${orgId}`] = 'Title';
                dataArray[`header_text_${orgId}`] = this.safeDecodeAndParse(
                    resultsQuestionnairesetting.header_text || '',
                );
                dataLabelArray[`header_text_${orgId}`] = 'Instructions';
            }

            return [dataArray, dataLabelArray];
        } catch (error) {
            this.logger.error(
                `Error in getQuestionnairePopupFields: ${error.message}`,
                error.stack,
            );
            return [dataArray, dataLabelArray];
        }
    }

    async getSpouseAuthorizedPopupFields(
        orgId: string,
    ): Promise<FieldDataResult> {
        const dataArray: Record<string, string> = {};
        const dataLabelArray: Record<string, string> = {};

        try {
            if (!orgId) return [{}, {}];

            const selectOrgFieldList = parseInt(orgId, 10);

            const resultsData = await this.companyRepo
                .createQueryBuilder('company')
                .leftJoin(
                    'c_company_meta',
                    'companyMeta',
                    'companyMeta.org_id = company.id',
                ) // direct table join
                .where('company.id = :id', { id: selectOrgFieldList })
                .andWhere('companyMeta.agreement_text != :empty', { empty: '' })
                .select(['company.id', 'companyMeta.agreement_text'])
                .getRawOne();

            if (resultsData) {
                dataArray[`agreement_text_${orgId}`] = this.safeDecodeAndParse(
                    resultsData.companyMeta_agreement_text || '',
                );
                dataLabelArray[`agreement_text_${orgId}`] = 'Agreement Text';
            }

            return [dataArray, dataLabelArray];
        } catch (error) {
            this.logger.error(
                `Error in getSpouseAuthorizedPopupFields: ${error.message}`,
                error.stack,
            );
            return [dataArray, dataLabelArray];
        }
    }
}

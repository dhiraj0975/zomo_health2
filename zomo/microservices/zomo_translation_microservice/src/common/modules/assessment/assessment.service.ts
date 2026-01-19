import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { BaseModuleService } from '../shared/base.service';
import { EntityKeyMap, FieldDataResult } from '../shared/types';
import {
    appConstant,
    AssessmentTextsEntity,
    lmspecificmetricsEntity,
    AssessmentHaQuestionsEntity,
    AssessmentHaOptionsEntity,
    AssessmentSettingsEntity,
    AssessmentResultsEntity,
    AssessmentTabsEntity,
    AssessmentQuestionsEntity,
    AssessmentOptionsEntity,
    CompaniesEntity,
} from '@common-constants';
@Injectable()
export class AssessmentModuleService extends BaseModuleService {
    constructor(
        @InjectRepository(
            AssessmentTextsEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly assessmentTextsRepo: Repository<AssessmentTextsEntity>,

        @InjectRepository(
            lmspecificmetricsEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly lmspecificmetricsRepo: Repository<lmspecificmetricsEntity>,

        @InjectRepository(
            AssessmentHaQuestionsEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly questionRepo: Repository<AssessmentHaQuestionsEntity>,

        @InjectRepository(
            AssessmentHaOptionsEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly optionsRepo: Repository<AssessmentHaOptionsEntity>,

        @InjectRepository(
            AssessmentSettingsEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly assessmentSettingsRepo: Repository<AssessmentSettingsEntity>,

        @InjectRepository(
            AssessmentResultsEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly assessmentResultsRepo: Repository<AssessmentResultsEntity>,

        @InjectRepository(
            AssessmentTabsEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly assessmentTabsRepo: Repository<AssessmentTabsEntity>,

        @InjectRepository(
            AssessmentQuestionsEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly assessmentQuestionsRepo: Repository<AssessmentQuestionsEntity>,

        @InjectRepository(
            AssessmentOptionsEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly assessmentOptionsRepo: Repository<AssessmentOptionsEntity>,

        @InjectRepository(
            CompaniesEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly companyRepo: Repository<CompaniesEntity>,
    ) {
        super('AssessmentModuleService');
    }

    async getAssessmentList(companyId?: string): Promise<EntityKeyMap> {
        if (companyId === 'hra') {
            return {
                '1': 'Current Health',
                '2': 'Prevention',
                '3': 'Nutrition',
                '4': 'Exercise',
                '5': 'Emotional Health',
                assessment_text: 'Assessment Text',
                biometrocs_text: 'Biometrics Text',
            };
        }
        try {
            const companies = await this.companyRepo.find({
                where: { deleted: 0 },
                select: ['id', 'company_name'],
                order: { id: 'ASC' } as any,
            });
            return companies.reduce((acc, company) => {
                acc[String(company.id)] = company.company_name;
                return acc;
            }, {} as EntityKeyMap);
        } catch (error) {
            this.logger.error(
                `Error in getCompaniesList: ${error.message}`,
                error.stack,
            );
            return {};
        }
    }

    async getHraAssessmentFields(
        selectFormFieldList: string,
    ): Promise<FieldDataResult> {
        try {
            if (selectFormFieldList === 'assessment_text')
                return await this.getAssessmentTextFields();
            if (selectFormFieldList === 'biometrocs_text')
                return await this.getBiometricsTextFields();
            return await this.getQuestionCategoryFields(selectFormFieldList);
        } catch (error) {
            this.logger.error(
                `Error in getHraAssessmentFields: ${error.message}`,
                error.stack,
            );
            return [{}, {}];
        }
    }

    async getAssessmentTextFields(): Promise<FieldDataResult> {
        const questionArry: Record<string, string> = {};
        const questionLabelArry: Record<string, string> = {};
        try {
            const resultAssessmentText = await this.assessmentTextsRepo.find({
                where: { language_id: 1 },
                select: [
                    'id',
                    'ass_sec_id',
                    'low_risk',
                    'mod_risk',
                    'high_risk',
                    'learn_more',
                ],
            });
            if (resultAssessmentText && resultAssessmentText.length > 0) {
                for (const avalue of resultAssessmentText) {
                    const textId = avalue.id;
                    const textSecId = avalue.ass_sec_id;
                    questionArry[
                        `assementtext_low_risk_${textSecId}_${textId}`
                    ] = this.safeDecodeAndParse(avalue.low_risk);
                    questionArry[
                        `assementtext_mod_risk_${textSecId}_${textId}`
                    ] = this.safeDecodeAndParse(avalue.mod_risk);
                    questionArry[
                        `assementtext_high_risk_${textSecId}_${textId}`
                    ] = this.safeDecodeAndParse(avalue.high_risk);
                    questionArry[
                        `assementtext_learn_more_${textSecId}_${textId}`
                    ] = this.safeDecodeAndParse(avalue.learn_more);
                }
            }
            return [questionArry, questionLabelArry];
        } catch (error) {
            this.logger.error(
                `Error in getAssessmentTextFields: ${error.message}`,
                error.stack,
            );
            return [questionArry, questionLabelArry];
        }
    }

    async getBiometricsTextFields(): Promise<FieldDataResult> {
        const questionArry: Record<string, string> = {};
        const questionLabelArry: Record<string, string> = {};
        try {
            const [resultBText, resultLmspecificmetric] = await Promise.all([
                this.assessmentTextsRepo.find({ where: { language_id: 1 } }),
                this.lmspecificmetricsRepo.find({ where: { language_id: 1 } }),
            ]);
            const learnMoreData: Record<number, string> = {};
            resultLmspecificmetric.forEach((item) => {
                learnMoreData[item.text_id] = item.learnmore;
            });
            const biometricMappings: Record<number, Record<string, string>> = {
                6: {
                    GlowRisk: 'low_risk',
                    GPrediabetes: 'mod_risk',
                    GHighRisk: 'high_risk',
                },
                7: {
                    BLowRisk: 'low_risk',
                    BPrehypertension: 'mod_risk',
                    BIHypertension: 'high_risk',
                    BIIHypertension: 'very_high_risk',
                },
                8: {
                    BLowRiskdiastolic: 'low_risk',
                    BPrehypertensiondiastolic: 'mod_risk',
                    BIHypertensiondiastolic: 'high_risk',
                    BIIHypertensiondiastolic: 'very_high_risk',
                },
                9: {
                    BMILowRisk: 'low_risk',
                    BMIModerateRisk: 'mod_risk',
                    BMIHighRisk: 'high_risk',
                    BMIVeryHigh: 'very_high_risk',
                },
                10: {
                    CHOLLowRisk: 'low_risk',
                    CHOLModerateRisk: 'mod_risk',
                    CHOLHighRisk: 'high_risk',
                },
                11: {
                    LDLLowRisk: 'low_risk',
                    LDLModerateRisk: 'mod_risk',
                    LDLHighRisk: 'high_risk',
                    LDLVeryHigh: 'very_high_risk',
                },
                12: {
                    MHDLLowRisk: 'low_risk',
                    MHDLMediumRisk: 'mod_risk',
                    MHDLHighRisk: 'high_risk',
                },
                13: {
                    WHDLLowRisk: 'low_risk',
                    WHDLMediumRisk: 'mod_risk',
                    WHDLHighRisk: 'high_risk',
                },
                14: {
                    TryLowRisk: 'low_risk',
                    TryMediumRisk: 'mod_risk',
                    TryHighRisk: 'high_risk',
                    TryVeryHighRisk: 'very_high_risk',
                },
                15: {
                    cholHDLLowRisk: 'low_risk',
                    cholHDLAboveAvgRisk: 'mod_risk',
                },
            };
            const prefixMap: Record<number, string> = {
                6: 'Glucose',
                7: 'BloodPressure',
                8: 'BloodPressureDiastolic',
                9: 'BMI',
                10: 'TotalCholesterol',
                11: 'LDLCholesterol',
                12: 'HDLCholesterolMen',
                13: 'HDLCholesterolWomen',
                14: 'Tryglicerides',
                15: 'TCHDL',
            };
            if (resultBText && resultBText.length > 0) {
                for (const bvalue of resultBText) {
                    const btextId = bvalue.ass_sec_id;
                    const mappings = biometricMappings[btextId];
                    const prefix = prefixMap[btextId];
                    if (mappings && prefix) {
                        Object.entries(mappings).forEach(([key, field]) => {
                            questionArry[`${prefix}_${key}_${btextId}`] =
                                this.safeDecodeAndParse(bvalue[field]);
                        });
                        if (learnMoreData[btextId]) {
                            questionArry[`${prefix}_learnmore_${btextId}`] =
                                this.safeDecodeAndParse(learnMoreData[btextId]);
                        }
                    }
                }
            }
            return [questionArry, questionLabelArry];
        } catch (error) {
            this.logger.error(
                `Error in getBiometricsTextFields: ${error.message}`,
                error.stack,
            );
            return [questionArry, questionLabelArry];
        }
    }

    async getQuestionCategoryFields(
        selectFormFieldList: string,
    ): Promise<FieldDataResult> {
        const questionArry: Record<string, string> = {};
        const questionLabelArry: Record<string, string> = {};
        try {
            const resultsQuestion = await this.questionRepo.find({
                where: {
                    questioncat_id: parseInt(selectFormFieldList),
                    main_question_id: 0,
                },
                select: ['id', 'question_title'],
            });
            if (resultsQuestion && resultsQuestion.length > 0) {
                for (const quevalue of resultsQuestion) {
                    const questionId = quevalue.id;
                    questionArry[`question_title_${questionId}`] =
                        quevalue.question_title;
                    const resultsOptions = await this.optionsRepo.find({
                        where: { question_id: questionId },
                        select: ['id', 'option_title'],
                    });
                    if (resultsOptions && resultsOptions.length > 0) {
                        for (const optvalue of resultsOptions) {
                            questionArry[
                                `option_title_${questionId}_${optvalue.id}`
                            ] = optvalue.option_title;
                        }
                    }
                }
            }
            return [questionArry, questionLabelArry];
        } catch (error) {
            this.logger.error(
                `Error in getQuestionCategoryFields: ${error.message}`,
                error.stack,
            );
            return [questionArry, questionLabelArry];
        }
    }

    async getEhaAssessmentFields(
        selectFormFieldList: string,
    ): Promise<FieldDataResult> {
        const questionArry: Record<string, string> = {};
        const questionLabelArry: Record<string, string> = {};
        try {
            const resultsAssessmentSettings =
                await this.assessmentSettingsRepo.findOne({
                    where: { organization_id: parseInt(selectFormFieldList) },
                });
            if (resultsAssessmentSettings) {
                const settingsId = resultsAssessmentSettings.id;
                questionArry[
                    `assessment_banner_title_${selectFormFieldList}_${settingsId}`
                ] = resultsAssessmentSettings.banner_title;
                questionArry[
                    `assessment_banner_description_${selectFormFieldList}_${settingsId}`
                ] = this.safeDecodeAndParse(
                    resultsAssessmentSettings.banner_description,
                );
                questionLabelArry[
                    `assessment_banner_title_${selectFormFieldList}_${settingsId}`
                ] = 'Banner Title';
                questionLabelArry[
                    `assessment_banner_description_${selectFormFieldList}_${settingsId}`
                ] = 'Banner Description';
                questionArry[
                    `assessment_result_top_decscription_${selectFormFieldList}_${settingsId}`
                ] = this.safeDecodeAndParse(
                    resultsAssessmentSettings.result_top_decscription,
                );
                questionArry[
                    `assessment_result_bottom_decscription_${selectFormFieldList}_${settingsId}`
                ] = this.safeDecodeAndParse(
                    resultsAssessmentSettings.result_bottom_decscription,
                );
                questionLabelArry[
                    `assessment_result_top_decscription_${selectFormFieldList}_${settingsId}`
                ] = 'Result Top Description';
                questionLabelArry[
                    `assessment_result_bottom_decscription_${selectFormFieldList}_${settingsId}`
                ] = 'Result Bottom Description';
            }
            const resultAssessmentResults =
                await this.assessmentResultsRepo.find({
                    where: {
                        organization_id: parseInt(selectFormFieldList),
                        status: Not(2),
                    },
                    select: [
                        'id',
                        'title',
                        'marker-low',
                        'marker-mod',
                        'marker-high',
                        'marker-common',
                        'marker-common_last',
                    ],
                });
            if (resultAssessmentResults && resultAssessmentResults.length > 0) {
                for (const arValue of resultAssessmentResults) {
                    const arResultsId = arValue.id;
                    questionArry[
                        `assessment_title_${selectFormFieldList}_${arResultsId}`
                    ] = arValue.title;
                    questionArry[
                        `assessment_markerlow_${selectFormFieldList}_${arResultsId}`
                    ] = this.safeDecodeAndParse(arValue['marker-low']);
                    questionArry[
                        `assessment_markermod_${selectFormFieldList}_${arResultsId}`
                    ] = this.safeDecodeAndParse(arValue['marker-mod']);
                    questionArry[
                        `assessment_markerhigh_${selectFormFieldList}_${arResultsId}`
                    ] = this.safeDecodeAndParse(arValue['marker-high']);
                    questionArry[
                        `assessment_markercommon_${selectFormFieldList}_${arResultsId}`
                    ] = this.safeDecodeAndParse(arValue['marker-common']);
                    questionArry[
                        `assessment_markercommonlast_${selectFormFieldList}_${arResultsId}`
                    ] = this.safeDecodeAndParse(arValue['marker-common_last']);
                }
            }
            const resultAssessmentTabs = await this.assessmentTabsRepo.find({
                where: { organization_id: parseInt(selectFormFieldList) },
                select: ['id', 'title'],
            });
            if (resultAssessmentTabs && resultAssessmentTabs.length > 0) {
                for (const tabValue of resultAssessmentTabs) {
                    questionArry[
                        `assessment_tabs_title_${selectFormFieldList}_${tabValue.id}`
                    ] = tabValue.title;
                }
            }
            const assessmentTabIDsArr = resultAssessmentTabs.map(
                (tab) => tab.id,
            );
            if (assessmentTabIDsArr.length > 0) {
                const assessmentQuestions = await this.assessmentQuestionsRepo
                    .createQueryBuilder('aq')
                    .innerJoinAndSelect(
                        'ha_assessment_questions_details',
                        'aqd',
                        'aqd.question_id = aq.id AND aqd.status != 2 AND aqd.main_question_id = 0',
                    )
                    .where('aq.tab_id IN (:...tabIds)', {
                        tabIds: assessmentTabIDsArr,
                    })
                    .select([
                        'aq.id',
                        'aq.tab_id',
                        'aqd.id',
                        'aqd.question_title',
                    ])
                    .getRawMany();
                if (assessmentQuestions && assessmentQuestions.length > 0) {
                    for (const aqValue of assessmentQuestions) {
                        questionArry[
                            `assessment_question_title_${aqValue.aq_tab_id}_${aqValue.aq_id}`
                        ] = aqValue.aqd_question_title;
                    }
                }
                const quesIds = assessmentQuestions.map((q) => q.aq_id);
                if (quesIds.length > 0) {
                    const assessmentOptions = await this.assessmentOptionsRepo
                        .createQueryBuilder('ao')
                        .innerJoinAndSelect(
                            'ha_assessment_options_details',
                            'aod',
                            'aod.option_id = ao.id AND aod.status != 2 AND aod.main_option_id = 0',
                        )
                        .where('ao.question_id IN (:...quesIds)', { quesIds })
                        .andWhere('(ao.parent_id IS NULL OR ao.parent_id = 0)')
                        .andWhere('ao.status != 2')
                        .select([
                            'ao.id',
                            'aod.option_title',
                            'ao.question_id',
                            'ao.message_add',
                        ])
                        .getRawMany();
                    if (assessmentOptions && assessmentOptions.length > 0) {
                        for (const qoValue of assessmentOptions) {
                            questionArry[
                                `assessment_option_title_${qoValue.ao_question_id}_${qoValue.ao_id}`
                            ] = qoValue.aod_option_title;
                            if (
                                qoValue.ao_message_add &&
                                qoValue.ao_message_add !== ''
                            ) {
                                questionArry[
                                    `assessment_message_${qoValue.ao_question_id}_${qoValue.ao_id}`
                                ] = this.safeDecodeAndParse(
                                    qoValue.ao_message_add,
                                );
                            }
                        }
                    }
                }
            }
            return [questionArry, questionLabelArry];
        } catch (error) {
            this.logger.error(
                `Error in getEhaAssessmentFields: ${error.message}`,
                error.stack,
            );
            return [questionArry, questionLabelArry];
        }
    }
}

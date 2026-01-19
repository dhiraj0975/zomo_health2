import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { BaseModuleService } from '../shared/base.service';
import { EntityKeyMap, FieldDataResult } from '../shared/types';
import {
    appConstant,
    QuizQuizzesEntity,
    QuizCategoriesEntity,
    QuizAssignQuizOrgEntity,
    QuizSectionEntity,
    QuizDetailsEntity,
    QuizMultipleQuestionEntity,
    QuizMultipleChoiceQuestionEntity,
    QuizMultipleResponseQuestionEntity,
    QuizMatchingDropDownQuestionEntity,
    QuizMatchingDragDropQuestionEntity,
    QuizFillUpQuestionEntity,
    CompaniesEntity,
} from '@common-constants';
@Injectable()
export class QuizModuleService extends BaseModuleService {
    constructor(
        @InjectRepository(
            QuizQuizzesEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly quizRepo: Repository<QuizQuizzesEntity>,

        @InjectRepository(
            QuizCategoriesEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly quizCategoryRepo: Repository<QuizCategoriesEntity>,

        @InjectRepository(
            CompaniesEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly companyRepo: Repository<CompaniesEntity>,

        @InjectRepository(
            QuizAssignQuizOrgEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly quizAssignOrgRepo: Repository<QuizAssignQuizOrgEntity>,

        @InjectRepository(
            QuizSectionEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly quizSectionRepo: Repository<QuizSectionEntity>,

        @InjectRepository(
            QuizDetailsEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly quizDetailRepo: Repository<QuizDetailsEntity>,

        @InjectRepository(
            QuizMultipleQuestionEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly quizMultipleQuestionRepo: Repository<QuizMultipleQuestionEntity>,

        @InjectRepository(
            QuizMultipleChoiceQuestionEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly quizMultipleChoiceRepo: Repository<QuizMultipleChoiceQuestionEntity>,

        @InjectRepository(
            QuizMultipleResponseQuestionEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly quizMultipleResponseRepo: Repository<QuizMultipleResponseQuestionEntity>,

        @InjectRepository(
            QuizMatchingDropDownQuestionEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly quizMatchingDropdownRepo: Repository<QuizMatchingDropDownQuestionEntity>,

        @InjectRepository(
            QuizMatchingDragDropQuestionEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly quizMatchingDragDropRepo: Repository<QuizMatchingDragDropQuestionEntity>,

        @InjectRepository(
            QuizFillUpQuestionEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly quizFillupRepo: Repository<QuizFillUpQuestionEntity>,
    ) {
        super('QuizModuleService');
    }

    async getQuizList(companyId?: string): Promise<EntityKeyMap> {
        try {
            const companyIdNum = companyId
                ? parseInt(companyId, 10)
                : undefined;
            const company = await this.companyRepo.findOne({
                where: { id: companyIdNum },
                select: ['code'],
            });
            if (!company?.code) return {};

            const rows = await this.quizRepo
                .createQueryBuilder('quiz')
                .innerJoin(
                    'qz_assign_quiz_orgs',
                    'assign',
                    'assign.quiz_id = quiz.id',
                )
                .select(['quiz.id AS id', 'quiz.quiz_name AS quiz_name'])
                .where('quiz.quiz_type = :type', { type: 'Normal' })
                .andWhere('assign.organization_id = :orgId', {
                    orgId: company.code,
                })
                .andWhere('quiz.quiz_name != :empty', { empty: '' })
                .getRawMany();

            return rows.reduce((acc, row) => {
                acc[row.id] = row.quiz_name;
                return acc;
            }, {} as EntityKeyMap);
        } catch (error) {
            this.logger.error(
                `Error in getQuizzes: ${error.message}`,
                error.stack,
            );
            return {};
        }
    }

    async getQuizCategoryList(): Promise<EntityKeyMap> {
        return this.fetchAndMapEntities(
            this.quizCategoryRepo,
            { status: Not(2), name: Not(IsNull()) },
            'id',
            'name',
            'getQuizCategories',
        );
    }

    async getQuizFields(
        orgId: string,
        quizId: string,
    ): Promise<FieldDataResult> {
        const quizArry: Record<string, string> = {};
        const quizLabelArry: Record<string, string> = {};

        try {
            const quiz = await this.quizRepo.findOne({
                where: { id: parseInt(quizId, 10), quiz_type: 'Normal' },
                select: ['id', 'quiz_name', 'quiz_description'],
            });
            console.log('id', parseInt(quizId, 10));
            if (!quiz) return [{}, {}];

            const selectOrgFieldList = orgId ? parseInt(orgId, 10) : 0;

            if (selectOrgFieldList !== 0) {
                const company = await this.companyRepo.findOne({
                    where: { id: selectOrgFieldList },
                    select: ['code'],
                });

                if (company?.code) {
                    const assignQuiz = await this.quizAssignOrgRepo.findOne({
                        where: {
                            quiz_id: parseInt(quizId, 10),
                            organization_id: company.code,
                            status: 1,
                            vmsg: Not(IsNull()),
                        },
                        select: ['vmsg'],
                    });

                    if (assignQuiz && assignQuiz.vmsg) {
                        quizArry[`vmsg_${orgId}_${quizId}`] = assignQuiz.vmsg;
                        quizLabelArry[`vmsg_${orgId}_${quizId}`] =
                            'For Preview Video Link Message';
                    }
                }
            } else {
                quizArry[`quiz_name_${quizId}`] = quiz.quiz_name;
                quizArry[`quiz_description_${quizId}`] =
                    this.safeDecodeAndParse(quiz.quiz_description || '');
                quizLabelArry[`quiz_name_${quizId}`] = 'Quiz Name';
                quizLabelArry[`quiz_description_${quizId}`] =
                    'Quiz Description';

                const quizSections = await this.quizSectionRepo.find({
                    where: { quiz_id: parseInt(quizId, 10) },
                    select: ['id', 'name', 'description'],
                });

                if (quizSections && quizSections.length > 0) {
                    for (const section of quizSections) {
                        quizArry[`section_name_${section.id}`] = section.name;
                        quizArry[`section_description_${section.id}`] =
                            this.safeDecodeAndParse(section.description || '');
                    }
                }

                const quizDetails = await this.quizDetailRepo.find({
                    where: { quiz_id: parseInt(quizId, 10) },
                    select: ['id', 'quiz_question', 'answer_desc'],
                });

                if (quizDetails && quizDetails.length > 0) {
                    for (const detail of quizDetails) {
                        const questionID = detail.id;
                        quizArry[`question_name_${questionID}`] =
                            detail.quiz_question;
                        quizArry[`question_answer_${questionID}`] =
                            detail.answer_desc || '';

                        const multipleQuestions =
                            await this.quizMultipleQuestionRepo.find({
                                where: { question_id: questionID },
                                select: ['id', 'question'],
                            });

                        if (multipleQuestions && multipleQuestions.length > 0) {
                            for (const mq of multipleQuestions) {
                                quizArry[
                                    `multiple_question_${questionID}_${mq.id}`
                                ] = mq.question;
                            }
                        }

                        const multipleChoices =
                            await this.quizMultipleChoiceRepo.find({
                                where: { question_id: questionID },
                                select: [
                                    'id',
                                    'opt_1',
                                    'opt_2',
                                    'opt_3',
                                    'opt_4',
                                    'opt_5',
                                    'opt_6',
                                ],
                            });

                        if (multipleChoices && multipleChoices.length > 0) {
                            for (const mc of multipleChoices) {
                                quizArry[
                                    `multiplechoice_option_${questionID}_opt1_${mc.id}`
                                ] = mc.opt_1 || '';
                                quizArry[
                                    `multiplechoice_option_${questionID}_opt2_${mc.id}`
                                ] = mc.opt_2 || '';
                                quizArry[
                                    `multiplechoice_option_${questionID}_opt3_${mc.id}`
                                ] = mc.opt_3 || '';
                                quizArry[
                                    `multiplechoice_option_${questionID}_opt4_${mc.id}`
                                ] = mc.opt_4 || '';
                                quizArry[
                                    `multiplechoice_option_${questionID}_opt5_${mc.id}`
                                ] = mc.opt_5 || '';
                                quizArry[
                                    `multiplechoice_option_${questionID}_opt6_${mc.id}`
                                ] = mc.opt_6 || '';
                            }
                        }

                        const multipleResponses =
                            await this.quizMultipleResponseRepo.find({
                                where: { question_id: questionID },
                                select: [
                                    'id',
                                    'choice_1',
                                    'choice_2',
                                    'choice_3',
                                    'choice_4',
                                    'choice_5',
                                    'choice_6',
                                ],
                            });

                        if (multipleResponses && multipleResponses.length > 0) {
                            for (const mr of multipleResponses) {
                                quizArry[
                                    `multipleresponse_option_${questionID}_choice1_${mr.id}`
                                ] = mr.choice_1 || '';
                                quizArry[
                                    `multipleresponse_option_${questionID}_choice2_${mr.id}`
                                ] = mr.choice_2 || '';
                                quizArry[
                                    `multipleresponse_option_${questionID}_choice3_${mr.id}`
                                ] = mr.choice_3 || '';
                                quizArry[
                                    `multipleresponse_option_${questionID}_choice4_${mr.id}`
                                ] = mr.choice_4 || '';
                                quizArry[
                                    `multipleresponse_option_${questionID}_choice5_${mr.id}`
                                ] = mr.choice_5 || '';
                                quizArry[
                                    `multipleresponse_option_${questionID}_choice6_${mr.id}`
                                ] = mr.choice_6 || '';
                            }
                        }

                        const matchingDropdowns =
                            await this.quizMatchingDropdownRepo.find({
                                where: { question_id: questionID },
                                select: ['id', 'drop_options'],
                            });

                        if (matchingDropdowns && matchingDropdowns.length > 0) {
                            for (const md of matchingDropdowns) {
                                quizArry[
                                    `matchingdropdown_option_${questionID}_${md.id}`
                                ] = md.drop_options || '';
                            }
                        }

                        const dragDrops =
                            await this.quizMatchingDragDropRepo.find({
                                where: { question_id: questionID },
                                select: ['id', 'question', 'answer'],
                            });

                        if (dragDrops && dragDrops.length > 0) {
                            for (const dd of dragDrops) {
                                quizArry[
                                    `dragdrop_question_${questionID}_${dd.id}`
                                ] = dd.question || '';
                                quizArry[
                                    `dragdrop_answer_${questionID}_${dd.id}`
                                ] = dd.answer || '';
                            }
                        }

                        const fillups = await this.quizFillupRepo.find({
                            where: { question_id: questionID },
                            select: ['id', 'blank_options'],
                        });

                        if (fillups && fillups.length > 0) {
                            for (const fl of fillups) {
                                quizArry[
                                    `fillup_option_${questionID}_${fl.id}`
                                ] = fl.blank_options || '';
                            }
                        }
                    }
                }
            }
            return [quizArry, quizLabelArry];
        } catch (error) {
            this.logger.error(
                `Error in getQuizFields: ${error.message}`,
                error.stack,
            );
            return [quizArry, quizLabelArry];
        }
    }

    async getQuizCategoryFields(categoryId: string): Promise<FieldDataResult> {
        return this.fetchSingleEntityFields(
            this.quizCategoryRepo,
            categoryId,
            { status: Not(2) },
            {
                quiz_category_name: 'name',
                quiz_category_description: 'description',
            },
            'getQuizCategoryFields',
        );
    }
}

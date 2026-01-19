// emotional-wellbeing-module.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
    FieldDataResult,
    EmotionalWellbeingFieldParams,
} from './emotional-wellbeing.types';
import {
    appConstant,
    EmotionalWellBeingCategoryEntity,
    EmotionalWellBeingPostEntity,
} from '@common-constants';

@Injectable()
export class EmotionalWellbeingModuleService {
    private readonly logger = new Logger(EmotionalWellbeingModuleService.name);

    constructor(
        @InjectRepository(
            EmotionalWellBeingCategoryEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly emotionalwellbeingRepo: Repository<EmotionalWellBeingCategoryEntity>,
        @InjectRepository(
            EmotionalWellBeingPostEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly emotionalwellbeingpostRepo: Repository<EmotionalWellBeingPostEntity>,
    ) {}

    private safeDecodeAndParse(text: string): string {
        try {
            return text
                ? text
                      .replace(/&lt;/g, '<')
                      .replace(/&gt;/g, '>')
                      .replace(/&amp;/g, '&')
                : '';
        } catch {
            return text || '';
        }
    }

    async getEmotionalWellbeingFields(
        params: EmotionalWellbeingFieldParams
    ): Promise<FieldDataResult> {
        const { orgId, formId } = params;
        const emotionalwellbeingCatArry: Record<string, string> = {};
        const emotionalwellbeingCatLabelArry: Record<string, string> = {};

        try {
            if (!orgId || !formId) return [{}, {}];

            const selectOrgFieldList = parseInt(orgId, 10);
            const selectFormFieldList = parseInt(formId, 10);

            const resultEmotionalwellbeing =
                await this.emotionalwellbeingRepo.find({
                    where: {
                        id: selectFormFieldList,
                        org_id: selectOrgFieldList,
                    },
                    select: ['id', 'title', 'description'],
                });

            if (
                resultEmotionalwellbeing &&
                resultEmotionalwellbeing.length > 0
            ) {
                const ewbcatId = resultEmotionalwellbeing[0].id;
                emotionalwellbeingCatArry[`category_title_${ewbcatId}`] =
                    resultEmotionalwellbeing[0].title || '';
            }

            return [emotionalwellbeingCatArry, emotionalwellbeingCatLabelArry];
        } catch (error) {
            this.logger.error(
                `Error in getEmotionalWellbeingFields: ${error.message}`,
                error.stack,
            );
            return [emotionalwellbeingCatArry, emotionalwellbeingCatLabelArry];
        }
    }

    async getEmotionalWellbeingMainCollection(
        orgId: string,
        formId: string,
        suboption1value: string,
    ): Promise<FieldDataResult> {
        const emotionalwellbeingCatArry: Record<string, string> = {};
        const emotionalwellbeingCatLabelArry: Record<string, string> = {};

        try {
            if (!orgId || !suboption1value) return [{}, {}];

            const selectOrgFieldList = parseInt(orgId, 10);

            const getMaincollectionCategoryList =
                await this.emotionalwellbeingpostRepo
                    .createQueryBuilder('post')
                    .select('post.maincollection')
                    .where('post.maincollection = :maincollection', {
                        maincollection: suboption1value,
                    })
                    .andWhere('post.org_id = :orgId', {
                        orgId: selectOrgFieldList,
                    })
                    .groupBy('post.maincollection')
                    .getRawMany();

            if (
                getMaincollectionCategoryList &&
                getMaincollectionCategoryList.length > 0
            ) {
                const maincollectionValue =
                    getMaincollectionCategoryList[0].post_maincollection;
                const expldKey = maincollectionValue.replace(
                    /[^a-zA-Z0-9]/g,
                    '',
                );
                emotionalwellbeingCatArry[`${expldKey}_${orgId}_${formId}`] =
                    maincollectionValue;
            }

            return [emotionalwellbeingCatArry, emotionalwellbeingCatLabelArry];
        } catch (error) {
            this.logger.error(
                `Error in getEmotionalWellbeingMainCollection: ${error.message}`,
                error.stack,
            );
            return [emotionalwellbeingCatArry, emotionalwellbeingCatLabelArry];
        }
    }

    async getEmotionalWellbeingPostDetails(
        orgId: string,
        formId: string,
        suboption2value: string,
    ): Promise<FieldDataResult> {
        const emotionalwellbeingPostArry: Record<string, string> = {};
        const emotionalwellbeingPostLabelArry: Record<string, string> = {};

        try {
            if (!orgId || !formId || !suboption2value) return [{}, {}];

            const selectOrgFieldList = parseInt(orgId, 10);
            const selectFormFieldList = parseInt(formId, 10);
            const selectSuboption2Value = parseInt(suboption2value, 10);

            const resultEmotionalwellbeingpost =
                await this.emotionalwellbeingpostRepo.findOne({
                    where: {
                        cat_id: selectFormFieldList,
                        org_id: selectOrgFieldList,
                        id: selectSuboption2Value,
                    },
                    select: ['id', 'title', 'short_desc', 'more_desc'],
                });

            if (resultEmotionalwellbeingpost) {
                const ewbpostId = resultEmotionalwellbeingpost.id;
                emotionalwellbeingPostArry[
                    `post_title_${formId}_${ewbpostId}_${orgId}`
                ] = resultEmotionalwellbeingpost.title || '';
                emotionalwellbeingPostArry[
                    `post_linktitle_${formId}_${ewbpostId}_${orgId}`
                    ] = resultEmotionalwellbeingpost.link_title || '';
                emotionalwellbeingPostArry[
                    `post_shortdesc_${formId}_${ewbpostId}_${orgId}`
                ] = this.safeDecodeAndParse(
                    resultEmotionalwellbeingpost.short_desc || '',
                );
                emotionalwellbeingPostArry[
                    `post_moredesc_${formId}_${ewbpostId}_${orgId}`
                ] = this.safeDecodeAndParse(
                    resultEmotionalwellbeingpost.more_desc || '',
                );

                emotionalwellbeingPostLabelArry[
                    `post_title_${formId}_${ewbpostId}_${orgId}`
                ] = 'Title';
                emotionalwellbeingPostLabelArry[
                    `post_linktitle_${formId}_${ewbpostId}_${orgId}`
                    ] = 'Link Title';
                emotionalwellbeingPostLabelArry[
                    `post_shortdesc_${formId}_${ewbpostId}_${orgId}`
                ] = 'Short Description';
                emotionalwellbeingPostLabelArry[
                    `post_moredesc_${formId}_${ewbpostId}_${orgId}`
                ] = 'Long Description';
            }

            return [
                emotionalwellbeingPostArry,
                emotionalwellbeingPostLabelArry,
            ];
        } catch (error) {
            this.logger.error(
                `Error in getEmotionalWellbeingPostDetails: ${error.message}`,
                error.stack,
            );
            return [
                emotionalwellbeingPostArry,
                emotionalwellbeingPostLabelArry,
            ];
        }
    }
}

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseModuleService } from '../shared/base.service';
import { EntityKeyMap, FieldDataResult } from '../shared/types';
import {
    appConstant,
    MediaCategoryEntity,
    MediaPostEntity,
    MediaFitnessVideosEntity,
    MediaFitnessCategoryEntity,
    MediaFitnessFocusEntity,
    MediaFitnessEquipmentEntity,
    MediaFitnessSeriesEntity,
    MediaFitnessInstructorEntity,
    MediaFitnessDifficultyEntity,
    MediaFitnessDurationRangeEntity,
    EmotionalWellBeingCategoryEntity,
    EmotionalWellBeingPostEntity,
} from '@common-constants';
@Injectable()
export class MediaModuleService extends BaseModuleService {
    constructor(
        @InjectRepository(
            MediaCategoryEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly mediaCategoryRepo: Repository<MediaCategoryEntity>,

        @InjectRepository(
            MediaPostEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly mediapostRepo: Repository<MediaPostEntity>,

        @InjectRepository(
            MediaFitnessVideosEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly mediaFitnessVideosRepo: Repository<MediaFitnessVideosEntity>,

        @InjectRepository(
            MediaFitnessCategoryEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly mediafodCategoryRepo: Repository<MediaFitnessCategoryEntity>,

        @InjectRepository(
            MediaFitnessFocusEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly mediafodFocusRepo: Repository<MediaFitnessFocusEntity>,

        @InjectRepository(
            MediaFitnessEquipmentEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly mediafodEquipmentRepo: Repository<MediaFitnessEquipmentEntity>,

        @InjectRepository(
            MediaFitnessSeriesEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly mediafodSeriesRepo: Repository<MediaFitnessSeriesEntity>,

        @InjectRepository(
            MediaFitnessInstructorEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly mediafodInstructorsRepo: Repository<MediaFitnessInstructorEntity>,

        @InjectRepository(
            MediaFitnessDifficultyEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly mediafodDifficultyRepo: Repository<MediaFitnessDifficultyEntity>,

        @InjectRepository(
            MediaFitnessDurationRangeEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly mediafodDurationrangeRepo: Repository<MediaFitnessDurationRangeEntity>,

        @InjectRepository(
            EmotionalWellBeingCategoryEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly emotionalWellBeingCategoryRepo: Repository<EmotionalWellBeingCategoryEntity>,

        @InjectRepository(
            EmotionalWellBeingPostEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly emotionalWellBeingPostRepo: Repository<EmotionalWellBeingPostEntity>,
    ) {
        super('MediaModuleService');
    }

    async getMediaCategoryList(companyId?: string): Promise<EntityKeyMap> {
        return this.fetchAndMapEntities(
            this.mediaCategoryRepo,
            this.buildCompanyWhereCondition({ status: 1 }, companyId, 'org_id'),
            'id',
            'title',
            'getMediaCategories',
        );
    }

    async getFitnessVideoList(companyId?: string): Promise<EntityKeyMap> {
        return {
            Video: 'Video',
            category: 'Category',
            focus: 'Focus',
            equipment: 'Equipment',
            series: 'Series',
            instruction: 'Instruction',
            difficulty: 'Difficulty',
            durationrange: 'Durationrange',
        };
    }

    async getEmotionalWellbeingCategoryList(
        companyId?: string,
    ): Promise<EntityKeyMap> {
        return this.fetchAndMapEntities(
            this.emotionalWellBeingCategoryRepo,
            this.buildCompanyWhereCondition({ status: 1 }, companyId, 'org_id'),
            'id',
            'title',
            'getEmotionalWellbeingCategories',
        );
    }

    async getFitnessVideoCategoryList(
        companyId?: string,
    ): Promise<EntityKeyMap> {
        return this.fetchAndMapEntities(
            this.mediaFitnessVideosRepo,
            this.buildCompanyWhereCondition({ status: 1 }, companyId, 'org_id'),
            'id',
            'name',
            'getFitnessVideoCategories',
        );
    }

    async getMediaFields(
        orgId: string,
        formId: string,
    ): Promise<FieldDataResult> {
        const mediaCatArry: Record<string, string> = {};
        const mediaCatLabelArry: Record<string, string> = {};

        try {
            if (!orgId || !formId) return [{}, {}];

            const selectOrgFieldList = parseInt(orgId, 10);
            const selectFormFieldList = parseInt(formId, 10);

            const resultMedia = await this.mediaCategoryRepo.find({
                where: {
                    id: selectFormFieldList,
                    org_id: selectOrgFieldList,
                },
                select: ['id', 'title', 'description'],
            });

            if (resultMedia && resultMedia.length > 0) {
                const meCatId = resultMedia[0].id;
                mediaCatArry[`category_title_${meCatId}`] =
                    resultMedia[0].title || '';

                const resultMediapost = await this.mediapostRepo.find({
                    where: {
                        cat_id: selectFormFieldList,
                        org_id: selectOrgFieldList,
                    },
                    select: ['id', 'title', 'short_desc', 'more_desc'],
                });

                if (resultMediapost && resultMediapost.length > 0) {
                    for (const post of resultMediapost) {
                        const mpostId = post.id;
                        mediaCatArry[`post_title_${meCatId}_${mpostId}`] =
                            post.title || '';
                        mediaCatArry[`post_linktitle_${meCatId}_${mpostId}`] =
                            post.link_title || '';
                        mediaCatArry[`post_shortdesc_${meCatId}_${mpostId}`] =
                            this.safeDecodeAndParse(post.short_desc || '');
                        mediaCatArry[`post_moredesc_${meCatId}_${mpostId}`] =
                            this.safeDecodeAndParse(post.more_desc || '');
                    }
                }
            }

            return [mediaCatArry, mediaCatLabelArry];
        } catch (error) {
            this.logger.error(
                `Error in getMediaFields: ${error.message}`,
                error.stack,
            );
            return [mediaCatArry, mediaCatLabelArry];
        }
    }

    async getFitnessVideoFields(
        orgId: string,
        formId: string,
    ): Promise<FieldDataResult> {
        const mediafodCatArry: Record<string, string> = {};
        const mediafodCatLabelArry: Record<string, string> = {};

        try {
            if (!orgId || !formId) return [{}, {}];

            const selectOrgFieldList = parseInt(orgId, 10);

            if (formId === 'category') {
                const resultMediafodCategory =
                    await this.mediafodCategoryRepo.find({
                        where: { org_id: selectOrgFieldList, status: 1 },
                        select: ['id', 'name'],
                    });

                if (
                    resultMediafodCategory &&
                    resultMediafodCategory.length > 0
                ) {
                    for (const category of resultMediafodCategory) {
                        mediafodCatArry[`fitness_category_${category.id}`] =
                            category.name || '';
                        mediafodCatLabelArry[
                            `fitness_category_${category.id}`
                        ] = 'Title';
                    }
                }
            }

            if (formId === 'focus') {
                const resultMediafodFocus = await this.mediafodFocusRepo.find({
                    where: { org_id: selectOrgFieldList, status: 1 },
                    select: ['id', 'name'],
                });

                if (resultMediafodFocus && resultMediafodFocus.length > 0) {
                    for (const focus of resultMediafodFocus) {
                        mediafodCatArry[`fitness_focus_${focus.id}`] =
                            focus.name || '';
                        mediafodCatLabelArry[`fitness_focus_${focus.id}`] =
                            'Title';
                    }
                }
            }

            if (formId === 'equipment') {
                const resultMediafodEquipment =
                    await this.mediafodEquipmentRepo.find({
                        where: { org_id: selectOrgFieldList, status: 1 },
                        select: ['id', 'name'],
                    });

                if (
                    resultMediafodEquipment &&
                    resultMediafodEquipment.length > 0
                ) {
                    for (const equipment of resultMediafodEquipment) {
                        mediafodCatArry[`fitness_equipment_${equipment.id}`] =
                            equipment.name || '';
                        mediafodCatLabelArry[
                            `fitness_equipment_${equipment.id}`
                        ] = 'Title';
                    }
                }
            }

            if (formId === 'series') {
                const resultMediafodSeries = await this.mediafodSeriesRepo.find(
                    {
                        where: { org_id: selectOrgFieldList, status: 1 },
                        select: ['id', 'name'],
                    },
                );

                if (resultMediafodSeries && resultMediafodSeries.length > 0) {
                    for (const series of resultMediafodSeries) {
                        mediafodCatArry[`fitness_series_${series.id}`] =
                            series.name || '';
                        mediafodCatLabelArry[`fitness_series_${series.id}`] =
                            'Title';
                    }
                }
            }

            if (formId === 'instruction') {
                const resultMediafodInstructors =
                    await this.mediafodInstructorsRepo.find({
                        where: { org_id: selectOrgFieldList, status: 1 },
                        select: ['id', 'first_name', 'last_name'],
                    });

                if (
                    resultMediafodInstructors &&
                    resultMediafodInstructors.length > 0
                ) {
                    for (const instructor of resultMediafodInstructors) {
                        mediafodCatArry[
                            `fitness_instruction_firstname_${instructor.id}`
                        ] = instructor.first_name || '';
                        mediafodCatArry[
                            `fitness_instruction_lastname_${instructor.id}`
                        ] = instructor.last_name || '';
                        mediafodCatLabelArry[
                            `fitness_instruction_firstname_${instructor.id}`
                        ] = 'First Name';
                        mediafodCatLabelArry[
                            `fitness_instruction_lastname_${instructor.id}`
                        ] = 'Last Name';
                    }
                }
            }

            if (formId === 'difficulty') {
                const resultMediafodDifficulty =
                    await this.mediafodDifficultyRepo.find({
                        where: { org_id: selectOrgFieldList, status: 1 },
                        select: ['id', 'name'],
                    });

                if (
                    resultMediafodDifficulty &&
                    resultMediafodDifficulty.length > 0
                ) {
                    for (const difficulty of resultMediafodDifficulty) {
                        mediafodCatArry[`fitness_difficulty_${difficulty.id}`] =
                            difficulty.name || '';
                        mediafodCatLabelArry[
                            `fitness_difficulty_${difficulty.id}`
                        ] = 'Title';
                    }
                }
            }

            if (formId === 'durationrange') {
                const resultMediafodDurationrange =
                    await this.mediafodDurationrangeRepo.find({
                        where: { org_id: selectOrgFieldList, status: 1 },
                        select: ['id', 'name'],
                    });

                if (
                    resultMediafodDurationrange &&
                    resultMediafodDurationrange.length > 0
                ) {
                    for (const durationrange of resultMediafodDurationrange) {
                        mediafodCatArry[
                            `fitness_durationrange_${durationrange.id}`
                        ] = durationrange.name || '';
                        mediafodCatLabelArry[
                            `fitness_durationrange_${durationrange.id}`
                        ] = 'Title';
                    }
                }
            }

            return [mediafodCatArry, mediafodCatLabelArry];
        } catch (error) {
            this.logger.error(
                `Error in getFitnessVideoFields: ${error.message}`,
                error.stack,
            );
            return [mediafodCatArry, mediafodCatLabelArry];
        }
    }

    async getEmotionalWellbeingFields(
        orgId: string,
        categoryId: string,
    ): Promise<FieldDataResult> {
        return this.fetchSingleEntityFields(
            this.emotionalWellBeingCategoryRepo,
            categoryId,
            { status: 1 },
            { category_title: 'title' },
            'getEmotionalWellbeingFields',
        );
    }

    async getFitnessVideoDetails(
        orgId: string,
        videoId: string,
    ): Promise<FieldDataResult> {
        return this.fetchSingleEntityFields(
            this.mediaFitnessVideosRepo,
            videoId,
            { status: 1 },
            {
                fitness_video_name: 'name',
                fitness_video_description: 'description',
            },
            'getFitnessVideoDetails',
        );
    }
    async getFitnessVideoFieldsDetails(
        orgId: string,
        suboption1value: string,
    ): Promise<FieldDataResult> {
        const mediafodVideoArry: Record<string, string> = {};
        const mediafodVideoLabelArry: Record<string, string> = {};
        try {
            if (!orgId || !suboption1value) return [{}, {}];
            const selectOrgFieldList = parseInt(orgId, 10);
            const selectSuboption1Value = parseInt(suboption1value, 10);

            const resultMediafodVideoData =
                await this.mediaFitnessVideosRepo.findOne({
                    where: {
                        id: selectSuboption1Value,
                        org_id: selectOrgFieldList,
                        status: 1,
                    },
                    select: ['id', 'name', 'description', 'provider_name'],
                    order: { id: 'ASC' },
                });
            if (resultMediafodVideoData) {
                const mvId = resultMediafodVideoData.id;
                mediafodVideoArry[`fitness_video_name_${mvId}`] =
                    resultMediafodVideoData.name || '';
                mediafodVideoArry[`fitness_video_description_${mvId}`] =
                    this.safeDecodeAndParse(
                        resultMediafodVideoData.description || '',
                    );
                mediafodVideoArry[`fitness_video_providername_${mvId}`] =
                    resultMediafodVideoData.provider_name || '';

                mediafodVideoLabelArry[`fitness_video_name_${mvId}`] = 'Title';
                mediafodVideoLabelArry[`fitness_video_description_${mvId}`] =
                    'Description';
                mediafodVideoLabelArry[`fitness_video_providername_${mvId}`] =
                    'Provider Name';
            }
            return [mediafodVideoArry, mediafodVideoLabelArry];
        } catch (error) {
            this.logger.error(
                `Error in getFitnessVideoDetails: ${error.message}`,
                error.stack,
            );
            return [mediafodVideoArry, mediafodVideoLabelArry];
        }
    }
    async getEmotionalWellbeingPostList(
        companyId: string,
        categoryId: string,
    ): Promise<EntityKeyMap> {
        try {
            if (!companyId || !categoryId) return {};

            const selectOrgFieldList = parseInt(companyId, 10);
            const selectCatId = parseInt(categoryId, 10);

            const posts = await this.emotionalWellBeingPostRepo.find({
                where: {
                    cat_id: selectCatId,
                    org_id: selectOrgFieldList,
                },
                select: ['id', 'title'],
                order: { id: 'ASC' } as any,
            });

            if (!posts || posts.length === 0) {
                return {};
            }

            return posts.reduce((acc, post) => {
                if (post.title && post.title !== '') {
                    acc[String(post.id)] = post.title;
                }
                return acc;
            }, {} as EntityKeyMap);
        } catch (error) {
            this.logger.error(
                `Error in getEmotionalWellbeingPostList: ${error.message}`,
                error.stack,
            );
            return {};
        }
    }
    async getEmotionalWellbeingMainCollectionList(
        companyId: string,
        categoryId: string,
    ): Promise<EntityKeyMap> {
        try {
            if (!companyId || !categoryId) {
                this.logger.warn(
                    'Missing companyId or categoryId in getEmotionalWellbeingMainCollectionList',
                );
                return {};
            }

            const selectOrgFieldList = parseInt(companyId, 10);
            const selectCatId = parseInt(categoryId, 10);

            this.logger.log(
                `Fetching main collections for catId: ${selectCatId}, orgId: ${selectOrgFieldList}`,
            );

            const mainCollections = await this.emotionalWellBeingPostRepo
                .createQueryBuilder('post')
                .select('post.maincollection', 'maincollection')
                .where('post.cat_id = :catId', { catId: selectCatId })
                .andWhere('post.org_id = :orgId', { orgId: selectOrgFieldList })
                .andWhere('post.maincollection IS NOT NULL')
                .andWhere('post.maincollection != :empty', { empty: '' })
                .groupBy('post.maincollection')
                .orderBy('post.id', 'DESC')
                .getRawMany();
            if (!mainCollections || mainCollections.length === 0) {
                this.logger.log(
                    `No main collections found for catId: ${selectCatId}, orgId: ${selectOrgFieldList}`,
                );
                return {};
            }
            const result = mainCollections.reduce((acc, item) => {
                if (item.maincollection && item.maincollection.trim() !== '') {
                    acc[item.maincollection] = item.maincollection;
                }
                return acc;
            }, {} as EntityKeyMap);

            this.logger.log(
                `Found ${Object.keys(result).length} main collections`,
            );
            return result;
        } catch (error) {
            this.logger.error(
                `Error in getEmotionalWellbeingMainCollectionList: ${error.message}`,
                error.stack,
            );
            return {};
        }
    }
}

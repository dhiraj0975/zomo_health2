import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { BaseModuleService } from '../shared/base.service';
import { EntityKeyMap, FieldDataResult } from '../shared/types';
import {
    appConstant,
    MyPlanAssignPlanEntity,
    MyPlanPlansEntity,
    MyPlanAssignBlockEntity,
    MyPlanActivityEntity,
    MyPlanBlocksEntity,
    MyPlanAssignActivityEntity,
    CompaniesEntity,
    ActivePluginsEntity,
    CompanyMetaEntity,
} from '@common-constants';
@Injectable()
export class MyPlanModuleService extends BaseModuleService {
    constructor(
        @InjectRepository(
            MyPlanAssignPlanEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly myPlanAssignRepo: Repository<MyPlanAssignPlanEntity>,

        @InjectRepository(
            MyPlanPlansEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly myPlansRepo: Repository<MyPlanPlansEntity>,

        @InjectRepository(
            MyPlanAssignBlockEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly assignBlockRepo: Repository<MyPlanAssignBlockEntity>,

        @InjectRepository(
            MyPlanBlocksEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly blocksRepo: Repository<MyPlanBlocksEntity>,

        @InjectRepository(
            MyPlanAssignActivityEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly assignActivityRepo: Repository<MyPlanAssignActivityEntity>,

        @InjectRepository(
            MyPlanActivityEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly myActivityRepo: Repository<MyPlanActivityEntity>,

        @InjectRepository(
            CompaniesEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly companyRepo: Repository<CompaniesEntity>,

        @InjectRepository(
            ActivePluginsEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly activePluginRepo: Repository<ActivePluginsEntity>,

        @InjectRepository(
            CompanyMetaEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly companyMetaRepo: Repository<CompanyMetaEntity>,
    ) {
        super('MyPlanModuleService');
    }

    async getMyPlanList(companyId?: string): Promise<EntityKeyMap> {
        try {
            const rows = await this.myPlanAssignRepo
                .createQueryBuilder('assign')
                .leftJoin('mp_plans', 'plan', 'plan.id = assign.plan_id')
                .select([
                    'assign.id AS id',
                    `COALESCE(NULLIF(assign.name, ''), plan.name) AS names`,
                ])
                .where('assign.org_id = :orgId', { orgId: companyId })
                .andWhere('assign.status IN (:...status)', { status: [0, 1] })
                .getRawMany();
            return rows.reduce((acc, row) => {
                acc[row.id] = row.names;
                return acc;
            }, {} as EntityKeyMap);
        } catch (error) {
            this.logger.error(
                `Error in getMyPlans: ${error.message}`,
                error.stack,
            );
            return {};
        }
    }

    async getMyPlanFields(
        orgId: string,
        planId: string,
    ): Promise<FieldDataResult> {
        const plansArry: Record<string, string> = {};
        const plansLabelArry: Record<string, string> = {};

        try {
            if (orgId && orgId !== '') {
                const assignPlan = await this.myPlanAssignRepo.findOne({
                    where: { id: parseInt(planId, 10) },
                    select: ['id', 'plan_id', 'name'],
                });

                if (!assignPlan) return [{}, {}];

                const actualPlanId = assignPlan.plan_id;

                const company = await this.companyRepo.findOne({
                    where: { id: parseInt(orgId, 10) },
                    select: ['code'],
                });

                const membershipCode = company?.code || '';

                const activePlugin = await this.activePluginRepo.findOne({
                    where: { company_id: parseInt(orgId, 10) },
                    select: ['plugin_name'],
                });

                let activePlugins: string[] = [];
                if (activePlugin && activePlugin.plugin_name) {
                    try {
                        const pluginData =
                            typeof activePlugin.plugin_name === 'string'
                                ? JSON.parse(activePlugin.plugin_name)
                                : activePlugin.plugin_name;
                        activePlugins = Object.keys(pluginData);
                    } catch (e) {
                        activePlugins = [];
                    }
                }

                const myPlan = await this.myPlansRepo.findOne({
                    where: { id: actualPlanId },
                    select: ['id', 'name', 'description'],
                });

                if (!myPlan) return [{}, {}];

                if (assignPlan.name && assignPlan.name !== '') {
                    plansArry[`plan_name_${assignPlan.id}_${orgId}`] =
                        assignPlan.name;
                } else {
                    plansArry[`plan_name_${assignPlan.id}_${orgId}`] =
                        myPlan.name;
                }
                plansArry[`plan_description_${assignPlan.id}_${orgId}`] =
                    this.safeDecodeAndParse(myPlan.description || '');

                const assignBlocks = await this.assignBlockRepo.find({
                    where: {
                        plan_id: parseInt(planId, 10),
                        status: In([0, 1]),
                    },
                    select: ['id', 'block_id', 'name'],
                });

                if (assignBlocks && assignBlocks.length > 0) {
                    for (const assignBlock of assignBlocks) {
                        const block = await this.blocksRepo.findOne({
                            where: { id: assignBlock.block_id },
                            select: ['id', 'name', 'description'],
                        });

                        if (block) {
                            if (assignBlock.name && assignBlock.name !== '') {
                                plansArry[
                                    `block_name_${assignBlock.id}_${orgId}`
                                ] = assignBlock.name;
                            } else {
                                plansArry[
                                    `block_name_${assignBlock.id}_${orgId}`
                                ] = block.name;
                            }
                            plansArry[
                                `block_description_${assignBlock.id}_${orgId}`
                            ] = this.safeDecodeAndParse(
                                block.description || '',
                            );

                            const assignActivities =
                                await this.assignActivityRepo.find({
                                    where: {
                                        block_id: assignBlock.id,
                                        status: In([0, 1]),
                                    },
                                    select: ['id', 'activity_id', 'name'],
                                });

                            if (
                                assignActivities &&
                                assignActivities.length > 0
                            ) {
                                for (const assignActivity of assignActivities) {
                                    const myActivity = await this.myActivityRepo
                                        .createQueryBuilder('ma')
                                        .leftJoin(
                                            'in_activity',
                                            'ia',
                                            'ia.id = ma.activity_id',
                                        )
                                        .select([
                                            'ma.id',
                                            'ma.description',
                                            'ma.button_text',
                                            'ma.upload_text',
                                            'ia.activity_name',
                                        ])
                                        .where('ma.id = :id', {
                                            id: assignActivity.activity_id,
                                        })
                                        .getRawOne();

                                    if (myActivity) {
                                        if (
                                            assignActivity.name &&
                                            assignActivity.name !== ''
                                        ) {
                                            plansArry[
                                                `activity_name_${assignBlock.id}_${assignActivity.id}_${orgId}`
                                            ] = assignActivity.name;
                                        } else {
                                            plansArry[
                                                `activity_name_${assignBlock.id}_${assignActivity.id}_${orgId}`
                                            ] = myActivity.activity_name;
                                        }
                                        plansArry[
                                            `activity_description_${assignBlock.id}_${assignActivity.id}_${orgId}`
                                        ] = this.safeDecodeAndParse(
                                            myActivity.description || '',
                                        );
                                        plansArry[
                                            `button_text_${assignBlock.id}_${assignActivity.id}_${orgId}`
                                        ] = myActivity.button_text || '';
                                        plansArry[
                                            `upload_text_${assignBlock.id}_${assignActivity.id}_${orgId}`
                                        ] = myActivity.upload_text || '';
                                    }
                                }
                            }
                        }
                    }
                }
            } else {
                const myPlan = await this.myPlansRepo.findOne({
                    where: { id: parseInt(planId, 10) },
                    select: ['id', 'name', 'description'],
                });

                if (!myPlan) return [{}, {}];

                plansArry[`plan_name_${planId}`] = myPlan.name;
                plansArry[`plan_description_${planId}`] =
                    this.safeDecodeAndParse(myPlan.description || '');
                plansLabelArry[`plan_name_${planId}`] = 'Plan Name';
                plansLabelArry[`plan_description_${planId}`] =
                    'Plan Description';

                const blocks = await this.blocksRepo.find({
                    where: {
                        plan_id: parseInt(planId, 10),
                        status: In([0, 1]),
                    },
                    select: ['id', 'name', 'description'],
                });

                if (blocks && blocks.length > 0) {
                    for (const block of blocks) {
                        plansArry[`block_name_${planId}_${block.id}`] =
                            block.name;
                        plansArry[`block_description_${planId}_${block.id}`] =
                            this.safeDecodeAndParse(block.description || '');

                        const activities = await this.myActivityRepo
                            .createQueryBuilder('ma')
                            .leftJoin(
                                'in_activity',
                                'ia',
                                'ia.id = ma.activity_id',
                            )
                            .select([
                                'ma.id',
                                'ma.description',
                                'ma.button_text',
                                'ia.activity_name',
                            ])
                            .where('ma.block_id = :blockId', {
                                blockId: block.id,
                            })
                            .andWhere('ma.status IN (:...statuses)', {
                                statuses: [0, 1],
                            })
                            .getRawMany();

                        if (activities && activities.length > 0) {
                            for (const activity of activities) {
                                plansArry[
                                    `activity_name_${block.id}_${activity.ma_id}`
                                ] = activity.ia_activity_name;
                                plansArry[
                                    `button_text_${block.id}_${activity.ma_id}`
                                ] = activity.ma_button_text || '';
                                plansArry[
                                    `description_${block.id}_${activity.ma_id}`
                                ] = this.safeDecodeAndParse(
                                    activity.ma_description || '',
                                );
                            }
                        }
                    }
                }
            }

            return [plansArry, plansLabelArry];
        } catch (error) {
            this.logger.error(
                `Error in getMyPlanFields: ${error.message}`,
                error.stack,
            );
            return [{}, {}];
        }
    }

    async getMyPlanLabelFields(orgId: string): Promise<FieldDataResult> {
        const planLabelArry: Record<string, string> = {};
        const planLabelLabelArry: Record<string, string> = {};

        try {
            const company = await this.companyRepo
                .createQueryBuilder('company')
                .leftJoin('c_company_meta', 'meta', 'meta.org_id = company.id')
                .select([
                    'company.id',
                    'company.company_name',
                    'meta.plan_label',
                ])
                .where('company.id = :orgId', { orgId: parseInt(orgId, 10) })
                .andWhere('company.deleted = 0')
                .andWhere('meta.plan_label IS NOT NULL')
                .andWhere('meta.plan_label != :empty', { empty: '' })
                .getRawOne();

            if (company && company.meta_plan_label) {
                let planLabelData: any;
                try {
                    planLabelData =
                        typeof company.meta_plan_label === 'string'
                            ? JSON.parse(company.meta_plan_label)
                            : company.meta_plan_label;
                } catch (e) {
                    return [{}, {}];
                }

                planLabelArry[`completion_${orgId}`] =
                    planLabelData.completion || '';
                planLabelArry[`required_${orgId}`] =
                    planLabelData.required || '';
                planLabelArry[`optional_${orgId}`] =
                    planLabelData.optional || '';
                planLabelArry[`incomplete_${orgId}`] =
                    planLabelData.incomplete || '';
                planLabelArry[`plantext_${orgId}`] =
                    planLabelData.plantext || '';

                planLabelLabelArry[`completion_${orgId}`] = 'Completion';
                planLabelLabelArry[`required_${orgId}`] = 'Required';
                planLabelLabelArry[`optional_${orgId}`] = 'Optional';
                planLabelLabelArry[`incomplete_${orgId}`] = 'Incomplete';
                planLabelLabelArry[`plantext_${orgId}`] = 'Plan Text';
            }

            return [planLabelArry, planLabelLabelArry];
        } catch (error) {
            this.logger.error(
                `Error in getMyPlanLabelFields: ${error.message}`,
                error.stack,
            );
            return [{}, {}];
        }
    }
}

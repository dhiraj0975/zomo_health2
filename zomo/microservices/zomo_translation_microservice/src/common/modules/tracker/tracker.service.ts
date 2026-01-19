import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource, Not } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { BaseModuleService } from '../shared/base.service';
import { EntityKeyMap, FieldDataResult } from '../shared/types';
import { lastValueFrom } from 'rxjs';
import {
    appConstant,
    CovidPassportSettingsEntity,
    CovidVaccinationTypeEntity,
    CovidAnswerEntity,
    CovidQuestionsEntity,
} from '@common-constants';
@Injectable()
export class TrackerModuleService extends BaseModuleService {
    constructor(
        @Inject('FOOD_SERVICE') private client: ClientProxy,

        @InjectRepository(
            CovidPassportSettingsEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly covidpassportsettingRepo: Repository<CovidPassportSettingsEntity>,

        @InjectRepository(
            CovidVaccinationTypeEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly covidvaccinationtypeRepo: Repository<CovidVaccinationTypeEntity>,

        @InjectRepository(
            CovidAnswerEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly covidanswerRepo: Repository<CovidAnswerEntity>,

        @InjectRepository(
            CovidQuestionsEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly covidquestionRepo: Repository<CovidQuestionsEntity>,
    ) {
        super('TrackerModuleService');
    }

    async getNutritionData(): Promise<EntityKeyMap> {
        try {
            const foodRequests = await lastValueFrom(
                this.client.send(
                    { cmd: 'list_food_description' },
                    'NDB_No != 0',
                ),
            );
            if (Array.isArray(foodRequests) && foodRequests.length > 0) {
                return foodRequests.reduce((acc, row) => {
                    acc[row.NDB_No] = row.Long_Desc;
                    return acc;
                }, {} as EntityKeyMap);
            }
            return {};
        } catch (error) {
            this.logger.error(
                `Error in getNutritionData: ${error.message}`,
                error.stack,
            );
            return {};
        }
    }

    async getTrackersNutritionFields(orgId: string): Promise<FieldDataResult> {
        const resultsFoodsAll: Record<string, string> = {};
        const resultsFoodsLabelAll: Record<string, string> = {};

        try {
            if (!orgId) return [{}, {}];

            let selectOrgFieldList = orgId;

            if (selectOrgFieldList.length === 4) {
                selectOrgFieldList = '0' + selectOrgFieldList;
            }
            const resFoods = await lastValueFrom(
                this.client.send(
                    { cmd: 'list_food_description' },
                    `NDB_No = '${selectOrgFieldList}'`,
                ),
            );
            /*const resFoods = await this.dataSource.query(
                `SELECT NDB_No, Long_Desc FROM FOOD_DES WHERE NDB_No = ?`,
                [selectOrgFieldList]
            );*/
            if (resFoods && resFoods.length > 0) {
                const foodDesc = resFoods[0].Long_Desc;
                const foodId = resFoods[0].NDB_No;

                resultsFoodsAll[foodDesc] = foodDesc;
                /*
                const unitQuery = await this.dataSource.query(
                    `SELECT NDB_No, Msre_Desc FROM WEIGHT WHERE NDB_No = ? ORDER BY Seq ASC`,
                    [foodId]
                );*/
                const unitQuery = await lastValueFrom(
                    this.client.send(
                        { cmd: 'list_weight' },
                        `NDB_No = '${foodId}' ORDER BY Seq ASC`,
                    ),
                );

                if (unitQuery && unitQuery.length > 0) {
                    for (const unit of unitQuery) {
                        const fId = unit.NDB_No;
                        const uName = unit.Msre_Desc;
                        const trimmedId = fId.replace(/^0+/, '');
                        resultsFoodsAll[`foodunit_${uName}_${trimmedId}`] =
                            uName;
                    }
                }
            }

            return [resultsFoodsAll, resultsFoodsLabelAll];
        } catch (error) {
            this.logger.error(
                `Error in getTrackersNutritionFields: ${error.message}`,
                error.stack,
            );
            return [resultsFoodsAll, resultsFoodsLabelAll];
        }
    }

    async getTrackersCovidPassportFields(
        orgId: string,
        formId: string,
    ): Promise<FieldDataResult> {
        const covidsArry: Record<string, string> = {};
        const covidsLabelArry: Record<string, string> = {};

        try {
            if (!orgId) return [{}, {}];

            const selectOrgFieldList = parseInt(orgId, 10);

            const resCovidpassportsetting =
                await this.covidpassportsettingRepo.find({
                    where: {
                        org_id: selectOrgFieldList,
                        description: Not(''),
                    },
                    select: ['id', 'description'],
                });

            if (resCovidpassportsetting && resCovidpassportsetting.length > 0) {
                for (const setting of resCovidpassportsetting) {
                    covidsArry[`settings_description_${orgId}`] =
                        this.safeDecodeAndParse(setting.description || '');
                    covidsLabelArry[`settings_description_${orgId}`] =
                        'Setting Description';
                }
            }

            /*
            if (formId) {
                const selectFormFieldList = parseInt(formId, 10);

                const resCovidpassportUser = await this.covidpassportUserRepo.find({
                    where: {
                        created_by: selectFormFieldList,
                        org_id: selectOrgFieldList,
                        status: In([0, 1])
                    },
                    select: ['id', 'title', 'description']
                });

                if (resCovidpassportUser && resCovidpassportUser.length > 0) {
                    for (const user of resCovidpassportUser) {
                        const covidPassportId = user.id;
                        covidsArry[`title_${formId}_${orgId}_${covidPassportId}`] = user.title || '';
                        covidsLabelArry[`title_${formId}_${orgId}_${covidPassportId}`] = 'Title';
                        covidsArry[`description_${formId}_${orgId}_${covidPassportId}`] = user.description || '';
                        covidsLabelArry[`description_${formId}_${orgId}_${covidPassportId}`] = 'Description';
                    }
                }
            }
            */

            return [covidsArry, covidsLabelArry];
        } catch (error) {
            this.logger.error(
                `Error in getTrackersCovidPassportFields: ${error.message}`,
                error.stack,
            );
            return [covidsArry, covidsLabelArry];
        }
    }
}

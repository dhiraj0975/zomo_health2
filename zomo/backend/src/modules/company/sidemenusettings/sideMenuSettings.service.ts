import { MediaCategoryService } from "@/modules/mediafitness/mediacategory/mediacategory.service";
import { TranslationService } from "@/modules/translation/translation.service";
import {
    appConstant,
    BaseService,
    CommonArrayService,
    CommonFileService,
    CompanySideMenuSettingsEntity
} from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaginateWithCompanyInput } from "../../../input";
@Injectable()
export class SideMenuSettingsService extends BaseService<CompanySideMenuSettingsEntity>  {
    constructor(
        @InjectRepository(CompanySideMenuSettingsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicasideMenuSettingsRepository: Repository<CompanySideMenuSettingsEntity>,
        @InjectRepository(CompanySideMenuSettingsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicasideMenuSettingsRepository: Repository<CompanySideMenuSettingsEntity>,
        commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
        private readonly translatorService: TranslationService,
        private readonly mediaCategoryService: MediaCategoryService,
    ) {
        super(readReplicasideMenuSettingsRepository, writeReplicasideMenuSettingsRepository, 'sideMenuSettings', commonArrayService );
    }
    async paginateList(condition: any, paginationParam: PaginateWithCompanyInput) {
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
                ? paginationParam.order_by
                : 'sideMenuSettings.id';
        const queryResult = await this.readReplicasideMenuSettingsRepository.createQueryBuilder('sideMenuSettings')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: any) {
        return await this.readReplicasideMenuSettingsRepository.findOne({
            where: condition,
        });
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicasideMenuSettingsRepository.createQueryBuilder('sideMenuSettings')
        .where(condition)
        .orderBy(`sideMenuSettings.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
        .getMany();
    }
    async save(data: any) {
        const savedResult = this.writeReplicasideMenuSettingsRepository.create(data);
        return await this.writeReplicasideMenuSettingsRepository.insert(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicasideMenuSettingsRepository.metadata);
        return await this.writeReplicasideMenuSettingsRepository.createQueryBuilder('sideMenuSettings')
            .update(CompanySideMenuSettingsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicasideMenuSettingsRepository.delete(condition);
    }
    async sideMenuSettingJson(sideMenuSettingObj: any,orgId: number) {
        const jsonMenu = '{"Dashboard":"Dashboard","Agreement":"Agreement","Activities":"Activities","Activity Forms":"Activity Forms","Submit Form":"Submit Form","Submitted Forms":"Submitted Forms","Reimbursements":"Reimbursements","reimbursements_submit_form":"Submit Form","reimbursements_submitted_forms":"Submitted Forms","Health Forms":"Health Forms","Submit Forms":"Submit Forms","health_forms_submitted_forms":"Submitted Forms","Devices Sync":"Devices Sync","My Health":"My Health","Assessment":"Assessment","Health Data":"Health Data","Results":"Results","Plans":"My Plan","Trackers":"Trackers","Nutrition":"Nutrition","Exercise":"Exercise","Measurements":"Measurements","Biometrics":"Biometrics","Fitbit Sync":"Fitbit Sync","Sleep":"Sleep","Covid Passport":"Covid Passport","Events":"Events","Challenges":"Challenges","Join Challenges":"Join Challenges","My Challenges":"My Challenges","Quizzes":"Quizzes","Support":"Support","Internalmail":"Internalmail","Email":"Email","Emotional Well-Being":"Emotional Well-Being","Media":"Media","Fitness Videos":"Fitness Videos","Media Dashboard":"Media Dashboard","Quicklink":"Quicklink","Weight Log":"Weight Log","Blood Pressure Log":"Blood Pressure Log","Cholesterol Log":"Cholesterol Log","Blood Glucose Log":"Blood Glucose Log"}';
        const jsonDecodeMenu = JSON.parse(jsonMenu);
        const dynamicData = {};
        Object.keys(jsonDecodeMenu).forEach(jsmenukey => {
            dynamicData[`${jsmenukey}_${orgId}`] = jsonDecodeMenu[jsmenukey];
        });
        /* Side bar media name change check category not exist and name blank then Fitness Video default name show start
        const showMenuList = sideMenuSettingObj?.showmenulist;
        if (Object.keys(showMenuList).length) {
            for (let i = 0; i < Object.keys(showMenuList).length; i++) {
                let key = Object.keys(showMenuList)[i];
                if (key == 'Media' && showMenuList[key]?.['Mainmenucustomname'] == '') {
                    let checkExist = await this.mediaCategoryService.checkExists({org_id: orgId, status: 1});
                    if (!checkExist) {
                        dynamicData[`${key}_${orgId}`] = await this.translatorService.frontendReadTranslation('eng','Fitness Videos', `/LC_MESSAGES/Media/Media`,`static`);
                    } else {
                        dynamicData[`${key}_${orgId}`] = await this.translatorService.frontendReadTranslation('eng','Media', `/LC_MESSAGES/Media/Media`,`static`);
                    }
                }
            }
        }
        Side bar media name change check category not exist and name blank then Fitness Video default name show end */
        const sideMenuSetting = sideMenuSettingObj?.datasettingmenu;
        if (Object.keys(sideMenuSetting).length) {
            Object.keys(sideMenuSetting).forEach(Mekey => {
                const MeValue = sideMenuSetting[Mekey];
                if (['Dashboard', 'Agreement', 'Activities', 'Plans', 'Trackers', 'Events', 'Challenges', 'Quizzes', 'Support', 'Internalmail', 'Media', 'Quicklink'].includes(Mekey) && MeValue !== '') {
                    dynamicData[`${Mekey}_${orgId}`] = MeValue;
                }
                if (Mekey === 'Activity_Forms' && MeValue !== '') {
                    dynamicData[`Activity Forms_${orgId}`] = MeValue;
                }
                if (Mekey === 'Activity_Forms_Submit_Form' && MeValue !== '') {
                    dynamicData[`Submit Form_${orgId}`] = MeValue;
                }
                if (Mekey === 'Activity_Forms_Submitted_Forms' && MeValue !== '') {
                    dynamicData[`Submitted Forms_${orgId}`] = MeValue;
                }
                if (Mekey === 'Reimbursements' && MeValue !== '') {
                    dynamicData[`Reimbursements_${orgId}`] = MeValue;
                }
                if (Mekey === 'Reimbursements_Submit_Form' && MeValue !== '') {
                    dynamicData[`reimbursements_submit_form_${orgId}`] = MeValue;
                }
                if (Mekey === 'Reimbursements_Submitted_Forms' && MeValue !== '') {
                    dynamicData[`reimbursements_submitted_forms_${orgId}`] = MeValue;
                }
                if (Mekey === 'Health_Forms' && MeValue !== '') {
                    dynamicData[`Health Forms_${orgId}`] = MeValue;
                }
                if (Mekey === 'Health_Forms_Submit_Forms' && MeValue !== '') {
                    dynamicData[`Submit Forms_${orgId}`] = MeValue;
                }
                if (Mekey === 'Health_Forms_Submitted_Forms' && MeValue !== '') {
                    dynamicData[`health_forms_submitted_forms_${orgId}`] = MeValue;
                }
                if (Mekey === 'Devices_Sync' && MeValue !== '') {
                    dynamicData[`Devices Sync_${orgId}`] = MeValue;
                }
                if (Mekey === 'My_Health' && MeValue !== '') {
                    dynamicData[`My Health_${orgId}`] = MeValue;
                }
                if (Mekey === 'My_Health_Assessment' && MeValue !== '') {
                    dynamicData[`Assessment_${orgId}`] = MeValue;
                }
                if (Mekey === 'My_Health_Health_Data' && MeValue !== '') {
                    dynamicData[`Health Data_${orgId}`] = MeValue;
                }
                if (Mekey === 'My_Health_Results' && MeValue !== '') {
                    dynamicData[`Results_${orgId}`] = MeValue;
                }
                if (['Trackers_Nutrition', 'Trackers_Exercise', 'Trackers_Measurements', 'Trackers_Biometrics'].includes(Mekey) && MeValue !== '') {
                    const MekeyT = Mekey.replace('Trackers_', '');
                    dynamicData[`${MekeyT}_${orgId}`] = MeValue;
                }
                if (['Trackers_Biometrics_Weight_Log', 'Trackers_Biometrics_Blood_Pressure_Log', 'Trackers_Biometrics_Cholesterol_Log', 'Trackers_Biometrics_Blood_Glucose_Log'].includes(Mekey) && MeValue !== '') {
                    const MekeyT = Mekey.replace('Trackers_Biometrics_', '').replace(/_/g, " ");
                    dynamicData[`${MekeyT}_${orgId}`] = MeValue;
                }
                if (Mekey === 'Trackers_Fitbit_Sync' && MeValue !== '') {
                    dynamicData[`Fitbit Sync_${orgId}`] = MeValue;
                }
                if (Mekey === 'Trackers_Sleep' && MeValue !== '') {
                    dynamicData[`Sleep_${orgId}`] = MeValue;
                }
                if (Mekey === 'Trackers_Covid_Passport' && MeValue !== '') {
                    dynamicData[`Covid Passport_${orgId}`] = MeValue;
                }
                if (Mekey === 'Challenges_Join_Challenges' && MeValue !== '') {
                    dynamicData[`Join Challenges_${orgId}`] = MeValue;
                }
                if (Mekey === 'Challenges_My_Challenges' && MeValue !== '') {
                    dynamicData[`My Challenges_${orgId}`] = MeValue;
                }
                if (Mekey === 'Internalmail_Email' && MeValue !== '') {
                    dynamicData[`Email_${orgId}`] = MeValue;
                }
                if (Mekey === 'Emotional_Well-Being' && MeValue !== '') {
                    dynamicData[`Emotional Well-Being_${orgId}`] = MeValue;
                }
                if (Mekey === 'Media_Fitness_Videos' && MeValue !== '') {
                    dynamicData[`Fitness Videos_${orgId}`] = MeValue;
                }
                if (Mekey === 'Media_Media_Dashboard' && MeValue !== '') {
                    dynamicData[`Media Dashboard_${orgId}`] = MeValue;
                }
            });
        }
        await this.translatorService.DynamicEngJsonData('Common', orgId, dynamicData,'Edit','Menu');
    }
}
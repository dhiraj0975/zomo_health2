import {
    ActivityEntity, appConstant, AssessmentEmotionalAssessmentEntity,
    AssessmentHraBiometricEntity,
    AssessmentOptionsEntity, AssessmentResultsEntity, AssessmentsEntity,
    BiometricsEntity,
    BodyFeedsEntity, CampaignActivityEntity,
    CampaignEntity, CommonArrayService, CommonDateService, EmotionalWellBeingPostEntity,
    EventCategoryEntity,
    EventEntity,
    EventGlobalEventsEntity, EventUserBookingListsEntity,
    FtBiometricsEntity,
    MyPlanAssignActivityEntity, MyPlanAssignBlockEntity,
    MyPlanAssignPlanEntity,
    MyPlanJoinUserPlanEntity,
    ScheduleChallengeEntity, tableConstant, TobaccoUsesEntity,
    UserDetailsEntity
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AssessmentEmotionalAssessmentService } from 'src/modules/healthassessment/assessmentemotionalassessment/assessmentemotionalassessment.service';
import { AssessmentEmotionalAssessmentAnswerService } from 'src/modules/healthassessment/assessmentemotionalassessmentanswer/assessmentemotionalassessmentanswer.service';
import { AssessmentResultsService } from 'src/modules/healthassessment/assessmentresults/assessmentresults.service';
import {In, Not, Repository} from 'typeorm';
import { TranslationService } from "../../translation/translation.service";
@Injectable()
export class FrontService {
    constructor(
        @InjectRepository(EventCategoryEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaEventCategoryRepository: Repository<EventCategoryEntity>,
        @InjectRepository(ScheduleChallengeEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaScheduleChallengeRepository: Repository<ScheduleChallengeEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonDateService: CommonDateService,
        private readonly translatorService: TranslationService,
        @InjectRepository(BiometricsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaBiometricsRepository: Repository<BiometricsEntity>,
        @InjectRepository(AssessmentHraBiometricEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaassessmentHraBiometricsRepository: Repository<AssessmentHraBiometricEntity>,
        @InjectRepository(FtBiometricsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaftBiometricsRepository: Repository<FtBiometricsEntity>,
        @InjectRepository(BodyFeedsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaBodyFeedsRepository: Repository<BodyFeedsEntity>,
        @InjectRepository(MyPlanAssignActivityEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaMyPlanAssignActivityRepository: Repository<MyPlanAssignActivityEntity>,
        @InjectRepository(MyPlanJoinUserPlanEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaMyPlanJoinUserPlanRepository: Repository<MyPlanJoinUserPlanEntity>,
        @InjectRepository(CampaignEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaCampaignRepository: Repository<CampaignEntity>,
        @InjectRepository(UserDetailsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaUserDetailsRepository: Repository<UserDetailsEntity>,
        @InjectRepository(EventEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaEventRepository: Repository<EventEntity>,
        @InjectRepository(EventGlobalEventsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaEventGlobalEventsRepository: Repository<EventGlobalEventsEntity>,
        @InjectRepository(AssessmentOptionsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaAssessmentOptionsRepository: Repository<AssessmentOptionsEntity>,
        @InjectRepository(MyPlanAssignPlanEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaMyPlanAssignPlanRepository: Repository<MyPlanAssignPlanEntity>,
        @InjectRepository(MyPlanAssignBlockEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaMyPlanAssignBlockRepository: Repository<MyPlanAssignBlockEntity>,
        @InjectRepository(ActivityEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaActivityRepository: Repository<ActivityEntity>,
        @InjectRepository(EmotionalWellBeingPostEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaWellbeingPostRepository: Repository<EmotionalWellBeingPostEntity>,
        @InjectRepository(TobaccoUsesEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaTobaccoUsesRepository: Repository<TobaccoUsesEntity>,
        @InjectRepository(AssessmentEmotionalAssessmentEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaAssessmentEmotionalAssessmentRepository: Repository<AssessmentEmotionalAssessmentEntity>,
        private readonly assessmentResultsService: AssessmentResultsService,
        private readonly assessmentEmotionalAssessmentAnswerService: AssessmentEmotionalAssessmentAnswerService,
        private readonly assessmentEmotionalAssessmentService: AssessmentEmotionalAssessmentService,
        @InjectRepository(EventUserBookingListsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaEventUserBookingListsRepository: Repository<EventUserBookingListsEntity>,
        @InjectRepository(CampaignActivityEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaCampaignActivityRepository: Repository<CampaignActivityEntity>,
        @InjectRepository(AssessmentsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaAssessmentsRepository: Repository<AssessmentsEntity>,
    ) {}
    async eventCategoryData(fields: any[] = [],condition: any, orderBy: any = null, joinCondition: any[] = [],dataType: any = 'getOne') {
        try{
            if (!orderBy) {
                orderBy = { 'ec.id': 'DESC' };
            }
            let query: any = this.readReplicaEventCategoryRepository.createQueryBuilder('ec')
            if (joinCondition && joinCondition?.length > 0) {
                for (let i = 0; i < joinCondition?.length; i++) {
                    const { join_table, table, alias, on_condition, join_type } = joinCondition[i];
                    switch (join_type) {
                        case 'left_one':
                            query = query.leftJoinAndMapOne(join_table, table, alias, on_condition);
                            break;
                        case 'left_many':
                            query = query.leftJoinAndMapMany(join_table, table, alias, on_condition);
                            break;
                        case 'inner_one':
                            query = query.innerJoinAndMapOne(join_table, table, alias, on_condition);
                            break;
                        case 'inner_many':
                            query = query.innerJoinAndMapMany(join_table, table, alias, on_condition);
                            break;
                    }
                }
            }
            query = query.where(condition).select(fields)
                .orderBy(`${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]]);
            switch (dataType) {
                case 'getOne':
                    query = query.getOne();
                    break;
                case 'getMany':
                    query = query.getMany();
                    break;
                case 'getRawOne':
                    query = query.getRawOne();
                    break;
                case 'getRawMany':
                    query = query.getRawMany();
                    break;
                case 'getCount':
                    query = query.getCount();
                    break;
            }
            return await query;
        }catch (error) {
            throw new Error(error.message); 
        }
    }
    async assessmentHraBiometricsData(fields: any[] = [],condition: any, orderBy: any = null, joinCondition: any[] = [],dataType: any = 'getOne') {
        try{
            if (!orderBy) {
                orderBy = { 'hra_bio.id' : 'DESC' };
            }
            let query: any = this.readReplicaassessmentHraBiometricsRepository.createQueryBuilder('hra_bio')
            if(joinCondition && joinCondition?.length > 0){
                for(let i = 0; i < joinCondition?.length; i++){
                    const { join_table, table, alias, on_condition, join_type } = joinCondition[i];
                    switch (join_type) {
                        case 'left_one':
                            query = query.leftJoinAndMapOne(join_table, table, alias, on_condition);
                            break;
                        case 'left_many':
                            query = query.leftJoinAndMapMany(join_table, table, alias, on_condition);
                            break;
                        case 'inner_one':
                            query = query.innerJoinAndMapOne(join_table, table, alias, on_condition);
                            break;
                        case 'inner_many':
                            query = query.innerJoinAndMapMany(join_table, table, alias, on_condition);
                            break;
                    }
                }
            }
            query = query.where(condition).select(fields)
                .orderBy(`${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]]);
            switch (dataType) {
                case 'getOne':
                    query = query.getOne();
                    break;
                case 'getMany':
                    query = query.getMany();
                    break;
                case 'getRawOne':
                    query = query.getRawOne();
                    break;
                case 'getRawMany':
                    query = query.getRawMany();
                    break;
                case 'getCount':
                    query = query.getCount();
                    break;
            }
            return await query;
        }catch (error) {
            throw new Error(error.message); 
        }
    }
    async bodyFeedsData(fields: any[] = [],condition: any, orderBy: any = null, joinCondition: any[] = [],dataType: any = 'getOne') {
        try{
            if (!orderBy) {
                orderBy = { 'bf.id' : 'DESC' };
            }
            let query: any = this.readReplicaBodyFeedsRepository.createQueryBuilder('bf')
            if(joinCondition && joinCondition?.length > 0){
                for(let i = 0; i < joinCondition?.length; i++){
                    const { join_table, table, alias, on_condition, join_type } = joinCondition[i];
                    switch (join_type) {
                        case 'left_one':
                            query = query.leftJoinAndMapOne(join_table, table, alias, on_condition);
                            break;
                        case 'left_many':
                            query = query.leftJoinAndMapMany(join_table, table, alias, on_condition);
                            break;
                        case 'inner_one':
                            query = query.innerJoinAndMapOne(join_table, table, alias, on_condition);
                            break;
                        case 'inner_many':
                            query = query.innerJoinAndMapMany(join_table, table, alias, on_condition);
                            break;
                    }
                }
            }
            query = query.where(condition).select(fields)
                .orderBy(`${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]]);
            switch (dataType) {
                case 'getOne':
                    query = query.getOne();
                    break;
                case 'getMany':
                    query = query.getMany();
                    break;
                case 'getRawOne':
                    query = query.getRawOne();
                    break;
                case 'getRawMany':
                    query = query.getRawMany();
                    break;
                case 'getCount':
                    query = query.getCount();
                    break;
            }
            return await query;
        }catch (error) {
            throw new Error(error.message); 
        }
    }
    async ftBiometricsData(fields: any[] = [],condition: any, orderBy: any = null, joinCondition: any[] = [],dataType: any = 'getOne') {
        try{
            if (!orderBy) {
                orderBy = { 'fb.id' : 'DESC' };
            }
            let query: any = this.readReplicaftBiometricsRepository.createQueryBuilder('fb')
            if(joinCondition && joinCondition?.length > 0){
                for(let i = 0; i < joinCondition?.length; i++){
                    const { join_table, table, alias, on_condition, join_type } = joinCondition[i];
                    switch (join_type) {
                        case 'left_one':
                            query = query.leftJoinAndMapOne(join_table, table, alias, on_condition);
                            break;
                        case 'left_many':
                            query = query.leftJoinAndMapMany(join_table, table, alias, on_condition);
                            break;
                        case 'inner_one':
                            query = query.innerJoinAndMapOne(join_table, table, alias, on_condition);
                            break;
                        case 'inner_many':
                            query = query.innerJoinAndMapMany(join_table, table, alias, on_condition);
                            break;
                    }
                }
            }
            query = query.where(condition).select(fields)
                .orderBy(`${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]]);
            switch (dataType) {
                case 'getOne':
                    query = query.getOne();
                    break;
                case 'getMany':
                    query = query.getMany();
                    break;
                case 'getRawOne':
                    query = query.getRawOne();
                    break;
                case 'getRawMany':
                    query = query.getRawMany();
                    break;
                case 'getCount':
                    query = query.getCount();
                    break;
            }
            return await query;
        }catch (error) {
            throw new Error(error.message); 
        }
    }
    async biometricsData(fields: any[] = [],condition: any, orderBy: any = null, joinCondition: any[] = [],dataType: any = 'getOne') {
        try{
            if (!orderBy) {
                orderBy = { 'hb.id' : 'DESC' };
            }
            let query: any = this.readReplicaBiometricsRepository.createQueryBuilder('hb')
            if(joinCondition && joinCondition?.length > 0){
                for(let i = 0; i < joinCondition?.length; i++){
                    const { join_table, table, alias, on_condition, join_type } = joinCondition[i];
                    switch (join_type) {
                        case 'left_one':
                            query = query.leftJoinAndMapOne(join_table, table, alias, on_condition);
                            break;
                        case 'left_many':
                            query = query.leftJoinAndMapMany(join_table, table, alias, on_condition);
                            break;
                        case 'inner_one':
                            query = query.innerJoinAndMapOne(join_table, table, alias, on_condition);
                            break;
                        case 'inner_many':
                            query = query.innerJoinAndMapMany(join_table, table, alias, on_condition);
                            break;
                    }
                }
            }
            query = query.where(condition).select(fields)
                .orderBy(`${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]]);
            switch (dataType) {
                case 'getOne':
                    query = query.getOne();
                    break;
                case 'getMany':
                    query = query.getMany();
                    break;
                case 'getRawOne':
                    query = query.getRawOne();
                    break;
                case 'getRawMany':
                    query = query.getRawMany();
                    break;
                case 'getCount':
                    query = query.getCount();
                    break;
            }
            return await query;
        }catch (error) {
            throw new Error(error.message); 
        }
    }
    async ScheduleChallengeData(fields: any[] = [],condition: any, orderBy: any = null, joinCondition: any[] = [],dataType: any = 'getOne') {
        try{
            if (!orderBy) {
                orderBy = { 'sc.id' : 'DESC' };
            }
            let query: any = this.readReplicaScheduleChallengeRepository.createQueryBuilder('sc')
            if(joinCondition && joinCondition?.length > 0){
                for(let i = 0; i < joinCondition?.length; i++){
                    const { join_table, table, alias, on_condition, join_type } = joinCondition[i];
                    switch (join_type) {
                        case 'left_one':
                            query = query.leftJoinAndMapOne(join_table, table, alias, on_condition);
                            break;
                        case 'left_many':
                            query = query.leftJoinAndMapMany(join_table, table, alias, on_condition);
                            break;
                        case 'inner_one':
                            query = query.innerJoinAndMapOne(join_table, table, alias, on_condition);
                            break;
                        case 'inner_many':
                            query = query.innerJoinAndMapMany(join_table, table, alias, on_condition);
                            break;
                    }
                }
            }
            query = query.where(condition).select(fields)
                .orderBy(`${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]]);
            switch (dataType) {
                case 'getOne':
                    query = query.getOne();
                    break;
                case 'getMany':
                    query = query.getMany();
                    break;
                case 'getRawOne':
                    query = query.getRawOne();
                    break;
                case 'getRawMany':
                    query = query.getRawMany();
                    break;
                case 'getCount':
                    query = query.getCount();
                    break;
            }
            return await query;
        }catch (error) {
            throw new Error(error.message); 
        }
    }
    async biometricsRecord(condition: any,paginationParam, tableData: any[] = [],orderBy: any = null) {
        try{
            const recordData = async (data) =>  {
                let responseData = [];
                for (let i = 0; i < data.length; i++) {
                    let bData = data[i];
                    let bmi: number = 0;
                    if ('weight' in bData && 'height_ft' in bData && 'height_in' in bData) {
                        let weight: number = Number(bData.weight);
                        let ft: number = Number(bData.height_ft);
                        let inch: number = Number(bData.height_in);
                        let inFT: number = ft * 12;
                        let totalInches: number = inFT + inch;
                        if ((totalInches * totalInches) != 0) {
                            bmi = parseFloat(((weight / (totalInches * totalInches)) * 703).toFixed(2));
                        }
                    }
                    let bioData = {
                        acl: bData?.alc,
                        bmi: bData?.bmi || bmi,
                        id: bData?.id,
                        frm: bData?.frm,
                        systolic: bData?.systolic,
                        diastolic : bData?.diastolic,
                        total_cholesterol: bData?.total_cholesterol,
                        hdl: bData?.hdl,
                        ldl: bData?.ldl,
                        triglycerides: bData?.triglycerides,
                        blood_glucose: bData?.blood_glucose,
                        source: bData?.source ? bData?.source : 14,
                        created: await this.commonDateService.DateTimeFormat(bData.created, 'YYYY-MM-DD HH:mm:ss'),
                        years: await this.commonDateService.DateTimeFormat(bData.created, 'YYYY'),
                        enter_by: 0,
                        waist: bData?.waist,
                        random_blood_glucose: bData?.random_blood_glucose,
                        fasting_blood_glucose: bData?.fasting_blood_glucose,
                    };
                    responseData.push({...bData,...bioData});
                }
                return responseData;
            }
            let hcData = await this.biometricsData(["hb.id AS id","hb.height AS height","hb.alc AS alc","hb.weight AS weight","hb.bmi AS bmi","hb.systolic AS systolic","hb.diastolic AS diastolic","IF(hb.test_type = 1, hb.blood_glucose, 0) AS random_blood_glucose","IF(hb.test_type = 2, hb.blood_glucose, 0) AS fasting_blood_glucose","hb.total_cholesterol AS total_cholesterol","hb.hdl AS hdl","hb.ldl AS ldl","hb.triglycerides AS triglycerides","hb.blood_glucose AS blood_glucose","hb.waist AS waist","hb.source AS source","hb.created AS created","DATE_FORMAT(hb.created, '%Y-%m-%d %H:%i:%s') AS log_date_tmp","hb.enter_by AS enter_by","'Biometric' AS frm"],condition['bio'],null,null,'getRawMany')
            hcData = await recordData(hcData);
            let resultedData = hcData;
            if (tableData.includes(tableConstant.HEALTH_ASSESSMENT.TBL_HA_HRABIOMETRICS)) {
                let hraData: any = await this.assessmentHraBiometricsData(["hra_bio.id AS id","hra_bio.alc AS alc","hra_bio.weight AS weight","hra_bio.height_ft AS height_ft","hra_bio.height_in AS height_in","CONCAT(hra_bio.height_ft, '.', hra_bio.height_in) AS height","hra_bio.bp_systolic AS systolic","IF(hra_bio.test_type = 1, hra_bio.blood_glucose, 0) AS random_blood_glucose","IF(hra_bio.test_type = 2, hra_bio.blood_glucose, 0) AS fasting_blood_glucose","hra_bio.bp_diastolic AS diastolic","hra_bio.total_cholesterol AS total_cholesterol","hra_bio.hdl AS hdl","hra_bio.ldl AS ldl","hra_bio.triglycerides AS triglycerides","hra_bio.blood_glucose AS blood_glucose","hra_bio.waist AS waist","hra_bio.source AS source","hra_bio.date AS created","DATE_FORMAT(hra_bio.date, '%Y-%m-%d %H:%i:%s') AS log_date_tmp","0 AS enter_by","'Hrabiometric' AS frm"],condition['hra_bio'],null,null,'getRawMany')
                hraData = await recordData(hraData);
                resultedData = [...resultedData, ...hraData];
            }
            if (tableData.includes(tableConstant.TRACKERS.TBL_FT_BIOMETRICS)) {
                let ftBioData =  await this.ftBiometricsData(["fb.id AS id","fb.alc AS alc","CONCAT(fb.height_ft, '.', fb.height_in) AS height","fb.height_ft AS height_ft","fb.height_in AS height_in","fb.weight AS weight","fb.systolic AS systolic ","fb.diastolic AS diastolic","IF(fb.glucose_type = 1, fb.glucose, 0) AS random_blood_glucose","IF(fb.glucose_type = 2, fb.glucose, 0) as fasting_blood_glucose","fb.glucose AS blood_glucose","fb.chol_total AS total_cholesterol","fb.hdl AS hdl","fb.ldl AS ldl","fb.triglycerides AS triglycerides","fb.added_date AS created","'' AS waist","DATE_FORMAT(fb.added_date, '%Y-%m-%d %H:%i:%s') AS log_date_tmp","0 AS enter_by","'FBiometric' AS frm"],condition['ft_bio'],null,null,'getRawMany')
                ftBioData = await recordData(ftBioData);
                resultedData = [...resultedData, ...ftBioData];
            }
            resultedData.sort((a, b) => {
                let dateA: any = this.commonDateService.DateTimeFormat(a['created'],'timestamp', 'YYYY-MM-DD HH:mm:ss')
                let dateB: any = this.commonDateService.DateTimeFormat(b['created'],'timestamp', 'YYYY-MM-DD HH:mm:ss')
                let dateATs: any = this.commonDateService.DateTimeFormat(a['created'],'YYYY-MM-DD', 'YYYY-MM-DD HH:mm:ss')
                let dateBTs: any = this.commonDateService.DateTimeFormat(b['created'],'YYYY-MM-DD', 'YYYY-MM-DD HH:mm:ss')
                if (orderBy?.created == 'DESC') {
                    return dateB - dateA;
                } else {
                    return dateA - dateB;
                }
                if (dateATs === dateBTs) {
                    if (orderBy?.id == 'DESC') {
                        return b['id'] - a['id'];
                    } else {
                        return a['id'] - b['id'];
                    }
                }
            });
            if (paginationParam?.page && paginationParam?.limit) {
                let paginateObj = this.commonArrayService.getPaginationVar(
                    paginationParam.page || 1,
                    paginationParam.limit,
                );
                return this.commonArrayService.paginationResponse(this.commonArrayService.paginate(resultedData, paginateObj.take || 10 , paginateObj.page || 1), resultedData.length, paginateObj)
            } else {
                return resultedData;
            }
        }catch (error) {
            throw new Error(error.message); 
        }
    }
    async assignActivityListRecord(condition: any, fields: any[] = [], orderBy: any = null): Promise<MyPlanAssignActivityEntity[]> {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaMyPlanAssignActivityRepository.find({
            where: condition,
            select: fields,
            order: orderBy,
        });
    }
    async assignActivityExists(condition: any) {
        return this.readReplicaMyPlanAssignActivityRepository.exist({
            where: condition
        });
    }
    async userExists(condition: any) {
        return this.readReplicaUserDetailsRepository.exist({
            where: condition
        });
    }
    async emPostListRecord(condition: any, fields: any[] = [], orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaWellbeingPostRepository.find({
            where: condition,
            select: fields,
            order: orderBy,
        });
    }
    async tobaccoUsesListRecord(condition: any, fields: any[] = [], orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaTobaccoUsesRepository.find({
            where: condition,
            select: fields,
            order: orderBy,
        });
    }
    async joinUserPlanExists(condition: any) {
        return this.readReplicaMyPlanJoinUserPlanRepository.exist({
            where: condition
        });
    }
    async assignBlockExists(condition: any): Promise<boolean> {
        return this.readReplicaMyPlanAssignBlockRepository.exist({
            where: condition
        });
    }
    async findOne(condition: any, fields: any[] = [], orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaCampaignRepository.findOne({
            where: condition,
            select: fields,
            order: orderBy,
        });
    }
    async qzUserDetailsData(fields: any[] = [],condition: any, orderBy: any = null, joinCondition: any[] = [],dataType: any = 'getOne') {
        try{
            if (!orderBy) {
                orderBy = { 'ec.id' : 'DESC' };
            }
            let query: any = this.readReplicaUserDetailsRepository.createQueryBuilder('ec')
            if(joinCondition && joinCondition?.length > 0){
                for(let i = 0; i < joinCondition?.length; i++){
                    const { join_table, table, alias, on_condition, join_type } = joinCondition[i];
                    switch (join_type) {
                        case 'left_one':
                            query = query.leftJoinAndMapOne(join_table, table, alias, on_condition);
                            break;
                        case 'left_many':
                            query = query.leftJoinAndMapMany(join_table, table, alias, on_condition);
                            break;
                        case 'inner_one':
                            query = query.innerJoinAndMapOne(join_table, table, alias, on_condition);
                            break;
                        case 'inner_many':
                            query = query.innerJoinAndMapMany(join_table, table, alias, on_condition);
                            break;
                    }
                }
            }
            query = query.where(condition).select(fields)
                .orderBy(`${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]]);
            switch (dataType) {
                case 'getOne':
                    query = query.getOne();
                    break;
                case 'getMany':
                    query = query.getMany();
                    break;
                case 'getRawOne':
                    query = query.getRawOne();
                    break;
                case 'getRawMany':
                    query = query.getRawMany();
                    break;
                case 'getCount':
                    query = query.getCount();
                    break;
            }
            return await query;
        }catch (error) {
            throw new Error(error.message); 
        }
    }
    async eventFindOne(condition: any, fields: any[] = [], orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaEventRepository.findOne({
            where: condition,
            select: fields,
            order: orderBy,
        });
    }
    async globalEventsData(fields: any[] = [],condition: any, orderBy: any = null, joinCondition: any[] = [],dataType: any = 'getOne') {
        try{
            if (!orderBy) {
                orderBy = { 'ge.id' : 'DESC' };
            }
            let query: any = this.readReplicaEventGlobalEventsRepository.createQueryBuilder('ge')
            if(joinCondition && joinCondition?.length > 0){
                for(let i = 0; i < joinCondition?.length; i++){
                    const { join_table, table, alias, on_condition, join_type } = joinCondition[i];
                    switch (join_type) {
                        case 'left_one':
                            query = query.leftJoinAndMapOne(join_table, table, alias, on_condition);
                            break;
                        case 'left_many':
                            query = query.leftJoinAndMapMany(join_table, table, alias, on_condition);
                            break;
                        case 'inner_one':
                            query = query.innerJoinAndMapOne(join_table, table, alias, on_condition);
                            break;
                        case 'inner_many':
                            query = query.innerJoinAndMapMany(join_table, table, alias, on_condition);
                            break;
                    }
                }
            }
            query = query.where(condition).select(fields)
                .orderBy(`${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]]);
            switch (dataType) {
                case 'getOne':
                    query = query.getOne();
                    break;
                case 'getMany':
                    query = query.getMany();
                    break;
                case 'getRawOne':
                    query = query.getRawOne();
                    break;
                case 'getRawMany':
                    query = query.getRawMany();
                    break;
                case 'getCount':
                    query = query.getCount();
                    break;
            }
            return await query;
        }catch (error) {
            throw new Error(error.message); 
        }
    }
    async assessmentOptionsData(fields: any[] = [],condition: any, orderBy: any = null, joinCondition: any[] = [],dataType: any = 'getOne') {
        try{
            if (!orderBy) {
                orderBy = { 'ao.id' : 'DESC' };
            }
            let query: any = this.readReplicaAssessmentOptionsRepository.createQueryBuilder('ao')
            if(joinCondition && joinCondition?.length > 0){
                for(let i = 0; i < joinCondition?.length; i++){
                    const { join_table, table, alias, on_condition, join_type } = joinCondition[i];
                    switch (join_type) {
                        case 'left_one':
                            query = query.leftJoinAndMapOne(join_table, table, alias, on_condition);
                            break;
                        case 'left_many':
                            query = query.leftJoinAndMapMany(join_table, table, alias, on_condition);
                            break;
                        case 'inner_one':
                            query = query.innerJoinAndMapOne(join_table, table, alias, on_condition);
                            break;
                        case 'inner_many':
                            query = query.innerJoinAndMapMany(join_table, table, alias, on_condition);
                            break;
                    }
                }
            }
            query = query.where(condition).select(fields)
                .orderBy(`${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]]);
            switch (dataType) {
                case 'getOne':
                    query = query.getOne();
                    break;
                case 'getMany':
                    query = query.getMany();
                    break;
                case 'getRawOne':
                    query = query.getRawOne();
                    break;
                case 'getRawMany':
                    query = query.getRawMany();
                    break;
                case 'getCount':
                    query = query.getCount();
                    break;
            }
            return await query;
        }catch (error) {
            throw new Error(error.message); 
        }
    }
    async assignPlanData(fields: any[] = [],condition: any, orderBy: any = null, joinCondition: any[] = [],dataType: any = 'getOne') {
        try{
            if (!orderBy) {
                orderBy = { 'ap.id' : 'DESC' };
            }
            let query: any = this.readReplicaMyPlanAssignPlanRepository.createQueryBuilder('ap')
            if(joinCondition && joinCondition?.length > 0){
                for(let i = 0; i < joinCondition?.length; i++){
                    const { join_table, table, alias, on_condition, join_type } = joinCondition[i];
                    switch (join_type) {
                        case 'left_one':
                            query = query.leftJoinAndMapOne(join_table, table, alias, on_condition);
                            break;
                        case 'left_many':
                            query = query.leftJoinAndMapMany(join_table, table, alias, on_condition);
                            break;
                        case 'inner_one':
                            query = query.innerJoinAndMapOne(join_table, table, alias, on_condition);
                            break;
                        case 'inner_many':
                            query = query.innerJoinAndMapMany(join_table, table, alias, on_condition);
                            break;
                    }
                }
            }
            query = query.where(condition).select(fields)
                .orderBy(`${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]]);
            switch (dataType) {
                case 'getOne':
                    query = query.getOne();
                    break;
                case 'getMany':
                    query = query.getMany();
                    break;
                case 'getRawOne':
                    query = query.getRawOne();
                    break;
                case 'getRawMany':
                    query = query.getRawMany();
                    break;
                case 'getCount':
                    query = query.getCount();
                    break;
            }
            return await query;
        }catch (error) {
            throw new Error(error.message); 
        }
    }
    async assignBlockData(fields: any[] = [],condition: any, orderBy: any = null, joinCondition: any[] = [],dataType: any = 'getOne') {
        try{
            if (!orderBy) {
                orderBy = { 'ab.id' : 'DESC' };
            }
            let query: any = this.readReplicaMyPlanAssignBlockRepository.createQueryBuilder('ab')
            if(joinCondition && joinCondition?.length > 0){
                for(let i = 0; i < joinCondition?.length; i++){
                    const { join_table, table, alias, on_condition, join_type } = joinCondition[i];
                    switch (join_type) {
                        case 'left_one':
                            query = query.leftJoinAndMapOne(join_table, table, alias, on_condition);
                            break;
                        case 'left_many':
                            query = query.leftJoinAndMapMany(join_table, table, alias, on_condition);
                            break;
                        case 'inner_one':
                            query = query.innerJoinAndMapOne(join_table, table, alias, on_condition);
                            break;
                        case 'inner_many':
                            query = query.innerJoinAndMapMany(join_table, table, alias, on_condition);
                            break;
                    }
                }
            }
            query = query.where(condition).select(fields)
                .orderBy(`${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]]);
            switch (dataType) {
                case 'getOne':
                    query = query.getOne();
                    break;
                case 'getMany':
                    query = query.getMany();
                    break;
                case 'getRawOne':
                    query = query.getRawOne();
                    break;
                case 'getRawMany':
                    query = query.getRawMany();
                    break;
                case 'getCount':
                    query = query.getCount();
                    break;
            }
            return await query;
        }catch (error) {
            throw new Error(error.message); 
        }
    }
    async activityData(fields: any[] = [],condition: any, orderBy: any = null, joinCondition: any[] = [],dataType: any = 'getOne') {
        try{
            if (!orderBy) {
                orderBy = { 'ac.id' : 'DESC' };
            }
            let query: any = this.readReplicaActivityRepository.createQueryBuilder('ac')
            if(joinCondition && joinCondition?.length > 0){
                for(let i = 0; i < joinCondition?.length; i++){
                    const { join_table, table, alias, on_condition, join_type } = joinCondition[i];
                    switch (join_type) {
                        case 'left_one':
                            query = query.leftJoinAndMapOne(join_table, table, alias, on_condition);
                            break;
                        case 'left_many':
                            query = query.leftJoinAndMapMany(join_table, table, alias, on_condition);
                            break;
                        case 'inner_one':
                            query = query.innerJoinAndMapOne(join_table, table, alias, on_condition);
                            break;
                        case 'inner_many':
                            query = query.innerJoinAndMapMany(join_table, table, alias, on_condition);
                            break;
                    }
                }
            }
            query = query.where(condition).select(fields)
                .orderBy(`${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]]);
            switch (dataType) {
                case 'getOne':
                    query = query.getOne();
                    break;
                case 'getMany':
                    query = query.getMany();
                    break;
                case 'getRawOne':
                    query = query.getRawOne();
                    break;
                case 'getRawMany':
                    query = query.getRawMany();
                    break;
                case 'getCount':
                    query = query.getCount();
                    break;
            }
            return await query;
        }catch (error) {
            throw new Error(error.message); 
        }
    }
    async emotionalAssessmentData(fields: any[] = [],condition: any, orderBy: any = null, joinCondition: any[] = [],dataType: any = 'getOne') {
        try{
            if (!orderBy) {
                orderBy = { 'ea.id' : 'DESC' };
            }
            let query: any = this.readReplicaAssessmentEmotionalAssessmentRepository.createQueryBuilder('ea')
            if(joinCondition && joinCondition?.length > 0){
                for(let i = 0; i < joinCondition?.length; i++){
                    const { join_table, table, alias, on_condition, join_type } = joinCondition[i];
                    switch (join_type) {
                        case 'left_one':
                            query = query.leftJoinAndMapOne(join_table, table, alias, on_condition);
                            break;
                        case 'left_many':
                            query = query.leftJoinAndMapMany(join_table, table, alias, on_condition);
                            break;
                        case 'inner_one':
                            query = query.innerJoinAndMapOne(join_table, table, alias, on_condition);
                            break;
                        case 'inner_many':
                            query = query.innerJoinAndMapMany(join_table, table, alias, on_condition);
                            break;
                    }
                }
            }
            query = query.where(condition).select(fields)
                .orderBy(`${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]]);
            switch (dataType) {
                case 'getOne':
                    query = query.getOne();
                    break;
                case 'getMany':
                    query = query.getMany();
                    break;
                case 'getRawOne':
                    query = query.getRawOne();
                    break;
                case 'getRawMany':
                    query = query.getRawMany();
                    break;
                case 'getCount':
                    query = query.getCount();
                    break;
            }
            return await query;
        }catch (error) {
            throw new Error(error.message); 
        }
    }

    async emotionalResultData(userId,orgId,extraData = '',report = '', req) {
        try{
            let resultArray = {},result = [];
            let tabsAll: AssessmentResultsEntity[] = await this.assessmentResultsService.listRecord({organization_id: orgId, status: Not('2')},['id', 'title','type'],{ id: 'ASC' });
            if(tabsAll && tabsAll.length){
                await Promise.all(tabsAll.map(async (ele)=>{
                    if(ele.title){
                        let customeName = await this.translatorService.frontendReadTranslation(req.lang,`assessment_title_${ele.organization_id}_${ele['id']}`, `/LC_MESSAGES/MyHealth/Assessment/eha/${ele['organization_id']}`,`dynamic`);
                        ele.title = (customeName == '' || customeName == `assessment_title_${ele.organization_id}_${ele['id']}`) ? ele['title'] : customeName;
                    }
                }));
            }
            if (extraData) {
                let qDatas: any;
                if (report) {
                    qDatas = await this.assessmentEmotionalAssessmentService.listRecord(`healthassessment.user_id = ${userId} AND healthassessment.status = '1'`,{id: "DESC"},null,[tableConstant.HEALTH_ASSESSMENT.TBL_HA_EMOTIONAL_ASSESSMENTS_RESULT,tableConstant.HEALTH_ASSESSMENT.TBL_HA_EMOTIONAL_ASSESSMENTS_ANSWER,tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_OPTIONS,tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_QUESTIONS,tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_RESULTS]);
                } else {
                    qDatas = await this.assessmentEmotionalAssessmentService.assessmentFindOne(`healthassessment.user_id = ${userId} AND healthassessment.status = '1'`,{id: "DESC"},null,[tableConstant.HEALTH_ASSESSMENT.TBL_HA_EMOTIONAL_ASSESSMENTS_RESULT,tableConstant.HEALTH_ASSESSMENT.TBL_HA_EMOTIONAL_ASSESSMENTS_ANSWER,tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_OPTIONS,tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_QUESTIONS,tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_RESULTS]);
                }
                if (report) {
                    let questionScore = {}, tobaccoVaping = { tobacco: {} }, result = {}, tabsAllExtraData = {};
                    if (tabsAll && tabsAll.length > 0 && qDatas) {
                        qDatas.forEach(qData => {
                            if (qData['ear']) {
                                qData['ear'].forEach(results => {
                                    results['eaa'].forEach(answer => {
                                        let options = answer['ao'];
                                        if (options) {
                                            let question = options['aq'];
                                            if (question) {
                                                let userId = qData['user_id'];
                                                let resultType = question['result_type'];
                                                let riskRating = options['risk_rating'];
                                                questionScore[userId] = questionScore[userId] || {};
                                                questionScore[userId][resultType] = questionScore[userId][resultType] || {};
                                                questionScore[userId][resultType][riskRating] = (questionScore[userId][resultType][riskRating] || 0) + 1;
                                                if(question?.['ar'] && [1, 2, 3].includes(question?.['ar']['type'])) {
                                                    if (answer['ao']['aq']['ar']['type'] === 2) {
                                                        if (answer['ao']['aq']['ar']['marker-common'] !== '') {
                                                            tobaccoVaping['tobacco'][answer['ao']['aq']['result_type']][-1] = tobaccoVaping['tobacco'][answer['ao']['aq']['result_type']][-1] || [];
                                                            tobaccoVaping['tobacco'][answer['ao']['aq']['result_type']][-1].push(answer['ao']['aq']['ar']['marker-common']);
                                                        }
                                                        if (answer['ao']['message_add'] !== '') {
                                                            tobaccoVaping['tobacco'][answer['ao']['aq']['result_type']][answer['ao']['sort_order']] = answer['ao']['message_add'];
                                                            let result_type = answer['ao']['aq']['result_type'];
                                                            let currentTypeTobacco = tobaccoVaping['tobacco'][result_type];
                                                            if (currentTypeTobacco[1]) {
                                                                delete currentTypeTobacco[2];
                                                                delete currentTypeTobacco[3];
                                                                delete currentTypeTobacco[4];
                                                                delete currentTypeTobacco[5];
                                                            } else if (currentTypeTobacco[2]) {
                                                                delete currentTypeTobacco[3];
                                                                delete currentTypeTobacco[4];
                                                                delete currentTypeTobacco[5];
                                                            } else if (currentTypeTobacco[3]) {
                                                                delete currentTypeTobacco[4];
                                                                delete currentTypeTobacco[5];
                                                            } else if (currentTypeTobacco[4]) {
                                                                delete currentTypeTobacco[5];
                                                            }
                                                        }
                                                        if ([1, 2, 3].includes(answer['ao']['sort_order']) && answer['ao']['aq']['ar']['is_response'] === 1 && answer['ao']['aq']['ar']['marker-common_last'] !== '') {
                                                            tobaccoVaping['tobacco'][answer['ao']['aq']['result_type']][100] = answer['ao']['aq']['ar']['marker-common_last'];
                                                        }
                                                    } else {
                                                        if (answer['ao']['message_add'] !== '') {
                                                            tobaccoVaping[answer['ao']['aq']['result_type']][answer['ao']['sort_order']] = answer['ao']['message_add'];
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    });
                                });
                                if(questionScore[qData['user_id']]) {
                                    Object.keys(questionScore[qData['user_id']]).forEach(key => {
                                        if(questionScore[qData['user_id']][key][2]) questionScore[qData['user_id']][key] = 2;
                                        else if (questionScore[qData['user_id']][key][1]) questionScore[qData['user_id']][key] = 1;
                                        else questionScore[qData['user_id']][key] = 0;
                                    })
                                }
                            }
                            tabsAll.forEach(tab => {
                                let resultId = tab['id'];
                                tabsAllExtraData[resultId] = tab['title'];
                                if(questionScore[qData['user_id']] && questionScore[qData['user_id']][resultId]) {
                                    result[qData['user_id']] = result[qData['user_id']] || {};
                                    result[qData['user_id']][resultId] = questionScore[qData['user_id']][resultId];
                                }
                            })
                        })
                        if(extraData === 'Yes') {
                            result['result_detail'] = tabsAllExtraData;
                        }
                    }
                    resultArray = result;
                } else {
                    let questionScore = {}, tobaccoVaping = { tobacco: {} }, tabsAllExtraData = {};
                    if (tabsAll && tabsAll.length > 0 && qDatas) {
                        if (qDatas['ear']) {
                            qDatas['ear'].forEach(results => {
                                results['eaa'].forEach(answer => {
                                    let options = answer['ao'];
                                    if (options) {
                                        let question = options['aq'];
                                        if (question) {
                                            let resultType = question['result_type'];
                                            let riskRating = options['risk_rating'];
                                            questionScore[resultType] = questionScore[resultType] || {};
                                            questionScore[resultType][riskRating] = (questionScore[resultType][riskRating] || 0) + 1;
                                            if(question['ar'] && [1, 2, 3].includes(question['ar']['type'])) {
                                                if (answer['ao']['aq']['ar']['type'] == 2) {
                                                    tobaccoVaping['tobacco'][answer['ao']['aq']['result_type']] = tobaccoVaping['tobacco'][answer['ao']['aq']['result_type']] || {};
                                                    if (answer['ao']['aq']['ar']['marker-common'] != '') {
                                                        tobaccoVaping['tobacco'][answer['ao']['aq']['result_type']][-1] = tobaccoVaping['tobacco'][answer['ao']['aq']['result_type']][-1] || [];
                                                        tobaccoVaping['tobacco'][answer['ao']['aq']['result_type']][-1].push(answer['ao']['aq']['ar']['marker-common']);
                                                    }
                                                    if (answer['ao']['message_add'] != '') {
                                                        tobaccoVaping['tobacco'][answer['ao']['aq']['result_type']][answer['ao']['sort_order']] = tobaccoVaping['tobacco'][answer['ao']['aq']['result_type']][answer['ao']['sort_order']] || [];
                                                        tobaccoVaping['tobacco'][answer['ao']['aq']['result_type']][answer['ao']['sort_order']].push(answer['ao']['message_add']);
                                                        if (tobaccoVaping['tobacco']?.[answer['ao']['aq']['result_type']]?.[1]) {
                                                            delete tobaccoVaping['tobacco'][answer['ao']['aq']['result_type']][2];
                                                            delete tobaccoVaping['tobacco'][answer['ao']['aq']['result_type']][3];
                                                            delete tobaccoVaping['tobacco'][answer['ao']['aq']['result_type']][4];
                                                            delete tobaccoVaping['tobacco'][answer['ao']['aq']['result_type']][5];
                                                        } else if (tobaccoVaping['tobacco']?.[answer['ao']['aq']['result_type']]?.[2]) {
                                                            delete tobaccoVaping['tobacco'][answer['ao']['aq']['result_type']][3];
                                                            delete tobaccoVaping['tobacco'][answer['ao']['aq']['result_type']][4];
                                                            delete tobaccoVaping['tobacco'][answer['ao']['aq']['result_type']][5];
                                                        } else if (tobaccoVaping['tobacco']?.[answer['ao']['aq']['result_type']]?.[3]) {
                                                            delete tobaccoVaping['tobacco'][answer['ao']['aq']['result_type']][4];
                                                            delete tobaccoVaping['tobacco'][answer['ao']['aq']['result_type']][5];
                                                        } else if (tobaccoVaping['tobacco']?.[answer['ao']['aq']['result_type']]?.[4]) {
                                                            delete tobaccoVaping['tobacco'][answer['ao']['aq']['result_type']][5];
                                                        }
                                                    }
                                                    if ([1, 2, 3].includes(answer['ao']['sort_order']) && answer['ao']['aq']['ar']['is_response'] == 1 && answer['ao']['aq']['ar']['marker-common_last'] != '') {
                                                        tobaccoVaping['tobacco'][answer['ao']['aq']['result_type']][100] = tobaccoVaping['tobacco'][answer['ao']['aq']['result_type']][100] || [];
                                                        tobaccoVaping['tobacco'][answer['ao']['aq']['result_type']][100].push(answer['ao']['aq']['ar']['marker-common_last']);
                                                    }
                                                } else {
                                                    if (answer['ao']['message_add'] != '') {
                                                        tobaccoVaping[answer['ao']['aq']['result_type']] = tobaccoVaping[answer['ao']['aq']['result_type']] || {};
                                                        tobaccoVaping[answer['ao']['aq']['result_type']][answer['ao']['sort_order']] = tobaccoVaping[answer['ao']['aq']['result_type']][answer['ao']['sort_order']] || []
                                                        tobaccoVaping[answer['ao']['aq']['result_type']][answer['ao']['sort_order']].push(answer['ao']['message_add']);
                                                    }
                                                }
                                            }
                                        }
                                    }
                                });
                            });
                            const questionScoreKeys = Object.keys(questionScore);
                            for (let i = 0; i < questionScoreKeys.length; i++) {
                                let questionScoreKey = questionScoreKeys[i];
                                let questionScoreData = questionScore[questionScoreKey];
                                if (questionScoreData['2'] !== undefined) {
                                    questionScore[questionScoreKey] = 2;
                                } else if (questionScoreData['1'] !== undefined) {
                                    questionScore[questionScoreKey] = 1;
                                } else {
                                    questionScore[questionScoreKey] = 0;
                                }
                            }
                        }
                    }
                    for (let i = 0; i < tabsAll.length; i++) {
                        let tab = tabsAll[i];
                        let resultId = tab['id'];
                        tabsAllExtraData[resultId] = tab['title'];
                        if (questionScore[resultId]) {
                            resultArray[resultId] = questionScore[resultId];
                        }
                    }
                    if(extraData === 'Yes') {
                        resultArray['result_detail'] = tabsAllExtraData;
                    }
                }
                return resultArray;
            } else {
                if(!Array.isArray(userId)){
                    userId = userId.split(',');
                }
                let qData = {};
                let emotional = {};
                const chunkArray = (array, chunkSize) => {
                    const result = [];
                    for (let i = 0; i < array.length; i += chunkSize) {
                        result.push(array.slice(i, i + chunkSize));
                    }
                    return result;
                };
                const userIdChunks = chunkArray(userId, 500);
                for (let userIdKey = 0; userIdKey < userIdChunks.length; userIdKey++) {
                    const userIdChunk = userIdChunks[userIdKey];
                    let userIds = userIdChunk.join(',');
                    let assessmentData: any = await this.emotionalAssessmentData(['ea.id','ea.created','ea.user_id','ear.id'],{user_id: In(userIdChunk), status: '1'},{ 'ea.id' : 'DESC' },[{'join_table': 'ea.ear','alias':'ear', 'table' : tableConstant.HEALTH_ASSESSMENT.TBL_HA_EMOTIONAL_ASSESSMENTS_RESULT, 'on_condition' : `ear.assessment_id = ea.id AND ear.status = '1'`, 'join_type': 'left_many' }],'getMany');
                    const EmotionalAssessmentsResults = {};
                    for (let i = 0; i < assessmentData.length; i++) {
                        const parent = assessmentData[i];
                        const ears = parent.ear;
                        for (let j = 0; j < ears.length; j++) {
                            const earItem = ears[j];
                            EmotionalAssessmentsResults[earItem.id] = {id: parent.id,created: parent.created,user_id: parent.user_id,years: await this.commonDateService.DateTimeFormat(parent.created,'YYYY','YYYY-MM-DD HH:mm:ss'),ear: earItem};
                        }
                    }
                    let AssessmentResultsKeys = Object.keys(EmotionalAssessmentsResults);
                    if (AssessmentResultsKeys.length === 0) {
                        continue;
                    }
                    let assessmentAnswerData = await this.assessmentEmotionalAssessmentAnswerService.listRecord({result_id: In(AssessmentResultsKeys), status: '1'},null,['id','option_id','result_id']);
                    let emotionalAssessmentsAnswers = {},emotionalAssessmentsAnswersTmp = {};
                    for (let i = 0; i < assessmentAnswerData.length; i++) {
                        let item = assessmentAnswerData[i];
                        if (!emotionalAssessmentsAnswers[item.result_id]) {
                            emotionalAssessmentsAnswers[item.result_id] = {};
                        }
                        emotionalAssessmentsAnswers[item.result_id][item.id] = item.option_id;
                        emotionalAssessmentsAnswersTmp[item.id] = item.option_id;
                    }
                    let uniqueAnswers = Array.from(new Set(Object.values(emotionalAssessmentsAnswersTmp)));
                    let implodedAnswers = uniqueAnswers.join(',');
                    let assessmentOptionData = await this.assessmentOptionsData(['ao.id','ao.status','ao.risk_rating','aq.id','aq.result_type','ar.id'], {id: In(uniqueAnswers),status: '1'}, {'ao.sort_order': 'ASC'},[{'join_table': 'ao.aq','alias':'aq', 'table' : tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_QUESTIONS, 'on_condition' : `ao.question_id = aq.id AND aq.status = '1'`, 'join_type': 'left_one' },{'join_table': 'aq.ar','alias':'ar', 'table' : tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_RESULTS, 'on_condition' : `aq.result_type = ar.id AND ar.status = '1'`, 'join_type': 'left_one' }],'getMany');
                    let AssessmentOptions = {};
                    for (let i = 0; i < assessmentOptionData.length; i++) {
                        AssessmentOptions[assessmentOptionData[i].id] = assessmentOptionData[i];
                    }
                    const keys = Object.keys(EmotionalAssessmentsResults);
                    for (let i = 0; i < keys.length; i++) {
                        let key = keys[i];
                        let qDataVal = EmotionalAssessmentsResults[key];
                        if (emotionalAssessmentsAnswers[key]) {
                            const answers = emotionalAssessmentsAnswers[qDataVal['ear']['id']];
                            const answersKeys = Object.keys(answers);
                            for (let j = 0; j < answersKeys.length; j++) {
                                let element = answers[answersKeys[j]];
                                let AssessmentOption: any = AssessmentOptions[`${element}`] ? AssessmentOptions[`${element}`] : {};
                                qData[qDataVal['id']] = qData[qDataVal['id']] || {};
                                qData[qDataVal['id']]["EmotionalAssessmentsResults"] = qData[qDataVal['id']]["EmotionalAssessmentsResults"] || {};
                                qData[qDataVal['id']]["EmotionalAssessmentsResults"][qDataVal['ear']['id']] = qData[qDataVal['id']]["EmotionalAssessmentsResults"][qDataVal['ear']['id']] || {};
                                qData[qDataVal['id']]["EmotionalAssessmentsResults"][qDataVal['ear']['id']]["EmotionalAssessmentsAnswers"] = qData[qDataVal['id']]["EmotionalAssessmentsResults"][qDataVal['ear']['id']]["EmotionalAssessmentsAnswers"] || {};
                                qData[qDataVal['id']]["EmotionalAssessmentsResults"][qDataVal['ear']['id']]["EmotionalAssessmentsAnswers"][answersKeys[j]] = qData[qDataVal['id']]["EmotionalAssessmentsResults"][qDataVal['ear']['id']]["EmotionalAssessmentsAnswers"][answersKeys[j]] || {};
                                qData[qDataVal['id']]["EmotionalAssessmentsResults"][qDataVal['ear']['id']]["EmotionalAssessmentsAnswers"][answersKeys[j]]["AssessmentOptions"] = qData[qDataVal['id']]["EmotionalAssessmentsResults"][qDataVal['ear']['id']]["EmotionalAssessmentsAnswers"][answersKeys[j]]["AssessmentOptions"] || {};
                                qData[qDataVal['id']]["EmotionalAssessmentsResults"][qDataVal['ear']['id']]["EmotionalAssessmentsAnswers"][answersKeys[j]]["AssessmentOptions"]["risk_rating"] = AssessmentOption["risk_rating"] ?? '';
                                qData[qDataVal['id']]["EmotionalAssessmentsResults"][qDataVal['ear']['id']]["EmotionalAssessmentsAnswers"][answersKeys[j]]["AssessmentOptions"]["AssessmentQuestions"] = qData[qDataVal['id']]["EmotionalAssessmentsResults"][qDataVal['ear']['id']]["EmotionalAssessmentsAnswers"][answersKeys[j]]["AssessmentOptions"]["AssessmentQuestions"] || {};
                                qData[qDataVal['id']]["EmotionalAssessmentsResults"][qDataVal['ear']['id']]["EmotionalAssessmentsAnswers"][answersKeys[j]]["AssessmentOptions"]["AssessmentQuestions"]["result_type"] = AssessmentOption["aq"]?.["result_type"] ?? '';
                                qData[qDataVal['id']]["EmotionalAssessmentsResults"][qDataVal['ear']['id']]["EmotionalAssessmentsAnswers"][answersKeys[j]]["AssessmentOptions"]["AssessmentQuestions"]["AssessmentResults"] = AssessmentOption["aq"]?.["ar"] || '';
                            }
                        }
                        qData[qDataVal['id']] = qData[qDataVal['id']] || {}
                        qData[qDataVal['id']]["0"] = qDataVal['years'];
                        qData[qDataVal['id']]["years"] = qDataVal['years'];
                        qData[qDataVal['id']]['EmotionalAssessments'] = qDataVal;
                    }
                }
                emotional['Tabsall'] = tabsAll;
                emotional['qData'] = qData;
                emotional['extradata'] = extraData;
                return emotional;
            }
        }catch (error) {
            throw new Error(error.message); 
        }
    };

    async eventUserBookingListsData(fields: any[] = [],condition: any, orderBy: any = null, joinCondition: any[] = [],dataType: any = 'getOne') {
        try{
            if (!orderBy) {
                orderBy = { 'eub.id' : 'DESC' };
            }
            let query: any = this.readReplicaEventUserBookingListsRepository.createQueryBuilder('eub')
            if(joinCondition && joinCondition?.length > 0){
                for(let i = 0; i < joinCondition?.length; i++){
                    const { join_table, table, alias, on_condition, join_type } = joinCondition[i];
                    switch (join_type) {
                        case 'left_one':
                            query = query.leftJoinAndMapOne(join_table, table, alias, on_condition);
                            break;
                        case 'left_many':
                            query = query.leftJoinAndMapMany(join_table, table, alias, on_condition);
                            break;
                        case 'inner_one':
                            query = query.innerJoinAndMapOne(join_table, table, alias, on_condition);
                            break;
                        case 'inner_many':
                            query = query.innerJoinAndMapMany(join_table, table, alias, on_condition);
                            break;
                    }
                }
            }
            query = query.where(condition).select(fields)
                .orderBy(`${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]]);
            switch (dataType) {
                case 'getOne':
                    query = query.getOne();
                    break;
                case 'getMany':
                    query = query.getMany();
                    break;
                case 'getRawOne':
                    query = query.getRawOne();
                    break;
                case 'getRawMany':
                    query = query.getRawMany();
                    break;
                case 'getCount':
                    query = query.getCount();
                    break;
            }
            return await query;
        }catch (error) {
            throw new Error(error.message);
        }
    }

    async campaignActivityData(fields: any[] = [],condition: any, orderBy: any = null, joinCondition: any[] = [],dataType: any = 'getOne') {
        try{
            if (!orderBy) {
                orderBy = { 'ca.id' : 'DESC' };
            }
            let query: any = this.readReplicaCampaignActivityRepository.createQueryBuilder('ca')
            if(joinCondition && joinCondition?.length > 0){
                for(let i = 0; i < joinCondition?.length; i++){
                    const { join_table, table, alias, on_condition, join_type } = joinCondition[i];
                    switch (join_type) {
                        case 'left_one':
                            query = query.leftJoinAndMapOne(join_table, table, alias, on_condition);
                            break;
                        case 'left_many':
                            query = query.leftJoinAndMapMany(join_table, table, alias, on_condition);
                            break;
                        case 'inner_one':
                            query = query.innerJoinAndMapOne(join_table, table, alias, on_condition);
                            break;
                        case 'inner_many':
                            query = query.innerJoinAndMapMany(join_table, table, alias, on_condition);
                            break;
                    }
                }
            }
            query = query.where(condition).select(fields)
                .orderBy(`${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]]);
            switch (dataType) {
                case 'getOne':
                    query = query.getOne();
                    break;
                case 'getMany':
                    query = query.getMany();
                    break;
                case 'getRawOne':
                    query = query.getRawOne();
                    break;
                case 'getRawMany':
                    query = query.getRawMany();
                    break;
                case 'getCount':
                    query = query.getCount();
                    break;
            }
            return await query;
        }catch (error) {
            throw new Error(error.message);
        }
    }

    async assessmentsData(fields: any[] = [],condition: any, orderBy: any = null, joinCondition: any[] = [],dataType: any = 'getOne') {
        try{
            if (!orderBy) {
                orderBy = { 'ha.id' : 'DESC' };
            }
            let query: any = this.readReplicaAssessmentsRepository.createQueryBuilder('ha')
            if(joinCondition && joinCondition?.length > 0){
                for(let i = 0; i < joinCondition?.length; i++){
                    const { join_table, table, alias, on_condition, join_type } = joinCondition[i];
                    switch (join_type) {
                        case 'left_one':
                            query = query.leftJoinAndMapOne(join_table, table, alias, on_condition);
                            break;
                        case 'left_many':
                            query = query.leftJoinAndMapMany(join_table, table, alias, on_condition);
                            break;
                        case 'inner_one':
                            query = query.innerJoinAndMapOne(join_table, table, alias, on_condition);
                            break;
                        case 'inner_many':
                            query = query.innerJoinAndMapMany(join_table, table, alias, on_condition);
                            break;
                    }
                }
            }
            query = query.where(condition).select(fields)
                .orderBy(`${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]]);
            switch (dataType) {
                case 'getOne':
                    query = query.getOne();
                    break;
                case 'getMany':
                    query = query.getMany();
                    break;
                case 'getRawOne':
                    query = query.getRawOne();
                    break;
                case 'getRawMany':
                    query = query.getRawMany();
                    break;
                case 'getCount':
                    query = query.getCount();
                    break;
            }
            return await query;
        }catch (error) {
            throw new Error(error.message);
        }
    }
}

import {
    appConstant, AssessmentEmotionalAssessmentAnswerEntity,
    AssessmentEmotionalAssessmentEntity, AssessmentHaQuestionsEntity,
    AssessmentHraBiometricEntity,
    AssessmentOptionsEntity,
    AssessmentQuestionsEntity,
    AssessmentResultsEntity, AssessmentsEntity,
    AssessmentSettingsEntity,
    AssessmentTabsEntity,
    BiometricsEntity, CommonArrayService, CommonDateService, FtBiometricsEntity, tableConstant, UserEntity
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class FrontService {
    constructor(
        private readonly commonArrayService: CommonArrayService,
        private readonly commonDateService: CommonDateService,
        @InjectRepository(AssessmentEmotionalAssessmentEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaAssessmentEmotionalAssessmentRepository: Repository<AssessmentEmotionalAssessmentEntity>,
        @InjectRepository(AssessmentOptionsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaAssessmentOptionsRepository: Repository<AssessmentOptionsEntity>,
        @InjectRepository(FtBiometricsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaFtBiometricsRepository: Repository<FtBiometricsEntity>,
        @InjectRepository(BiometricsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaBiometricsRepository: Repository<BiometricsEntity>,
        @InjectRepository(AssessmentHraBiometricEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaAssessmentHraBiometricsRepository: Repository<AssessmentHraBiometricEntity>,
        @InjectRepository(AssessmentSettingsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaAssessmentSettingsRepository: Repository<AssessmentSettingsEntity>,
        @InjectRepository(AssessmentResultsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaAssessmentResultsRepository: Repository<AssessmentResultsEntity>,
        @InjectRepository(AssessmentTabsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaAssessmentTabsRepository: Repository<AssessmentTabsEntity>,
        @InjectRepository(AssessmentQuestionsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaAssessmentQuestionsRepository: Repository<AssessmentQuestionsEntity>,
        @InjectRepository(AssessmentEmotionalAssessmentAnswerEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaAssessmentEmotionalAssessmentAnswerRepository: Repository<AssessmentEmotionalAssessmentAnswerEntity>,
        @InjectRepository(AssessmentHaQuestionsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaAssessmentHaQuestionsRepository: Repository<AssessmentHaQuestionsEntity>,
        @InjectRepository(UserEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaUserRepository: Repository<UserEntity>,
        @InjectRepository(AssessmentsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaAssessmentsRepository: Repository<AssessmentsEntity>,
    ) {}
    /*[{'join_table': 't1.t2','alias':'t2', 'table' : tableConstant.TBL_USERS, 'on_condition' : `t1.user_id = t2.id`, 'join_type': 'left_one' }]*/
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
    async assessmentOptionsListRecord(condition: any, fields: any[] = [], orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaAssessmentOptionsRepository.find({
            where: condition,
            select: fields,
            order: orderBy,
        });
    }
    async assessmentsListRecord(condition: any, fields: any[] = [], orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaAssessmentsRepository.find({
            where: condition,
            select: fields,
            order: orderBy,
        });
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
    async assessmentHraBiometricsData(fields: any[] = [],condition: any, orderBy: any = null, joinCondition: any[] = [],dataType: any = 'getOne') {
        try{
            if (!orderBy) {
                orderBy = { 'hra_bio.id' : 'DESC' };
            }
            let query: any = this.readReplicaAssessmentHraBiometricsRepository.createQueryBuilder('hra_bio')
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
            let query: any = this.readReplicaFtBiometricsRepository.createQueryBuilder('fb')
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
                    if(bData.weight){
                        let weight: number = Number(bData.weight);
                        let ft: number = Number(bData.height_ft);
                        let inch: number = Number(bData.height_in);
                        let inFT: number = ft * 12;
                        let totalInches: number = inFT + inch;
                        bmi = parseFloat(((weight / (totalInches * totalInches)) * 703).toFixed(2));
                    }
                    let bioData = {
                        acl: bData?.alc,
                        bmi: bmi,
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
                        created: bData.added_date ? await this.commonDateService.DateTimeFormat(bData.added_date, 'YYYY-MM-DD HH:mm:ss') : await this.commonDateService.DateTimeFormat(bData.created, 'YYYY-MM-DD HH:mm:ss'),
                        enter_by: 0,
                        waist: bData?.waist,
                        random_blood_glucose: bData?.random_blood_glucose,
                        fasting_blood_glucose: bData?.fasting_blood_glucose,
                    };
                    responseData.push({...bData,...bioData});
                }
                return responseData;
            }
            let hcData = await this.biometricsData(["hb.id AS id","hb.created AS created"],condition['bio'],null,null,'getRawMany')
            let resultedData = hcData;
            if (tableData.includes(tableConstant.HEALTH_ASSESSMENT.TBL_HA_HRABIOMETRICS)) {
                let hraData: any = await this.assessmentHraBiometricsData(["hra_bio.id AS id","hra_bio.date AS created"],condition['hra_bio'],null,null,'getRawMany')
                hraData = await recordData(hraData);
                resultedData = [...resultedData, ...hraData];
            }
            if (tableData.includes(tableConstant.TRACKERS.TBL_FT_BIOMETRICS)) {
                let ftBioData =  await this.ftBiometricsData(["fb.id AS id","fb.added_date AS created"],condition['ft_bio'],null,null,'getRawMany')
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
    async assessmentSettingsFindOne(fields: any[] = [],condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaAssessmentSettingsRepository.findOne({
            where: condition,
            select: fields,
            order: orderBy,
        });
    }
    async assessmentResultsExists(condition: any) {
        return this.readReplicaAssessmentResultsRepository.exist({
            where: condition
        });
    }
    async assessmentSettingsExists(condition: any) {
        return this.readReplicaAssessmentSettingsRepository.exist({
            where: condition
        });
    }
    async assessmentTabsData(fields: any[] = [],condition: any, orderBy: any = null, joinCondition: any[] = [],dataType: any = 'getOne') {
        try{
            if (!orderBy) {
                orderBy = { 'at.id' : 'DESC' };
            }
            let query: any = this.readReplicaAssessmentTabsRepository.createQueryBuilder('at')
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
    async assessmentQuestionsData(fields: any[] = [],condition: any, orderBy: any = null, joinCondition: any[] = [],dataType: any = 'getOne',groupBy: string = '') {
        try{
            if (!orderBy) {
                orderBy = { 'aq.id' : 'DESC' };
            }
            let query: any = this.readReplicaAssessmentQuestionsRepository.createQueryBuilder('aq')
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
            if (groupBy != '') {
                query = query.groupBy(groupBy)
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
    async assessmentOptionData(fields: any[] = [],condition: any, orderBy: any = null, joinCondition: any[] = [],dataType: any = 'getOne') {
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
    async assessmentsData(fields: any[] = [],condition: any, orderBy: any = null, joinCondition: any[] = [],dataType: any = 'getOne',groupBy: string = '') {
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
            if (groupBy != '') {
                query = query.groupBy(groupBy)
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
    async assessmentResultsListRecord(condition: any,field: any[] = [], orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaAssessmentResultsRepository.find({
            where: condition,
            select: field,
            order: orderBy,
        });
    }
    async assessmentEmotionalAssessmentAnswerData(fields: any[] = [],condition: any, orderBy: any = null, joinCondition: any[] = [],dataType: any = 'getOne',groupBy: string = '') {
        try{
        if (!orderBy) {
                orderBy = { 'eaa.id' : 'DESC' };
            }
            let query: any = this.readReplicaAssessmentEmotionalAssessmentAnswerRepository.createQueryBuilder('eaa')
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
            if (groupBy != '') {
                query = query.groupBy(groupBy)
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
    async assessmentHaQuestionsFindOne(fields: any[] = [],condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaAssessmentHaQuestionsRepository.findOne({
            where: condition,
            select: fields,
            order: orderBy,
        });
    }
    async assessmentHaQuestionsListRecord(condition: any,field: any[] = [], orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaAssessmentHaQuestionsRepository.find({
            where: condition,
            select: field,
            order: orderBy,
        });
    }
    async EHAReset(condition: any, orderBy: any = null, select: any[] = [], paginationParam: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        let paginateObj = null;
        if(paginationParam){
            paginateObj = this.commonArrayService.getPaginationVar(
                paginationParam.page || 1,
                paginationParam.limit,
            );
        }
        let query: any = this.readReplicaUserRepository.createQueryBuilder('user')
            .innerJoinAndMapMany(
                'user.eha',
                tableConstant.HEALTH_ASSESSMENT.TBL_HA_EMOTIONAL_ASSESSMENTS,
                'eha',
                `user.id = eha.user_id AND user.role_id IN(2,16)`
            )
            .leftJoinAndMapOne(
                'user.company',
                tableConstant.COMPANIES.TBL_COMPANY,
                'company',
                `company.id = user.org_id`
            )
            .leftJoinAndMapOne(
                'user.department',
                tableConstant.COMPANIES.TBL_DEPARTMENT,
                'department',
                `department.id = user.department_id`
            )
            .leftJoinAndMapOne(
                'user.location',
                tableConstant.COMPANIES.TBL_LOCATION,
                'location',
                `location.id = user.location`
            )
            .where(condition)
            .select(select)
            .orderBy(`user.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
        if(paginateObj){
            query = query
                .take(paginateObj.take)
                .skip(paginateObj.skip)
        }
        query = await query.getManyAndCount();
        return query;
    }
    async HRAReset(condition: any, orderBy: any = null, select: any[] = [], paginationParam: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        let paginateObj = null;
        if(paginationParam){
            paginateObj = this.commonArrayService.getPaginationVar(
                paginationParam.page || 1,
                paginationParam.limit,
            );
        }
        let query: any = this.readReplicaUserRepository.createQueryBuilder('user')
            .innerJoinAndMapMany(
                'user.hra',
                tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENTS,
                'hra',
                `user.id = hra.user_id AND user.role_id IN(2,16)`
            )
            .leftJoinAndMapOne(
                'user.settings',
                tableConstant.TBL_USERS_SETTINGS,
                'settings',
                `settings.user_id = user.id`
                )
            .leftJoinAndMapOne(
                'user.company',
                tableConstant.COMPANIES.TBL_COMPANY,
                'company',
                `company.id = user.org_id`
            )
            .leftJoinAndMapOne(
                'user.department',
                tableConstant.COMPANIES.TBL_DEPARTMENT,
                'department',
                `department.id = user.department_id`
            )
            .leftJoinAndMapOne(
                'user.location',
                tableConstant.COMPANIES.TBL_LOCATION,
                'location',
                `location.id = user.location`
            )
            .where(condition)
            .select(select)
            .orderBy(`user.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
        if(paginateObj){
            query = query
                .take(paginateObj.take)
                .skip(paginateObj.skip)
        }
        query = await query.getManyAndCount();
        return query;
    }
}

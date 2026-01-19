import { appConstant, AssessmentEmotionalAssessmentEntity, AssessmentHraBiometricEntity, AssessmentsEntity, BiometricsEntity, CommonHealthService, DentistsEntity, FtBiometricsEntity, OptometristsEntity, tableConstant, TobaccoUsesEntity, UserEntity } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SortingService } from 'src/module/common';
import { Repository } from 'typeorm';
import { FrontService } from './front.service';
import { FrontPointService } from './frontpoint.service';
@Injectable()
export class FrontHealthcheckupService {
    constructor(
        @InjectRepository(BiometricsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaBiometricsRepository: Repository<BiometricsEntity>,
        @InjectRepository(UserEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaUserRepository: Repository<UserEntity>,
        private readonly commonHealthService: CommonHealthService,
        private readonly frontService: FrontService,
        private readonly frontPointService: FrontPointService,
        private readonly sortingService: SortingService,
    ) {}

    /* Health Check Up Table Querys */
        async getHCBiomatricData(condition: any, orderBy: any = null, fields: any = [], joinTale: any = []) {
            if (!orderBy) {
                orderBy = { id: 'DESC' };
            }
            let query = this.readReplicaBiometricsRepository.createQueryBuilder('ent')
            if(joinTale && joinTale?.length > 0){
                for(let i = 0; i < joinTale?.length; i++){
                    query = query.leftJoinAndMapOne(
                        `ent.${joinTale[i].alias}`,
                        joinTale[i].table,
                        joinTale[i].alias,
                        joinTale[i].on,
                    );
                }
            }
            query = query.where(condition).select(fields);
            if(`${Object.keys(orderBy)[0]}` == 'time'){
                query = query.orderBy(`${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]]);
            }else{
                query = query.orderBy(`ent.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]]);
            }
            return await query.getRawMany();
        }
        async getHCBiomatric(type:any = 'main', actId:any = 0, otherDatas:any = []){
            try{
                const {
                    user_id = null,
                    actDatas = [],
                    allDateArray = [],
                    PointEndDateCondition = '',
                    BPointEndDateCondition = '',
                    act_id_20_string = '',
                    userTimezone = '',
                    altActPoint = 0,
                    getDataType = 'single',
                    myHireData = {}
                } = Object.assign({}, ...otherDatas);
                let devider = (actDatas['point_for_each'] == 0 || actDatas['point_for_each'] == null) ? 1 : actDatas['point_for_each'];
                let limit_act = Math.round(actDatas['frequincy_max_point'] / devider);
                let extraDataArray:any = [{'actDatas': actDatas, 'limit_act' : limit_act, 'getDataType' : getDataType, 'userTimezone' : userTimezone, 'myHireData': myHireData}];
                var tmppoints:number = 0;
                let date:any = '';
                let finalsource:any = '';
                let activityCompAry = {};
                let rewardCompAry = {};
                let returnArray = [];
                if(getDataType == 'single'){
                    let t208754 = ` (activity_id REGEXP '^${actId},' OR activity_id REGEXP ',${actId}\$' OR activity_id = '${actId}' OR activity_id REGEXP ',${actId},')`;
                    if (actDatas?.['activity'] && actDatas?.['activity']?.['category_id'] == 20 && actDatas?.['activity']?.['id'] == 8784) {
                        t208754 = ` CONCAT(",", \`activity_id\`, ",") REGEXP ",(${act_id_20_string}),"`;
                    }
                    if (type == 'main') {
                        let activityDone = [];
                        if (actDatas?.['activity'] && actDatas?.['activity']?.['category_id'] == 20 && actDatas?.['activity']?.['id'] == 8784) {
                            let conditions = `status = 1 and user_id IN (${user_id}) and CONCAT(DATE_FORMAT(\`created\`,"%Y-%m-%d "),DATE_FORMAT(\`inserted\`,"%H:%i:%s")) BETWEEN '${allDateArray['originalActStartDate']}' AND '${allDateArray['originalActEndDate']}' ${PointEndDateCondition} AND ${t208754}`;
                            activityDone = await this.getHCBiomatricData(conditions, {id : 'ASC'}, ['id','created','inserted','CONCAT(DATE_FORMAT(`created`,"%Y-%m-%d "),DATE_FORMAT(`inserted`,"%H:%i:%s")) AS submited_date','source','aas_form_prog','activity_id']);
                            let inExtraDataArray = [{ 'compDateFields': 'inserted' , 'joinType': '' }];
                            extraDataArray = extraDataArray.map((item, index) => ({
                                ...item,
                                ...(inExtraDataArray[index] || {})
                            }));
                            let tmppointsM = await this.frontPointService.count_comp_act_bio(JSON.parse(JSON.stringify(activityDone)), actId, 'submited_date', allDateArray, extraDataArray);
                            let tmppointsA = await this.frontService.calculate_frequency('act_bio', tmppointsM, extraDataArray);
                            if (Array.isArray(tmppointsA)) {
                                const tempPointObject = tmppointsA.find(item => item.hasOwnProperty('tempPoint'));
                                const activityCompAryObject = tmppointsA.find(item => item.hasOwnProperty('compDateArray'));
                                const rewardCompAryObject = tmppointsA.find(item => item.hasOwnProperty('rewardCompAry'));
                                tmppoints = tempPointObject ? tempPointObject.tempPoint : 0;
                                activityCompAry = activityCompAryObject ? activityCompAryObject.compDateArray : {};
                                rewardCompAry = rewardCompAryObject ? rewardCompAryObject.rewardCompAry : {};
                            }
                        }else{
                            let conditionsIN = `status = 1 and source IN (2,3,11,12) AND user_id IN (${user_id}) AND ${t208754} AND DATE_FORMAT(\`created\`,'%Y-%m-%d %H:%i:%s') BETWEEN '${allDateArray['BioactFactStartDate']}' AND '${allDateArray['BioactFactEndDate']}' ${BPointEndDateCondition}`;
                            let activityDoneIN = await this.getHCBiomatricData(conditionsIN, {created : 'DESC'}, ['id','created','inserted','source']);
                            let conditionsNotIN = `status = 1 and source NOT IN (2,3,11,12) AND user_id IN (${user_id}) AND ${t208754} AND DATE_FORMAT(\`created\`,'%Y-%m-%d %H:%i:%s') BETWEEN '${allDateArray['originalActStartDate']}' AND '${allDateArray['originalActEndDate']}' ${PointEndDateCondition}`;
                            let activityDoneNotIn = await this.getHCBiomatricData(conditionsNotIN, {created : 'DESC'}, ['id','created','inserted','source']);
                            activityDone = activityDoneIN.concat(activityDoneNotIn);
                            if(activityDone && Object.keys(activityDone)?.length > 0){
                                activityDone = await this.sortingService.sortCampaignData('asc_date', activityDone, 'created');
                            }
                            let inExtraDataArray = [{ 'compDateFields': 'inserted' , 'joinType': 'join' }];
                            extraDataArray = extraDataArray.map((item, index) => ({
                                ...item,
                                ...(inExtraDataArray[index] || {})
                            }));
                            let tmppointsM = await this.frontPointService.count_point_act_bio(JSON.parse(JSON.stringify(activityDone)), actId, 'created', allDateArray, extraDataArray);
                            let tmppointsA = await this.frontService.calculate_frequency('normal', tmppointsM, extraDataArray);
                            if (Array.isArray(tmppointsA)) {
                                const tempPointObject = tmppointsA.find(item => item.hasOwnProperty('tempPoint'));
                                const activityCompAryObject = tmppointsA.find(item => item.hasOwnProperty('compDateArray'));
                                const rewardCompAryObject = tmppointsA.find(item => item.hasOwnProperty('rewardCompAry'));
                                tmppoints = tempPointObject ? tempPointObject.tempPoint : 0;
                                activityCompAry = activityCompAryObject ? activityCompAryObject.compDateArray : {};
                                rewardCompAry = rewardCompAryObject ? rewardCompAryObject.rewardCompAry : {};
                            }
                        }
                        let mptData = activityDone;
                        tmppoints = await this.frontPointService.multiplay_point(tmppoints, actDatas);
                        if (tmppoints > 0) {
                            let dateExtraDataArray = [{ 'actDatas' : actDatas, 'compDateFields' : '', 'joinType' : '','limit_act':  limit_act }];
                            date = await this.frontPointService.getActivityCompDate('act_bio', mptData, 'created', dateExtraDataArray);
                            for (let [key, value] of Object.entries(mptData)) {
                                if (value['created']) {
                                    finalsource = value['source'];
                                }
                            }
                        }
                    }else{
                        let conditionsIN = `status = 1 and user_id IN (${user_id}) and (activity_id REGEXP '^${actId},' OR activity_id REGEXP ',${actId}\$' OR activity_id = '${actId}' OR activity_id REGEXP ',${actId},')`;
                        let activityDoneIN = await this.getHCBiomatricData(conditionsIN, {created : 'DESC'}, ['created']);
                        tmppoints = await this.frontPointService.count_point(activityDoneIN, 'created', allDateArray['actStartDate'], allDateArray['actEndDate']);
                        tmppoints = await this.commonHealthService.check_max_point(tmppoints, altActPoint);
                    }
                    returnArray = [{'tmppoints' : tmppoints}, {'date' : date}, {'activityCompAry' : activityCompAry}, {'rewardCompAry' : rewardCompAry}, {'finalsource' : finalsource}];
                    return returnArray;
                }else{
                    const {
                        membershipCode = '',
                        otherCondition = '',
                        uType_condition = '',
                        statusCondition = '',
                        wellnesschampion = '',
                        allCustomPointDatas = {},
                        PointTZEndDateCondition = [],
                        call_from = ''
                    } = Object.assign({}, ...otherDatas);
                    let extraDataArrayM = [{'allCustomPointDatas' : allCustomPointDatas, 'call_from' : call_from}]
                    extraDataArray = extraDataArray.map((item, index) => ({
                        ...item,
                        ...(extraDataArrayM[index] || {})
                    }));
                    let t208754 = ` (ent.activity_id REGEXP '^${actId},' OR ent.activity_id REGEXP ',${actId}\$' OR ent.activity_id = '${actId}' OR ent.activity_id REGEXP ',${actId},')`;
                    if (actDatas?.['activity'] && actDatas?.['activity']?.['category_id'] == 20 && actDatas?.['activity']?.['id'] == 8784) {
                        t208754 = ` CONCAT(",", \`ent\`.\`activity_id\`, ",") REGEXP ",(${act_id_20_string}),"`;
                    }
                    let tmppointsA = Object.create(null);
                    let activityDone = [];
                    let finalActivtyDoneData = [];
                    let finalActivtyDone = [];
                    let aCTYpe = 'act_bio'
                    const joinTableList = [{'alias':'user', 'table' : tableConstant.TBL_USERS, 'on' : `ent.user_id = user.id` }];
                    if (actDatas?.['activity'] && actDatas?.['activity']?.['category_id'] == 20 && actDatas?.['activity']?.['id'] == 8784) {
                        let conditions = `${otherCondition} ${t208754} AND ent.status = 1 AND user.membership_code IN ('${membershipCode}') ${uType_condition} ${wellnesschampion} ${statusCondition} and DATE_FORMAT(\`ent\`.\`created\`,"%Y-%m-%d %H:%i:%s") BETWEEN '${allDateArray['actStartDate']}' AND '${allDateArray['actEndDate']}' ${PointEndDateCondition} `;
                        let getFields = ['ent.id as id','ent.created as created','ent.inserted as inserted','ent.source as source','ent.aas_form_prog as aas_form_prog','ent.activity_id as activity_id','DATE_FORMAT(CONCAT(DATE_FORMAT(\`ent\`.\`created\`,"%Y-%m-%d "),DATE_FORMAT(\`ent\`.\`inserted\`,"%H:%i:%s")),"%Y-%m-%d") AS time','DATE_FORMAT(\`ent\`.\`inserted\`,"%Y-%m-%d %H:%i:%s") as time2','user.id as uid','user.role_id as role_id','user.on_insurance_plan as on_insurance_plan','user.location as location','user.department_id as department_id','user.gender as gender','TIMESTAMPDIFF(YEAR, user.dob, CURDATE()) AS age','user.is_camp_eligible as is_camp_eligible','user.timezone as timezone'];
                        activityDone = await this.getHCBiomatricData(conditions, { id : 'ASC'}, getFields, joinTableList);
                        let inExtraDataArray = [{ 'compDateFields' : 'time2' , 'joinType' : '' }];
                        extraDataArray = extraDataArray.map((item, index) => ({
                            ...item,
                            ...(inExtraDataArray[index] || {})
                        }));
                        let tmppointsM = await this.frontPointService.count_comp_act_bio(JSON.parse(JSON.stringify(activityDone)), actId, 'time', allDateArray, extraDataArray);
                        tmppointsA = await this.frontService.calculate_frequency('act_bio', tmppointsM, extraDataArray);
                    }else{
                        let conditionsIN = `${otherCondition} ${t208754} AND ent.status = 1 AND ent.source IN (2,3,11,12) AND user.membership_code IN ('${membershipCode}') ${uType_condition} ${wellnesschampion} ${statusCondition} AND DATE_FORMAT(\`ent\`.\`created\`,'%Y-%m-%d %H:%i:%s') BETWEEN '${allDateArray['actStartDate']}' AND '${allDateArray['actEndDate']}' ${PointEndDateCondition}`;
                        let getFieldsIN = ['ent.id as id','ent.created as created','ent.inserted as inserted','ent.source as source','ent.aas_form_prog as aas_form_prog','ent.activity_id as activity_id','DATE_FORMAT(\`ent\`.\`created\`,"%Y-%m-%d") AS time','DATE_FORMAT(\`ent\`.\`inserted\`,"%Y-%m-%d %H:%i:%s") as time2','user.id as uid','user.role_id as role_id','user.on_insurance_plan as on_insurance_plan','user.location as location','user.department_id as department_id','user.gender as gender','TIMESTAMPDIFF(YEAR, user.dob, CURDATE()) AS age','user.is_camp_eligible as is_camp_eligible','user.timezone as timezone'];
                        let activityDoneIN = await this.getHCBiomatricData(conditionsIN, { time : 'DESC' }, getFieldsIN, joinTableList);
                        let conditionsNotIN = `${otherCondition} ${t208754} AND ent.status = 1 AND ent.source NOT IN (2,3,11,12) AND user.membership_code IN ('${membershipCode}') ${uType_condition} ${wellnesschampion} ${statusCondition} AND DATE_FORMAT(CONVERT_TZ(\`ent\`.\`created\`,'UTC',CASE WHEN \`user\`.\`timezone\` != '' THEN \`user\`.\`timezone\` ELSE 'UTC' END),'%Y-%m-%d %H:%i:%s') BETWEEN '${allDateArray['actStartDate']}' AND '${allDateArray['actEndDate']}' ${PointTZEndDateCondition}`;
                        let getFieldsNotIN = ['ent.id as id','ent.created as created','ent.inserted as inserted','ent.source as source','ent.aas_form_prog as aas_form_prog','ent.activity_id as activity_id',`DATE_FORMAT(CONVERT_TZ(\`ent\`.\`created\`,'UTC',CASE WHEN \`user\`.\`timezone\` != '' THEN \`user\`.\`timezone\` ELSE 'UTC' END),'%Y-%m-%d') as time`,`DATE_FORMAT(CONVERT_TZ(\`ent\`.\`inserted\`,'UTC',CASE WHEN \`user\`.\`timezone\` != '' THEN \`user\`.\`timezone\` ELSE 'UTC' END),'%Y-%m-%d %H:%i:%s') as time2`,'user.id as uid','user.role_id as role_id','user.on_insurance_plan as on_insurance_plan','user.location as location','user.department_id as department_id','user.gender as gender','TIMESTAMPDIFF(YEAR, user.dob, CURDATE()) AS age','user.is_camp_eligible as is_camp_eligible','user.timezone as timezone'];
                        let activityDoneNotIn = await this.getHCBiomatricData(conditionsNotIN, { time : 'DESC' }, getFieldsNotIN, joinTableList);
                        activityDone = activityDoneIN.concat(activityDoneNotIn);

                        if(activityDone && Object.keys(activityDone)?.length > 0){
                            activityDone = await this.sortingService.sortCampaignData('asc_date', activityDone, 'time');
                        }
                        let inExtraDataArray = [{ 'compDateFields': 'time2' , 'joinType': '' }];
                        extraDataArray = extraDataArray.map((item, index) => ({
                            ...item,
                            ...(inExtraDataArray[index] || {})
                        }));
                        let tmppointsM = await this.frontPointService.count_point_act_bio(JSON.parse(JSON.stringify(activityDone)), actId, 'time', allDateArray, extraDataArray);
                        tmppointsA = await this.frontService.calculate_frequency('normal', tmppointsM, extraDataArray);
                    }
                    if (activityDone.length > 0) {
                        finalActivtyDoneData = await this.frontPointService.multiplay_point_multiuser(aCTYpe, JSON.parse(JSON.stringify(activityDone)), tmppointsA, extraDataArray);
                        finalActivtyDone = (finalActivtyDoneData.length > 0 && finalActivtyDoneData[0]['tempUserData']) ? finalActivtyDoneData[0]['tempUserData'] : {};
                    }
                    return [ {'activityDone' : activityDone, 'activityDoneF' : finalActivtyDone} ];
                }
            }catch (error) {
                throw new Error(error.message); 
            }
        }
        async getHCDentist(type:any = 'main', actId:any = 0, otherDatas:any = []){
            try{
                const {
                    user_id = null,
                    actDatas = [],
                    allDateArray = [],
                    PointEndDateCondition = '',
                    userTimezone = '',
                    altActPoint = 0,
                    getDataType = 'single',
                    call_from = '',
                    myHireData = {}
                } = Object.assign({}, ...otherDatas);
                let extraDataArray:any = [{'actDatas': actDatas, 'type' : '', 'getDataType' : getDataType, 'userTimezone' : userTimezone , 'tType': 'NO', 'myHireData': myHireData}];
                let tmppoints:any = 0;
                let points = 0;
                let date = '';
                let activityCompAry = {};
                let rewardCompAry = {};
                var tableName = tableConstant.HEALTH_CHECKUP.TBL_HC_DENTISTS;
                if(getDataType == 'single'){
                    let tempDentists:any = 0;
                    if (otherDatas) {
                        const tempDentistsObj = otherDatas.find((item) => 'tempDentists' in item);
                        tempDentists = tempDentistsObj ? tempDentistsObj.tempDentists : 0;
                    }
                    if (type == 'main') {
                        let activityDone = await this.frontPointService.fetch_point(tableName, DentistsEntity, { id : 'ASC'}, ['id','date_completed','inserted'], 'userid', 'activity_id', actId, user_id,  `status = 1 AND DATE_FORMAT(\`date_completed\`,"%Y-%m-%d %H:%i:%s") BETWEEN '${allDateArray['actStartDateM']}' AND '${allDateArray['actEndDateM']}' ${PointEndDateCondition} Group by date_completed`);
                        let mptData = activityDone;
                        let inExtraDataArray = [{ 'compDateFields': 'inserted' , 'joinType': ''}];
                        extraDataArray = extraDataArray.map((item, index) => ({
                            ...item,
                            ...(inExtraDataArray[index] || {})
                        }));
                        let tmppointsM = await this.frontPointService.count_point_act(JSON.parse(JSON.stringify(activityDone)), actId, 'date_completed', allDateArray, extraDataArray);
                        let tmppointsA = await this.frontService.calculate_frequency('normal', tmppointsM, extraDataArray);
                        if (Array.isArray(tmppointsA)) {
                            const tempPointObject = tmppointsA.find(item => item.hasOwnProperty('tempPoint'));
                            const activityCompAryObject = tmppointsA.find(item => item.hasOwnProperty('compDateArray'));
                            const rewardCompAryObject = tmppointsA.find(item => item.hasOwnProperty('rewardCompAry'));
                            tmppoints = tempPointObject ? tempPointObject.tempPoint : 0;
                            activityCompAry = activityCompAryObject ? activityCompAryObject.compDateArray : {};
                            rewardCompAry = rewardCompAryObject ? rewardCompAryObject.rewardCompAry : {};
                        }
                        tmppoints = await this.frontPointService.multiplay_point(tmppoints, actDatas);
                        if (tmppoints > 0) {
                            if (tmppoints > 0 && tempDentists == 0) {
                                mptData = mptData.slice(0, 1);
                                tempDentists += 1;
                                points = tmppoints;
                            } else if (tmppoints > 0 && tempDentists > 0) {
                                mptData = mptData.slice(tempDentists, tempDentists + 1);
                                points = tmppoints;
                                if (mptData?.length == 0) {
                                    points = 0;
                                }
                                tempDentists += 1;
                            }
                            let dateExtraDataArray = [{ 'actDatas' : actDatas } ,{ 'compDateFields' : '' } , { 'joinType' : '' }];
                            date = await this.frontPointService.getActivityCompDate('normal', mptData, 'date_completed', dateExtraDataArray);
                        }
                    }else{
                        let activityDone = await this.frontPointService.fetch_point(tableName, DentistsEntity, { id : 'ASC'}, ['date_completed'], 'userid', 'activity_id', actId, user_id,  `status = 1 AND DATE_FORMAT(\`date_completed\`,"%Y-%m-%d %H:%i:%s") BETWEEN '${allDateArray['actStartDateM']}' AND '${allDateArray['actEndDateM']}' ${PointEndDateCondition}`);
                        tmppoints = await this.frontPointService.count_point(activityDone, 'date_completed', allDateArray['actStartDate'], allDateArray['actEndDate']);
                        if (activityDone?.length >= 2) {
                            tmppoints = this.commonHealthService.check_max_point(tmppoints, altActPoint);
                            points += tmppoints;
                        }
                    }
                    let returnArray = [{'tmppoints' : tmppoints}, {'date' : date}, {'activityCompAry' : activityCompAry}, {'rewardCompAry' : rewardCompAry}, {'points' : points}, {'tempDentists' : tempDentists}];
                    return returnArray;
                }else{
                    let {
                        membershipCode = '',
                        otherCondition = '',
                        uType_condition = '',
                        statusCondition = '',
                        wellnesschampion = '',
                        allCustomPointDatas = {},
                        tempDentists = 0
                    } = Object.assign({}, ...otherDatas);
                    let finalActivtyDone = [];
                    let extraDataArrayM = [{'allCustomPointDatas' : allCustomPointDatas, 'call_from' : call_from}]
                    extraDataArray = extraDataArray.map((item, index) => ({
                        ...item,
                        ...(extraDataArrayM[index] || {})
                    }));
                    let conditions = `${otherCondition} ent.activity_id IN (${actId}) AND ent.status = 1 AND user.membership_code IN ('${membershipCode}') ${uType_condition} ${wellnesschampion} ${statusCondition} and DATE_FORMAT(\`ent\`.\`date_completed\`,"%Y-%m-%d %H:%i:%s") BETWEEN '${allDateArray['actStartDate']}' AND '${allDateArray['actEndDate']}' ${PointEndDateCondition} GROUP BY DATE_FORMAT(\`ent\`.\`date_completed\`,"%Y-%m-%d"), user.id`;
                    let getFields = ['ent.id as id','ent.activity_id as activity_id','DATE_FORMAT(`ent`.`date_completed`,"%Y-%m-%d") AS time','DATE_FORMAT(`ent`.`inserted`,"%Y-%m-%d %H:%i:%s") as time2','user.id as uid','user.role_id as role_id','user.on_insurance_plan as on_insurance_plan','user.location as location','user.department_id as department_id','user.gender as gender','TIMESTAMPDIFF(YEAR, user.dob, CURDATE()) AS age','user.is_camp_eligible as is_camp_eligible','user.timezone as timezone'];
                    const joinTableList = [{'alias':'user', 'table' : tableConstant.TBL_USERS, 'on' : '`ent`.`userid` = `user`.`id`' }];
                    let activityDone = await this.frontPointService.fetch_point_report(tableName, DentistsEntity, getFields, { time : 'ASC'}, conditions, joinTableList);
                    let inExtraDataArray = [{ 'compDateFields': 'time2' , 'joinType': ''}];
                    extraDataArray = extraDataArray.map((item, index) => ({
                        ...item,
                        ...(inExtraDataArray[index] || {})
                    }));
                    let tmppointsM = await this.frontPointService.count_point_act(JSON.parse(JSON.stringify(activityDone)), actId, 'time', allDateArray, extraDataArray);
                    let tmppointsA = await this.frontService.calculate_frequency('normal', tmppointsM, extraDataArray);
                    if (activityDone.length > 0) {
                        extraDataArray[0]['tempdentists'] = tempDentists;
                        let finalActivtyDoneData = await this.frontPointService.multiplay_point_multiuser('normal', JSON.parse(JSON.stringify(activityDone)), tmppointsA, extraDataArray);
                        finalActivtyDone = (finalActivtyDoneData.length > 0 && finalActivtyDoneData[0]['tempUserData']) ? finalActivtyDoneData[0]['tempUserData'] : {};
                        tempDentists = (finalActivtyDoneData.length > 0 && finalActivtyDoneData[0]['tempDentists']) ? finalActivtyDoneData[0]['tempDentists'] : [];
                    }
                    return [ {'activityDone' : activityDone, 'activityDoneF' : finalActivtyDone, 'tempDentists' : tempDentists} ];
                }
            }catch (error) {
                throw new Error(error.message); 
            }
        }
        async getHCOptometrist(type:any = 'main', actId:any = 0, otherDatas:any = []){
            try{
                const {
                    user_id = null,
                    actDatas = [],
                    allDateArray = [],
                    PointEndDateCondition = '',
                    userTimezone = '',
                    altActPoint = 0,
                    getDataType = 'single',
                    call_from = '',
                    myHireData = {}
                } = Object.assign({}, ...otherDatas);
                let extraDataArray:any = [{'actDatas': actDatas, 'type' : '', 'getDataType' : getDataType, 'userTimezone' : userTimezone , 'tType': 'NO', 'myHireData': myHireData}];
                let tmppoints = 0;
                let date = '';
                let activityCompAry = {};
                let rewardCompAry = {};
                var tableName = tableConstant.HEALTH_CHECKUP.TBL_HC_OPTOMETRISTS;
                if(getDataType == 'single'){
                    if (type == 'main') {
                        let activityDone = await this.frontPointService.fetch_point(tableName, OptometristsEntity, { id : 'ASC'}, ['id','date_completed','inserted'], 'userid', 'activity_id', actId, user_id,  `status = 1 AND DATE_FORMAT(\`date_completed\`,"%Y-%m-%d %H:%i:%s") BETWEEN '${allDateArray['actStartDateM']}' AND '${allDateArray['actEndDateM']}' ${PointEndDateCondition}`);
                        let mptData = activityDone;
                        let inExtraDataArray = [{ 'compDateFields': 'inserted' , 'joinType': ''}];
                        extraDataArray = extraDataArray.map((item, index) => ({
                            ...item,
                            ...(inExtraDataArray[index] || {})
                        }));
                        let tmppointsM = await this.frontPointService.count_point_act(JSON.parse(JSON.stringify(activityDone)), actId, 'date_completed', allDateArray, extraDataArray);
                        let tmppointsA = await this.frontService.calculate_frequency('normal', tmppointsM, extraDataArray);
                        if (Array.isArray(tmppointsA)) {
                            const tempPointObject = tmppointsA.find(item => item.hasOwnProperty('tempPoint'));
                            const activityCompAryObject = tmppointsA.find(item => item.hasOwnProperty('compDateArray'));
                            const rewardCompAryObject = tmppointsA.find(item => item.hasOwnProperty('rewardCompAry'));
                            tmppoints = tempPointObject ? tempPointObject.tempPoint : 0;
                            activityCompAry = activityCompAryObject ? activityCompAryObject.compDateArray : {};
                            rewardCompAry = rewardCompAryObject ? rewardCompAryObject.rewardCompAry : {};
                        }
                        tmppoints = await this.frontPointService.multiplay_point(tmppoints, actDatas);
                        if (tmppoints > 0) {
                            let dateExtraDataArray = [{ 'actDatas': actDatas } ,{ 'compDateFields': '' } , { 'joinType': '' }];
                            date = await this.frontPointService.getActivityCompDate('normal', mptData, 'date_completed', dateExtraDataArray);
                        }
                    }else{
                        let activityDone = await this.frontPointService.fetch_point(tableName, OptometristsEntity, { id : 'ASC'}, ['date_completed'], 'userid', 'activity_id', actId, user_id,  `status = 1 AND DATE_FORMAT(\`date_completed\`,"%Y-%m-%d %H:%i:%s") BETWEEN '${allDateArray['actStartDateM']}' AND '${allDateArray['actEndDateM']}' ${PointEndDateCondition}`);
                        tmppoints = await this.frontPointService.count_point(activityDone, 'date_completed', allDateArray['actStartDate'], allDateArray['actEndDate']);
                        tmppoints = await this.commonHealthService.check_max_point(tmppoints, altActPoint);
                    }
                    let returnArray = [{'tmppoints' : tmppoints}, {'date' : date}, {'activityCompAry' : activityCompAry}, {'rewardCompAry' : rewardCompAry}];
                    return returnArray;
                }else{
                    let {
                        membershipCode = '',
                        otherCondition = '',
                        uType_condition = '',
                        statusCondition = '',
                        wellnesschampion = '',
                        allCustomPointDatas = {}
                    } = Object.assign({}, ...otherDatas);
                    let finalActivtyDone = [];
                    let extraDataArrayM = [{'allCustomPointDatas' : allCustomPointDatas, 'call_from' : call_from}]
                    extraDataArray = extraDataArray.map((item, index) => ({
                        ...item,
                        ...(extraDataArrayM[index] || {})
                    }));
                    let conditions = `${otherCondition} ent.activity_id IN (${actId}) AND ent.status = 1 AND user.membership_code IN ('${membershipCode}') ${uType_condition} ${wellnesschampion} ${statusCondition} and DATE_FORMAT(\`ent\`.\`date_completed\`,"%Y-%m-%d %H:%i:%s") BETWEEN '${allDateArray['actStartDate']}' AND '${allDateArray['actEndDate']}' ${PointEndDateCondition}`;
                    let getFields = ['ent.id as id','ent.activity_id as activity_id','DATE_FORMAT(`ent`.`date_completed`,"%Y-%m-%d") AS time','DATE_FORMAT(`ent`.`inserted`,"%Y-%m-%d %H:%i:%s") as time2','user.id as uid','user.role_id as role_id','user.on_insurance_plan as on_insurance_plan','user.location as location','user.department_id as department_id','user.gender as gender','TIMESTAMPDIFF(YEAR, user.dob, CURDATE()) AS age','user.is_camp_eligible as is_camp_eligible','user.timezone as timezone'];
                    const joinTableList = [{'alias':'user', 'table' : tableConstant.TBL_USERS, 'on' : '`ent`.`userid` = `user`.`id`' }];
                    let activityDone = await this.frontPointService.fetch_point_report(tableName, OptometristsEntity, getFields, { time : 'DESC'}, conditions, joinTableList);
                    let inExtraDataArray = [{ 'compDateFields': 'time2' , 'joinType': ''}];
                    extraDataArray = extraDataArray.map((item, index) => ({
                        ...item,
                        ...(inExtraDataArray[index] || {})
                    }));
                    let tmppointsM = await this.frontPointService.count_point_act(JSON.parse(JSON.stringify(activityDone)), actId, 'time', allDateArray, extraDataArray);
                    let tmppointsA = await this.frontService.calculate_frequency('normal', tmppointsM, extraDataArray);
                    if (activityDone.length > 0) {
                        let finalActivtyDoneData = await this.frontPointService.multiplay_point_multiuser('normal', JSON.parse(JSON.stringify(activityDone)), tmppointsA, extraDataArray);
                        finalActivtyDone = (finalActivtyDoneData.length > 0 && finalActivtyDoneData[0]['tempUserData']) ? finalActivtyDoneData[0]['tempUserData'] : {};
                    }
                    return [ {'activityDone' : activityDone, 'activityDoneF' : finalActivtyDone} ];
                }
            }catch (error) {
                throw new Error(error.message); 
            }
        }
        async getHCTabaccoUses(type:any = 'main', actId:any = 0, otherDatas:any = []){
            try{
                let {
                    user_id = null,
                    actDatas = [],
                    allDateArray = [],
                    PointEndDateCondition = '',
                    userTimezone = '',
                    altActPoint = 0,
                    getDataType = 'single',
                    call_from = '',
                    myHireData = {}
                } = Object.assign({}, ...otherDatas);
                let extraDataArray:any = [{'actDatas': actDatas, 'type' : '', 'getDataType' : getDataType, 'userTimezone' : userTimezone , 'tType': 'YES', 'myHireData': myHireData}];
                let tmppoints = 0;
                let date = '';
                let activityCompAry = {};
                let rewardCompAry = {};
                var tableName = tableConstant.HEALTH_CHECKUP.TBL_HC_OPTOMETRISTS;
                if(getDataType == 'single'){
                    if (type == 'main') {
                        PointEndDateCondition = PointEndDateCondition.replace("inserted", "updated");
                        let activityDone = await this.frontPointService.fetch_point(tableName, TobaccoUsesEntity, { id : 'ASC'}, ['id','date_completed','updated'], 'user_id', 'activity_id', actId, user_id,  `status = 1 AND DATE_FORMAT(\`date_completed\`,"%Y-%m-%d %H:%i:%s") BETWEEN '${allDateArray['actStartDateM']}' AND '${allDateArray['actEndDateM']}' ${PointEndDateCondition}`);
                        let mptData = activityDone;
                        let inExtraDataArray = [{ 'compDateFields': 'updated' , 'joinType': ''}];
                        extraDataArray = extraDataArray.map((item, index) => ({
                            ...item,
                            ...(inExtraDataArray[index] || {})
                        }));
                        let tmppointsM = await this.frontPointService.count_point_act(JSON.parse(JSON.stringify(activityDone)), actId, 'date_completed', allDateArray, extraDataArray);
                        let tmppointsA = await this.frontService.calculate_frequency('normal', tmppointsM, extraDataArray);
                        if (Array.isArray(tmppointsA)) {
                            const tempPointObject = tmppointsA.find(item => item.hasOwnProperty('tempPoint'));
                            const activityCompAryObject = tmppointsA.find(item => item.hasOwnProperty('compDateArray'));
                            const rewardCompAryObject = tmppointsA.find(item => item.hasOwnProperty('rewardCompAry'));
                            tmppoints = tempPointObject ? tempPointObject.tempPoint : 0;
                            activityCompAry = activityCompAryObject ? activityCompAryObject.compDateArray : {};
                            rewardCompAry = rewardCompAryObject ? rewardCompAryObject.rewardCompAry : {};
                        }
                        tmppoints = await this.frontPointService.multiplay_point(tmppoints, actDatas);
                        if (tmppoints > 0) {
                            let dateExtraDataArray = [{ 'actDatas' : actDatas } ,{ 'compDateFields' : '' } , { 'joinType' : '' }];
                            date = await this.frontPointService.getActivityCompDate('normal', mptData, 'date_completed', dateExtraDataArray);
                        }
                    }else{
                        PointEndDateCondition = PointEndDateCondition.replace("inserted", "updated");
                        let activityDone = await this.frontPointService.fetch_point(tableName, TobaccoUsesEntity, { id : 'ASC'}, ['date_completed'], 'user_id', 'activity_id', actId, user_id,  `status = 1 AND DATE_FORMAT(\`date_completed\`,"%Y-%m-%d %H:%i:%s") BETWEEN '${allDateArray['actStartDateM']}' AND '${allDateArray['actEndDateM']}' ${PointEndDateCondition}`);
                        tmppoints = await this.frontPointService.count_point(activityDone, 'date_completed', allDateArray['actStartDate'], allDateArray['actEndDate']);
                        tmppoints = await this.commonHealthService.check_max_point(tmppoints, altActPoint);
                    }
                    let returnArray = [{'tmppoints' : tmppoints}, {'date' : date}, {'activityCompAry' : activityCompAry}, {'rewardCompAry' : rewardCompAry}];
                    return returnArray;
                }else{
                    let {
                        membershipCode = '',
                        otherCondition = '',
                        uType_condition = '',
                        statusCondition = '',
                        wellnesschampion = '',
                        allCustomPointDatas = {},
                        PointTZEndDateCondition = []
                    } = Object.assign({}, ...otherDatas);
                    let finalActivtyDone = [];
                    let extraDataArrayM = [{'allCustomPointDatas' : allCustomPointDatas, 'call_from' : call_from}]
                    extraDataArray = extraDataArray.map((item, index) => ({
                        ...item,
                        ...(extraDataArrayM[index] || {})
                    }));
                    let newPointTZEndDateCondition = PointTZEndDateCondition.replace(/`inserted`/g, '`updated`');
                    let conditions = `${otherCondition} ent.activity_id IN (${actId}) AND ent.status = 1 AND user.membership_code IN ('${membershipCode}') ${uType_condition} ${wellnesschampion} ${statusCondition} and DATE_FORMAT(CONVERT_TZ(\`ent\`.\`date_completed\`,'UTC',CASE WHEN user.timezone != '' THEN user.timezone ELSE 'UTC' END),'%Y-%m-%d %H:%i:%s') BETWEEN '${allDateArray['actStartDate']}' AND '${allDateArray['actEndDate']}' ${newPointTZEndDateCondition}`;
                    let getFields = ['ent.id as id','ent.activity_id as activity_id','DATE_FORMAT(CONVERT_TZ(\`ent\`.\`date_completed\`,"UTC",CASE WHEN user.timezone != "" THEN user.timezone ELSE "UTC" END),"%Y-%m-%d") AS time','DATE_FORMAT(CONVERT_TZ(`ent`.`updated`,"UTC",CASE WHEN `user`.`timezone` != "" THEN `user`.`timezone` ELSE "UTC" END),"%Y-%m-%d %H:%i:%s") as time2','user.id as uid','user.role_id as role_id','user.on_insurance_plan as on_insurance_plan','user.location as location','user.department_id as department_id','user.gender as gender','TIMESTAMPDIFF(YEAR, user.dob, CURDATE()) AS age','user.is_camp_eligible as is_camp_eligible','user.timezone as timezone'];
                    const joinTableList = [{'alias':'user', 'table' : tableConstant.TBL_USERS, 'on' : '`ent`.`user_id` = `user`.`id`' }];
                    let activityDone = await this.frontPointService.fetch_point_report(tableName, TobaccoUsesEntity, getFields, { time : 'ASC'}, conditions, joinTableList);
                    let inExtraDataArray = [{ 'compDateFields': 'time2' , 'joinType': ''}];
                    extraDataArray = extraDataArray.map((item, index) => ({
                        ...item,
                        ...(inExtraDataArray[index] || {})
                    }));
                    let tmppointsM = await this.frontPointService.count_point_act(JSON.parse(JSON.stringify(activityDone)), actId, 'time', allDateArray, extraDataArray);
                    let tmppointsA = await this.frontService.calculate_frequency('normal', tmppointsM, extraDataArray);
                    if (activityDone.length > 0) {
                        let finalActivtyDoneData = await this.frontPointService.multiplay_point_multiuser('normal', JSON.parse(JSON.stringify(activityDone)), tmppointsA, extraDataArray);
                        finalActivtyDone = (finalActivtyDoneData.length > 0 && finalActivtyDoneData[0]['tempUserData']) ? finalActivtyDoneData[0]['tempUserData'] : {};
                    }
                    return [ {'activityDone' : activityDone, 'activityDoneF' : finalActivtyDone} ];
                }
            }catch (error) {
                throw new Error(error.message); 
            }
        }
    /* Health Check Up Table Querys */
    /* HRA Table Querys */
        async getHAAssessment(type:any = 'main', actId:any = 0, otherDatas:any = []){
            try{
                const {
                    user_id = null,
                    actDatas = [],
                    allDateArray = [],
                    userTimezone = '',
                    altActPoint = 0,
                    getDataType = 'single',
                    call_from = '',
                    myHireData = {}
                } = Object.assign({}, ...otherDatas);
                let extraDataArray:any = [{'actDatas': actDatas, 'type' : '', 'getDataType' : getDataType, 'userTimezone' : userTimezone, 'tType' : 'YES', 'myHireData': myHireData}];
                let tmppoints = 0;
                let date = '';
                let activityCompAry = {};
                let rewardCompAry = {};
                var tableName = tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENTS;
                if(getDataType == 'single'){
                    let healthcource = `status = 1 AND DATE_FORMAT(\`date\`,"%Y-%m-%d %H:%i:%s") BETWEEN '${allDateArray['actStartDateM']}' AND '${allDateArray['actEndDateM']}'`;
                    if (actDatas['source_type'] == 1) {
                        healthcource += ' AND hra_status = 100';
                    }
                    let activityDone = await this.frontPointService.fetch_point(tableName, AssessmentsEntity, { id : 'ASC'}, ['date'], 'user_id', 'activity_id', actId, user_id, healthcource);
                    if (type == 'main') {
                        let mptData = activityDone;
                        let tmppointsM = await this.frontPointService.count_point_act(JSON.parse(JSON.stringify(activityDone)), actId, 'date', allDateArray, extraDataArray);
                        let tmppointsA = await this.frontService.calculate_frequency('normal', tmppointsM, extraDataArray);
                        if (Array.isArray(tmppointsA)) {
                            const tempPointObject = tmppointsA.find(item => item.hasOwnProperty('tempPoint'));
                            const activityCompAryObject = tmppointsA.find(item => item.hasOwnProperty('compDateArray'));
                            const rewardCompAryObject = tmppointsA.find(item => item.hasOwnProperty('compDateArray'));
                            tmppoints = tempPointObject ? tempPointObject.tempPoint : 0;
                            activityCompAry = activityCompAryObject ? activityCompAryObject.compDateArray : {};
                            rewardCompAry = rewardCompAryObject ? rewardCompAryObject.compDateArray : {};
                        }
                        tmppoints = await this.frontPointService.multiplay_point(tmppoints, actDatas);
                        if (tmppoints > 0) {
                            let dateExtraDataArray = [{ 'actDatas' : actDatas } ,{ 'compDateFields' : '' } , { 'joinType' : '' }];
                            date = await this.frontPointService.getActivityCompDate('normal', mptData, 'date', dateExtraDataArray);
                        }
                    }else{
                        tmppoints = await this.frontPointService.count_point(activityDone, 'date', allDateArray['actStartDate'], allDateArray['actEndDate']);
                        tmppoints = await this.commonHealthService.check_max_point(tmppoints, altActPoint);
                    }
                    let returnArray = [{'tmppoints' : tmppoints}, {'date' : date}, {'activityCompAry' : activityCompAry}, {'rewardCompAry' : rewardCompAry}];
                    return returnArray;
                }else{
                    let {
                        membershipCode = '',
                        otherCondition = '',
                        uType_condition = '',
                        statusCondition = '',
                        wellnesschampion = '',
                        allCustomPointDatas = {}
                    } = Object.assign({}, ...otherDatas);
                    let finalActivtyDone = [];
                    let extraDataArrayM = [{'allCustomPointDatas' : allCustomPointDatas, 'call_from' : call_from}]
                    extraDataArray = extraDataArray.map((item, index) => ({
                        ...item,
                        ...(extraDataArrayM[index] || {})
                    }));
                    let wellnesschampion1 = '';
                    if (actDatas['source_type'] == 1) {
                        wellnesschampion1 = 'AND ent.hra_status = 100';
                    }
                    let conditions = `${otherCondition} ent.activity_id IN (${actId}) AND ent.status = 1 AND user.membership_code IN ('${membershipCode}') ${uType_condition} ${wellnesschampion} ${statusCondition} and DATE_FORMAT(CONVERT_TZ(\`ent\`.\`date\`,'UTC',CASE WHEN user.timezone != '' THEN user.timezone ELSE 'UTC' END),'%Y-%m-%d %H:%i:%s') BETWEEN '${allDateArray['actStartDate']}' AND '${allDateArray['actEndDate']}' ${wellnesschampion1}`;
                    let getFields = ['ent.id as id','ent.activity_id as activity_id','DATE_FORMAT(CONVERT_TZ(`ent`.`date`,"UTC",CASE WHEN user.timezone != "" THEN user.timezone ELSE "UTC" END),"%Y-%m-%d") AS time','user.id as uid','user.role_id as role_id','user.on_insurance_plan as on_insurance_plan','user.location as location','user.department_id as department_id','user.gender as gender','TIMESTAMPDIFF(YEAR, user.dob, CURDATE()) AS age','user.is_camp_eligible as is_camp_eligible','user.timezone as timezone'];
                    const joinTableList = [{'alias':'user', 'table' : tableConstant.TBL_USERS, 'on' : '`ent`.`user_id` = `user`.`id`' }];
                    let activityDone = await this.frontPointService.fetch_point_report(tableName, AssessmentsEntity, getFields, { time : 'ASC'}, conditions, joinTableList);
                    let inExtraDataArray = [{ 'compDateFields': 'time' , 'joinType': ''}];
                    extraDataArray = extraDataArray.map((item, index) => ({
                        ...item,
                        ...(inExtraDataArray[index] || {})
                    }));
                    let tmppointsM = await this.frontPointService.count_point_act(JSON.parse(JSON.stringify(activityDone)), actId, 'time', allDateArray, extraDataArray);
                    let tmppointsA = await this.frontService.calculate_frequency('normal', tmppointsM, extraDataArray);
                    if (activityDone.length > 0) {
                        let finalActivtyDoneData = await this.frontPointService.multiplay_point_multiuser('normal', JSON.parse(JSON.stringify(activityDone)), tmppointsA, extraDataArray);
                        finalActivtyDone = (finalActivtyDoneData.length > 0 && finalActivtyDoneData[0]['tempUserData']) ? finalActivtyDoneData[0]['tempUserData'] : {};
                    }
                    return [ {'activityDone' : activityDone, 'activityDoneF' : finalActivtyDone} ];
                }
            }catch (error) {
                throw new Error(error.message); 
            }
        }
        async getHAEAssessment(type:any = 'main', actId:any = 0, otherDatas:any = []){
            try{
                const {
                    user_id = null,
                    actDatas = [],
                    allDateArray = [],
                    userTimezone = '',
                    altActPoint = 0,
                    getDataType = 'single',
                    call_from = '',
                    myHireData = {}
                } = Object.assign({}, ...otherDatas);
                let extraDataArray:any = [{'actDatas': actDatas, 'type' : '', 'getDataType' : getDataType, 'userTimezone' : userTimezone, 'tType' : 'YES', 'myHireData': myHireData}];
                let tmppoints = 0;
                let date = '';
                let activityCompAry = {};
                let rewardCompAry = {};
                var tableName = tableConstant.HEALTH_ASSESSMENT.TBL_HA_EMOTIONAL_ASSESSMENTS;
                if(getDataType == 'single'){
                    let healthcourceEHA = `status = 1 AND DATE_FORMAT(\`created\`,"%Y-%m-%d %H:%i:%s") BETWEEN '${allDateArray['actStartDateM']}' AND '${allDateArray['actEndDateM']}'`;
                    if (actDatas['source_type'] == 1) {
                        healthcourceEHA += ' AND hra_status = 100';
                    }
                    let activityDone = await this.frontPointService.fetch_point(tableName, AssessmentEmotionalAssessmentEntity, { id : 'ASC'}, ['created'], 'user_id', 'user_id', user_id, user_id, healthcourceEHA);
                    // let activityDone = await this.frontPointService.fetch_point(tableName, AssessmentEmotionalAssessmentEntity, { id : 'ASC'}, ['DATE_FORMAT(created, "%Y-%m-%d %H:%i:%s") as created'], 'user_id', 'user_id', user_id, user_id, healthcourceEHA);
                    if (type == 'main') {
                        let mptData = activityDone;
                        let tmppointsM = await this.frontPointService.count_point_act(JSON.parse(JSON.stringify(activityDone)), actId, 'created', allDateArray, extraDataArray);
                        let tmppointsA = await this.frontService.calculate_frequency('normal', tmppointsM, extraDataArray);
                        if (Array.isArray(tmppointsA)) {
                            const tempPointObject = tmppointsA.find(item => item.hasOwnProperty('tempPoint'));
                            const activityCompAryObject = tmppointsA.find(item => item.hasOwnProperty('compDateArray'));
                            const rewardCompAryObject = tmppointsA.find(item => item.hasOwnProperty('compDateArray'));
                            tmppoints = tempPointObject ? tempPointObject.tempPoint : 0;
                            activityCompAry = activityCompAryObject ? activityCompAryObject.compDateArray : {};
                            rewardCompAry = rewardCompAryObject ? rewardCompAryObject.compDateArray : {};
                        }
                        tmppoints = await this.frontPointService.multiplay_point(tmppoints, actDatas);
                        if (tmppoints > 0) {
                            let dateExtraDataArray = [{ 'actDatas' : actDatas } ,{ 'compDateFields' : '' } , { 'joinType' : '' }];
                            date = await this.frontPointService.getActivityCompDate('normal', mptData, 'created', dateExtraDataArray);
                        }
                    }else{
                        tmppoints = await this.frontPointService.count_point(activityDone, 'created', allDateArray['actStartDate'], allDateArray['actEndDate']);
                        tmppoints = await this.commonHealthService.check_max_point(tmppoints, altActPoint);
                    }
                    let returnArray = [{'tmppoints' : tmppoints}, {'date' : date}, {'activityCompAry' : activityCompAry}, {'rewardCompAry' : rewardCompAry}];
                    return returnArray;
                }else{
                    let {
                        membershipCode = '',
                        otherCondition = '',
                        uType_condition = '',
                        statusCondition = '',
                        wellnesschampion = '',
                        allCustomPointDatas = {}
                    } = Object.assign({}, ...otherDatas);
                    let finalActivtyDone = [];
                    let extraDataArrayM = [{'allCustomPointDatas' : allCustomPointDatas, 'call_from' : call_from}]
                    extraDataArray = extraDataArray.map((item, index) => ({
                        ...item,
                        ...(extraDataArrayM[index] || {})
                    }));
                    let wellnesschampion1 = '';
                    if (actDatas['source_type'] == 1) {
                        wellnesschampion1 = 'AND ent.hra_status = 100';
                    }
                    let conditions = `${otherCondition} ent.status = 1 AND user.membership_code IN ('${membershipCode}') ${uType_condition} ${wellnesschampion} ${statusCondition} and DATE_FORMAT(CONVERT_TZ(\`ent\`.\`created\`,'UTC',CASE WHEN user.timezone != '' THEN user.timezone ELSE 'UTC' END),'%Y-%m-%d %H:%i:%s') BETWEEN '${allDateArray['actStartDate']}' AND '${allDateArray['actEndDate']}' ${wellnesschampion1}`;
                    let getFields = ['ent.id as id','DATE_FORMAT(CONVERT_TZ(\`ent\`.\`created\`,"UTC",CASE WHEN user.timezone != "" THEN user.timezone ELSE "UTC" END),"%Y-%m-%d") AS time','user.id as uid','user.role_id as role_id','user.on_insurance_plan as on_insurance_plan','user.location as location','user.department_id as department_id','user.gender as gender','TIMESTAMPDIFF(YEAR, user.dob, CURDATE()) AS age','user.is_camp_eligible as is_camp_eligible','user.timezone as timezone'];
                    const joinTableList = [{'alias':'user', 'table' : tableConstant.TBL_USERS, 'on' : '`ent`.`user_id` = `user`.`id`' }];
                    let activityDone = await this.frontPointService.fetch_point_report(tableName, AssessmentEmotionalAssessmentEntity, getFields, { time : 'ASC'}, conditions, joinTableList);

                    let inExtraDataArray = [{ 'compDateFields': 'time' , 'joinType': ''}];
                    extraDataArray = extraDataArray.map((item, index) => ({
                        ...item,
                        ...(inExtraDataArray[index] || {})
                    }));
                    let tmppointsM = await this.frontPointService.count_point_act(JSON.parse(JSON.stringify(activityDone)), actId, 'time', allDateArray, extraDataArray);
                    let tmppointsA = await this.frontService.calculate_frequency('normal', tmppointsM, extraDataArray);
                    if (activityDone.length > 0) {
                        let finalActivtyDoneData = await this.frontPointService.multiplay_point_multiuser('normal', JSON.parse(JSON.stringify(activityDone)), tmppointsA, extraDataArray);
                        finalActivtyDone = (finalActivtyDoneData.length > 0 && finalActivtyDoneData[0]['tempUserData']) ? finalActivtyDoneData[0]['tempUserData'] : {};
                    }
                    return [ {'activityDone' : activityDone, 'activityDoneF' : finalActivtyDone} ];
                }
            }catch (error) {
                throw new Error(error.message); 
            }
        }
        async getHAHRABiometric(type:any = 'main', actId:any = 0, otherDatas:any = []){
            try{
                const {
                    user_id = null,
                    actDatas = [],
                    allDateArray = [],
                    userTimezone = '',
                    altActPoint = 0,
                    getDataType = 'single',
                    call_from = '',
                    myHireData = {}
                } = Object.assign({}, ...otherDatas);
                let extraDataArray:any = [{'actDatas': actDatas, 'type' : '', 'getDataType' : getDataType, 'userTimezone' : userTimezone, 'tType' : 'YES', 'myHireData': myHireData}];
                let tmppoints = 0;
                let date = '';
                let activityCompAry = {};
                let rewardCompAry = {};
                var tableName = tableConstant.HEALTH_ASSESSMENT.TBL_HA_HRABIOMETRICS;
                if(getDataType == 'single'){
                    let where = ` status = 1 AND (activity_id REGEXP '^${actId},' OR activity_id REGEXP ',${actId}\$' OR activity_id = '${actId}' OR activity_id REGEXP ',${actId},')`;
                    let activityDone = await this.frontPointService.fetch_point(tableName, AssessmentHraBiometricEntity, { date : 'DESC'}, ['date'], 'user_id', 'user_id', user_id, user_id, where);
                    if (type == 'main') {
                        let mptData = activityDone;
                        let convertTime = appConstant.CAMPAIGN_CHECK_ACTIVITIES.TBL_HA_HRA_CONVERT_TIME;
                        let tmppointsM = {};
                        if (convertTime.includes(actId)) {
                            tmppointsM = await this.frontPointService.count_point_act(JSON.parse(JSON.stringify(activityDone)), actId, 'date', allDateArray, extraDataArray);
                        } else {
                            extraDataArray[0].tType = 'NO';
                            tmppointsM = await this.frontPointService.count_point_act(JSON.parse(JSON.stringify(activityDone)), actId, 'date', allDateArray, extraDataArray);
                        }
                        let tmppointsA = await this.frontService.calculate_frequency('normal', tmppointsM, extraDataArray);
                        if (Array.isArray(tmppointsA)) {
                            const tempPointObject = tmppointsA.find(item => item.hasOwnProperty('tempPoint'));
                            const activityCompAryObject = tmppointsA.find(item => item.hasOwnProperty('compDateArray'));
                            const rewardCompAryObject = tmppointsA.find(item => item.hasOwnProperty('compDateArray'));
                            tmppoints = tempPointObject ? tempPointObject.tempPoint : 0;
                            activityCompAry = activityCompAryObject ? activityCompAryObject.compDateArray : {};
                            rewardCompAry = rewardCompAryObject ? rewardCompAryObject.compDateArray : {};
                        }
                        tmppoints = await this.frontPointService.multiplay_point(tmppoints, actDatas);
                        if (tmppoints > 0) {
                            let dateExtraDataArray = [{ 'actDatas' : actDatas } ,{ 'compDateFields' : '' } , { 'joinType' : '' }];
                            date = await this.frontPointService.getActivityCompDate('normal', mptData, 'date', dateExtraDataArray);
                        }
                    }else{
                        tmppoints = await this.frontPointService.count_point(activityDone, 'date', allDateArray['actStartDate'], allDateArray['actEndDate']);
                        tmppoints = await this.commonHealthService.check_max_point(tmppoints, altActPoint);
                    }
                    let returnArray = [{'tmppoints' : tmppoints}, {'date' : date}, {'activityCompAry' : activityCompAry}, {'rewardCompAry' : rewardCompAry}];
                    return returnArray;
                }else{
                    let {
                        membershipCode = '',
                        otherCondition = '',
                        uType_condition = '',
                        statusCondition = '',
                        wellnesschampion = '',
                        allCustomPointDatas = {}
                    } = Object.assign({}, ...otherDatas);
                    let finalActivtyDone = [];
                    let extraDataArrayM = [{'allCustomPointDatas' : allCustomPointDatas, 'call_from' : call_from}]
                    extraDataArray = extraDataArray.map((item, index) => ({
                        ...item,
                        ...(extraDataArrayM[index] || {})
                    }));
                    let hraConvertTime = appConstant.CAMPAIGN_CHECK_ACTIVITIES.TBL_HA_HRA_CONVERT_TIME;
                    let t208754 = ` (ent.activity_id REGEXP '^${actId},' OR ent.activity_id REGEXP ',${actId}\$' OR ent.activity_id = '${actId}' OR ent.activity_id REGEXP ',${actId},')`;
                    let conditions = '';
                    let getFields = [];
                    if(hraConvertTime.includes(actId)){
                        conditions = `${otherCondition} ${t208754} AND ent.status = 1 AND user.membership_code IN ('${membershipCode}') ${uType_condition} ${wellnesschampion} ${statusCondition} and DATE_FORMAT(CONVERT_TZ(\`ent\`.\`date\`,'UTC',CASE WHEN user.timezone != '' THEN user.timezone ELSE 'UTC' END),'%Y-%m-%d %H:%i:%s') BETWEEN '${allDateArray['actStartDate']}' AND '${allDateArray['actEndDate']}'`;
                        getFields = ['ent.id as id','DATE_FORMAT(CONVERT_TZ(`ent`.`date`,"UTC",CASE WHEN user.timezone != "" THEN user.timezone ELSE "UTC" END),"%Y-%m-%d") AS time','user.id as uid','user.role_id as role_id','user.on_insurance_plan as on_insurance_plan','user.location as location','user.department_id as department_id','user.gender as gender','TIMESTAMPDIFF(YEAR, user.dob, CURDATE()) AS age','user.is_camp_eligible as is_camp_eligible','user.timezone as timezone'];
                    }else{
                        conditions = `${otherCondition} ent.status = 1 AND user.membership_code IN ('${membershipCode}') ${uType_condition} ${wellnesschampion} ${statusCondition} and DATE_FORMAT(CONVERT_TZ(\`ent\`.\`date\`,'UTC',CASE WHEN user.timezone != '' THEN user.timezone ELSE 'UTC' END),'%Y-%m-%d %H:%i:%s') BETWEEN '${allDateArray['actStartDate']}' AND '${allDateArray['actEndDate']}'`;
                        getFields = ['ent.id as id','DATE_FORMAT(`ent`.`date`,"%Y-%m-%d %H:%i:%s") AS time','user.id as uid','user.role_id as role_id','user.on_insurance_plan as on_insurance_plan','user.location as location','user.department_id as department_id','user.gender as gender','TIMESTAMPDIFF(YEAR, user.dob, CURDATE()) AS age','user.is_camp_eligible as is_camp_eligible','user.timezone as timezone'];
                    }
                    const joinTableList = [{'alias':'user', 'table' : tableConstant.TBL_USERS, 'on' : '`ent`.`user_id` = `user`.`id`' }];
                    let activityDone = await this.frontPointService.fetch_point_report(tableName, AssessmentHraBiometricEntity, getFields, { time : 'DESC'}, conditions, joinTableList);
                    let inExtraDataArray = [{ 'compDateFields': 'time' , 'joinType': ''}];
                    extraDataArray = extraDataArray.map((item, index) => ({
                        ...item,
                        ...(inExtraDataArray[index] || {})
                    }));
                    let tmppointsM = await this.frontPointService.count_point_act(JSON.parse(JSON.stringify(activityDone)), actId, 'time', allDateArray, extraDataArray);
                    let tmppointsA = await this.frontService.calculate_frequency('normal', tmppointsM, extraDataArray);
                    if (activityDone.length > 0) {
                        let finalActivtyDoneData = await this.frontPointService.multiplay_point_multiuser('normal', JSON.parse(JSON.stringify(activityDone)), tmppointsA, extraDataArray);
                        finalActivtyDone = (finalActivtyDoneData.length > 0 && finalActivtyDoneData[0]['tempUserData']) ? finalActivtyDoneData[0]['tempUserData'] : {};
                    }
                    return [ {'activityDone' : activityDone, 'activityDoneF' : finalActivtyDone} ];
                }
            }catch (error) {
                throw new Error(error.message); 
            }
        }
    /* HRA Table Querys */

    /* ft_biomatrics */
        async getFtBiomatrics(type:any = 'main', actId:any = 0, otherDatas:any = []){
            try{
                const {
                    user_id = null,
                    actDatas = [],
                    allDateArray = [],
                    userTimezone = '',
                    getDataType = 'single',
                    call_from = '',
                    myHireData = {}
                } = Object.assign({}, ...otherDatas);
                let extraDataArray:any = [{'actDatas': actDatas, 'type' : '', 'getDataType' : getDataType, 'userTimezone' : userTimezone, 'tType' : 'YES', 'myHireData': myHireData}];
                let tmppoints = 0;
                let date = '';
                let activityCompAry = {};
                let rewardCompAry = {};
                var tableName = tableConstant.TRACKERS.TBL_FT_BIOMETRICS;
                if(getDataType == 'single'){
                    if (type == 'main') {
                        let conditionsetup = '';
                        if(actId == 15944){
                            conditionsetup = ' AND type = 2';
                        }else if(actId == 16066){
                            conditionsetup = ' AND type = 1';
                        }else if(actId == 16067){
                            conditionsetup = ' AND type = 3';
                        }else if(actId == 16068){
                            conditionsetup = ' AND type = 4';
                        }else if(actId == 16069){
                            conditionsetup = '';
                        }
                        let where = ` status = 1 AND CONCAT(DATE_FORMAT(\`added_date\`,"%Y-%m-%d "),DATE_FORMAT(\`inserted\`,"%H:%i:%s")) BETWEEN '${allDateArray['originalActStartDate']}' AND '${allDateArray['originalActEndDate']}' ${conditionsetup}`;
                        let activityDone = await this.frontPointService.fetch_point(tableName, FtBiometricsEntity, { added_date : 'ASC'}, ['CONCAT(DATE_FORMAT(added_date,"%Y-%m-%d "),DATE_FORMAT(inserted,"%H:%i:%s")) as added_date'], 'user_id', 'user_id', user_id, user_id, where);
                        let mptData = activityDone;
                        let tmppointsM = await this.frontPointService.count_point_act(JSON.parse(JSON.stringify(activityDone)), actId, 'added_date', allDateArray, extraDataArray);
                        let tmppointsA = await this.frontService.calculate_frequency('normal', tmppointsM, extraDataArray);
                        if (Array.isArray(tmppointsA)) {
                            const tempPointObject = tmppointsA.find(item => item.hasOwnProperty('tempPoint'));
                            const activityCompAryObject = tmppointsA.find(item => item.hasOwnProperty('compDateArray'));
                            const rewardCompAryObject = tmppointsA.find(item => item.hasOwnProperty('compDateArray'));
                            tmppoints = tempPointObject ? tempPointObject.tempPoint : 0;
                            activityCompAry = activityCompAryObject ? activityCompAryObject.compDateArray : {};
                            rewardCompAry = rewardCompAryObject ? rewardCompAryObject .compDateArray: {};
                        }
                        tmppoints = await this.frontPointService.multiplay_point(tmppoints, actDatas);
                        if (tmppoints > 0) {
                            let dateExtraDataArray = [{ 'actDatas' : actDatas } ,{ 'compDateFields' : '' } , { 'joinType' : '' }];
                            date = await this.frontPointService.getActivityCompDate('normal', mptData, 'added_date', dateExtraDataArray);
                        }
                    }
                    let returnArray = [{'tmppoints' : tmppoints}, {'date' : date}, {'activityCompAry' : activityCompAry}, {'rewardCompAry' : rewardCompAry}];
                    return returnArray;
                }else{
                    let {
                        membershipCode = '',
                        otherCondition = '',
                        uType_condition = '',
                        statusCondition = '',
                        wellnesschampion = '',
                        allCustomPointDatas = {}
                    } = Object.assign({}, ...otherDatas);
                    let finalActivtyDone = [];
                    let extraDataArrayM = [{'allCustomPointDatas' : allCustomPointDatas, 'call_from' : call_from}]
                    extraDataArray = extraDataArray.map((item, index) => ({
                        ...item,
                        ...(extraDataArrayM[index] || {})
                    }));
                    let conditionsetup = '';
                    if(actId == 15944){
                        conditionsetup = ' AND type = 2';
                    }else if(actId == 16066){
                        conditionsetup = ' AND type = 1';
                    }else if(actId == 16067){
                        conditionsetup = ' AND type = 3';
                    }else if(actId == 16068){
                        conditionsetup = ' AND type = 4';
                    }else if(actId == 16069){
                        conditionsetup = '';
                    }
                    let conditions = `${otherCondition} ent.status = 1 AND user.membership_code IN ('${membershipCode}') ${uType_condition} ${wellnesschampion} ${statusCondition} and DATE_FORMAT(CONVERT_TZ(CONCAT(DATE_FORMAT(\`ent\`.\`added_date\`,'%Y-%m-%d '),DATE_FORMAT(\`ent\`.\`inserted\`,'%H:%i:%s')),'UTC',CASE WHEN user.timezone != '' THEN user.timezone ELSE 'UTC' END),'%Y-%m-%d %H:%i:%s') BETWEEN '${allDateArray['actStartDate']}' AND '${allDateArray['actEndDate']}' ${conditionsetup}`;
                    let getFields = ['ent.id as id','DATE_FORMAT(CONVERT_TZ(CONCAT(DATE_FORMAT(ent.added_date,"%Y-%m-%d "),DATE_FORMAT(ent.inserted,"%H:%i:%s")),"UTC",CASE WHEN `user`.`timezone` != "" THEN `user`.`timezone` ELSE "UTC" END),"%Y-%m-%d") AS time','user.id as uid','user.role_id as role_id','user.on_insurance_plan as on_insurance_plan','user.location as location','user.department_id as department_id','user.gender as gender','TIMESTAMPDIFF(YEAR, user.dob, CURDATE()) AS age','user.is_camp_eligible as is_camp_eligible','user.timezone as timezone'];
                    const joinTableList = [{'alias':'user', 'table' : tableConstant.TBL_USERS, 'on' : '`ent`.`user_id` = `user`.`id`' }];
                    let activityDone = await this.frontPointService.fetch_point_report(tableName, FtBiometricsEntity, getFields, { time : 'ASC'}, conditions, joinTableList);
                    let inExtraDataArray = [{ 'compDateFields': 'time' , 'joinType': ''}];
                    extraDataArray = extraDataArray.map((item, index) => ({
                        ...item,
                        ...(inExtraDataArray[index] || {})
                    }));
                    let tmppointsM = await this.frontPointService.count_point_act(JSON.parse(JSON.stringify(activityDone)), actId, 'time', allDateArray, extraDataArray);
                    let tmppointsA = await this.frontService.calculate_frequency('normal', tmppointsM, extraDataArray);
                    if (activityDone.length > 0) {
                        let finalActivtyDoneData = await this.frontPointService.multiplay_point_multiuser('normal', JSON.parse(JSON.stringify(activityDone)), tmppointsA, extraDataArray);
                        finalActivtyDone = (finalActivtyDoneData.length > 0 && finalActivtyDoneData[0]['tempUserData']) ? finalActivtyDoneData[0]['tempUserData'] : {};
                    }
                    return [ {'activityDone' : activityDone, 'activityDoneF' : finalActivtyDone} ];
                }
            }catch (error) {
                throw new Error(error.message); 
            }
        }
    /* ft_biomatrics */

    async getUsersWithLatestBiometricss(condition: string) {
        let query = this.readReplicaUserRepository
          .createQueryBuilder('user')
          .leftJoinAndSelect(
            (qb) =>
              qb
                .subQuery()
                .select('*')
                .from(BiometricsEntity, 'Biometric')
                .orderBy('Biometric.id', 'DESC'),
                'Biometric',
                'user.id = Biometric.user_id',
            )
            .where(condition) // Apply the provided condition
            .select([
                'user.id',
                'user.gender',
                'Biometric'
                ]
            )
            .groupBy('user.id');
            return await query.getMany(); // Returns raw results; you can use `.getMany()` for entity mapping
    }
    async getUsersWithLatestBiometrics(condition: string) {
        let query = this.readReplicaBiometricsRepository
          .createQueryBuilder('Biometric')
          .leftJoinAndMapMany(
            'Biometric.user',
            tableConstant.TBL_USERS,
            'user',
            `user.id = Biometric.user_id`,
          )
        .where(condition)
        .andWhere(
            `Biometric.id = (
              SELECT MAX(b.id)
              FROM ${tableConstant.HEALTH_CHECKUP.TBL_HC_BIOMETRICS} b
              WHERE b.user_id = Biometric.user_id
            )`,
        )
        .groupBy('user.id')
        .select(['user.id', 'user.gender', 'Biometric'])
        .orderBy('Biometric.id', 'DESC');
        return await query.getMany();
    }
    async getNumberOfUsersForBFactor(usersBioData: any[], field: string, risk: string, returnType: string = ''){
        try{
            let userCount = 0;
            let totalValue = 0;
            let totalBioUser = 0;
            if (!usersBioData || usersBioData.length === 0) {
                return userCount;
            }
            for (const bioData of usersBioData) {
                const gender = bioData?.user?.[0]['gender'] || '';
                if (['hdlm', 'hdlw', 'weightm', 'weightw'].includes(field)) {
                    // Special fields are handled separately
                } else if (!['blood_glucose_1', 'blood_glucose_2'].includes(field)) {
                    if (!bioData?.[field]) {
                    continue;
                    }
                }
                if (risk === 'avg') {
                    let fieldToCalculate = field;
                    if (['weightm', 'hdlm'].includes(field) && gender == 'm') {
                        fieldToCalculate = field == 'hdlm' ? 'hdl' : 'weight';
                        totalBioUser++;
                    } else if (['weightw', 'hdlw'].includes(field) && gender == 'f') {
                        fieldToCalculate = field == 'hdlw' ? 'hdl' : 'weight';
                        totalBioUser++;
                    } else if (!['hdlm', 'hdlw', 'weightm', 'weightw', 'blood_glucose_1', 'blood_glucose_2'].includes(field)) {
                        totalBioUser++;
                    }
                    if (field == 'blood_glucose_1' && bioData?.test_type == 1) {
                        fieldToCalculate = 'blood_glucose';
                        totalBioUser++;
                    } else if (field == 'blood_glucose_2' && bioData?.test_type == 2) {
                        fieldToCalculate = 'blood_glucose';
                        totalBioUser++;
                    }
                    totalValue += bioData?.[fieldToCalculate] || 0;
                    continue;
                }
                const biometricField = bioData?.[field];
                switch (field) {
                    case 'bmi':
                        if ((risk == 'low' && biometricField < 25) || (risk == 'moderate' && biometricField >= 25 && biometricField < 30) || (risk == 'high' && biometricField >= 30 && biometricField < 35) || (risk == 'very_high' && biometricField >= 35)) {
                            userCount++;
                        }
                    break;
                    case 'systolic':
                        if ((risk == 'low' && biometricField < 120) || (risk == 'moderate' && biometricField >= 120 && biometricField <= 139) || (risk == 'high' && biometricField >= 140 && biometricField <= 160) || (risk == 'very_high' && biometricField > 160)) {
                            userCount++;
                        }
                    break;
                    case 'diastolic':
                        if ((risk == 'low' && biometricField < 80) || (risk == 'moderate' && biometricField >= 80 && biometricField <= 89) || (risk == 'high' && biometricField >= 90 && biometricField <= 99) || (risk == 'very_high' && biometricField >= 100)) {
                            userCount++;
                        }
                    break;
                    case 'blood_glucose':
                        if ((risk == 'low' && biometricField < 100) || (risk == 'moderate' && biometricField >= 100 && biometricField <= 125) || (risk == 'high' && biometricField >= 126)) {
                            userCount++;
                        }
                    break;
                    case 'blood_glucose_1':
                        if (bioData?.test_type == 1) {
                            const bloodGlucoseField = bioData?.blood_glucose;
                            if ((risk == 'low' && bloodGlucoseField < 100) || (risk == 'moderate' && bloodGlucoseField >= 100 && bloodGlucoseField <= 125) || (risk == 'high' && bloodGlucoseField >= 126)) {
                                userCount++;
                            }
                        }
                    break;
                    case 'blood_glucose_2':
                        if (bioData?.test_type == 2) {
                            const bloodGlucoseField = bioData?.blood_glucose;
                            if ((risk == 'low' && bloodGlucoseField < 100) || (risk == 'moderate' && bloodGlucoseField >= 100 && bloodGlucoseField <= 125) || (risk == 'high' && bloodGlucoseField >= 126)) {
                                userCount++;
                            }
                        }
                    break;
                    case 'alc':
                        if ((risk == 'low' && biometricField < 5.7) || (risk == 'high' && biometricField >= 5.7)) {
                            userCount++;
                        }
                    break;
                    case 'hdlm':
                        if (gender == 'm') {
                            if ((risk == 'low' && bioData?.hdl > 59) || (risk == 'moderate' && bioData?.hdl >= 40 && bioData?.hdl <= 59) || (risk == 'high' && bioData?.hdl < 40)) {
                                userCount++;
                            }
                        }
                    break;
                    case 'hdlw':
                        if (gender == 'f') {
                            if ((risk == 'low' && bioData?.hdl > 59) || (risk == 'moderate' && bioData?.hdl >= 50 && bioData?.hdl <= 59) || (risk == 'high' && bioData?.hdl < 50)) {
                                userCount++;
                            }
                        }
                    break;
                    case 'ldl':
                        if ((risk == 'low' && biometricField < 100) || (risk == 'moderate' && biometricField >= 100 && biometricField <= 129) || (risk == 'high' && biometricField >= 130 && biometricField <= 159) || (risk == 'very_high' && biometricField > 159)) {
                            userCount++;
                        }
                    break;
                    case 'triglycerides':
                        if ((risk == 'low' && biometricField < 150) || (risk == 'moderate' && biometricField >= 150 && biometricField <= 199) || (risk == 'high' && biometricField >= 200 && biometricField <= 499) || (risk == 'very_high' && biometricField >= 500)) {
                            userCount++;
                        }
                    break;
                    case 'total_cholesterol':
                        if ((risk == 'low' && biometricField < 200) || (risk == 'moderate' && biometricField >= 200 && biometricField <= 239) || (risk == 'high' && biometricField >= 240)) {
                            userCount++;
                        }
                    break;
                }
            }
            return userCount;
        }catch (error) {
            throw new Error(error.message); 
        }
    }
}

import { ActivityFeedsEntity, CommonDateService, CommonHealthService, CovidUserAnswersEntity, EmotionalWellBeingPostClickEntity, EventUserBookingListsEntity, FoodFeedsEntity, MediaFitnessVideoClickEntity, MyPlanCompleteActivityEntity, MyPlanCompleteBlockEntity, MyPlanJoinUserPlanEntity, QuickLinkClicksEntity, ReimbursementSubmitedFormsEntity, SubmitedFormsEntity, tableConstant, UserDetailsEntity, UserLoginEntity } from '@common-constants';
import { Injectable } from '@nestjs/common';
import * as moment from 'moment-timezone';
import { FrontService } from './front.service';
import { FrontPointService } from './frontpoint.service';
import { SortingService } from '@/modules/common';
@Injectable()
export class FrontTrackerEventMediaService {
    constructor(
        private readonly commonDateService: CommonDateService,
        private readonly commonHealthService: CommonHealthService,
        private readonly frontService: FrontService,
        private readonly frontPointService: FrontPointService,
        private readonly sortingService: SortingService,
    ) {}

    /* Activity tracker */
        async getActivityTracter(type:any = 'main', actId:any = 0, otherDatas:any = []){
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
                var tableName = tableConstant.ACTIVITY_TRACKER.TBL_SUBMITTED_FORMS;
                if(getDataType == 'single'){
                    let where = `status = 1 AND DATE_FORMAT(CONVERT_TZ(\`activity_date\`,'UTC','${userTimezone}'),'%Y-%m-%d %H:%i:%s') BETWEEN '${allDateArray['actStartDateM']}' AND '${allDateArray['actEndDateM']}'`;
                    let activityDone = await this.frontPointService.fetch_point(tableName, SubmitedFormsEntity, { activity_date : 'ASC'}, ['activity_date','added_date','id'], 'user_id', 'activity_id', actId, user_id, where);
                    if (type == 'main') {
                        let mptData = activityDone;
                        let inExtraDataArray = [{ 'compDateFields': 'added_date' , 'joinType': ''}];
                        extraDataArray = extraDataArray.map((item, index) => ({
                            ...item,
                            ...(inExtraDataArray[index] || {})
                        }));
                        let tmppointsM = await this.frontPointService.count_point_act(JSON.parse(JSON.stringify(activityDone)), actId, 'activity_date', allDateArray, extraDataArray);
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
                            date = await this.frontPointService.getActivityCompDate('normal', mptData, 'activity_date', dateExtraDataArray);
                        }
                    }
                    let returnArray = [{'tmppoints' : tmppoints}, {'date' : date}, {'activityCompAry' : activityCompAry}, {'rewardCompAry' : rewardCompAry}];
                    return returnArray;
                }else{
                    const {
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
                    let dateformate = "DATE_FORMAT(CONVERT_TZ(`ent`.`activity_date`,'UTC',CASE WHEN `user`.`timezone` != '' THEN `user`.`timezone` ELSE 'UTC' END),'%Y-%m-%d %H:%i:%s')";
                    let dateformates = "DATE_FORMAT(CONVERT_TZ(`ent`.`added_date`,'UTC',CASE WHEN `user`.`timezone` != '' THEN `user`.`timezone` ELSE 'UTC' END),'%Y-%m-%d %H:%i:%s')";
                    let conditions = `${otherCondition} ent.activity_id IN (${actId}) AND ent.status = 1 AND user.membership_code IN ('${membershipCode}') ${uType_condition} ${wellnesschampion} ${statusCondition} and ${dateformate} BETWEEN '${allDateArray['actStartDate']}' AND '${allDateArray['actEndDate']}'`;
                    let getFields = ['ent.id as id','ent.activity_id as activity_id',`${dateformate} AS time`,`${dateformates} AS time2`,'user.id as uid','user.role_id as role_id','user.on_insurance_plan as on_insurance_plan','user.location as location','user.department_id as department_id','user.gender as gender','TIMESTAMPDIFF(YEAR, user.dob, CURDATE()) AS age','user.is_camp_eligible as is_camp_eligible','user.timezone as timezone'];
                    const joinTableList = [{'alias':'user', 'table' : tableConstant.TBL_USERS, 'on' : '`ent`.`user_id` = `user`.`id`' }];
                    let activityDone = await this.frontPointService.fetch_point_report(tableName, SubmitedFormsEntity, getFields, { time : 'ASC'}, conditions, joinTableList);
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
    /* Activity tracker */
    /* Reimbursements */
        async getReimbursements(type:any = 'main', actId:any = 0, otherDatas:any = []){
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
                
                let finalActivtyDone = [];
                let extraDataArray:any = [{'actDatas': actDatas, 'type' : '', 'getDataType' : getDataType, 'userTimezone' : userTimezone, 'tType' : 'NO', 'myHireData': myHireData}];
                let tmppoints = 0;
                let date = '';
                let activityCompAry = {};
                let rewardCompAry = {};
                var tableName = tableConstant.REIMBURSEMENT.TBL_RE_SUBMITTED_FORMS;
                if(getDataType == 'single'){
                    let where = `status = 1 AND DATE_FORMAT(\`activity_date\`,"%Y-%m-%d %H:%i:%s")  BETWEEN '${allDateArray['originalActStartDate']}' AND '${allDateArray['originalActEndDate']}'`;
                    let activityDone = await this.frontPointService.fetch_point(tableName, ReimbursementSubmitedFormsEntity, { id : 'ASC'}, ['activity_date','added_date','id'], 'user_id', 'activity_id', actId, user_id, where);
                    if (type == 'main') {
                        let mptData = activityDone;
                        let inExtraDataArray = [{ 'compDateFields': 'added_date' , 'joinType': ''}];
                        extraDataArray = extraDataArray.map((item, index) => ({
                            ...item,
                            ...(inExtraDataArray[index] || {})
                        }));
                        let tmppointsM = await this.frontPointService.count_point_act(JSON.parse(JSON.stringify(activityDone)), actId, 'activity_date', allDateArray, extraDataArray);
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
                            date = await this.frontPointService.getActivityCompDate('normal', mptData, 'activity_date', dateExtraDataArray);
                        }
                    }
                    let returnArray = [{'tmppoints' : tmppoints}, {'date' : date}, {'activityCompAry' : activityCompAry}, {'rewardCompAry' : rewardCompAry}];
                    return returnArray;
                }else{
                    const {
                        membershipCode = '',
                        otherCondition = '',
                        uType_condition = '',
                        statusCondition = '',
                        wellnesschampion = '',
                        allCustomPointDatas = {}
                    } = Object.assign({}, ...otherDatas);
                    let extraDataArrayM = [{'allCustomPointDatas' : allCustomPointDatas, 'call_from' : call_from}]
                    extraDataArray = extraDataArray.map((item, index) => ({
                        ...item,
                        ...(extraDataArrayM[index] || {})
                    }));
                    let dateformate = "DATE_FORMAT(CONVERT_TZ(`ent`.`activity_date`,'UTC',CASE WHEN `user`.`timezone` != '' THEN `user`.`timezone` ELSE 'UTC' END),'%Y-%m-%d %H:%i:%s')";
                    let dateformates = "DATE_FORMAT(CONVERT_TZ(`ent`.`added_date`,'UTC',CASE WHEN `user`.`timezone` != '' THEN `user`.`timezone` ELSE 'UTC' END),'%Y-%m-%d %H:%i:%s')";
                    let conditions = `${otherCondition} ent.activity_id IN (${actId}) AND ent.status = 1 AND user.membership_code IN ('${membershipCode}') ${uType_condition} ${wellnesschampion} ${statusCondition} and ${dateformate} BETWEEN '${allDateArray['actStartDate']}' AND '${allDateArray['actEndDate']}'`;
                    let getFields = ['ent.id as id','ent.activity_id as activity_id',`${dateformate} AS time`,`${dateformates} AS time2`,'user.id as uid','user.role_id as role_id','user.on_insurance_plan as on_insurance_plan','user.location as location','user.department_id as department_id','user.gender as gender','TIMESTAMPDIFF(YEAR, user.dob, CURDATE()) AS age','user.is_camp_eligible as is_camp_eligible','user.timezone as timezone'];
                    const joinTableList = [{'alias':'user', 'table' : tableConstant.TBL_USERS, 'on' : '`ent`.`user_id` = `user`.`id`' }];
                    let activityDone = await this.frontPointService.fetch_point_report(tableName, ReimbursementSubmitedFormsEntity, getFields, { time : 'DESC'}, conditions, joinTableList);
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
    /* Reimbursements */
    /* My Plans*/
        /* mp_join_user_plan */
            async getJoinUserPlans(type:any = 'main', actId:any = 0, otherDatas:any = []){
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
                    let finalActivtyDone = [];
                    let extraDataArray:any = [{'actDatas': actDatas, 'type' : '', 'getDataType' : getDataType, 'userTimezone' : userTimezone, 'tType' : 'YES', 'myHireData': myHireData}];
                    let tmppoints = 0;
                    let date = '';
                    let activityCompAry = {};
                    let rewardCompAry = {};
                    var tableName = tableConstant.MY_PLAN.TBL_MP_JOIN_USER_PLAN;
                    if(getDataType == 'single'){
                        if (type == 'main') {
                            let where = `is_complete = 1 AND status = 1 AND DATE_FORMAT(\`complete_date\`,"%Y-%m-%d %H:%i:%s")  BETWEEN '${allDateArray['actStartDateM']}' AND '${allDateArray['actEndDateM']}'`;
                            let activityDone = [];
                            if(actId == 7780){
                                activityDone = await this.frontPointService.fetch_point(tableName, MyPlanJoinUserPlanEntity, { id : 'ASC'}, ['complete_date'], 'user_id', 'user_id', user_id, user_id, where);
                            }else{
                                activityDone = await this.frontPointService.fetch_point(tableName, MyPlanJoinUserPlanEntity, { id : 'ASC'}, ['complete_date'], 'user_id', 'activity_id', actId, user_id, where);
                            }
                            let mptData = activityDone;
                            let tmppointsM = await this.frontPointService.count_point_act(JSON.parse(JSON.stringify(activityDone)), actId, 'complete_date', allDateArray, extraDataArray);
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
                                date = await this.frontPointService.getActivityCompDate('normal', mptData, 'complete_date', dateExtraDataArray);
                            }
                        }
                        let returnArray = [{'tmppoints' : tmppoints}, {'date' : date}, {'activityCompAry' : activityCompAry}, {'rewardCompAry' : rewardCompAry}];
                        return returnArray;
                    }else{
                        const {
                            membershipCode = '',
                            otherCondition = '',
                            uType_condition = '',
                            statusCondition = '',
                            wellnesschampion = '',
                            allCustomPointDatas = {}
                        } = Object.assign({}, ...otherDatas);
                        let extraDataArrayM = [{'allCustomPointDatas' : allCustomPointDatas, 'call_from' : call_from}]
                        extraDataArray = extraDataArray.map((item, index) => ({
                            ...item,
                            ...(extraDataArrayM[index] || {})
                        }));
                        let conditions = '';
                        let getFields = [];
                        if(actId == 7780){
                            conditions = `${otherCondition} ent.status = 1 AND ent.is_complete = '1' AND user.membership_code IN ('${membershipCode}') ${uType_condition} ${wellnesschampion} ${statusCondition} and DATE_FORMAT(CONVERT_TZ(\`ent\`.\`complete_date\`,'UTC',CASE WHEN user.timezone != '' THEN user.timezone ELSE 'UTC' END),'%Y-%m-%d %H:%i:%s') BETWEEN '${allDateArray['actStartDate']}' AND '${allDateArray['actEndDate']}'`;
                            getFields = ['ent.id as id','DATE_FORMAT(CONVERT_TZ(`ent`.`complete_date`,"UTC",CASE WHEN user.timezone != "" THEN user.timezone ELSE "UTC" END),"%Y-%m-%d") AS time','user.id as uid','user.role_id as role_id','user.on_insurance_plan as on_insurance_plan','user.location as location','user.department_id as department_id','user.gender as gender','TIMESTAMPDIFF(YEAR, user.dob, CURDATE()) AS age','user.is_camp_eligible as is_camp_eligible','user.timezone as timezone'];
                        }else{
                            conditions = `${otherCondition} ent.status = 1 AND ent.activity_id IN (${actId}) AND ent.is_complete = '1' AND user.membership_code IN ('${membershipCode}') ${uType_condition} ${wellnesschampion} ${statusCondition} and DATE_FORMAT(CONVERT_TZ(\`ent\`.\`complete_date\`,'UTC',CASE WHEN user.timezone != '' THEN user.timezone ELSE 'UTC' END),'%Y-%m-%d %H:%i:%s') BETWEEN '${allDateArray['actStartDate']}' AND '${allDateArray['actEndDate']}'`;
                            getFields = ['ent.id as id','ent.activity_id as activity_id','DATE_FORMAT(CONVERT_TZ(`ent`.`complete_date`,"UTC",CASE WHEN user.timezone != "" THEN user.timezone ELSE "UTC" END),"%Y-%m-%d") AS time','user.id as uid','user.role_id as role_id','user.on_insurance_plan as on_insurance_plan','user.location as location','user.department_id as department_id','user.gender as gender','TIMESTAMPDIFF(YEAR, user.dob, CURDATE()) AS age','user.is_camp_eligible as is_camp_eligible','user.timezone as timezone'];
                        }
                        const joinTableList = [{'alias':'user', 'table' : tableConstant.TBL_USERS, 'on' : '`ent`.`user_id` = `user`.`id`' }];
                        let activityDone = await this.frontPointService.fetch_point_report(tableName, MyPlanJoinUserPlanEntity, getFields, { time : 'DESC'}, conditions, joinTableList);
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
        /* mp_join_user_plan */
        /* mp_complete_block */
            async getMPComplateBlock(type:any = 'main', actId:any = 0, otherDatas:any = []){
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
                    var tableName = tableConstant.MY_PLAN.TBL_MP_COMPLETE_BLOCK;
                    if(getDataType == 'single'){
                        if (type == 'main') {
                            let where = `status = 1 AND DATE_FORMAT(\`complete_date\`,"%Y-%m-%d %H:%i:%s")  BETWEEN '${allDateArray['actStartDateM']}' AND '${allDateArray['actEndDateM']}'`;
                            let activityDone = [];
                            activityDone = await this.frontPointService.fetch_point(tableName, MyPlanCompleteBlockEntity, { id : 'ASC'}, ['complete_date'], 'user_id', 'activity_id', actId, user_id, where);
                            let mptData = activityDone;
                            let tmppointsM = await this.frontPointService.count_point_act(JSON.parse(JSON.stringify(activityDone)), actId, 'complete_date', allDateArray, extraDataArray);
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
                                date = await this.frontPointService.getActivityCompDate('normal', mptData, 'complete_date', dateExtraDataArray);
                            }
                        }
                        let returnArray = [{'tmppoints' : tmppoints}, {'date' : date}, {'activityCompAry' : activityCompAry}, {'rewardCompAry' : rewardCompAry}];
                        return returnArray;
                    }else{
                        const {
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
                        let conditions = `${otherCondition} ent.activity_id IN (${actId}) AND ent.status = 1 AND user.membership_code IN ('${membershipCode}') ${uType_condition} ${wellnesschampion} ${statusCondition} and DATE_FORMAT(CONVERT_TZ(\`ent\`.\`complete_date\`,'UTC',CASE WHEN user.timezone != '' THEN user.timezone ELSE 'UTC' END),'%Y-%m-%d %H:%i:%s') BETWEEN '${allDateArray['actStartDate']}' AND '${allDateArray['actEndDate']}'`;
                        let getFields = ['ent.id as id','ent.activity_id as activity_id','DATE_FORMAT(CONVERT_TZ(`ent`.`complete_date`,"UTC",CASE WHEN user.timezone != "" THEN user.timezone ELSE "UTC" END),"%Y-%m-%d") AS time','user.id as uid','user.role_id as role_id','user.on_insurance_plan as on_insurance_plan','user.location as location','user.department_id as department_id','user.gender as gender','TIMESTAMPDIFF(YEAR, user.dob, CURDATE()) AS age','user.is_camp_eligible as is_camp_eligible','user.timezone as timezone'];
                        const joinTableList = [{'alias':'user', 'table' : tableConstant.TBL_USERS, 'on' : '`ent`.`user_id` = `user`.`id`' }];
                        let activityDone = await this.frontPointService.fetch_point_report(tableName, MyPlanCompleteBlockEntity, getFields, { time : 'DESC'}, conditions, joinTableList);
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
        /* mp_complete_block */
        /* mp_complete_activity */
            async getMPComplateActivity(type:any = 'main', actId:any = 0, otherDatas:any = []){
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
                    var tableName = tableConstant.MY_PLAN.TBL_MP_COMPLETE_ACTIVITY;
                    if(getDataType == 'single'){
                        if (type == 'main') {
                            let where = `status = 1 AND DATE_FORMAT(\`created\`,"%Y-%m-%d %H:%i:%s")  BETWEEN '${allDateArray['actStartDateM']}' AND '${allDateArray['actEndDateM']}'`;
                            let activityDone = [];
                            activityDone = await this.frontPointService.fetch_point(tableName, MyPlanCompleteActivityEntity, { id : 'ASC'}, ['created'], 'user_id', 'activity_id', actId, user_id, where);
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
                        }
                        let returnArray = [{'tmppoints' : tmppoints}, {'date' : date}, {'activityCompAry' : activityCompAry}, {'rewardCompAry' : rewardCompAry}];
                        return returnArray;
                    }else{
                        const {
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
                        let conditions = `${otherCondition} ent.status = 1 AND ent.activity_id IN (${actId}) AND user.membership_code IN ('${membershipCode}') ${uType_condition} ${wellnesschampion} ${statusCondition} and DATE_FORMAT(CONVERT_TZ(\`ent\`.\`created\`,'UTC',CASE WHEN user.timezone != '' THEN user.timezone ELSE 'UTC' END),'%Y-%m-%d %H:%i:%s') BETWEEN '${allDateArray['actStartDate']}' AND '${allDateArray['actEndDate']}'`;
                        let getFields = ['ent.id as id','ent.activity_id as activity_id','DATE_FORMAT(CONVERT_TZ(`ent`.`created`,"UTC",CASE WHEN user.timezone != "" THEN user.timezone ELSE "UTC" END),"%Y-%m-%d") AS time','user.id as uid','user.role_id as role_id','user.on_insurance_plan as on_insurance_plan','user.location as location','user.department_id as department_id','user.gender as gender','TIMESTAMPDIFF(YEAR, user.dob, CURDATE()) AS age','user.is_camp_eligible as is_camp_eligible','user.timezone as timezone'];
                        const joinTableList = [{'alias':'user', 'table' : tableConstant.TBL_USERS, 'on' : '`ent`.`user_id` = `user`.`id`' }];
                        let activityDone = await this.frontPointService.fetch_point_report(tableName, MyPlanCompleteActivityEntity, getFields, { time : 'DESC'}, conditions, joinTableList);
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
        /* mp_complete_activity */
    /* My Plans*/
    /* User Login */
        async getUserLogin(type:any = 'main', actId:any = 0, otherDatas:any = []){
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
                var tableName = tableConstant.TBL_USERS_LOGIN;
                if(getDataType == 'single'){
                    if (type == 'main') {
                        let where = `status = 1 AND DATE_FORMAT(\`login_time\`,"%Y-%m-%d %H:%i:%s")  BETWEEN '${allDateArray['actStartDateM']}' AND '${allDateArray['actEndDateM']}'`;
                        let activityDone = await this.frontPointService.fetch_point(tableName, UserLoginEntity, { id : 'ASC'}, ['login_time'], 'user_id', 'user_id', user_id, user_id, where);
                        let mptData = activityDone;
                        let tmppointsM = await this.frontPointService.count_point_act(JSON.parse(JSON.stringify(activityDone)), actId, 'login_time', allDateArray, extraDataArray);
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
                            date = await this.frontPointService.getActivityCompDate('normal', mptData, 'login_time', dateExtraDataArray);
                        }
                    }
                    let returnArray = [{'tmppoints' : tmppoints}, {'date' : date}, {'activityCompAry' : activityCompAry}, {'rewardCompAry' : rewardCompAry}];
                    return returnArray;
                }else{
                    const {
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
                    let conditions = `${otherCondition} ent.status = 1 AND user.membership_code IN ('${membershipCode}') ${uType_condition} ${wellnesschampion} ${statusCondition} and DATE_FORMAT(CONVERT_TZ(\`ent\`.\`login_time\`,'UTC',CASE WHEN user.timezone != '' THEN user.timezone ELSE 'UTC' END),'%Y-%m-%d %H:%i:%s') BETWEEN '${allDateArray['actStartDate']}' AND '${allDateArray['actEndDate']}'`;
                    let getFields = ['ent.id as id','DATE_FORMAT(CONVERT_TZ(`ent`.`login_time`,"UTC",CASE WHEN user.timezone != "" THEN user.timezone ELSE "UTC" END),"%Y-%m-%d") AS time','user.id as uid','user.role_id as role_id','user.on_insurance_plan as on_insurance_plan','user.location as location','user.department_id as department_id','user.gender as gender','TIMESTAMPDIFF(YEAR, user.dob, CURDATE()) AS age','user.is_camp_eligible as is_camp_eligible','user.timezone as timezone'];
                    const joinTableList = [{'alias':'user', 'table' : tableConstant.TBL_USERS, 'on' : '`ent`.`user_id` = `user`.`id`' }];
                    let activityDone = await this.frontPointService.fetch_point_report(tableName, UserLoginEntity, getFields, { time : 'ASC'}, conditions, joinTableList);
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
    /* User Login */
    /* App Download */
        async getAppDownload(type:any = 'main', actId:any = 0, otherDatas:any = []){
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
                var tableName = tableConstant.TBL_USERS_LOGIN;
                if(getDataType == 'single'){
                    if (type == 'main') {
                        let where = `status = 1 AND DATE_FORMAT(\`login_time\`,"%Y-%m-%d %H:%i:%s") BETWEEN '${allDateArray['actStartDateM']}' AND '${allDateArray['actEndDateM']}' AND source in (1,2) `;
                        let activityDone = await this.frontPointService.fetch_point(tableName, UserLoginEntity, { id : 'ASC'}, ['login_time'], 'user_id', 'user_id', user_id, user_id, where, 1);
                        let mptData = activityDone;
                        let tmppointsM = await this.frontPointService.count_point_act(JSON.parse(JSON.stringify(activityDone)), actId, 'login_time', allDateArray, extraDataArray);
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
                            date = await this.frontPointService.getActivityCompDate('normal', mptData, 'login_time', dateExtraDataArray);
                        }
                    }
                    let returnArray = [{'tmppoints' : tmppoints}, {'date' : date}, {'activityCompAry' : activityCompAry}, {'rewardCompAry' : rewardCompAry}];
                    return returnArray;
                }else{
                    const {
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
                    let conditions = `${otherCondition} ent.status = 1 AND user.membership_code IN ('${membershipCode}') ${uType_condition} ${wellnesschampion} ${statusCondition} AND ent.source in (1,2) AND DATE_FORMAT(CONVERT_TZ(\`ent\`.\`login_time\`,'UTC',CASE WHEN user.timezone != '' THEN user.timezone ELSE 'UTC' END),'%Y-%m-%d %H:%i:%s') BETWEEN '${allDateArray['actStartDate']}' AND '${allDateArray['actEndDate']}'`;
                    let getFields = ['ent.id as id','DATE_FORMAT(CONVERT_TZ(`ent`.`login_time`,"UTC",CASE WHEN user.timezone != "" THEN user.timezone ELSE "UTC" END),"%Y-%m-%d") AS time','user.id as uid','user.role_id as role_id','user.on_insurance_plan as on_insurance_plan','user.location as location','user.department_id as department_id','user.gender as gender','TIMESTAMPDIFF(YEAR, user.dob, CURDATE()) AS age','user.is_camp_eligible as is_camp_eligible','user.timezone as timezone'];
                    const joinTableList = [{'alias':'user', 'table' : tableConstant.TBL_USERS, 'on' : '`ent`.`user_id` = `user`.`id`' }];
                    let activityDone = await this.frontPointService.fetch_point_report(tableName, UserLoginEntity, getFields, { time : 'ASC'}, conditions, joinTableList);
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
    /* App Download */
    /* COVID ACTIVITY */
        async getCovidActivity(type:any = 'main', actId:any = 0, otherDatas:any = []){
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
                var tableName = tableConstant.COVID.COVID_USER_ANSWERS;
                if(getDataType == 'single'){
                    if (type == 'main') {
                        let where = `status = 1 AND DATE_FORMAT(\`created\`,"%Y-%m-%d %H:%i:%s")  BETWEEN '${allDateArray['actStartDateM']}' AND '${allDateArray['actEndDateM']}'`;
                        let activityDone = await this.frontPointService.fetch_point(tableName, CovidUserAnswersEntity, { id : 'ASC'}, ['created'], 'user_id', 'user_id', user_id, user_id, where);
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
                    }
                    let returnArray = [{'tmppoints' : tmppoints}, {'date' : date}, {'activityCompAry' : activityCompAry}, {'rewardCompAry' : rewardCompAry}];
                    return returnArray;
                }else{
                    const {
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
                    let conditions = `${otherCondition} ent.status = 1 AND user.membership_code IN ('${membershipCode}') ${uType_condition} ${wellnesschampion} ${statusCondition} and DATE_FORMAT(CONVERT_TZ(\`ent\`.\`created\`,'UTC',CASE WHEN user.timezone != '' THEN user.timezone ELSE 'UTC' END),'%Y-%m-%d') BETWEEN '${allDateArray['actStartDate']}' AND '${allDateArray['actEndDate']}'`;
                    let getFields = ['ent.id as id','DATE_FORMAT(CONVERT_TZ(`ent`.`created`,"UTC",CASE WHEN user.timezone != "" THEN user.timezone ELSE "UTC" END),"%Y-%m-%d") AS time','user.id as uid','user.role_id as role_id','user.on_insurance_plan as on_insurance_plan','user.location as location','user.department_id as department_id','user.gender as gender','TIMESTAMPDIFF(YEAR, user.dob, CURDATE()) AS age','user.is_camp_eligible as is_camp_eligible','user.timezone as timezone'];
                    const joinTableList = [{'alias':'user', 'table' : tableConstant.TBL_USERS, 'on' : '`ent`.`user_id` = `user`.`id`' }];
                    let activityDone = await this.frontPointService.fetch_point_report(tableName, CovidUserAnswersEntity, getFields, { time : 'DESC'}, conditions, joinTableList);
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
    /* COVID ACTIVITY */
    /*  Fitnes Video */
        /* me_fod_video_click*/
            async getFitnessVideo(type:any = 'main', actId:any = 0, otherDatas:any = []){
                try{
                    let {
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
                    var tableName = tableConstant.MEDIA_FITNESS.TBL_ME_FOD_VIDEO_CLICK;
                    if(getDataType == 'single'){
                        if (type == 'main') {
                            userTimezone = (userTimezone == '') ? 'UTC' : userTimezone;
                            let where = `status = 1 AND DATE_FORMAT(CONVERT_TZ(\`created\`,'UTC','${userTimezone}'),'%Y-%m-%d %H:%i:%s') BETWEEN '${allDateArray['actStartDateM']}' AND '${allDateArray['actEndDateM']}'`;
                            if (actId == 4887 && actDatas['video'] != 0) {
                                let VideoId = actDatas['video'];
                                where += ` AND v_id = ${VideoId}`;
                            }
                            let activityDone = await this.frontPointService.fetch_point(tableName, MediaFitnessVideoClickEntity, { id : 'ASC'}, ['created'], 'user_id', 'activity_id', actId, user_id, where);
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
                        }
                        let returnArray = [{'tmppoints' : tmppoints}, {'date' : date}, {'activityCompAry' : activityCompAry}, {'rewardCompAry' : rewardCompAry}];
                        return returnArray;
                    }else{
                        const {
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
                        let dateformate = "DATE_FORMAT(CONVERT_TZ(`ent`.`created`,'UTC',CASE WHEN `user`.`timezone` != '' THEN `user`.`timezone` ELSE 'UTC' END),'%Y-%m-%d %H:%i:%s')";
                        let videoIdCondition = '';
                        if (actId == 4887 && actDatas['video'] != 0) {
                            let VideoId = actDatas['video'];
                            videoIdCondition = ` AND ent.v_id = ${VideoId}`;
                        }
                        let conditions = `${otherCondition} ent.status = 1 AND ent.activity_id IN (${actId}) ${videoIdCondition} AND user.membership_code IN ('${membershipCode}') ${uType_condition} ${wellnesschampion} ${statusCondition} and ${dateformate} BETWEEN '${allDateArray['actStartDate']}' AND '${allDateArray['actEndDate']}'`;
                        let getFields = ['ent.id as id','ent.activity_id as activity_id',`${dateformate} AS time`,'user.id as uid','user.role_id as role_id','user.on_insurance_plan as on_insurance_plan','user.location as location','user.department_id as department_id','user.gender as gender','TIMESTAMPDIFF(YEAR, user.dob, CURDATE()) AS age','user.is_camp_eligible as is_camp_eligible','user.timezone as timezone'];
                        const joinTableList = [{'alias':'user', 'table' : tableConstant.TBL_USERS, 'on' : '`ent`.`user_id` = `user`.`id`' }];
                        let activityDone = await this.frontPointService.fetch_point_report(tableName, MediaFitnessVideoClickEntity, getFields, { time : 'ASC'}, conditions, joinTableList);
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
        /* me_fod_video_click*/
    /* Fitnes Video */
    /*  Emotional wellbeing */
        /* em_post_click*/
            async getEmotionalwellbeing(type:any = 'main', actId:any = 0, otherDatas:any = []){
                try{
                    let {
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
                    var tableName = tableConstant.EMOTIONAL_WELLBEING.TBL_EM_POST_CLICK;
                    if(getDataType == 'single'){
                        if (type == 'main') {
                            userTimezone = (userTimezone == '') ? 'UTC' : userTimezone;
                            let where = `status = 1 AND DATE_FORMAT(CONVERT_TZ(\`created_date\`,'UTC','${userTimezone}'),'%Y-%m-%d %H:%i:%s') BETWEEN '${allDateArray['actStartDateM']}' AND '${allDateArray['actEndDateM']}'`;
                            if (actId == 5905 && actDatas['video'] != 0) {
                                let VideoId = actDatas['video'];
                                where += ` AND post_id = ${VideoId}`;
                            }
                            let activityDone = await this.frontPointService.fetch_point(tableName, EmotionalWellBeingPostClickEntity, { id : 'ASC'}, ['created_date'], 'user_id', 'activity_id', actId, user_id, where);
                            let mptData = activityDone;
                            let tmppointsM = await this.frontPointService.count_point_act(JSON.parse(JSON.stringify(activityDone)), actId, 'created_date', allDateArray, extraDataArray);
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
                                date = await this.frontPointService.getActivityCompDate('normal', mptData, 'created_date', dateExtraDataArray);
                            }
                        }
                        let returnArray = [{'tmppoints' : tmppoints}, {'date' : date}, {'activityCompAry' : activityCompAry}, {'rewardCompAry' : rewardCompAry}];
                        return returnArray;
                    }else{
                        const {
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
                        let dateformate = "DATE_FORMAT(CONVERT_TZ(`ent`.`created_date`,'UTC',CASE WHEN `user`.`timezone` != '' THEN `user`.`timezone` ELSE 'UTC' END),'%Y-%m-%d %H:%i:%s')";
                        let PostIdCondition = '';
                        if (actId == 5905 && actDatas['video'] != 0) {
                            let VideoId = actDatas['video'];
                            PostIdCondition = ` AND ent.post_id = ${VideoId}`;
                        }
                        let conditions = `${otherCondition} ent.status = 1 AND ent.activity_id IN (${actId}) ${PostIdCondition} AND user.membership_code IN ('${membershipCode}') ${uType_condition} ${wellnesschampion} ${statusCondition} AND ${dateformate} BETWEEN '${allDateArray['actStartDate']}' AND '${allDateArray['actEndDate']}'`;
                        let getFields = ['ent.id as id','ent.activity_id as activity_id',`${dateformate} AS time`,'user.id as uid','user.role_id as role_id','user.on_insurance_plan as on_insurance_plan','user.location as location','user.department_id as department_id','user.gender as gender','TIMESTAMPDIFF(YEAR, user.dob, CURDATE()) AS age','user.is_camp_eligible as is_camp_eligible','user.timezone as timezone'];
                        const joinTableList = [{'alias':'user', 'table' : tableConstant.TBL_USERS, 'on' : '`ent`.`user_id` = `user`.`id`' }];
                        let activityDone = await this.frontPointService.fetch_point_report(tableName, EmotionalWellBeingPostClickEntity, getFields, { time : 'ASC'}, conditions, joinTableList);
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
        /* me_fod_video_click*/
    /* Emotional wellbeing */
    /*  Quicklink */
        /* u_quicklink_clicks */
            async getQuickLink(type:any = 'main', actId:any = 0, otherDatas:any = []){
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
                    var tableName = tableConstant.QUICK_LINK.TBL_QUICK_LINK_CLICKS;
                    if(getDataType == 'single'){
                        if (type == 'main') {
                            let where = `status = 1 AND DATE_FORMAT(\`created_date\`,"%Y-%m-%d %H:%i:%s")  BETWEEN '${allDateArray['actStartDateM']}' AND '${allDateArray['actEndDateM']}'`;
                            let activityDone = await this.frontPointService.fetch_point(tableName, QuickLinkClicksEntity, { id : 'ASC'}, ['created_date'], 'user_id', 'activity_id', actId, user_id, where);
                            let mptData = activityDone;
                            let tmppointsM = await this.frontPointService.count_point_act(JSON.parse(JSON.stringify(activityDone)), actId, 'created_date', allDateArray, extraDataArray);
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
                                date = await this.frontPointService.getActivityCompDate('normal', mptData, 'created_date', dateExtraDataArray);
                            }
                        }
                        let returnArray = [{'tmppoints' : tmppoints}, {'date' : date}, {'activityCompAry' : activityCompAry}, {'rewardCompAry' : rewardCompAry}];
                        return returnArray;
                    }else{
                        const {
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
                        let conditions = `${otherCondition} ent.status = 1 AND ent.activity_id IN (${actId}) AND user.membership_code IN ('${membershipCode}') ${uType_condition} ${wellnesschampion} ${statusCondition} and DATE_FORMAT(CONVERT_TZ(\`ent\`.\`created_date\`,'UTC',CASE WHEN user.timezone != '' THEN user.timezone ELSE 'UTC' END),'%Y-%m-%d %H:%i:%s') BETWEEN '${allDateArray['actStartDate']}' AND '${allDateArray['actEndDate']}'`;
                        let getFields = ['ent.id as id','ent.activity_id as activity_id','DATE_FORMAT(CONVERT_TZ(`ent`.`created_date`,"UTC",CASE WHEN user.timezone != "" THEN user.timezone ELSE "UTC" END),"%Y-%m-%d") AS time','user.id as uid','user.role_id as role_id','user.on_insurance_plan as on_insurance_plan','user.location as location','user.department_id as department_id','user.gender as gender','TIMESTAMPDIFF(YEAR, user.dob, CURDATE()) AS age','user.is_camp_eligible as is_camp_eligible','user.timezone as timezone'];
                        const joinTableList = [{'alias':'user', 'table' : tableConstant.TBL_USERS, 'on' : '`ent`.`user_id` = `user`.`id`' }];
                        let activityDone = await this.frontPointService.fetch_point_report(tableName, QuickLinkClicksEntity, getFields, { time : 'DESC'}, conditions, joinTableList);
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
        /* u_quicklink_clicks */
    /* Quicklink */
    /*  Event complete plans */
        /* ev_userbookinglists */
            async getEvent(type:any = 'main', actId:any = 0, otherDatas:any = []){
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
                    let tmppoints:any = 0;
                    let date = '';
                    let activityCompAry = {};
                    let rewardCompAry = {};
                    var tableName = tableConstant.EVENTS.TBL_EV_USER_BOOKING_LISTS;
                    if(getDataType == 'single'){
                        let where = `ev_attend_status = 1 AND status = 1 AND DATE_FORMAT(\`modified\`,"%Y-%m-%d %H:%i:%s")  BETWEEN '${allDateArray['actStartDateM']}' AND '${allDateArray['actEndDateM']}'`;
                        let activityDone = await this.frontPointService.fetch_point(tableName, EventUserBookingListsEntity, { id : 'ASC'}, ['modified'], 'ev_user_id', 'activity_id', actId, user_id, where);
                        let tmppointsM = {};
                        if (type == 'main') {
                            let mptData = activityDone;
                            tmppointsM = await this.frontPointService.count_point_act(JSON.parse(JSON.stringify(activityDone)), actId, 'modified', allDateArray, extraDataArray);
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
                                date = await this.frontPointService.getActivityCompDate('normal', mptData, 'modified', dateExtraDataArray);
                            }
                        }else{
                            tmppoints = await this.frontPointService.count_point_act(JSON.parse(JSON.stringify(activityDone)), actId, 'modified', allDateArray, extraDataArray);
                            tmppoints = await this.commonHealthService.check_max_point(tmppoints, altActPoint);
                        }
                        let returnArray = [{'tmppoints' : tmppoints}, {'date' : date}, {'activityCompAry' : activityCompAry}, {'rewardCompAry' : rewardCompAry}];
                        return returnArray;
                    }else{
                        const {
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
                        let conditions = `${otherCondition} ent.status = 1 AND ent.activity_id IN (${actId}) AND user.membership_code IN ('${membershipCode}') ${uType_condition} ${wellnesschampion} ${statusCondition} AND ent.ev_attend_status='1' AND  DATE_FORMAT(CONVERT_TZ(\`ent\`.\`modified\`,'UTC',CASE WHEN user.timezone != '' THEN user.timezone ELSE 'UTC' END),'%Y-%m-%d %H:%i:%s') BETWEEN '${allDateArray['actStartDate']}' AND '${allDateArray['actEndDate']}'`;
                        let getFields = ['ent.id as id','ent.activity_id as activity_id','DATE_FORMAT(CONVERT_TZ(`ent`.`modified`,"UTC",CASE WHEN user.timezone != "" THEN user.timezone ELSE "UTC" END),"%Y-%m-%d") AS time','user.id as uid','user.role_id as role_id','user.on_insurance_plan as on_insurance_plan','user.location as location','user.department_id as department_id','user.gender as gender','TIMESTAMPDIFF(YEAR, user.dob, CURDATE()) AS age','user.is_camp_eligible as is_camp_eligible','user.timezone as timezone'];
                        const joinTableList = [{'alias':'user', 'table' : tableConstant.TBL_USERS, 'on' : '`ent`.`ev_user_id` = `user`.`id`' }];
                        let activityDone = await this.frontPointService.fetch_point_report(tableName, EventUserBookingListsEntity, getFields, { time : 'DESC'}, conditions, joinTableList);
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
        /* ev_userbookinglists */
    /* Event complete plans */
    /*  Quiz complete plans */
        /* qz_user_details*/
            async getQuizUser(type:any = 'main', actId:any = 0, otherDatas:any = []){
                try{
                    let {
                        user_id = null,
                        actDatas = [],
                        allDateArray = [],
                        userTimezone = '',
                        altActPoint = 0,
                        getDataType = 'single',
                        call_from = '',
                        myHireData = {}
                    } = Object.assign({}, ...otherDatas);
                    let extraDataArray:any = [{'actDatas': actDatas, 'type' : '', 'getDataType' : getDataType, 'userTimezone' : userTimezone, 'tType' : 'NO', 'myHireData': myHireData}];
                    let tmppoints:any = 0;
                    let date = '';
                    let activityCompAry = {};
                    let rewardCompAry = {};
                    let isQuizTimeZone = false;
                    var tableName = tableConstant.QUIZ.TBL_QZ_USER_DETAILS;
                    if(getDataType == 'single'){
                        userTimezone = (userTimezone == '') ? 'UTC' : userTimezone;
                        let whereETimezone = `status = 1 AND completed = 'yes' AND timezone_name != '' AND DATE_FORMAT(CONVERT_TZ(\`created_date\`,'UTC',timezone_name),'%Y-%m-%d %H:%i:%s') BETWEEN '${allDateArray['actStartDateM']}' AND '${allDateArray['actEndDateM']}'`;
                        let activityDoneETimezone = await this.frontPointService.fetch_point(tableName, UserDetailsEntity, { id : 'ASC'}, ['id','CONVERT_TZ(created_date, "UTC", timezone_name) as created_date'], 'user_id', 'activity_id', actId, user_id, whereETimezone);
                        let whereUTimezone = `status = 1 AND completed = 'yes' AND (timezone_name IS NULL OR timezone_name = '') AND DATE_FORMAT(CONVERT_TZ(\`created_date\`,'UTC','${userTimezone}'),'%Y-%m-%d %H:%i:%s') BETWEEN '${allDateArray['actStartDateM']}' AND '${allDateArray['actEndDateM']}'`;
                        let activityDoneUTimezone = await this.frontPointService.fetch_point(tableName, UserDetailsEntity, { id : 'ASC'}, ['id',`CONVERT_TZ(created_date, "UTC", '${userTimezone}') as created_date`], 'user_id', 'activity_id', actId, user_id, whereUTimezone);
                        if (type == 'main') {
                            let activityDone = activityDoneETimezone.concat(activityDoneUTimezone);
                            if(activityDone && Object.keys(activityDone)?.length > 0){
                                activityDone = await this.sortingService.sortCampaignData('asc', Object.values(activityDone), 'id');
                            }
                            let mptData = activityDone;
                            let tmppointsM = await this.frontPointService.count_point_act(JSON.parse(JSON.stringify(activityDone)), actId, 'created_date', allDateArray, extraDataArray);
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
                                date = await this.frontPointService.getActivityCompDate('normal', mptData, 'created_date', dateExtraDataArray);
                                if (date != '') {
                                    isQuizTimeZone = true;
                                }
                            }
                        }else{
                            let activityDone = activityDoneETimezone.concat(activityDoneUTimezone);
                            if(activityDone && Object.keys(activityDone)?.length > 0){
                                activityDone = await this.sortingService.sortCampaignData('asc', Object.values(activityDone), 'id');
                            }
                            extraDataArray['tType'] = 'YES';
                            tmppoints = await this.frontPointService.count_point_act(JSON.parse(JSON.stringify(activityDone)), actId, 'created_date', allDateArray, extraDataArray);
                            tmppoints = await this.commonHealthService.check_max_point(tmppoints, altActPoint);
                        }
                        let returnArray = [{'tmppoints' : tmppoints}, {'date' : date}, {'activityCompAry' : activityCompAry}, {'rewardCompAry' : rewardCompAry}, { 'isQuizTimeZone' : isQuizTimeZone }];
                        return returnArray;
                    }else{
                        const {
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
                        let conditions = `${otherCondition} ent.status = 1 AND  ent.activity_id IN (${actId}) AND user.membership_code IN ('${membershipCode}') ${uType_condition} ${wellnesschampion} ${statusCondition} AND ent.completed = 'yes' AND  DATE_FORMAT(CONVERT_TZ(\`ent\`.\`created_date\`,'UTC',CASE WHEN ent.timezone_name != '' THEN ent.timezone_name WHEN user.timezone != '' THEN user.timezone ELSE 'UTC' END),'%Y-%m-%d %H:%i:%s') BETWEEN '${allDateArray['actStartDate']}' AND '${allDateArray['actEndDate']}'`;
                        let getFields = ['ent.id as id','ent.activity_id as activity_id','DATE_FORMAT(CONVERT_TZ(`ent`.`created_date`,"UTC",CASE WHEN ent.timezone_name != "" THEN ent.timezone_name WHEN user.timezone != "" THEN user.timezone ELSE "UTC" END),"%Y-%m-%d") AS time','user.id as uid','user.role_id as role_id','user.on_insurance_plan as on_insurance_plan','user.location as location','user.department_id as department_id','user.gender as gender','TIMESTAMPDIFF(YEAR, user.dob, CURDATE()) AS age','user.is_camp_eligible as is_camp_eligible','user.timezone as timezone'];
                        const joinTableList = [{'alias':'user', 'table' : tableConstant.TBL_USERS, 'on' : '`ent`.`user_id` = `user`.`id`' }];
                        let activityDone = await this.frontPointService.fetch_point_report(tableName, UserDetailsEntity, getFields, { time : 'DESC'}, conditions, joinTableList);
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
        /* qz_user_details*/
    /* Quiz complete plans */
    /* Trackers */
        /* ft_activity_feeds */
            async getFTActivityFeeds(type:any = 'main', actId:any = 0, otherDatas:any = []){
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
                    let extraDataArray:any = [{'actDatas': actDatas, 'type' : '', 'getDataType' : getDataType, 'userTimezone' : userTimezone, 'tType' : 'NO', 'myHireData': myHireData}];
                    let tmppoints = 0;
                    let date = '';
                    let activityCompAry = {};
                    let rewardCompAry = {};
                    var tableName = tableConstant.TRACKERS.TBL_FT_ACTIVITY_FEEDS;
                    if(getDataType == 'single'){
                        if (type == 'main') {
                            let activityDone = [];
                            if (actId == 11) {
                                if(actDatas['source_type'] == 0){
                                    let where = `status = 1 AND DATE_FORMAT(\`collectionDate\`,"%Y-%m-%d")  BETWEEN '${moment(allDateArray['actStartDateM']).format('YYYY-MM-DD')}' AND '${moment(allDateArray['actEndDateM']).format('YYYY-MM-DD')}'`;
                                    let activityDone1 = await this.frontPointService.fetch_point(tableName, ActivityFeedsEntity, { collectionDate : 'ASC'}, ['acId','logType','steps','collectionDate','timestamp'], 'user_id', 'activityTypeId', actId, user_id, where);
                                    let activityDone2 = await this.frontPointService.fetch_point(tableName, ActivityFeedsEntity, { collectionDate : 'ASC'}, ['acId','logType','steps','collectionDate','timestamp'], 'user_id', 'activityTypeId', 15, user_id, where);
                                    activityDone = activityDone1.concat(activityDone2);
                                    if(activityDone && Object.keys(activityDone)?.length > 0){
                                        activityDone = await this.sortingService.sortCampaignData('asc', Object.values(activityDone), 'collectionDate');
                                    }
                                }else if(actDatas['source_type'] == 1){
                                    let where = `status = 1 AND DATE_FORMAT(\`collectionDate\`,"%Y-%m-%d")  BETWEEN '${moment(allDateArray['actStartDateM']).format('YYYY-MM-DD')}' AND '${moment(allDateArray['actEndDateM']).format('YYYY-MM-DD')}'`;
                                    activityDone = await this.frontPointService.fetch_point(tableName, ActivityFeedsEntity, { collectionDate : 'ASC'}, ['acId','logType','steps','collectionDate','timestamp'], 'user_id', 'logType', '"Manual"', user_id, where);
                                }else if(actDatas['source_type'] == 2){
                                    let where = `status = 1 AND DATE_FORMAT(\`collectionDate\`,"%Y-%m-%d")  BETWEEN '${moment(allDateArray['actStartDateM']).format('YYYY-MM-DD')}' AND '${moment(allDateArray['actEndDateM']).format('YYYY-MM-DD')}'`;
                                    activityDone = await this.frontPointService.fetch_point(tableName, ActivityFeedsEntity, { collectionDate : 'ASC'}, ['acId','logType','steps','collectionDate','timestamp'], 'user_id', 'logType', '"Tracker"', user_id, where);
                                }else if(actDatas['source_type'] == 3){
                                    let where = `status = 1 AND DATE_FORMAT(\`collectionDate\`,"%Y-%m-%d")  BETWEEN '${moment(allDateArray['actStartDateM']).format('YYYY-MM-DD')}' AND '${moment(allDateArray['actEndDateM']).format('YYYY-MM-DD')}'`;
                                    activityDone = await this.frontPointService.fetch_point(tableName, ActivityFeedsEntity, { collectionDate : 'ASC'}, ['acId','logType','steps','DATE_FORMAT(\`collectionDate\`,"%Y-%m-%d") as collectionDate', 'timestamp'], 'user_id', 'user_id', user_id, user_id, where);
                                }
                                
                                let mptData = activityDone;
                                if (actDatas['count_type'] != 1) {
                                    let inExtraDataArray = [{ 'compDateFields': 'timestamp' , 'joinType': ''}];
                                    extraDataArray = extraDataArray.map((item, index) => ({
                                        ...item,
                                        ...(inExtraDataArray[index] || {})
                                    }));
                                    let tmppointsM:any = await this.frontPointService.count_point_act_stepsother(JSON.parse(JSON.stringify(activityDone)), actId, 'collectionDate', allDateArray, extraDataArray);
                                    let tempointMObject = tmppointsM.find(item => item.hasOwnProperty('M'));
                                    let tempointMData = tempointMObject ? tempointMObject.M : {};
                                    if(tempointMData && Object.keys(tempointMData)?.length > 0){
                                        const momentDates = Object.keys(tempointMData).map(date =>
                                            moment(date, 'DD-MM-YYYY')
                                        );
                                        const maxDate = moment.max(momentDates);
                                        date = maxDate.format('YYYY-MM-DD');
                                    }
                                    let tmppointsA = await this.frontService.calculate_frequency('normal', tmppointsM, extraDataArray);
                                    if (Array.isArray(tmppointsA)) {
                                        const tempPointObject = tmppointsA.find(item => item.hasOwnProperty('tempPoint'));
                                        const activityCompAryObject = tmppointsA.find(item => item.hasOwnProperty('compDateArray'));
                                        const rewardCompAryObject = tmppointsA.find(item => item.hasOwnProperty('rewardCompAry'));
                                        tmppoints = tempPointObject ? tempPointObject.tempPoint : 0;
                                        activityCompAry = activityCompAryObject ? activityCompAryObject.compDateArray : {};
                                        rewardCompAry = rewardCompAryObject ? rewardCompAryObject.rewardCompAry : {};
                                    }
                                }else{
                                    let tmppointsAr = await this.frontPointService.count_point_act_stepsother_avg(JSON.parse(JSON.stringify(activityDone)), actId, 'collectionDate', allDateArray, extraDataArray);
                                    if (Array.isArray(tmppointsAr)) {
                                        let tmppointsObjects = tmppointsAr.find(item => item.hasOwnProperty('tempPoint'));
                                        tmppoints = tmppointsObjects ? tmppointsObjects.tempPoint : 0;
                                    }
                                    if (tmppoints > 0 && Array.isArray(tmppointsAr)) {
                                        if (tmppoints > 0) {
                                            const merged = Object.assign({}, ...tmppointsAr);
                                            if (merged.date && merged.date !== '' && actDatas['frequincy'] !== 'D' && actDatas['frequincy'] !== 'U' ) {
                                                date = await this.commonDateService.DateTimeFormat(merged.date,'YYYY-MM-DD', 'DD-MM-YYYY') + ' 00:00:00';
                                            }else if(actDatas['frequincy'] == 'W' || actDatas['frequincy'] == 'M' || actDatas['frequincy'] == 'Y' ){
                                                let dateExtraDataArray = [{ 'actDatas' : actDatas } ,{ 'compDateFields' : '' } , { 'joinType' : '' }];
                                                date = await this.frontPointService.getActivityCompDate('normal', mptData, 'collectionDate', dateExtraDataArray);
                                            }
                                        }
                                    }
                                    let inExtraDataArray = [{ 'compDateFields': 'timestamp' , 'joinType': ''}];
                                    extraDataArray = extraDataArray.map((item, index) => ({
                                        ...item,
                                        ...(inExtraDataArray[index] || {})
                                    }));
                                    let tmppointsM = await this.frontPointService.count_point_act_stepsother(JSON.parse(JSON.stringify(activityDone)), actId, 'collectionDate', allDateArray, extraDataArray);
                                    let tmppointsA = await this.frontService.calculate_frequency('normal', tmppointsM, extraDataArray);
                                    if (Array.isArray(tmppointsA)) {
                                        const tempPointObject = tmppointsA.find(item => item.hasOwnProperty('tempPoint'));
                                        const activityCompAryObject = tmppointsA.find(item => item.hasOwnProperty('compDateArray'));
                                        const rewardCompAryObject = tmppointsA.find(item => item.hasOwnProperty('rewardCompAry'));
                                        // tmppoints = tempPointObject ? tempPointObject.tempPoint : 0;
                                        activityCompAry = activityCompAryObject ? activityCompAryObject.compDateArray : {};
                                        rewardCompAry = rewardCompAryObject ? rewardCompAryObject.rewardCompAry : {};
                                    }
                                }
                                tmppoints = await this.frontPointService.multiplay_point(tmppoints, actDatas);
                            }else if (actId == 15) {
                                let where = `status = 1 AND DATE_FORMAT(\`collectionDate\`,"%Y-%m-%d %H:%i:%s")  BETWEEN '${allDateArray['actStartDateM']}' AND '${allDateArray['actEndDateM']}'`;
                                let activityDone1 = await this.frontPointService.fetch_point(tableName, ActivityFeedsEntity, { collectionDate : 'ASC'}, ['acId','logType','steps','collectionDate','timestamp'], 'user_id', 'activityTypeId', actId, user_id, where);
                                let activityDone2 = await this.frontPointService.fetch_point(tableName, ActivityFeedsEntity, { collectionDate : 'ASC'}, ['acId','logType','steps','collectionDate','timestamp'], 'user_id', 'activityTypeId', 11, user_id, where);
                                activityDone = activityDone1.concat(activityDone2);
                                if(activityDone && Object.keys(activityDone)?.length > 0){
                                    activityDone = await this.sortingService.sortCampaignData('asc', Object.values(activityDone), 'collectionDate');
                                }
                                let mptData = activityDone;
                                let inExtraDataArray = [{ 'compDateFields': 'timestamp' , 'joinType': '', 'tType': 'YES'}];
                                extraDataArray = extraDataArray.map((item, index) => ({
                                    ...item,
                                    ...(inExtraDataArray[index] || {})
                                }));
                                let tmppointsM = await this.frontPointService.count_point_act_steps(JSON.parse(JSON.stringify(activityDone)), actId, 'collectionDate', allDateArray, extraDataArray);
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
                                    let dateExtraDataArray = [{ 'actDatas': actDatas} ,{ 'compDateFields': ''} , { 'joinType': '' }];
                                    date = await this.frontPointService.getActivityCompDate('normal', mptData, 'collectionDate', dateExtraDataArray);
                                }
                            }else{
                                let where = `status = 1 AND DATE_FORMAT(\`collectionDate\`,"%Y-%m-%d %H:%i:%s")  BETWEEN '${allDateArray['actStartDateM']}' AND '${allDateArray['actEndDateM']}'`;
                                activityDone = await this.frontPointService.fetch_point(tableName, ActivityFeedsEntity, { collectionDate : 'ASC'}, ['acId','logType','steps','collectionDate','timestamp'], 'user_id', 'activityTypeId', actId, user_id, where);
                                let mptData = activityDone;
                                let inExtraDataArray = [{ 'compDateFields': 'timestamp' , 'joinType': '', 'tType': 'YES'}];
                                extraDataArray = extraDataArray.map((item, index) => ({
                                    ...item,
                                    ...(inExtraDataArray[index] || {})
                                }));
                                let tmppointsM = await this.frontPointService.count_point_act(JSON.parse(JSON.stringify(activityDone)), actId, 'collectionDate', allDateArray, extraDataArray);
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
                                    let dateExtraDataArray = [{ 'actDatas': actDatas} ,{ 'compDateFields': ''} , { 'joinType': '' }];
                                    date = await this.frontPointService.getActivityCompDate('normal', mptData, 'collectionDate', dateExtraDataArray);
                                }
                            }
                        }else{
                            let activityDone = [];
                            var tableName = tableConstant.TRACKERS.TBL_FT_ACTIVITY_FEEDS;
                            if (actId == 11) {
                                let where = `status = 1 AND DATE_FORMAT(\`collectionDate\`,"%Y-%m-%d %H:%i:%s")  BETWEEN '${allDateArray['actStartDateM']}' AND '${allDateArray['actEndDateM']}'`;
                                let activityDone1 = await this.frontPointService.fetch_point(tableName, ActivityFeedsEntity, { id : 'ASC'}, ['acId','logType','steps','collectionDate','timestamp'], 'user_id', 'activityTypeId', actId, user_id, where);
                                let activityDone2 = await this.frontPointService.fetch_point(tableName, ActivityFeedsEntity, { id : 'ASC'}, ['acId','logType','steps','collectionDate','timestamp'], 'user_id', 'activityTypeId', 15, user_id, where);
                                activityDone = activityDone1.concat(activityDone2);
                                if(activityDone && Object.keys(activityDone)?.length > 0){
                                    activityDone = await this.sortingService.sortCampaignData('asc', Object.values(activityDone), 'collectionDate');
                                }
                                tmppoints = await this.frontPointService.count_point(activityDone, 'collectionDate', allDateArray['actStartDate'], allDateArray['actEndDate']);
                                tmppoints = await this.commonHealthService.check_max_point(tmppoints, altActPoint);
                            }else if (actId == 15) {
                                let where = `status = 1 AND DATE_FORMAT(\`collectionDate\`,"%Y-%m-%d %H:%i:%s")  BETWEEN '${allDateArray['actStartDateM']}' AND '${allDateArray['actEndDateM']}'`;
                                let activityDone1 = await this.frontPointService.fetch_point(tableName, ActivityFeedsEntity, { collectionDate : 'ASC'}, ['acId','logType','steps','collectionDate','timestamp'], 'user_id', 'activityTypeId', actId, user_id, where);
                                let activityDone2 = await this.frontPointService.fetch_point(tableName, ActivityFeedsEntity, { collectionDate : 'ASC'}, ['acId','logType','steps','collectionDate','timestamp'], 'user_id', 'activityTypeId', 11, user_id, where);
                                activityDone = activityDone1.concat(activityDone2);
                                if(activityDone && Object.keys(activityDone)?.length > 0){
                                    activityDone = await this.sortingService.sortCampaignData('asc', Object.values(activityDone), 'collectionDate');
                                }
                                tmppoints = await this.frontPointService.count_point(activityDone, 'collectionDate', allDateArray['actStartDate'], allDateArray['actEndDate']);
                                tmppoints = await this.commonHealthService.check_max_point(tmppoints, altActPoint);
                            }else{
                                let where = `status = 1 AND DATE_FORMAT(\`collectionDate\`,"%Y-%m-%d %H:%i:%s")  BETWEEN '${allDateArray['actStartDateM']}' AND '${allDateArray['actEndDateM']}'`;
                                activityDone = await this.frontPointService.fetch_point(tableName, ActivityFeedsEntity, { collectionDate : 'ASC'}, ['acId','logType','steps','collectionDate','timestamp'], 'user_id', 'activityTypeId', actId, user_id, where);
                                tmppoints = await this.frontPointService.count_point(activityDone, 'collectionDate', allDateArray['actStartDate'], allDateArray['actEndDate']);
                                tmppoints = await this.commonHealthService.check_max_point(tmppoints, altActPoint);
                            }
                        }
                        let returnArray = [{'tmppoints' : tmppoints}, {'date' : date}, {'activityCompAry' : activityCompAry}, {'rewardCompAry' : rewardCompAry}];
                        return returnArray;
                    }else{
                        const {
                            membershipCode = '',
                            otherCondition = '',
                            uType_condition = '',
                            statusCondition = '',
                            wellnesschampion = '',
                            allCustomPointDatas = {}
                        } = Object.assign({}, ...otherDatas);
                        let extraDataArrayM = [{'allCustomPointDatas' : allCustomPointDatas, 'call_from' : call_from}]
                        extraDataArray = extraDataArray.map((item, index) => ({
                            ...item,
                            ...(extraDataArrayM[index] || {})
                        }));
                        let activityDone = [];
                        let finalActivtyDone = [];
                        if (actId == 11) {
                            if(actDatas['source_type'] == 0){
                                let conditions1 = `${otherCondition} ent.status = 1 AND ent.activityTypeId IN (${actId}) AND user.membership_code IN ('${membershipCode}') ${uType_condition} ${wellnesschampion} ${statusCondition} AND DATE_FORMAT(\`ent\`.\`collectionDate\`,'%Y-%m-%d %H:%i:%s') BETWEEN '${allDateArray['actStartDate']}' AND '${allDateArray['actEndDate']}'`;
                                let getFields1 = ['ent.acId as id','ent.steps as steps','DATE_FORMAT(`ent`.`created_date`,"%Y-%m-%d") AS time','DATE_FORMAT(`ent`.`timestamp`,"%Y-%m-%d %H:%i:%s") AS time2','user.id as uid','user.role_id as role_id','user.on_insurance_plan as on_insurance_plan','user.location as location','user.department_id as department_id', 'user.gender as gender','TIMESTAMPDIFF(YEAR, user.dob, CURDATE()) AS age','user.is_camp_eligible as is_camp_eligible','user.timezone as timezone'];
                                const joinTableList1 = [{'alias':'user', 'table' : tableConstant.TBL_USERS, 'on' : '`ent`.`user_id` = `user`.`id`' }];
                                let activityDone1 = await this.frontPointService.fetch_point_report(tableName, ActivityFeedsEntity, getFields1, { time : 'ASC'}, conditions1, joinTableList1);
                                let conditions2 = `${otherCondition} ent.status = 1 AND ent.activityTypeId IN (15) AND user.membership_code IN ('${membershipCode}') ${uType_condition} ${wellnesschampion} ${statusCondition} AND  DATE_FORMAT(\`ent\`.\`collectionDate\`,'%Y-%m-%d %H:%i:%s') BETWEEN '${allDateArray['actStartDate']}' AND '${allDateArray['actEndDate']}'`;
                                let getFields2 = ['ent.acId as id','ent.steps as steps','DATE_FORMAT(\`ent\`.\`created_date\`,"%Y-%m-%d") AS time','DATE_FORMAT(\`ent\`.\`timestamp\`,"%Y-%m-%d %H:%i:%s") AS time2','user.id as uid','user.role_id as role_id','user.on_insurance_plan as on_insurance_plan','user.location as location','user.department_id as department_id','user.gender as gender','TIMESTAMPDIFF(YEAR, user.dob, CURDATE()) AS age','user.is_camp_eligible as is_camp_eligible','user.timezone as timezone'];
                                const joinTableList2 = [{'alias':'user', 'table' : tableConstant.TBL_USERS, 'on' : '`ent`.`user_id` = `user`.`id`' }];
                                let activityDone2 = await this.frontPointService.fetch_point_report(tableName, ActivityFeedsEntity, getFields2, { time : 'ASC'}, conditions2, joinTableList2);
                                activityDone = activityDone1.concat(activityDone2);
                                if(activityDone && Object.keys(activityDone)?.length > 0){
                                    activityDone = await this.sortingService.sortCampaignData('asc_date', activityDone, 'time');
                                }
                            }else if(actDatas['source_type'] == 1){
                                let conditions = `${otherCondition} ent.status = 1 AND ent.logType = 'Manual' AND user.membership_code IN ('${membershipCode}') ${uType_condition} ${wellnesschampion} ${statusCondition} AND  DATE_FORMAT(\`ent\`.\`collectionDate\`,'%Y-%m-%d %H:%i:%s') BETWEEN '${allDateArray['actStartDate']}' AND '${allDateArray['actEndDate']}'`;
                                let getFields = ['ent.acId as id','ent.steps as steps','DATE_FORMAT(`ent`.`collectionDate`,"%Y-%m-%d") AS time','DATE_FORMAT(`ent`.`timestamp`,"%Y-%m-%d %H:%i:%s") AS time2','user.id as uid','user.role_id as role_id','user.on_insurance_plan as on_insurance_plan','user.location as location','user.department_id as department_id','user.gender as gender','TIMESTAMPDIFF(YEAR, user.dob, CURDATE()) AS age','user.is_camp_eligible as is_camp_eligible','user.timezone as timezone'];
                                const joinTableList = [{'alias':'user', 'table' : tableConstant.TBL_USERS, 'on' : '`ent`.`user_id` = `user`.`id`' }];
                                activityDone = await this.frontPointService.fetch_point_report(tableName, ActivityFeedsEntity, getFields, { time : 'ASC'}, conditions, joinTableList);
                            }else if(actDatas['source_type'] == 2){
                                let conditions = `${otherCondition} ent.status = 1 AND ent.logType = 'Tracker' AND user.membership_code IN ('${membershipCode}') ${uType_condition} ${wellnesschampion} ${statusCondition} AND  DATE_FORMAT(\`ent\`.\`collectionDate\`,'%Y-%m-%d %H:%i:%s') BETWEEN '${allDateArray['actStartDate']}' AND '${allDateArray['actEndDate']}'`;
                                let getFields = ['ent.acId as id','ent.steps as steps','DATE_FORMAT(`ent`.`collectionDate`,"%Y-%m-%d") AS time','DATE_FORMAT(`ent`.`timestamp`,"%Y-%m-%d %H:%i:%s") AS time2','user.id as uid','user.role_id as role_id','user.on_insurance_plan as on_insurance_plan','user.location as location','user.department_id as department_id','user.gender as gender','TIMESTAMPDIFF(YEAR, user.dob, CURDATE()) AS age','user.is_camp_eligible as is_camp_eligible','user.timezone as timezone'];
                                const joinTableList = [{'alias':'user', 'table' : tableConstant.TBL_USERS, 'on' : '`ent`.`user_id` = `user`.`id`' }];
                                activityDone = await this.frontPointService.fetch_point_report(tableName, ActivityFeedsEntity, getFields, { time : 'ASC'}, conditions, joinTableList);
                            }else if(actDatas['source_type'] == 3){
                                let conditions = `${otherCondition} ent.status = 1 AND user.membership_code IN ('${membershipCode}') ${uType_condition} ${wellnesschampion} ${statusCondition} AND DATE_FORMAT(\`ent\`.\`collectionDate\`,'%Y-%m-%d %H:%i:%s') BETWEEN '${allDateArray['actStartDate']}' AND '${allDateArray['actEndDate']}'`;
                                let getFields = ['ent.acId as id','ent.steps as steps','DATE_FORMAT(`ent`.`collectionDate`,"%Y-%m-%d") AS time','DATE_FORMAT(`ent`.`timestamp`,"%Y-%m-%d %H:%i:%s") AS time2','user.id as uid','user.role_id as role_id','user.on_insurance_plan as on_insurance_plan','user.location as location','user.department_id as department_id','user.gender as gender','TIMESTAMPDIFF(YEAR, user.dob, CURDATE()) AS age','user.is_camp_eligible as is_camp_eligible','user.timezone as timezone'];
                                const joinTableList = [{'alias':'user', 'table' : tableConstant.TBL_USERS, 'on' : '`ent`.`user_id` = `user`.`id`' }];
                                activityDone = await this.frontPointService.fetch_point_report(tableName, ActivityFeedsEntity, getFields, { time : 'ASC'}, conditions, joinTableList);
                            }
                            let inExtraDataArray = [{ 'compDateFields': 'time2' , 'joinType': ''}];
                            extraDataArray = extraDataArray.map((item, index) => ({
                                ...item,
                                ...(inExtraDataArray[index] || {})
                            }));
                            if (actDatas['count_type'] != 1) {
                                let tmppointsM = await this.frontPointService.count_point_act_stepsother(JSON.parse(JSON.stringify(activityDone)), actId, 'time', allDateArray, extraDataArray);
                                var tmppointsA = await this.frontService.calculate_frequency('normal', tmppointsM, extraDataArray);
                            }else{
                                var tmppointsF = await this.frontPointService.count_point_act_stepsother_avg(JSON.parse(JSON.stringify(activityDone)), actId, 'time', allDateArray, extraDataArray);
                                extraDataArray[0]['tmppointsF'] = JSON.parse(JSON.stringify(tmppointsF));
                                let tmppointsM = await this.frontPointService.count_point_act_stepsother(JSON.parse(JSON.stringify(activityDone)), actId, 'time', allDateArray, extraDataArray);
                                var tmppointsA = await this.frontService.calculate_frequency('normal', tmppointsM, extraDataArray);
                            }
                            if (activityDone.length > 0) {
                                extraDataArray[0]['GTime'] = 'NO';
                                extraDataArray[0]['tmppointsF'] = (tmppointsF) ? JSON.parse(JSON.stringify(tmppointsF)) : {};
                                let finalActivtyDoneData = await this.frontPointService.multiplay_point_multiuser('normal', JSON.parse(JSON.stringify(activityDone)), tmppointsA, extraDataArray);
                                finalActivtyDone = (finalActivtyDoneData.length > 0 && finalActivtyDoneData[0]['tempUserData']) ? finalActivtyDoneData[0]['tempUserData'] : {};
                            }
                        } else if (actId == 15) {
                            let conditions1 = `${otherCondition} ent.status = 1 AND ent.activityTypeId IN (${actId}) AND user.membership_code IN ('${membershipCode}') ${uType_condition} ${wellnesschampion} ${statusCondition} AND  DATE_FORMAT(CONVERT_TZ(\`ent\`.\`collectionDate\`,'UTC',CASE WHEN user.timezone != '' THEN user.timezone ELSE 'UTC' END),'%Y-%m-%d') BETWEEN '${allDateArray['actStartDate']}' AND '${allDateArray['actEndDate']}'`;
                            let getFields1 = ['ent.acId as id','ent.steps as steps','DATE_FORMAT(CONVERT_TZ(`ent`.`collectionDate`,"UTC",CASE WHEN `user`.`timezone` != "" THEN `user`.`timezone` ELSE "UTC" END),"%Y-%m-%d") as time','DATE_FORMAT(CONVERT_TZ(`ent`.`timestamp`,"UTC",CASE WHEN `user`.`timezone` != "" THEN `user`.`timezone` ELSE "UTC" END),"%Y-%m-%d %H:%i:%s") as time2','user.id as uid','user.role_id as role_id','user.on_insurance_plan as on_insurance_plan','user.location as location','user.department_id as department_id','user.gender as gender','TIMESTAMPDIFF(YEAR, user.dob, CURDATE()) AS age','user.is_camp_eligible as is_camp_eligible','user.timezone as timezone'];
                            const joinTableList1= [{'alias':'user', 'table' : tableConstant.TBL_USERS, 'on' : '`ent`.`user_id` = `user`.`id`' }];
                            let activityDone1 = await this.frontPointService.fetch_point_report(tableName, ActivityFeedsEntity, getFields1, { time : 'ASC'}, conditions1, joinTableList1);
                            let conditions2 = `${otherCondition} ent.status = 1 AND ent.activityTypeId IN (11) AND user.membership_code IN ('${membershipCode}') ${uType_condition} ${wellnesschampion} ${statusCondition} AND DATE_FORMAT(CONVERT_TZ(\`ent\`.\`collectionDate\`,'UTC',CASE WHEN user.timezone != '' THEN user.timezone ELSE 'UTC' END),'%Y-%m-%d') BETWEEN '${allDateArray['actStartDate']}' AND '${allDateArray['actEndDate']}'`;
                            let getFields2 = ['ent.acId as id','ent.steps as steps','DATE_FORMAT(CONVERT_TZ(`ent`.`collectionDate`,"UTC",CASE WHEN `user`.`timezone` != "" THEN `user`.`timezone` ELSE "UTC" END),"%Y-%m-%d") as time','DATE_FORMAT(CONVERT_TZ(`ent`.`timestamp`,"UTC",CASE WHEN `user`.`timezone` != "" THEN `user`.`timezone` ELSE "UTC" END),"%Y-%m-%d %H:%i:%s") as time2','user.id as uid','user.role_id as role_id','user.on_insurance_plan as on_insurance_plan','user.location as location','user.department_id as department_id','user.gender as gender','TIMESTAMPDIFF(YEAR, user.dob, CURDATE()) AS age','user.is_camp_eligible as is_camp_eligible','user.timezone as timezone'];
                            const joinTableList2 = [{'alias':'user', 'table' : tableConstant.TBL_USERS, 'on' : '`ent`.`user_id` = `user`.`id`' }];
                            let activityDone2 = await this.frontPointService.fetch_point_report(tableName, ActivityFeedsEntity, getFields2, { time : 'ASC'}, conditions2, joinTableList2);
                            activityDone = activityDone1.concat(activityDone2);
                            if(activityDone && Object.keys(activityDone)?.length > 0){
                                activityDone = await this.sortingService.sortCampaignData('asc_date', activityDone, 'time');
                            }
                            let inExtraDataArray = [{ 'compDateFields': 'time2' , 'joinType': ''}];
                            extraDataArray = extraDataArray.map((item, index) => ({
                                ...item,
                                ...(inExtraDataArray[index] || {})
                            }));
                            let tmppointsM = await this.frontPointService.count_point_act_steps(JSON.parse(JSON.stringify(activityDone)), actId, 'time', allDateArray, extraDataArray);
                            let tmppointsA = await this.frontService.calculate_frequency('normal', tmppointsM, extraDataArray);
                            if (activityDone.length > 0) {
                                let finalActivtyDoneData = await this.frontPointService.multiplay_point_multiuser('normal', JSON.parse(JSON.stringify(activityDone)), tmppointsA, extraDataArray);
                                finalActivtyDone = (finalActivtyDoneData.length > 0 && finalActivtyDoneData[0]['tempUserData']) ? finalActivtyDoneData[0]['tempUserData'] : {};
                            }
                        } else {
                            let conditions = `${otherCondition} ent.status = 1 AND ent.activityTypeId IN (${actId}) AND user.membership_code IN ('${membershipCode}') ${uType_condition} ${wellnesschampion} ${statusCondition} AND DATE_FORMAT(CONVERT_TZ(\`ent\`.\`collectionDate\`,'UTC',CASE WHEN user.timezone != '' THEN user.timezone ELSE 'UTC' END),'%Y-%m-%d') BETWEEN '${allDateArray['actStartDate']}' AND '${allDateArray['actEndDate']}'`;
                            let getFields = ['ent.acId as id','ent.steps as steps','DATE_FORMAT(CONVERT_TZ(`ent`.`collectionDate`,"UTC",CASE WHEN `user`.`timezone` != "" THEN `user`.`timezone` ELSE "UTC" END),"%Y-%m-%d") as time','DATE_FORMAT(CONVERT_TZ(`ent`.`timestamp`,"UTC",CASE WHEN `user`.`timezone` != "" THEN `user`.`timezone` ELSE "UTC" END),"%Y-%m-%d %H:%i:%s") as time2','user.id as uid','user.role_id as role_id','user.on_insurance_plan as on_insurance_plan','user.location as location','user.department_id as department_id','user.gender as gender','TIMESTAMPDIFF(YEAR, user.dob, CURDATE()) AS age','user.is_camp_eligible as is_camp_eligible','user.timezone as timezone'];
                            const joinTableList = [{'alias':'user', 'table' : tableConstant.TBL_USERS, 'on' : '`ent`.`user_id` = `user`.`id`' }];
                            activityDone = await this.frontPointService.fetch_point_report(tableName, ActivityFeedsEntity, getFields, { time : 'ASC'}, conditions, joinTableList);
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
                        }
                        
                        return [ {'activityDone' : activityDone, 'activityDoneF' : finalActivtyDone} ];
                    }
                }catch (error) {
                    throw new Error(error.message); 
                }
            }
        /* ft_activity_feeds */
        /* ft_foods_feeds */
            async getFTFoodFeeds(type:any = 'main', actId:any = 0, otherDatas:any = []){
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
                    let tmppoints:any = 0;
                    let date = '';
                    let activityCompAry = {};
                    let rewardCompAry = {};
                    var tableName = tableConstant.TRACKERS.TBL_FT_FOOD_FEEDS;
                    if(getDataType == 'single'){
                        let where = `status = 1 AND DATE_FORMAT(\`collectionDate\`,"%Y-%m-%d %H:%i:%s")  BETWEEN '${allDateArray['actStartDateM']}' AND '${allDateArray['actEndDateM']}'`;
                        let activityDone = await this.frontPointService.fetch_point(tableName, FoodFeedsEntity, { collectionDate : 'DESC'}, ['collectionDate','timestamp'], 'user_id', 'activityTypeId', actId, user_id, where);
                        if(actId == 151){
                            activityDone = await this.frontPointService.fetch_point(tableName, FoodFeedsEntity, { collectionDate : 'DESC'}, ['collectionDate','timestamp'], 'user_id', 'activityTypeId', '6,10', user_id, where);
                        }
                        if (type == 'main') {
                            let mptData = activityDone;
                            let inExtraDataArray = [{ 'compDateFields': 'timestamp' , 'joinType': 'join'}];
                            extraDataArray = extraDataArray.map((item, index) => ({
                                ...item,
                                ...(inExtraDataArray[index] || {})
                            }));
                            let tmppointsM:any = await this.frontPointService.count_point_act(JSON.parse(JSON.stringify(activityDone)), actId, 'collectionDate', allDateArray, extraDataArray);
                            if([151,6,10].includes(actId)){
                                const checkM = tmppointsM.find((item) => 'M' in item);
                                let newTmppointsM = await this.frontPointService.count_point_act_number(checkM['M'], extraDataArray);
                                tmppointsM = await Promise.all(
                                    tmppointsM.map(async (item) => {
                                        if (item.hasOwnProperty('M')) {
                                            return { ...item, M: newTmppointsM }; // Update the value of 'M'
                                        }
                                        return item;
                                    })
                                );
                            }
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
                                let dateExtraDataArray = [{ 'actDatas' : actDatas } ,{ 'compDateFields' : 'timestamp' } , { 'joinType' : 'join' }];
                                date = await this.frontPointService.getActivityCompDate('normal', mptData, 'collectionDate', dateExtraDataArray);
                            }
                        }else{
                            tmppoints = await this.frontPointService.count_point(activityDone, 'collectionDate', allDateArray['actStartDate'], allDateArray['actEndDate']);
                            tmppoints = await this.commonHealthService.check_max_point(tmppoints, altActPoint);
                            if([151,6,10].includes(actId)){
                                tmppoints = await this.frontPointService.count_point_act_number(tmppoints, extraDataArray);
                            }
                            tmppoints = await this.commonHealthService.check_max_point(tmppoints, altActPoint);
                        }
                        let returnArray = [{'tmppoints' : tmppoints}, {'date' : date}, {'activityCompAry' : activityCompAry}, {'rewardCompAry' : rewardCompAry}];
                        return returnArray;
                    }else{
                        const {
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
                        let checkActId = actId;
                        if(actId == 151){
                            checkActId = '6,10';
                        }
                        let conditions = `${otherCondition} ent.status = 1 AND ent.activityTypeId IN (${checkActId}) AND user.membership_code IN ('${membershipCode}') ${uType_condition} ${wellnesschampion} ${statusCondition} AND DATE_FORMAT(CONVERT_TZ(CONCAT(DATE_FORMAT(\`ent\`.\`collectionDate\`,"%Y-%m-%d "),DATE_FORMAT(\`ent\`.\`timestamp\`,"%H:%i:%s")),"UTC",CASE WHEN user.timezone != "" THEN user.timezone ELSE "UTC" END),"%Y-%m-%d") BETWEEN '${allDateArray['actStartDate']}' AND '${allDateArray['actEndDate']}'`;
                        let getFields = ['ent.id as id','DATE_FORMAT(CONVERT_TZ(CONCAT(DATE_FORMAT(ent.collectionDate,"%Y-%m-%d "),DATE_FORMAT(ent.timestamp,"%H:%i:%s")),"UTC",CASE WHEN `user`.`timezone` != "" THEN `user`.`timezone` ELSE "UTC" END),"%Y-%m-%d") as time','DATE_FORMAT(CONVERT_TZ(`ent`.`timestamp`,"UTC",CASE WHEN `user`.`timezone` != "" THEN `user`.`timezone` ELSE "UTC" END),"%Y-%m-%d") as time2','user.id as uid','user.role_id as role_id','user.on_insurance_plan as on_insurance_plan','user.location as location','user.department_id as department_id','user.gender as gender','TIMESTAMPDIFF(YEAR, user.dob, CURDATE()) AS age','user.is_camp_eligible as is_camp_eligible','user.timezone as timezone'];
                        const joinTableList = [{'alias':'user', 'table' : tableConstant.TBL_USERS, 'on' : '`ent`.`user_id` = `user`.`id`' }];
                        let activityDone = await this.frontPointService.fetch_point_report(tableName, FoodFeedsEntity, getFields, { time : 'DESC'}, conditions, joinTableList);
                        let inExtraDataArray = [{ 'compDateFields': 'time2' , 'joinType': ''}];
                        extraDataArray = extraDataArray.map((item, index) => ({
                            ...item,
                            ...(inExtraDataArray[index] || {})
                        }));
                        let tmppointsM:any = await this.frontPointService.count_point_act(JSON.parse(JSON.stringify(activityDone)), actId, 'time', allDateArray, extraDataArray);
                        if([151,6,10].includes(actId)){
                            tmppointsM = await this.frontPointService.count_point_act_number(tmppointsM, extraDataArray);
                        }
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
        /* ft_foods_feeds */
    /* Trackers */
}

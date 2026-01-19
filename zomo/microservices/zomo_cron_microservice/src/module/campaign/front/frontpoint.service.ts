import { appConstant, CommonDateService, CustomPointEntity } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as moment from 'moment-timezone';
import { Repository } from 'typeorm';
import { FrontService } from './front.service';
import { diff } from 'util';
@Injectable()
export class FrontPointService {
    constructor(
        @InjectRepository(CustomPointEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaCustomPointRepository: Repository<CustomPointEntity>,
        private readonly commonDateService: CommonDateService,
        private readonly frontService: FrontService,
        
    ) {}

    /* CUSTOM POINT CALCULATION RELATED ALL CODE */
        async getCustomPoints(condition: any, orderBy: any = null, fields: any = ['id', 'user_id', 'user_name', 'point'], joinTale: any = []) {
            try{
                if (!orderBy) {
                    orderBy = { id: 'DESC' };
                }
                let query = this.readReplicaCustomPointRepository.createQueryBuilder('ent')
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
                query = query.where(condition).select(fields)
                .orderBy(`ent.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]]);
                return await query.getRawMany();
            }catch (error) {
                throw new Error(error.message); 
            }
        }
        async groupByUserId(allCustomPointDatas:any = []){
            return allCustomPointDatas.reduce((acc, item) => {
                const userId = item.uid;
                if (!acc[userId]) {
                acc[userId] = [];
                }
                acc[userId].push(item);
                return acc;
            }, {} as Record<number, Array<any>>);
        }
        async CustomPointCalculation(allCustomPointDatas:any = [], calType:any = 'single', otherDatas:any = []){
            try{
                const userCustomPoints = await this.groupByUserId(allCustomPointDatas);
                let points:any = (typeof otherDatas.points === 'string') ? parseFloat(otherDatas.points) : otherDatas.points || 0;
                let csdate:any = otherDatas.csdate || '';
                let max_point:any = (typeof otherDatas.max_point === 'string') ? parseFloat(otherDatas.max_point) : otherDatas.max_point || 0;
                let call_from:any = otherDatas.call_from || null;
                let userComplateArray = {};
                if(Object.keys(userCustomPoints)?.length > 0){
                    for (let [userId, userData] of Object.entries(userCustomPoints)) {
                        if(Object.keys(userData)?.length > 0){
                            if(!userComplateArray[userId]){
                                userComplateArray[userId] = {};
                            }
                            userComplateArray[userId]['id'] = userId;
                            let CustomactivityCompAry:any = {};
                            let CustomrewardCompAry:any = {};
                            for (let [key, customEle] of Object.entries(userData)){
                                if(calType == 'single'){
                                    points += Number(customEle['total']);
                                }else{
                                    userComplateArray[userId]['is_camp_eligible'] = customEle['is_camp_eligible'];
                                    userComplateArray[userId]['Role'] = customEle['role_id'];
                                    userComplateArray[userId]['on_insurance_plan'] = ((customEle['on_insurance_plan'] == 'Yes') ? 1 : 0);
                                    userComplateArray[userId]['location'] = customEle['location'];
                                    userComplateArray[userId]['department'] = customEle['department_id'];
                                    userComplateArray[userId]['gender'] = customEle['gender'];
                                    userComplateArray[userId]['age'] = Number(customEle['age']);
                                    let tmpPoints = Number(customEle['total']);
                                    if (tmpPoints > max_point) {
                                        tmpPoints = max_point;
                                    }
                                    if (!userComplateArray[userId]['Total']) {
                                        userComplateArray[userId]['Total'] = tmpPoints;
                                        if (customEle['time'] == "") {
                                            userComplateArray[userId]['Time'] = customEle['time1'];
                                        } else {
                                            userComplateArray[userId]['Time'] = customEle['time'];
                                        }
                                    } else {
                                        userComplateArray[userId]['Total'] += tmpPoints;
                                        if (customEle['time'] == "") {
                                            userComplateArray[userId]['Time'] = customEle['time1'];
                                        } else {
                                            userComplateArray[userId]['Time'] = customEle['time'];
                                        }
                                    }
                                }
                                if (customEle['time'] === "") {
                                    csdate = customEle['time1'];
                                } else {
                                    csdate = customEle['time'];
                                }
                                let cdateFormat = await this.commonDateService.DateTimeFormat(csdate,'DD-MM-YYYY').toString();
                                if(call_from != 4){
                                    const activityTotal:any = Object.values(CustomactivityCompAry).reduce((sum:any, value:any) => sum + value, 0);
                                    if (activityTotal <= max_point || activityTotal != max_point) {
                                        if (activityTotal > max_point) {
                                            if (CustomactivityCompAry[cdateFormat]) {
                                                CustomactivityCompAry[cdateFormat] += Number(max_point - activityTotal);
                                            } else {
                                                CustomactivityCompAry[cdateFormat] = Number(max_point - activityTotal);
                                            }
                                        } else {
                                            if (CustomactivityCompAry[cdateFormat]) {
                                                CustomactivityCompAry[cdateFormat] += Number(customEle['total']);
                                            } else {
                                                CustomactivityCompAry[cdateFormat] = Number(customEle['total']);
                                            }
                                        }
                                    }
                                    let credate = customEle['time2'];
                                    let credateFormat = await this.commonDateService.DateTimeFormat(credate,'DD-MM-YYYY').toString();
                                    const rewardTotal:any = Object.values(CustomrewardCompAry).reduce((sum:any, value:any) => sum + value, 0);
                                    if (rewardTotal <= max_point || rewardTotal != max_point) {
                                        if (rewardTotal > max_point) {
                                            if (CustomrewardCompAry[credateFormat]) {
                                                CustomrewardCompAry[credateFormat] += Number(max_point - rewardTotal);
                                            } else {
                                                CustomrewardCompAry[credateFormat] = Number(max_point - rewardTotal);
                                            }
                                        } else {
                                            if (CustomrewardCompAry[credateFormat]){
                                                CustomrewardCompAry[credateFormat] += Number(customEle['total']);
                                            } else {
                                                CustomrewardCompAry[credateFormat] = Number(customEle['total']);
                                            }
                                        }
                                    }
                                    userComplateArray[userId]['activityCompAry'] = CustomactivityCompAry;
                                    userComplateArray[userId]['rewardCompAry'] = CustomrewardCompAry;
                                }
                                if(calType == 'single'){
                                    userComplateArray[userId]['points'] = points;
                                    userComplateArray[userId]['csdate'] = csdate;
                                }
                            }
                        }
                    }
                }
                return userComplateArray;
            }catch (error) {
                throw new Error(error.message); 
            }
        }
    /* CUSTOM POINT CALCULATION RELATED ALL CODE */
    async getActivityCompDate(type:any = 'normal', activityDone:any = [], field:any = null, extraDataArray:any = []){
        try{
            let {
                compDateFields = null,
                joinType = null,
                actDatas = null,
                limit_act = 0,
            } = Object.assign({}, ...extraDataArray);
            let frequency = actDatas['frequincy'] || 'D';
            let frequincy_max_point = Number(actDatas['frequincy_max_point']) || 0;
            let point_for_each:number = Number(actDatas['point_for_each']) || 0;
            let marc = Number(actDatas['min_act_req_camp']) || 0;
            let max_point = Number(actDatas['max_point']) || 0;
            const allActivity: any[] = [];
            const actTotalPointArray: Record<string, number> = {};
            const wmyOdate: string[] = [];
            const wmyArray: Record<string, any> = {};
            const wmyDateArray: Record<string, string> = {};
            if(frequency == 'D' || frequency == 'U'){
                for (let actDone of activityDone) {
                    if (joinType == 'join' && (compDateFields != '' && compDateFields != null)) {
                        actDone[field] = await this.commonDateService.DateTimeFormat(actDone[field], 'YYYY-MM-DD')+ ' ' + await this.commonDateService.DateTimeFormat(actDone[compDateFields],'utcTimeFormat','HH:mm:ss')
                    }
                    let date = await this.commonDateService.DateTimeFormat(actDone[field], 'YYYY-MM-DD HH:mm:ss').toString();

                    let pointTMP = point_for_each * 1;
                    if(frequency == 'D'){
                        if (pointTMP > frequincy_max_point) {
                            pointTMP = frequincy_max_point;
                        }
                    }
                    pointTMP = pointTMP > 0 ? pointTMP / point_for_each : 0;
                    const totalPoints = Object.values(actTotalPointArray).reduce((sum, v) => sum + v, 0);
                    if ((totalPoints + (pointTMP * point_for_each)) <= max_point || totalPoints !== max_point) {
                        if (totalPoints > max_point) {
                            if (actTotalPointArray[date] !== undefined) {
                                actTotalPointArray[date] += max_point - totalPoints;
                            } else {
                                actTotalPointArray[date] = max_point - totalPoints;
                            }
                        } else {
                            if (actTotalPointArray[date] !== undefined) {
                                actTotalPointArray[date] += pointTMP * point_for_each;
                            } else {
                                actTotalPointArray[date] = pointTMP * point_for_each;
                            }
                        }
                    }
                }
            }
            if(frequency == 'W' || frequency == 'M' || frequency == 'Y'){
                for (let actDone of activityDone) {
                    if (joinType == 'join' && (compDateFields != '' && compDateFields != null)) {
                        actDone[field] = await this.commonDateService.DateTimeFormat(actDone[field], 'YYYY-MM-DD').toString()+ ' ' + await this.commonDateService.DateTimeFormat(actDone[compDateFields],'utcTimeFormat','HH:mm:ss').toString();
                    }
                    let date = await this.commonDateService.DateTimeFormat(actDone[field], 'YYYY-MM-DD HH:mm:ss').toString();
                    let WMYNo:any = '';
                    WMYNo = await this.commonDateService.getWeekMonthYearNo(actDone[field],frequency);
                    if (wmyArray[`"${WMYNo}"`]) {
                        if (type == 'act_bio' || type == 'act') {
                            let aIDD = (actDone['aas_form_prog'] && actDone['aas_form_prog'] != '') ? actDone['aas_form_prog'].split(',') : [];
                            if (aIDD?.length > 0) {
                                wmyArray[`"${WMYNo}"`] = Array.from(new Set([...wmyArray[`"${WMYNo}"`], ...aIDD]));
                            } else {
                                wmyArray[`"${WMYNo}"`] = 1;
                            }
                            wmyDateArray[`"${WMYNo}"`] = date;
                        } else {
                            wmyArray[`"${WMYNo}"`] += 1;
                            wmyDateArray[`"${WMYNo}"`] = date;
                        }
                    } else {
                        if (type == 'act_bio' || type == 'act') {
                        let aIDD = (actDone['aas_form_prog'] && actDone['aas_form_prog'] != '') ? actDone['aas_form_prog'].split(',') : [];
                            if (aIDD?.length > 0) {
                                wmyArray[`"${WMYNo}"`] = [...new Set(aIDD)];
                            } else {
                                wmyArray[`"${WMYNo}"`] = 1;
                            }
                            wmyDateArray[`"${WMYNo}"`] = date;
                        } else {
                            wmyArray[`"${WMYNo}"`] = 1;
                            wmyDateArray[`"${WMYNo}"`] = date;
                        }
                    }
                }
                for (let weekData of Object.entries(wmyArray)) {
                    let date = weekData[0];
                    let pointTMP = point_for_each * 1;
                    if (pointTMP > frequincy_max_point) {
                        pointTMP = frequincy_max_point;
                    }
                    pointTMP = pointTMP > 0 ? pointTMP / point_for_each : 0;
                    wmyArray[date] = pointTMP;
                    const dateW = wmyDateArray[date];
                   
                    const totalPoints = Object.values(actTotalPointArray).reduce((sum, v) => sum + v, 0);
                    if ((totalPoints + (pointTMP * point_for_each)) <= max_point || totalPoints !== max_point && !wmyOdate.includes(dateW)) {
                        if (totalPoints > max_point) {
                            actTotalPointArray[dateW] = max_point - totalPoints;
                        } else {
                            actTotalPointArray[dateW] = pointTMP * point_for_each;
                        }
                        wmyOdate.push(dateW);
                    }
                }
            }
            let finalDate = '';
            if (Object.keys(actTotalPointArray)?.length > 0) {
                const keys = Object.keys(actTotalPointArray);
                finalDate = keys[keys?.length - 1];
            }
            return finalDate;
        }catch (error) {
            throw new Error(error.message); 
        }
    }
    async fetch_point(table:any = null, entity:any = null, orderBy:any = null, field:any = [], userColumn:any = null, activityColumn:any = null, activityId:any = null, userId:any = null, where:any = "", limit:any = null) {
        try{
            let activityDone:any = [];
            if (table && field && userColumn && activityColumn && activityId && Repository) {
                if (!orderBy) {
                    orderBy = { id: 'DESC' };
                }
                let mainWhere = `${userColumn} IN (${userId})`;
                if(activityId && activityId != '' && activityId != null){
                    mainWhere = `${userColumn} IN (${userId}) AND ${activityColumn} IN (${activityId})`;
                }
                if(where != ''){
                    mainWhere += ` AND ${where}`;
                }
                const repository = await this.frontService.getDynamicRepository(entity);
                let query = repository.createQueryBuilder(table)
                query = query.where(mainWhere).select(field)
                .orderBy(`${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]]);
                if(limit && limit != '' && limit != null){
                    query = query.limit(limit);
                }
                return query.getRawMany();
            } 
            return activityDone;
        }catch (error) {
            throw new Error(error.message); 
        }
    }
    async fetch_point_report(table:any = null, entity:any = null, field:any = [], orderBy:any = null, conditions:any = '', joinTale:any = []){
        try{
            if (!orderBy) {
                orderBy = { id: 'DESC' };
            }
            let activityDone = [];
            if (table && field && Repository) {
                const repository = await this.frontService.getDynamicRepository(entity);
                let query = repository.createQueryBuilder('ent')
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
                query = query.where(conditions).select(field)
                .orderBy(`${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]]);
                return await query.getRawMany();
            }
            return activityDone;
        }catch (error) {
            throw new Error(error.message); 
        }
    }
    async count_comp_act_bio(activityDone:any = [], actId:any = null, field:any = null, allDateArray:any = [], extraDataArray:any = []){
        try{
            let {
                compDateFields = '',
                joinType = null,
                userTimezone = '',
                getDataType = 'single',
                call_from = ''
            } = Object.assign({}, ...extraDataArray);
            if(getDataType == 'single'){
                userTimezone = (userTimezone == '') ? 'UTC' : userTimezone;
                let tmpactivity = [];
                let tmppoints = {};
                let tmpactivityCBD = [];
                let tmppointsCBD = {};
                let actStartDate:any =  await this.commonDateService.DateTimeFormat(allDateArray['actStartDateM'],'YYYY-MM-DD');
                actStartDate = await this.commonDateService.DateTimeFormat(actStartDate,'timestamp');
                let actEndDate:any = await this.commonDateService.DateTimeFormat(allDateArray['actEndDateM'],'YYYY-MM-DD');
                actEndDate = await this.commonDateService.DateTimeFormat(actEndDate,'timestamp');
                for (let actDone of activityDone) {
                    if (![2, 3, 11, 12].includes(actDone['source']) && userTimezone != null && userTimezone != 'UTC') {
                        let tmpdata:any = await this.commonDateService.DateTimeFormat(actDone[field],'','','UTC');
                        tmpdata = await this.commonDateService.DateTimeFormat(tmpdata,'','',userTimezone);
                        actDone[field] = await this.commonDateService.DateTimeFormat(tmpdata,'YYYY-MM-DD');
                    }
                    let logDate = await this.commonDateService.DateTimeFormat(actDone[field],'timestamp');
                    logDate = await this.commonDateService.DateTimeFormat(logDate,'tstodate','YYYY-MM-DD');
                    logDate = await this.commonDateService.DateTimeFormat(logDate,'timestamp');
                    if (actStartDate <= logDate && logDate <= actEndDate) {
                        let date = await this.commonDateService.DateTimeFormat(logDate,'tstodate','DD-MM-YYYY');
                        let compact = actDone['aas_form_prog'].split(',');
                        if (`${date}` in tmpactivity) {
                            tmpactivity[`${date}`] = Array.from(new Set([...tmpactivity[`${date}`], ...compact]));
                            tmppoints[`${date}`] += 1;
                        } else {
                            tmpactivity[`${date}`] = compact;
                            tmppoints[`${date}`] = 1;
                        }
                        if (compDateFields != '' && compDateFields != null) {
                            if (![2, 3, 11, 12].includes(actDone['source']) && userTimezone != null && userTimezone != 'UTC') {
                                let tmpdata:any = await this.commonDateService.DateTimeFormat(actDone[compDateFields],'','','UTC');
                                tmpdata = await this.commonDateService.DateTimeFormat(tmpdata,'','',userTimezone);
                                actDone[compDateFields] = await this.commonDateService.DateTimeFormat(tmpdata,'YYYY-MM-DD');
                            }
                            let logDateComp = await this.commonDateService.DateTimeFormat(actDone[compDateFields],'timestamp');
                            logDateComp = await this.commonDateService.DateTimeFormat(logDateComp,'tstodate','YYYY-MM-DD');
                            logDateComp = await this.commonDateService.DateTimeFormat(logDateComp,'timestamp');
                            let dateComp = await this.commonDateService.DateTimeFormat(logDateComp,'tstodate','DD-MM-YYYY');
                            let compactCBD = actDone['aas_form_prog'].split(',');
                            if (`${dateComp}` in tmpactivityCBD) {
                                tmpactivityCBD[`${dateComp}`] = Array.from(new Set([...tmpactivityCBD[`${dateComp}`], ...compactCBD]));
                                tmppointsCBD[`${dateComp}`] += 1;
                            } else {
                                tmpactivityCBD[`${dateComp}`] = compactCBD;
                                tmppointsCBD[`${dateComp}`] = 1;
                            }
                        }
                    }
                }   
                tmppoints = tmpactivity;
                tmppointsCBD = tmpactivityCBD;
                return [{'M' : tmppoints} , {'M2' : tmppointsCBD}];
            }else{
                const userActivitys = await this.groupByUserId(activityDone);
                let actStartDate:any = await this.commonDateService.DateTimeFormat(allDateArray['actStartDate'],'YYYY-MM-DD');
                actStartDate = await this.commonDateService.DateTimeFormat(actStartDate,'timestamp');
                let actEndDate:any = await this.commonDateService.DateTimeFormat(allDateArray['actEndDate'],'YYYY-MM-DD');
                actEndDate = await this.commonDateService.DateTimeFormat(actEndDate,'timestamp');
                let stepOneData = {};
                if(Object.keys(userActivitys).length > 0){
                    for (let [key, value] of Object.entries(userActivitys)){
                        let tmpactivity = [];
                        let tmppoints = {};
                        let tmpactivityCBD = [];
                        let tmppointsCBD = {};
                        let Role = '';
                        let on_insurance_plan = 0;
                        let locationId = '';
                        let departmentId = '';
                        let gender = '';
                        let age = 0;
                        for (let [keyAct, actDone] of Object.entries(value)) {
                            userTimezone = actDone['timezone'];
                            if (![2, 3, 11, 12].includes(actDone['source']) && userTimezone != null && userTimezone != 'UTC') {
                                let tmpdata:any = await this.commonDateService.DateTimeFormat(actDone[field],'','','UTC');
                                tmpdata = await this.commonDateService.DateTimeFormat(tmpdata,'','',userTimezone);
                                actDone[field] = await this.commonDateService.DateTimeFormat(tmpdata,'YYYY-MM-DD');
                            }
                            let logDate = await this.commonDateService.DateTimeFormat(actDone[field],'timestamp');
                            logDate = await this.commonDateService.DateTimeFormat(logDate,'tstodate','YYYY-MM-DD');
                            logDate = await this.commonDateService.DateTimeFormat(logDate,'timestamp');
                            if (actStartDate <= logDate && logDate <= actEndDate) {
                                let date = await this.commonDateService.DateTimeFormat(logDate,'tstodate','DD-MM-YYYY');
                                let compact = actDone['aas_form_prog'].split(',');
                                if (`${date}` in tmpactivity) {
                                    tmpactivity[`${date}`] = Array.from(new Set([...tmpactivity[`${date}`], ...compact]));
                                    tmppoints[`${date}`] += 1;
                                } else {
                                    tmpactivity[`${date}`] = compact;
                                    tmppoints[`${date}`] = 1;
                                }
                                if (call_from != 4 && (compDateFields != '' && compDateFields != null)) {
                                    if (![2, 3, 11, 12].includes(actDone['source']) && userTimezone != null && userTimezone != 'UTC') {
                                        let tmpdata:any = await this.commonDateService.DateTimeFormat(actDone[compDateFields],'','','UTC');
                                        tmpdata = await this.commonDateService.DateTimeFormat(tmpdata,'','',userTimezone);
                                        actDone[compDateFields] = await this.commonDateService.DateTimeFormat(tmpdata,'YYYY-MM-DD');
                                    }
                                    let logDateComp = await this.commonDateService.DateTimeFormat(actDone[compDateFields],'timestamp');
                                    logDateComp = await this.commonDateService.DateTimeFormat(logDateComp,'tstodate','YYYY-MM-DD');
                                    logDateComp = await this.commonDateService.DateTimeFormat(logDateComp,'timestamp');
                                    let dateComp = await this.commonDateService.DateTimeFormat(logDateComp,'tstodate','DD-MM-YYYY');
                                    let compactCBD = actDone['aas_form_prog'].split(',');
                                    if (`${dateComp}` in tmpactivityCBD) {
                                        tmpactivityCBD[`${dateComp}`] = Array.from(new Set([...tmpactivityCBD[`${dateComp}`], ...compactCBD]));
                                        tmppointsCBD[`${dateComp}`] += 1;
                                    } else {
                                        tmpactivityCBD[`${dateComp}`] = compactCBD;
                                        tmppointsCBD[`${dateComp}`] = 1;
                                    }
                                }
                            }
                            Role = actDone['role_id'];
                            on_insurance_plan = (actDone['on_insurance_plan'] == 'Yes') ? 1 : 0;
                            locationId = actDone['location'];
                            departmentId = actDone['department_id'];
                            gender = actDone['gender'];
                            age = Number(actDone['age']);
                        }
                        if(!stepOneData[key]){
                            stepOneData[key] = {};
                        }
                        stepOneData[key]['M'] = tmpactivity;
                        if (call_from != 4 && Object.keys(tmpactivityCBD).length > 0) {
                            stepOneData[key]['M2'] = tmpactivityCBD;
                        }
                        stepOneData[key]['Role'] = Role;
                        stepOneData[key]['on_insurance_plan'] = on_insurance_plan;
                        stepOneData[key]['location'] = locationId;
                        stepOneData[key]['department'] = departmentId;
                        stepOneData[key]['gender'] = gender;
                        stepOneData[key]['age'] = age;
                    }
                }
                return stepOneData;
            }
        }catch (error) {
            throw new Error(error.message); 
        }
    }
    async count_point_act_bio(activityDone:any = [], actId:any = null, field:any = null, allDateArray:any = [], extraDataArray:any = []){
        try{
            let 
            {   
                compDateFields = null,
                joinType = null,
                userTimezone = '',
                getDataType = 'single',
                call_from = '',
                myHireData = {}
            } = Object.assign({}, ...extraDataArray);
            if(getDataType == 'single'){
                userTimezone = (userTimezone == '') ? 'UTC' : userTimezone;
                let tmppoints = {};
                let tmppointsCBD = {};
                let actStartDate:any = await this.commonDateService.DateTimeFormat(allDateArray['actStartDateM'],'YYYY-MM-DD HH:mm:ss');
                actStartDate = await this.commonDateService.DateTimeFormat(actStartDate,'timestamp');
                let actEndDate:any = await this.commonDateService.DateTimeFormat(allDateArray['actEndDateM'],'YYYY-MM-DD HH:mm:ss');
                actEndDate = await this.commonDateService.DateTimeFormat(actEndDate,'timestamp');
                for (let actDone of activityDone) {
                    if (joinType == 'join' && (compDateFields != '' && compDateFields != null)) {
                        actDone[field] = await this.commonDateService.DateTimeFormat(actDone[field], 'YYYY-MM-DD')+ ' ' + await this.commonDateService.DateTimeFormat(actDone[compDateFields],'utcTimeFormat','HH:mm:ss')
                    }
                    if (![2, 3, 11, 12].includes(actDone['source']) && userTimezone != null && userTimezone != 'UTC') {
                        let tmpdata:any = await this.commonDateService.DateTimeFormat(actDone[field],'','','UTC');
                        tmpdata = await this.commonDateService.DateTimeFormat(tmpdata,'','',userTimezone);
                        actDone[field] = await this.commonDateService.DateTimeFormat(tmpdata,'YYYY-MM-DD');
                    }
                    let logDate = await this.commonDateService.DateTimeFormat(actDone[field],'timestamp');
                    logDate = await this.commonDateService.DateTimeFormat(logDate,'tstodate','YYYY-MM-DD HH:mm:ss');
                    logDate = await this.commonDateService.DateTimeFormat(logDate,'timestamp');
                    if (actStartDate <= logDate && logDate <= actEndDate) {
                        let date = await this.commonDateService.DateTimeFormat(logDate,'tstodate','DD-MM-YYYY');
                        if (`${date}` in tmppoints) {
                            tmppoints[`${date}`] += 1;
                        } else {
                            tmppoints[`${date}`] = 1;
                        }
                        if(![2, 3, 11, 12].includes(actDone['source'])){
                            joinType = null;
                        }
                        if (compDateFields != '' && compDateFields != null) {
                            if (![2, 3, 11, 12].includes(actDone['source']) && userTimezone != null && userTimezone != 'UTC') {
                                let tmpdata:any = await this.commonDateService.DateTimeFormat(actDone[compDateFields],'','','UTC');
                                tmpdata = await this.commonDateService.DateTimeFormat(tmpdata,'','',userTimezone);
                                actDone[compDateFields] = await this.commonDateService.DateTimeFormat(tmpdata,'YYYY-MM-DD');
                            }
                            let logDateComp = await this.commonDateService.DateTimeFormat(actDone[compDateFields],'timestamp');
                            logDateComp = await this.commonDateService.DateTimeFormat(logDateComp,'tstodate','YYYY-MM-DD');
                            logDateComp = await this.commonDateService.DateTimeFormat(logDateComp,'timestamp');
                            let dateComp = await this.commonDateService.DateTimeFormat(logDateComp,'tstodate','DD-MM-YYYY');
                            if (`${dateComp}` in tmppointsCBD) {
                                tmppointsCBD[`${dateComp}`] += 1;
                            } else {
                                tmppointsCBD[`${dateComp}`] = 1;
                            }
                        }
                    }
                }   
                return [{'M' : tmppoints} , {'M2' : tmppointsCBD}];
            }else{
                let hireDateSetting = Number(myHireData['hireDateSetting'] || 0);
                let hireDateCount = Number(myHireData['hireDateCount'] || 0);
                const userActivitys = await this.groupByUserId(activityDone);
                let actStartDate:any = await this.commonDateService.DateTimeFormat(allDateArray['actStartDate'],'YYYY-MM-DD');
                actStartDate = await this.commonDateService.DateTimeFormat(actStartDate,'timestamp');
                let actEndDate:any = await this.commonDateService.DateTimeFormat(allDateArray['actEndDate'],'YYYY-MM-DD');
                actEndDate = await this.commonDateService.DateTimeFormat(actEndDate,'timestamp');
                let stepOneData = {};
                if(Object.keys(userActivitys).length > 0){
                    for (let [key, value] of Object.entries(userActivitys)){
                        let tmppoints = {};
                        let tmppointsCBD = {};
                        let Role = '';
                        let on_insurance_plan = 0;
                        let locationId = '';
                        let departmentId = '';
                        let gender = '';
                        let age = 0;
                        let displayactStartDate = '';
                        let displayactStartDateTS = '';
                        if(hireDateSetting && hireDateSetting == 1 && hireDateCount && hireDateCount > 0){
                            actEndDate = this.commonDateService.getTodayDate(myHireData['startDate']).add(myHireData['totaldays'] || 0, 'days').format('YYYY-MM-DD');
                            actEndDate = await this.commonDateService.DateTimeFormat(actEndDate,'timestamp');
                        }
                        let newHireStartDate = myHireData['startDate'];
                        if(hireDateSetting && hireDateSetting == 1 && myHireData['allUsersDOHInfoData'][key] && myHireData['startDateTS'] < myHireData['allUsersDOHInfoData'][key]){
                            newHireStartDate = await this.commonDateService.DateTimeFormat(myHireData['allUsersDOHInfoData'][key],'tstodate','YYYY-MM-DD');
                            actEndDate = this.commonDateService.getTodayDate(newHireStartDate).add((myHireData['totaldays'] || 0) + 1, 'days').format('YYYY-MM-DD');
                            actEndDate = await this.commonDateService.DateTimeFormat(actEndDate,'timestamp');
                        }
                        if(hireDateSetting && hireDateSetting == 1 && hireDateCount && hireDateCount > 0){
                            displayactStartDate = (newHireStartDate != '') ? newHireStartDate : myHireData['startDate'] ;
                            displayactStartDateTS = await this.commonDateService.DateTimeFormat(displayactStartDate,'timestamp');
                            actStartDate = this.commonDateService.getTodayDate(displayactStartDate).subtract(myHireData['totaldays'] || 0, 'days').format('YYYY-MM-DD');
                            actStartDate = await this.commonDateService.DateTimeFormat(actStartDate,'timestamp');
                        }
                        for (let actDone of value as any) {
                            userTimezone = actDone['timezone'];
                            if (joinType == 'join' && (compDateFields != '' && compDateFields != null)) {
                                actDone[field] = await this.commonDateService.DateTimeFormat(actDone[field], 'YYYY-MM-DD')+ ' ' + await this.commonDateService.DateTimeFormat(actDone[compDateFields],'utcTimeFormat','HH:mm:ss')
                            }
                            if (![2, 3, 11, 12].includes(Number(actDone['source'])) && userTimezone != null && userTimezone != 'UTC') {
                                let tmpdata:any = await this.commonDateService.DateTimeFormat(actDone[field],'','','UTC');
                                tmpdata = await this.commonDateService.DateTimeFormat(tmpdata,'','',userTimezone);
                                actDone[field] = await this.commonDateService.DateTimeFormat(tmpdata,'YYYY-MM-DD');
                            }
                            if(displayactStartDateTS != '' && displayactStartDateTS > await this.commonDateService.DateTimeFormat(actDone[field],'timestamp')){
                               actDone[field] = displayactStartDate;
                            }
                            let logDate = await this.commonDateService.DateTimeFormat(actDone[field],'timestamp');
                            logDate = await this.commonDateService.DateTimeFormat(logDate,'tstodate','YYYY-MM-DD');
                            logDate = await this.commonDateService.DateTimeFormat(logDate,'timestamp');
                            if (actStartDate <= logDate && logDate <= actEndDate) {
                                let date = await this.commonDateService.DateTimeFormat(logDate,'tstodate','DD-MM-YYYY');
                                if (`${date}` in tmppoints) {
                                    tmppoints[`${date}`] += 1;
                                } else {
                                    tmppoints[`${date}`] = 1;
                                }
                                if (call_from != 4 && (compDateFields != '' && compDateFields != null)) {
                                    if (![2, 3, 11, 12].includes(Number(actDone['source'])) && userTimezone != null && userTimezone != 'UTC') {
                                        let tmpdata:any = await this.commonDateService.DateTimeFormat(actDone[compDateFields],'','','UTC');
                                        tmpdata = await this.commonDateService.DateTimeFormat(tmpdata,'','',userTimezone);
                                        actDone[compDateFields] = await this.commonDateService.DateTimeFormat(tmpdata,'YYYY-MM-DD');
                                    }
                                    let logDateComp = await this.commonDateService.DateTimeFormat(actDone[compDateFields],'timestamp');
                                    logDateComp = await this.commonDateService.DateTimeFormat(logDateComp,'tstodate','YYYY-MM-DD');
                                    logDateComp = await this.commonDateService.DateTimeFormat(logDateComp,'timestamp');
                                    let dateComp = await this.commonDateService.DateTimeFormat(logDateComp,'tstodate','DD-MM-YYYY');
                                    if (`${dateComp}` in tmppointsCBD) {
                                        tmppointsCBD[`${dateComp}`] += 1;
                                    } else {
                                        tmppointsCBD[`${dateComp}`] = 1;
                                    }
                                }
                            }
                            Role = actDone['role_id'];
                            on_insurance_plan = (actDone['on_insurance_plan'] == 'Yes') ? 1 : 0;
                            locationId = actDone['location'];
                            departmentId = actDone['department_id'];
                            gender = actDone['gender'];
                            age = Number(actDone['age']);
                        }
                        if(!stepOneData[key]){
                            stepOneData[key] = {};
                        }
                        stepOneData[key]['M'] = tmppoints;
                        if (call_from != 4 && Object.keys(tmppointsCBD).length > 0) {
                            stepOneData[key]['M2'] = tmppointsCBD;
                        }
                        stepOneData[key]['Role'] = Role;
                        stepOneData[key]['on_insurance_plan'] = on_insurance_plan;
                        stepOneData[key]['location'] = locationId;
                        stepOneData[key]['department'] = departmentId;
                        stepOneData[key]['gender'] = gender;
                        stepOneData[key]['age'] = age;
                    }
                }
                return stepOneData;
            }
        }catch (error) {
            throw new Error(error.message); 
        }
    }
    async count_point_act(activityDone:any = [], actId:any = null, field:any = null, allDateArray:any = [], extraDataArray:any = []){
        try{
            let {
                compDateFields = null,
                joinType = null,
                userTimezone = '',
                getDataType = 'single',
                call_from = '',
                tType = 'NO',
                myHireData = {}
            } = Object.assign({}, ...extraDataArray);
            if(getDataType == 'single'){
                userTimezone = (userTimezone == '') ? 'UTC' : userTimezone;
                let tmpactivity = [];
                let tmppoints = {};
                let tmpactivityCBD = [];
                let tmppointsCBD = {};
                let actStartDate:any = await this.commonDateService.DateTimeFormat(allDateArray['actStartDateM'],'YYYY-MM-DD HH:mm:ss');
                actStartDate = await this.commonDateService.DateTimeFormat(actStartDate,'timestamp');
                let actEndDate:any = await this.commonDateService.DateTimeFormat(allDateArray['actEndDateM'],'YYYY-MM-DD HH:mm:ss');
                actEndDate = await this.commonDateService.DateTimeFormat(actEndDate,'timestamp');
                for (let actDone of activityDone) {
                    if (joinType == 'join' && (compDateFields != '' && compDateFields != null)) {
                        actDone[field] = await this.commonDateService.DateTimeFormat(actDone[field], 'YYYY-MM-DD') + ' ' + await this.commonDateService.DateTimeFormat(actDone[compDateFields], 'utcTimeFormat', 'HH:mm:ss');
                    }
                    if (tType == 'YES' && userTimezone != null && userTimezone != 'UTC') {
                        let tmpdata:any = await this.commonDateService.DateTimeFormat(actDone[field],'','','UTC');
                        tmpdata = await this.commonDateService.DateTimeFormat(tmpdata,'','',userTimezone);
                        actDone[field] = await this.commonDateService.DateTimeFormat(tmpdata,'YYYY-MM-DD HH:mm:ss');
                    }
                    let logDate = await this.commonDateService.DateTimeFormat(actDone[field],'timestamp');
                    logDate = await this.commonDateService.DateTimeFormat(logDate,'tstodate','YYYY-MM-DD HH:mm:ss');
                    logDate = await this.commonDateService.DateTimeFormat(logDate,'timestamp');
                    if (actStartDate <= logDate && logDate <= actEndDate) {
                        let date = await this.commonDateService.DateTimeFormat(logDate,'tstodate','DD-MM-YYYY');
                        if (`${date}` in tmppoints) {
                            tmppoints[`${date}`] += 1;
                        } else {
                            tmppoints[`${date}`] = 1;
                        }
                        if (compDateFields != '' && compDateFields != null) {
                            if (tType == 'YES' && userTimezone != null && userTimezone != 'UTC') {
                                let tmpdata:any = await this.commonDateService.DateTimeFormat(actDone[compDateFields],'','','UTC');
                                tmpdata = await this.commonDateService.DateTimeFormat(tmpdata,'','',userTimezone);
                                actDone[compDateFields] = await this.commonDateService.DateTimeFormat(tmpdata,'YYYY-MM-DD HH:mm:ss');
                            }
                            
                            let logDateComp = await this.commonDateService.DateTimeFormat(actDone[compDateFields],'timestamp');
                            logDateComp = await this.commonDateService.DateTimeFormat(logDateComp,'tstodate','YYYY-MM-DD HH:mm:ss');
                            logDateComp = await this.commonDateService.DateTimeFormat(logDateComp,'timestamp');
                            let dateComp = await this.commonDateService.DateTimeFormat(logDateComp,'tstodate','DD-MM-YYYY');
                            if (`${dateComp}` in tmppointsCBD) {
                                tmppointsCBD[`${dateComp}`] += 1;
                            } else {
                                tmppointsCBD[`${dateComp}`] = 1;
                            }
                        }
                    }
                }   
                return [{'M' : tmppoints} , {'M2' : tmppointsCBD}];
            }else{
                let hireDateSetting = Number(myHireData['hireDateSetting'] || 0);
                let hireDateCount = Number(myHireData['hireDateCount'] || 0);
                const userActivitys = await this.groupByUserId(activityDone);
                let actStartDate:any = await this.commonDateService.DateTimeFormat(allDateArray['actStartDate'],'YYYY-MM-DD');
                actStartDate = await this.commonDateService.DateTimeFormat(actStartDate,'timestamp');
                let actEndDate:any = await this.commonDateService.DateTimeFormat(allDateArray['actEndDate'],'YYYY-MM-DD');
                actEndDate = await this.commonDateService.DateTimeFormat(actEndDate,'timestamp');
                let stepOneData = {};
                if(Object.keys(userActivitys).length > 0){
                    for (let [key, value] of Object.entries(userActivitys)){
                        let tmppoints = {};
                        let tmppointsCBD = {};
                        let Role = '';
                        let on_insurance_plan = 0;
                        let locationId = '';
                        let departmentId = '';
                        let gender = '';
                        let age = 0;
                        let displayactStartDate = '';
                        let displayactStartDateTS = '';
                        if(hireDateSetting && hireDateSetting == 1 && hireDateCount && hireDateCount > 0){
                            actEndDate = this.commonDateService.getTodayDate(myHireData['startDate']).add(myHireData['totaldays'] || 0, 'days').format('YYYY-MM-DD');
                            actEndDate = await this.commonDateService.DateTimeFormat(actEndDate,'timestamp');
                        }
                        let newHireStartDate = myHireData['startDate'];
                        if(hireDateSetting && hireDateSetting == 1 && myHireData['allUsersDOHInfoData'][key] && myHireData['startDateTS'] < myHireData['allUsersDOHInfoData'][key]){
                            newHireStartDate = await this.commonDateService.DateTimeFormat(myHireData['allUsersDOHInfoData'][key],'tstodate','YYYY-MM-DD');
                            actEndDate = this.commonDateService.getTodayDate(newHireStartDate).add((myHireData['totaldays'] || 0) + 1, 'days').format('YYYY-MM-DD');
                            actEndDate = await this.commonDateService.DateTimeFormat(actEndDate,'timestamp');
                        }
                        if(hireDateSetting && hireDateSetting == 1 && hireDateCount && hireDateCount > 0){
                            displayactStartDate = (newHireStartDate != '') ? newHireStartDate : myHireData['startDate'] ;
                            displayactStartDateTS = await this.commonDateService.DateTimeFormat(displayactStartDate,'timestamp');
                            actStartDate = this.commonDateService.getTodayDate(displayactStartDate).subtract(myHireData['totaldays'] || 0, 'days').format('YYYY-MM-DD');
                            actStartDate = await this.commonDateService.DateTimeFormat(actStartDate,'timestamp');
                        }
                        for (let [keyAct, actDone] of Object.entries(value)) {
                            userTimezone = actDone['timezone'];
                            if (joinType == 'join' && (compDateFields != '' && compDateFields != null)) {
                                actDone[field] = await this.commonDateService.DateTimeFormat(actDone[field], 'YYYY-MM-DD')+ ' ' + await this.commonDateService.DateTimeFormat(actDone[compDateFields],'utcTimeFormat','HH:mm:ss');
                            }
                            if(displayactStartDateTS != '' && displayactStartDateTS > await this.commonDateService.DateTimeFormat(actDone[field],'timestamp')){
                               actDone[field] = displayactStartDate;
                            }
                            let logDate = await this.commonDateService.DateTimeFormat(actDone[field],'timestamp');
                            logDate = await this.commonDateService.DateTimeFormat(logDate,'tstodate','YYYY-MM-DD');
                            logDate = await this.commonDateService.DateTimeFormat(logDate,'timestamp');
                            if (actStartDate <= logDate && logDate <= actEndDate) {
                                let date = await this.commonDateService.DateTimeFormat(logDate,'tstodate','DD-MM-YYYY');
                                if (`${date}` in tmppoints) {
                                    tmppoints[`${date}`] += 1;
                                } else {
                                    tmppoints[`${date}`] = 1;
                                }
                                if (call_from != 4 && (compDateFields != '' && compDateFields != null)) {
                                    let logDateComp = await this.commonDateService.DateTimeFormat(actDone[compDateFields],'timestamp');
                                    logDateComp = await this.commonDateService.DateTimeFormat(logDateComp,'tstodate','YYYY-MM-DD HH:mm:ss');
                                    logDateComp = await this.commonDateService.DateTimeFormat(logDateComp,'timestamp');
                                    let dateComp = await this.commonDateService.DateTimeFormat(logDateComp,'tstodate','DD-MM-YYYY');
                                    if (`${dateComp}` in tmppointsCBD) {
                                        tmppointsCBD[`${dateComp}`] += 1;
                                    } else {
                                        tmppointsCBD[`${dateComp}`] = 1;
                                    }
                                }
                            }
                            Role = actDone['role_id'];
                            on_insurance_plan = (actDone['on_insurance_plan'] == 'Yes') ? 1 : 0;
                            locationId = actDone['location'];
                            departmentId = actDone['department_id'];
                            gender = actDone['gender'];
                            age = Number(actDone['age']);
                        }
                        if(!stepOneData[key]){
                            stepOneData[key] = {};
                        }
                        stepOneData[key]['M'] = tmppoints;
                        if (call_from != 4 && Object.keys(tmppointsCBD).length > 0) {
                            stepOneData[key]['M2'] = tmppointsCBD;
                        }
                        stepOneData[key]['Role'] = Role;
                        stepOneData[key]['on_insurance_plan'] = on_insurance_plan;
                        stepOneData[key]['location'] = locationId;
                        stepOneData[key]['department'] = departmentId;
                        stepOneData[key]['gender'] = gender;
                        stepOneData[key]['age'] = age;
                    }
                }
                return stepOneData;
            }
        }catch (error) {
            throw new Error(error.message); 
        }
    }
    async count_point_act_steps(activityDone:any = [], actId:any = null, field:any = null, allDateArray:any = [], extraDataArray:any = []){
        try{
            let {
                compDateFields = null,
                joinType = null,
                userTimezone = '',
                getDataType = 'single',
                call_from = '',
                tType = 'NO',
                steps = 0,
                actDatas = {},
                myHireData = {}
            } = Object.assign({}, ...extraDataArray);
            if (actDatas) {
                steps = parseFloat(actDatas['steps']) || 0;
            }
            if(getDataType == 'single'){
                userTimezone = (userTimezone == '') ? 'UTC' : userTimezone;
                let tmppoints = {};
                let tmppointsCBD = {};
                let actStartDate:any = await this.commonDateService.DateTimeFormat(allDateArray['actStartDateM'],'YYYY-MM-DD');
                actStartDate = await this.commonDateService.DateTimeFormat(actStartDate,'timestamp');
                let actEndDate:any = await this.commonDateService.DateTimeFormat(allDateArray['actEndDateM'],'YYYY-MM-DD');
                actEndDate = await this.commonDateService.DateTimeFormat(actEndDate,'timestamp');
                for (let actDone of activityDone) {
                    if (tType == 'YES' && userTimezone != null && userTimezone != 'UTC') {
                        let tmpdata:any = await this.commonDateService.DateTimeFormat(actDone[field],'','','UTC');
                        tmpdata = await this.commonDateService.DateTimeFormat(tmpdata,'','', userTimezone);
                        actDone[field] = await this.commonDateService.DateTimeFormat(tmpdata,'YYYY-MM-DD HH:mm:ss');
                    }
                    let logDate = await this.commonDateService.DateTimeFormat(actDone[field],'timestamp');
                    logDate = await this.commonDateService.DateTimeFormat(logDate,'tstodate','YYYY-MM-DD');
                    logDate = await this.commonDateService.DateTimeFormat(logDate,'timestamp');
                    if (actStartDate <= logDate && logDate <= actEndDate) {
                        let date = await this.commonDateService.DateTimeFormat(logDate,'tstodate','DD-MM-YYYY');
                        if (`${date}` in tmppoints) {
                            tmppoints[`${date}`] += actDone['steps'];
                        } else {
                            tmppoints[`${date}`] = actDone['steps'];
                        }
                        if (compDateFields != '' && compDateFields != null) {
                            if (tType == 'YES' && userTimezone != null && userTimezone != 'UTC') {
                                let tmpdata:any = await this.commonDateService.DateTimeFormat(actDone[compDateFields],'','','UTC');
                                tmpdata = await this.commonDateService.DateTimeFormat(tmpdata,'','', userTimezone);
                                actDone[compDateFields] = await this.commonDateService.DateTimeFormat(tmpdata,'YYYY-MM-DD HH:mm:ss');
                            }
                            let logDateComp = await this.commonDateService.DateTimeFormat(actDone[compDateFields],'timestamp');
                            logDateComp = await this.commonDateService.DateTimeFormat(logDateComp,'tstodate','YYYY-MM-DD HH:mm:ss');
                            logDateComp = await this.commonDateService.DateTimeFormat(logDateComp,'timestamp');
                            let dateComp = await this.commonDateService.DateTimeFormat(logDateComp,'tstodate','DD-MM-YYYY');
                            if (`${dateComp}` in tmppointsCBD) {
                                tmppointsCBD[`${dateComp}`] += actDone['steps'];
                            } else {
                                tmppointsCBD[`${dateComp}`] = actDone['steps'];
                            }
                        }
                    }
                }   
                if (steps == 0) {
                    steps = 10000;
                }
                const tmpPoints1: Record<string, number> = {};
                Object.entries(tmppoints).forEach(([key, val]) => {
                if (val !== "" && val !== 0) {
                    const tmpPP = +val / steps;
                    tmpPoints1[key] = Math.floor(tmpPP);
                }
                });
                const tmpPoints1CBD: Record<string, number> = {};
                Object.entries(tmppointsCBD).forEach(([key, valCBD]) => {
                if (valCBD !== "" && valCBD !== 0) {
                    const tmpPPCBD = +valCBD / steps;
                    tmpPoints1CBD[key] = Math.floor(tmpPPCBD);
                }
                });
                return [{'M' : tmpPoints1} , {'M2' : tmpPoints1CBD}];
            }else{
                let hireDateSetting = myHireData['hireDateSetting'] || 0;
                let hireDateCount = myHireData['hireDateCount'] || 0;
                const userActivitys = await this.groupByUserId(activityDone);
                let actStartDate:any = await this.commonDateService.DateTimeFormat(allDateArray['actStartDate'],'YYYY-MM-DD');
                actStartDate = await this.commonDateService.DateTimeFormat(actStartDate,'timestamp');
                let actEndDate:any = await this.commonDateService.DateTimeFormat(allDateArray['actEndDate'],'YYYY-MM-DD');
                actEndDate = await this.commonDateService.DateTimeFormat(actEndDate,'timestamp');
                if (steps == "" || steps == 0) {
                    steps = 10000;
                }
                let stepOneData = {};
                if(Object.keys(userActivitys).length > 0){
                    for (let [key, value] of Object.entries(userActivitys)){
                        let tmppoints = {};
                        let tmppointsCBD = {};
                        let Role = '';
                        let on_insurance_plan = 0;
                        let locationId = '';
                        let departmentId = '';
                        let gender = '';
                        let age = 0;
                        let displayactStartDate = '';
                        let displayactStartDateTS = '';
                        if(hireDateSetting && hireDateSetting == 1 && hireDateCount && hireDateCount > 0){
                            actEndDate = this.commonDateService.getTodayDate(myHireData['startDate']).add(myHireData['totaldays'] || 0, 'days').format('YYYY-MM-DD');
                            actEndDate = await this.commonDateService.DateTimeFormat(actEndDate,'timestamp');
                        }
                        let newHireStartDate = myHireData['startDate'];
                        if(hireDateSetting && hireDateSetting == 1 && myHireData['allUsersDOHInfoData'][key] && myHireData['startDateTS'] < myHireData['allUsersDOHInfoData'][key]){
                            newHireStartDate = await this.commonDateService.DateTimeFormat(myHireData['allUsersDOHInfoData'][key],'tstodate','YYYY-MM-DD');
                            actEndDate = this.commonDateService.getTodayDate(newHireStartDate).add((myHireData['totaldays'] || 0) + 1, 'days').format('YYYY-MM-DD');
                            actEndDate = await this.commonDateService.DateTimeFormat(actEndDate,'timestamp');
                        }
                        if(hireDateSetting && hireDateSetting == 1 && hireDateCount && hireDateCount > 0){
                            displayactStartDate = (newHireStartDate != '') ? newHireStartDate : myHireData['startDate'] ;
                            displayactStartDateTS = await this.commonDateService.DateTimeFormat(displayactStartDate,'timestamp');
                            actStartDate = this.commonDateService.getTodayDate(displayactStartDate).subtract(myHireData['totaldays'] || 0, 'days').format('YYYY-MM-DD');
                            actStartDate = await this.commonDateService.DateTimeFormat(actStartDate,'timestamp');
                        }
                        for (let [keyAct, actDone] of Object.entries(value)) {
                            if(displayactStartDateTS != '' && displayactStartDateTS > await this.commonDateService.DateTimeFormat(actDone[field],'timestamp')){
                               actDone[field] = displayactStartDate;
                            }
                            let logDate = await this.commonDateService.DateTimeFormat(actDone[field],'timestamp');
                            logDate = await this.commonDateService.DateTimeFormat(logDate,'tstodate','YYYY-MM-DD');
                            logDate = await this.commonDateService.DateTimeFormat(logDate,'timestamp');
                            if (actStartDate <= logDate && logDate <= actEndDate) {
                                let date = await this.commonDateService.DateTimeFormat(logDate,'tstodate','DD-MM-YYYY');
                                if (`${date}` in tmppoints) {
                                    tmppoints[`${date}`] += actDone['steps'];
                                } else {
                                    tmppoints[`${date}`] = actDone['steps'];
                                }
                                if (call_from != 4 && (compDateFields != '' && compDateFields != null)) {
                                    let logDateComp = await this.commonDateService.DateTimeFormat(actDone[compDateFields],'timestamp');
                                    logDateComp = await this.commonDateService.DateTimeFormat(logDateComp,'tstodate','YYYY-MM-DD HH:mm:ss');
                                    logDateComp = await this.commonDateService.DateTimeFormat(logDateComp,'timestamp');
                                    let dateComp = await this.commonDateService.DateTimeFormat(logDateComp,'tstodate','DD-MM-YYYY');
                                    if (`${dateComp}` in tmppointsCBD) {
                                        tmppointsCBD[`${dateComp}`] += actDone['steps'];
                                    } else {
                                        tmppointsCBD[`${dateComp}`] = actDone['steps'];
                                    }
                                }
                            }
                            Role = actDone['role_id'];
                            on_insurance_plan = (actDone['on_insurance_plan'] == 'Yes') ? 1 : 0;
                            locationId = actDone['location'];
                            departmentId = actDone['department_id'];
                            gender = actDone['gender'];
                            age = Number(actDone['age']);
                        }
                        const tmpPoints1: Record<string, number> = {};
                        Object.entries(tmppoints).forEach(([key, val]) => {
                        if (val !== "" && val !== 0) {
                            const tmpPP = Number(val) / steps;
                            tmpPoints1[key] = Math.floor(tmpPP);
                        }
                        });
                        const tmpPoints1CBD: Record<string, number> = {};
                        Object.entries(tmppointsCBD).forEach(([key, valCBD]) => {
                        if (valCBD !== "" && valCBD !== 0) {
                            const tmpPPCBD = Number(valCBD) / steps;
                            tmpPoints1CBD[key] = Math.floor(tmpPPCBD);
                        }
                        });
                        if(!stepOneData[key]){
                            stepOneData[key] = {};
                        }
                        if(Object.keys(tmpPoints1).length > 0){
                            stepOneData[key]['M'] = tmpPoints1;
                            stepOneData[key]['M2'] = {};
                            stepOneData[key]['Role'] = Role;
                            stepOneData[key]['on_insurance_plan'] = on_insurance_plan;
                            stepOneData[key]['location'] = locationId;
                            stepOneData[key]['department'] = departmentId;
                            stepOneData[key]['gender'] = gender;
                            stepOneData[key]['age'] = age;
                        }
                        if (call_from != 4 && Object.keys(tmpPoints1CBD).length > 0) {
                            stepOneData[key]['M2'] = tmpPoints1CBD;
                        }
                    }
                }
                return stepOneData;
            }
        }catch (error) {
            throw new Error(error.message); 
        }
    }
    async count_point_act_stepsother(activityDone:any = [], actId:any = null, field:any = null, allDateArray:any = [], extraDataArray:any = []){
        try{
            let {
                compDateFields = null,
                joinType = null,
                userTimezone = '',
                getDataType = 'single',
                call_from = '',
                tType = 'NO',
                actDatas = {},
                tmppointsF = {},
                steps = 0,
                myHireData = {}
            } = Object.assign({}, ...extraDataArray);
            if (actDatas) {
                steps = parseFloat(actDatas['steps']) || 0;
            }
            if(getDataType == 'single'){
                userTimezone = (userTimezone == '') ? 'UTC' : userTimezone;
                let tmppoints = {};
                let tmppointsCBD = {};
                let actStartDate:any = await this.commonDateService.DateTimeFormat(allDateArray['actStartDateM'],'YYYY-MM-DD');
                actStartDate = await this.commonDateService.DateTimeFormat(actStartDate,'timestamp');
                let actEndDate:any = await this.commonDateService.DateTimeFormat(allDateArray['actEndDateM'],'YYYY-MM-DD');
                actEndDate = await this.commonDateService.DateTimeFormat(actEndDate,'timestamp');
                for (let actDone of activityDone) {
                    if (tType == 'YES' && userTimezone != null && userTimezone != 'UTC') {
                        let tmpdata:any = await this.commonDateService.DateTimeFormat(actDone[field],'','','UTC');
                        tmpdata = await this.commonDateService.DateTimeFormat(tmpdata,'','', userTimezone);
                        actDone[field] = await this.commonDateService.DateTimeFormat(tmpdata,'YYYY-MM-DD HH:mm:ss');
                    }
                    let logDate = await this.commonDateService.DateTimeFormat(actDone[field],'timestamp');
                    logDate = await this.commonDateService.DateTimeFormat(logDate,'tstodate','YYYY-MM-DD');
                    logDate = await this.commonDateService.DateTimeFormat(logDate,'timestamp');
                    if (actStartDate <= logDate && logDate <= actEndDate) {
                        let date = await this.commonDateService.DateTimeFormat(logDate,'tstodate','DD-MM-YYYY');
                        if (`${date}` in tmppoints) {
                            tmppoints[`${date}`] += actDone['steps'];
                        } else {
                            tmppoints[`${date}`] = actDone['steps'];
                        }
                        if (compDateFields != '' && compDateFields != null) {
                            if (tType == 'YES' && userTimezone != null && userTimezone != 'UTC') {
                                let tmpdata:any = await this.commonDateService.DateTimeFormat(actDone[compDateFields],'','','UTC');
                                tmpdata = await this.commonDateService.DateTimeFormat(tmpdata,'','', userTimezone);
                                actDone[compDateFields] = await this.commonDateService.DateTimeFormat(tmpdata,'YYYY-MM-DD HH:mm:ss');
                            }
                            let logDateComp = await this.commonDateService.DateTimeFormat(actDone[compDateFields],'timestamp');
                            logDateComp = await this.commonDateService.DateTimeFormat(logDateComp,'tstodate','YYYY-MM-DD HH:mm:ss');
                            logDateComp = await this.commonDateService.DateTimeFormat(logDateComp,'timestamp');
                            let dateComp = await this.commonDateService.DateTimeFormat(logDateComp,'tstodate','DD-MM-YYYY');
                            if (`${dateComp}` in tmppointsCBD) {
                                tmppointsCBD[`${dateComp}`] += actDone['steps'];
                            } else {
                                tmppointsCBD[`${dateComp}`] = actDone['steps'];
                            }
                        }
                    }
                }   
                if (steps == "" || steps == 0) {
                    steps = 10000;
                }
                let frequincy = actDatas['frequincy'];
                const tmpPoints1: Record<string, number> = {};
                if(Object.keys(tmppoints)?.length > 0){
                    if(frequincy == 'D'){
                        for (let entry of Object.entries(tmppoints)) {
                            let key = entry[0];
                            let val = entry[1];
                            if (val >= steps) {
                                tmpPoints1[`${key}`] = 1;
                            }
                        }
                    }else{
                        if (frequincy == "W" || frequincy == "M" || frequincy == "Y") {
                            const weeklyArray: Record<string, { steps: number; date: string }> = {};
                            for (let temppoints of Object.entries(tmppoints)) {
                                let date = temppoints[0];
                                let value:any = temppoints[1];
                                let WMYNo:any = '';
                                WMYNo = await this.commonDateService.getWeekMonthYearNo(date,frequincy);
                                if (weeklyArray[`"${WMYNo}"`]) {
                                    weeklyArray[`"${WMYNo}"`].steps += value;
                                    weeklyArray[`"${WMYNo}"`].date = date;
                                } else {
                                    weeklyArray[`"${WMYNo}"`] = { steps: value, date };
                                }
                            }
                            if(Object.keys(weeklyArray).length > 0){
                                for (let entry of Object.values(weeklyArray)) {
                                    if (entry.steps >= steps) {
                                        tmpPoints1[`${entry.date}`] = 1;
                                    }
                                }
                            }
                        }else{
                            let tmpSteps = 0;
                            for (let temppoints of Object.entries(tmppoints)) {
                                let key = temppoints[0];
                                let val:any = temppoints[1];
                                if (tmpSteps == 0) {
                                    tmpSteps = val;
                                } else {
                                    tmpSteps += val;
                                }
                                if (tmpSteps >= steps) {
                                    tmpPoints1[`${key}`] = 1;
                                    tmpSteps = (tmpSteps - steps);
                                }
                            }
                        }
                    }
                }
                const tmpPoints1CBD: Record<string, number> = {};
                if(Object.keys(tmppointsCBD)?.length > 0){
                    if(frequincy == 'D'){
                        for (let entryCBD of Object.entries(tmppointsCBD)) {
                            let keyCBD = entryCBD[0];
                            let valCBD = entryCBD[1];
                            if (valCBD >= steps) {
                                tmpPoints1CBD[`${keyCBD}`] = 1;
                            }
                        }
                    }else{
                        if (frequincy == "W" || frequincy == "M" || frequincy == "Y") {
                            const weeklyArray: Record<string, { steps: number; dateCBD: string }> = {};
                            for (let temppointsCBD of Object.entries(tmppointsCBD)) {
                                let dateCBD = temppointsCBD[0];
                                let valueCBD:any = temppointsCBD[1];
                                let WMYNo:any = '';
                                WMYNo = await this.commonDateService.getWeekMonthYearNo(dateCBD,frequincy);
                                if (weeklyArray[`"${WMYNo}"`]) {
                                    weeklyArray[`"${WMYNo}"`].steps += valueCBD;
                                    weeklyArray[`"${WMYNo}"`].dateCBD = dateCBD;
                                } else {
                                    weeklyArray[`"${WMYNo}"`] = { steps: valueCBD, dateCBD };
                                }
                            }
                            if(Object.keys(weeklyArray)?.length > 0){
                                for (let entry of Object.values(weeklyArray)) {
                                    if (entry.steps >= steps) {
                                        tmpPoints1CBD[`${entry.dateCBD}`] = 1;
                                    }
                                }
                            }
                        }else{
                            let tmpStepsCBD = 0;
                            for (let temppointsCBD of Object.entries(tmppointsCBD)) {
                                let key = temppointsCBD[0];
                                let val:any = temppointsCBD[1];
                                if (tmpStepsCBD == 0) {
                                    tmpStepsCBD = val;
                                } else {
                                    tmpStepsCBD += val;
                                }
                                if (tmpStepsCBD >= steps) {
                                    tmpPoints1CBD[`${key}`] = 1;
                                    tmpStepsCBD = (tmpStepsCBD - steps);
                                }
                            }
                        }
                    }
                }
                return [{'M' : tmpPoints1} , {'M2' : tmpPoints1CBD}];
            }else{
                let hireDateSetting = myHireData['hireDateSetting'] || 0;
                let hireDateCount = myHireData['hireDateCount'] || 0;
                let countType = actDatas['count_type'];
                const userActivitys = await this.groupByUserId(activityDone);
                let actStartDate:any = await this.commonDateService.DateTimeFormat(allDateArray['actStartDate'],'YYYY-MM-DD');
                actStartDate = await this.commonDateService.DateTimeFormat(actStartDate,'timestamp');
                let actEndDate:any = await this.commonDateService.DateTimeFormat(allDateArray['actEndDate'],'YYYY-MM-DD');
                actEndDate = await this.commonDateService.DateTimeFormat(actEndDate,'timestamp');
                if (steps == "" || steps == 0) {
                    steps = 10000;
                }
                let stepOneData = {};
                if(Object.keys(userActivitys).length > 0){
                    for (let [key, value] of Object.entries(userActivitys)){
                        let tmppoints = {};
                        let tmppointsCBD = {};
                        let Role = '';
                        let on_insurance_plan = 0;
                        let locationId = '';
                        let departmentId = '';
                        let gender = '';
                        let age = 0;
                        let displayactStartDate = '';
                        let displayactStartDateTS = '';
                        if(hireDateSetting && hireDateSetting == 1 && hireDateCount && hireDateCount > 0){
                            actEndDate = this.commonDateService.getTodayDate(myHireData['startDate']).add(myHireData['totaldays'] || 0, 'days').format('YYYY-MM-DD');
                            actEndDate = await this.commonDateService.DateTimeFormat(actEndDate,'timestamp');
                        }
                        let newHireStartDate = myHireData['startDate'];
                        if(hireDateSetting && hireDateSetting == 1 && myHireData['allUsersDOHInfoData'][key] && myHireData['startDateTS'] < myHireData['allUsersDOHInfoData'][key]){
                            newHireStartDate = await this.commonDateService.DateTimeFormat(myHireData['allUsersDOHInfoData'][key],'tstodate','YYYY-MM-DD');
                            actEndDate = this.commonDateService.getTodayDate(newHireStartDate).add((myHireData['totaldays'] || 0) + 1, 'days').format('YYYY-MM-DD');
                            actEndDate = await this.commonDateService.DateTimeFormat(actEndDate,'timestamp');
                        }
                        if(hireDateSetting && hireDateSetting == 1 && hireDateCount && hireDateCount > 0){
                            displayactStartDate = (newHireStartDate != '') ? newHireStartDate : myHireData['startDate'] ;
                            displayactStartDateTS = await this.commonDateService.DateTimeFormat(displayactStartDate,'timestamp');
                            actStartDate = this.commonDateService.getTodayDate(displayactStartDate).subtract(myHireData['totaldays'] || 0, 'days').format('YYYY-MM-DD');
                            actStartDate = await this.commonDateService.DateTimeFormat(actStartDate,'timestamp');
                        }
                        for (let [keyAct, actDone] of Object.entries(value)) {
                            if(displayactStartDateTS != '' && displayactStartDateTS > await this.commonDateService.DateTimeFormat(actDone[field],'timestamp')){
                               actDone[field] = displayactStartDate;
                            }
                            let logDate = await this.commonDateService.DateTimeFormat(actDone[field],'timestamp');
                            logDate = await this.commonDateService.DateTimeFormat(logDate,'tstodate','YYYY-MM-DD');
                            logDate = await this.commonDateService.DateTimeFormat(logDate,'timestamp');
                            if (actStartDate <= logDate && logDate <= actEndDate) {
                                let date = await this.commonDateService.DateTimeFormat(logDate,'tstodate','DD-MM-YYYY');
                                if (`${date}` in tmppoints) {
                                    tmppoints[`${date}`] += actDone['steps'];
                                } else {
                                    tmppoints[`${date}`] = actDone['steps'];
                                }
                                if (call_from != 4 && (compDateFields != '' && compDateFields != null)) {
                                    let logDateComp = await this.commonDateService.DateTimeFormat(actDone[compDateFields],'timestamp');
                                    logDateComp = await this.commonDateService.DateTimeFormat(logDateComp,'tstodate','YYYY-MM-DD HH:mm:ss');
                                    logDateComp = await this.commonDateService.DateTimeFormat(logDateComp,'timestamp');
                                    let dateComp = await this.commonDateService.DateTimeFormat(logDateComp,'tstodate','DD-MM-YYYY');
                                    if (`${dateComp}` in tmppointsCBD) {
                                        tmppointsCBD[`${dateComp}`] += actDone['steps'];
                                    } else {
                                        tmppointsCBD[`${dateComp}`] = actDone['steps'];
                                    }
                                }
                            }
                            Role = actDone['role_id'];
                            on_insurance_plan = (actDone['on_insurance_plan'] == 'Yes') ? 1 : 0;
                            locationId = actDone['location'];
                            departmentId = actDone['department_id'];
                            gender = actDone['gender'];
                            age = Number(actDone['age']);
                        }
                        let frequincy = actDatas['frequincy'];
                        const tmpPoints1: Record<string, number> = {};
                        if(Object.keys(tmppoints)?.length > 0){
                            if(frequincy == 'D'){
                                for (let entry of Object.entries(tmppoints)) {
                                    let key = entry[0];
                                    let val = entry[1];
                                    if (val >= steps) {
                                        tmpPoints1[`${key}`] = 1;
                                    }
                                }
                            }else{
                                if (frequincy == "W" || frequincy == "M" || frequincy == "Y") {
                                    const weeklyArray: Record<string, { steps: number; date: string }> = {};
                                    for (let temppoints of Object.entries(tmppoints)) {
                                        let date = temppoints[0];
                                        let value:any = temppoints[1];
                                        let WMYNo:any = '';
                                        WMYNo = await this.commonDateService.getWeekMonthYearNo(date,frequincy);
                                        if (weeklyArray[`"${WMYNo}"`]) {
                                            weeklyArray[`"${WMYNo}"`].steps += value;
                                            weeklyArray[`"${WMYNo}"`].date = date;
                                        } else {
                                            weeklyArray[`"${WMYNo}"`] = { steps: value, date };
                                        }
                                    }
                                    if(Object.keys(weeklyArray).length > 0){
                                        for (let entry of Object.values(weeklyArray)) {
                                            if (entry.steps >= steps) {
                                                tmpPoints1[`${entry.date}`] = 1;
                                            }
                                        }
                                    }
                                }else{
                                    let tmpSteps = 0;
                                    for (let temppoints of Object.entries(tmppoints)) {
                                        let key = temppoints[0];
                                        let val:any = temppoints[1];
                                        if (tmpSteps == 0) {
                                            tmpSteps = val;
                                        } else {
                                            tmpSteps += val;
                                        }
                                        if (tmpSteps >= steps) {
                                            tmpPoints1[`${key}`] = 1;
                                            tmpSteps = (tmpSteps - steps);
                                        }
                                    }
                                }
                            }
                        }
                        const tmpPoints1CBD: Record<string, number> = {};
                        if(call_from != 4 && Object.keys(tmppointsCBD)?.length > 0){
                            if(frequincy == 'D'){
                                for (let entryCBD of Object.entries(tmppointsCBD)) {
                                    let keyCBD = entryCBD[0];
                                    let valCBD = entryCBD[1];
                                    if (valCBD >= steps) {
                                        tmpPoints1CBD[`${keyCBD}`] = 1;
                                    }
                                }
                            }else{
                                if (frequincy == "W" || frequincy == "M" || frequincy == "Y") {
                                    const weeklyArray: Record<string, { steps: number; dateCBD: string }> = {};
                                    for (let temppointsCBD of Object.entries(tmppointsCBD)) {
                                        let dateCBD = temppointsCBD[0];
                                        let valueCBD:any = temppointsCBD[1];
                                        let WMYNo:any = '';
                                        WMYNo = await this.commonDateService.getWeekMonthYearNo(dateCBD,frequincy);
                                        if (weeklyArray[`"${WMYNo}"`]) {
                                            weeklyArray[`"${WMYNo}"`].steps += valueCBD;
                                            weeklyArray[`"${WMYNo}"`].dateCBD = dateCBD;
                                        } else {
                                            weeklyArray[`"${WMYNo}"`] = { steps: valueCBD, dateCBD };
                                        }
                                    }
                                    if(Object.keys(weeklyArray)?.length > 0){
                                        for (let entry of Object.values(weeklyArray)) {
                                            if (entry.steps >= steps) {
                                                tmpPoints1CBD[`${entry.dateCBD}`] = 1;
                                            }
                                        }
                                    }
                                }else{
                                    let tmpStepsCBD = 0;
                                    for (let temppointsCBD of Object.entries(tmppointsCBD)) {
                                        let key = temppointsCBD[0];
                                        let val:any = temppointsCBD[1];
                                        if (tmpStepsCBD == 0) {
                                            tmpStepsCBD = val;
                                        } else {
                                            tmpStepsCBD += val;
                                        }
                                        if (tmpStepsCBD >= steps) {
                                            tmpPoints1CBD[`${key}`] = 1;
                                            tmpStepsCBD = (tmpStepsCBD - steps);
                                        }
                                    }
                                }
                            }
                        }
                        if(!stepOneData[key]){
                            stepOneData[key] = {};
                        }
                        let date = '';
                        if(countType != 1){
                            stepOneData[key]['M'] = tmpPoints1;
                            if (call_from != 4 && Object.keys(tmpPoints1CBD).length > 0) {
                                stepOneData[key]['M2'] = tmpPoints1CBD;
                            }
                            stepOneData[key]['Role'] = Role;
                            stepOneData[key]['on_insurance_plan'] = on_insurance_plan;
                            stepOneData[key]['location'] = locationId;
                            stepOneData[key]['department'] = departmentId;
                            stepOneData[key]['gender'] = gender;
                            stepOneData[key]['age'] = age;
                            stepOneData[key]['Time'] = '';
                            if(Object.keys(tmpPoints1).length > 0){
                            date = Object.keys(tmpPoints1)
                                .map((dateStr) => moment.utc(dateStr, 'DD-MM-YYYY'))
                                .reduce((latest, current) => (current.isAfter(latest) ? current : latest))
                                .format('YYYY-MM-DD');
                            stepOneData[key]['Time'] = date;   
                            }
                        }else{
                            date = '';
                            let TimeF = '';
                            if (Object.keys(tmpPoints1).length > 0 && tmppointsF[key]['Time']) {
                                date = Object.keys(tmpPoints1)
                                .map((key) => moment.utc(key, 'DD-MM-YYYY'))
                                .reduce((latest, current) => (current.isAfter(latest) ? current : latest))
                                .format('YYYY-MM-DD');
                                TimeF = tmppointsF[key]['Time'];
                            }
                            tmppointsF[key]['M'] = tmpPoints1;
                            if (call_from != 4 && Object.keys(tmpPoints1CBD).length > 0) {
                                tmppointsF[key]['M2'] = tmpPoints1CBD;
                            }
                            if (TimeF) {
                                tmppointsF[key]['Time'] = TimeF;
                            } else {
                                tmppointsF[key]['Time'] = '';
                            }
                            tmppointsF[key]['Role'] = Role;
                            tmppointsF[key]['on_insurance_plan'] = on_insurance_plan;
                            tmppointsF[key]['location'] = locationId;
                            tmppointsF[key]['department'] = departmentId;
                            tmppointsF[key]['gender'] = gender;
                            tmppointsF[key]['age'] = age;
                        }
                    }
                }
                if(countType != 1){
                    return stepOneData;
                }else{
                    return tmppointsF;
                }
            }
        }catch (error) {
            throw new Error(error.message); 
        }
    }
    async count_point_act_stepsother_avg(activityDone:any = [], actId:any = null, field:any = null, allDateArray:any = [], extraDataArray:any = []){
        try{
            let {
                compDateFields = null,
                joinType = null,
                userTimezone = '',
                getDataType = 'single',
                call_from = '',
                tType = 'NO',
                actDatas = null,
                steps = 0,
                myHireData = {}
            } = Object.assign({}, ...extraDataArray);
            if (actDatas) {
                steps = parseFloat(actDatas['steps']) || 0;
            }
            if(getDataType == 'single'){
                userTimezone = (userTimezone == '') ? 'UTC' : userTimezone;
                let tmppoints = [];
                let actStartDate:any = await this.commonDateService.DateTimeFormat(allDateArray['actStartDateM'],'YYYY-MM-DD');
                actStartDate = await this.commonDateService.DateTimeFormat(actStartDate,'timestamp');
                let actEndDate:any = await this.commonDateService.DateTimeFormat(allDateArray['actEndDateM'],'YYYY-MM-DD');
                actEndDate = await this.commonDateService.DateTimeFormat(actEndDate,'timestamp');
                for (let actDone of activityDone) {
                    if (tType == 'YES' && userTimezone != null && userTimezone != 'UTC') {
                        let tmpdata:any = await this.commonDateService.DateTimeFormat(actDone[field],'','','UTC');
                        tmpdata = await this.commonDateService.DateTimeFormat(tmpdata,'','', userTimezone);
                        actDone[field] = await this.commonDateService.DateTimeFormat(tmpdata,'YYYY-MM-DD HH:mm:ss');
                    }
                    let logDate = await this.commonDateService.DateTimeFormat(actDone[field],'timestamp');
                    logDate = await this.commonDateService.DateTimeFormat(logDate,'tstodate','YYYY-MM-DD');
                    logDate = await this.commonDateService.DateTimeFormat(logDate,'timestamp');
                    if (actStartDate <= logDate && logDate <= actEndDate) {
                        let date = await this.commonDateService.DateTimeFormat(logDate,'tstodate','DD-MM-YYYY');
                        if (`${date}` in tmppoints) {
                            tmppoints[`${date}`] += actDone['steps'];
                        } else {
                            tmppoints[`${date}`] = actDone['steps'];
                        }
                    }
                }   
                if (steps == "" || steps == 0) {
                    steps = 10000;
                }
                let frequincy = actDatas['frequincy'];
                let totalDaysStep:any = {};
                let totalDaysStepDate:any = {};
                let tmpPoints1:any = 0;
                let date = '';
                if(Object.keys(tmppoints)?.length > 0){
                    if(frequincy == 'D' || frequincy == 'U'){
                        const actStartDateO = moment(moment(allDateArray['actStartDateM']).format('YYYY-MM-DD'));
                        const actEndDateO = moment(moment(allDateArray['actEndDateM']).format('YYYY-MM-DD'));
                        const currentDate = await this.commonDateService.DateTimeFormat('now');
                        const totalDays = actEndDateO.diff(actStartDateO, 'days') + 1;
                        let totalDaysUpto = totalDays;
                        if (currentDate.isBefore(actEndDateO)) {
                            totalDaysUpto = currentDate.diff(actStartDateO, 'days') + 1;
                        }
                        const totalStepsWalked = Object.values(tmppoints).reduce((sum, val) => sum + val, 0);
                        if ((totalStepsWalked / totalDays) >= steps) {
                            tmpPoints1 = totalDaysUpto;
                        }
                    }else{
                        if (frequincy == "W" || frequincy == "M" || frequincy == "Y") {
                            const wmyArray: Record<string, { steps: number; date: string }> = {};
                            for (let temppoints of Object.entries(tmppoints)) {
                                let date = temppoints[0];
                                let value = temppoints[1];
                                let WMYNo:any = '';
                                WMYNo = await this.commonDateService.getWeekMonthYearNo(date,frequincy);
                                if (wmyArray[WMYNo]) {
                                    wmyArray[WMYNo] += value;
                                } else {
                                    wmyArray[WMYNo] = value;
                                }
                                totalDaysStepDate[WMYNo] = date;
                            }
                            if (frequincy === "W" || frequincy === "Y") {
                                let totaldaysstepwalk:any = frequincy === "W" ? 7 * steps : 365 * steps;
                                totalDaysStep = Object.fromEntries(
                                    Object.entries(wmyArray).filter(([_, value]) => value >= totaldaysstepwalk)
                                );
                                tmpPoints1 = Object.keys(totalDaysStep)?.length;;
                            }
                            if (frequincy === "M") {
                                totalDaysStep = Object.fromEntries(
                                    Object.entries(wmyArray).filter(([key, value]) => {
                                        const year = parseInt(key.slice(-4), 10);
                                        const month = parseInt(key.slice(0, -4), 10); 
                                        const daysInMonth = moment(`${year}-${month}`, "YYYY-M").daysInMonth();
                                        let totalMonthSteps:any = (daysInMonth * steps);
                                        return value >= totalMonthSteps;
                                    })
                                );
                                tmpPoints1 = Object.keys(totalDaysStep)?.length;
                                if(tmpPoints1 > 0){
                                    let endKey:any = Object.keys(totalDaysStep);
                                    endKey = endKey[endKey?.length - 1];
                                    date = totalDaysStepDate[endKey];
                                }
                            }
                        }
                    }
                }
                return [{'tempPoint' : tmpPoints1}, {'date' : date}];
            }else{
                let hireDateSetting = myHireData['hireDateSetting'] || 0;
                let hireDateCount = myHireData['hireDateCount'] || 0;
                const userActivitys = await this.groupByUserId(activityDone);
                let actStartDate:any = await this.commonDateService.DateTimeFormat(allDateArray['actStartDate'],'YYYY-MM-DD');
                actStartDate = await this.commonDateService.DateTimeFormat(actStartDate,'timestamp');
                let actEndDate:any = await this.commonDateService.DateTimeFormat(allDateArray['actEndDate'],'YYYY-MM-DD');
                actEndDate = await this.commonDateService.DateTimeFormat(actEndDate,'timestamp');
                if (steps == "" || steps == 0) {
                    steps = 10000;
                }
                let stepOneData = {};
                if(Object.keys(userActivitys).length > 0){
                    for (let [key, value] of Object.entries(userActivitys)){
                        let tmppoints = {};
                        let Role = '';
                        let on_insurance_plan = 0;
                        let locationId = '';
                        let departmentId = '';
                        let gender = '';
                        let age = 0;
                        let displayactStartDate = '';
                        let displayactStartDateTS = '';
                        if(hireDateSetting && hireDateSetting == 1 && hireDateCount && hireDateCount > 0){
                            actEndDate = this.commonDateService.getTodayDate(myHireData['startDate']).add(myHireData['totaldays'] || 0, 'days').format('YYYY-MM-DD');
                            actEndDate = await this.commonDateService.DateTimeFormat(actEndDate,'timestamp');
                        }
                        let newHireStartDate = myHireData['startDate'];
                        if(hireDateSetting && hireDateSetting == 1 && myHireData['allUsersDOHInfoData'][key] && myHireData['startDateTS'] < myHireData['allUsersDOHInfoData'][key]){
                            newHireStartDate = await this.commonDateService.DateTimeFormat(myHireData['allUsersDOHInfoData'][key],'tstodate','YYYY-MM-DD');
                            actEndDate = this.commonDateService.getTodayDate(newHireStartDate).add((myHireData['totaldays'] || 0) + 1, 'days').format('YYYY-MM-DD');
                            actEndDate = await this.commonDateService.DateTimeFormat(actEndDate,'timestamp');
                        }
                        if(hireDateSetting && hireDateSetting == 1 && hireDateCount && hireDateCount > 0){
                            displayactStartDate = (newHireStartDate != '') ? newHireStartDate : myHireData['startDate'] ;
                            displayactStartDateTS = await this.commonDateService.DateTimeFormat(displayactStartDate,'timestamp');
                            actStartDate = this.commonDateService.getTodayDate(displayactStartDate).subtract(myHireData['totaldays'] || 0, 'days').format('YYYY-MM-DD');
                            actStartDate = await this.commonDateService.DateTimeFormat(actStartDate,'timestamp');
                        }
                        for (let [keyAct, actDone] of Object.entries(value)) {
                            if(displayactStartDateTS != '' && displayactStartDateTS > await this.commonDateService.DateTimeFormat(actDone[field],'timestamp')){
                               actDone[field] = displayactStartDate;
                            }
                            let logDate = await this.commonDateService.DateTimeFormat(actDone[field],'timestamp');
                            logDate = await this.commonDateService.DateTimeFormat(logDate,'tstodate','YYYY-MM-DD');
                            logDate = await this.commonDateService.DateTimeFormat(logDate,'timestamp');
                            if (actStartDate <= logDate && logDate <= actEndDate) {
                                let date = await this.commonDateService.DateTimeFormat(logDate,'tstodate','DD-MM-YYYY');
                                if (`${date}` in tmppoints) {
                                    tmppoints[`${date}`] += actDone['steps'];
                                } else {
                                    tmppoints[`${date}`] = actDone['steps'];
                                }
                            }
                            
                            Role = actDone['role_id'];
                            on_insurance_plan = (actDone['on_insurance_plan'] == 'Yes') ? 1 : 0;
                            locationId = actDone['location'];
                            departmentId = actDone['department_id'];
                            gender = actDone['gender'];
                            age = Number(actDone['age']);
                        }
                        let frequincy = actDatas['frequincy'];
                        let totalDaysStep:any = {};
                        let tmpPoints1:any = 0;
                        let date = '';
                        if(Object.keys(tmppoints)?.length > 0){
                            if(frequincy == 'D' || frequincy == 'U'){
                                const actStartDateO = moment(moment(allDateArray['actStartDate']).format('YYYY-MM-DD'));
                                const actEndDateO = moment(moment(allDateArray['actEndDate']).format('YYYY-MM-DD'));
                                const currentDate = await this.commonDateService.DateTimeFormat('now');
                                const totalDays = actEndDateO.diff(actStartDateO, 'days') + 1;
                                let totalDaysUpto = totalDays;
                                if (currentDate.isBefore(actEndDateO)) {
                                    totalDaysUpto = currentDate.diff(actStartDateO, 'days') + 1;
                                }
                                const totalStepsWalked:any = Object.values(tmppoints).reduce((sum:number, val:number) => sum + val, 0);
                                if ((totalStepsWalked / totalDays) >= steps) {
                                    tmpPoints1 = totalDaysUpto;
                                }
                            }else{
                                if (frequincy == "W" || frequincy == "M" || frequincy == "Y") {
                                    const wmyArray: Record<string, { steps: number; date: string }> = {};
                                    const wmyDateArray = {};
                                    for (let temppoints of Object.entries(tmppoints)) {
                                        let date = temppoints[0];
                                        let valueT:any = temppoints[1];
                                        let WMYNo:any = '';
                                        WMYNo = await this.commonDateService.getWeekMonthYearNo(date,frequincy);
                                        if (wmyArray[WMYNo]) {
                                            wmyArray[WMYNo] += valueT;
                                        } else {
                                            wmyArray[WMYNo] = valueT;
                                        }
                                        wmyDateArray[WMYNo] = date;
                                    }
                                    if (frequincy === "W" || frequincy === "Y") {
                                        let totaldaysstepwalk:any = frequincy === "W" ? 7 * steps : 365 * steps;
                                        totalDaysStep = Object.fromEntries(
                                            Object.entries(wmyArray).filter(([_, valueTT]) => valueTT >= totaldaysstepwalk)
                                        );
                                        tmpPoints1 = Object.keys(totalDaysStep)?.length;;
                                    }
                                    if (frequincy === "M") {
                                        totalDaysStep = Object.fromEntries(
                                            Object.entries(wmyArray).filter(([key, valueTD]) => {
                                                const year = parseInt(key.slice(-4), 10);
                                                const month = parseInt(key.slice(0, -4), 10); 
                                                const daysInMonth = moment(`${year}-${month}`, "YYYY-M").daysInMonth();
                                                let totalMonthSteps:any = (daysInMonth * steps);
                                                return valueTD >= totalMonthSteps;
                                            })
                                        );
                                        tmpPoints1 = Object.keys(totalDaysStep)?.length;
                                        if(tmpPoints1 > 0){
                                            let endKey:any = Object.keys(totalDaysStep);
                                            endKey = endKey[endKey.length - 1];
                                            date = wmyDateArray[endKey];
                                            date = this.commonDateService.DateTimeFormat(date, 'YYYY-MM-DD','DD-MM-YYYY');
                                        }
                                    }
                                }
                            }
                        }
                        if(!stepOneData[key]){
                            stepOneData[key] = {};
                        }
                        if(tmpPoints1 > 0){
                            if(frequincy == 'D' || frequincy == 'U'){
                                date = await this.getActivityCompDate('normal', value, 'time', extraDataArray);
                            }
                            stepOneData[key]['Point'] = tmpPoints1;
                            stepOneData[key]['Time'] = date;
                            stepOneData[key]['Role'] = Role;
                            stepOneData[key]['on_insurance_plan'] = on_insurance_plan;
                            stepOneData[key]['location'] = locationId;
                            stepOneData[key]['department'] = departmentId;
                            stepOneData[key]['gender'] = gender;
                            stepOneData[key]['age'] = age;
                        }
                    }
                }
                return stepOneData;
            }
        }catch (error) {
            throw new Error(error.message); 
        }
    }   
    async multiplay_point(tmppoints:any = 0, actDatas:any = [])
    {
        try{
            let point_for_each = 0;
            let max_point = 0;
            if (actDatas) {
                point_for_each = actDatas['point_for_each'] || 0;
                max_point = actDatas['max_point'] || 0;
            }
            if (tmppoints != 0 && point_for_each != 0) {
                tmppoints = tmppoints * point_for_each;
            }
            if (tmppoints > max_point) {
                tmppoints = max_point;
            }
            return tmppoints;
        }catch (error) {
            throw new Error(error.message); 
        }
    }
    async multiplay_point_multiuser(type:any = 'normal', activityDone:any = [], tempUserData:any = {}, extraDataArray:any = []){
        try{
            let {
                tempDentists = {},
                actDatas = {},
                tmppointsF = {},
                GTime = null,
                myHireData = {},
            } = Object.assign({}, ...extraDataArray);
            let point_for_each = Number(actDatas['point_for_each'] || 0);
            let max_point = Number(actDatas['max_point'] || 0);
            let countType = Number(actDatas['count_type'] || 0);
            let actId = actDatas['activity_id'] || null;
            const userActivitys = await this.groupByUserId(activityDone);
            let hireDateSetting = Number(myHireData['hireDateSetting'] || 0);
            let hireDateCount = Number(myHireData['hireDateCount'] || 0);
            if(Object.keys(tempUserData).length > 0){
                for (let [key, value] of Object.entries(tempUserData)){
                    let date = '';
                    let finalsource = '';
                    let tmppoints = value['Point'];
                    if (countType == 1 && Object.keys(tmppointsF).length > 0 && tmppointsF[key]['Point']) {
                        tmppoints = tmppointsF[key]['Point'];
                    }
                    if (tmppoints != 0 && point_for_each != 0) {
                        tmppoints = tmppoints * point_for_each;
                    }
                    if (tmppoints > max_point) {
                        tmppoints = max_point;
                    }
                    if(tmppoints > 0){
                        if(actId == 49){
                            if (!tempDentists[key]) {
                                tempDentists[key] = 0;
                            }
                            if(tmppoints > 0 && tempDentists[key] && tempDentists[key] == 0){
                                userActivitys[key] = userActivitys[key].slice(0, 1);
                                tempDentists[key] += 1;
                            } else if (tmppoints > 0 && tempDentists[key] && tempDentists[key] > 0) {
                                userActivitys[key] = userActivitys[key].slice(tempDentists[key], tempDentists[key] + 1);
                                if (userActivitys[key].length == 0) {
                                    tmppoints = 0;
                                }
                                tempDentists[key] += 1;
                            }
                        }
                        date = await this.getActivityCompDate(type, JSON.parse(JSON.stringify(userActivitys[key])), 'time', extraDataArray);
                        if (type == 'act_bio') {
                            for (let actDone of userActivitys[key]) {
                                if (actDone['created']) {
                                    finalsource = actDone['source'];
                                }
                            }
                        }
                    }
                    if (date && date != '') {
                        let originalStartDate = myHireData['startDate'];
                        let originalStartDateTS = myHireData['startDateTS'];
                        if (hireDateSetting && hireDateCount && hireDateSetting == 1) {
                            let calcStartDate = originalStartDateTS;
                            if (myHireData['allUsersDOHInfoData'][key] && originalStartDateTS < myHireData['allUsersDOHInfoData'][key]) {
                                calcStartDate = myHireData['allUsersDOHInfoData'][key];
                            }
                            calcStartDate = this.commonDateService.DateTimeFormat(calcStartDate,'tstodate','YYYY-MM-DD');
                            let displayactStartDate = calcStartDate;
                            let actStartDate = this.commonDateService.getTodayDate(calcStartDate).subtract(myHireData['totaldays'] || 0, 'days').format('YYYY-MM-DD');
                            let actEndDate = this.commonDateService.getTodayDate(calcStartDate).add(myHireData['totaldays'] || 0, 'days').format('YYYY-MM-DD');
                            
                            if (calcStartDate !== originalStartDate) {
                                actEndDate = this.commonDateService.getTodayDate(actEndDate).add(1, 'days').format('YYYY-MM-DD');
                            }
                            if (!date || await this.commonDateService.DateTimeFormat(date,'timestamp') < await this.commonDateService.DateTimeFormat(displayactStartDate,'timestamp')) {
                                date = this.commonDateService.getTodayDate(displayactStartDate).format('YYYY-MM-DD');
                            }
                        }
                        tempUserData[key]['Point'] = Number(tmppoints);
                        if (GTime != 'NO') {
                            tempUserData[key]['Time'] = await this.commonDateService.DateTimeFormat(date,'YYYY-MM-DD','YYYY-MM-DD HH:mm:ss');
                        }
                        if (type == 'act_bio') {
                            tempUserData[key]['finalsource'] = finalsource;
                        }
                    }else{
                        tempUserData[key]['Point'] = 0;
                    }
                }
            }
            return [ { 'tempUserData' :  tempUserData, 'tempDentists': tempDentists }]
        }catch (error) {
            throw new Error(error.message); 
        }
    }
    async count_point_act_number(tmppointsData:any = [], extraDataArray:any = []){
        try{
            let {
                actDatas = [],
                marc = 0,
                call_from = '',
                getDataType = 'single'
            } = Object.assign({}, ...extraDataArray);
            let frequency = actDatas['frequincy'] || 'D';
            let steps = parseFloat(actDatas['steps']) || 1;
            let point_for_each = actDatas['point_for_each'] || 0;
            let max_point = actDatas['max_point'] || 0;
            if(getDataType == 'single'){
                const tmpPoints1: Record<string, number> = {};
                if(Object.keys(tmppointsData)?.length > 0){
                    if(frequency == 'D'){
                        for (let entry of Object.entries(tmppointsData)) {
                            let key = entry[0];
                            let val:any = entry[1];
                            if (val >= steps) {
                                tmpPoints1[`${key}`] = Math.floor(val / steps);
                            }
                        }
                    }else{
                        if (frequency == "W" || frequency == "M" || frequency == "Y") {
                            const weeklyArray: Record<string, { steps: number; date: string }> = {};
                            for (let temppoints of Object.entries(tmppointsData)) {
                                let date = temppoints[0];
                                let value:any = temppoints[1];
                                let WMYNo:any = '';
                                WMYNo = await this.commonDateService.getWeekMonthYearNo(date,frequency);
                                if (weeklyArray[`"${WMYNo}"`]) {
                                    weeklyArray[`"${WMYNo}"`].steps += parseFloat(value);
                                    weeklyArray[`"${WMYNo}"`].date = date;
                                } else {
                                    weeklyArray[`"${WMYNo}"`] = { steps: parseFloat(value), date };
                                }
                            }
                            if(Object.keys(weeklyArray)?.length > 0){
                                for (let entry of Object.values(weeklyArray)) {
                                    if (entry.steps >= steps) {
                                        tmpPoints1[`${entry.date}`] = Math.floor(entry.steps / steps);
                                    }
                                }
                            }
                        }else{
                            let tmpSteps = 0;
                            for (let temppoints of Object.entries(tmppointsData)) {
                                let key = temppoints[0];
                                let val:any = temppoints[1];
                                if (tmpSteps == 0) {
                                    tmpSteps = val;
                                } else {
                                    tmpSteps += val;
                                }
                                if (tmpSteps >= steps) {
                                    tmpPoints1[`${key}`] = Math.floor(tmpSteps / steps);
                                    tmpSteps = (tmpSteps - steps);
                                }
                            }
                        }
                    }
                }
                return tmpPoints1;
            }else{
                let tempPointUsers = {};
                if(Object.keys(tmppointsData).length > 0){
                    for (let [key, value] of Object.entries(tmppointsData)){
                        if(!tempPointUsers[key]){
                            tempPointUsers[key] = {};
                        }
                        let tmpPoints1 = {};
                        let tmpPoints1CBD = {};
                        let Role = value['Role'];
                        let on_insurance_plan = value['on_insurance_plan'];
                        let locationId = value['location'];
                        let departmentId = value['department_id'];
                        let gender = value['gender'];
                        let age = Number(value['age']);
                        delete(value['Role']);
                        delete(value['on_insurance_plan']);
                        delete(value['location']);
                        delete(value['department_id']);
                        delete(value['gender']);
                        delete(value['age']);
                        let tmppoints = {};
                        if (value['M']) {
                            tmppoints = value['M'];
                        } else {
                            tmppoints = value;
                        }
                        if(Object.keys(tmppoints)?.length > 0){
                            if(frequency == 'D'){
                                for (let entry of Object.entries(tmppoints)) {
                                    let key = entry[0];
                                    let val:any = entry[1];
                                    if (val >= steps) {
                                        tmpPoints1[`${key}`] = Math.floor(val / steps);
                                    }
                                }
                            }else{
                                if (frequency == "W" || frequency == "M" || frequency == "Y") {
                                    const weeklyArray: Record<string, { steps: number; date: string }> = {};
                                    for (let temppoints of Object.entries(tmppoints)) {
                                        let date = temppoints[0];
                                        let value:any = temppoints[1];
                                        let WMYNo:any = '';
                                        WMYNo = await this.commonDateService.getWeekMonthYearNo(date,frequency);
                                        if (weeklyArray[`"${WMYNo}"`]) {
                                            weeklyArray[`"${WMYNo}"`].steps += parseFloat(value);
                                            weeklyArray[`"${WMYNo}"`].date = date;
                                        } else {
                                            weeklyArray[`"${WMYNo}"`] = { steps: parseFloat(value), date };
                                        }
                                    }
                                    if(Object.keys(weeklyArray)?.length > 0){
                                        for (let entry of Object.values(weeklyArray)) {
                                            if (entry.steps >= steps) {
                                                tmpPoints1[`${entry.date}`] = Math.floor(entry.steps / steps);
                                            }
                                        }
                                    }
                                }else{
                                    let tmpSteps = 0;
                                    for (let temppoints of Object.entries(tmppoints)) {
                                        let key = temppoints[0];
                                        let val:any = temppoints[1];
                                        if (tmpSteps == 0) {
                                            tmpSteps = val;
                                        } else {
                                            tmpSteps += val;
                                        }
                                        if (tmpSteps >= steps) {
                                            tmpPoints1[`${key}`] = Math.floor(tmpSteps / steps);
                                            tmpSteps = (tmpSteps - steps);
                                        }
                                    }
                                }
                            }
                        }
                        let tmppointsCBD = {};
                        if (call_from != 4 && value['M2']) {
                            tmppointsCBD = value['M2'];
                        }
                        if(call_from != 4 && Object.keys(tmppointsCBD)?.length > 0){
                            if(frequency == 'D'){
                                for (let entryCBD of Object.entries(tmppointsCBD)) {
                                    let keyCBD = entryCBD[0];
                                    let valCBD:any = entryCBD[1];
                                    if (valCBD >= steps) {
                                        tmpPoints1CBD[`${keyCBD}`] = Math.floor(valCBD / steps);
                                    }
                                }
                            }else{
                                if (frequency == "W" || frequency == "M" || frequency == "Y") {
                                    const weeklyArrayCBD: Record<string, { steps: number; date: string }> = {};
                                    for (let temppointsCBD of Object.entries(tmppointsCBD)) {
                                        let dateCBD = temppointsCBD[0];
                                        let value:any = temppointsCBD[1];
                                        let WMYNoCBD:any = '';
                                        WMYNoCBD = await this.commonDateService.getWeekMonthYearNo(dateCBD,frequency);
                                        if (weeklyArrayCBD[`"${WMYNoCBD}"`]) {
                                            weeklyArrayCBD[`"${WMYNoCBD}"`].steps += parseFloat(value);
                                            weeklyArrayCBD[`"${WMYNoCBD}"`].date = dateCBD;
                                        } else {
                                            weeklyArrayCBD[`"${WMYNoCBD}"`] = { steps: parseFloat(value), date: dateCBD };
                                        }
                                    }
                                    if(Object.keys(weeklyArrayCBD)?.length > 0){
                                        for (let entryCBD of Object.values(weeklyArrayCBD)) {
                                            if (entryCBD.steps >= steps) {
                                                tmpPoints1CBD[`${entryCBD.date}`] = Math.floor(entryCBD.steps / steps);
                                            }
                                        }
                                    }
                                }else{
                                    let tmpStepsCBD = 0;
                                    for (let temppointsCBD of Object.entries(tmppointsCBD)) {
                                        let keyCBD = temppointsCBD[0];
                                        let valCBD:any = temppointsCBD[1];
                                        if (tmpStepsCBD == 0) {
                                            tmpStepsCBD = valCBD;
                                        } else {
                                            tmpStepsCBD += valCBD;
                                        }
                                        if (tmpStepsCBD >= steps) {
                                            tmpPoints1CBD[`${keyCBD}`] = Math.floor(tmpStepsCBD / steps);
                                            tmpStepsCBD = (tmpStepsCBD - steps);
                                        }
                                    }
                                }
                            }
                        }
                        tempPointUsers[key]['M'] = tmpPoints1;
                        if(call_from != 4){
                            tempPointUsers[key]['M2'] = tmpPoints1CBD;
                        }
                        tempPointUsers[key]['Role'] = Role;
                        tempPointUsers[key]['on_insurance_plan'] = on_insurance_plan;
                        tempPointUsers[key]['location'] = locationId;
                        tempPointUsers[key]['department'] = departmentId;
                        tempPointUsers[key]['gender'] = gender;
                        tempPointUsers[key]['age'] = age;
                    }
                }
                return tempPointUsers;
            }
        }catch (error) {
            throw new Error(error.message); 
        }
    }
    async count_point(activityDone:any = [], field:any = null, actStartDate:any = null, actEndDate:any = null){
        try{
            let tmppoints = 0;
            actStartDate = await this.commonDateService.DateTimeFormat(actStartDate,'YYYY-MM-DD');
            actStartDate = await this.commonDateService.DateTimeFormat(actStartDate,'timestamp');
            actEndDate = await this.commonDateService.DateTimeFormat(actEndDate,'YYYY-MM-DD');
            actEndDate = await this.commonDateService.DateTimeFormat(actEndDate,'timestamp');
            for (let actDone of activityDone) {
                let logDate = await this.commonDateService.DateTimeFormat(actDone[field],'timestamp');
                logDate = await this.commonDateService.DateTimeFormat(logDate,'tstodate','YYYY-MM-DD');
                logDate = await this.commonDateService.DateTimeFormat(logDate,'timestamp');
                if (actStartDate <= logDate && logDate <= actEndDate) {
                    tmppoints += 1;
                }
            }
            return tmppoints;
        }catch (error) {
            throw new Error(error.message); 
        }
    }
}

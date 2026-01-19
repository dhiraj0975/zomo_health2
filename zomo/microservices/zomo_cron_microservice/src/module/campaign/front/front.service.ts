import {
    appConstant,
    CampaignEntity,
    CommonDateService,
    tableConstant
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { Request } from "express";
import { SortingService } from 'src/module/common';
import { DataSource, Repository } from 'typeorm';
@Injectable()
export class FrontService {
    constructor(
        @InjectRepository(CampaignEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicacampaignRepository: Repository<CampaignEntity>,
        @InjectDataSource(appConstant.READ_REPLICA.toLowerCase()) 
        private readonly dataSource: DataSource,
        private readonly commonDateService: CommonDateService,
        private readonly sortingService: SortingService,
    ) {}
    async getDynamicRepository(entity: string | Function): Promise<Repository<any>> {
        return this.dataSource.getRepository(entity);
    }
    async getCampaignData(postData: any, req: Request = null, fields: any = ['campaign.id', 'campaign.campaign_name', 'campaign.tab_titled', 'campaign.tab_order']) {
        try{
            let currentOnlyDate = this.commonDateService.DateTimeFormat('now', 'YYYY-MM-DD','','UTC');
            let currentDate = currentOnlyDate + ' 00:00:00';
            let company_id = Number(postData?.company_id);
            let department_id = Number(postData?.department_id) || 0;
            let location_id = Number(postData?.location_id) || 0;
            let call_from = Number(postData?.call_from);
            let call_for = postData?.call_for || '';
            let challenge_start_date = postData?.challenge_start_date || currentDate;
            let challenge_end_date = postData?.challenge_end_date || currentOnlyDate + ' 23:59:59';
            let condition: any = `campaign.organization_id = ${company_id} AND campaign.status = 1`;
            if (call_from != 4) {
                condition += ` AND (
                    campaign.department_ids REGEXP '^${department_id},' OR
                    campaign.department_ids REGEXP ',${department_id}$' OR
                    campaign.department_ids REGEXP ',${department_id},' OR
                    campaign.department_ids = ${department_id} OR
                    campaign.department_ids is null OR
                    campaign.department_ids = '0'
                )
                AND (
                    campaign.location_ids REGEXP '^${location_id},' OR
                    campaign.location_ids REGEXP ',${location_id}$' OR
                    campaign.location_ids REGEXP ',${location_id},' OR
                    campaign.location_ids = ${location_id} OR
                    campaign.location_ids is null OR
                    campaign.location_ids = '0'
                )`;
            }
            let firstCondition = condition;
            if (call_from === 2) { /* campaign summary api call */
                if(call_for === 'current') {
                    firstCondition += ` AND campaign.d_start_date <= '${currentDate}' AND campaign.d_end_date >= '${currentDate}'`;
                } else {
                    firstCondition += ` AND campaign.end_date <= '${currentDate}'`;
                }
            } else if (call_from === 3) { /* challenge api call */
                firstCondition += ` AND campaign.d_start_date >= '${currentDate}'
                AND campaign.d_end_date <= '${currentDate}'
                AND campaign.start_date >= '${challenge_start_date}'
                AND campaign.end_date <= '${challenge_end_date}'`;
            } else { /* org dashboard for 4 and user dashboard for 1 api call */
                firstCondition += ` AND campaign.d_start_date <= '${currentDate}' AND campaign.d_end_date >= '${currentDate}'`;
            }
            let orderBy:any = { end_date: 'DESC' };
            let limit = 0;
            if(call_from === 6){ /* User LeaderBoard internally call */
                orderBy = { d_end_date : 'DESC' };
                limit = 1;
            }
            let campaigns = await this.getCampaignList(firstCondition, orderBy, fields, limit);
            if (campaigns.length === 0 && call_from === 2 && call_for === 'current') { /* campaign summary api call */
                campaigns = await this.getCampaignList(condition, orderBy, fields);
            }
            if (campaigns.length === 0 && call_from === 3 && call_for === '') { /* challenge api call */
                let secondCondition = condition += ` AND campaign.start_date >= '${challenge_start_date}' AND campaign.end_date <= '${challenge_end_date}'`;
                campaigns = await this.getCampaignList(secondCondition, orderBy, fields, 1);
            }
            if (campaigns.length === 0 && call_from === 4) { /* org dashboard api call */
                let secondCondition = condition;
                campaigns = await this.getCampaignList(secondCondition, orderBy, fields, 1);
            }
            if (campaigns && campaigns.length > 0) {
                campaigns = await this.sortingService.sortCampaignData('asc', campaigns, 'tab_order', 'tab_titled');
            }
            return campaigns;
        }catch (error) {
            throw new Error(error.message);
        }
    }
    async getCampaignList(condition: any, orderBy: any = null, fields: any = ['campaign.id', 'campaign.campaign_name', 'campaign.tab_titled', 'campaign.tab_order'], limit: number = 0) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        let query = this.readReplicacampaignRepository.createQueryBuilder('campaign')
            .innerJoinAndMapMany(
                'campaign.campaign_reward',
                tableConstant.CAMPAIGN.TBL_IN_CAMPAIGN_REWARD,
                'campaign_reward',
                'campaign_reward.campaign_id = campaign.id AND campaign_reward.status = 1 AND ((campaign_reward.related_activity != "" OR campaign_reward.related_activity IS NOT NULL) OR (campaign_reward.related_challenge != "" OR campaign_reward.related_challenge IS NOT NULL) OR (campaign_reward.related_category != "" OR campaign_reward.related_category IS NOT NULL))'
            )
            .select(fields)
            .where(condition)
            .orderBy(`campaign.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]]);
            if (limit > 0) {
                query = query.limit(limit);
            }
            return await  query.getMany();
    }
    async calculate_frequency(type:any = 'normal', tempPointsFL:any = [], extraDataArray:any = []){
        try{
            let {
                compDateFields = null,
                actDatas = null,
                limit_act = 0,
                call_from = '',
                userTimezone = '',
                getDataType = 'single'
            } = Object.assign({}, ...extraDataArray);
            let frequincy = actDatas['frequincy'] || 'D';
            let frequincy_max_point = Number(actDatas['frequincy_max_point'] || 0);
            let point_for_each = Number(actDatas['point_for_each'] || 0);
            let marc = Number(actDatas['min_act_req_camp'] || 0);
            let max_point = Number(actDatas['max_point'] || 0);

            if(getDataType == 'single'){
                const checkM = tempPointsFL.find((item) => 'M' in item);
                let tmppoints = {};
                if (checkM) {
                    tmppoints = checkM['M'];
                } else {
                    tmppoints = tempPointsFL;
                }
                const allActivity: any[] = [];
                const actTotalPointArray: Record<string, number> = {};
                const wmyOdate: string[] = [];
                const wmyArray: Record<string, any> = {};
                const wmyDateArray: Record<string, string> = {};
                if(frequincy == 'D' || frequincy == 'U'){
                    for (let tmppointss of Object.entries(tmppoints)) {
                        let date = tmppointss[0];
                        let value:any = tmppointss[1];
                        if (type === 'act_bio' || type === 'act') {
                            value = Array.from(new Set(value)); // Unique values
                            value = value.filter((v) => !allActivity.includes(v)); // Remove already included activities
                            if(frequincy == 'D'){
                                value = value.slice(0, limit_act); // Limit to max activities
                                value = value.filter((v) => !allActivity.includes(v)); // Deduplicate again
                            }
                            allActivity.push(...value); // Add to all activities
                            value = Array.from(new Set(value)).filter(Boolean)?.length; // Count unique, non-empty values
                        }
                        let pointTMP = point_for_each * value;
                        if(frequincy == 'D'){
                            if (pointTMP > frequincy_max_point) {
                                pointTMP = frequincy_max_point;
                            }
                        }
                        pointTMP = pointTMP > 0 ? pointTMP / point_for_each : 0;
                        tmppoints[date] = pointTMP;
                        const totalPoints = Object.values(actTotalPointArray).reduce((sum, v) => sum + v, 0);
                        if ((totalPoints + (pointTMP * point_for_each) <= max_point || totalPoints != max_point)) {
                            if (totalPoints + pointTMP * point_for_each > max_point) {
                                actTotalPointArray[date] = max_point - totalPoints;
                            } else {
                                actTotalPointArray[date] = pointTMP * point_for_each;
                            }
                        }
                    }
                }
                if(frequincy == 'W' || frequincy == 'M' || frequincy == 'Y'){
                    for (let tmppointss of Object.entries(tmppoints)) {
                        let date = tmppointss[0];
                        let value:any = tmppointss[1];
                        let WMYNo:any = '';
                        WMYNo = await this.commonDateService.getWeekMonthYearNo(date,frequincy);
                        if (wmyArray[`"${WMYNo}"`]) {
                            if (type === 'act_bio' || type === 'act') {
                                wmyArray[`"${WMYNo}"`] = Array.from(new Set([...wmyArray[`"${WMYNo}"`], ...value]));
                                wmyDateArray[`"${WMYNo}"`] = date;
                            } else {
                                wmyArray[`"${WMYNo}"`] += value;
                                wmyDateArray[`"${WMYNo}"`] = date;
                            }
                        } else {
                            wmyArray[`"${WMYNo}"`] = value;
                            wmyDateArray[`"${WMYNo}"`] = date;
                        }
                    }
                    for (let weekData of Object.entries(wmyArray)) {
                        let date = weekData[0];
                        let value = weekData[1];
                        if (type === 'act_bio' || type === 'act') {
                            if (Array.isArray(value)) {
                            value = Array.from(new Set(value)); // Unique values
                            value = value.filter((v) => !allActivity.includes(v)); // Remove already included activities
                            value = value.slice(0, limit_act); // Limit to max activities
                            value = value.filter((v) => !allActivity.includes(v)); // Deduplicate again
                            allActivity.push(...value); // Add to all activities
                            value = Array.from(new Set(value)).filter(Boolean)?.length; // Count unique, non-empty values
                            }
                        }
                        let pointTMP = point_for_each * value;
                        if (pointTMP > frequincy_max_point) {
                        pointTMP = frequincy_max_point;
                        }
                        pointTMP = pointTMP > 0 ? pointTMP / point_for_each : 0;
                        wmyArray[date] = pointTMP;
                        const dateW = wmyDateArray[date];
                        const totalPoints = Object.values(actTotalPointArray).reduce((sum, v) => sum + v, 0);
                        if ((totalPoints + (pointTMP * point_for_each) <= max_point || totalPoints != max_point) && !wmyOdate.includes(dateW)) {
                            if (totalPoints + pointTMP * point_for_each > max_point) {
                            actTotalPointArray[dateW] = max_point - totalPoints;
                            } else {
                            actTotalPointArray[dateW] = pointTMP * point_for_each;
                            }
                            wmyOdate.push(dateW);
                        }
                    }
                    tmppoints = wmyArray;
                }
                const checkM2 = tempPointsFL.find((item) => 'M2' in item);
                let tmppointsCBD = {};
                if (checkM2) {
                    tmppointsCBD = checkM2['M2'];
                }
                const actTotalPointArrayCBD: Record<string, number> = {};
                if(compDateFields && compDateFields != null && Object.keys(tmppointsCBD)?.length > 0){
                    const allActivityCBD: any[] = [];
                    const wmyOdateCBD: string[] = [];
                    const wmyArrayCBD: Record<string, any> = {};
                    const wmyDateArrayCBD: Record<string, string> = {};
                    if(frequincy == 'D' || frequincy == 'U'){
                        for (let tmppointssCBD of Object.entries(tmppointsCBD)) {
                            let dateCBD = tmppointssCBD[0];
                            let valueCBD:any = tmppointssCBD[1];
                            if (type === 'act_bio' || type === 'act') {
                                valueCBD = Array.from(new Set(valueCBD)); // Unique values
                                valueCBD = valueCBD.filter((v) => !allActivityCBD.includes(v)); // Remove already included activities
                                if(frequincy == 'D'){
                                    valueCBD = valueCBD.slice(0, limit_act); // Limit to max activities
                                    valueCBD = valueCBD.filter((v) => !allActivityCBD.includes(v)); // Deduplicate again
                                }
                                allActivityCBD.push(...valueCBD); // Add to all activities
                                valueCBD = Array.from(new Set(valueCBD)).filter(Boolean)?.length; // Count unique, non-empty values
                            }
                            let pointTMPCBD = point_for_each * valueCBD;
                            if(frequincy == 'D'){
                                if (pointTMPCBD > frequincy_max_point) {
                                    pointTMPCBD = frequincy_max_point;
                                }
                            }
                            pointTMPCBD = pointTMPCBD > 0 ? pointTMPCBD / point_for_each : 0;
                            tmppointsCBD[dateCBD] = pointTMPCBD;
                            const totalPointsCBD = Object.values(actTotalPointArrayCBD).reduce((sum, v) => sum + v, 0);
                            if ((totalPointsCBD + (pointTMPCBD * point_for_each) <= max_point || totalPointsCBD != max_point)) {
                                if (totalPointsCBD + pointTMPCBD * point_for_each > max_point) {
                                    actTotalPointArrayCBD[dateCBD] = max_point - totalPointsCBD;
                                } else {
                                    actTotalPointArrayCBD[dateCBD] = pointTMPCBD * point_for_each;
                                }
                            }
                        }
                    }
                    if(frequincy == 'W' || frequincy == 'M' || frequincy == 'Y'){
                        for (let tmppointssCBD of Object.entries(tmppointsCBD)) {
                            let dateCBD = tmppointssCBD[0];
                            let valueCBD:any = tmppointssCBD[1];
                            let WMYNo:any = '';
                            WMYNo = await this.commonDateService.getWeekMonthYearNo(dateCBD,frequincy);
                            if (wmyArrayCBD[`"${WMYNo}"`]) {
                                if (type === 'act_bio' || type === 'act') {
                                    wmyArrayCBD[`"${WMYNo}"`] = Array.from(new Set([...wmyArrayCBD[`"${WMYNo}"`], ...valueCBD]));
                                    wmyDateArrayCBD[`"${WMYNo}"`] = dateCBD;
                                } else {
                                    wmyArrayCBD[`"${WMYNo}"`] += valueCBD;
                                    wmyDateArrayCBD[`"${WMYNo}"`] = dateCBD;
                                }
                            } else {
                                wmyArrayCBD[`"${WMYNo}"`] = valueCBD;
                                wmyDateArrayCBD[`"${WMYNo}"`] = dateCBD;
                            }
                        }
                        for (let weekData of Object.entries(wmyArrayCBD)) {
                            let dateCBD = weekData[0];
                            let valueCBD = weekData[1];
                            if (type === 'act_bio' || type === 'act') {
                                if (Array.isArray(valueCBD)) {
                                valueCBD = Array.from(new Set(valueCBD)); // Unique values
                                valueCBD = valueCBD.filter((v) => !allActivityCBD.includes(v)); // Remove already included activities
                                valueCBD = valueCBD.slice(0, limit_act); // Limit to max activities
                                valueCBD = valueCBD.filter((v) => !allActivityCBD.includes(v)); // Deduplicate again
                                allActivityCBD.push(...valueCBD); // Add to all activities
                                valueCBD = Array.from(new Set(valueCBD)).filter(Boolean)?.length; // Count unique, non-empty values
                                }
                            }
                            let pointTMPCBD = point_for_each * valueCBD;
                            if (pointTMPCBD > frequincy_max_point) {
                                pointTMPCBD = frequincy_max_point;
                            }
                            pointTMPCBD = pointTMPCBD > 0 ? pointTMPCBD / point_for_each : 0;
                            wmyArrayCBD[dateCBD] = pointTMPCBD;
                            const dateW = wmyDateArrayCBD[dateCBD];
                            const totalPointsCBD = Object.values(actTotalPointArrayCBD).reduce((sum, v) => sum + v, 0);
                            if ((totalPointsCBD + (pointTMPCBD * point_for_each) <= max_point || totalPointsCBD != max_point) && !wmyOdateCBD.includes(dateW)) {
                                if (totalPointsCBD + pointTMPCBD * point_for_each > max_point) {
                                actTotalPointArrayCBD[dateW] = max_point - totalPointsCBD;
                                } else {
                                actTotalPointArrayCBD[dateW] = pointTMPCBD * point_for_each;
                                }
                                wmyOdateCBD.push(dateW);
                            }
                        }
                        tmppointsCBD = wmyArrayCBD;
                    }
                }
                let tmpPointTmp = 0;
                for (const [date, value] of Object.entries(tmppoints)) {
                    if (typeof value === 'number') {
                        tmpPointTmp += value;
                    }
                }
                if (type === 'act_bio' || type === 'act') {
                    if (allActivity?.length >= marc) {
                        tmpPointTmp = tmpPointTmp;
                    } else {
                        tmpPointTmp = 0;
                    }
                }
                return [{'tempPoint' : parseFloat(tmpPointTmp.toFixed(2))}, {'compDateArray' : actTotalPointArray}, {'rewardCompAry' : actTotalPointArrayCBD}];
            }else{
                let allCustomPointDatas = {};
                if (extraDataArray) {
                    const activityCustomPointObj = extraDataArray.find((item) => 'allCustomPointDatas' in item);
                    allCustomPointDatas = activityCustomPointObj ? activityCustomPointObj.allCustomPointDatas : {};
                }
                let tempPointUsers = {};
                if(Object.keys(tempPointsFL).length > 0){
                    for (let [key, value] of Object.entries(tempPointsFL)){
                        if(!tempPointUsers[key]){
                            tempPointUsers[key] = {};
                        }
                        tempPointUsers[key]['Role'] = value['Role'];
                        tempPointUsers[key]['on_insurance_plan'] = value['on_insurance_plan'];
                        tempPointUsers[key]['location'] = value['location'];
                        tempPointUsers[key]['department'] = value['department'];
                        tempPointUsers[key]['gender'] = value['gender'];
                        tempPointUsers[key]['age'] = Number(value['age']);
                        delete(value['Role']);
                        delete(value['on_insurance_plan']); 
                        delete(value['location']);
                        delete(value['department']);
                        delete(value['gender']);
                        delete(value['age']);
                        if (value['Time']) {
                            tempPointUsers[key]['Time'] = value['Time'];
                            delete(value['Time']);
                        }
                        let tmppoints = {};
                        if (value['M']) {
                            tmppoints = value['M'];
                        } else {
                            tmppoints = value;
                        }
                        const allActivity: any[] = [];
                        const actTotalPointArray: Record<string, number> = {};
                        const wmyOdate: string[] = [];
                        const wmyArray: Record<string, any> = {};
                        const wmyDateArray: Record<string, string> = {};
                        if(frequincy == 'D' || frequincy == 'U'){
                            for (let tmppointss of Object.entries(tmppoints)) {
                                let date = tmppointss[0];
                                let value:any = tmppointss[1];
                                if (type === 'act_bio' || type === 'act') {
                                    value = Array.from(new Set(value)); // Unique values
                                    value = value.filter((v) => !allActivity.includes(v)); // Remove already included activities
                                    if(frequincy == 'D'){
                                        value = value.slice(0, limit_act); // Limit to max activities
                                        value = value.filter((v) => !allActivity.includes(v)); // Deduplicate again
                                    }
                                    allActivity.push(...value); // Add to all activities
                                    value = Array.from(new Set(value)).filter(Boolean)?.length; // Count unique, non-empty values
                                }
                                let pointTMP = point_for_each * value;
                                if(frequincy == 'D'){
                                    if (pointTMP > frequincy_max_point) {
                                        pointTMP = frequincy_max_point;
                                    }
                                }
                                pointTMP = pointTMP > 0 ? pointTMP / point_for_each : 0;
                                tmppoints[date] = pointTMP;
                                const totalPoints = Object.values(actTotalPointArray).reduce((sum, v) => sum + v, 0);
                                if ((totalPoints + (pointTMP * point_for_each) <= max_point || totalPoints != max_point)) {
                                    if (totalPoints + pointTMP * point_for_each > max_point) {
                                        actTotalPointArray[date] = max_point - totalPoints;
                                    } else {
                                        actTotalPointArray[date] = pointTMP * point_for_each;
                                    }
                                }
                            }
                        }
                        if(frequincy == 'W' || frequincy == 'M' || frequincy == 'Y'){
                            for (let tmppointss of Object.entries(tmppoints)) {
                                let date = tmppointss[0];
                                let value:any = tmppointss[1];
                                let WMYNo:any = '';
                                WMYNo = await this.commonDateService.getWeekMonthYearNo(date,frequincy);
                                if (wmyArray[`"${WMYNo}"`]) {
                                    if (type === 'act_bio' || type === 'act') {
                                        wmyArray[`"${WMYNo}"`] = Array.from(new Set([...wmyArray[`"${WMYNo}"`], ...value]));
                                        wmyDateArray[`"${WMYNo}"`] = date;
                                    } else {
                                        wmyArray[`"${WMYNo}"`] += value;
                                        wmyDateArray[`"${WMYNo}"`] = date;
                                    }
                                } else {
                                    wmyArray[`"${WMYNo}"`] = value;
                                    wmyDateArray[`"${WMYNo}"`] = date;
                                }
                            }
                            for (let weekData of Object.entries(wmyArray)) {
                                let date = weekData[0];
                                let value = weekData[1];
                                if (type === 'act_bio' || type === 'act') {
                                    if (Array.isArray(value)) {
                                    value = Array.from(new Set(value)); // Unique values
                                    value = value.filter((v) => !allActivity.includes(v)); // Remove already included activities
                                    value = value.slice(0, limit_act); // Limit to max activities
                                    value = value.filter((v) => !allActivity.includes(v)); // Deduplicate again
                                    allActivity.push(...value); // Add to all activities
                                    value = Array.from(new Set(value)).filter(Boolean)?.length; // Count unique, non-empty values
                                    }
                                }
                                let pointTMP = point_for_each * value;
                                if (pointTMP > frequincy_max_point) {
                                pointTMP = frequincy_max_point;
                                }
                                pointTMP = pointTMP > 0 ? pointTMP / point_for_each : 0;
                                wmyArray[date] = pointTMP;
                                const dateW = wmyDateArray[date];
                                const totalPoints = Object.values(actTotalPointArray).reduce((sum, v) => sum + v, 0);
                                if ((totalPoints + (pointTMP * point_for_each) <= max_point || totalPoints != max_point) && !wmyOdate.includes(dateW)) {
                                    if (totalPoints + pointTMP * point_for_each > max_point) {
                                    actTotalPointArray[dateW] = max_point - totalPoints;
                                    } else {
                                    actTotalPointArray[dateW] = pointTMP * point_for_each;
                                    }
                                    wmyOdate.push(dateW);
                                }
                            }
                            tmppoints = wmyArray;
                        }
                        let tmpPointTmp = 0;
                        for (const [date, value] of Object.entries(tmppoints)) {
                            if (typeof value === 'number') {
                                tmpPointTmp += value;
                            }
                        }
                        if (type === 'act_bio' || type === 'act') {
                            if (allActivity?.length >= marc) {
                                tmpPointTmp = tmpPointTmp;
                            } else {
                                tmpPointTmp = 0;
                            }
                        }
                        tempPointUsers[key]['Point'] = Number(tmpPointTmp);
                        const activityTotal:any = Object.values(actTotalPointArray).reduce((sum:any, value:any) => sum + value, 0);
                        if (call_from != 4 && allCustomPointDatas && allCustomPointDatas[key] && allCustomPointDatas[key].activityCompAry && Object.keys(allCustomPointDatas[key].activityCompAry).length > 0 && (activityTotal <= max_point || activityTotal !== max_point) ) {
                            for (let [keyCA, valueCA] of Object.entries(allCustomPointDatas[key].activityCompAry)) {
                                valueCA = (typeof valueCA === 'string') ? parseFloat(valueCA) : valueCA;
                                const activityTotals = Object.values(actTotalPointArray).reduce((sum:any, value:any) => sum + value, 0);
                                if(activityTotals != max_point){
                                    let newValue = (activityTotals as number) + (valueCA as number);
                                    if(newValue > max_point){
                                        if(actTotalPointArray[keyCA]){
                                            actTotalPointArray[keyCA] += (max_point - (activityTotals as number));
                                        }else{
                                            actTotalPointArray[keyCA] = (max_point - (activityTotals as number));
                                        }
                                    }else{
                                        if(actTotalPointArray[keyCA]){
                                            actTotalPointArray[keyCA] += (valueCA as number);
                                        }else{
                                            actTotalPointArray[keyCA] = (valueCA as number);
                                        }
                                    }
                                }
                            }
                        }
                        if(call_from != 4){
                            tempPointUsers[key]['activityCompAry'] = actTotalPointArray;
                        }
                        let tmppointsCBD = {};
                        if (call_from != 4 && value['M2']) {
                            tmppointsCBD = value['M2'];
                        }
                        const actTotalPointArrayCBD: Record<string, number> = {};
                        if(call_from != 4 && compDateFields && compDateFields != null && Object.keys(tmppointsCBD)?.length > 0){
                            const allActivityCBD: any[] = [];
                            const wmyOdateCBD: string[] = [];
                            const wmyArrayCBD: Record<string, any> = {};
                            const wmyDateArrayCBD: Record<string, string> = {};
                            if(frequincy == 'D' || frequincy == 'U'){
                                for (let tmppointssCBD of Object.entries(tmppointsCBD)) {
                                    let dateCBD = tmppointssCBD[0];
                                    let valueCBD:any = tmppointssCBD[1];
                                    if (type === 'act_bio' || type === 'act') {
                                        valueCBD = Array.from(new Set(valueCBD)); // Unique values
                                        valueCBD = valueCBD.filter((v) => !allActivityCBD.includes(v)); // Remove already included activities
                                        if(frequincy == 'D'){
                                            valueCBD = valueCBD.slice(0, limit_act); // Limit to max activities
                                            valueCBD = valueCBD.filter((v) => !allActivityCBD.includes(v)); // Deduplicate again
                                        }
                                        allActivityCBD.push(...valueCBD); // Add to all activities
                                        valueCBD = Array.from(new Set(valueCBD)).filter(Boolean)?.length; // Count unique, non-empty values
                                    }
                                    let pointTMPCBD = point_for_each * valueCBD;
                                    if(frequincy == 'D'){
                                        if (pointTMPCBD > frequincy_max_point) {
                                            pointTMPCBD = frequincy_max_point;
                                        }
                                    }
                                    pointTMPCBD = pointTMPCBD > 0 ? pointTMPCBD / point_for_each : 0;
                                    tmppointsCBD[dateCBD] = pointTMPCBD;
                                    const totalPointsCBD = Object.values(actTotalPointArrayCBD).reduce((sum, v) => sum + v, 0);
                                    if ((totalPointsCBD + (pointTMPCBD * point_for_each) <= max_point || totalPointsCBD != max_point)) {
                                        if (totalPointsCBD + pointTMPCBD * point_for_each > max_point) {
                                            actTotalPointArrayCBD[dateCBD] = max_point - totalPointsCBD;
                                        } else {
                                            actTotalPointArrayCBD[dateCBD] = pointTMPCBD * point_for_each;
                                        }
                                    }
                                }
                            }
                            if(frequincy == 'W' || frequincy == 'M' || frequincy == 'Y'){
                                for (let tmppointssCBD of Object.entries(tmppointsCBD)) {
                                    let dateCBD = tmppointssCBD[0];
                                    let valueCBD:any = tmppointssCBD[1];
                                    let WMYNo:any = '';
                                    WMYNo = await this.commonDateService.getWeekMonthYearNo(dateCBD,frequincy);
                                    if (wmyArrayCBD[`"${WMYNo}"`]) {
                                        if (type === 'act_bio' || type === 'act') {
                                            wmyArrayCBD[`"${WMYNo}"`] = Array.from(new Set([...wmyArrayCBD[`"${WMYNo}"`], ...valueCBD]));
                                            wmyDateArrayCBD[`"${WMYNo}"`] = dateCBD;
                                        } else {
                                            wmyArrayCBD[`"${WMYNo}"`] += valueCBD;
                                            wmyDateArrayCBD[`"${WMYNo}"`] = dateCBD;
                                        }
                                    } else {
                                        wmyArrayCBD[`"${WMYNo}"`] = valueCBD;
                                        wmyDateArrayCBD[`"${WMYNo}"`] = dateCBD;
                                    }
                                }
                                for (let weekData of Object.entries(wmyArrayCBD)) {
                                    let dateCBD = weekData[0];
                                    let valueCBD = weekData[1];
                                    if (type === 'act_bio' || type === 'act') {
                                        if (Array.isArray(valueCBD)) {
                                        valueCBD = Array.from(new Set(valueCBD)); // Unique values
                                        valueCBD = valueCBD.filter((v) => !allActivityCBD.includes(v)); // Remove already included activities
                                        valueCBD = valueCBD.slice(0, limit_act); // Limit to max activities
                                        valueCBD = valueCBD.filter((v) => !allActivityCBD.includes(v)); // Deduplicate again
                                        allActivityCBD.push(...valueCBD); // Add to all activities
                                        valueCBD = Array.from(new Set(valueCBD)).filter(Boolean)?.length; // Count unique, non-empty values
                                        }
                                    }
                                    let pointTMPCBD = point_for_each * valueCBD;
                                    if (pointTMPCBD > frequincy_max_point) {
                                        pointTMPCBD = frequincy_max_point;
                                    }
                                    pointTMPCBD = pointTMPCBD > 0 ? pointTMPCBD / point_for_each : 0;
                                    wmyArrayCBD[dateCBD] = pointTMPCBD;
                                    const dateW = wmyDateArrayCBD[dateCBD];
                                    const totalPointsCBD = Object.values(actTotalPointArrayCBD).reduce((sum, v) => sum + v, 0);
                                    if ((totalPointsCBD + (pointTMPCBD * point_for_each) <= max_point || totalPointsCBD != max_point) && !wmyOdateCBD.includes(dateW)) {
                                        if (totalPointsCBD + pointTMPCBD * point_for_each > max_point) {
                                        actTotalPointArrayCBD[dateW] = max_point - totalPointsCBD;
                                        } else {
                                        actTotalPointArrayCBD[dateW] = pointTMPCBD * point_for_each;
                                        }
                                        wmyOdateCBD.push(dateW);
                                    }
                                }
                                tmppointsCBD = wmyArrayCBD;
                            }
                        }
                        const rewardTotal:any = Object.values(actTotalPointArrayCBD).reduce((sum:any, value:any) => sum + value, 0);
                        if (call_from != 4 && allCustomPointDatas && allCustomPointDatas[key] && allCustomPointDatas[key].rewardCompAry && Object.keys(allCustomPointDatas[key].rewardCompAry).length > 0 && (rewardTotal <= max_point || rewardTotal !== max_point) ) {
                            for (let [keyCA, valueCA] of Object.entries(allCustomPointDatas[key].rewardCompAry)) {
                                valueCA = (typeof valueCA === 'string') ? parseInt(valueCA) : valueCA;
                                const rewardTotals = Object.values(actTotalPointArrayCBD).reduce((sum:any, value:any) => sum + value, 0);
                                if(rewardTotals != max_point){
                                    let newValue = (rewardTotals as number) + (valueCA as number);
                                    if(newValue > max_point){
                                        if(actTotalPointArrayCBD[keyCA]){
                                            actTotalPointArrayCBD[keyCA] += (max_point - (rewardTotals as number));
                                        }else{
                                            actTotalPointArrayCBD[keyCA] = (max_point - (rewardTotals as number));
                                        }
                                    }else{
                                        if(actTotalPointArrayCBD[keyCA]){
                                            actTotalPointArrayCBD[keyCA] += (valueCA as number);
                                        }else{
                                            actTotalPointArrayCBD[keyCA] = (valueCA as number);
                                        }
                                    }
                                }
                            }
                        }
                        if(call_from != 4){
                            tempPointUsers[key]['rewardCompAry'] = actTotalPointArrayCBD;
                        }
                    }
                }
                return tempPointUsers;
            }
        }catch (error) {
            throw new Error(error.message); 
        }
    }

}

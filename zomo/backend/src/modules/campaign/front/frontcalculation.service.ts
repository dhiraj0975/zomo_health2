import { appConstant, CommonDateService } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { TranslationService } from 'src/modules/translation/translation.service';
import { SortingService } from '@/modules/common';
@Injectable()
export class FrontCalculationService {
    constructor(
        private readonly commonDateService: CommonDateService,
        private readonly translatorService: TranslationService,
        private readonly sortingService: SortingService,
        
    ) {}
    async getCampaignUserCalculation(call_from:any = '', rewardDatas:any = [], otherDatas:any = [],  req:any){
        try{
            let {
                totalUsers = 0,
            } = Object.assign({}, ...otherDatas);
            let sk = 0;
            let rewardWiseUsers = {};
            for (let rewardData of rewardDatas) {
                if(!rewardWiseUsers[sk]){
                    rewardWiseUsers[sk] = {};
                }
                rewardWiseUsers[sk] = rewardData;
                let userPointsTotal = {};
                let userPointsTotalOVL = {};
                let userPointsTotalActivityOVL = {};
                let userActivityTotal = {};
                let tempR = {};
                let totalActivity = 0;
                let totalActivityS = 0;
                let maxPoint = 0;
                let rewardId = rewardData['id'];
                if (rewardData?.['InsReward'] && rewardData['InsReward']?.length > 0) {
                    for(let insData of rewardData['InsReward']){
                        if(!insData['point']){
                            insData['point'] = 0;
                        }
                        insData['point'] = insData['point_user'];
                        if(insData['point_spouse'] != 0 && insData['point_spouse'] != ''){
                            insData['pointS'] = insData['point_spouse'];
                        }else{
                            insData['pointS'] = insData['point_user'];
                        }
                        if (insData['point_user'] > maxPoint) {
                            maxPoint = insData['point_user'];
                        }
                        insData['rType'] = 'insurance';
                        delete(insData['point_spouse']);
                        delete(insData['point_user']);
                    }
                }
                if (rewardData?.['cashReward'] && rewardData['cashReward']?.length > 0) {
                    for(let cashData of rewardData['cashReward']){
                        if(!cashData['point']){
                            cashData['point'] = 0;
                        }
                        cashData['point'] = cashData['point_user'];
                        if(cashData['point_spouse'] != 0 && cashData['point_spouse'] != ''){
                            cashData['pointS'] = cashData['point_spouse'];
                        }else{
                            cashData['pointS'] = cashData['point_user'];
                        }
                        if (cashData['point_user'] > maxPoint) {
                            maxPoint = cashData['point_user'];
                        }
                        cashData['rType'] = 'cash';
                        delete(cashData['point_spouse']);
                        delete(cashData['point_user']);
                    }
                }
                if (rewardData?.['otherReward'] && rewardData['otherReward']?.length > 0) {
                    for(let otherData of rewardData['otherReward']){
                        if(!otherData['point']){
                            otherData['point'] = 0;
                        }
                        otherData['point'] = otherData['point'];
                        otherData['pointS'] = otherData['point'];
                        if (otherData['point'] > maxPoint) {
                            maxPoint = otherData['point'];
                        }
                        otherData['rType'] = 'other';
                    }
                }
                let finalSubRewardArray = [
                    ...rewardData['InsReward'],
                    ...rewardData['cashReward'],
                    ...rewardData['otherReward'],
                ];
                /* finalSubRewardArray = await this.sortingService.sortCampaignData('asc', finalSubRewardArray, 'order_id', 'id'); */
                let acSK = 1;
                let completeLOneAll = {}, completeLOneUser = {}, completeLOneSpouse = {}, completeLOneCOFFHP = {}, completeLOneOFFHPU = {}, completeLOneOFFHPS = {};
                if (rewardData['Campaignactivity'] && rewardData['Campaignactivity']?.length > 0) {
                    if(!rewardWiseUsers[sk]['Campaignactivity']){
                        rewardWiseUsers[sk]['Campaignactivity'] = {};
                    }
                    let skl = 0;
                    for (let actData of rewardData['Campaignactivity']) {
                        let complete = 0, notcomplete = 0;
                        let completeS = 0, notcompleteS = 0;
                        let completeCOFFHP = 0, completeOFFHPU  = 0, completeOFFHPS  = 0;
                        let userTmpPoints = {};
                        let userTmpPointsCustom = {};
                        if (actData['required_by_user'] == 'Y') {
                            totalActivity += 1;
                        }
                        if (actData['required_by_spouse'] == 'Y') {
                            totalActivityS += 1;
                        }
                        let customArray = {};
                        if (actData['custompoint'] && Object.keys(actData['custompoint']).length > 0) {
                            for (let customData of Object.values(actData['custompoint'])) {
                                let userId = customData['id'];
                                if (userActivityTotal.hasOwnProperty(userId) == false) {
                                    userActivityTotal[userId] = {};
                                }
                                let cusOtherDaya = [{'rewardData' : rewardData, 'actDatas' : actData, 'complete' : complete, 'customArray' : (customArray[userId]) ? JSON.parse(JSON.stringify(customArray[userId])) : [], 'userTmpPoints' : (userTmpPoints[userId]) ? JSON.parse(JSON.stringify(userTmpPoints[userId])) : [], 'userActivityTotal' : (userActivityTotal[userId]) ? JSON.parse(JSON.stringify(userActivityTotal[userId])) : [], 'acSK' : acSK, 'completeS' : completeS, 'completeCOFFHP' : completeCOFFHP, 'completeOFFHPU' : completeOFFHPU, 'completeOFFHPS' : completeOFFHPS, 'userTmpPointsCustom' : (userTmpPointsCustom[userId]) ? JSON.parse(JSON.stringify(userTmpPointsCustom[userId])) : [], 'completeLOneAll' : completeLOneAll, 'completeLOneUser' : completeLOneUser, 'completeLOneSpouse' : completeLOneSpouse, 'completeLOneCOFFHP' : completeLOneCOFFHP, 'completeLOneOFFHPU' : completeLOneOFFHPU, 'completeLOneOFFHPS' : completeLOneOFFHPS }];
                                let getCustomPointData = await this.againCustomPointCalculation(call_from, customData, cusOtherDaya);
                                if (getCustomPointData[0]['userTmpPointsCustom'] && Object.keys(getCustomPointData[0]['userTmpPointsCustom']).length > 0) {
                                    userTmpPointsCustom[userId] = customData;
                                }
                                if (getCustomPointData[0]['customArray'] && Object.keys(getCustomPointData[0]['customArray']).length > 0) {
                                    customArray[userId] = getCustomPointData[0]['customArray'];
                                }
                                if (getCustomPointData[0]['userTmpPoints'] && Object.keys(getCustomPointData[0]['userTmpPoints']).length > 0) {
                                    userTmpPoints[userId] = getCustomPointData[0]['userTmpPoints'];
                                }
                                if (getCustomPointData[0]['userActivityTotal'] && Object.keys(getCustomPointData[0]['userActivityTotal']).length > 0) {
                                    userActivityTotal[userId] = getCustomPointData[0]['userActivityTotal'];
                                }
                                if (getCustomPointData[0]['complete'] && getCustomPointData[0]['complete'] != 0) {
                                    complete = getCustomPointData[0]['complete'];
                                }
                                if (getCustomPointData[0]['completeS'] && getCustomPointData[0]['completeS'] != 0) {
                                    completeS = getCustomPointData[0]['completeS'];
                                }
                                if (getCustomPointData[0]['completeCOFFHP'] && getCustomPointData[0]['completeCOFFHP'] != 0) {
                                        completeCOFFHP = getCustomPointData[0]['completeCOFFHP'];
                                }
                                if (getCustomPointData[0]['completeOFFHPU'] && getCustomPointData[0]['completeOFFHPU'] != 0) {
                                    completeOFFHPU = getCustomPointData[0]['completeOFFHPU'];
                                }
                                if (getCustomPointData[0]['completeOFFHPS'] && getCustomPointData[0]['completeOFFHPS'] != 0) {
                                    completeOFFHPS = getCustomPointData[0]['completeOFFHPS'];
                                }
                                if (getCustomPointData[0]['completeLOneAll'] && Object.keys(getCustomPointData[0]['completeLOneAll']).length > 0) {
                                    completeLOneAll = getCustomPointData[0]['completeLOneAll'];
                                }
                                if (getCustomPointData[0]['completeLOneUser'] && Object.keys(getCustomPointData[0]['completeLOneUser']).length > 0) {
                                    completeLOneUser = getCustomPointData[0]['completeLOneUser'];
                                }
                                if (getCustomPointData[0]['completeLOneSpouse'] && Object.keys(getCustomPointData[0]['completeLOneSpouse']).length > 0) {
                                    completeLOneSpouse = getCustomPointData[0]['completeLOneSpouse'];
                                }
                                if (getCustomPointData[0]['completeLOneCOFFHP'] && Object.keys(getCustomPointData[0]['completeLOneCOFFHP']).length > 0) {
                                    completeLOneCOFFHP = getCustomPointData[0]['completeLOneCOFFHP'];
                                }
                                if (getCustomPointData[0]['completeLOneOFFHPU'] && Object.keys(getCustomPointData[0]['completeLOneOFFHPU']).length > 0) {
                                    completeLOneOFFHPU = getCustomPointData[0]['completeLOneOFFHPU'];
                                }
                                if (getCustomPointData[0]['completeLOneOFFHPS'] && Object.keys(getCustomPointData[0]['completeLOneOFFHPS']).length > 0) {
                                    completeLOneOFFHPS = getCustomPointData[0]['completeLOneOFFHPS'];
                                }
                            }
                        }

                        if (actData['users'] && Object.keys(actData['users']).length > 0) {
                            let dateWiseUser = {};
                            for (let [userID, userVal] of Object.entries(actData['users'])) {
                                dateWiseUser[userID] = userVal;
                                let required_by_user = "required_by_user";
                                if (dateWiseUser[userID]['Role'] == 16) {
                                    required_by_user = "required_by_spouse";
                                }
                                if (userPointsTotal.hasOwnProperty(userID) == false) {
                                    userPointsTotal[userID] = {};
                                }
                                if (userPointsTotalOVL.hasOwnProperty(userID) == false) {
                                    userPointsTotalOVL[userID] = {};
                                }
                                if (userPointsTotalActivityOVL.hasOwnProperty(userID) == false) {
                                    userPointsTotalActivityOVL[userID] = {};
                                }
                                if (userPointsTotal[userID].hasOwnProperty('Total') == false) {
                                    userPointsTotal[userID]['Total'] = 0;
                                    if (call_from == 'ch_filter_report') {
                                        userPointsTotal[userID]['DTotal'] = 0;
                                    }
                                    userPointsTotal[userID]['Role'] = dateWiseUser[userID]['Role'];
                                    userPointsTotal[userID]['on_insurance_plan'] = dateWiseUser[userID]['on_insurance_plan'];
                                    userPointsTotal[userID]['location'] = dateWiseUser[userID]['location'];
                                    userPointsTotal[userID]['department'] = dateWiseUser[userID]['department'];
                                    userPointsTotal[userID]['gender'] = dateWiseUser[userID]['gender'];
                                    userPointsTotal[userID]['age'] = dateWiseUser[userID]['age'];
                                }
                                if (userPointsTotalOVL[userID].hasOwnProperty('Total') == false) {
                                    userPointsTotalOVL[userID]['Total'] = 0;
                                    userPointsTotalOVL[userID]['Role'] = dateWiseUser[userID]['Role'];
                                }
                                if (userPointsTotalActivityOVL[userID].hasOwnProperty('Total') == false) {
                                    userPointsTotalActivityOVL[userID]['Total'] = 0;
                                    userPointsTotalActivityOVL[userID]['Role'] = dateWiseUser[userID]['Role'];
                                }
                                if (userActivityTotal.hasOwnProperty(userID) == false) {
                                    userActivityTotal[userID] = {};
                                }
                                if (userActivityTotal[userID].hasOwnProperty('Total') == false) {
                                    userActivityTotal[userID]['Total'] = 0;
                                    userActivityTotal[userID]['Role'] = dateWiseUser[userID]['Role'];
                                    userActivityTotal[userID]['on_insurance_plan'] = dateWiseUser[userID]['on_insurance_plan'];
                                    userActivityTotal[userID]['location'] = dateWiseUser[userID]['location'];
                                    userActivityTotal[userID]['department'] = dateWiseUser[userID]['department'];
                                    userActivityTotal[userID]['gender'] = dateWiseUser[userID]['gender'];
                                    userActivityTotal[userID]['age'] = dateWiseUser[userID]['age'];
                                }
                                if (userActivityTotal[userID].hasOwnProperty('remainPoints') == false) {
                                    if (required_by_user == 'required_by_user') {
                                        userActivityTotal[userID]['remainPoints'] = rewardData['RequiredCampaignactivityUser'];
                                    } else {
                                        userActivityTotal[userID]['remainPoints'] = rewardData['RequiredCampaignactivitySpouse'];
                                    }
                                }
                                let cusOtherData = [{'rewardData' : rewardData, 'actDatas' : actData, 'dateWiseUser' : (dateWiseUser[userID]) ? JSON.parse(JSON.stringify(dateWiseUser[userID])) : [], 'userTmpPointsCustom' : (userTmpPointsCustom[userID]) ? JSON.parse(JSON.stringify(userTmpPointsCustom[userID])) : [], 'userPointsTotal' : (userPointsTotal[userID]) ? JSON.parse(JSON.stringify(userPointsTotal[userID])) : [], 'userPointsTotalActivityOVL' : (userPointsTotalActivityOVL[userID]) ? JSON.parse(JSON.stringify(userPointsTotalActivityOVL[userID])) : [],'userPointsTotalOVL' : (userPointsTotalOVL[userID]) ? JSON.parse(JSON.stringify(userPointsTotalOVL[userID])) : [], 'userActivityTotal' : (userActivityTotal[userID]) ? JSON.parse(JSON.stringify(userActivityTotal[userID])) : [], 'customArray' : (customArray[userID]) ? JSON.parse(JSON.stringify(customArray[userID])) : [], 'acSK' : acSK, 'completeS' : completeS, 'complete' : complete, 'completeCOFFHP' : completeCOFFHP, 'completeOFFHPU' : completeOFFHPU, 'completeOFFHPS' : completeOFFHPS, 'completeLOneAll' : completeLOneAll, 'completeLOneUser' : completeLOneUser, 'completeLOneSpouse' : completeLOneSpouse, 'completeLOneCOFFHP' : completeLOneCOFFHP, 'completeLOneOFFHPU' : completeLOneOFFHPU, 'completeLOneOFFHPS' : completeLOneOFFHPS }];
                                let userTempPointData = await this.calculateUserTempPoint(call_from, userID, cusOtherData);
                                if (userTempPointData[0]['userTmpPointsCustom'] && userTmpPointsCustom[userID]) {
                                    delete(userTmpPointsCustom[userID]);
                                }
                                if (userTempPointData[0]['userPointsTotal'] && Object.keys(userTempPointData[0]['userPointsTotal']).length > 0) {
                                    userPointsTotal[userID] = userTempPointData[0]['userPointsTotal'];
                                }
                                if (userTempPointData[0]['userPointsTotalOVL'] && Object.keys(userTempPointData[0]['userPointsTotalOVL']).length > 0) {
                                    userPointsTotalOVL[userID] = userTempPointData[0]['userPointsTotalOVL'];
                                }
                                if (userTempPointData[0]['userPointsTotalActivityOVL'] && Object.keys(userTempPointData[0]['userPointsTotalActivityOVL']).length > 0) {
                                    userPointsTotalActivityOVL[userID] = userTempPointData[0]['userPointsTotalActivityOVL'];
                                }
                                if (userTempPointData[0]['userActivityTotal'] && Object.keys(userTempPointData[0]['userActivityTotal']).length > 0) {
                                    userActivityTotal[userID] = userTempPointData[0]['userActivityTotal'];
                                }
                                if (userTempPointData[0]['complete'] && userTempPointData[0]['complete'] != 0) {
                                    complete = userTempPointData[0]['complete'];
                                }
                                if (userTempPointData[0]['completeS'] && userTempPointData[0]['completeS'] != 0) {
                                    completeS = userTempPointData[0]['completeS'];
                                }
                                if (userTempPointData[0]['completeCOFFHP'] && userTempPointData[0]['completeCOFFHP'] != 0) {
                                    completeCOFFHP = userTempPointData[0]['completeCOFFHP'];
                                }
                                if (userTempPointData[0]['completeOFFHPU'] && userTempPointData[0]['completeOFFHPU'] != 0) {
                                    completeOFFHPU = userTempPointData[0]['completeOFFHPU'];
                                }
                                if (userTempPointData[0]['completeOFFHPS'] && userTempPointData[0]['completeOFFHPS'] != 0) {
                                    completeOFFHPS = userTempPointData[0]['completeOFFHPS'];
                                }
                                if (userTempPointData[0]['completeLOneAll'] && Object.keys(userTempPointData[0]['completeLOneAll']).length > 0) {
                                    completeLOneAll = userTempPointData[0]['completeLOneAll'];
                                }
                                if (userTempPointData[0]['completeLOneUser'] && Object.keys(userTempPointData[0]['completeLOneUser']).length > 0) {
                                    completeLOneUser = userTempPointData[0]['completeLOneUser'];
                                }
                                if (userTempPointData[0]['completeLOneSpouse'] && Object.keys(userTempPointData[0]['completeLOneSpouse']).length > 0) {
                                    completeLOneSpouse = userTempPointData[0]['completeLOneSpouse'];
                                }
                                if (userTempPointData[0]['completeLOneCOFFHP'] && Object.keys(userTempPointData[0]['completeLOneCOFFHP']).length > 0) {
                                    completeLOneCOFFHP = userTempPointData[0]['completeLOneCOFFHP'];
                                }
                                if (userTempPointData[0]['completeLOneOFFHPU'] && Object.keys(userTempPointData[0]['completeLOneOFFHPU']).length > 0) {
                                    completeLOneOFFHPU = userTempPointData[0]['completeLOneOFFHPU'];
                                }
                                if (userTempPointData[0]['completeLOneOFFHPS'] && Object.keys(userTempPointData[0]['completeLOneOFFHPS']).length > 0) {
                                    completeLOneOFFHPS = userTempPointData[0]['completeLOneOFFHPS'];
                                }
                            }
                            notcomplete = totalUsers - complete;
                        }
                        if (Object.keys(userTmpPointsCustom).length > 0) {
                            for (let [userIds, userVals] of Object.entries(userTmpPointsCustom)) {
                                if(!userVals['Total']){
                                    userVals['Total'] = 0;
                                }
                                let tmpPoints = Number(userVals['Total']);
                                if (tmpPoints > actData['max_point']) {
                                    tmpPoints = Number(actData['max_point']);
                                }
                                if(userPointsTotal.hasOwnProperty(userIds) == false){
                                    userPointsTotal[userIds] = {};
                                }
                                if (userPointsTotal[userIds].hasOwnProperty('Total') == false) {
                                    userPointsTotal[userIds]['Total'] = Number(tmpPoints);
                                    userPointsTotal[userIds]['Role'] = userVals['Role'];
                                    userPointsTotal[userIds]['on_insurance_plan'] = userVals['on_insurance_plan'];
                                    userPointsTotal[userIds]['location'] = userVals['location'];
                                    userPointsTotal[userIds]['department'] = userVals['department'];
                                    userPointsTotal[userIds]['gender'] = userVals['gender'];
                                    userPointsTotal[userIds]['age'] = userVals['age'];
                                } else {
                                    userPointsTotal[userIds]['Total'] += Number(tmpPoints);
                                }
                                if (call_from == 'ch_filter_report' &&  actData['is_display_status'] != 1) {
                                    if (!userPointsTotal[userIds]['DTotal']) {
                                        userPointsTotal[userIds]['DTotal'] = Number(tmpPoints);
                                    } else {
                                        userPointsTotal[userIds]['DTotal'] += Number(tmpPoints);
                                    }
                                }
                                if(userPointsTotalOVL.hasOwnProperty(userIds) == false){
                                    userPointsTotalOVL[userIds] = {};
                                }
                                if (userPointsTotalOVL[userIds].hasOwnProperty('Total') == false) {
                                    userPointsTotalOVL[userIds]['Total'] = Number(tmpPoints);
                                    userPointsTotalOVL[userIds]['Role'] = userVals['Role'];
                                } else {
                                    userPointsTotalOVL[userIds]['Total'] += Number(tmpPoints);
                                }
                                if(userPointsTotalActivityOVL.hasOwnProperty(userIds) == false){
                                    userPointsTotalActivityOVL[userIds] = {};
                                }
                                if (userPointsTotalActivityOVL[userIds].hasOwnProperty('Total') == false) {
                                    userPointsTotalActivityOVL[userIds]['Total'] = Number(tmpPoints);
                                    userPointsTotalActivityOVL[userIds]['Role'] = userVals['Role'];
                                } else {
                                    userPointsTotalActivityOVL[userIds]['Total'] += Number(tmpPoints);
                                }
                                let  required_by_user = "required_by_user";
                                if (userVals['Role'] == 16) {
                                    required_by_user = "required_by_spouse";
                                }
                                if (actData[required_by_user] == 'Y') {
                                    if (tmpPoints >= (actData['quentity'] * actData['point_for_each'])) {
                                        if (call_from == 'ch_filter_report') {
                                            if (userActivityTotal[userIds]) {
                                                userActivityTotal[userIds]['Total'] += 1;
                                            }
                                        }
                                        if (userActivityTotal[userIds] && userActivityTotal[userIds]['Total'] > acSK) {
                                            if (call_from == 'ch_filter_report') {
                                                userActivityTotal[userIds]['Total'] = acSK;
                                            }
                                        }
                                    }
                                }
                            }
                            notcomplete = totalUsers - complete;
                        }
                        actData['complete'] = complete;
                        actData['notcomplete'] = notcomplete;
                        actData['completeS'] = completeS;
                        actData['completeCOFFHP'] = completeCOFFHP;
                        actData['completeOFFHPU'] = completeOFFHPU;
                        actData['completeOFFHPS'] = completeOFFHPS;
                        rewardWiseUsers[sk]['Campaignactivity'][skl] = actData;
                        skl += 1;
                        acSK += 1;
                    }
                }
                if (rewardData['Campaignchallenges'] && rewardData['Campaignchallenges'].length > 0) {
                    if(!rewardWiseUsers[sk]['Campaignchallenges']){
                        rewardWiseUsers[sk]['Campaignchallenges'] = {};
                    }
                }
                if (rewardData['Campaigncategory'] && rewardData['Campaigncategory'].length > 0) {
                    if(!rewardWiseUsers[sk]['Campaigncategory']){
                        rewardWiseUsers[sk]['Campaigncategory'] = {};
                    }
                    let skl = 0;
                    for (let catData of rewardData['Campaigncategory']) {
                        catData['tmpuserPointsTotalOVL'] = {};
                        let catuserTmpPoints = {};
                        let catactivitycmltd = {};
                        if (catData['required_by_user'] == 'Y') {
                            totalActivity += 1;
                        }
                        if (catData['required_by_spouse'] == 'Y') {
                            totalActivityS += 1;
                        }
                        if (catData?.['activity'] && catData?.['activity'].length > 0) {
                            let skl1 = 0;
                            let Nuser = 0;
                            for (let cactData of catData['activity']) {
                                let complete = 0, notcomplete = 0;
                                let completeS = 0, notcompleteS = 0;
                                let completeCOFFHP = 0, completeOFFHPU  = 0, completeOFFHPS  = 0;
                                let userTmpPoints = {};
                                let userTmpPointsCustom = {};
                                if (cactData['required_by_user'] == 'Y') {
                                    totalActivity += 1;
                                }
                                if (cactData['required_by_spouse'] == 'Y') {
                                    totalActivityS += 1;
                                }
                                let customArray = {};
                                if (cactData['custompoint'] && Object.keys(cactData['custompoint']).length > 0) {
                                    for (let customData of Object.values(cactData['custompoint'])) {
                                        let userId = customData['id'];
                                        if (userActivityTotal.hasOwnProperty(userId) == false) {
                                            userActivityTotal[userId] = {};
                                        }
                                        let cusOtherDaya = [{'rewardData' : rewardData, 'actDatas' : cactData, 'complete' : complete, 'customArray' : (customArray[userId]) ? JSON.parse(JSON.stringify(customArray[userId])) : [], 'userTmpPoints' : (userTmpPoints[userId]) ? JSON.parse(JSON.stringify(userTmpPoints[userId])) : [], 'userActivityTotal' : (userActivityTotal[userId]) ? JSON.parse(JSON.stringify(userActivityTotal[userId])) : [], 'acSK' : acSK, 'completeS' : completeS, 'completeCOFFHP' : completeCOFFHP, 'completeOFFHPU' : completeOFFHPU, 'completeOFFHPS' : completeOFFHPS, 'userTmpPointsCustom' : (userTmpPointsCustom[userId]) ? JSON.parse(JSON.stringify(userTmpPointsCustom[userId])) : [], 'completeLOneAll' : completeLOneAll, 'completeLOneUser' : completeLOneUser, 'completeLOneSpouse' : completeLOneSpouse, 'completeLOneCOFFHP' : completeLOneCOFFHP, 'completeLOneOFFHPU' : completeLOneOFFHPU, 'completeLOneOFFHPS' : completeLOneOFFHPS, 'catactivitycmltd' : (catactivitycmltd[userId]) ? JSON.parse(JSON.stringify(catactivitycmltd[userId])) : [], 'catActivity' : 'catActivity' }];
                                        let getCustomPointData = await this.againCustomPointCalculation(call_from, customData, cusOtherDaya);
                                        if (getCustomPointData[0]['userTmpPointsCustom'] && Object.keys(getCustomPointData[0]['userTmpPointsCustom']).length > 0) {
                                            userTmpPointsCustom[userId] = customData;
                                        }
                                        if (getCustomPointData[0]['customArray'] && Object.keys(getCustomPointData[0]['customArray']).length > 0) {
                                            customArray[userId] = getCustomPointData[0]['customArray'];
                                        }
                                        if (getCustomPointData[0]['userTmpPoints'] && Object.keys(getCustomPointData[0]['userTmpPoints']).length > 0) {
                                            userTmpPoints[userId] = getCustomPointData[0]['userTmpPoints'];
                                        }
                                        if (getCustomPointData[0]['userActivityTotal'] && Object.keys(getCustomPointData[0]['userActivityTotal']).length > 0) {
                                            userActivityTotal[userId] = getCustomPointData[0]['userActivityTotal'];
                                        }
                                        if (getCustomPointData[0]['catactivitycmltd'] && Object.keys(getCustomPointData[0]['catactivitycmltd']).length > 0) {
                                            catactivitycmltd[userId] = getCustomPointData[0]['catactivitycmltd'];
                                        }
                                        if (getCustomPointData[0]['complete'] && getCustomPointData[0]['complete'] != 0) {
                                            complete = getCustomPointData[0]['complete'];
                                        }
                                        if (getCustomPointData[0]['completeS'] && getCustomPointData[0]['completeS'] != 0) {
                                            completeS = getCustomPointData[0]['completeS'];
                                        }
                                        if (getCustomPointData[0]['completeCOFFHP'] && getCustomPointData[0]['completeCOFFHP'] != 0) {
                                            completeCOFFHP = getCustomPointData[0]['completeCOFFHP'];
                                        }
                                        if (getCustomPointData[0]['completeOFFHPU'] && getCustomPointData[0]['completeOFFHPU'] != 0) {
                                            completeOFFHPU = getCustomPointData[0]['completeOFFHPU'];
                                        }
                                        if (getCustomPointData[0]['completeOFFHPS'] && getCustomPointData[0]['completeOFFHPS'] != 0) {
                                            completeOFFHPS = getCustomPointData[0]['completeOFFHPS'];
                                        }
                                        if (getCustomPointData[0]['completeLOneAll'] && Object.keys(getCustomPointData[0]['completeLOneAll']).length > 0) {
                                            completeLOneAll = getCustomPointData[0]['completeLOneAll'];
                                        }
                                        if (getCustomPointData[0]['completeLOneUser'] && Object.keys(getCustomPointData[0]['completeLOneUser']).length > 0) {
                                            completeLOneUser = getCustomPointData[0]['completeLOneUser'];
                                        }
                                        if (getCustomPointData[0]['completeLOneSpouse'] && Object.keys(getCustomPointData[0]['completeLOneSpouse']).length > 0) {
                                            completeLOneSpouse = getCustomPointData[0]['completeLOneSpouse'];
                                        }
                                        if (getCustomPointData[0]['completeLOneCOFFHP'] && Object.keys(getCustomPointData[0]['completeLOneCOFFHP']).length > 0) {
                                            completeLOneCOFFHP = getCustomPointData[0]['completeLOneCOFFHP'];
                                        }
                                        if (getCustomPointData[0]['completeLOneOFFHPU'] && Object.keys(getCustomPointData[0]['completeLOneOFFHPU']).length > 0) {
                                            completeLOneOFFHPU = getCustomPointData[0]['completeLOneOFFHPU'];
                                        }
                                        if (getCustomPointData[0]['completeLOneOFFHPS'] && Object.keys(getCustomPointData[0]['completeLOneOFFHPS']).length > 0) {
                                            completeLOneOFFHPS = getCustomPointData[0]['completeLOneOFFHPS'];
                                        }
                                    }
                                }
                                if (cactData['users'] && Object.keys(cactData['users']).length > 0) {
                                    let dateWiseUser = {};
                                    for (let [userID, userVal] of Object.entries(cactData['users'])) {
                                        dateWiseUser[userID] = userVal;
                                        let required_by_user = "required_by_user";
                                        if (dateWiseUser[userID]['Role'] == 16) {
                                            required_by_user = "required_by_spouse";
                                        }
                                        if (userPointsTotalOVL.hasOwnProperty(userID) == false) {
                                            userPointsTotalOVL[userID] = {};
                                        }
                                        if (userPointsTotalActivityOVL.hasOwnProperty(userID) == false) {
                                            userPointsTotalActivityOVL[userID] = {};
                                        }
                                        if (catuserTmpPoints.hasOwnProperty(userID) == false) {
                                            catuserTmpPoints[userID] = {};
                                        }
                                        if (catData['tmpuserPointsTotalOVL'].hasOwnProperty(userID) == false) {
                                            catData['tmpuserPointsTotalOVL'][userID] = 0;
                                        }
                                        if (userPointsTotalOVL[userID].hasOwnProperty('Total') == false) {
                                            userPointsTotalOVL[userID]['Total'] = 0;
                                            userPointsTotalOVL[userID]['Role'] = dateWiseUser[userID]['Role'];
                                        }
                                        if (userPointsTotalActivityOVL[userID].hasOwnProperty('Total') == false) {
                                            userPointsTotalActivityOVL[userID]['Total'] = 0;
                                            userPointsTotalActivityOVL[userID]['Role'] = dateWiseUser[userID]['Role'];
                                        }
                                        if (userActivityTotal.hasOwnProperty(userID) == false) {
                                            userActivityTotal[userID] = {};
                                        }
                                        if (userActivityTotal[userID].hasOwnProperty('Total') == false) {
                                            userActivityTotal[userID]['Total'] = 0;
                                            userActivityTotal[userID]['Role'] = dateWiseUser[userID]['Role'];
                                            userActivityTotal[userID]['on_insurance_plan'] = dateWiseUser[userID]['on_insurance_plan'];
                                            userActivityTotal[userID]['location'] = dateWiseUser[userID]['location'];
                                            userActivityTotal[userID]['department'] = dateWiseUser[userID]['department'];
                                            userActivityTotal[userID]['gender'] = dateWiseUser[userID]['gender'];
                                            userActivityTotal[userID]['age'] = dateWiseUser[userID]['age'];
                                        }
                                        if (userActivityTotal[userID].hasOwnProperty('remainPoints') == false) {
                                            if (required_by_user == 'required_by_user') {
                                                userActivityTotal[userID]['remainPoints'] = rewardData['RequiredCampaignactivityUser'];
                                            } else {
                                                userActivityTotal[userID]['remainPoints'] = rewardData['RequiredCampaignactivitySpouse'];
                                            }
                                        }
                                        let cusOtherData = [{'rewardData' : rewardData, 'actDatas' : cactData, 'dateWiseUser' : (dateWiseUser[userID]) ? JSON.parse(JSON.stringify(dateWiseUser[userID])) : [], 'userTmpPointsCustom' : (userTmpPointsCustom[userID]) ? JSON.parse(JSON.stringify(userTmpPointsCustom[userID])) : [], 'userPointsTotal' : (userPointsTotal[userID]) ? JSON.parse(JSON.stringify(userPointsTotal[userID])) : [], 'userPointsTotalActivityOVL' : (userPointsTotalActivityOVL[userID]) ? JSON.parse(JSON.stringify(userPointsTotalActivityOVL[userID])) : [],'userPointsTotalOVL' : (userPointsTotalOVL[userID]) ? JSON.parse(JSON.stringify(userPointsTotalOVL[userID])) : [], 'userActivityTotal' : (userActivityTotal[userID]) ? JSON.parse(JSON.stringify(userActivityTotal[userID])) : [], 'customArray' : (customArray[userID]) ? JSON.parse(JSON.stringify(customArray[userID])) : [], 'acSK' : acSK, 'completeS' : completeS, 'complete' : complete, 'completeCOFFHP' : completeCOFFHP, 'completeOFFHPU' : completeOFFHPU, 'completeOFFHPS' : completeOFFHPS, 'completeLOneAll' : completeLOneAll, 'completeLOneUser' : completeLOneUser, 'completeLOneSpouse' : completeLOneSpouse, 'completeLOneCOFFHP' : completeLOneCOFFHP, 'completeLOneOFFHPU' : completeLOneOFFHPU, 'completeLOneOFFHPS' : completeLOneOFFHPS, 'catactivitycmltd' : (catactivitycmltd[userID]) ? JSON.parse(JSON.stringify(catactivitycmltd[userID])) : [], 'catuserTmpPoints' : (catuserTmpPoints[userID]) ? JSON.parse(JSON.stringify(catuserTmpPoints[userID])) : [], 'catData' : catData, 'catActivity' : 'catActivity'}]
                                        let userTempPointData = await this.calculateUserTempPoint(call_from, userID, cusOtherData);
                                        if (userTempPointData['tmpuserPointsTotalOVL']) {
                                            catData['tmpuserPointsTotalOVL'] = userTempPointData['tmpuserPointsTotalOVL'];
                                        }
                                        if (userTempPointData[0]['userTmpPointsCustom'] && userTmpPointsCustom[userID]) {
                                            delete(userTmpPointsCustom[userID]);
                                        }
                                        if (userTempPointData[0]['userPointsTotalOVL'] && Object.keys(userTempPointData[0]['userPointsTotalOVL']).length > 0) {
                                            userPointsTotalOVL[userID] = userTempPointData[0]['userPointsTotalOVL'];
                                        }
                                        if (userTempPointData[0]['userPointsTotalActivityOVL'] && Object.keys(userTempPointData[0]['userPointsTotalActivityOVL']).length > 0) {
                                            userPointsTotalActivityOVL[userID] = userTempPointData[0]['userPointsTotalActivityOVL'];
                                        }
                                        if (userTempPointData[0]['userActivityTotal'] && Object.keys(userTempPointData[0]['userActivityTotal']).length > 0) {
                                            userActivityTotal[userID] = userTempPointData[0]['userActivityTotal'];
                                        }
                                        if (userTempPointData[0]['catactivitycmltd'] && Object.keys(userTempPointData[0]['catactivitycmltd']).length > 0) {
                                            catactivitycmltd[userID] = userTempPointData[0]['catactivitycmltd'];
                                        }
                                        if (userTempPointData[0]['catuserTmpPoints'] && Object.keys(userTempPointData[0]['catuserTmpPoints']).length > 0) {
                                            catuserTmpPoints[userID] = userTempPointData[0]['catuserTmpPoints'];
                                        }
                                        if (userTempPointData[0]['complete'] && userTempPointData[0]['complete'] != 0) {
                                            complete = userTempPointData[0]['complete'];
                                        }
                                        if (userTempPointData[0]['completeS'] && userTempPointData[0]['completeS'] != 0) {
                                            completeS = userTempPointData[0]['completeS'];
                                        }
                                        if (userTempPointData[0]['completeCOFFHP'] && userTempPointData[0]['completeCOFFHP'] != 0) {
                                            completeCOFFHP = userTempPointData[0]['completeCOFFHP'];
                                        }
                                        if (userTempPointData[0]['completeOFFHPU'] && userTempPointData[0]['completeOFFHPU'] != 0) {
                                            completeOFFHPU = userTempPointData[0]['completeOFFHPU'];
                                        }
                                        if (userTempPointData[0]['completeOFFHPS'] && userTempPointData[0]['completeOFFHPS'] != 0) {
                                            completeOFFHPS = userTempPointData[0]['completeOFFHPS'];
                                        }
                                        if (userTempPointData[0]['completeLOneAll'] && Object.keys(userTempPointData[0]['completeLOneAll']).length > 0) {
                                            completeLOneAll = userTempPointData[0]['completeLOneAll'];
                                        }
                                        if (userTempPointData[0]['completeLOneUser'] && Object.keys(userTempPointData[0]['completeLOneUser']).length > 0) {
                                            completeLOneUser = userTempPointData[0]['completeLOneUser'];
                                        }
                                        if (userTempPointData[0]['completeLOneSpouse'] && Object.keys(userTempPointData[0]['completeLOneSpouse']).length > 0) {
                                            completeLOneSpouse = userTempPointData[0]['completeLOneSpouse'];
                                        }
                                        if (userTempPointData[0]['completeLOneCOFFHP'] && Object.keys(userTempPointData[0]['completeLOneCOFFHP']).length > 0) {
                                            completeLOneCOFFHP = userTempPointData[0]['completeLOneCOFFHP'];
                                        }
                                        if (userTempPointData[0]['completeLOneOFFHPU'] && Object.keys(userTempPointData[0]['completeLOneOFFHPU']).length > 0) {
                                            completeLOneOFFHPU = userTempPointData[0]['completeLOneOFFHPU'];
                                        }
                                        if (userTempPointData[0]['completeLOneOFFHPS'] && Object.keys(userTempPointData[0]['completeLOneOFFHPS']).length > 0) {
                                            completeLOneOFFHPS = userTempPointData[0]['completeLOneOFFHPS'];
                                        }
                                    }
                                    notcomplete = totalUsers - complete;
                                    Nuser += 1;
                                }
                                if (Object.keys(userTmpPointsCustom).length > 0) {
                                    for (let [userTID, userTVal] of Object.entries(userTmpPointsCustom)) {
                                        if(!userTVal['Total']){
                                            userTVal['Total'] = 0;
                                        }
                                        let tmpPoints = Number(userTVal['Total']);
                                        if (tmpPoints > cactData['max_point']) {
                                            tmpPoints = cactData['max_point'];
                                        }
                                        if (catuserTmpPoints.hasOwnProperty(userTID) == false) {
                                            catuserTmpPoints[userTID] = {};
                                        }
                                        if (userPointsTotalOVL.hasOwnProperty(userTID) == false) {
                                            userPointsTotalOVL[userTID] = {};
                                        }
                                        if (userPointsTotalActivityOVL.hasOwnProperty(userTID) == false) {
                                            userPointsTotalActivityOVL[userTID] = {};
                                        }
                                        if (catuserTmpPoints[userTID].hasOwnProperty('Total') == false) {
                                            catuserTmpPoints[userTID]['Total'] = Number(userTVal['Total']);
                                            catuserTmpPoints[userTID]['Role'] = userTVal['Role'];
                                            catuserTmpPoints[userTID]['on_insurance_plan'] = userTVal['on_insurance_plan'];
                                            catuserTmpPoints[userTID]['location'] = userTVal['location'];
                                            catuserTmpPoints[userTID]['department'] = userTVal['department'];
                                            catuserTmpPoints[userTID]['gender'] = userTVal['gender'];
                                            catuserTmpPoints[userTID]['age'] = userTVal['age'];
                                        } else {
                                            catuserTmpPoints[userTID]['Total'] += Number(userTVal['Total']);
                                        }
                                        if (call_from == 'ch_filter_report' &&  cactData['is_display_status'] != 1) {
                                            if (!userPointsTotal[userTID]['DTotal']) {
                                                userPointsTotal[userTID]['DTotal'] = Number(tmpPoints);
                                                userPointsTotal[userTID]['on_insurance_plan'] = userTVal['on_insurance_plan'];
                                                userPointsTotal[userTID]['location'] = userTVal['location'];
                                                userPointsTotal[userTID]['department'] = userTVal['department'];
                                                userPointsTotal[userTID]['gender'] = userTVal['gender'];
                                                userPointsTotal[userTID]['age'] = userTVal['age'];
                                            } else {
                                                userPointsTotal[userTID]['DTotal'] += Number(tmpPoints);
                                            }
                                            if (!catuserTmpPoints[userTID]['DTotal']) {
                                                catuserTmpPoints[userTID]['DTotal'] = userTVal['Total'];
                                            } else {
                                                catuserTmpPoints[userTID]['DTotal'] += userTVal['Total'];
                                            }
                                        }
                                        if (userPointsTotalOVL[userTID].hasOwnProperty('Total') == false) {
                                            userPointsTotalOVL[userTID]['Total'] = Number(tmpPoints);
                                            userPointsTotalOVL[userTID]['Role'] = userTVal['Role'];
                                        } else {
                                            userPointsTotalOVL[userTID]['Total'] += Number(tmpPoints);
                                        }
                                        if (userPointsTotalActivityOVL[userTID].hasOwnProperty('Total') == false) {
                                            userPointsTotalActivityOVL[userTID]['Total'] = Number(tmpPoints);
                                            userPointsTotalActivityOVL[userTID]['Role'] = userTVal['Role'];
                                        } else {
                                            userPointsTotalActivityOVL[userTID]['Total'] += Number(tmpPoints);
                                        }
                                        let required_by_user = "required_by_user";
                                        if (userTVal['Role'] == 16) {
                                            required_by_user = "required_by_spouse";
                                        }
                                        if (cactData[required_by_user] == 'Y') {
                                            if (tmpPoints >= (cactData['quentity'] * cactData['point_for_each'])) {
                                                if (call_from == 'ch_filter_report') {
                                                    if (userActivityTotal[userTID]) {
                                                        userActivityTotal[userTID]['Total'] += 1;
                                                    }
                                                }
                                                if (userActivityTotal[userTID] && userActivityTotal[userTID]['Total'] > acSK) {
                                                    if (call_from == 'ch_filter_report') {
                                                        userActivityTotal[userTID]['Total'] = acSK;
                                                    }
                                                }
                                            }
                                        }
                                    }
                                    notcomplete = totalUsers - complete;
                                }
                                cactData['complete'] = complete;
                                cactData['notcomplete'] = notcomplete;
                                cactData['completeS'] = completeS;
                                cactData['completeCOFFHP'] = completeCOFFHP;
                                cactData['completeOFFHPU'] = completeOFFHPU;
                                cactData['completeOFFHPS'] = completeOFFHPS;
                                rewardWiseUsers[sk]['Campaigncategory'][skl]['activity'][skl1] = cactData;
                                skl1 += 1;
                                acSK += 1;
                            }
                        }
                        let complete = 0;
                        let notcomplete = 0;
                        let completeS = 0;
                        let notcompleteS = 0;
                        let completeCOFFHP = 0;
                        let notcompleteCOFFHP = 0;
                        let completeOFFHPU = 0;
                        let notcompleteOFFHPU = 0;
                        let completeOFFHPS = 0;
                        let notcompleteOFFHPS = 0;
                        if (Object.keys(catuserTmpPoints).length > 0) {
                            for (let [cUserId, cUserVal] of Object.entries(catuserTmpPoints)) {
                                if(cUserVal['Total'] !== undefined){
                                    if (cUserVal['Total'] >= catData['max_point']) {
                                        cUserVal['Total'] = Number(catData['max_point']);
                                        catuserTmpPoints[cUserId]['Total'] = Number(cUserVal['Total']);
                                    }
                                    if (call_from == 'ch_filter_report' && cUserVal['DTotal']) {
                                        if (cUserVal['DTotal'] >= catData['max_point']) {
                                            cUserVal['DTotal'] = Number(catData['max_point']);
                                            catuserTmpPoints[cUserId]['DTotal'] = Number(cUserVal['DTotal']);
                                        }
                                    }
                                    if (userPointsTotal.hasOwnProperty(cUserId) == false) {
                                        userPointsTotal[cUserId] = {};
                                    }
                                    if (userActivityTotal.hasOwnProperty(cUserId) == false) {
                                        userActivityTotal[cUserId] = {};
                                    }
                                    if (catData['required_by_user'] == 'Y') {
                                        if (cUserVal['Total'] >= (catData['quentity'] * catData['point_for_each'])) {
                                            complete += 1;
                                            if (cUserVal['Role'] == 16) {
                                                completeS += 1;
                                            }
                                            if (cUserVal['on_insurance_plan'] == 0) {
                                                completeCOFFHP += 1;
                                            }
                                            if (cUserVal['Role'] == 2 && cUserVal['on_insurance_plan'] == 0) {
                                                completeOFFHPU += 1;
                                            }
                                            if (cUserVal['Role'] == 16 && cUserVal['on_insurance_plan'] == 0) {
                                                completeOFFHPS += 1;
                                            }
                                            if (userActivityTotal[cUserId].hasOwnProperty('Total') == false) {
                                                userActivityTotal[cUserId]['Total'] = 1;
                                                userActivityTotal[cUserId]['Role'] = cUserVal['Role'];
                                                userActivityTotal[cUserId]['on_insurance_plan'] = cUserVal['on_insurance_plan'];
                                                userActivityTotal[cUserId]['location'] = cUserVal['location'];
                                                userActivityTotal[cUserId]['department'] = cUserVal['department'];
                                                userActivityTotal[cUserId]['gender'] = cUserVal['gender'];
                                                userActivityTotal[cUserId]['age'] = cUserVal['age'];
                                            } else {
                                                userActivityTotal[cUserId]['Total'] += 1;
                                            }
                                        }
                                    } else {
                                        complete += 1;
                                        if (cUserVal['Role'] == 16) {
                                            completeS += 1;
                                        }
                                        if (cUserVal['on_insurance_plan'] == 0) {
                                            completeCOFFHP += 1;
                                        }
                                        if (cUserVal['Role'] == 2 && cUserVal['on_insurance_plan'] == 0) {
                                            completeOFFHPU += 1;
                                        }
                                        if (cUserVal['Role'] == 16 && cUserVal['on_insurance_plan'] == 0) {
                                            completeOFFHPS += 1;
                                        }
                                    }
                                    let tmpPoints = 0;
                                    if (cUserVal['Total'] >= catData['max_point']) {
                                    tmpPoints = Number(catData['max_point']);
                                    } else {
                                        tmpPoints = Number(cUserVal['Total']);
                                    }
                                    if (call_from == 'ch_filter_report' && cUserVal['DTotal']) {
                                        if (cUserVal['DTotal'] >= catData['max_point']) {
                                            userPointsTotal[cUserId]['DTotal'] = Number(catData['max_point']);
                                        } else {
                                            userPointsTotal[cUserId]['DTotal'] = Number(cUserVal['DTotal']);
                                        }
                                    }
                                    if (userPointsTotal[cUserId].hasOwnProperty('Total') == false) {
                                        if(Number(cUserVal['Total']) > 0){
                                            userPointsTotal[cUserId]['Total'] = Number(cUserVal['Total']);
                                            userPointsTotal[cUserId]['Role'] = cUserVal['Role'];
                                            userPointsTotal[cUserId]['on_insurance_plan'] = cUserVal['on_insurance_plan'];
                                            userPointsTotal[cUserId]['location'] = cUserVal['location'];
                                            userPointsTotal[cUserId]['department'] = cUserVal['department'];
                                            userPointsTotal[cUserId]['gender'] = cUserVal['gender'];
                                            userPointsTotal[cUserId]['age'] = cUserVal['age'];
                                        }else{
                                            delete(userPointsTotal[cUserId]);
                                        }
                                    } else {
                                        userPointsTotal[cUserId]['Total'] += Number(cUserVal['Total']);
                                    }
                                }
                            }
                            notcomplete = totalUsers - complete;
                            if (complete > 0 && totalUsers > 0) {
                                let completePer = (complete * 100) / totalUsers;
                            }
                            if (complete > 0 && totalUsers > 0) {
                                let notCompletePer = (notcomplete * 100) / totalUsers;
                            }
                        } else {
                            complete = 0;
                            completeS = 0;
                            completeCOFFHP = 0;
                            completeOFFHPU = 0;
                            completeOFFHPS = 0;
                            notcomplete = totalUsers;
                        }
                        acSK += 1;
                        rewardWiseUsers[sk]['Campaigncategory'][skl]['complete'] = complete;
                        rewardWiseUsers[sk]['Campaigncategory'][skl]['notcomplete'] = notcomplete;
                        rewardWiseUsers[sk]['Campaigncategory'][skl]['completeS'] = completeS;
                        rewardWiseUsers[sk]['Campaigncategory'][skl]['completeCOFFHP'] = completeCOFFHP;
                        rewardWiseUsers[sk]['Campaigncategory'][skl]['completeOFFHPU'] = completeOFFHPU;
                        rewardWiseUsers[sk]['Campaigncategory'][skl]['completeOFFHPS'] = completeOFFHPS;
                        rewardWiseUsers[sk]['Campaigncategory'][skl]['usersWise'] = catuserTmpPoints;
                        skl += 1;
                    }
                }
                let complete = 0;
                let notcomplete = 0;
                let completeS = 0;
                let notcompleteS = 0;
                let completeCOFFHP = 0;
                let notcompleteCOFFHP = 0;
                let completeOFFHPU = 0;
                let notcompleteOFFHPU = 0;
                let completeOFFHPS = 0;
                let notcompleteOFFHPS = 0;
                if(finalSubRewardArray.length > 0){
                    for (let [userIdT, userValT] of Object.entries(userActivityTotal)) {
                        if (userValT['Role'] == 16) {
                            if (userPointsTotal[userIdT] && totalActivityS == userValT['Total'] && finalSubRewardArray[0]['pointS'] && finalSubRewardArray[0]['pointS'] >= userPointsTotal[userIdT]['Total']) {
                                completeS += 1;
                            }
                        } else {
                            if (userPointsTotal[userIdT] && totalActivity == userValT['Total'] && finalSubRewardArray[0]['point'] && finalSubRewardArray[0]['point'] >= userPointsTotal[userIdT]['Total']) {
                                complete += 1;
                            }
                        }
                    }
                }
                notcomplete = totalUsers - complete;
                notcompleteS = totalUsers - completeS;
                if(rewardData['isDefaultReward'] != 1){
                    rewardWiseUsers[sk]['complete'] = complete;
                    rewardWiseUsers[sk]['notcomplete'] = notcomplete;
                    rewardWiseUsers[sk]['completes'] = completeS;
                    rewardWiseUsers[sk]['notcompletes'] = notcompleteS;
                    rewardWiseUsers[sk]['userPointsTotal'] = userPointsTotal;
                    rewardWiseUsers[sk]['userPointsTotalOVL'] = userPointsTotalOVL;
                    rewardWiseUsers[sk]['userPointsTotalActivityOVL'] = userPointsTotalActivityOVL;
                    rewardWiseUsers[sk]['userActivityTotal'] = userActivityTotal;
                    rewardWiseUsers[sk]['totalActivity'] = totalActivity;
                    rewardWiseUsers[sk]['totalActivityS'] = totalActivityS;
                    rewardWiseUsers[sk]['Rewards'] = finalSubRewardArray;
                    rewardWiseUsers[sk]['RewardsmaxPoint'] = maxPoint;
                    rewardWiseUsers[sk]['completeLOneAll'] = completeLOneAll;
                    rewardWiseUsers[sk]['completeLOneUser'] = completeLOneUser;
                    rewardWiseUsers[sk]['completeLOneSpouse'] = completeLOneSpouse;
                    rewardWiseUsers[sk]['completeLOneCOFFHP'] = completeLOneCOFFHP;
                    rewardWiseUsers[sk]['completeLOneOFFHPU'] = completeLOneOFFHPU;
                    rewardWiseUsers[sk]['completeLOneOFFHPS'] = completeLOneOFFHPS;
                }else{
                    rewardWiseUsers[sk]['complete'] = 0;
                    rewardWiseUsers[sk]['notcomplete'] = 0;
                    rewardWiseUsers[sk]['completes'] = 0;
                    rewardWiseUsers[sk]['notcompletes'] = 0;
                    rewardWiseUsers[sk]['userPointsTotal'] = {};
                    rewardWiseUsers[sk]['userPointsTotalOVL'] = {};
                    rewardWiseUsers[sk]['userPointsTotalActivityOVL'] = {};
                    rewardWiseUsers[sk]['userActivityTotal'] = {};
                    rewardWiseUsers[sk]['totalActivity'] = {};
                    rewardWiseUsers[sk]['totalActivityS'] = {};
                    rewardWiseUsers[sk]['Rewards'] = {};
                    rewardWiseUsers[sk]['RewardsmaxPoint'] = 0;
                    rewardWiseUsers[sk]['completeLOneAll'] = {};
                    rewardWiseUsers[sk]['completeLOneUser'] = {};
                    rewardWiseUsers[sk]['completeLOneSpouse'] = {};
                    rewardWiseUsers[sk]['completeLOneCOFFHP'] = {};
                    rewardWiseUsers[sk]['completeLOneOFFHPU'] = {};
                    rewardWiseUsers[sk]['completeLOneOFFHPS'] = {};
                }
                // if (call_from == 'report') {
                //     rewardWiseUsers[sk]['allUsersInfo'] = champ['allUsersInfo'];
                // }
                sk += 1;
            }

            return rewardWiseUsers;
        }catch (error) {
            throw new Error(await this.translatorService.frontendReadTranslation(req.lang,error.message));
        }
    }
    async againCustomPointCalculation(call_from:any = '', uDatas:any = [], otherDatas:any = []){
        try{
            let {
                rewardData = {},
                actDatas = {},
                complete = 0,
                customArray = {},
                userTmpPoints = {},
                userActivityTotal = {},
                acSK = 0,
                completeS = 0,
                completeCOFFHP = 0,
                completeOFFHPU = 0,
                completeOFFHPS = 0,
                userTmpPointsCustom = {},
                catactivitycmltd = 0,
                catActivity = '',
            } = Object.assign({}, ...otherDatas);
            let userId = uDatas['id'];
            if (rewardData['user_eligible'] == 0 || uDatas['is_camp_eligible'] == 1) {
                let required_by_user = "required_by_user";
                if (uDatas['Role'] == '16') {
                    required_by_user = "required_by_spouse";
                }
                let tmpPoints = Number(uDatas['Total']);
                if (tmpPoints > actDatas['max_point']) {
                    tmpPoints = actDatas['max_point'];
                }
                if (!userTmpPointsCustom['Total']) {
                    userTmpPointsCustom['Total'] = Number(tmpPoints);
                    userTmpPoints['Point'] = 0;
                    userTmpPoints['Role'] = uDatas['Role'];
                    if (actDatas[required_by_user] == 'Y') {
                        if (tmpPoints >= (actDatas['quentity'] * actDatas['point_for_each'])) {
                            complete += 1;
                            if (uDatas['Role'] == 16) {
                                completeS += 1;
                            }
                            if (uDatas['on_insurance_plan'] == 0) {
                                completeCOFFHP += 1;
                            }
                            if (uDatas['Role'] == 2 && uDatas['on_insurance_plan'] == 0) {
                                completeOFFHPU += 1;
                            }
                            if (uDatas['Role'] == 16 && uDatas['on_insurance_plan'] == 0) {
                                completeOFFHPS += 1;
                            }
                            customArray = userId;
                            if (userActivityTotal.hasOwnProperty('Total') == false) {
                                userActivityTotal['Total'] = 1;
                            } else {
                                userActivityTotal['Total'] += 1;
                            }
                            userActivityTotal['Role'] = uDatas['Role'];
                            userActivityTotal['on_insurance_plan'] = uDatas['on_insurance_plan'];
                            userActivityTotal['location'] = uDatas['location'];
                            userActivityTotal['department'] = uDatas['department'];
                            userActivityTotal['gender'] = uDatas['gender'];
                            userActivityTotal['age'] = uDatas['age'];
                            if (userActivityTotal['Total'] > acSK) {
                                userActivityTotal['Total'] = acSK;
                                complete -= 1;
                                if (uDatas['Role'] == 16) {
                                    completeS -= 1;
                                }
                                if (uDatas['on_insurance_plan'] == 0) {
                                    completeCOFFHP -= 1;
                                }
                                if (uDatas['Role'] == 2 && uDatas['on_insurance_plan'] == 0) {
                                    completeOFFHPU -= 1;
                                }
                                if (uDatas['Role'] == 16 && uDatas['on_insurance_plan'] == 0) {
                                    completeOFFHPS -= 1;
                                }
                            }
                            if (userActivityTotal.hasOwnProperty('remainPoints') == false) {
                                if (required_by_user == 'required_by_user') {
                                    userActivityTotal['remainPoints'] = rewardData['RequiredCampaignactivityUser'] - actDatas['max_point'];
                                } else {
                                    userActivityTotal['remainPoints'] = rewardData['RequiredCampaignactivitySpouse'] - actDatas['max_point'];
                                }
                                userActivityTotal['Role'] = uDatas['Role'];
                                userActivityTotal['on_insurance_plan'] = uDatas['on_insurance_plan'];
                                userActivityTotal['location'] = uDatas['location'];
                                userActivityTotal['department'] = uDatas['department'];
                                userActivityTotal['gender'] = uDatas['gender'];
                                userActivityTotal['age'] = uDatas['age'];
                            } else {
                                userActivityTotal['remainPoints'] -= actDatas['max_point'];
                                userActivityTotal['Role'] = uDatas['Role'];
                            }
                        }
                    }else{
                        if (catActivity == 'catActivity') {
                            complete += 1;
                            if (uDatas['Role'] == 16) {
                                completeS += 1;
                            }
                            if (uDatas['on_insurance_plan'] == 0) {
                                completeCOFFHP += 1;
                            }
                            if (uDatas['Role'] == 2 && uDatas['on_insurance_plan'] == 0) {
                                completeOFFHPU += 1;
                            }
                            if (uDatas['Role'] == 16 && uDatas['on_insurance_plan'] == 0) {
                                completeOFFHPS += 1;
                            }
                            if (tmpPoints >= (actDatas['quentity'] * actDatas['point_for_each'])) {
                                customArray = userId;
                            }
                        } else {
                            complete += 1;
                            if (uDatas['Role'] == 16) {
                                completeS += 1;
                            }
                            if (uDatas['on_insurance_plan'] == 0) {
                                completeCOFFHP += 1;
                            }
                            if (uDatas['Role'] == 2 && uDatas['on_insurance_plan'] == 0) {
                                completeOFFHPU += 1;
                            }
                            if (uDatas['Role'] == 16 && uDatas['on_insurance_plan'] == 0) {
                                completeOFFHPS += 1;
                            }
                            customArray = userId;
                        }
                    }
                }else{
                    userTmpPointsCustom['Total'] = Number(tmpPoints);
                    userTmpPoints['Point'] = 0;
                    userTmpPoints['Role'] = uDatas['Role'];
                    if (actDatas[required_by_user] == 'Y') {
                        if (tmpPoints >= (actDatas['quentity'] * actDatas['point_for_each'])) {
                            complete += 1;
                            if (uDatas['Role'] == 16) {
                                completeS += 1;
                            }
                            if (uDatas['on_insurance_plan'] == 0) {
                                completeCOFFHP += 1;
                            }
                            if (uDatas['Role'] == 2 && uDatas['on_insurance_plan'] == 0) {
                                completeOFFHPU += 1;
                            }
                            if (uDatas['Role'] == 16 && uDatas['on_insurance_plan'] == 0) {
                                completeOFFHPS += 1;
                            }
                            customArray = userId;
                            if (userActivityTotal.hasOwnProperty('Total') == false) {
                                userActivityTotal['Total'] = 1;
                            } else {
                                userActivityTotal['Total'] += 1;
                            }
                            userActivityTotal['Role'] = uDatas['Role'];
                            userActivityTotal['on_insurance_plan'] = uDatas['on_insurance_plan'];
                            userActivityTotal['location'] = uDatas['location'];
                            userActivityTotal['department'] = uDatas['department'];
                            userActivityTotal['gender'] = uDatas['gender'];
                            userActivityTotal['age'] = uDatas['age'];
                            if (userActivityTotal['Total'] > acSK) {
                                userActivityTotal['Total'] = acSK;
                                complete -= 1;
                                if (uDatas['Role'] == 16) {
                                    completeS -= 1;
                                }
                                if (uDatas['on_insurance_plan'] == 0) {
                                    completeCOFFHP -= 1;
                                }
                                if (uDatas['Role'] == 2 && uDatas['on_insurance_plan'] == 0) {
                                    completeOFFHPU -= 1;
                                }
                                if (uDatas['Role'] == 16 && uDatas['on_insurance_plan'] == 0) {
                                    completeOFFHPS -= 1;
                                }
                            }
                            if (userActivityTotal.hasOwnProperty('remainPoints') == false) {
                                if (required_by_user == 'required_by_user') {
                                    userActivityTotal['remainPoints'] = rewardData['RequiredCampaignactivityUser'] - actDatas['max_point'];
                                } else {
                                    userActivityTotal['remainPoints'] = rewardData['RequiredCampaignactivitySpouse'] - actDatas['max_point'];
                                }
                                userActivityTotal['Role'] = uDatas['Role'];
                                userActivityTotal['on_insurance_plan'] = uDatas['on_insurance_plan'];
                                userActivityTotal['location'] = uDatas['location'];
                                userActivityTotal['department'] = uDatas['department'];
                                userActivityTotal['gender'] = uDatas['gender'];
                                userActivityTotal['age'] = uDatas['age'];
                            } else {
                                userActivityTotal['remainPoints'] -= actDatas['max_point'];
                                userActivityTotal['Role'] = uDatas['Role'];
                            }
                        }
                    } else {
                        if (catActivity == 'catActivity') {
                            complete += 1;
                            if (uDatas['Role'] == 16) {
                                completeS += 1;
                            }
                            if (uDatas['on_insurance_plan'] == 0) {
                                completeCOFFHP += 1;
                            }
                            if (uDatas['Role'] == 2 && uDatas['on_insurance_plan'] == 0) {
                                completeOFFHPU += 1;
                            }
                            if (uDatas['Role'] == 16 && uDatas['on_insurance_plan'] == 0) {
                                completeOFFHPS += 1;
                            }
                            if (tmpPoints >= (actDatas['quentity'] * actDatas['point_for_each'])) {
                                customArray = userId;
                            }
                        } else {
                            complete += 1;
                            if (uDatas['Role'] == 16) {
                                completeS += 1;
                            }
                            if (uDatas['on_insurance_plan'] == 0) {
                                completeCOFFHP += 1;
                            }
                            if (uDatas['Role'] == 2 && uDatas['on_insurance_plan'] == 0) {
                                completeOFFHPU += 1;
                            }
                            if (uDatas['Role'] == 16 && uDatas['on_insurance_plan'] == 0) {
                                completeOFFHPS += 1;
                            }
                            customArray = userId;
                        }
                    }
                }
            }
            return [{'userTmpPointsCustom' : (userTmpPointsCustom) ? userTmpPointsCustom : '', 'userActivityTotal' : (userActivityTotal) ? userActivityTotal : '', 'customArray' : (customArray) ? customArray : '', 'userTmpPoints' : (userTmpPoints) ? userTmpPoints : '', 'complete' : complete, 'catactivitycmltd' : (catactivitycmltd) ? catactivitycmltd : '', 'completeS' : completeS, 'completeCOFFHP' : completeCOFFHP, 'completeOFFHPU' : completeOFFHPU, 'completeOFFHPS' : completeOFFHPS}];
        }catch (error) {
            throw new Error(error.message); 
        }
    }
    async calculateUserTempPoint(call_from:any = '', userId:any = null, otherDatas:any = []){
        try{
            let {
                rewardData = {},
                actDatas = {},
                dateWiseUser = {},
                userTmpPointsCustom = {},
                userPointsTotal = {},
                userPointsTotalActivityOVL = {},
                userPointsTotalOVL = {},
                userActivityTotal = {},
                customArray = {},
                acSK = 0,
                completeS = 0,
                complete = 0,
                completeCOFFHP = 0,
                completeOFFHPU = 0,
                completeOFFHPS = 0,
                completeLOneAll = {},
                completeLOneUser = {},
                completeLOneSpouse = {},
                completeLOneCOFFHP = {},
                completeLOneOFFHPU = {},
                completeLOneOFFHPS = {},
                catactivitycmltd = {},
                catuserTmpPoints = {},
                catData = {},
                catActivity = ''
            } = Object.assign({}, ...otherDatas);

            let maxPoint = actDatas['max_point'];
            let dateWiseUsers = {};
            dateWiseUsers[userId] = dateWiseUser;
            for (let [userIDs, userVal] of Object.entries(dateWiseUsers)) {
                let tmpPoints = 0;
                tmpPoints = Number(userVal['Point']);
                if(tmpPoints > 0){
                    if (userTmpPointsCustom['Total']) {
                        tmpPoints += userTmpPointsCustom['Total'];
                        userTmpPointsCustom = {};
                    }
                    if (tmpPoints > maxPoint) {
                        tmpPoints = maxPoint;
                    }
                    if (userPointsTotal.hasOwnProperty('Total') == false) {
                        userPointsTotal['Total'] = Number(tmpPoints);
                        userPointsTotal['Role'] = userVal['Role'];
                        userPointsTotal['on_insurance_plan'] = userVal['on_insurance_plan'];
                        userPointsTotal['location'] = userVal['location'];
                        userPointsTotal['department'] = userVal['department'];
                        userPointsTotal['gender'] = userVal['gender'];
                        userPointsTotal['age'] = userVal['age'];
                    } else {
                        userPointsTotal['Total'] += Number(tmpPoints);
                    }
                    if (call_from == 'ch_filter_report' &&  actDatas['is_display_status'] != 1) {
                        if (userPointsTotal.hasOwnProperty('DTotal') == false) {
                            userPointsTotal['DTotal'] = Number(tmpPoints);
                        } else {
                            userPointsTotal['DTotal'] += Number(tmpPoints);
                        }
                    }
                    if (userPointsTotalOVL.hasOwnProperty('Total') == false) {
                        userPointsTotalOVL['Total'] = Number(tmpPoints);
                        userPointsTotalOVL['Role'] = userVal['Role'];
                    } else {
                        userPointsTotalOVL['Total'] += Number(tmpPoints);
                    }
                    if (catActivity == 'catActivity') {
                        if (catData['tmpuserPointsTotalOVL'].hasOwnProperty(userId) == false) {
                            catData['tmpuserPointsTotalOVL'][userId] = Number(tmpPoints);
                        } else {
                            catData['tmpuserPointsTotalOVL'][userId] += Number(tmpPoints);
                        }
                        if (catData['tmpuserPointsTotalOVL'][userId] > catData['max_point']) {
                            userPointsTotalOVL['Total'] -= (catData['tmpuserPointsTotalOVL'][userId] - catData['max_point']);
                            catData['tmpuserPointsTotalOVL'][userId] -= (catData['tmpuserPointsTotalOVL'][userId] - catData['max_point']);
                        }
                        if (catuserTmpPoints.hasOwnProperty('Total') == false) {
                            if (tmpPoints <= actDatas['max_point']) {
                                catuserTmpPoints['Total'] = Number(tmpPoints);
                                catuserTmpPoints['id'] = catData['id'];
                                catuserTmpPoints['Role'] = userVal['Role'];
                                catuserTmpPoints['on_insurance_plan'] = userVal['on_insurance_plan'];
                                catuserTmpPoints['location'] = userVal['location'];
                                catuserTmpPoints['department'] = userVal['department'];
                                catuserTmpPoints['gender'] = userVal['gender'];
                                catuserTmpPoints['age'] = userVal['age'];
                            }
                        } else {
                            if (tmpPoints <= actDatas['max_point']) {
                                catuserTmpPoints['Total'] += Number(tmpPoints);
                            }
                        }
                        if (call_from == 'ch_filter_report' && actDatas['is_display_status'] != 1 && tmpPoints < actDatas['max_point']) {
                            if (catuserTmpPoints.hasOwnProperty('DTotal') == false) {
                                catuserTmpPoints['DTotal'] = Number(tmpPoints);
                            } else {
                                catuserTmpPoints['DTotal'] += Number(tmpPoints);
                            }
                        }
                    }
                    if (userPointsTotalActivityOVL.hasOwnProperty('Total') == false) {
                        userPointsTotalActivityOVL['Total'] = Number(tmpPoints);
                        userPointsTotalActivityOVL['Role'] = userVal['Role'];
                    } else {
                        userPointsTotalActivityOVL['Total'] += Number(tmpPoints);
                    }
                    let required_by_user = "required_by_user";
                    if (userVal['Role'] == 16) {
                        required_by_user = "required_by_spouse";
                    }
                    if (actDatas[required_by_user] == 'Y') {
                        if (tmpPoints >= (actDatas['quentity'] * actDatas['point_for_each'])) {
                            if (userActivityTotal['Total'] == acSK || customArray.length > 0) {
                            } else {
                                complete += 1;
                                completeLOneAll[userId] = userId;
                                if (userVal['Role'] == 16) {
                                    completeS += 1;
                                    completeLOneSpouse[userId] = userId;
                                }else{
                                    completeLOneUser[userId] = userId;
                                }
                                if (userVal['on_insurance_plan'] == 0) {
                                    completeCOFFHP += 1;
                                    completeLOneCOFFHP[userId] = userId;
                                }
                                if (userVal['Role'] == 2 && userVal['on_insurance_plan'] == 0) {
                                    completeOFFHPU += 1;
                                    completeLOneOFFHPU[userId] = userId;
                                }
                                if (userVal['Role'] == 16 && userVal['on_insurance_plan'] == 0) {
                                    completeOFFHPS += 1;
                                    completeLOneOFFHPS[userId] = userId;
                                }
                                userActivityTotal['Total'] += 1;
                                if (catActivity == 'catActivity') {
                                    if (catactivitycmltd.length > 0) {
                                        catactivitycmltd += 1;
                                    } else {
                                        catactivitycmltd = 1;
                                    }
                                }
                            }
                            if (userActivityTotal.hasOwnProperty('remainPoints') == false) {
                                if (required_by_user == 'required_by_user') {
                                    userActivityTotal['remainPoints'] = rewardData['RequiredCampaignactivityUser'] - Number(actDatas['max_point']);
                                } else {
                                    userActivityTotal['remainPoints'] = rewardData['RequiredCampaignactivitySpouse'] - Number(actDatas['max_point']);
                                }
                            } else {
                                userActivityTotal['remainPoints'] -= Number(actDatas['max_point']);
                            }
                        }
                    } else {
                        if (customArray.length > 0) {
                        } else {
                            complete += 1;
                            completeLOneAll[userId] = userId;
                            if (userVal['Role'] == 16) {
                                completeS += 1;
                                completeLOneSpouse[userId] = userId;
                            }else{
                                completeLOneUser[userId] = userId;
                            }
                            if (userVal['on_insurance_plan'] == 0) {
                                completeCOFFHP += 1;
                                completeLOneCOFFHP[userId] = userId;
                            }
                            if (userVal['Role'] == 2 && userVal['on_insurance_plan'] == 0) {
                                completeOFFHPU += 1;
                                completeLOneOFFHPU[userId] = userId;
                            }
                            if (userVal['Role'] == 16 && userVal['on_insurance_plan'] == 0) {
                                completeOFFHPS += 1;
                                completeLOneOFFHPS[userId] = userId;
                            }
                            if (catActivity == 'catActivity') {
                                if (tmpPoints >= (actDatas['quentity'] * actDatas['point_for_each'])) {
                                    if (catactivitycmltd.length > 0) {
                                        catactivitycmltd += 1;
                                    } else {
                                        catactivitycmltd = 1;
                                    }
                                }
                            }
                        }
                    }
                }
            }
            return [{'tmpuserPointsTotalOVL' : (catData['tmpuserPointsTotalOVL']) ? catData['tmpuserPointsTotalOVL'] : [], 'userTmpPointsCustom' : (userTmpPointsCustom) ? userTmpPointsCustom : '', 'userPointsTotal' : (userPointsTotal) ? userPointsTotal : '', 'userPointsTotalOVL' : (userPointsTotalOVL) ? userPointsTotalOVL : '', 'userPointsTotalActivityOVL' : (userPointsTotalActivityOVL) ? userPointsTotalActivityOVL : '', 'userActivityTotal' : (userActivityTotal) ? userActivityTotal : '', 'complete' : complete, 'catactivitycmltd' : (catactivitycmltd) ? catactivitycmltd : '', 'catuserTmpPoints' : (catuserTmpPoints) ? catuserTmpPoints : '', 'completeS' : completeS, 'completeCOFFHP' : completeCOFFHP, 'completeOFFHPU' : completeOFFHPU, 'completeOFFHPS' : completeOFFHPS, 'completeLOneUser' : completeLOneUser, 'completeLOneSpouse' : completeLOneSpouse, 'completeLOneCOFFHP' : completeLOneCOFFHP, 'completeLOneOFFHPU' : completeLOneOFFHPU, 'completeLOneOFFHPS' : completeLOneOFFHPS}];
        }catch (error) {
            throw new Error(error.message); 
        }
    }
    async timeZoneDateCalculate(datas:any = [], otherDatas:any = []){
        try{
            let dateCalType = otherDatas['dateCalType'] || 'activity';
            let hireDate = otherDatas['hireDate'];
            let hireDateSetting = otherDatas['hireDateSetting'] || 0;
            let userTimezone = otherDatas['userTimezone'];
            let defaultTimezone = otherDatas['defaultTimezone'];
            let hireDateCount = otherDatas['hireDateCount'] || 0;
            
            datas['start_date'] = await this.commonDateService.DateTimeFormat(datas['start_date'],'YYYY-MM-DD');
            datas['end_date'] = await this.commonDateService.DateTimeFormat(datas['end_date'],'YYYY-MM-DD');
            if(dateCalType == 'activity'){
                datas['point_end_date'] =  (datas['point_end_date'] != '' && datas['point_end_date'] != null && datas['point_end_date'] != '0000-00-00 00:00:00') ? await this.commonDateService.DateTimeFormat(datas['point_end_date'],'YYYY-MM-DD') : '';
                datas['after_deadline_date'] =  (datas['consider_after_deadline'] == 1 && datas['after_deadline_date'] != '' && datas['after_deadline_date'] != null && datas['after_deadline_date'] != '0000-00-00 00:00:00') ? await this.commonDateService.DateTimeFormat(datas['after_deadline_date'],'YYYY-MM-DD') : '';
            } 
            let actPointDeadlineDate:any = '';
            let actPointAfterDeallineDate:any = '';
            let actPointDeadlineDateM:any = '';
            let actPointAfterDeallineDateM:any = '';
            let onlyDisplayStartDate:any = '';
            if(dateCalType == 'activity'){
                actPointDeadlineDate =  await this.commonDateService.DateTimeFormat(datas['point_end_date'],'timestamp');
                actPointDeadlineDateM = (datas['point_end_date'] != '' && datas['point_end_date'] != null && datas['point_end_date'] != '0000-00-00 00:00:00') ? await this.commonDateService.DateTimeFormat(datas['point_end_date'],'YYYY-MM-DD HH:mm:ss') : '';
                actPointAfterDeallineDate =  await this.commonDateService.DateTimeFormat(datas['after_deadline_date'],'timestamp');
                actPointAfterDeallineDateM = (datas['consider_after_deadline'] == 1 && datas['after_deadline_date'] != '' && datas['after_deadline_date'] != null && datas['after_deadline_date'] != '0000-00-00 00:00:00') ? await this.commonDateService.DateTimeFormat(datas['after_deadline_date'],'YYYY-MM-DD HH:mm:ss') : '';
            }
            if(hireDateSetting && hireDateSetting == 1 && hireDateCount && hireDateCount > 0){
                datas['end_date'] = this.commonDateService.getTodayDate(datas['start_date']).add(hireDateCount, 'days').format('YYYY-MM-DD');
            }
            let actStartDate:any = await this.commonDateService.DateTimeFormat(datas['start_date'],'timestamp');
            let actEndDate:any = await this.commonDateService.DateTimeFormat(datas['end_date'],'timestamp');
            if(hireDateSetting && hireDateSetting == 1){
                let totaldays = 0;
                totaldays =  Math.floor((actEndDate - actStartDate) / (60 * 60 * 24)) + 1;
                const hireDates:any =  await this.commonDateService.DateTimeFormat(hireDate,'timestamp');
                if (hireDate != '' && actStartDate < hireDates) {
                    let newStartDate = await this.commonDateService.DateTimeFormat(hireDate,'YYYY-MM-DD');
                    datas['start_date'] = newStartDate;
                    datas['end_date'] = this.commonDateService.getTodayDate(newStartDate).add(totaldays, 'days').format('YYYY-MM-DD');
                }
                if(dateCalType == 'activity'){
                    if (hireDate != '' && actStartDate < hireDates) {
                        if(datas['point_end_date'] != '' && datas['point_end_date'] != null && datas['point_end_date'] != '0000-00-00 00:00:00'){
                            let totaldayspointdealdline =  Math.floor((actPointDeadlineDate - actStartDate) / (60 * 60 * 24)) + 1;
                            datas['point_end_date'] = this.commonDateService.getTodayDate(datas['start_date']).add(totaldayspointdealdline, 'days').format('YYYY-MM-DD');
                        }
                        if(datas['consider_after_deadline'] == 1){
                            let totaldaysafterdealdline =  Math.floor((actPointAfterDeallineDate - actStartDate) / (60 * 60 * 24)) + 1;
                            datas['after_deadline_date'] = this.commonDateService.getTodayDate(datas['start_date']).add(totaldaysafterdealdline, 'days').format('YYYY-MM-DD');
                        }
                    }
                }
            }

            if (hireDateSetting && hireDateSetting == 1 && hireDateCount && hireDateCount > 0) {
                onlyDisplayStartDate = datas['start_date'];
                datas['start_date'] = this.commonDateService.getTodayDate(datas['start_date']).subtract(hireDateCount, 'days').format('YYYY-MM-DD');
            }
            let BioactFactStartDate:any = datas['start_date'] + ' 00:00:00';
            let BioactFactEndDate:any = datas['end_date'] + ' 23:59:59';
            let originalActStartDate:any = datas['start_date'] + ' 00:00:00';
            let originalActEndDate:any = datas['end_date']  + ' 23:59:59';
            let originalActPointDeallineDate:any = '';
            let originalActAfterDeallineDate:any = '';
            if(dateCalType == 'activity'){
                originalActPointDeallineDate = (datas['point_end_date'] != '' && datas['point_end_date'] != null && datas['point_end_date'] != '0000-00-00 00:00:00') ? datas['point_end_date']  + ' 23:59:59' : '';
                originalActAfterDeallineDate = (datas['consider_after_deadline'] == 1 && datas['after_deadline_date'] != '' && datas['after_deadline_date'] != null && datas['after_deadline_date'] != '0000-00-00 00:00:00') ? datas['after_deadline_date']  + ' 23:59:59' : '';
            }
            actStartDate = await this.commonDateService.DateTimeFormat(datas['start_date'],'timestamp');
            actEndDate = await this.commonDateService.DateTimeFormat(datas['end_date'],'timestamp');
            let actStartDateM:any = await this.commonDateService.DateTimeFormat(datas['start_date'],'YYYY-MM-DD HH:mm:ss');
            let actEndDateM:any = await this.commonDateService.DateTimeFormat(datas['end_date'],'YYYY-MM-DD HH:mm:ss');
            if(dateCalType == 'activity'){
                if(datas['point_end_date'] != '' && datas['point_end_date'] != null && datas['point_end_date'] != '0000-00-00 00:00:00'){
                    actPointDeadlineDate =  await this.commonDateService.DateTimeFormat(datas['point_end_date'] + ' 23:59:59','timestamp');
                }
                if(datas['consider_after_deadline'] == 1 && datas['after_deadline_date'] != '' && datas['after_deadline_date'] != null && datas['after_deadline_date'] != '0000-00-00 00:00:00'){
                    actPointAfterDeallineDate =  await this.commonDateService.DateTimeFormat(datas['after_deadline_date'] + ' 23:59:59','timestamp');
                }
            }
            if (userTimezone != '') {
                datas['start_date865'] = await this.commonDateService.DateTimeFormat(originalActStartDate,'','',userTimezone);
                datas['start_date865'] = await this.commonDateService.DateTimeFormat(datas['start_date865'],'','',defaultTimezone);
                datas['start_date865'] = await this.commonDateService.DateTimeFormat(datas['start_date865'],'YYYY-MM-DD HH:mm:ss');
                datas['end_date865'] = await this.commonDateService.DateTimeFormat(originalActEndDate,'','',userTimezone);
                datas['end_date865'] = await this.commonDateService.DateTimeFormat(datas['end_date865'],'','',defaultTimezone);
                datas['end_date865'] = await this.commonDateService.DateTimeFormat(datas['end_date865'],'YYYY-MM-DD HH:mm:ss');
                if(dateCalType == 'activity'){
                    datas['point_end_date865'] = '';
                    if (datas['point_end_date'] && (datas['point_end_date'] != '' && datas['point_end_date'] != null && datas['point_end_date'] != '0000-00-00 00:00:00')) {
                        datas['point_end_date865'] = await this.commonDateService.DateTimeFormat(originalActPointDeallineDate,'','',userTimezone);
                        datas['point_end_date865'] = await this.commonDateService.DateTimeFormat(datas['point_end_date865'],'','',defaultTimezone);
                        datas['point_end_date865'] = await this.commonDateService.DateTimeFormat(datas['point_end_date865'],'YYYY-MM-DD HH:mm:ss');
                    }
                    datas['after_deadline_date865'] = '';
                    if(datas['consider_after_deadline'] == 1){
                        if (datas['after_deadline_date'] && (datas['after_deadline_date'] != '' && datas['after_deadline_date'] != null && datas['after_deadline_date'] != '0000-00-00 00:00:00')) {
                            datas['after_deadline_date865'] = await this.commonDateService.DateTimeFormat(originalActAfterDeallineDate,'','',userTimezone);
                            datas['after_deadline_date865'] = await this.commonDateService.DateTimeFormat(datas['after_deadline_date865'],'','',defaultTimezone);
                            datas['after_deadline_date865'] = await this.commonDateService.DateTimeFormat(datas['after_deadline_date865'],'YYYY-MM-DD HH:mm:ss');
                        }
                    }
                }
            } else {
                datas['end_date'] = datas['end_date'] + ' 23:59:59';
            }
            let BioactPointEndDate = (datas['point_end_date'] && (datas['point_end_date'] != '' && datas['point_end_date'] != null && datas['point_end_date'] != '0000-00-00 00:00:00')) ? datas['point_end_date'] + ' 23:59:59' : '';
            if(dateCalType == 'activity'){
                if (userTimezone != '') {
                    let withoutTimezoneActivitys = appConstant.CAMPAIGN_CHECK_ACTIVITIES.CUSTOM_WITHOUT_TIMEZONE_CHECK_IDS;
                    if (!withoutTimezoneActivitys.includes(datas?.['activity']?.['id'])) {
                        actStartDate = await this.commonDateService.DateTimeFormat(datas['start_date865'],'timestamp');
                        actStartDateM = await this.commonDateService.DateTimeFormat(datas['start_date865'],'YYYY-MM-DD HH:mm:ss');
                        actEndDate = await this.commonDateService.DateTimeFormat(datas['end_date865'],'timestamp');
                        actEndDateM = await this.commonDateService.DateTimeFormat(datas['end_date865'],'YYYY-MM-DD HH:mm:ss');
                        if(dateCalType == 'activity'){
                            actPointDeadlineDate = (datas['point_end_date865'] != '' && datas['point_end_date865'] != '0000-00-00 00:00:00') ? await this.commonDateService.DateTimeFormat(datas['point_end_date865'],'timestamp') : '';
                            actPointDeadlineDateM = (datas['point_end_date865'] != '' && datas['point_end_date865'] != '0000-00-00 00:00:00') ? await this.commonDateService.DateTimeFormat(datas['point_end_date865'],'YYYY-MM-DD HH:mm:ss') : '';
                        }
                    }
                    originalActStartDate = await this.commonDateService.DateTimeFormat(datas['start_date865'],'YYYY-MM-DD HH:mm:ss');
                    originalActEndDate = await this.commonDateService.DateTimeFormat(datas['end_date865'],'YYYY-MM-DD HH:mm:ss');
                    originalActPointDeallineDate = (datas['point_end_date865'] != '' && datas['point_end_date865'] != '0000-00-00 00:00:00') ? await this.commonDateService.DateTimeFormat(datas['point_end_date865'],'YYYY-MM-DD HH:mm:ss') : '';
                }
            }
            let allDateArray = {};
            if(dateCalType == 'activity'){
                allDateArray = {
                    'originalActStartDate': originalActStartDate,
                    'originalActEndDate': originalActEndDate,
                    'originalActPointDeallineDate': originalActPointDeallineDate,
                    'originalActAfterDeallineDate': originalActAfterDeallineDate,
                    'BioactFactStartDate': BioactFactStartDate,
                    'BioactFactEndDate': BioactFactEndDate,
                    'BioactPointEndDate': BioactPointEndDate,
                    'actStartDate': actStartDate,
                    'actEndDate': actEndDate,
                    'actPointDeadlineDate': actPointDeadlineDate,
                    'actPointAfterDeallineDate': actPointAfterDeallineDate,
                    'actStartDateM': actStartDateM,
                    'actEndDateM': actEndDateM,
                    'actPointDeadlineDateM': actPointDeadlineDateM,
                    'actPointAfterDeallineDateM': actPointAfterDeallineDateM,
                    'onlyDisplayStartDate': onlyDisplayStartDate
                }
            }else{
                allDateArray = {
                    'originalActStartDate': originalActStartDate,
                    'originalActEndDate': originalActEndDate,
                    'BioactFactStartDate': BioactFactStartDate,
                    'BioactFactEndDate': BioactFactEndDate,
                    'actStartDate': actStartDate,
                    'actEndDate': actEndDate,
                    'actStartDateM': actStartDateM,
                    'actEndDateM': actEndDateM,
                    'onlyDisplayStartDate': onlyDisplayStartDate
                }
            }
            return [datas, allDateArray];
        }catch (error) {
            throw new Error(error.message); 
        }
    }
    async timeZoneDateCalculateReport(datas:any = [], otherDatas:any = []){
        try{
            let call_from = otherDatas['call_from'] || '';
            let hireDate = otherDatas['hireDate'];
            let dateRange = otherDatas['dateRange'] || 0;
            let filterStartDate:any = otherDatas['filterStartDate'] || '';
            let filterEndDate = otherDatas['filterEndDate'] || '';
            let dateCalType = otherDatas['dateCalType'] || 'activity';
            let myHireData = otherDatas['myHireData'] || {};
            let hireDateSetting = myHireData['hireDateSetting'] || 0;
            let hireDateCount = myHireData['hireDateCount'] || 0;
            let filterStartDateTS:any = (filterStartDate != '') ? await this.commonDateService.DateTimeFormat(filterStartDate,'timestamp') : '';
            let filterEndDateTS = (filterEndDate != '') ? await this.commonDateService.DateTimeFormat(filterEndDate,'timestamp') : '';
            let actStartDate:any = '';
            let actEndDate:any = '';
            let onlyDisplayStartDate:any = '';
            let actStartDateTS:any = await this.commonDateService.DateTimeFormat(datas['start_date'],'timestamp');
            let actEndDateTS:any = await this.commonDateService.DateTimeFormat(datas['end_date'],'timestamp');
            if(dateCalType == 'category' || dateCalType == 'challenge'){
                actStartDate = await this.commonDateService.DateTimeFormat(datas['start_date'],'YYYY-MM-DD');
                actEndDate = await this.commonDateService.DateTimeFormat(datas['end_date'],'YYYY-MM-DD');
                if (datas['consider_after_deadline'] == 1 && (datas['after_deadline_date'] != '' && datas['after_deadline_date'] != null &&  datas['after_deadline_date'] != '0000-00-00 00:00:00')) {
                    actEndDate = await this.commonDateService.DateTimeFormat(datas['after_deadline_date'],'YYYY-MM-DD') + ' 23:59:59';
                }
                actStartDateTS = await this.commonDateService.DateTimeFormat(actStartDate,'timestamp');
                actEndDateTS = await this.commonDateService.DateTimeFormat(actEndDate,'timestamp');
            }
            let actPointDeadlineDate:any = (datas['point_end_date'] != '' && datas['point_end_date'] != null && datas['point_end_date'] != '0000-00-00 00:00:00') ? await this.commonDateService.DateTimeFormat(datas['point_end_date'],'YYYY-MM-DD HH:mm:ss') : '';
            let actPointDeadlineDateTS:any =  (actPointDeadlineDate != '') ? await this.commonDateService.DateTimeFormat(actPointDeadlineDate,'timestamp') : '';
            let actPointAfterDeallineDate:any = (datas['consider_after_deadline'] == 1 && datas['after_deadline_date'] != '' && datas['after_deadline_date'] != null && datas['after_deadline_date'] != '0000-00-00 00:00:00') ? await this.commonDateService.DateTimeFormat(datas['after_deadline_date'],'YYYY-MM-DD HH:mm:ss') : '';
            let actPointAfterDeallineDateTS:any =  (actPointAfterDeallineDate != '') ? await this.commonDateService.DateTimeFormat(actPointAfterDeallineDate,'timestamp') : '';
            if (call_from == 8 && dateRange == 2) {
                actStartDate = filterStartDate + ' 00:00:00';
                actEndDate = filterEndDate + ' 23:59:59';
            } else {
                if (hireDateSetting == 1) {
                    let totaldays = 0;
                    totaldays =  Math.floor((actEndDateTS - actStartDateTS) / (60 * 60 * 24)) + 1;
                    if (hireDateCount && hireDateCount != 0) {
                        myHireData['totaldays'] = hireDateCount;
                    }
                    
                    const hireDates:any =  await this.commonDateService.DateTimeFormat(hireDate,'timestamp');
                    let newEndDate:any = await this.commonDateService.DateTimeFormat(hireDate,'YYYY-MM-DD') + ' 00:00:00';
                    let newEndDateTS = this.commonDateService.DateTimeFormat(newEndDate,'timestamp', 'YYYY-MM-DD HH:mm:ss');
                    if (actStartDateTS < newEndDateTS) {
                        if(dateCalType == 'activity'){
                            datas['end_date'] = this.commonDateService.getTodayDate(newEndDate, 'YYYY-MM-DD HH:mm:ss').add(totaldays, 'days').format('YYYY-MM-DD');
                            if(datas['point_end_date'] != '' && datas['point_end_date'] != null && datas['point_end_date'] != '0000-00-00 00:00:00'){
                                let totaldayspointdealdline =  Math.floor((actPointDeadlineDateTS - actStartDateTS) / (60 * 60 * 24)) + 1;
                                datas['point_end_date'] = this.commonDateService.getTodayDate(newEndDate, 'YYYY-MM-DD HH:mm:ss').add(totaldayspointdealdline, 'days').format('YYYY-MM-DD');
                            }
                            if(datas['consider_after_deadline'] == 1){
                                let totaldaysafterdealdline =  Math.floor((actPointAfterDeallineDateTS - actStartDateTS) / (60 * 60 * 24)) + 1;
                                datas['after_deadline_date'] = this.commonDateService.getTodayDate(newEndDate, 'YYYY-MM-DD HH:mm:ss').add(totaldaysafterdealdline, 'days').format('YYYY-MM-DD');
                            }
                        }else{
                            let newStartDate = await this.commonDateService.DateTimeFormat(hireDate,'YYYY-MM-DD');
                            datas['start_date'] = newStartDate;
                            datas['end_date'] = this.commonDateService.getTodayDate(newStartDate).add(totaldays, 'days').format('YYYY-MM-DD');
                            if(dateCalType == 'activity'){
                                if (hireDate != '' && actStartDateTS < hireDates) {
                                    if(datas['point_end_date'] != '' && datas['point_end_date'] != null && datas['point_end_date'] != '0000-00-00 00:00:00'){
                                        let totaldayspointdealdline =  Math.floor((actPointDeadlineDateTS - actStartDateTS) / (60 * 60 * 24)) + 1;
                                        datas['point_end_date'] = this.commonDateService.getTodayDate(datas['start_date']).add(totaldayspointdealdline, 'days').format('YYYY-MM-DD');
                                    }
                                    if(datas['consider_after_deadline'] == 1){
                                        let totaldaysafterdealdline =  Math.floor((actPointAfterDeallineDateTS - actStartDateTS) / (60 * 60 * 24)) + 1;
                                        datas['after_deadline_date'] = this.commonDateService.getTodayDate(datas['start_date']).add(totaldaysafterdealdline, 'days').format('YYYY-MM-DD');
                                    }
                                }
                            }
                        }
                    }
                    if (hireDateCount && hireDateCount != 0) {
                        onlyDisplayStartDate = datas['start_date'];
                        datas['start_date'] = this.commonDateService.getTodayDate(datas['start_date']).subtract(hireDateCount, 'days').format('YYYY-MM-DD');
                    }
                }
                actStartDate = await this.commonDateService.DateTimeFormat(datas['start_date'],'YYYY-MM-DD') + ' 00:00:00';
                actEndDate = await this.commonDateService.DateTimeFormat(datas['end_date'],'YYYY-MM-DD') + ' 23:59:59';
                if(datas['consider_after_deadline'] == 1 && datas['after_deadline_date'] != '' && datas['after_deadline_date'] != null && datas['after_deadline_date'] != '0000-00-00 00:00:00'){
                    actEndDate = await this.commonDateService.DateTimeFormat(datas['after_deadline_date'],'YYYY-MM-DD') + ' 23:59:59'
                }
                actStartDateTS = await this.commonDateService.DateTimeFormat(actStartDate,'timestamp');
                actEndDateTS = await this.commonDateService.DateTimeFormat(actEndDate,'timestamp');
            }
            datas['point_end_date'] =  (datas['point_end_date'] != '' && datas['point_end_date'] != null && datas['point_end_date'] != '0000-00-00 00:00:00') ? await this.commonDateService.DateTimeFormat(datas['point_end_date'],'YYYY-MM-DD') : '';
            datas['after_deadline_date'] =  (datas['consider_after_deadline'] == 1 && datas['after_deadline_date'] != '' && datas['after_deadline_date'] != null && datas['after_deadline_date'] != '0000-00-00 00:00:00') ? await this.commonDateService.DateTimeFormat(datas['after_deadline_date'],'YYYY-MM-DD') + ' 23:59:59' : '';
            actPointDeadlineDate = (datas['point_end_date'] != '' && datas['point_end_date'] != null) ? await this.commonDateService.DateTimeFormat(datas['point_end_date'],'YYYY-MM-DD') + ' 23:59:59' : '';
            actPointDeadlineDateTS = (actPointDeadlineDate != '') ? await this.commonDateService.DateTimeFormat(actPointDeadlineDate,'timestamp') : '';
            actPointAfterDeallineDate = (datas['after_deadline_date'] != '' && datas['after_deadline_date'] != null) ? await this.commonDateService.DateTimeFormat(datas['after_deadline_date'],'YYYY-MM-DD') + ' 23:59:59' : '';
            actPointAfterDeallineDateTS = (actPointAfterDeallineDate != '') ? await this.commonDateService.DateTimeFormat(actPointAfterDeallineDate,'timestamp') : '';
            if(dateCalType == 'activity'){
                if (call_from != 7 && dateRange == 1) {
                    actStartDate = filterStartDate;
                    actEndDate = filterEndDate;
                    actPointDeadlineDate = filterEndDate;
                    actPointAfterDeallineDate = filterEndDate;
                    actStartDateTS = (actStartDate != '') ? await this.commonDateService.DateTimeFormat(actStartDate,'timestamp') : '';
                    actEndDateTS = (actEndDate != '') ? await this.commonDateService.DateTimeFormat(actEndDate,'timestamp') : '';
                    actPointDeadlineDateTS = (actPointDeadlineDate != '') ? await this.commonDateService.DateTimeFormat(actPointDeadlineDate,'timestamp') : '';
                    actPointAfterDeallineDateTS = (actPointAfterDeallineDate != '') ? await this.commonDateService.DateTimeFormat(actPointAfterDeallineDate,'timestamp') : '';
                }
            }else{
                if (dateRange == 1) {
                    actStartDate = filterStartDate;
                    actEndDate = filterEndDate;
                    actPointDeadlineDate = filterEndDate;
                    actPointAfterDeallineDate = filterEndDate;
                    actStartDateTS = (actStartDate != '') ? await this.commonDateService.DateTimeFormat(actStartDate,'timestamp') : '';
                    actEndDateTS = (actEndDate != '') ? await this.commonDateService.DateTimeFormat(actEndDate,'timestamp') : '';
                    actPointDeadlineDateTS = (actPointDeadlineDate != '') ? await this.commonDateService.DateTimeFormat(actPointDeadlineDate,'timestamp') : '';
                    actPointAfterDeallineDateTS = (actPointAfterDeallineDate != '') ? await this.commonDateService.DateTimeFormat(actPointAfterDeallineDate,'timestamp') : '';
                }
            }
            let allDateArray = {
                'actStartDate': actStartDate,
                'actEndDate': actEndDate,
                'actPointDeadlineDate': actPointDeadlineDate,
                'actPointAfterDeallineDate': actPointAfterDeallineDate,
                'actStartDateTS': actStartDateTS,
                'actEndDateTS': actEndDateTS,
                'actPointDeadlineDateTS': actPointDeadlineDateTS,
                'actPointAfterDeallineDateTS': actPointAfterDeallineDateTS,
                'onlyDisplayStartDate': onlyDisplayStartDate,
                'myHireData': myHireData
            }
            return [datas, allDateArray];
        }catch (error) {
            throw new Error(error.message); 
        }
    } 
}

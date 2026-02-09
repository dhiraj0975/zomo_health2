import {
    appConstant,
    CommonArrayService,
    CommonDateService,
    CommonFileService,
    CommonHealthService,
    CommonService,
    tableConstant,
} from '@common-constants';
import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { CompanyService } from '../company/company.service';
import { IncentiveReportsService } from '../incentivereports/incentivereports.service';
import { ActivityFeedService } from '../tracker/activityfeeds.service';
import { FoodFeedService } from '../tracker/foodfeeds.service';
import { UserSheetData } from './input';
import { WeekStepsService } from './week';
const moment = require('moment-timezone');
const S3_URL = process.env.S3_URL_PROD;
const path = require('path');
const argon2 = require('argon2');
const { spawn } = require('child_process');
@Injectable()
export class UserChallengeHelperService {
    constructor(
        private readonly foodFeedsService: FoodFeedService,
        private readonly activityFeedsService: ActivityFeedService,
        private readonly weekStepsService: WeekStepsService,
        private readonly companyService: CompanyService,
        private readonly commonService: CommonService,
        private readonly commonHealthService: CommonHealthService,
        private readonly commonDateService: CommonDateService,
        private readonly commonFileService: CommonFileService,
        private readonly incentiveReportsService: IncentiveReportsService,
        private readonly commonArrayService: CommonArrayService,
        @Inject('COMMON_SERVICE')
        private readonly commonMicroservice: ClientProxy,
    ) { }
    async fetch_point_steps(
        table: any,
        field: any,
        user_column: any,
        activity_column: any,
        activity_id: string,
        where: any = '',
        user_id: string,
        groupBy: any = null,
        orderBy: any = null,
        addOrderBy: any = null,
    ) {
        try {
            let result: any = [];
            let condition = `food.${user_column} IN (${user_id}) AND food.status = 1`;
            if (activity_id != '') {
                condition += ` AND(food.${activity_column} IN${activity_id} OR food.appName='AppleHealthKit' OR food.appName='GoogleFit')`;
            } else {
                condition += ` AND(food.appName='AppleHealthKit' OR food.appName='GoogleFit')`;
            }
            if (where != '') {
                condition += ` AND ${where}`;
            }
            if (table == tableConstant.TRACKERS.TBL_FT_FOOD_FEEDS) {
                let groupBys = false;
                if (groupBy != null) {
                    groupBys = true;
                }
                result = await this.foodFeedsService.listRecord(
                    condition,
                    orderBy != null ? orderBy : null,
                    field,
                    true,
                    groupBy,
                    addOrderBy != null ? addOrderBy : null,
                );
            }
            if (table == tableConstant.TRACKERS.TBL_FT_ACTIVITY_FEEDS) {
                result = await this.activityFeedsService.listRecord(
                    condition,
                    orderBy != null ? orderBy : null,
                    field,
                    groupBy,
                );
            }
            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    async mapSheetDataChallengeReport(resultedData, challengeType, scheduleChallengeDetails, clmNameArr = [], teamData = []) {
        let scheduleChallenge = scheduleChallengeDetails;
        let finalData = [];
        let finalTeamData = [];
        let finalGroupData = [];
        let finalDepartmentData = [];
        let tempdatainfos = [];
        let teamdatainfos = [];
        let groupdatainfos = [];
        let departmentdatainfos = [];
        if (challengeType == 'A') {
            if (scheduleChallenge?.['ch']?.['bio_challenge_type'] == 'Sleep_Tracking') {
                let hourTrans = 'Hr';
                let minuteTrans = 'Min';
                if (scheduleChallenge?.team == 1) {
                    if (scheduleChallenge?.group_status == 1) {
                        clmNameArr.push(
                            'GROUP NAME',
                            'TEAM NAME',
                            'TOTAL SLEEP',
                            'TOTAL SLEEP COMPLETED',
                            'TOTAL % COMPLETION',
                            'DAYS LOGGED',
                            'DAYS COMPLETED',
                            'RANK',
                            'COMPLETED',
                        );
                    } else {
                        clmNameArr.push(
                            'TEAM NAME',
                            'TOTAL SLEEP',
                            'TOTAL SLEEP COMPLETED',
                            'TOTAL % COMPLETION',
                            'DAYS LOGGED',
                            'DAYS COMPLETED',
                            'RANK',
                            'COMPLETED',
                        );
                    }
                } else {
                    clmNameArr.push(
                        'TOTAL SLEEP',
                        'TOTAL SLEEP COMPLETED',
                        'TOTAL % COMPLETION',
                        'DAYS LOGGED',
                        'DAYS COMPLETED',
                        'RANK',
                        'COMPLETED',
                    );
                }
                let teamReportData = Object.create(null);
                let groupReportData = Object.create(null);
                for (let [key, reportData] of resultedData?.entries()) {
                    let tempdatainfo =
                        await this.commonHealthService.CommonFieldDataCallingCovid(
                            reportData.user,
                            clmNameArr,
                        );
                    if (reportData?.team_id) {
                        if (teamReportData[reportData.team_id]) {
                            teamReportData[reportData.team_id][
                                'required_sleep'
                            ] += reportData?.required_sleep || 0;
                            teamReportData[reportData.team_id]['total_sleep'] +=
                                reportData?.total_sleep || 0;
                            teamReportData[reportData.team_id][
                                'total_sleep_hr'
                            ] += reportData?.total_sleep_hr || 0;
                            teamReportData[reportData.team_id][
                                'total_sleep_min'
                            ] += reportData?.total_sleep_min || 0;
                            teamReportData[reportData.team_id][
                                'required_sleep_hr'
                            ] += reportData?.required_sleep_hr || 0;
                            teamReportData[reportData.team_id][
                                'required_sleep_min'
                            ] += reportData?.required_sleep_min || 0;
                        } else {
                            teamReportData[reportData.team_id] = {
                                team_name: reportData?.team_name || '',
                                required_sleep: reportData?.required_sleep || 0,
                                total_sleep: reportData?.total_sleep || 0,
                                total_sleep_hr: reportData?.total_sleep_hr || 0,
                                total_sleep_min:
                                    reportData?.total_sleep_min || 0,
                                required_sleep_hr:
                                    reportData?.required_sleep_hr || 0,
                                required_sleep_min:
                                    reportData?.required_sleep_min || 0,
                            };
                            if (scheduleChallenge?.team == 1) {
                                if (scheduleChallenge?.group_status == 1) {
                                    teamReportData[reportData.team_id][
                                        'group_name'
                                    ] = reportData?.group_name || '';
                                }
                            }
                        }
                    }
                    if (reportData?.group_id) {
                        if (groupReportData[reportData.group_id]) {
                            groupReportData[reportData.group_id]['required_sleep'] += reportData?.required_sleep || 0;
                            groupReportData[reportData.group_id]['total_sleep'] += reportData?.total_sleep || 0;
                            groupReportData[reportData.group_id]['total_sleep_hr'] += reportData?.total_sleep_hr || 0;
                            groupReportData[reportData.group_id]['total_sleep_min'] += reportData?.total_sleep_min || 0;
                            groupReportData[reportData.group_id]['required_sleep_hr'] += reportData?.required_sleep_hr || 0;
                            groupReportData[reportData.group_id]['required_sleep_min'] += reportData?.required_sleep_min || 0;
                        } else {
                            groupReportData[reportData.group_id] = {
                                group_name: reportData?.group_name || '',
                                required_sleep: reportData?.required_sleep || 0,
                                total_sleep: reportData?.total_sleep || 0,
                                total_sleep_hr: reportData?.total_sleep_hr || 0,
                                total_sleep_min: reportData?.total_sleep_min || 0,
                                required_sleep_hr: reportData?.required_sleep_hr || 0,
                                required_sleep_min: reportData?.required_sleep_min || 0,
                            };
                        }
                    }
                    if (scheduleChallenge?.team == 1) {
                        if (scheduleChallenge?.group_status == 1) {
                            tempdatainfo['GROUP NAME'] =
                                reportData?.group_name || '';
                        }
                        tempdatainfo['TEAM NAME'] = reportData?.team_name || '';
                    }
                    tempdatainfo['TOTAL SLEEP'] =
                        reportData?.required_sleep_text || '';
                    tempdatainfo['TOTAL SLEEP COMPLETED'] =
                        reportData?.total_sleep_text || '';
                    tempdatainfo['TOTAL % COMPLETION'] =
                        (reportData?.percent || 0) + '%';
                    tempdatainfo['DAYS LOGGED'] = reportData?.all_log_days || 0;
                    if (scheduleChallenge?.is_oz_meet_require_day != 0) {
                        tempdatainfo['DAYS COMPLETED'] =
                            reportData?.day_log || 0;
                    } else {
                        tempdatainfo['DAYS COMPLETED'] = 'N/A';
                    }
                    tempdatainfo['RANK'] = key + 1;
                    tempdatainfo['COMPLETED'] = reportData?.completed || '';
                    tempdatainfos.push(tempdatainfo);
                }
                if (scheduleChallenge?.team == 1 && teamReportData && Object.keys(teamReportData).length > 0) {
                    for (let [teamId, teamData] of Object.entries(teamReportData)) {
                        let teamTempData = Object.create(null);
                        let requiredSleepData = this.commonDateService.hour_minutes(teamData?.['required_sleep_hr'] || 0, teamData?.['required_sleep_min'] || 0);
                        let totalSleepData = this.commonDateService.hour_minutes(teamData?.['total_sleep_hr'] || 0, teamData?.['total_sleep_min'] || 0);
                        let requiredSleepText = requiredSleepData?.hour + ' ' + hourTrans + ' ' + requiredSleepData?.min + ' ' + minuteTrans;
                        let totalSleepText = totalSleepData?.hour + ' ' + hourTrans + ' ' + totalSleepData?.min + ' ' + minuteTrans;
                        if (scheduleChallenge?.group_status == 1) {
                            teamTempData['GROUP NAME'] = teamData?.['group_name'] || '';
                        }
                        teamTempData['TEAM NAME'] = teamData?.['team_name'] || '';
                        teamTempData['TOTAL SLEEP REQUIRED'] = requiredSleepText;
                        teamTempData['TOTAL SLEEP COMPLETED'] = totalSleepText;
                        let percent = ((teamData?.['total_sleep'] || 0) /
                            (teamData?.['required_sleep'] || 1)) *
                            100;
                        percent = this.commonArrayService.verifyPercentage(percent);
                        teamTempData['OVERALL % COMPLETION'] = percent + ' %';
                        clmNameArr.push(
                            'GROUP NAME',
                            'TOTAL SLEEP REQUIRED',
                            'OVERALL % COMPLETION',
                        );
                        teamdatainfos.push(teamTempData);
                    }
                }
                if (scheduleChallenge?.group_status == 1 && groupReportData && Object.keys(groupReportData).length > 0) {
                    for (let [groupId, groupData] of Object.entries(groupReportData)) {
                        let groupTempData = Object.create(null);
                        let requiredSleepData = this.commonDateService.hour_minutes(groupData?.['required_sleep_hr'] || 0, groupData?.['required_sleep_min'] || 0);
                        let totalSleepData = this.commonDateService.hour_minutes(groupData?.['total_sleep_hr'] || 0, groupData?.['total_sleep_min'] || 0);
                        let requiredSleepText = requiredSleepData?.hour + ' ' + hourTrans + ' ' + requiredSleepData?.min + ' ' + minuteTrans;
                        let totalSleepText = totalSleepData?.hour + ' ' + hourTrans + ' ' + totalSleepData?.min + ' ' + minuteTrans;
                        groupTempData['GROUP NAME'] = groupData?.['group_name'] || '';
                        groupTempData['TOTAL SLEEP REQUIRED'] = requiredSleepText;
                        groupTempData['TOTAL SLEEP COMPLETED'] = totalSleepText;
                        let percent = ((groupData?.['total_sleep'] || 0) /
                            (groupData?.['required_sleep'] || 1)) *
                            100;
                        percent = this.commonArrayService.verifyPercentage(percent);
                        groupTempData['OVERALL % COMPLETION'] = percent + ' %';
                        groupdatainfos.push(groupTempData);
                    }
                }
            }
            if (scheduleChallenge?.['ch']?.['bio_challenge_type'] == 'Hydrate') {
                let ozTrans = 'Oz';
                if (scheduleChallenge?.team == 1) {
                    if (scheduleChallenge?.group_status == 1) {
                        clmNameArr.push(
                            'GROUP NAME',
                            'TEAM NAME',
                            'TOTAL OZ',
                            'TOTAL OZ COMPLETED',
                            'TOTAL % COMPLETION',
                            'DAYS LOGGED',
                            'DAYS COMPLETED',
                            'RANK',
                            'COMPLETED',
                        );
                    } else {
                        clmNameArr.push(
                            'TEAM NAME',
                            'TOTAL OZ',
                            'TOTAL OZ COMPLETED',
                            'TOTAL % COMPLETION',
                            'DAYS LOGGED',
                            'DAYS COMPLETED',
                            'RANK',
                            'COMPLETED',
                        );
                    }
                } else {
                    clmNameArr.push(
                        'TOTAL OZ',
                        'TOTAL OZ COMPLETED',
                        'TOTAL % COMPLETION',
                        'DAYS LOGGED',
                        'DAYS COMPLETED',
                        'RANK',
                        'COMPLETED',
                    );
                }
                let teamReportData = Object.create(null);
                let groupReportData = Object.create(null);
                for (let [key, reportData] of resultedData?.entries()) {
                    let tempdatainfo = await this.commonHealthService.CommonFieldDataCallingCovid(reportData.user, clmNameArr);
                    if (reportData?.team_id) {
                        if (teamReportData[reportData.team_id]) {
                            teamReportData[reportData.team_id]['required_water'] += reportData?.required_water || 0;
                            teamReportData[reportData.team_id]['total_water'] += reportData?.total_water || 0;
                        } else {
                            teamReportData[reportData.team_id] = {
                                team_name: reportData?.team_name || '',
                                required_water: reportData?.required_water || 0,
                                total_water: reportData?.total_water || 0,
                            };
                            if (scheduleChallenge?.team == 1) {
                                if (scheduleChallenge?.group_status == 1) {
                                    teamReportData[reportData.team_id]['group_name'] = reportData?.group_name || '';
                                }
                            }
                        }
                    }
                    if (reportData?.group_id) {
                        if (groupReportData[reportData.group_id]) {
                            groupReportData[reportData.group_id]['required_water'] += reportData?.required_water || 0;
                            groupReportData[reportData.group_id]['total_water'] += reportData?.total_water || 0;
                        } else {
                            groupReportData[reportData.group_id] = {
                                group_name: reportData?.group_name || '',
                                required_water: reportData?.required_water || 0,
                                total_water: reportData?.total_water || 0,
                            };
                        }
                    }
                    if (scheduleChallenge?.team == 1) {
                        if (scheduleChallenge?.group_status == 1) {
                            tempdatainfo['GROUP NAME'] =
                                reportData?.group_name || '';
                        }
                        tempdatainfo['TEAM NAME'] = reportData?.team_name || '';
                    }
                    tempdatainfo['TOTAL OZ'] =
                        reportData?.required_water_text || '';
                    tempdatainfo['TOTAL OZ COMPLETED'] =
                        reportData?.total_water_text || '';
                    tempdatainfo['TOTAL % COMPLETION'] =
                        (reportData?.percent || 0) + '%';
                    tempdatainfo['DAYS LOGGED'] = reportData?.all_log_days || 0;
                    if (scheduleChallenge?.is_oz_meet_require_day != 0) {
                        tempdatainfo['DAYS COMPLETED'] =
                            reportData?.day_log || 0;
                    } else {
                        tempdatainfo['DAYS COMPLETED'] = 'N/A';
                    }
                    tempdatainfo['RANK'] = key + 1;
                    tempdatainfo['COMPLETED'] = reportData?.completed || '';
                    tempdatainfos.push(tempdatainfo);
                }
                if (scheduleChallenge?.team == 1 && teamReportData && Object.keys(teamReportData).length > 0) {
                    for (let [teamId, teamData] of Object.entries(teamReportData)) {
                        let teamTempData = Object.create(null);
                        let requiredWaterText = teamData?.['required_water'] + ' ' + ozTrans;
                        let totalWaterText = teamData?.['total_water'] + ' ' + ozTrans;
                        if (scheduleChallenge?.group_status == 1) {
                            teamTempData['GROUP NAME'] = teamData?.['group_name'] || '';
                        }
                        teamTempData['TEAM NAME'] = teamData?.['team_name'] || '';
                        teamTempData['TOTAL OZ REQUIRED'] = requiredWaterText;
                        teamTempData['TOTAL OZ COMPLETED'] = totalWaterText;
                        let percent = ((teamData?.['total_water'] || 0) /
                            (teamData?.['required_water'] || 1)) *
                            100;
                        percent = this.commonArrayService.verifyPercentage(percent);
                        teamTempData['OVERALL % COMPLETION'] = percent + ' %';
                        teamdatainfos.push(teamTempData);
                        clmNameArr.push(
                            'GROUP NAME',
                            'TOTAL OZ REQUIRED',
                            'OVERALL % COMPLETION',
                        );
                    }
                }
                if (scheduleChallenge?.group_status == 1 && groupReportData && Object.keys(groupReportData).length > 0) {
                    for (let [groupId, groupData] of Object.entries(groupReportData)) {
                        let groupTempData = Object.create(null);
                        let requiredWaterText = groupData?.['required_water'] + ' ' + ozTrans;
                        let totalWaterText = groupData?.['total_water'] + ' ' + ozTrans;
                        groupTempData['GROUP NAME'] = groupData?.['group_name'] || '';
                        groupTempData['TOTAL OZ REQUIRED'] = requiredWaterText;
                        groupTempData['TOTAL OZ COMPLETED'] = totalWaterText;
                        let percent = ((groupData?.['total_water'] || 0) /
                            (groupData?.['required_water'] || 1)) *
                            100;
                        percent = this.commonArrayService.verifyPercentage(percent);
                        groupTempData['OVERALL % COMPLETION'] = percent + ' %';
                        groupdatainfos.push(groupTempData);
                    }
                }
            }
            if (scheduleChallenge?.['ch']?.['bio_challenge_type'] == 'Football_step') {
                if (scheduleChallenge?.team == 1) {
                    if (scheduleChallenge?.group_status == 1) {
                        clmNameArr.push(
                            'GROUP NAME',
                            'TEAM NAME',
                        );
                    } else {
                        clmNameArr.push(
                            'TEAM NAME',
                        );
                    }
                }
                let stepWeeks = await this.weekStepsService.listRecord(
                    `weeksSteps.schedule_id IN (${scheduleChallenge.id})`,
                    { 'id': 'ASC' },
                    [],
                    null,
                );
                for (let stepWeek of stepWeeks) {
                    clmNameArr.push(
                        `Week ${stepWeek.week_no} Total Step`,
                        `Week ${stepWeek.week_no} Average Step`,
                        `Week ${stepWeek.week_no} Goal Was Met`
                    );
                }
                const challengestartdate = this.commonDateService.DateTimeFormat(
                    scheduleChallenge?.['start_date'],
                    'MM-DD-YYYY',
                    'YYYY-MM-DD HH:mm:ss',
                );
                const challengeenddate = this.commonDateService.DateTimeFormat(
                    scheduleChallenge?.['end_date'],
                    'MM-DD-YYYY',
                    'YYYY-MM-DD HH:mm:ss',
                );
                const challengeDates = this.commonDateService.getDatesInRange(challengestartdate, challengeenddate);
                for (const dateKey of challengeDates) {
                    clmNameArr.push(dateKey);
                }
                clmNameArr.push('TOTAL');
                let teamReportData = Object.create(null);
                let groupReportData = Object.create(null);
                for (let [key, reportData] of resultedData?.entries()) {
                    let tempdatainfo = await this.commonHealthService.CommonFieldDataCallingCovid(reportData.user, clmNameArr);
                    if (reportData?.team_id) {
                        if (!teamReportData[reportData.team_id]) {
                            teamReportData[reportData.team_id] = {
                                total_yard: reportData?.team_details?.total_yard || 0,
                                total_touchdown: reportData?.team_details?.total_touchdown || 0,
                                completed_steps: reportData?.team_details?.completed_steps || 0,
                                avrage_steps: reportData?.team_details?.avrage_steps || 0,
                                team_size: reportData?.team_details?.team_size || 0,
                                total_team_members: reportData?.team_details?.total_team_members || 0,
                                team_name: reportData?.team_details?.team_name || '',
                                group_name: reportData?.team_details?.group_name || '',
                                team_id: reportData?.team_details?.team_id || 0,
                                group_id: reportData?.team_details?.group_id || null,
                            };
                        }
                    }
                    if (scheduleChallenge?.team == 1) {
                        if (scheduleChallenge?.group_status == 1) {
                            tempdatainfo['GROUP NAME'] =
                                reportData?.group_name || '';
                        }
                        tempdatainfo['TEAM NAME'] = reportData?.team_name || '';
                    }
                    for (let stepWeek of stepWeeks) {
                        tempdatainfo[`Week ${stepWeek.week_no} Total Step`] = reportData?.weekStepsData?.[stepWeek.week_no]?.total || 0;
                        tempdatainfo[`Week ${stepWeek.week_no} Average Step`] = reportData?.weekStepsData?.[stepWeek.week_no]?.average || 0;
                        tempdatainfo[`Week ${stepWeek.week_no} Goal Was Met`] = reportData?.weekStepsData?.[stepWeek.week_no]?.met_goal || 'No';
                    }
                    for (const dateKey of challengeDates) {
                        tempdatainfo[dateKey] = reportData?.allDateSteps?.[dateKey] || 0;
                    }
                    tempdatainfo['TOTAL'] = reportData?.totalSteps || 0;
                    tempdatainfos.push(tempdatainfo);
                }
                if (scheduleChallenge?.team == 1) {
                    teamReportData = Object.values(teamReportData).sort((a: any, b: any) => (b?.completed_steps || 0) - (a?.completed_steps || 0));
                    let rank = 1;
                    for (let team of teamReportData) {
                        team.rank = rank++;
                    }
                    if (scheduleChallenge?.group_status == 1) {
                        for (let team of teamReportData) {
                            if (team?.group_id) {
                                if (!groupReportData[team?.group_id]) {
                                    groupReportData[team?.group_id] = {
                                        group_name: team?.group_name || '',
                                        total_yard: team?.total_yard || 0,
                                        total_touchdown: team?.total_touchdown || 0,
                                        completed_steps: team?.completed_steps || 0,
                                        avrage_steps: team?.avrage_steps || 0,
                                        group_id: team?.group_id || null,
                                    };
                                } else {
                                    groupReportData[team?.group_id]['total_yard'] += team?.total_yard || 0;
                                    groupReportData[team?.group_id]['total_touchdown'] += team?.total_touchdown || 0;
                                    groupReportData[team?.group_id]['completed_steps'] += team?.completed_steps || 0;
                                    groupReportData[team?.group_id]['avrage_steps'] += team?.avrage_steps || 0;
                                }
                            }
                        }
                        groupReportData = Object.values(groupReportData).sort((a: any, b: any) => (b?.completed_steps || 0) - (a?.completed_steps || 0));
                        let groupRank = 1;
                        for (let groupData of groupReportData) {
                            groupData['rank'] = groupRank++;
                        }
                    }
                }
                if (scheduleChallenge?.team == 1 && teamReportData && Object.keys(teamReportData).length > 0) {
                    for (let [teamId, teamData] of Object.entries(teamReportData)) {
                        let teamTempData = Object.create(null);
                        if (scheduleChallenge?.group_status == 1) {
                            teamTempData['GROUP NAME'] = teamData?.['group_name'] || '';
                        }
                        teamTempData['TEAM NAME'] = teamData?.['team_name'] || '';
                        teamTempData['TEAM SIZE'] = teamData?.['team_size'] || 0;
                        teamTempData['TEAM MEMBERS'] = teamData?.['total_team_members'] || 0;
                        teamTempData['TOTAL YARDS'] = teamData?.['total_yard'] || 0;
                        teamTempData['TOTAL TOUCHDOWNS'] = teamData?.['total_touchdown'] || 0;
                        teamTempData['AVERAGE STEPS'] = teamData?.['avrage_steps'] || 0;
                        teamTempData['RANK'] = teamData?.['rank'] || 0;
                        teamTempData['TOTAL STEPS'] = teamData?.['completed_steps'] || 0;
                        teamdatainfos.push(teamTempData);
                    }
                    clmNameArr.push(
                        'TEAM SIZE',
                        'TEAM MEMBERS',
                        'TOTAL YARDS',
                        'TOTAL TOUCHDOWNS',
                        'AVERAGE STEPS',
                        'RANK',
                        'TOTAL STEPS',
                    );
                }
                if (scheduleChallenge?.group_status == 1 && groupReportData && Object.keys(groupReportData).length > 0) {
                    for (let [groupId, groupData] of Object.entries(groupReportData)) {
                        let groupTempData = Object.create(null);
                        groupTempData['GROUP NAME'] = groupData?.['group_name'] || '';
                        groupTempData['TOTAL YARDS'] = groupData?.['total_yard'] || 0;
                        groupTempData['TOTAL TOUCHDOWNS'] = groupData?.['total_touchdown'] || 0;
                        groupTempData['AVERAGE STEPS'] = groupData?.['avrage_steps'] || 0;
                        groupTempData['RANK'] = groupData?.['rank'] || 0;
                        groupTempData['TOTAL STEPS'] = groupData?.['completed_steps'] || 0;
                        groupdatainfos.push(groupTempData);
                    }
                }
            }
            if (scheduleChallenge?.['ch']?.['bio_challenge_type'] == 'Relay_race') {
                clmNameArr = [
                    'RANK',
                    ...clmNameArr
                ]
                if (scheduleChallenge?.team == 1) {
                    if (scheduleChallenge?.group_status == 1) {
                        clmNameArr.push(
                            'GROUP NAME',
                            'TEAM NAME',
                        );
                    } else {
                        clmNameArr.push(
                            'TEAM NAME',
                        );
                    }
                }
                clmNameArr.push('CAPTAIN NAME', 'TOTAL STEPS', 'TOTAL % COMPLETION', 'AVERAGE STEPS');
                if (scheduleChallenge?.race_type == 3) {
                    clmNameArr.push('TIME ELAPSED DURING TURN', 'RACER NUMBER WITHIN TEAM');
                } else {
                    clmNameArr.push('RACER NUMBER WITHIN TEAM');
                }
                let teamReportData = Object.create(null);
                let groupReportData = Object.create(null);
                let userReportData = resultedData['userDetails'] || {};
                let teamReportDataFromResult = resultedData['allteamDetails'] || {};
                let groupReportDataFromResult = resultedData['allGroupDetails'] || {};
                for (let [key, reportData] of userReportData?.entries()) {
                    let tempdatainfo = await this.commonHealthService.CommonFieldDataCallingCovid(reportData.user, clmNameArr);
                    if (reportData?.team_id) {
                        if (!teamReportData[reportData.team_id]) {
                            teamReportData[reportData.team_id] = {
                                team_id: reportData?.team_details?.team_id || 0,
                                team_name: reportData?.team_details?.team_name || '',
                                company_name: reportData?.team_details?.company_name || '',
                                team_avg_steps: reportData?.team_details?.team_avg_steps || 0,
                                team_size: reportData?.team_details?.team_size || 0,
                                total_team_members: reportData?.team_details?.team_member_count || 0,
                                team_goal: reportData?.team_details?.team_goal || '',
                                group_name: reportData?.team_details?.group_name || '',
                                team_time: reportData?.team_details?.team_time || 0,
                                group_id: reportData?.team_details?.group_id || null,
                                team_total_real_steps: reportData?.team_details?.team_total_real_steps || 0,
                                team_progress: reportData?.team_details?.team_progress || 0,
                                team_member_met_goal_count: reportData?.team_details?.team_member_met_goal_count || 0,
                                team_member_count: reportData?.team_details?.team_member_count || 0,
                            };
                        }
                    }
                    if (scheduleChallenge?.team == 1) {
                        if (scheduleChallenge?.group_status == 1) {
                            tempdatainfo['GROUP NAME'] =
                                reportData?.group_name || '';
                        }
                        tempdatainfo['TEAM NAME'] = reportData?.team_name || '';
                    }
                    tempdatainfo['CAPTAIN NAME'] = reportData?.team_captain || '';
                    tempdatainfo['TOTAL STEPS'] = this.commonArrayService.formatUSStyle(reportData?.totalRealSteps) || 0;
                    tempdatainfo['TOTAL % COMPLETION'] = reportData?.percent || '0.00%';
                    tempdatainfo['AVERAGE STEPS'] = this.commonArrayService.formatUSStyle(reportData?.realAvrageSteps) || 0;
                    tempdatainfo['TIME ELAPSED DURING TURN'] = this.commonDateService.minutesToTimeWithSeconds(reportData?.user_complete_time || 0);
                    tempdatainfo['RACER NUMBER WITHIN TEAM'] = reportData?.user_order || 0;
                    tempdatainfo['RANK'] = reportData?.rank || 0;
                    tempdatainfos.push(tempdatainfo);
                }
                if (scheduleChallenge?.team == 1) {
                    let remainingTeamData = Object.create(null);
                    for (let [teamId, teamData] of Object.entries(teamReportDataFromResult)) {
                        if (!teamReportData[teamId]) {
                            remainingTeamData[teamId] = {
                                team_id: teamData?.['team_id'] || 0,
                                team_name: teamData?.['team_name'] || '',
                                company_name: teamData?.['company_name'] || '',
                                team_avg_steps: teamData?.['team_avg_steps'] || 0,
                                team_size: teamData?.['team_size'] || 0,
                                total_team_members: teamData?.['team_member_count'] || 0,
                                team_goal: teamData?.['team_goal'] || '',
                                group_name: teamData?.['group_name'] || '',
                                team_time: teamData?.['team_time'] || 0,
                                group_id: teamData?.['group_id'] || null,
                                team_total_real_steps: teamData?.['team_total_real_steps'] || null,
                                team_progress: teamData?.['team_progress'] || null,
                                team_member_met_goal_count: teamData?.['team_member_met_goal_count'] || null,
                                team_member_count: teamData?.['team_member_count'] || null,
                            }
                        }
                    }
                    teamReportData = {
                        ...teamReportData,
                        ...remainingTeamData
                    };
                    teamReportData = Object.values(teamReportData).sort(
                        (a: any, b: any) => {
                            if (a?.team_progress == b?.team_progress) {
                                if (Number(a?.team_total_real_steps) == Number(b?.team_total_real_steps)) {
                                    if (a?.team_time == b?.team_time) {
                                        return b?.total_team_members - a?.total_team_members;
                                    }
                                    return (b?.team_time || 0) - (a?.team_time || 0);
                                }
                                return (Number(b?.team_total_real_steps) || 0) - (Number(a?.team_total_real_steps) || 0);
                            }
                            return (b?.team_progress || 0) - (a?.team_progress || 0);
                        }
                    );
                    let rank = 1;
                    for (let team of teamReportData) {
                        team.rank = rank++;
                    }
                    if (scheduleChallenge?.group_status == 1) {
                        
                        const groupStats = new Map<number | string, {
                            total_teams: number;
                            total_progress: number;
                            group_name: string;
                            group_steps: number;
                            group_average_steps: number;
                            company_name: string;
                            group_time: number;
                        }>();
                        for (const team of teamReportData) {
                            const gid = team?.group_id;
                            if (!gid) continue;
                            if (!groupStats.has(gid)) {
                                groupStats.set(gid, {
                                    total_teams: 0,
                                    total_progress: 0,
                                    group_name: team.group_name || '',
                                    group_steps: 0,
                                    group_average_steps: 0,
                                    company_name: team.company_name || '',
                                    group_time: 0,
                                });
                            }
                            const stats = groupStats.get(gid)!;
                            stats.total_teams += 1;
                            stats.total_progress += team.team_progress ?? 0;
                            stats.group_steps += Number(team.team_total_real_steps) ?? 0;
                            stats.group_average_steps += Number(team.team_avg_steps) ?? 0;
                            stats.group_time += team.team_time ?? 0;
                        }
                        for (const [groupId, data] of Object.entries(groupReportDataFromResult)) {
                            if (!groupStats.has(groupId)) {
                                groupStats.set(groupId, {
                                    total_teams: 0,
                                    total_progress: 0,
                                    group_name: data?.['group_name'] || '',
                                    group_steps: data?.['group_steps'] ?? 0,
                                    group_average_steps: data?.['group_average_steps'] ?? 0,
                                    company_name: data?.['company_name'] || '',
                                    group_time: data?.['group_time'] ?? 0,
                                });
                            }
                        }
                        groupReportData = [...groupStats.values()]
                            .map(group => ({
                                ...group,
                                group_progress: group.total_teams > 0
                                    ? group.total_progress / group.total_teams
                                    : 0,
                            }))
                            .sort((a, b) => {
                                if (a.group_progress !== b.group_progress) {
                                    return b.group_progress - a.group_progress;
                                }
                                if (a.group_steps !== b.group_steps) {
                                    return b.group_steps - a.group_steps;
                                }
                                return (a.group_time ?? 0) - (b.group_time ?? 0);
                            })
                            .map((group, index) => ({
                                ...group,
                                rank: index + 1,
                            }));
                    }
                }
                if (scheduleChallenge?.team == 1 && teamReportData && Object.keys(teamReportData).length > 0) {
                    for (let [teamId, teamData] of Object.entries(teamReportData)) {
                        let teamTempData = Object.create(null);
                        teamTempData['RANK'] = teamData?.['rank'] || 0;
                        teamTempData['ORGANIZATION'] = teamData?.['company_name'] || '';
                        if (scheduleChallenge?.group_status == 1) {
                            teamTempData['GROUP NAME'] = teamData?.['group_name'] || '';
                        }
                        teamTempData['TEAM NAME'] = teamData?.['team_name'] || '';
                        teamTempData['TEAM SIZE'] = teamData?.['team_size'] || 0;
                        teamTempData['TEAM MEMBERS'] = teamData?.['total_team_members'] || 0;
                        teamTempData['TEAM TOTAL STEPS'] = this.commonArrayService.formatUSStyle(teamData?.['team_total_real_steps']) || 0;
                        teamTempData['TOTAL % COMPLETION'] = teamData?.['team_progress'] || 0;
                        teamTempData['AVERAGE STEPS'] = this.commonArrayService.formatUSStyle(teamData?.['team_avg_steps']) || 0;
                        teamTempData['TIME ELAPSED TO COMPLETE RACE'] = this.commonDateService.minutesToTimeWithSeconds(teamData?.['team_time'] || 0);
                        teamTempData['Number of Racers that Met the Requirements'] = teamData?.['team_member_met_goal_count'] || 0;
                        teamdatainfos.push(teamTempData);
                    }
                    clmNameArr.push(
                        'TEAM SIZE',
                        'TEAM MEMBERS',
                        'TEAM TOTAL STEPS',
                        'TOTAL TOUCHDOWNS',
                        'TOTAL % COMPLETION',
                        'AVERAGE STEPS',
                    );
                    if (scheduleChallenge?.race_type == 3) {
                        clmNameArr.push('TIME ELAPSED TO COMPLETE RACE', 'Number of Racers that Met the Requirements');
                    } else {
                        clmNameArr.push('Number of Racers that Met the Requirements');
                    }
                }
                if (scheduleChallenge?.group_status == 1 && groupReportData && Object.keys(groupReportData).length > 0) {
                    for (let [groupId, groupData] of Object.entries(groupReportData)) {
                        let groupTempData = Object.create(null);
                        groupTempData['RANK'] = groupData?.['rank'] || 0;
                        groupTempData['GROUP NAME'] = groupData?.['group_name'] || '';
                        groupTempData['TOTAL STEPS'] = this.commonArrayService.formatUSStyle(groupData?.['group_steps']) || 0;
                        // groupTempData['AVERAGE STEPS'] = this.commonArrayService.formatUSStyle(groupData?.['group_average_steps']) || 0;
                        groupTempData['TIME ELAPSED TO COMPLETE RACE'] = this.commonDateService.minutesToTimeWithSeconds(groupData?.['group_time'] || 0);
                        groupdatainfos.push(groupTempData);
                    }
                }
            }
        }
        if (challengeType == 'R') {
            if (scheduleChallenge?.team == 1) {
                if (scheduleChallenge?.group_status == 1) {
                    clmNameArr.push(
                        'GROUP NAME',
                        'TEAM NAME',
                        'RECIPE NAME',
                        'RECIPE TYPE',
                        'RECIPE INGREDIENTS',
                        'RECIPE DIRECTION',
                        'WHAT MAKES THIS RECIPE HEALTHY',
                        'RECIPE ADDITIONAL NOTE',
                        'ATTACHMENT',
                        'ADDED DATE',
                    );
                } else {
                    clmNameArr.push(
                        'TEAM NAME',
                        'RECIPE NAME',
                        'RECIPE TYPE',
                        'RECIPE INGREDIENTS',
                        'RECIPE DIRECTION',
                        'WHAT MAKES THIS RECIPE HEALTHY',
                        'RECIPE ADDITIONAL NOTE',
                        'ATTACHMENT',
                        'ADDED DATE',
                    );
                }
            } else {
                clmNameArr.push(
                    'RECIPE NAME',
                    'RECIPE TYPE',
                    'RECIPE INGREDIENTS',
                    'RECIPE DIRECTION',
                    'WHAT MAKES THIS RECIPE HEALTHY',
                    'RECIPE ADDITIONAL NOTE',
                    'ATTACHMENT',
                    'ADDED DATE',
                );
            }
            let teamReportData = Object.create(null);
            let groupReportData = Object.create(null);
            for (let [key, reportData] of resultedData?.entries()) {
                let tempdatainfo = await this.commonHealthService.CommonFieldDataCallingCovid(reportData.user, clmNameArr);
                if (reportData?.team_id) {
                    if (teamReportData[reportData.team_id]) {
                        teamReportData[reportData.team_id]['recipe_name'] = reportData?.recipe_name || '';
                        teamReportData[reportData.team_id]['recipe_type'] = reportData?.recipe_type || '';
                    } else {
                        teamReportData[reportData.team_id] = {
                            team_name: reportData?.team_name || '',
                            recipe_name: reportData?.recipe_name || '',
                            recipe_type: reportData?.recipe_type || '',
                        };
                        if (scheduleChallenge?.team == 1) {
                            if (scheduleChallenge?.group_status == 1) {
                                teamReportData[reportData.team_id][
                                    'group_name'
                                ] = reportData?.group_name || '';
                            }
                        }
                    }
                }
                if (reportData?.group_id) {
                    if (groupReportData[reportData.group_id]) {
                        groupReportData[reportData.group_id]['recipe_name'] = reportData?.recipe_name || '';
                        groupReportData[reportData.group_id]['recipe_type'] = reportData?.recipe_type || '';
                    } else {
                        groupReportData[reportData.group_id] = {
                            group_name: reportData?.group_name || '',
                            recipe_name: reportData?.recipe_name || '',
                            recipe_type: reportData?.recipe_type || '',
                        };
                    }
                }
                if (scheduleChallenge?.team == 1) {
                    if (scheduleChallenge?.group_status == 1) {
                        tempdatainfo['GROUP NAME'] = reportData?.group_name || '';
                    }
                    tempdatainfo['TEAM NAME'] = reportData?.team_name || '';
                }
                tempdatainfo['RECIPE NAME'] = reportData?.recipe_name || '';
                tempdatainfo['RECIPE TYPE'] = reportData?.recipe_type || '';
                tempdatainfo['RECIPE INGREDIENTS'] = this.commonHealthService.clearHTMLTags(reportData?.recipe_ingredients) || '';
                tempdatainfo['WHAT MAKES THIS RECIPE HEALTHY'] = this.commonHealthService.clearHTMLTags(reportData?.recipe_healthy) || '';
                tempdatainfo['RECIPE ADDITIONAL NOTE'] = this.commonHealthService.clearHTMLTags(reportData?.recipe_additional_notes) || '';
                tempdatainfo['ATTACHMENT'] = reportData?.recipe_attachment || '';
                tempdatainfo['ADDED DATE'] = reportData?.recipe_created || '';
                tempdatainfos.push(tempdatainfo);
            }
            if (scheduleChallenge?.team == 1 && teamReportData && Object.keys(teamReportData).length > 0) {
                for (let [teamId, teamData] of Object.entries(teamReportData)) {
                    let teamTempData = Object.create(null);
                    if (scheduleChallenge?.group_status == 1) {
                        teamTempData['GROUP NAME'] = teamData?.['group_name'] || '';
                    }
                    teamTempData['TEAM NAME'] = teamData?.['team_name'] || '';
                    teamTempData['RECIPE NAME'] = teamData?.['recipe_name'] || '';
                    teamTempData['RECIPE TYPE'] = teamData?.['recipe_type'] || '';
                    teamdatainfos.push(teamTempData);
                }
            }
            if (scheduleChallenge?.group_status == 1 && groupReportData && Object.keys(groupReportData).length > 0) {
                for (let [groupId, groupData] of Object.entries(groupReportData)) {
                    let groupTempData = Object.create(null);
                    groupTempData['GROUP NAME'] = groupData?.['group_name'] || '';
                    groupTempData['RECIPE NAME'] = groupData?.['recipe_name'] || '';
                    groupTempData['RECIPE TYPE'] = groupData?.['recipe_type'] || '';
                    groupdatainfos.push(groupTempData);
                }
            }
        }
        if (challengeType == 'B') {
            if (scheduleChallenge?.team == 1) {
                if (scheduleChallenge['ch']['bio_challenge_type'] == 'Football') {
                    clmNameArr.push('TEAM', 'TEAM SIZE', 'TEAM MEMBERS', 'TOTAL WEIGHT LOSS', 'TOTAL YARDS', 'TOTAL TOUCHDOWNS', 'RANK');
                }
                else {
                    if (scheduleChallenge?.group_status == 1) {
                        clmNameArr.push(
                            'GROUP NAME',
                            'TEAM NAME',
                            'RANK',
                        );
                    } else {
                        clmNameArr.push(
                            'TEAM NAME',
                            'TEAM SIZE',
                            'TEAM MEMBERS',
                            'TOTAL WEIGHT LOSS',
                            'RANK'
                        );
                    }
                }
            } else if (scheduleChallenge?.team == 2) {
                clmNameArr.push(
                    'RANK',
                    'RANKING',
                );
            } else {
                clmNameArr.push(
                    'RANK',
                    'FIRST WEIGHT ENTERED',
                    'LAST WEIGHT ENTERED',
                    'MET CHALLENGE REQUIREMENTS',
                );
            }
            let teamReportData = Object.create(null);
            let groupReportData = Object.create(null);
            for (let [key, reportData] of resultedData?.entries()) {
                let tempdatainfo = await this.commonHealthService.CommonFieldDataCallingCovid(reportData, clmNameArr);
                if (scheduleChallenge['ch']['bio_challenge_type'] == 'Football') {
                    for (let team of teamData) {
                        if (teamReportData[team?.id]) {
                            teamReportData[team?.id]['TEAM'] = team?.tname || '';
                            teamReportData[team?.id]['TEAM SIZE'] = team?.team_size || '';
                            teamReportData[team?.id]['TEAM MEMBERS'] = team?.team_size || '';
                            teamReportData[team?.id]['TOTAL WEIGHT LOSS'] = team?.score || '';
                            teamReportData[team?.id]['TOTAL YARDS'] = team?.score || '';
                            teamReportData[team?.id]['TOTAL TOUCHDOWNS'] = team?.score || '';
                            teamReportData[team?.id]['RANK'] = team?.rank || '';
                        } else {
                            teamReportData[team?.id] = {
                                'TEAM': team?.tname || '',
                                'TEAM SIZE': team?.team_size || '',
                                'TEAM MEMBERS': team?.team_size || '',
                                'TOTAL WEIGHT LOSS': team?.score || '',
                                'TOTAL YARDS': team?.score || '',
                                'TOTAL TOUCHDOWNS': team?.score || '',
                                'RANK': team?.rank || '',
                            };
                        }
                    }
                }
                else {
                    if (reportData?.team?.id) {
                        if (teamReportData[reportData?.team?.id]) {
                            teamReportData[reportData?.team?.id]['TEAM NAME'] = reportData?.team?.tname || '';
                            teamReportData[reportData?.team?.id]['TEAM SIZE'] = reportData?.team?.team_size || '';
                            teamReportData[reportData?.team?.id]['TEAM MEMBERS'] = reportData?.team?.team_size || '';
                            teamReportData[reportData?.team?.id]['TOTAL WEIGHT LOSS'] = reportData?.score || '';
                            teamReportData[reportData?.team?.id]['RANK'] = reportData?.rank || '';
                        } else {
                            teamReportData[reportData?.team?.id] = {
                                'TEAM NAME': reportData?.team?.tname || '',
                                'TEAM SIZE': reportData?.team?.team_size || '',
                                'TEAM MEMBERS': reportData?.team?.team_size || '',
                                'TOTAL WEIGHT LOSS': reportData?.score || '',
                                'RANK': reportData?.rank || '',
                            };
                        }
                        if (scheduleChallenge?.team == 1) {
                            if (scheduleChallenge?.group_status == 1) {
                                teamReportData[reportData?.team?.id]['GROUP NAME'] = reportData?.group_name || '';
                                teamReportData[reportData?.team?.id]['TEAM NAME'] = reportData?.team?.tname || '';
                                teamReportData[reportData?.team?.id]['RANK'] = reportData?.rank || '';
                            }
                        }
                    }
                    if (reportData?.group_id) {
                        if (groupReportData[reportData.group_id]) {
                            teamReportData[reportData?.team?.id]['GROUP NAME'] = reportData?.group_name || '';
                            teamReportData[reportData?.team?.id]['TEAM NAME'] = reportData?.team?.tname || '';
                            teamReportData[reportData?.team?.id]['RANK'] = reportData?.rank || '';
                        } else {
                            groupReportData[reportData.group_id] = {
                                'GROUP NAME': reportData?.group_name || '',
                                'TEAM NAME': reportData?.team?.tname || '',
                                'RANK': reportData?.rank || '',
                            };
                        }
                    }
                }
                if (scheduleChallenge?.team == 1) {
                    if (scheduleChallenge?.group_status == 1) {
                        tempdatainfo['GROUP NAME'] = reportData?.group_name || '';
                    }
                    tempdatainfo['TEAM NAME'] = reportData?.team?.tname || '';
                }
                tempdatainfo['RANK'] = reportData?.rank || '';
                tempdatainfo['FIRST WEIGHT ENTERED'] = reportData?.firstWeight || '';
                tempdatainfo['LAST WEIGHT ENTERED'] = reportData?.lastWeight || '';
                tempdatainfo['MET CHALLENGE REQUIREMENTS'] = reportData?.metGoal || '';
                tempdatainfos.push(tempdatainfo);
                if (scheduleChallenge?.team == 2) {
                    let departmentTempData = Object.create(null);
                    departmentTempData['ORGANIZATION'] = reportData?.company?.company_name || '';
                    departmentTempData['DEPARTMENT'] = reportData?.department?.dept_name || '';
                    departmentTempData['LOCATION'] = reportData?.Location?.location_name || '';
                    departmentTempData['RANKING'] = reportData?.rank || '';
                    departmentdatainfos.push(departmentTempData);
                }
            }
            if (scheduleChallenge?.team == 1 && teamReportData && Object.keys(teamReportData).length > 0) {
                for (let [teamId, teamData] of Object.entries(teamReportData)) {
                    let teamTempData = Object.create(null);
                    if (scheduleChallenge['ch']['bio_challenge_type'] == 'Football') {
                        if (scheduleChallenge?.group_status == 1) {
                            teamTempData['GROUP NAME'] = teamData?.['GROUP NAME'] || '';
                        }
                        teamTempData['TEAM'] = teamData?.['TEAM'] || '';
                        teamTempData['TEAM SIZE'] = teamData?.['TEAM SIZE'] || '';
                        teamTempData['TEAM MEMBERS'] = teamData?.['TEAM MEMBERS'] || '';
                        teamTempData['TOTAL WEIGHT LOSS'] = teamData?.['TOTAL WEIGHT LOSS'] || '';
                        teamTempData['TOTAL YARDS'] = teamData?.['TOTAL YARDS'] || '';
                        teamTempData['TOTAL TOUCHDOWNS'] = teamData?.['TOTAL TOUCHDOWNS'] || '';
                        teamTempData['RANK'] = teamData?.['RANK'] || '';
                    }
                    else {
                        if (scheduleChallenge?.group_status == 1) {
                            teamTempData['GROUP NAME'] = teamData?.['GROUP NAME'] || '';
                        }
                        teamTempData['TEAM NAME'] = teamData?.['TEAM NAME'] || '';
                        teamTempData['FIRST WEIGHT ENTERED'] = teamData?.['FIRST WEIGHT ENTERED'] || '';
                        teamTempData['LAST WEIGHT ENTERED'] = teamData?.['LAST WEIGHT ENTERED'] || '';
                        teamTempData['MET CHALLENGE REQUIREMENTS'] = teamData?.['MET CHALLENGE REQUIREMENTS'] || '';
                        teamTempData['RANK'] = teamData?.['RANK'] || '';
                    }
                    teamdatainfos.push(teamTempData);
                }
            }
            if (scheduleChallenge?.group_status == 1 && groupReportData && Object.keys(groupReportData).length > 0) {
                for (let [groupId, groupData] of Object.entries(groupReportData)) {
                    let groupTempData = Object.create(null);
                    groupTempData['GROUP NAME'] = groupData?.['group_name'] || '';
                    groupTempData['TEAM NAME'] = groupData?.['TEAM NAME'] || '';
                    groupTempData['RANK'] = groupData?.['RANK'] || '';
                    groupdatainfos.push(groupTempData);
                }
            }
        }
        finalData = tempdatainfos.map((item) =>
            clmNameArr.reduce((acc, key) => {
                if (item?.[key] || item?.[key] == 0) {
                    acc[key] = item[key];
                }
                return acc;
            }, {})
        );
        if (scheduleChallenge?.['ch']?.['bio_challenge_type'] == 'Relay_race') {
            let clmNameArrTeam = [
                'RANK', 'ORGANIZATION', 'TEAM NAME', 'TEAM SIZE', 'TEAM MEMBERS', 'TEAM TOTAL STEPS',
                'TOTAL % COMPLETION', 'AVERAGE STEPS', 'TIME ELAPSED TO COMPLETE RACE',
                'Number of Racers that Met the Requirements'
            ]
            finalTeamData = teamdatainfos.map((item) =>
                clmNameArrTeam.reduce((acc, key) => {
                    if (item?.[key] || item?.[key] == 0) {
                        acc[key] = item[key];
                    }
                    return acc;
                }, {})
            );
        } else {
            finalTeamData = teamdatainfos.map((item) =>
                clmNameArr.reduce((acc, key) => {
                    if (item?.[key] || item?.[key] == 0) {
                        acc[key] = item[key];
                    }
                    return acc;
                }, {})
            );
        }
        finalGroupData = groupdatainfos.map((item) =>
            clmNameArr.reduce((acc, key) => {
                if (item?.[key] || item?.[key] == 0) {
                    acc[key] = item[key];
                }
                return acc;
            }, {})
        );
        finalDepartmentData = departmentdatainfos.map((item) =>
            clmNameArr.reduce((acc, key) => {
                if (item?.[key] || item?.[key] == 0) {
                    acc[key] = item[key];
                }
                return acc;
            }, {})
        );
        if (scheduleChallenge?.team == 1) {
            if (scheduleChallenge?.group_status == 1) {
                return {
                    challengeData: finalData,
                    challengeTeamData: finalTeamData,
                    challengeGroupData: finalGroupData,
                };
            }
            return {
                challengeData: finalData,
                challengeTeamData: finalTeamData,
            };
        }
        if (scheduleChallenge?.team == 2) {
            return {
                challengeData: finalData,
                challengeDepartmentData: finalDepartmentData,
            };
        }
        return { challengeData: finalData };
    }
    async createChallengeExcelFile(
        scheduleChallenge,
        orgId,
        fileMappedData,
        fileMappedTeamData,
        fileMappedGroupData,
    ) {
        try {
            let directory = path.join(
                appConstant.COMPANY_CHALLENGE_REPORT,
                this.commonFileService.sanitizeFileName(orgId),
            );
            let fileName = `Challenge_Report_${scheduleChallenge?.['custom_cname'].replace(/[^A-Za-z0-9\-]/g, '_')}_${moment().format('YYYYMMDD_HHmmss')}_${await this.commonDateService.DateTimeFormat('now', 'timestamp')}.json`;
            let fileNameTeam = `Challenge_Report_Team_${scheduleChallenge?.['custom_cname'].replace(/[^A-Za-z0-9\-]/g, '_')}_${moment().format('YYYYMMDD_HHmmss')}_${await this.commonDateService.DateTimeFormat('now', 'timestamp')}.json`;
            let fileNameGroup = `Challenge_Report_Group_${scheduleChallenge?.['custom_cname'].replace(/[^A-Za-z0-9\-]/g, '_')}_${moment().format('YYYYMMDD_HHmmss')}_${await this.commonDateService.DateTimeFormat('now', 'timestamp')}.json`;
            let filePath = path.join(directory, fileName);
            let filePathTeam = path.join(directory, fileNameTeam);
            let filePathGroup = path.join(directory, fileNameGroup);
            let filePathh = path.join(`${directory}`);
            let jsonString = JSON.stringify(fileMappedData, null, 2);
            let jsonStringTeam = JSON.stringify(fileMappedTeamData, null, 2);
            let jsonStringGroup = JSON.stringify(fileMappedGroupData, null, 2);
            if (scheduleChallenge?.team == 1) {
                let writeFile = await this.commonFileService.writeFile(
                    filePathh,
                    jsonString,
                    fileName,
                );
                let writeFileTeam = await this.commonFileService.writeFile(
                    filePathh,
                    jsonStringTeam,
                    fileNameTeam,
                );
                let writeFileGroup;
                if (scheduleChallenge?.group_status == 1) {
                    writeFileGroup = await this.commonFileService.writeFile(
                        filePathh,
                        jsonStringGroup,
                        fileNameGroup,
                    );
                }
                if (writeFile?.status == 'success' && writeFileTeam?.status == 'success' && (scheduleChallenge?.group_status == 1 ? writeFileGroup?.status == 'success' : true)) {
                    let jsonFilePaths = [filePathTeam, filePath];
                    if (scheduleChallenge?.group_status == 1) {
                        jsonFilePaths = [filePathGroup, filePathTeam, filePath];
                    }
                    let jsonPathsString = jsonFilePaths.join(',');
                    let excelData: any =
                        await this.commonFileService.createJsonToFile(
                            1,
                            `${jsonPathsString}`,
                            'pythonjsontoxlsx.py',
                            '',
                            true,
                            scheduleChallenge.team ? (scheduleChallenge.group_status == 1 ? 'group' : 'team') : 'normal',
                            // scheduleChallenge.team ? 'team' : 'normal',
                        );
                    if (excelData?.status == 'success') {
                        let tempFilepath = `${filePathTeam}`.replace('.json', '.xlsx');
                        filePathTeam = `${filePathTeam}`.replace('.json', '.xlsx');
                        if (scheduleChallenge?.group_status == 1) {
                            filePathGroup = `${filePathGroup}`.replace('.json', '.xlsx');
                            tempFilepath = `${filePathGroup}`.replace('.json', '.xlsx');
                        }
                        if (await this.commonFileService.fileExist(tempFilepath)) {
                            let jsonFilePath = `${filePath}`.replace('.xlsx', '.json');
                            await this.commonFileService.removeFileFromLocal(
                                `${jsonFilePath}`,
                            );
                            let jsonFilePathTeam = `${filePathTeam}`.replace('.xlsx', '.json');
                            await this.commonFileService.removeFileFromLocal(
                                `${jsonFilePathTeam}`,
                            );
                            let jsonFilePathGroup = `${filePathGroup}`.replace('.xlsx', '.json');
                            await this.commonFileService.removeFileFromLocal(
                                `${jsonFilePathGroup}`,
                            );
                            return tempFilepath;
                        } else {
                            let jsonFilePath = `${filePath}`.replace('.xlsx', '.json');
                            await this.commonFileService.removeFileFromLocal(
                                `${jsonFilePath}`,
                            );
                            let jsonFilePathTeam = `${filePathTeam}`.replace('.xlsx', '.json');
                            await this.commonFileService.removeFileFromLocal(
                                `${jsonFilePathTeam}`,
                            );
                            let jsonFilePathGroup = `${filePathGroup}`.replace('.xlsx', '.json');
                            await this.commonFileService.removeFileFromLocal(
                                `${jsonFilePathGroup}`,
                            );
                            throw new Error(`File does not exist`);
                        }
                    }
                } else {
                    throw new Error(`File does not exist`);
                }
            } else {
                let writeFile = await this.commonFileService.writeFile(
                    filePathh,
                    jsonString,
                    fileName,
                );
                if (writeFile?.status == 'success') {
                    let excelData: any =
                        await this.commonFileService.createJsonToFile(
                            1,
                            `${filePath}`,
                            'pythonjsontoxlsx.py',
                            '',
                            false,
                            'normal',
                        );
                    if (excelData?.status == 'success') {
                        filePath = `${filePath}`.replace('.json', '.xlsx');
                        if (await this.commonFileService.fileExist(filePath)) {
                            let jsonFilePath = `${filePath}`.replace('.xlsx', '.json');
                            await this.commonFileService.removeFileFromLocal(
                                `${jsonFilePath}`,
                            );
                            return filePath;
                        } else {
                            let jsonFilePath = `${filePath}`.replace('.xlsx', '.json');
                            await this.commonFileService.removeFileFromLocal(
                                `${jsonFilePath}`,
                            );
                            throw new Error(`File does not exist`);
                        }
                    }
                } else {
                    throw new Error(`File does not exist`);
                }
            }
            throw new Error(`File does not exist`);
        } catch (err) {
            throw new Error(err);
        }
    }
    async createZipFromExcel(
        orgId,
        reportId,
        filePaths
    ) {
        try {
            let directory = path.join(
                appConstant.COMPANY_CHALLENGE_REPORT,
                this.commonFileService.sanitizeFileName(orgId),
            );
            let filePathsArray = typeof filePaths === 'string' ? filePaths?.split(',') : filePaths;
            let fileName = `Challenge_Report_${reportId}_${moment().format('YYYYMMDD_HHmmss')}.zip`;
            let filePathsObject: any = { 'paths': filePathsArray, 'fileName': fileName, 'directory': directory };
            let zipPassword =
                await this.companyService.getCompanyZipPassword(orgId);
            let result: any =
                await this.commonFileService.createPasswordProtectedZip(filePathsObject, zipPassword.toString(), 'create_zip.py');
            if (result?.status == 'success') {
                if (result?.status == 'success') {
                    let zipPath = `automatic_report/challenge_reports/${reportId}/Challenge_report.zip`;
                    let zipPathDir = path.join(directory, fileName);
                    if (
                        await this.commonFileService.fileExist(
                            zipPathDir,
                        )
                    ) {
                        try {
                            let uploadResult = await lastValueFrom(
                                this.commonMicroservice.send(
                                    { cmd: 'upload_file' },
                                    {
                                        path: path.resolve(
                                            `${zipPathDir}`,
                                        ),
                                        filename: `${zipPath}`,
                                        userBucket: 'private',
                                    },
                                ),
                            );
                            if (!uploadResult) {
                                throw new Error(
                                    `Report Not Uploaded to Bucket`,
                                );
                            }
                        } catch (err) {
                            throw new Error(
                                `Report Not Uploaded to Bucket`,
                            );
                        }
                    } else {
                        throw new Error(`File does not exist`);
                    }
                    let resultData = Object.create(null);
                    resultData['id'] = reportId;
                    resultData['file_name'] = zipPath;
                    resultData['auto_report_zip_password'] =
                        Buffer.from(
                            await argon2.hash(zipPassword),
                        ).toString('base64');
                    resultData['error_message'] = '';
                    resultData['status'] = 1;
                    resultData['updated_date'] = moment().format(
                        'YYYY-MM-DD HH:mm:ss',
                    );
                    await this.incentiveReportsService.update(
                        { id: reportId },
                        resultData,
                    );
                    for (let filePathItem of filePathsArray) {
                        await this.commonFileService.removeFileFromLocal(
                            `${filePathItem}`,
                        );
                        filePathItem = `${filePathItem}`.replace(
                            '.xlsx',
                            '.json',
                        );
                        await this.commonFileService.removeFileFromLocal(
                            `${filePathItem}`,
                        );
                        filePathItem = `${filePathItem}`.replace(
                            '.json',
                            '.zip',
                        );
                        await this.commonFileService.removeFileFromLocal(
                            `${filePathItem}`,
                        );
                    }
                } else {
                    throw new Error(`Report Not created`);
                }
            }
            return 'Report Successfully created.';
        } catch (err) {
            throw new Error(err);
        }
    }

    async createChallengeReportxlsx(
        scheduleChallenge,
        orgId,
        fileMappedData,
        fileMappedTeamData,
        fileMappedGroupData,
        fileMappedDepartmentData
    ) {
        let jsonString = JSON.stringify(fileMappedData, null, 2);
        let jsonStringTeam = JSON.stringify(fileMappedTeamData, null, 2);
        let jsonStringGroup = JSON.stringify(fileMappedGroupData, null, 2);
        let jsonStringDepartment = JSON.stringify(fileMappedDepartmentData, null, 2);
        let directory = path.join(
            appConstant.COMPANY_CHALLENGE_REPORT,
            this.commonFileService.sanitizeFileName(orgId),
        );
        let fileName = `Challenge_Report_${scheduleChallenge?.custom_cname.replace(/[^A-Za-z0-9\-]/g, '_')}_${moment().format('YYYYMMDD_HHmmss')}.json`;
        let fileNameTeam = `Challenge_Report_Team_${scheduleChallenge?.custom_cname.replace(/[^A-Za-z0-9\-]/g, '_')}_${moment().format('YYYYMMDD_HHmmss')}.json`;
        let fileNameGroup = `Challenge_Report_Group_${scheduleChallenge?.custom_cname.replace(/[^A-Za-z0-9\-]/g, '_')}_${moment().format('YYYYMMDD_HHmmss')}.json`;
        let fileNameDepartment = `Challenge_Report_Department_${scheduleChallenge?.custom_cname.replace(/[^A-Za-z0-9\-]/g, '_')}_${moment().format('YYYYMMDD_HHmmss')}.json`;
        let filePath = path.join(directory, fileName);
        let filePathTeam = path.join(directory, fileNameTeam);
        let filePathGroup = path.join(directory, fileNameGroup);
        let filePathDepartment = path.join(directory, fileNameDepartment);
        let filePathh = path.join(`${directory}`);
        let data = '';
        try {
            if (scheduleChallenge?.team == 1) {
                let writeFile = await this.commonFileService.writeFile(
                    filePathh,
                    jsonString,
                    fileName,
                );
                let writeFileTeam = await this.commonFileService.writeFile(
                    filePathh,
                    jsonStringTeam,
                    fileNameTeam,
                );
                let writeFileGroup;
                if (scheduleChallenge?.group_status == 1) {
                    writeFileGroup = await this.commonFileService.writeFile(
                        filePathh,
                        jsonStringGroup,
                        fileNameGroup,
                    );
                }
                if (writeFile?.status == 'success' && writeFileTeam?.status == 'success' && (scheduleChallenge?.group_status == 1 ? writeFileGroup?.status == 'success' : true)) {
                    let jsonFilePaths = [filePathTeam, filePath];
                    if (scheduleChallenge?.group_status == 1) {
                        jsonFilePaths = [filePathGroup, filePathTeam, filePath];
                    }
                    let jsonPathsString = jsonFilePaths.join(',');
                    let excelData: any =
                        await this.commonFileService.createJsonToFile(
                            1,
                            `${jsonPathsString}`,
                            'pythonjsontoxlsx.py',
                            '',
                            true,
                            scheduleChallenge.team ? (scheduleChallenge.group_status == 1 ? 'group' : 'team') : 'normal',
                            // scheduleChallenge.team ? 'team' : 'normal',
                        );
                    if (excelData?.status == 'success') {
                        let tempFilepath = `${filePathTeam}`.replace('.json', '.xlsx');
                        filePathTeam = `${filePathTeam}`.replace('.json', '.xlsx');
                        if (scheduleChallenge?.group_status == 1) {
                            filePathGroup = `${filePathGroup}`.replace('.json', '.xlsx');
                            tempFilepath = `${filePathGroup}`.replace('.json', '.xlsx');
                        }
                        if (await this.commonFileService.fileExist(tempFilepath)) {
                            data = await this.commonFileService.FileToBase64(tempFilepath);
                        } else {
                            throw new Error(`File does not exist`);
                        }
                    }
                } else {
                    throw new Error(`File does not exist`);
                }
            } else if (
                scheduleChallenge?.team == 2 &&
                scheduleChallenge?.ch?.bio_challenge_type !== 'Football_step' &&
                scheduleChallenge?.ch?.bio_challenge_type !== 'Hydrate' &&
                scheduleChallenge?.ch?.bio_challenge_type !== 'Sleep_Tracking' &&
                scheduleChallenge?.ch?.challenge_type !== 'R'
            ) {
                let writeFile = await this.commonFileService.writeFile(
                    filePathh,
                    jsonString,
                    fileName,
                );
                let writeFileDepartment = await this.commonFileService.writeFile(
                    filePathh,
                    jsonStringDepartment,
                    fileNameDepartment,
                );
                if (writeFile?.status == 'success' && writeFileDepartment?.status == 'success') {
                    let jsonFilePaths = [filePathDepartment, filePath];
                    let jsonPathsString = jsonFilePaths.join(',');
                    let excelData: any =
                        await this.commonFileService.createJsonToFile(
                            1,
                            `${jsonPathsString}`,
                            'pythonjsontoxlsx.py',
                            '',
                            true,
                            'dept',
                        );
                    if (excelData?.status == 'success') {
                        let tempFilepath = `${filePathDepartment}`.replace('.json', '.xlsx');
                        filePathDepartment = `${filePathDepartment}`.replace('.json', '.xlsx');
                        if (await this.commonFileService.fileExist(tempFilepath)) {
                            data = await this.commonFileService.FileToBase64(tempFilepath);
                        } else {
                            throw new Error(`File does not exist`);
                        }
                    }
                } else {
                    throw new Error(`File does not exist`);
                }
            } else {
                let writeFile = await this.commonFileService.writeFile(
                    filePathh,
                    jsonString,
                    fileName,
                );
                if (writeFile?.status == 'success') {
                    let excelData: any =
                        await this.commonFileService.createJsonToFile(
                            1,
                            `${filePath}`,
                            'pythonjsontoxlsx.py',
                            '',
                            false,
                            'normal',
                        );
                    if (excelData?.status == 'success') {
                        filePath = `${filePath}`.replace('.json', '.xlsx');
                        if (await this.commonFileService.fileExist(filePath)) {
                            data =
                                await this.commonFileService.FileToBase64(
                                    filePath,
                                );
                        } else {
                            throw new Error(`File does not exist`);
                        }
                    }
                } else {
                    throw new Error(`File does not exist`);
                }
            }
        } catch (err) {
            throw new Error(`An error occurred: ${err}`);
        }
        fileName = fileName.replace('.json', '');
        await this.commonFileService.removeFileFromLocal(`${filePath}`);
        await this.commonFileService.removeFileFromLocal(`${filePathTeam}`);
        await this.commonFileService.removeFileFromLocal(`${filePathDepartment}`);
        if (scheduleChallenge?.group_status == 1) {
            await this.commonFileService.removeFileFromLocal(`${filePathGroup}`);
            filePathGroup = `${filePathGroup}`.replace('.xlsx', '.json');
            await this.commonFileService.removeFileFromLocal(`${filePathGroup}`);
        }
        filePath = `${filePath}`.replace('.xlsx', '.json');
        filePathTeam = `${filePathTeam}`.replace('.xlsx', '.json');
        filePathDepartment = `${filePathDepartment}`.replace('.xlsx', '.json');
        await this.commonFileService.removeFileFromLocal(`${filePath}`);
        await this.commonFileService.removeFileFromLocal(`${filePathTeam}`);
        await this.commonFileService.removeFileFromLocal(`${filePathDepartment}`);
        return { file_data: data, file_name: fileName, extension: 'xlsx' };
    }
    async createChallengeReportlsxNew(scheduleChallenge, sheetData: UserSheetData[], fileName = null, fileDir = false) {
        let filePath
        try {
            let fileData;
            const orgId = scheduleChallenge?.org_id;
            const directory = path.join(appConstant.COMPANY_CHALLENGE_REPORT, this.commonFileService.sanitizeFileName(orgId));
            if (!fileName) {
                fileName = `Challenge_Report_${scheduleChallenge?.custom_cname.replace(/[^A-Za-z0-9\-]/g, '_')}_${moment().format('YYYYMMDD_HHmmss')}_${await this.commonDateService.DateTimeFormat('now', 'timestamp')}.json`;
            }
            filePath = path.join(directory, fileName);
            const finalData = {
                filename: fileName.replace('.json', '.xlsx'),
                sequence: sheetData
            };
            const scriptPath = path.resolve('src/python', 'pythoncreateexcel.py');
            await this.commonFileService.writeFile(directory, JSON.stringify(finalData), fileName);

            // Wait for the Python script to finish
            await new Promise<void>((resolve, reject) => {
                const pyProcess = spawn('python3', [scriptPath, path.resolve(filePath)]);
                pyProcess.stdout.on('data', (data) => {
                    console.log(`Python: ${data.toString()}`);
                });
                pyProcess.stderr.on('data', (data) => {
                    console.error(`Python Error: ${data.toString()}`);
                });
                pyProcess.on('close', async (code) => {
                    console.log(`Python script exited with code ${code}`);
                    if (code === 0) {
                        resolve();
                    } else {
                        reject(new Error(`Python script exited with code ${code}`));
                    }
                });
            });

            // Now check if the Excel file exists and return its base64
            const excelFilePath = filePath.replace('.json', '.xlsx');
            if (fileDir) {
                return { file_dir: excelFilePath };
            }
            if (await this.commonFileService.fileExist(excelFilePath)) {
                fileData = await this.commonFileService.FileToBase64(excelFilePath);
                await this.commonFileService.removeFileFromLocal(filePath);
                await this.commonFileService.removeFileFromLocal(excelFilePath);
            } else {
                throw new Error(`Excel file does not exist at ${excelFilePath}`);
            }

            return { file_data: fileData, file_name: fileName.replace('.json', ''), extension: 'xlsx' };

        } catch (error) {
            await this.commonFileService.removeFileFromLocal(filePath);
            throw new Error(`An error occurred: ${error}`);
        }
    }
}

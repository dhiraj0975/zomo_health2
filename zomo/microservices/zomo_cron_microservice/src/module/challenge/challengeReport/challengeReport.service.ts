import {
    appConstant,
    CommonArrayService,
    CommonDateService,
    CommonHealthService,
    CommonService,
    ScheduleChallengeEntity,
    tableConstant,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { cronAppConstant } from 'src/common';
import { ActivityService } from 'src/module/acitivity/activity.service';
import { AutoReportSettingService } from 'src/module/autosetting/autoReportSettings.service';
import { CompanyService } from 'src/module/company/company.service';
import { IncentiveReportsService } from 'src/module/incentivereports/incentivereports.service';
import { UserService } from 'src/module/user/user.service';
import { In, Not } from 'typeorm';
import { ScheduleChallengeService } from '../schedulechallenge/schedulechallenge.service';
import { TeamsService } from '../team/teams.service';
import { UserChallengeHelperService } from '../userChallengeHelper.service';
import { BingoChallengeReportService } from './bingochallengereport.service';
import { FootballChallengeReportService } from './biometricfootballchallengereport.service';
import { ExternalChallengeReportService } from './externalchallengereport.service';
import { FitnessChallengeReportService } from "./fitness-challenge-report.service";
import { FootballStepChallengeReportService } from './footballstepchallengereport.service';
import { HealthyhabitactivityChallengeReportService } from './healthyhabitactivitychallengereport.service';
import { HealthyhabitChallengeReportService } from './healthyhabitchallengereport.service';
import { HealthyhabitreqbasedChallengeReportService } from './healthyhabitreqbasedchallengereport.service';
import { HydrateChallengeReportService } from './hydratechallengereport.service';
import { ChallengeReportInput } from './input';
import { MoveChallengeReportService } from './movemorechallengereport.service';
import { OlympicsChallengeReportService } from "./olympics-challenge-report.service";
import { RandomactkindnessChallengeReportService } from './randomactkindnesschallengereport.service';
import { RecipeChallengeReportService } from './recipechallengereport.service';
import { RelayRaceChallengeReportService } from './relayracechallengereport.service';
import { SleepChallengeReportService } from './sleepchallengereport.service';
import { StepsChallengeReportService } from './stepchallengereport.service';
import { TrekStepsChallengeReportService } from './trekStepchallengereport.service';
import { WeightChallengeReportService } from './weightchallengereport.service';
const moment = require('moment-timezone');

@Injectable()
export class ChallengeReportService {
    constructor(
        private readonly incentiveReportsService: IncentiveReportsService,
        private readonly companyService: CompanyService,
        private readonly commonService: CommonService,
        private readonly scheduleChallengeService: ScheduleChallengeService,
        private readonly commonDateService: CommonDateService,
        private readonly sleepChallengeReportService: SleepChallengeReportService,
        private readonly autoReportSettingService: AutoReportSettingService,
        private readonly userChallengeHelperService: UserChallengeHelperService,
        private readonly hydrateChallengeReportService: HydrateChallengeReportService,
        private readonly randomactkindnessChallengeReportService: RandomactkindnessChallengeReportService,
        private readonly userService: UserService,
        private readonly recipeChallengeReportService: RecipeChallengeReportService,
        private readonly weightChallengeReportService: WeightChallengeReportService,
        private readonly bingoChallengeReportService: BingoChallengeReportService,
        private readonly healthyhabitChallengeReportService: HealthyhabitChallengeReportService,
        private readonly healthyhabitactivityChallengeReportService: HealthyhabitactivityChallengeReportService,
        private readonly commonArrayService: CommonArrayService,
        private readonly footballChallengeReportService: FootballChallengeReportService,
        private readonly healthyhabitreqbasedChallengeReportService: HealthyhabitreqbasedChallengeReportService,
        private readonly teamsService: TeamsService,
        private readonly stepsChallengeReportService: StepsChallengeReportService,
        private readonly commonHealthService: CommonHealthService,
        private readonly fitnessChallengeReportService: FitnessChallengeReportService,
        private readonly activityService: ActivityService,
        private readonly olympicsChallengeReportService: OlympicsChallengeReportService,
        private readonly footballStepChallengeReportService: FootballStepChallengeReportService,
        private readonly externalChallengeReportService: ExternalChallengeReportService,
        private readonly trekStepsChallengeReportService: TrekStepsChallengeReportService,
        private readonly moveChallengeReportService: MoveChallengeReportService,
        private readonly relayRaceChallengeReportService: RelayRaceChallengeReportService,
    ) {}
    async challengeReport(postData: ChallengeReportInput) {
        try {
            let autoRequestId: number = 0;
            const autoRequest =
                postData?.auto_request &&
                this.commonService.isValidNumber(postData?.auto_request)
                    ? Number(postData?.auto_request)
                    : 0;
            let result_type = postData?.result_type || 1;
            if (autoRequest == 1) {
                autoRequestId = postData?.auto_request_id;
                result_type = 2;
            }
            let scheduleChallengeDetails = Object.create(null);
            const user = postData?.userDetails || {};
            let clmNameArr: string[] = [
                'USER CODE',
                'ORGANIZATION',
                'DEPARTMENT',
                'RELATIONSHIP ID',
                'FIRST NAME',
                'MIDDLE NAME',
                'LAST NAME',
                'JOB TITLE',
                'GENDER',
                'BIRTH DATE',
                'DATE OF HIRE',
                'ON HEALTH PLAN',
                'HEALTH PLAN NAME',
                'EMAIL',
                'LOCATION',
                'USER TYPE',
            ];
            let orgId: number, reportId: number;
            let reportRequest;
            let reportSettingId: number;
            let reportFields: string;
            let userId: number;
            let teamCondition: string = '';
            let groupCondition: string = '';
            let scheduleIds: number[] | string[] = [];
            let challengeType: string;
            const reportType: string = 'Challenge';
            let resultedData = Object.create(null);
            let userList = [];
            let teamList = [];
            let groupList = [];
            let deaprtmentList = [];
            if (autoRequest == 1) {
                await this.incentiveReportsService.updateIncentiveReports(
                    reportType,
                );
                reportRequest =
                    await this.incentiveReportsService.findOneReport(
                        `incentivereports.status = 0 AND incentivereports.report_type = 'Challenge' AND company.status = 1 AND company.deleted  = 0 ${(autoRequestId && autoRequestId !== 0 && autoRequestId !== undefined) ? ' AND incentivereports.id = ' + autoRequestId : ''}`,
                    );
                if (reportRequest) {
                    reportSettingId = Number(
                        reportRequest?.['report_setting_id'],
                    );
                    reportId = Number(reportRequest?.['id']);
                    orgId = Number(reportRequest?.['org_id']);
                    userId = reportRequest['user_id'];
                    // scheduleId = reportRequest?.['camp_id'];
                    // temporary code to fix undefined scheduleId issue using split and get first value only
                    scheduleIds = (reportRequest?.['camp_id'] != '' || reportRequest?.['camp_id'] != null) ? reportRequest?.['camp_id'].split(',') : [];
                    challengeType = reportRequest?.['report_item_type'];
                    if (
                        reportSettingId &&
                        reportSettingId !== null &&
                        reportSettingId !== 0
                    ) {
                        const autoReportData =
                            await this.autoReportSettingService.findOne({
                                id: reportSettingId,
                            });
                        if (autoReportData && autoReportData !== null) {
                            reportFields = autoReportData?.report_fields || '';
                            clmNameArr = autoReportData?.report_fields && autoReportData?.report_fields != '' ? Object.values(
                                JSON.parse(reportFields),
                            ) : clmNameArr;
                        }
                    }
                    const resultData = Object.create(null);
                    resultData['id'] = reportId;
                    resultData['status'] = 2;
                    resultData['updated_date'] = moment().format(
                        'YYYY-MM-DD HH:mm:ss',
                    );
                    await this.incentiveReportsService.update(
                        { id: reportId },
                        resultData,
                    );
                } else {
                    throw new Error(`No Report Found`);
                }
            } else {
                scheduleIds[0] = postData?.schedule_id;
                orgId = postData?.org_id;
            }
            const autoReportFilePaths = [];
            for (const scheduleId of scheduleIds) {
                if (!challengeType) {
                    let checkScheduleChallenge = await this.scheduleChallengeService.scheduleChallegeData(`sc.id = ${scheduleId} AND sc.org_id = ${orgId}`);
                    if (checkScheduleChallenge) {
                        challengeType = checkScheduleChallenge?.['ch']?.['challenge_type'] ?? '';
                        postData.challenge_type = challengeType;
                    }
                }
                let condition: string = '';
                // as per discussion with sumeet on 0501-2026 put show_terminated_users filter in both auto and manual report
                if (
                    autoRequest == 1 &&
                    reportRequest &&
                    Object.keys(reportRequest).length > 0
                ) {
                    condition += reportRequest?.condition || 'User.username IS NOT null';
                    condition += ` AND scj.schedule_id = ${scheduleId}`; 
                }
                if (autoRequest == 0) {
                    condition = `scj.schedule_id = ${postData.schedule_id} AND User.org_id = ${postData?.org_id}`; 
                    if (postData?.show_terminated_users?.toString() === '2') {
                        condition += ' AND User.status = 1';
                    }else{
                        condition += ' AND User.status IN (0,1)';
                    }
                    if (postData?.department_id?.length) {
                        const deptCondition =
                            this.commonArrayService.formatInClauseCondition(
                                postData?.department_id,
                                'User.department_id',
                            );
                        if (deptCondition) {
                            condition += ` AND ${deptCondition}`;
                        }
                    }
                    if (postData?.location_id?.length) {
                        const locCondition =
                            this.commonArrayService.formatInClauseCondition(
                                postData?.location_id,
                                'User.location',
                            );
                        if (locCondition) {
                            condition += ` AND ${locCondition}`;
                        }
                    }
                    if (postData?.role_id == 12) {
                        const userWellnessData =
                            await this.userService.usersDataWellness(
                                { role_id: postData.role_id, id: user?.id },
                                `User.role_id != 1 AND User.id != ${user?.id} AND User.org_id = '${postData?.org_id}' AND User.status =1`,
                            );
                        if (!userWellnessData || userWellnessData.length == 0) {
                            condition += ` AND User.id IN (0)`;
                        } else {
                            condition += ` AND User.id IN (${userWellnessData.map((ele) => ele.id).join(',')})`;
                        }
                    }
                    if (result_type == 1 && postData?.search_str) {
                        const search = postData?.search_str.trim().toLowerCase();
                        let searchField = [
                            'User.username',
                            'full_name',
                            'User.first_name',
                            'User.last_name',
                            'department.dept_name',
                            'company.company_name',
                            'User.employeeid',
                        ];
                        if (postData?.filter_by) {
                            switch (postData?.filter_by) {
                                case 'organization':
                                    searchField = [
                                        'company.company_name',
                                    ];
                                    break;
                                case 'department':
                                    searchField = [
                                        'department.dept_name',
                                    ];
                                    break;
                                case 'employee_id':
                                    searchField = [
                                        'User.employeeid',
                                    ];
                                    break;
                                case 'name':
                                    searchField = [
                                        'User.username',
                                        'full_name',
                                        'User.first_name',
                                        'User.last_name',
                                    ];
                                    break;
                            }
                        }
                        if (postData?.filter_by == 'team') {
                            condition += ` AND (team.tname LIKE '%${search}%' AND team.org_id = ${postData?.org_id})`;
                        }
                        else {
                            condition += this.commonService.generateDynamicSearchQuery(
                                search ?? '',
                                searchField,
                                false,
                                'User',
                            );
                        }
                    }
                }
                const paginateObj = {
                    page: postData?.page || 1,
                    limit: postData?.limit || appConstant.RECORD_PER_PAGE,
                };
                if (challengeType && challengeType == 'A') {
                    let challengeActivityList = await this.activityService.activityListRecord({ status: Not(2), activity_name: In(['Activity Tracker- Walking', 'Activity Tracker- Running', 'Activity Tracker- Cycling', 'Activity Tracker- Swimming', 'Activity Tracker', 'Steps']) }, ['id', 'activity_name'], { id: 'ASC' });
                    const scheduleChallenge: any =
                        await this.scheduleChallengeService.challengeFindOneReport(
                            `sc.id = ${scheduleId} AND sc.org_id = ${orgId}`,
                            { id: 'DESC' },
                            [
                                'ch.id',
                                'ch.data_interval',
                                'ch.bio_challenge_type',
                                'ch.activity_id',
                                'ch.stepactivity_type',
                                'ch.max_time_day',
                                'ch.numberofsteps',
                                'ch.weektimeframe',
                                'ch.oz_water_per_day',
                                'sc.id',
                                'sc.challenge_id',
                                'sc.custom_cname',
                                'sc.dpt_id',
                                'sc.loc_id',
                                'sc.numberofsteps',
                                'sc.time_elapsed',
                                'sc.dailymaxstepscnt',
                                'sc.countuserwithzero',
                                'sc.yard',
                                'sc.date_validation_setting',
                                'sc.rank_type',
                                'sc.race_type',
                                'sc.s_activity_tracker',
                                'sc.s_steps',
                                'sc.s_walking',
                                'sc.s_running',
                                'sc.s_cycling',
                                'sc.s_swimming',
                                'sc.start_date',
                                'sc.end_date',
                                'sc.countstepswith',
                                'sc.oz_water_per_day',
                                'sc.ft_average_per_week',
                                'sc.tr_totalgoaltype',
                                'sc.tr_totalgoalvalue',
                                'sc.tr_goaltype',
                                'sc.individualmeetgoal',
                                'sc.yardfrequency',
                                'sc.team',
                                'sc.is_oz_meet_require_day',
                                'sc.oz_meet_require_day',
                                'sc.is_set_weekend',
                                'sc.is_nolimit',
                                'sc.move_more_display',
                                'sc.lock_steplog_website_click',
                                'sc.backdating_frequency',
                                'sc.teamproctype',
                                'sc.requirement_base_on',
                                'sc.goal_base_on',
                                'sc.total_enter_token',
                                'sc.max_num_of_token',
                                'sc.max_num_of_enter_token',
                                'sc.goalbasefrquency',
                                'sc.org_id',
                                'sc.hide_comment',
                                'sc.hide_history',
                                'sc.card_week_relation',
                                'sc.group_status',
                                'ac.id',
                                'ac.activity_name',
                            ],
                        );
                    if (!scheduleChallenge) {
                        throw new Error('ERR_RECORD_NOT_FOUND');
                    } else {
                        scheduleChallengeDetails = scheduleChallenge;
                        if (scheduleChallengeDetails?.team == 1) {
                            if (postData?.team_id) {
                                teamCondition =
                                    this.commonArrayService.formatInClauseCondition(
                                        postData?.team_id,
                                        'team.id',
                                    );
                            }
                        }
                        if (scheduleChallengeDetails?.group_status == 1) {
                            if (postData?.group_id) {
                                groupCondition =
                                    this.commonArrayService.formatInClauseCondition(
                                        postData?.group_id,
                                        'team.group_id',
                                    );
                            }
                        }
                        const bioType = scheduleChallenge?.['ch']?.['bio_challenge_type'];
                        scheduleChallenge['totaldays'] = 0;
                        scheduleChallenge['uptodays'] = 0;
                        const startdate: any = this.commonDateService.DateTimeFormat(scheduleChallenge?.['start_date'], 'timestamp');
                        const enddate: any = this.commonDateService.DateTimeFormat(scheduleChallenge?.['end_date'], 'timestamp',);
                        let now: any = this.commonDateService.DateTimeFormat('now', 'timestamp');
                        if (now >= enddate) {
                            now = enddate;
                        }
                        const totaldays = Math.floor((enddate - startdate) / (60 * 60 * 24)) + 1;
                        let uptodays =
                            Math.floor((now - startdate) / (60 * 60 * 24)) + 1;
                        if (uptodays === 0) {
                            uptodays = 1;
                        }
                        scheduleChallenge['totaldays'] = totaldays;
                        scheduleChallenge['uptodays'] = uptodays;
                        if (
                            bioType !== 'Olympics' ||
                            (bioType === 'Bingo_layout' &&
                                scheduleChallenge?.['card_week_relation'] != 1)
                        ) {
                            const startdate: any =
                                this.commonDateService.DateTimeFormat(
                                    scheduleChallenge?.['start_date'],
                                    'timestamp',
                                );
                            const enddate: any =
                                this.commonDateService.DateTimeFormat(
                                    scheduleChallenge?.['end_date'],
                                    'timestamp',
                                );
                            let now: any = this.commonDateService.DateTimeFormat(
                                'now',
                                'timestamp',
                            );
                            if (now >= enddate) {
                                now = enddate;
                            }
                            const totaldays =
                                Math.floor((enddate - startdate) / (60 * 60 * 24)) +
                                1;
                            let uptodays =
                                Math.floor((now - startdate) / (60 * 60 * 24)) + 1;
                            if (uptodays === 0) {
                                uptodays = 1;
                            }
                            scheduleChallenge['totaldays'] = totaldays;
                            scheduleChallenge['uptodays'] = uptodays;
                        }
                        if (
                            bioType &&
                            bioType == 'Sleep_Tracking'
                        ) {
                            resultedData =
                                await this.sleepChallengeReportService.sleepChallengeReport(
                                    scheduleChallenge,
                                    condition,
                                    result_type,
                                    result_type == 1 ? paginateObj : null,
                                    scheduleChallenge?.team == 1
                                        ? teamCondition
                                        : '',
                                    scheduleChallenge?.group_status == 1
                                        ? groupCondition
                                        : '',
                                );
                        }
                        if (
                            bioType &&
                            bioType == 'Hydrate'
                        ) {
                            resultedData =
                                await this.hydrateChallengeReportService.hydrateChallengeReport(
                                    scheduleChallenge,
                                    condition,
                                    result_type,
                                    result_type == 1 ? paginateObj : null,
                                    scheduleChallenge?.team == 1
                                        ? teamCondition
                                        : '',
                                    scheduleChallenge?.group_status == 1
                                        ? groupCondition
                                        : '',
                                );
                        }
                        if (
                            bioType &&
                            bioType == 'Random_Acts_of_Kindness'
                        ) {
                            resultedData =
                                await this.randomactkindnessChallengeReportService.randomactkindnessChallengeReport(
                                    scheduleChallenge,
                                    condition,
                                    result_type,
                                    result_type == 1 ? paginateObj : null,
                                    scheduleChallenge?.team == 1
                                        ? teamCondition
                                        : '',
                                    scheduleChallenge?.group_status == 1
                                        ? groupCondition
                                        : '',
                                    clmNameArr,
                                );
                            if (result_type === 2) {
                                const sheetData = [{ sheet_name: "Report", list: resultedData }];
                                if (autoRequest !== 1) {
                                    const manualReportResult = await this.userChallengeHelperService.createChallengeReportlsxNew(
                                        scheduleChallengeDetails,
                                        sheetData
                                    );
                                    return manualReportResult;
                                }
                                if (autoRequest === 1) {
                                    const manualReportResult = await this.userChallengeHelperService.createChallengeReportlsxNew(
                                        scheduleChallengeDetails,
                                        sheetData,
                                        null,
                                        true
                                    );
                                    if (manualReportResult && manualReportResult?.file_dir) {
                                        autoReportFilePaths.push(manualReportResult.file_dir);
                                    }
                                }
                            }
                        }
                        if (scheduleChallenge?.['ac']?.['activity_name'].trim() == "Steps" && bioType != "Football_step" && bioType != "Trek_step" && bioType != "Move_more" && bioType != "Random_Acts_of_Kindness" && bioType != "Relay_race") {
                            if (postData?.team_id) {
                                teamCondition = ` AND(${this.commonArrayService.formatInClauseCondition(
                                    postData?.team_id,
                                    'team.id',
                                )})`;
                                condition += ` ${teamCondition}`;
                            }
                            if (postData?.group_id) {
                                groupCondition = ` AND(${this.commonArrayService.formatInClauseCondition(
                                    postData?.group_id,
                                    'team.group_id',
                                )})`;
                                condition += ` ${groupCondition}`;
                            }
                            resultedData = await this.stepsChallengeReportService.stepChallengeReport(
                                scheduleChallenge,
                                condition,
                                result_type,
                                result_type == 1 ? paginateObj : null,
                                scheduleChallenge?.team == 1 ? teamCondition : '',
                                scheduleChallenge?.group_status == 1 ? groupCondition : '',
                            );
                            if (result_type == 2) {
                                userList = resultedData?.user ?? [];
                                teamList = resultedData?.team ?? [];
                                groupList = resultedData?.group ?? [];
                                let sheetData = [];
                                if (scheduleChallengeDetails?.team == 1) {
                                    if (scheduleChallengeDetails?.group_status == 1) {
                                        if (groupList.length) {
                                            sheetData.push({ sheet_name: "Group Summary", list: groupList });
                                        }
                                    }
                                    if (teamList.length) {
                                        sheetData.push({ sheet_name: "Team Summary", list: teamList });
                                    }
                                    sheetData.push({ sheet_name: "Individual Details", list: userList });
                                }
                                else if (scheduleChallengeDetails?.team == 2) {
                                    sheetData = [{ sheet_name: "Report", list: userList }];
                                }
                                else {
                                    sheetData = [{ sheet_name: "Individual Details", list: userList }];
                                }
                                if (autoRequest !== 1) {
                                    const manualReportResult = await this.userChallengeHelperService.createChallengeReportlsxNew(scheduleChallengeDetails, sheetData);
                                    if (manualReportResult) {
                                        return manualReportResult;
                                    }
                                }
                                if (autoRequest === 1) {
                                    const manualReportResult = await this.userChallengeHelperService.createChallengeReportlsxNew(
                                        scheduleChallengeDetails,
                                        sheetData,
                                        null,
                                        true
                                    );
                                    if (manualReportResult && manualReportResult?.file_dir) {
                                        autoReportFilePaths.push(manualReportResult.file_dir);
                                    }
                                }
                            }
                        }
                        if (bioType == "Trek_step") {
                            resultedData = await this.trekStepsChallengeReportService.trekStepChallengeReport(
                                scheduleChallenge,
                                condition,
                                result_type,
                                result_type == 1 ? paginateObj : null,
                                challengeActivityList,
                            );
                            if (result_type == 2) {
                                userList = resultedData?.user ?? [];
                                teamList = resultedData?.team ?? [];
                                groupList = resultedData?.group ?? [];
                                let sheetData = [];
                                if (scheduleChallengeDetails?.team == 1) {
                                    if (scheduleChallengeDetails?.group_status == 1) {
                                        if (groupList.length) {
                                            sheetData.push({ sheet_name: "Group Summary", list: groupList });
                                        }
                                    }
                                    if (teamList.length) {
                                        sheetData.push({ sheet_name: "Team Summary", list: teamList });
                                    }
                                    sheetData.push({ sheet_name: "Individual Details", list: userList });
                                }
                                else if (scheduleChallengeDetails?.team == 2) {
                                    if (resultedData.summary) {
                                        sheetData = [{ sheet_name: "Summary", list: resultedData?.summary }, { sheet_name: "Individual Details", list: userList ?? [] }];
                                    } else {
                                        sheetData = [{ sheet_name: "Report", list: userList }];
                                    }
                                }
                                else {
                                    sheetData = [{ sheet_name: "Individual Details", list: userList }];
                                }
                                if (autoRequest !== 1) {
                                    const manualReportResult = await this.userChallengeHelperService.createChallengeReportlsxNew(scheduleChallengeDetails, sheetData);
                                    if (manualReportResult) {
                                        return manualReportResult;
                                    }
                                }
                                if (autoRequest === 1) {
                                    const manualReportResult = await this.userChallengeHelperService.createChallengeReportlsxNew(
                                        scheduleChallengeDetails,
                                        sheetData,
                                        null,
                                        true
                                    );
                                    if (manualReportResult && manualReportResult?.file_dir) {
                                        autoReportFilePaths.push(manualReportResult.file_dir);
                                    }
                                }
                            }
                        }
                        if (bioType == "Move_more") {
                            resultedData = await this.moveChallengeReportService.moveMoreChallengeReport(
                                scheduleChallenge,
                                condition,
                                result_type,
                                result_type == 1 ? paginateObj : null,
                                challengeActivityList,
                                scheduleChallenge?.team == 1 ? teamCondition : '',
                                scheduleChallenge?.group_status == 1 ? groupCondition : '',
                            );
                            if (result_type == 2) {
                                userList = resultedData?.user ?? [];
                                teamList = resultedData?.team ?? [];
                                groupList = resultedData?.group ?? [];
                                let sheetData = [];
                                if (scheduleChallengeDetails?.team == 1) {
                                    if (scheduleChallengeDetails?.group_status == 1) {
                                        if (groupList.length) {
                                            sheetData.push({ sheet_name: "Group Summary", list: groupList });
                                        }
                                    }
                                    if (teamList.length) {
                                        sheetData.push({ sheet_name: "Team Summary", list: teamList });
                                    }
                                    sheetData.push({ sheet_name: "Individual Details", list: userList });
                                }
                                else if (scheduleChallengeDetails?.team == 2) {
                                    if (resultedData?.summary) {
                                        sheetData = [{ sheet_name: "Summary", list: resultedData?.summary }, { sheet_name: "Individual Details", list: userList ?? [] }];
                                    } else {
                                        sheetData = [{ sheet_name: "Individual Details", list: userList }];
                                    }
                                }
                                else {
                                    sheetData = [{ sheet_name: "Individual Details", list: userList }];
                                }
                                if (autoRequest !== 1) {
                                    const manualReportResult = await this.userChallengeHelperService.createChallengeReportlsxNew(scheduleChallengeDetails, sheetData);
                                    if (manualReportResult) {
                                        return manualReportResult;
                                    }
                                }
                                if (autoRequest === 1) {
                                    const manualReportResult = await this.userChallengeHelperService.createChallengeReportlsxNew(
                                        scheduleChallengeDetails,
                                        sheetData,
                                        null,
                                        true
                                    );
                                    if (manualReportResult && manualReportResult?.file_dir) {
                                        autoReportFilePaths.push(manualReportResult.file_dir);
                                    }
                                }
                            }
                        }
                        if (bioType == 'Fitness') {
                            resultedData = await this.fitnessChallengeReportService.fitnessChallengeReport(
                                scheduleChallenge,
                                condition,
                                result_type,
                                result_type == 1 ? paginateObj : null,
                            );
                            if (result_type === 2) {
                                const sheetData = [{ sheet_name: "Report", list: [[...appConstant.USER_HEADERS, ...appConstant.FITNESS_CHALLENGE_HEADERS], ...resultedData] }];
                                if (autoRequest !== 1) {
                                    const manualReportResult = await this.userChallengeHelperService.createChallengeReportlsxNew(
                                        scheduleChallenge,
                                        sheetData
                                    );
                                    return manualReportResult;
                                }
                                if (autoRequest === 1) {
                                    const manualReportResult = await this.userChallengeHelperService.createChallengeReportlsxNew(
                                        scheduleChallengeDetails,
                                        sheetData,
                                        null,
                                        true
                                    );
                                    if (manualReportResult && manualReportResult?.file_dir) {
                                        autoReportFilePaths.push(manualReportResult.file_dir);
                                    }
                                }
                            }
                        }
                        if (bioType == 'Olympics') {
                            resultedData = await this.olympicsChallengeReportService.olympicsChallengeReport(
                                scheduleChallenge,
                                condition,
                                result_type,
                                result_type == 1 ? paginateObj : null,
                                postData?.flag
                            );
                            if (result_type === 2) {
                                const olympicsHeader = postData?.flag === 1 ? appConstant.OLYMPICS_CHALLENGE_HEADERS.slice(0, 3) : appConstant.OLYMPICS_CHALLENGE_HEADERS;
                                const sheetData = [{ sheet_name: "Report", list: [[...appConstant.USER_HEADERS, ...olympicsHeader], ...resultedData] }];
                                if (autoRequest !== 1) {
                                    const manualReportResult = await this.userChallengeHelperService.createChallengeReportlsxNew(
                                        scheduleChallenge,
                                        sheetData
                                    );
                                    return manualReportResult;
                                } if (autoRequest === 1) {
                                    const manualReportResult = await this.userChallengeHelperService.createChallengeReportlsxNew(
                                        scheduleChallengeDetails,
                                        sheetData,
                                        null,
                                        true
                                    );
                                    if (manualReportResult && manualReportResult?.file_dir) {
                                        autoReportFilePaths.push(manualReportResult.file_dir);
                                    }
                                }
                            }
                        }
                        if (bioType =='Football_step') {
                            resultedData =
                                await this.footballStepChallengeReportService.footballStepChallengeReport(
                                    scheduleChallenge,
                                    condition,
                                    result_type,
                                    result_type == 1 ? paginateObj : null,
                                    scheduleChallenge?.team == 1
                                        ? teamCondition
                                        : '',
                                    scheduleChallenge?.group_status == 1
                                        ? groupCondition
                                        : '',
                                );
                        }
                        if (bioType == 'Relay_race') {
                            resultedData =
                                await this.relayRaceChallengeReportService.relayRaceChallengeReport(
                                    scheduleChallenge,
                                    condition,
                                    result_type,
                                    result_type == 1 ? paginateObj : null,
                                    scheduleChallenge?.team == 1
                                        ? teamCondition
                                        : '',
                                    scheduleChallenge?.group_status == 1
                                        ? groupCondition
                                        : '',
                                );
                        }
                    }
                }
                if (challengeType == 'B') {
                    const scheduleChallenge =
                        await this.scheduleChallengeService.challengeFindOneReport(
                            `sc.id = ${scheduleId} AND ch.status = 1 AND sc.org_id = ${orgId}`,
                            { id: 'DESC' },
                            [
                                'ch.data_interval',
                                'ch.bio_challenge_type',
                                'ch.activity_id',
                                'ch.stepactivity_type',
                                'ch.max_time_day',
                                'ch.numberofsteps',
                                'ch.weektimeframe',
                                'ch.oz_water_per_day',
                                'ch.status',
                                'sc.id',
                                'sc.challenge_id',
                                'sc.custom_cname',
                                'sc.dpt_id',
                                'sc.loc_id',
                                'sc.numberofsteps',
                                'sc.time_elapsed',
                                'sc.dailymaxstepscnt',
                                'sc.countuserwithzero',
                                'sc.yard',
                                'sc.date_validation_setting',
                                'sc.rank_type',
                                'sc.race_type',
                                'sc.s_activity_tracker',
                                'sc.s_steps',
                                'sc.s_walking',
                                'sc.s_running',
                                'sc.s_cycling',
                                'sc.s_swimming',
                                'sc.start_date',
                                'sc.end_date',
                                'sc.countstepswith',
                                'sc.oz_water_per_day',
                                'sc.ft_average_per_week',
                                'sc.tr_totalgoaltype',
                                'sc.tr_totalgoalvalue',
                                'sc.tr_goaltype',
                                'sc.individualmeetgoal',
                                'sc.yardfrequency',
                                'sc.team',
                                'sc.is_oz_meet_require_day',
                                'sc.oz_meet_require_day',
                                'sc.is_set_weekend',
                                'sc.is_nolimit',
                                'sc.move_more_display',
                                'sc.lock_steplog_website_click',
                                'sc.backdating_frequency',
                                'sc.teamproctype',
                                'sc.requirement_base_on',
                                'sc.goal_base_on',
                                'sc.total_enter_token',
                                'sc.max_num_of_token',
                                'sc.max_num_of_enter_token',
                                'sc.goalbasefrquency',
                                'sc.org_id',
                                'sc.hide_comment',
                                'sc.hide_history',
                                'sc.card_week_relation',
                                'sc.group_status',
                                'ac.id',
                                'ac.activity_name',
                            ],
                        );
                    if (!scheduleChallenge) {
                        throw new Error('ERR_RECORD_NOT_FOUND');
                    }
                    scheduleChallengeDetails = scheduleChallenge;
                    const bioType = scheduleChallenge?.['ch']?.['bio_challenge_type'];
                    if (bioType == 'Football') {
                        // BiometricFootballChallenge
                        if (scheduleChallengeDetails?.team == 1) {
                            if (postData?.team_id) {
                                teamCondition = ` AND (${this.commonArrayService.formatInClauseCondition(
                                    postData?.team_id,
                                    'team.id',
                                )})`;
                                condition += ` ${teamCondition}`;
                            }
                        }
                        resultedData = await this.footballChallengeReportService.footballChallengeReport(
                            scheduleChallenge,
                            condition,
                            result_type,
                            result_type == 1 ? paginateObj : null,
                            teamCondition,
                            postData?.userDetails?.role_id
                        );
                        if (result_type == 2) {
                            userList = resultedData?.user ?? [];
                            teamList = resultedData?.team ?? [];
                            groupList = resultedData?.group ?? [];
                            let sheetData = [];
                            if (scheduleChallengeDetails?.team == 1) {
                                if (scheduleChallengeDetails?.group_status == 1) {
                                    if (groupList.length) {
                                        sheetData.push({ sheet_name: "Group Summary", list: groupList });
                                    }
                                }
                                if (teamList.length) {
                                    sheetData.push({ sheet_name: "Team Summary", list: teamList });
                                }
                                sheetData.push({ sheet_name: "Individual Details", list: userList });
                            }
                            else if (scheduleChallengeDetails?.team == 2) {
                                if (resultedData?.summary) {
                                    sheetData = [{ sheet_name: "Summary", list: resultedData?.summary }, { sheet_name: "Individual Details", list: userList ?? [] }];
                                } else {
                                    sheetData = [{ sheet_name: "Individual Details", list: userList }];
                                }
                            }
                            else {
                                sheetData = [{ sheet_name: "Individual Details", list: userList }];
                            }
                            if (autoRequest !== 1) {
                                const manualReportResult = await this.userChallengeHelperService.createChallengeReportlsxNew(scheduleChallengeDetails, sheetData);
                                if (manualReportResult) {
                                    return manualReportResult;
                                }
                            } 
                            if (autoRequest === 1) {
                                const manualReportResult = await this.userChallengeHelperService.createChallengeReportlsxNew(
                                    scheduleChallengeDetails,
                                    sheetData,
                                    null,
                                    true
                                );
                                if (manualReportResult && manualReportResult?.file_dir) {
                                    autoReportFilePaths.push(manualReportResult.file_dir);
                                }
                            }
                        }
                    } else if (bioType == 'Weight_progress' || bioType == 'Weight_progress_withoutTeam') {
                        // weightProgressChallenge || weightProgressWithoutTeamChallenge
                        resultedData =
                            await this.weightChallengeReportService.weightChallengeReport(
                                scheduleChallenge,
                                condition,
                                result_type,
                                result_type == 1 ? paginateObj : null,
                                postData?.userDetails?.role_id
                            );
                        if (result_type == 2) {
                            userList = resultedData?.user ?? [];
                            teamList = resultedData?.team ?? [];
                            groupList = resultedData?.group ?? [];
                            let sheetData = [];
                            if (scheduleChallengeDetails?.team == 1) {
                                if (scheduleChallengeDetails?.group_status == 1) {
                                    if (groupList.length) {
                                        sheetData.push({ sheet_name: "Group Summary", list: groupList });
                                    }
                                }
                                if (teamList.length) {
                                    sheetData.push({ sheet_name: "Team Summary", list: teamList });
                                }
                                sheetData.push({ sheet_name: "Individual Details", list: userList });
                            }
                            else {
                                sheetData = [{ sheet_name: "Participation Details", list: userList }];
                                if(postData?.userDetails?.role_id && postData?.userDetails?.role_id == 1){
                                    sheetData.push({ sheet_name: "All Weight Details", list: resultedData?.weight ?? [] });
                                }
                            }
                            if (autoRequest !== 1) {
                                const manualReportResult = await this.userChallengeHelperService.createChallengeReportlsxNew(scheduleChallengeDetails, sheetData);
                                if (manualReportResult) {
                                    return manualReportResult;
                                }
                            } 
                            if (autoRequest === 1) {
                                const manualReportResult = await this.userChallengeHelperService.createChallengeReportlsxNew(
                                    scheduleChallengeDetails,
                                    sheetData,
                                    null,
                                    true
                                );
                                if (manualReportResult && manualReportResult?.file_dir) {
                                    autoReportFilePaths.push(manualReportResult.file_dir);
                                }
                            }
                        }
                    }
                }
                if (challengeType == 'H') {
                    const scheduleChallenge =
                        await this.scheduleChallengeService.challengeFindOneReport(
                            `sc.id = ${scheduleId} AND ch.status = 1 AND sc.org_id = ${orgId}`,
                            { id: 'DESC' },
                            [
                                'ch.data_interval',
                                'ch.bio_challenge_type',
                                'ch.activity_id',
                                'ch.stepactivity_type',
                                'ch.max_time_day',
                                'ch.numberofsteps',
                                'ch.weektimeframe',
                                'ch.oz_water_per_day',
                                'ch.requirementbased',
                                'ch.status',
                                'ch.numberofday',
                                'ch.numberofweek',
                                'sc.id',
                                'sc.challenge_id',
                                'sc.custom_cname',
                                'sc.dpt_id',
                                'sc.loc_id',
                                'sc.numberofsteps',
                                'sc.time_elapsed',
                                'sc.dailymaxstepscnt',
                                'sc.countuserwithzero',
                                'sc.yard',
                                'sc.date_validation_setting',
                                'sc.rank_type',
                                'sc.race_type',
                                'sc.s_activity_tracker',
                                'sc.s_steps',
                                'sc.s_walking',
                                'sc.s_running',
                                'sc.s_cycling',
                                'sc.s_swimming',
                                'sc.start_date',
                                'sc.end_date',
                                'sc.countstepswith',
                                'sc.oz_water_per_day',
                                'sc.ft_average_per_week',
                                'sc.tr_totalgoaltype',
                                'sc.tr_totalgoalvalue',
                                'sc.tr_goaltype',
                                'sc.individualmeetgoal',
                                'sc.yardfrequency',
                                'sc.team',
                                'sc.is_oz_meet_require_day',
                                'sc.oz_meet_require_day',
                                'sc.is_set_weekend',
                                'sc.is_nolimit',
                                'sc.move_more_display',
                                'sc.lock_steplog_website_click',
                                'sc.backdating_frequency',
                                'sc.teamproctype',
                                'sc.requirement_base_on',
                                'sc.goal_base_on',
                                'sc.total_enter_token',
                                'sc.max_num_of_token',
                                'sc.max_num_of_enter_token',
                                'sc.goalbasefrquency',
                                'sc.org_id',
                                'sc.hide_comment',
                                'sc.hide_history',
                                'sc.card_week_relation',
                                'sc.group_status',
                                'ac.id',
                                'ac.activity_name',
                                'sc.square_complete_limit',
                                'sc.card_complete_limit',
                            ],
                        );
                    if (!scheduleChallenge) {
                        throw new Error('ERR_RECORD_NOT_FOUND');
                    }
                    scheduleChallengeDetails = scheduleChallenge;
                    if (
                        scheduleChallenge['ch']['bio_challenge_type'] ==
                        'Bingo_layout'
                    ) {
                        resultedData =
                            await this.bingoChallengeReportService.bingoChallengeReport(
                                scheduleChallenge,
                                condition,
                                result_type,
                                result_type == 1 ? paginateObj : null,
                                scheduleChallenge?.team == 1
                                    ? teamCondition
                                    : '',
                                scheduleChallenge?.group_status == 1
                                    ? groupCondition
                                    : '',
                                clmNameArr,
                            );
                    } else if (
                        scheduleChallenge['ch']['bio_challenge_type'] ==
                        'Healthy_habit_activity_layout'
                    ) {
                        resultedData =
                            await this.healthyhabitactivityChallengeReportService.healthyhabitactivityChallengeReport(
                                scheduleChallenge,
                                condition,
                                result_type,
                                result_type == 1 ? paginateObj : null,
                                scheduleChallenge?.team == 1
                                    ? teamCondition
                                    : '',
                                scheduleChallenge?.group_status == 1
                                    ? groupCondition
                                    : '',
                                clmNameArr,
                            );
                    } else {
                        if (scheduleChallenge['ch']['requirementbased'] === 1) {
                            resultedData =
                                await this.healthyhabitreqbasedChallengeReportService.healthyhabitreqbasedChallengeReport(
                                    scheduleChallenge,
                                    condition,
                                    result_type,
                                    result_type == 1 ? paginateObj : null,
                                    scheduleChallenge?.team == 1
                                        ? teamCondition
                                        : '',
                                    scheduleChallenge?.group_status == 1
                                        ? groupCondition
                                        : '',
                                    clmNameArr,
                                    scheduleChallenge['ch'],
                                );
                        } else {
                            resultedData =
                                await this.healthyhabitChallengeReportService.healthyhabitChallengeReport(
                                    scheduleChallenge,
                                    condition,
                                    result_type,
                                    result_type == 1 ? paginateObj : null,
                                    scheduleChallenge?.team == 1
                                        ? teamCondition
                                        : '',
                                    scheduleChallenge?.group_status == 1
                                        ? groupCondition
                                        : '',
                                    clmNameArr,
                                );
                        }
                    }
                    if (result_type === 2) {
                        const sheetData = [{ sheet_name: "Report", list: resultedData }];
                        if (autoRequest !== 1) {
                            const manualReportResult = await this.userChallengeHelperService.createChallengeReportlsxNew(
                                scheduleChallengeDetails,
                                sheetData
                            );
                            return manualReportResult;
                        } if (autoRequest === 1) {
                            const manualReportResult = await this.userChallengeHelperService.createChallengeReportlsxNew(
                                scheduleChallengeDetails,
                                sheetData,
                                null,
                                true
                            );
                            if (manualReportResult && manualReportResult?.file_dir) {
                                autoReportFilePaths.push(manualReportResult.file_dir);
                            }
                        }
                    }
                }
                if (challengeType && challengeType == 'R') {
                    const scheduleChallenge =
                        await this.scheduleChallengeService.challengeFindOneReport(
                            `sc.id = ${scheduleId} AND ch.status = 1 AND sc.org_id = ${orgId}`,
                            { id: 'DESC' },
                            [
                                'ch.data_interval',
                                'ch.bio_challenge_type',
                                'ch.activity_id',
                                'ch.stepactivity_type',
                                'ch.max_time_day',
                                'ch.numberofsteps',
                                'ch.weektimeframe',
                                'ch.oz_water_per_day',
                                'ch.status',
                                'sc.id',
                                'sc.challenge_id',
                                'sc.custom_cname',
                                'sc.dpt_id',
                                'sc.loc_id',
                                'sc.numberofsteps',
                                'sc.time_elapsed',
                                'sc.dailymaxstepscnt',
                                'sc.countuserwithzero',
                                'sc.yard',
                                'sc.date_validation_setting',
                                'sc.rank_type',
                                'sc.race_type',
                                'sc.s_activity_tracker',
                                'sc.s_steps',
                                'sc.s_walking',
                                'sc.s_running',
                                'sc.s_cycling',
                                'sc.s_swimming',
                                'sc.start_date',
                                'sc.end_date',
                                'sc.countstepswith',
                                'sc.oz_water_per_day',
                                'sc.ft_average_per_week',
                                'sc.tr_totalgoaltype',
                                'sc.yardfrequency',
                                'sc.team',
                                'sc.is_oz_meet_require_day',
                                'sc.oz_meet_require_day',
                                'sc.backdating_frequency',
                                'sc.requirement_base_on',
                                'sc.goal_base_on',
                                'sc.total_enter_token',
                                'sc.max_num_of_token',
                                'sc.max_num_of_enter_token',
                                'sc.goalbasefrquency',
                                'sc.org_id',
                            ],
                        );
                    if (!scheduleChallenge) {
                        throw new Error('ERR_RECORD_NOT_FOUND');
                    }
                    scheduleChallengeDetails = scheduleChallenge;
                    if (scheduleChallenge && scheduleChallenge?.['ch']) {
                        resultedData =
                            await this.recipeChallengeReportService.recipeChallengeReport(
                                scheduleChallenge,
                                condition,
                                result_type,
                                result_type == 1 ? paginateObj : null,
                            );
                    }
                }
                if (challengeType && challengeType == 'E') {
                    const scheduleChallenge =
                        await this.scheduleChallengeService.challengeFindOneReport(
                            `sc.id = ${scheduleId} AND ch.status = 1 AND sc.org_id = ${orgId}`,
                            { id: 'DESC' },
                            [
                                'ch.data_interval',
                                'ch.bio_challenge_type',
                                'ch.activity_id',
                                'ch.stepactivity_type',
                                'ch.max_time_day',
                                'ch.numberofsteps',
                                'ch.weektimeframe',
                                'ch.oz_water_per_day',
                                'ch.status',
                                'sc.id',
                                'sc.challenge_id',
                                'sc.custom_cname',
                                'sc.dpt_id',
                                'sc.loc_id',
                                'sc.numberofsteps',
                                'sc.time_elapsed',
                                'sc.dailymaxstepscnt',
                                'sc.countuserwithzero',
                                'sc.yard',
                                'sc.date_validation_setting',
                                'sc.rank_type',
                                'sc.race_type',
                                'sc.s_activity_tracker',
                                'sc.s_steps',
                                'sc.s_walking',
                                'sc.s_running',
                                'sc.s_cycling',
                                'sc.s_swimming',
                                'sc.start_date',
                                'sc.end_date',
                                'sc.countstepswith',
                                'sc.oz_water_per_day',
                                'sc.ft_average_per_week',
                                'sc.tr_totalgoaltype',
                                'sc.yardfrequency',
                                'sc.team',
                                'sc.is_oz_meet_require_day',
                                'sc.oz_meet_require_day',
                                'sc.backdating_frequency',
                                'sc.requirement_base_on',
                                'sc.goal_base_on',
                                'sc.total_enter_token',
                                'sc.max_num_of_token',
                                'sc.max_num_of_enter_token',
                                'sc.goalbasefrquency',
                                'sc.org_id',
                            ],
                        );
                    if (!scheduleChallenge) {
                        throw new Error('ERR_RECORD_NOT_FOUND');
                    }
                    scheduleChallengeDetails = scheduleChallenge;
                    if (scheduleChallenge && scheduleChallenge?.['ch']) {
                        resultedData = await this.externalChallengeReportService.externalChallengeReport(
                            scheduleChallenge,
                            condition,
                            result_type,
                            result_type == 1 ? paginateObj : null,
                        );
                        if (result_type == 2) {
                            userList = resultedData?.user ?? [];
                            let sheetData = [{ sheet_name: "Report", list: userList }];
                            if (autoRequest !== 1) {
                                const manualReportResult = await this.userChallengeHelperService.createChallengeReportlsxNew(scheduleChallengeDetails, sheetData);
                                if (manualReportResult) {
                                    return manualReportResult;
                                }
                            }
                            if (autoRequest === 1) {
                                const manualReportResult = await this.userChallengeHelperService.createChallengeReportlsxNew(
                                    scheduleChallengeDetails,
                                    sheetData,
                                    null,
                                    true
                                );
                                if (manualReportResult && manualReportResult?.file_dir) {
                                    autoReportFilePaths.push(manualReportResult.file_dir);
                                }
                            }
                        }
                    }
                }
                if (result_type == 2 && resultedData && scheduleChallengeDetails) {
                    const bioType = scheduleChallengeDetails?.['ch']?.['bio_challenge_type'];
                    const mappedData = await this.userChallengeHelperService.mapSheetDataChallengeReport(
                        resultedData,
                        challengeType,
                        scheduleChallengeDetails,
                        clmNameArr,
                        teamList,
                    );
                    if (mappedData && Object.keys(mappedData).length > 0) {
                        const fileMappedData = mappedData?.challengeData || [];
                        const fileMappedTeamData = mappedData?.challengeTeamData || [];
                        const fileMappedGroupData = mappedData?.challengeGroupData || [];
                        const fileMappedDepartmentData = mappedData?.challengeDepartmentData || [];
                        if (scheduleChallengeDetails?.['ac']?.['activity_name'].trim() == "Steps" && bioType != "Football_step" && bioType != "Trek_step" && bioType != "Move_more" && bioType != "Random_Acts_of_Kindness" && bioType != "Relay_race") {
                            let sheetData = [];
                        }
                        else {
                            if (autoRequest == 1 && (bioType == 'Sleep_Tracking' || bioType == 'Hydrate' || bioType == 'Football_step' || bioType == 'Relay_race' || challengeType == 'R')) {
                                const autoReportResult = await this.userChallengeHelperService.createChallengeExcelFile(
                                    scheduleChallengeDetails,
                                    orgId,
                                    fileMappedData,
                                    fileMappedTeamData,
                                    fileMappedGroupData,
                                );
                                if (autoReportResult !== '' && autoReportResult != null && autoReportResult != undefined && autoReportResult != 'File does not exist') {
                                    autoReportFilePaths.push(autoReportResult);
                                }
                            }
                            if (autoRequest == 0) {
                                const manualReportResult =
                                    await this.userChallengeHelperService.createChallengeReportxlsx(
                                        scheduleChallengeDetails,
                                        orgId,
                                        fileMappedData,
                                        fileMappedTeamData,
                                        fileMappedGroupData,
                                        fileMappedDepartmentData,
                                    );
                                if (manualReportResult) {
                                    resultedData = manualReportResult;
                                }
                            }
                        }
                    }
                }
                if (
                    autoRequest == 0 &&
                    result_type == 1 &&
                    scheduleChallengeDetails
                ) {
                    if (!resultedData['details']) {
                        resultedData['details'] = Object.create(null);
                    }
                    resultedData['details'].is_team = 0;
                    resultedData['details'].is_group = 0;
                    resultedData['details'].challenge_type =
                        postData?.challenge_type || challengeType || '';
                    resultedData['details'].challenge_name =
                        scheduleChallengeDetails?.custom_cname || '';
                    resultedData['details'].bio_challenge_type =
                        scheduleChallengeDetails?.['ch']?.['bio_challenge_type'] ||
                        '';
                    if (scheduleChallengeDetails?.team == 1) {
                        resultedData['details'].is_team = 1;
                    }
                    if (scheduleChallengeDetails?.group_status == 1) {
                        resultedData['details'].is_group = 1;
                    }
                }
            }
            if (autoRequest === 1) {
                if(autoReportFilePaths.length > 0){
                    const zipFilePath = await this.userChallengeHelperService.createZipFromExcel(
                        orgId,
                        reportId,
                        autoReportFilePaths
                    );
                    if (zipFilePath && zipFilePath != '') {
                        return 'Report generated successfully'
                    }
                }
            }
            return resultedData;
        } catch (error) {
            console.log('error:', error);
            return {
                success: 0,
                message: error.message,
                error: 1,
            };
        }
    }
    async getTeamsDetails(schedule: Partial<ScheduleChallengeEntity>, resultData = [], teamCondition = ''): Promise<any[]> {
        try{
            let joinTable = [
                {'alias':'teamSchedule', 'table' : tableConstant.CHALLENGE.TBL_CH_TEAM_SCHEDULE, 'on' : `team.id = teamSchedule.team_id` , 'connect' : 'team', 'type' : 'LEFT' },
                {'alias':'company', 'table' : tableConstant.COMPANIES.TBL_COMPANY, 'on' : `company.id = team.org_id AND company.status = 1`, 'connect' : 'team', 'type' : 'LEFT' },
            ];
            let fields = ['team.id','team.tname','team.logo','team.team_size'];
            let teamList: any = await this.teamsService.list(`team.org_id = ${schedule?.org_id} AND teamSchedule.schedule_id = ${schedule?.id} AND team.status != 2 ${teamCondition}`, null,fields,null,joinTable);
            if (schedule['ch']['bio_challenge_type'] == 'Football'){
                const yard = schedule?.yard;
                const rankType = schedule?.rank_type ?? 'score';
                teamList = teamList.map(team => {
                    const teamId = team?.id;
                    const members = resultData.filter(item => item?.team?.id === teamId);
                    let weightloss = 0;
                    let weightlossPer = 0;
                    let score = 0;
                    for (const item of members) {
                        weightloss += (item.diffweight || 0);
                        weightlossPer += (item.weightloosper || 0);
                        score += (item.score || 0);
                    }
                    weightloss *= yard;
                    return {
                        ...team,
                        weightloss,
                        weightloosper: weightlossPer,
                        touchdown: weightloss ? Number(weightloss / 100) : 0,
                        score,
                        teammembercount: members.length,
                        teammembers: members
                    };
                });
                teamList.sort((a, b) =>
                    rankType === 'weight_loss_per'
                        ? b.weightloosper - a.weightloosper || b.score - a.score
                        : b.score - a.score || b.weightloosper - a.weightloosper
                );
                teamList.forEach((team, index) => {
                    team.rank = index + 1;
                });
            }
            if(teamList.length){
                let clm_name_arr = cronAppConstant.TEAM_HEADER_DATA;
                const clm_data = await Promise.all(
                    teamList.map(async (user) => {
                        const userId = user.id;
                        const row: any[] = [];

                        const tempdatainfo =
                            await this.commonHealthService.CommonFieldDataCallingCovid(
                                user,
                                clm_name_arr,
                                true
                            );
                        row.push(...Object.values(tempdatainfo));

                        // for (const card of cards) {
                        //     const cardId = card.id;
                        //     const cardDataForUser = cardData[userId]?.[cardId];
                        //     const requiredToComplete =
                        //         squareCompleteLimit !== 0
                        //             ? squareCompleteLimit
                        //             : squaresByCardId[cardId]?.length || 0;

                        //     if (
                        //         cardDataForUser &&
                        //         cardDataForUser.total >= requiredToComplete
                        //     ) {
                        //         row.push('Yes');
                        //         row.push(
                        //             this.commonDateService.DateTimeFormat(
                        //                 cardDataForUser.date,
                        //             ),
                        //         );
                        //     } else {
                        //         row.push('No');
                        //         row.push('');
                        //     }

                        //     const cardSquares = squaresByCardId[cardId] || [];
                        //     for (const square of cardSquares) {
                        //         const squareId = square.id;
                        //         const squareDate =
                        //             cardDataForUser?.squaredata?.[squareId];
                        //         if (squareDate) {
                        //             row.push('Yes');
                        //             row.push(
                        //                 this.commonDateService.DateTimeFormat(
                        //                     squareDate,
                        //                 ),
                        //             );
                        //         } else {
                        //             row.push('No');
                        //             row.push('');
                        //         }
                        //     }
                        //     row.push(cardDataForUser?.total || 0);
                        // }
                        // const completedCards = completeCard[userId] || 0;
                        // row.push(completedCards);
                        // row.push(
                        //     completedCards >= cardCompleteLimit ? 'Yes' : 'No',
                        // );
                        return row;
                    }),
                );
                return [clm_name_arr, ...clm_data];
            }
            return teamList;
        }
        catch(error){
            throw new Error(error);
        }
    }
}

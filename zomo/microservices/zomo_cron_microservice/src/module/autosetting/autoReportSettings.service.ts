import {
    appConstant,
    AutoReportSettingsEntity,
    CommonArrayService,
    CommonDateService,
    CommonFileService,
    CommonHealthService,
    CommonService, tableConstant,
} from '@common-constants';
import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import * as path from 'path';
import { lastValueFrom } from 'rxjs';
import { CronCommonService } from 'src/common';
import { In, Repository } from 'typeorm';
import { BiometricReportsService } from "../biometric";
import { EngagementComparisonService } from "../campaign";
import { CampaignService } from '../campaign/campaign.service';
import { ScheduleChallengeService } from '../challenge/schedulechallenge/schedulechallenge.service';
import { BillboardReportService } from '../company/billboard-report/billboard-report.service';
import { CompanyService } from '../company/company.service';
import { LocationServices } from '../company/location.service';
import { CovidReportService } from '../covidReport/covidReport.service';
import { WellbeingReportService } from '../emotional-well-being';
import { RequestEventReportsService } from '../events';
import { EventService } from '../events/events.service';
import { FitnessVideosService } from '../fitness/fitnessvideos.service';
import { MediaFitnessVideoReportService } from '../fitness/mediafitnessvideoreport.service';
import { HealthReportService } from "../healthcheckup";
import { HealthReReportService } from '../healthcheckup/healthrereport.service';
import { IncentiveReportsService } from '../incentivereports/incentivereports.service';
import { MyPlanPlansService } from '../myplan/plan/plans.service';
import { QuickLinkService } from '../quicklink/quicklink.service';
import { QuickLinkReportService } from '../quicklink/quicklinkreport.service';
import { QuizQuizzesService } from '../quiz';
import { QuizReportService } from '../quiz/quiz-report/quizreport.service';
import { CreateFormsService } from '../reimbursement/createforms.service';
import { ReimbursementReportService } from '../reimbursement/reimbusementreport.service';
import { SurveyReportService } from '../survey/surveyreport.service';
import { ActivityReportService } from '../tracker/activityreport.service';
import { UserService } from '../user/user.service';
const moment = require('moment-timezone');
const S3_URL = process.env.S3_URL_PROD;
@Injectable()
export class AutoReportSettingService {
    constructor(
        @InjectRepository(
            AutoReportSettingsEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaAutoReportSettingsRepository: Repository<AutoReportSettingsEntity>,
        @InjectRepository(
            AutoReportSettingsEntity,
            appConstant.MAIN.toLowerCase(),
        )
        private readonly writeReplicaAutoReportSettingsRepository: Repository<AutoReportSettingsEntity>,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonDateService: CommonDateService,
        private readonly commonFileService: CommonFileService,
        private readonly commonHealthService: CommonHealthService,
        private readonly covidReport: CovidReportService,
        private readonly quickLinkReportService: QuickLinkReportService,
        private readonly mediaFitnessVideoReportService: MediaFitnessVideoReportService,
        private readonly locationService: LocationServices,
        private readonly userService: UserService,
        private readonly companyServices: CompanyService,
        private readonly surveyReportService: SurveyReportService,
        private readonly activityReportService: ActivityReportService,
        private readonly incentiveReportsService: IncentiveReportsService,
        private readonly CampaignService: CampaignService,
        private readonly myPlanPlansService: MyPlanPlansService,
        private readonly scheduleChallengeService: ScheduleChallengeService,
        private readonly quickLinkService: QuickLinkService,
        private readonly fitnessVideosService: FitnessVideosService,
        private readonly wellbeingReportService: WellbeingReportService,
        private readonly reimbursementReportService: ReimbursementReportService,
        private readonly createFormsService: CreateFormsService,
        private readonly billboardReportService: BillboardReportService,
        private readonly healthReReportService: HealthReReportService,
        private readonly cronCommonService: CronCommonService,
        @Inject('COMMON_SERVICE')
        private readonly commonMicroservice: ClientProxy,
        private readonly eventReportsService: RequestEventReportsService,
        private readonly quizReportService: QuizReportService,
        private readonly eventService: EventService,
        private readonly quizQuizzesService: QuizQuizzesService,
        private readonly engagementComparisonService: EngagementComparisonService,
        private readonly biometricReportsService: BiometricReportsService,
        private readonly healthReportService: HealthReportService,
    ) {}
    async findOne(condition: any) {
        return await this.readReplicaAutoReportSettingsRepository.findOne({
            where: condition,
        });
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaAutoReportSettingsRepository.find({
            where: condition,
            select: [],
            order: orderBy,
        });
    }
    async save(data: any) {
        const savedResult =
            this.writeReplicaAutoReportSettingsRepository.create(data);
        return await this.writeReplicaAutoReportSettingsRepository.insert(
            savedResult,
        );
    }
    async update(condition: any, data: any) {
        return await this.writeReplicaAutoReportSettingsRepository
            .createQueryBuilder('autoReport')
            .update(AutoReportSettingsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicaAutoReportSettingsRepository.delete(condition);
    }
    async cron_report_request_set() {
        try {
            let infocurrentDate = this.commonDateService.getTodayDate();
            let infocurrentDateFormate = this.commonDateService.DateTimeFormat(
                'now',
                'YYYY-MM-DD',
            );
            let allReportSetting = await this.listRecord({ status: 1 },{ id: 'ASC' });
            let getTodayAllCovidRequest = await this.covidReport.listRecord(
                ` DATE_FORMAT(request_date,"%Y-%m-%d") LIKE '%${infocurrentDateFormate}%' AND request_source = 1`,
            );
            let getTodayAllQuicklinkRequest =
                await this.quickLinkReportService.listRecord(
                    ` DATE_FORMAT(request_date,"%Y-%m-%d") LIKE '%${infocurrentDateFormate}%' AND request_source = 1`,
                );
            let getTodayAllFitnessVideoRequest =
                await this.mediaFitnessVideoReportService.listRecord(
                    ` DATE_FORMAT(request_date,"%Y-%m-%d") LIKE '%${infocurrentDateFormate}%' AND request_source = 1`,
                );
            let getTodayAllSurveyRequest =
                await this.surveyReportService.listRecord(
                    ` DATE_FORMAT(request_date,"%Y-%m-%d") LIKE '%${infocurrentDateFormate}%' AND request_source = 1`,
                );
            let getTodayAllEngagementComparisonRequest = await this.engagementComparisonService.commonQueryBuilder([],` engagementComparison.request_date LIKE '%${infocurrentDateFormate}%' AND engagementComparison.request_source = 1`,{},[],'getMany');
            let getTodayAllBiometricRequest = await this.biometricReportsService.commonQueryBuilder([],` birBiometricReports.request_date LIKE '%${infocurrentDateFormate}%' AND birBiometricReports.request_source = 1`,{},[],'getMany');
            let getTodayAllActivityRequest =
                await this.activityReportService.listRecord(
                    ` DATE_FORMAT(request_date,"%Y-%m-%d") LIKE '%${infocurrentDateFormate}%' AND request_source = 1`,
                );
            let getTodayAllRequest =
                await this.incentiveReportsService.listRecordReport(
                    ` DATE_FORMAT(request_date,"%Y-%m-%d") LIKE '%${infocurrentDateFormate}%' AND request_source = 1`,
                );
            let getTodayAllEventRequest =
                await this.eventReportsService.listRecord(
                    `DATE_FORMAT(request_date,"%Y-%m-%d") LIKE '%${infocurrentDateFormate}%' AND request_source = 1`,
                );
            let getTodayAllBillboardRequest =
                await this.billboardReportService.listRecord(
                    `DATE_FORMAT(request_date,"%Y-%m-%d") LIKE '%${infocurrentDateFormate}%' AND request_source = 1`,
                );
            let getTodayAllHealthRequest =
                await this.healthReReportService.listRecord(
                    `DATE_FORMAT(request_date,"%Y-%m-%d") LIKE '%${infocurrentDateFormate}%' AND request_source = 1`,
                );
            let getTodayAllQuizRequest =
                await this.quizReportService.listRecord(
                    `DATE_FORMAT(request_date,"%Y-%m-%d") LIKE '%${infocurrentDateFormate}%' AND request_source = 1`,
                );
            let getTodayAllEmotionalwellbeingRequest =
                await this.wellbeingReportService.listRecord(
                    `DATE_FORMAT(request_date,"%Y-%m-%d") LIKE '%${infocurrentDateFormate}%' AND request_source = 1`,
                );
            let getTodayAllReimbursementsRequest =
                await this.reimbursementReportService.listRecord(
                    `DATE_FORMAT(request_date,"%Y-%m-%d") LIKE '%${infocurrentDateFormate}%' AND request_source = 1`,
                );
            const weekListDayType = {
                1: 'First',
                2: 'Second',
                3: 'Third',
                4: 'Fourth',
                5: 'Fifth',
                6: 'Last',
            };
            const dayList = {};
            for (let i = 1; i <= 31; i++) {
                dayList[i] = i;
            }
            const weekFullDays = {
                1: 'Monday',
                2: 'Tuesday',
                3: 'Wednesday',
                4: 'Thursday',
                5: 'Friday',
                6: 'Saturday',
                7: 'Sunday',
            };
            const weekDays = {
                1: 'Mon',
                2: 'Tue',
                3: 'Wed',
                4: 'Thu',
                5: 'Fri',
                6: 'Sat',
                7: 'Sun',
            };
            const monthList = {
                1: 'Jan',
                2: 'Feb',
                3: 'Mar',
                4: 'Apr',
                5: 'May',
                6: 'Jun',
                7: 'Jul',
                8: 'Aug',
                9: 'Sep',
                10: 'Oct',
                11: 'Nov',
                12: 'Dec',
            };
            // let currentDate = infocurrentDate.format('YYYY-MM-DD');
            // let yearInt = infocurrentDate.format('YYYY');
            // let monthStr = infocurrentDate.format('MMM');
            // let monthInt = infocurrentDate.format('MM');
            // let monthSInt = infocurrentDate.format('M');
            // let dayInt = infocurrentDate.format('DD');
            // let dayStr = infocurrentDate.format('ddd');
            // let monthStartDate = infocurrentDate.clone().startOf('month').format('YYYY-MM-DD');
            // let monthStartDay = infocurrentDate.clone().startOf('month').format('DD');
            // let monthLastDate = infocurrentDate.clone().endOf('month').format('YYYY-MM-DD');
            // let monthLastDay = infocurrentDate.clone().endOf('month').format('DD');
            let currentDate = this.commonDateService.DateTimeFormat(
                infocurrentDate,
                'YYYY-MM-DD',
            );
            let yearInt = this.commonDateService.DateTimeFormat(
                infocurrentDate,
                'YYYY',
            );
            let monthStr = this.commonDateService.DateTimeFormat(
                infocurrentDate,
                'MMM',
            );
            let monthInt = this.commonDateService.DateTimeFormat(
                infocurrentDate,
                'MM',
            );
            let monthSInt = this.commonDateService.DateTimeFormat(
                infocurrentDate,
                'M',
            );
            let dayInt = this.commonDateService.DateTimeFormat(
                infocurrentDate,
                'DD',
            );
            let dayStr = this.commonDateService.DateTimeFormat(
                infocurrentDate,
                'ddd',
            );
            let monthStartDate = this.commonDateService.getStartAndEndOfMonth(
                infocurrentDate,
                'YYYY-MM-DD',
            ).startOfMonth;
            let monthStartDay = this.commonDateService.getStartAndEndOfMonth(
                infocurrentDate,
                'DD',
            ).startOfMonth;
            let monthLastDate = this.commonDateService.getStartAndEndOfMonth(
                infocurrentDate,
                'YYYY-MM-DD',
            ).endOfMonth;
            let monthLastDay = this.commonDateService.getStartAndEndOfMonth(
                infocurrentDate,
                'DD',
            ).endOfMonth;
            let startDate = moment(monthStartDate).format('YYYY-MM-DD');
            let endDate = moment(monthLastDate)
                .add(1, 'day')
                .format('YYYY-MM-DD');
            let begin = moment(startDate);
            let end = moment(endDate);
            let period = [];
            while (begin.isBefore(end)) {
                period.push(begin.format('YYYY-MM-DD'));
                begin.add(1, 'day');
            }
            let totalRequestGenerate = 0;
            for (const [index, item] of allReportSetting.entries()) {
                let seId = item?.id;
                let seOId = item?.org_id;
                let seUId = item?.created_by;
                let mmCode = item?.membership_code;
                let conditionData = item?.setting_conditions;
                if (
                    item?.f_location &&
                    item?.f_location !== '' &&
                    item?.f_location !== null
                ) {
                    if (
                        item.module_id.toString() === '13' ||
                        item.module_id.toString() === '7' ||
                        item.module_id.toString() === '9' ||
                        item.module_id.toString() === '2' ||
                        item.module_id.toString() === '4'
                    ) {
                        conditionData += ` AND User.location IN ([${item.f_location}])`;
                    } else {
                        let locations = await this.locationService.listRecord(
                            ['lname', 'id'],
                            {
                                deleted: 0,
                                id: In([44, 45, 46, 57, 68, 70, 76, 200, 201]),
                            },
                        );
                        let allFilerLocation = [];
                        if (locations && Object.keys(locations).length > 0) {
                            let locationName = locations.map(
                                (item) => item.lname,
                            );
                            let locationsSame =
                                await this.locationService.listRecord(
                                    ['lname', 'id'],
                                    { deleted: 0, lname: In(locationName) },
                                );
                            if (
                                locationsSame &&
                                Object.keys(locationsSame).length > 0
                            ) {
                                allFilerLocation = locationsSame.map(
                                    (id) => id.id,
                                );
                            }
                            let filterLocId = allFilerLocation;
                            if (filterLocId && filterLocId.length > 0) {
                                conditionData += `AND User.location IN (${filterLocId})`;
                            }
                        }
                    }
                }
                let requestData = Object.create(null);
                requestData['org_id'] = item['org_id'];
                requestData['user_id'] = item['created_by'];
                requestData['user_role'] = item['user_role'];
                requestData['membership_code'] = item['membership_code'];
                requestData['camp_id'] = item['f_module_items'];
                requestData['report_fields'] = item['report_fields'];
                if (
                    item.module_id &&
                    (item.module_id.toString() === '1' ||
                        item.module_id.toString() === '1' ||
                        item.module_id.toString() === '13' ||
                        item.module_id.toString() === '15' ||
                        item.module_id.toString() === '4')
                ) {
                    requestData['report_type'] = item.f_module_report_type;
                } else {
                    requestData['report_type'] = item.report_type;
                }
                requestData['department_id'] = item['f_department'];
                requestData['location'] = item['f_location'];
                requestData['condition'] = conditionData;
                requestData['request_date'] = moment().format(
                    'YYYY-MM-DD HH:mm:ss',
                );
                requestData['email'] = item.send_emails.replace(/\s+/g, '');
                requestData['send_cc_emails'] = item.send_cc_emails.replace(
                    /\s+/g,
                    '',
                );
                const scheduledTime = item.timezone_time?.trim() || '06:00';
                const orgTimezone = item.org_timezone?.trim() || 'UTC';
                const parsed = moment(scheduledTime, ['h:mm A', 'h:mm a', 'HH:mm', 'hh:mm A', 'hh:mm a'], true);
                const scheduledTime24 = parsed.isValid() ? parsed.format('HH:mm') : '06:00';
                const currentTimeInOrgTZ = moment().tz(orgTimezone);
                const currentTimeStr = currentTimeInOrgTZ.format('HH:mm');
                const hasTimePassedToday = currentTimeStr > scheduledTime24;
                const inputTimeZonetime = item.timezone_time?.trim();
                let time24 = '06:00';
                if (inputTimeZonetime) {
                    const parsed = moment(inputTimeZonetime, ['h:mm A', 'h:mm a', 'HH:mm', 'hh:mm A', 'hh:mm a'], true);
                    if (parsed.isValid()) {
                        time24 = parsed.format('HH:mm');
                    }
                }
                requestData['request_timezone_time'] = time24;
                requestData['request_timezone'] = item.org_timezone?.trim()
                    ? item.org_timezone
                    : 'UTC';
                requestData['is_range'] = 0;
                if (item.f_from_date && item.f_to_date) {
                    requestData['is_range'] = 1;
                }
                requestData['start_date_range'] = item.f_from_date
                    ? moment(item.f_from_date.replace(/-/g, '/'), 'DD/MM/YYYY').format(
                          'YYYY-MM-DD',
                      ) + ' 00:00:00'
                    : '';
                requestData['end_date_range'] = item.f_to_date
                    ? moment(item.f_to_date.replace(/-/g, '/'), 'DD/MM/YYYY').format(
                          'YYYY-MM-DD',
                      ) + ' 23:59:59'
                    : '';
                requestData['status'] = 0;
                requestData['engagement_report'] = 0;
                if (item.f_engagement_report) {
                    requestData['engagement_report'] = item.f_engagement_report;
                }
                requestData['request_source'] = 1;
                requestData['email_status'] = 0;
                requestData['report_setting_id'] = item.id;
                requestData['auto_report_type'] = item.module_id;
                requestData['otheroptions'] = item.otheroptions;
                requestData['report_item_status'] = null;
                requestData['report_item_type'] = null;
                if (item.module_id.toString() === '3') {
                    requestData['report_item_status'] = item.challenge_status;
                    requestData['report_item_type'] = item.challenge_type;
                }
                const moduleId = Number(item.module_id);
                const reportMapping = {
                    1: {
                        tabalAlias: this.incentiveReportsService,
                        dataList: getTodayAllRequest,
                    },
                    2: {
                        tabalAlias: this.incentiveReportsService,
                        dataList: getTodayAllRequest,
                    },
                    3: {
                        tabalAlias: this.incentiveReportsService,
                        dataList: getTodayAllRequest,
                    },
                    4: {
                        tabalAlias: this.covidReport,
                        dataList: getTodayAllCovidRequest,
                    },
                    5: {
                        tabalAlias: this.quickLinkReportService,
                        dataList: getTodayAllQuicklinkRequest,
                    },
                    6: {
                        tabalAlias: this.mediaFitnessVideoReportService,
                        dataList: getTodayAllFitnessVideoRequest,
                    },
                    7: { 
                        tabalAlias: this.billboardReportService, 
                        dataList: getTodayAllBillboardRequest 
                    },
                    8: {
                        tabalAlias: this.eventReportsService,
                        dataList: getTodayAllEventRequest,
                    },
                    9: { 
                        tabalAlias: this.healthReReportService, 
                        dataList: getTodayAllHealthRequest 
                    },
                    10: {
                        tabalAlias: this.activityReportService,
                        dataList: getTodayAllActivityRequest,
                    },
                    11: {
                        tabalAlias: this.quizReportService,
                        dataList: getTodayAllQuizRequest
                    },
                    12: { 
                        tabalAlias: this.wellbeingReportService, 
                        dataList: getTodayAllEmotionalwellbeingRequest 
                    },
                    13: {
                        tabalAlias: this.surveyReportService,
                        dataList: getTodayAllSurveyRequest,
                    },
                    14: { tabalAlias: this.engagementComparisonService, dataList: getTodayAllEngagementComparisonRequest },
                    15: {
                        tabalAlias: this.reimbursementReportService,
                        dataList: getTodayAllReimbursementsRequest
                    },
                    16: { tabalAlias: this.biometricReportsService, dataList: getTodayAllBiometricRequest },
                };
                const { tabalAlias, dataList: AllTodayDataList } = reportMapping[moduleId] || {};
                let checkConditionDate = null;
                if (item.frequency_type === 1) {
                    // checkConditionDate = currentDate;
                    if (!hasTimePassedToday) {
                        checkConditionDate = currentDate;
                    }
                } else if (item.frequency_type === 2) {
                    const selectedDays = item.weekly_days
                        ? item.weekly_days.split(',')
                        : [];
                    const selectedDaysStr = selectedDays.length
                        ? selectedDays
                              .map((day) => weekDays[day])
                              .filter(Boolean)
                        : [];
                    // if (selectedDaysStr.includes(dayStr)) {
                    //     checkConditionDate = currentDate;
                    // }
                    if (selectedDaysStr.includes(dayStr) && !hasTimePassedToday) {
                        checkConditionDate = currentDate;
                    }
                } else if (item.frequency_type === 3) {
                    const selectedDays = item.weekly_days
                        ? item.weekly_days.split(',')
                        : [];
                    if (selectedDays.length > 0) {
                        const selectedDaysStr = selectedDays
                            .map((day) => weekDays[day])
                            .filter(Boolean);
                        const datePeriodData = [];
                        const tempbioevent = {};
                        for (const dt of period) {
                            const momentDt = moment(dt, 'YYYY-MM-DD');
                            let dayNumber;
                            if (momentDt.isValid()) {
                                dayNumber = momentDt.isoWeekday();
                            }
                            if (selectedDays.includes(dayNumber.toString())) {
                                if (
                                    !tempbioevent[dayNumber] ||
                                    tempbioevent[dayNumber] === 1
                                ) {
                                    datePeriodData.push(
                                        momentDt.format('YYYY-MM-DD'),
                                    );
                                    tempbioevent[dayNumber] = 0;
                                } else {
                                    tempbioevent[dayNumber] = 1;
                                }
                            }
                        }
                        // if (datePeriodData.includes(currentDate)) {
                        //     checkConditionDate = currentDate;
                        // }
                        if (datePeriodData.includes(currentDate) && !hasTimePassedToday) {
                            checkConditionDate = currentDate;
                        }
                    }
                } else if (item.frequency_type === 4) {
                    if (
                        item.monthly_basis === 1 &&
                        item.monthly_date_basis &&
                        item.monthly_date_basis != null &&
                        item.monthly_date_basis != undefined
                    ) {
                        let SelectedDate =
                            String(item.monthly_date_basis).length === 1
                                ? '0' + item.monthly_date_basis
                                : String(item.monthly_date_basis);
                        let createSelectedDate =
                            monthLastDay < String(item.monthly_date_basis)
                                ? `${yearInt}-${monthInt}-${monthLastDay}`
                                : `${yearInt}-${monthInt}-${SelectedDate}`;
                        // if (createSelectedDate === currentDate) {
                        //     checkConditionDate = createSelectedDate;
                        // }
                        if (createSelectedDate === currentDate && !hasTimePassedToday) {
                            checkConditionDate = createSelectedDate;
                        }
                    } else if (item.monthly_basis === 2) {
                        const selectedType = item.monthly_basis_type;
                        const selectedDay = item.monthly_basis_day;
                        if (selectedType && selectedDay) {
                            const sType = weekListDayType[selectedType] || '';
                            const sDay = weekFullDays[selectedDay] || '';
                            if (sType && sDay) {
                                const monthStart = moment().startOf('month');
                                const weekDayNumber = moment().day(sDay).day();
                                let calculatedDate = monthStart.clone();
                                const weekTypeMapping = {
                                    First: 0,
                                    Second: 1,
                                    Third: 2,
                                    Fourth: 3,
                                    Fifth: 4,
                                };
                                if (weekTypeMapping[sType] !== undefined) {
                                    calculatedDate = monthStart
                                        .clone()
                                        .day(
                                            weekDayNumber +
                                                weekTypeMapping[sType] * 7,
                                        );
                                    if (
                                        calculatedDate.month() !==
                                        monthStart.month()
                                    ) {
                                        calculatedDate = calculatedDate.add(
                                            7,
                                            'days',
                                        );
                                    }
                                    const getMonth =
                                        calculatedDate.format('MM');
                                    if (
                                        parseInt(String(monthInt), 10) ===
                                        parseInt(getMonth, 10)
                                    ) {
                                        const checkDate =
                                            calculatedDate.format('YYYY-MM-DD');
                                        // if (checkDate === currentDate) {
                                        //     checkConditionDate = checkDate;
                                        // }
                                        if (checkDate === currentDate && !hasTimePassedToday) {
                                            checkConditionDate = checkDate;
                                        }
                                    }
                                }
                            }
                        }
                    }
                } else if (item.frequency_type === 5) {
                    const selectedDate = item.year_basis_day;
                    const selectedMonth = item.year_basis_month;
                    if (selectedDate != null && selectedMonth != null) {
                        const sDate = dayList[selectedDate] || '';
                        const sMonth = monthList[selectedMonth] || '';
                        if (sDate && sMonth) {
                            const yDate =
                                String(selectedDate).length === 1
                                    ? '0' + selectedDate
                                    : String(selectedDate);
                            const yMonth =
                                String(selectedMonth).length === 1
                                    ? '0' + selectedMonth
                                    : String(selectedMonth);
                            const selectedMonthEndDate = moment(
                                `${yearInt}-${yMonth}-01`,
                            )
                                .endOf('month')
                                .date();
                            let yearCreatedDate = `${yearInt}-${yMonth}-${yDate}`;
                            if (selectedMonthEndDate < yDate) {
                                yearCreatedDate = `${yearInt}-${yMonth}-${selectedMonthEndDate}`;
                            }
                            // if (
                            //     yearCreatedDate &&
                            //     yearCreatedDate === currentDate
                            // ) {
                            //     checkConditionDate = yearCreatedDate;
                            // }
                            if (yearCreatedDate && yearCreatedDate == currentDate && !hasTimePassedToday) {
                                checkConditionDate = yearCreatedDate;
                            }
                        }
                    }
                }
                if (checkConditionDate && checkConditionDate !== '') {
                    const checkRequest = AllTodayDataList?.filter(
                        (item) =>
                            item?.request_source == 1 &&
                            item?.report_setting_id == seId &&
                            moment(item?.request_date).format('YYYY-MM-DD') ==
                                checkConditionDate &&
                            item?.org_id == seOId &&
                            item?.user_id == seUId,
                    ) || [];
                    if (tabalAlias && checkRequest ) {
                        if (checkRequest.length == 0) {
                            if(tabalAlias == this.incentiveReportsService){
                                requestData['system_type'] = 1;
                            }
                            await tabalAlias.save(requestData);
                            totalRequestGenerate += 1;
                        }
                    }
                }
            }
            return `Success ${totalRequestGenerate} Report Request Generated`;
        } catch (error) {
            console.log("error",error);
            return {
                success: 0,
                message: error.message,
                error: 1,
            };
        }
    }
    async cronAutoReportEmail() {
        try {
            let allOrgData = await this.userService.listCRecord(
                `user.role_id = 11 AND user.status = 1`,
                [
                    'user.id',
                    'user.timezone',
                    'user.first_name',
                    'user.last_name',
                    'user.email',
                    'user.username',
                    'user.role_id',
                    'user.org_id',
                    'user.membership_code',
                    'company.id',
                    'company.company_name',
                    'company.company_logo',
                    'company.id',
                    'company.code',
                    'meta.zip_report_password',
                    'meta.id',
                ],
            );
            let allCompanyData = await this.companyServices.listRecord(
                `company.deleted = 0 AND company.status = 1`,
            );
            let allOrgPassList = {};
            allCompanyData.forEach((sub) => {
                if (sub['companyMeta']?.zip_report_password) {
                    allOrgPassList[sub.id] =
                        sub?.['companyMeta']?.zip_report_password;
                } else {
                    allOrgPassList[sub.id] = `${sub.code}_${sub.id}`;
                }
            });
            let allOrgUserDataMembershipCode = allOrgData.reduce((acc, item) => {
                acc[item.membership_code] = item;
                return acc;
            }, {});
            let allOrgCompanyData = allOrgData.reduce((acc, item) => {
                let companyId = item?.['company']?.id;
                if (companyId !== undefined && companyId !== null) {
                    acc[companyId] = item?.['company'];
                }
                return acc;
            }, {});
            let allOrgEmailDatas = allOrgData.reduce((acc, item) => {
                acc[item.id] = item.email;
                return acc;
            }, {});
            let incentiveIDSArray = [],
                myplanIDSArray = [],
                ChallengeIDSSArray = [],
                QuicklinkIDSSArray = [],
                FitnessVideoIDSSArray = [],
                EventIDSSArray = [],
                QuizIDSSArray = [],
                ECCamIDSSArray = [],
                ReFoIDSSArray = [],
                getTodayCompaltedRequest = [],
                Templatetext = {};
            let campaignNamelist = [],
                plansNameList = [],
                ChallengeNameList = [],
                quicklinkNameList = [],
                fitnessVideoNameList = [],
                eventList = [],
                quizVideoNameList = [],
                ECCamNameList = [],
                ReFoINameList = [];
            /* INCENTIVE, MYPLAN AND CHALLENGE REQUEST */
            let com_condition = `automaticreportSetting.status = 1 AND automaticreportSetting.org_id IN (${Object.keys(allOrgCompanyData).map(Number).join(',')})`;
            let com_IMC = `${com_condition} AND incentivereports.email_status = 0 AND incentivereports.status = 1 AND incentivereports.request_source = 1`;
            let getTodayCompaltedIMCRequest =
                await this.incentiveReportsService.listIARecord(com_IMC, null, [
                    'incentivereports',
                    'automaticreportSetting.module_id',
                    'automaticreportSetting.send_emails',
                    'automaticreportSetting.email_subject',
                    'automaticreportSetting.email_content',
                ]);
            const extractIds = (data, type) => {
                return data
                    .filter((item) => item?.auto_report_type === type)
                    .map((item) => item.camp_id);
            };
            const incentiveIDS = extractIds(getTodayCompaltedIMCRequest, 1);
            const myplanIDS = extractIds(getTodayCompaltedIMCRequest, 2);
            const ChallengeIDS = extractIds(getTodayCompaltedIMCRequest, 3);
            const processIds = (ids) => {
                let resultArray = new Set();
                ids.forEach((sub) => {
                    if (sub !== 0 && sub !== '' && sub !== null) {
                        sub.split(',').forEach((id) =>
                            resultArray.add(id.trim()),
                        );
                    }
                });
                return [...resultArray];
            };
            incentiveIDSArray = processIds(incentiveIDS);
            myplanIDSArray = processIds(myplanIDS);
            ChallengeIDSSArray = processIds(ChallengeIDS);
            if (
                Array.isArray(incentiveIDSArray) &&
                incentiveIDSArray.length > 0
            ) {
                campaignNamelist = await this.CampaignService.listRecord(
                    `campaign.id IN (${incentiveIDSArray.join(',')}) AND campaign.status = 1`,
                    { ['end_date']: 'ASC' },
                );
            }
            if (Array.isArray(myplanIDSArray) && myplanIDSArray.length > 0) {
                plansNameList = await this.myPlanPlansService.listRecord(
                    ['mp.id', 'mp.name'],
                    `mp.id IN (${myplanIDSArray.join(',')}) AND mp.status = 1`,
                    { ['id']: 'ASC' },
                );
            }
            if (
                Array.isArray(ChallengeIDSSArray) &&
                ChallengeIDSSArray.length > 0
            ) {
                let scheduledata =
                    await this.scheduleChallengeService.listRecord(
                        `sc.id IN (${ChallengeIDSSArray.join(',')})`,
                        { id: 'DESC' },
                        ['sc.id', 'sc.custom_cname'],
                    );
                scheduledata.forEach((s) => {
                    ChallengeNameList.push({
                        id: s.id,
                        name:
                            s.custom_cname.trim() !== ''
                                ? s.custom_cname
                                : s.ch.challenge_name,
                    });
                });
            }
            getTodayCompaltedRequest = [
                ...getTodayCompaltedRequest,
                ...getTodayCompaltedIMCRequest,
            ];
            /* INCENTIVE, MYPLAN AND CHALLENGE REQUEST */
            /* COVID REQUEST */
            let covidWhere = `${com_condition} AND covidReport.email_status = 0 AND covidReport.status = 1 AND covidReport.request_source = 1`;
            let getTodayCompaltedCovidRequest =
                await this.covidReport.findWithAutoSetting(covidWhere, [
                    'covidReport',
                    'automaticreportSetting.module_id',
                    'automaticreportSetting.send_emails',
                    'automaticreportSetting.email_subject',
                    'automaticreportSetting.email_content',
                ]);
            getTodayCompaltedRequest = [
                ...getTodayCompaltedRequest,
                ...getTodayCompaltedCovidRequest,
            ];
            /* COVID REQUEST */
            /* QUICKLINK REQUEST */
            let quicklinkWhere = `${com_condition} AND quicklinkReport.email_status = 0 AND quicklinkReport.status = 1 AND quicklinkReport.request_source = 1`;
            let getTodayCompaltedQuicklinkRequest =
                await this.quickLinkReportService.findWithAutoSetting(
                    quicklinkWhere,
                    [
                        'quicklinkReport',
                        'automaticreportSetting.module_id',
                        'automaticreportSetting.send_emails',
                        'automaticreportSetting.email_subject',
                        'automaticreportSetting.email_content',
                    ],
                );
            getTodayCompaltedRequest = [
                ...getTodayCompaltedRequest,
                ...getTodayCompaltedQuicklinkRequest,
            ];
            let quicklinkIDS = extractIds(getTodayCompaltedQuicklinkRequest, 5);
            QuicklinkIDSSArray = processIds(quicklinkIDS);
            if (
                Array.isArray(QuicklinkIDSSArray) &&
                QuicklinkIDSSArray.length > 0
            ) {
                quicklinkNameList =
                    await this.quickLinkService.quickLinkListRecord(
                        ['id', 'title'],
                        { id: In(QuicklinkIDSSArray) },
                    );
            }
            /* QUICKLINK REQUEST */
            /* FITNESS VIDEO REQUEST */
            let fitnessWhere = `${com_condition} AND fodReport.email_status = 0 AND fodReport.status = 1 AND fodReport.request_source = 1`;
            let getTodayCompaltedFitnessRequest =
                await this.mediaFitnessVideoReportService.findWithAutoSetting(
                    fitnessWhere,
                    [
                        'fodReport',
                        'automaticreportSetting.module_id',
                        'automaticreportSetting.send_emails',
                        'automaticreportSetting.email_subject',
                        'automaticreportSetting.email_content',
                    ],
                );
            getTodayCompaltedRequest = [
                ...getTodayCompaltedRequest,
                ...getTodayCompaltedFitnessRequest,
            ];
            let fitnessVideoIDS = extractIds(
                getTodayCompaltedFitnessRequest,
                6,
            );
            FitnessVideoIDSSArray = processIds(fitnessVideoIDS);
            if (
                Array.isArray(FitnessVideoIDSSArray) &&
                FitnessVideoIDSSArray.length > 0
            ) {
                fitnessVideoNameList =
                    await this.fitnessVideosService.listRecord(
                        `fitness.id IN (${FitnessVideoIDSSArray.join(',')})`,
                        ['fitness.id', 'fitness.name'],
                    );
            }
            /* FITNESS VIDEO REQUEST END */
            /* BILLBOARD REQUEST START */
            let billboardWhere = `${com_condition} AND billboard.email_status = 0 AND billboard.status = 1 AND billboard.request_source = 1`;
            let getTodayCompaltedBillboardRequest =
                await this.billboardReportService.findWithAutoSetting(billboardWhere, [
                    'billboard',
                    'automaticreportSetting.module_id',
                    'automaticreportSetting.send_emails',
                    'automaticreportSetting.email_subject',
                    'automaticreportSetting.email_content',
                ]);
            getTodayCompaltedRequest = [
                ...getTodayCompaltedRequest,
                ...getTodayCompaltedBillboardRequest,
            ];
            /* BILLBOARD REQUEST END */
            /* EVENT REQUEST */
            let EventWhere = `${com_condition} AND event.email_status = 0 AND event.status = 1 AND event.request_source = 1`;
            let getTodayEventRequest =
                await this.eventReportsService.findWithAutoSetting(EventWhere, [
                    'event',
                    'automaticreportSetting.module_id',
                    'automaticreportSetting.send_emails',
                    'automaticreportSetting.email_subject',
                    'automaticreportSetting.email_content',
                ]);
            getTodayCompaltedRequest = [
                ...getTodayCompaltedRequest,
                ...getTodayEventRequest,
            ];
            let eventsIDS = extractIds(
                getTodayEventRequest,
                8,
            );
            EventIDSSArray = processIds(eventsIDS);
            if (
                Array.isArray(EventIDSSArray) &&
                EventIDSSArray.length > 0
            ) {
                eventList =
                    await this.eventService.eventListRecord(
                        ['id', 'event_name'],
                        { id: In(EventIDSSArray) },
                    );
            }
            /* EVENT REQUEST */
            /* HEALTH REQUEST START */
            let healthReportWhere = `${com_condition} AND healthReport.email_status = 0 AND healthReport.status = 1 AND healthReport.request_source = 1`;
            let getTodayCompletedHealthReportRequest = await this.healthReportService.commonQueryBuilder([
                'healthReport',
                'automaticreportSetting.module_id',
                'automaticreportSetting.send_emails',
                'automaticreportSetting.email_subject',
                'automaticreportSetting.email_content',
            ],healthReportWhere,{},[{
                join_table: 'healthReport.automaticreportSetting',
                alias: 'automaticreportSetting',
                table: tableConstant.REPORT.TBL_AU_AUTO_REPORT_SETTINGS,
                on_condition: `automaticreportSetting.id = healthReport.org_id`,
                join_type: 'inner_one',
            }],'getMany')
            getTodayCompaltedRequest = [
                ...getTodayCompaltedRequest,
                ...getTodayCompletedHealthReportRequest,
            ];
            /* HEALTH REQUEST END */
            /* ACTIVITY REQUEST START */
            let ActivityWhere = `${com_condition} AND activityReport.email_status = 0 AND activityReport.status = 1 AND activityReport.request_source = 1`;
            let getTodayCompaltedActivityRequest =
                await this.activityReportService.findWithAutoSetting(
                    ActivityWhere,
                    [
                        'activityReport',
                        'automaticreportSetting.module_id',
                        'automaticreportSetting.send_emails',
                        'automaticreportSetting.email_subject',
                        'automaticreportSetting.email_content',
                    ],
                );
            getTodayCompaltedRequest = [
                ...getTodayCompaltedRequest,
                ...getTodayCompaltedActivityRequest,
            ];
            /* ACTIVITY REQUEST END*/
            /* QUIZ REQUEST START */
            let quizWhere = `${com_condition} AND quizReport.email_status = 0 AND quizReport.status = 1 AND quizReport.request_source = 1`;
            let getTodayCompaltedQuizRequest =
                await this.quizReportService.findWithAutoSetting(
                    quizWhere,
                    [
                        'quizReport',
                        'automaticreportSetting.module_id',
                        'automaticreportSetting.send_emails',
                        'automaticreportSetting.email_subject',
                        'automaticreportSetting.email_content',
                    ],
                );
            getTodayCompaltedRequest = [
                ...getTodayCompaltedRequest,
                ...getTodayCompaltedQuizRequest,
            ];
            let quizIDS = extractIds(getTodayCompaltedQuizRequest, 11);
            QuizIDSSArray = processIds(quizIDS);
            if (Array.isArray(QuizIDSSArray) && QuizIDSSArray.length > 0) {
                quizVideoNameList = await this.quizQuizzesService.quizListRecord(
                    ['id', 'quiz_name'],
                    { id: In(QuizIDSSArray) },
                );
            }
            /* QUIZ REQUEST END*/
            /* EMOTIONAL WELL-BEING REQUEST START*/
            let EwbWhere = `${com_condition} AND wellbeingReport.email_status = 0 AND wellbeingReport.status = 1 AND wellbeingReport.request_source = 1`;
            let getTodayCompaltedEWBRequest =
                await this.wellbeingReportService.findWithAutoSetting(
                    EwbWhere,
                    [
                        'wellbeingReport',
                        'automaticreportSetting.module_id',
                        'automaticreportSetting.send_emails',
                        'automaticreportSetting.email_subject',
                        'automaticreportSetting.email_content',
                    ],
                );
            getTodayCompaltedRequest = [
                ...getTodayCompaltedRequest,
                ...getTodayCompaltedEWBRequest,
            ];
            /* EMOTIONAL WELL-BEING REQUEST END*/
            /* SURVEY REQUEST START*/
            let surveyWhere = `${com_condition} AND surveyReport.email_status = 0 AND surveyReport.status = 1 AND surveyReport.request_source = 1`;
            let getTodayCompaltedSurveyRequest =
                await this.surveyReportService.findWithAutoSetting(
                    surveyWhere,
                    [
                        'surveyReport',
                        'automaticreportSetting.module_id',
                        'automaticreportSetting.send_emails',
                        'automaticreportSetting.email_subject',
                        'automaticreportSetting.email_content',
                    ],
                );
            getTodayCompaltedRequest = [
                ...getTodayCompaltedRequest,
                ...getTodayCompaltedSurveyRequest,
            ];
            /* SURVEY REQUEST END*/
            /* ENGAGEMENT COMPARISON REQUEST START */
            let engagementComparisonWhere = `${com_condition} AND engagementComparison.email_status = 0 AND engagementComparison.status = 1 AND engagementComparison.request_source = 1`;
            let getTodayCompletedEngagementComparisonRequest = await this.engagementComparisonService.commonQueryBuilder([
                'engagementComparison',
                'automaticreportSetting.module_id',
                'automaticreportSetting.send_emails',
                'automaticreportSetting.email_subject',
                'automaticreportSetting.email_content',
            ],engagementComparisonWhere,{},[{
                join_table: 'engagementComparison.automaticreportSetting',
                alias: 'automaticreportSetting',
                table: tableConstant.REPORT.TBL_AU_AUTO_REPORT_SETTINGS,
                on_condition: `automaticreportSetting.id = engagementComparison.org_id`,
                join_type: 'inner_one',
            }],'getMany')
            getTodayCompaltedRequest = [
                ...getTodayCompaltedRequest,
                ...getTodayCompletedEngagementComparisonRequest,
            ];
            let engagementComparisonIDS = extractIds(getTodayCompaltedQuizRequest, 14);
            ECCamIDSSArray = processIds(engagementComparisonIDS);
            if (Array.isArray(ECCamIDSSArray) && ECCamIDSSArray.length > 0) {
                ECCamNameList = await this.CampaignService.getAll(
                    { id: In(ECCamIDSSArray) },
                    ['id', 'campaign_name'],
                    {"end_date": "ASC"}
                );
            }
            /* ENGAGEMENT COMPARISON REQUEST END */
            /* REIMBURSEMENTS REQUEST START*/
            let reimbursementWhere = `${com_condition} AND reimbursementReport.email_status = 0 AND reimbursementReport.status = 1 AND reimbursementReport.request_source = 1`;
            let getTodayCompaltedReimburRequest =
                await this.reimbursementReportService.findWithAutoSetting(
                    reimbursementWhere,
                    [
                        'reimbursementReport',
                        'automaticreportSetting.module_id',
                        'automaticreportSetting.send_emails',
                        'automaticreportSetting.email_subject',
                        'automaticreportSetting.email_content',
                    ],
                );
            getTodayCompaltedRequest = [
                ...getTodayCompaltedRequest,
                ...getTodayCompaltedReimburRequest,
            ];
            let ReFoIDS = extractIds(getTodayCompaltedReimburRequest, 15);
            ReFoIDSSArray = processIds(ReFoIDS);
            if (Array.isArray(ReFoIDSSArray) && ReFoIDSSArray.length > 0) {
                ReFoINameList = await this.createFormsService.listRecord(
                    ['id', 'title'],
                    { deleted: 0, id: In(ReFoIDSSArray) },
                    { id: 'ASC' },
                );
            }
            /* REIMBURSEMENTS REQUEST END*/
            /* BIOMETRIC REQUEST START */
            let BiometricRequestWhere = `${com_condition} AND birBiometricReports.email_status = 0 AND birBiometricReports.status = 1 AND birBiometricReports.request_source = 1`;
            let getTodayCompletedBiometricRequest = await this.biometricReportsService.commonQueryBuilder([
                'birBiometricReports',
                'automaticreportSetting.module_id',
                'automaticreportSetting.send_emails',
                'automaticreportSetting.email_subject',
                'automaticreportSetting.email_content',
            ],BiometricRequestWhere,{},[{
                join_table: 'birBiometricReports.automaticreportSetting',
                alias: 'automaticreportSetting',
                table: tableConstant.REPORT.TBL_AU_AUTO_REPORT_SETTINGS,
                on_condition: `automaticreportSetting.id = birBiometricReports.org_id`,
                join_type: 'inner_one',
            }],'getMany')
            getTodayCompaltedRequest = [
                ...getTodayCompaltedRequest,
                ...getTodayCompletedBiometricRequest,
            ];
            /* BIOMETRIC REQUEST END */
            let emailSendCount = 0;
            let emailNotSendCount = 0;
            let storePath = '',
                ReID = '',
                zipstorePath = '',
                zipname = '',
                tabalAlias = '',
                zipFilePath = '';
            let zipFileFinalPath = '';
            const reportMappings = {
                1: {
                    tabalAlias: 'Incentivereport',
                    zip: 'Incentive_report.zip',
                    folder: 'incentive_reports',
                    autoFolder: 'incentive',
                },
                2: {
                    tabalAlias: 'Incentivereport',
                    zip: 'Myplan_report.zip',
                    folder: 'myplan_reports',
                    autoFolder: 'myplan',
                },
                3: {
                    tabalAlias: 'Incentivereport',
                    zip: 'Challenge_report.zip',
                    folder: 'challenge_reports',
                    autoFolder: 'challenge',
                },
                4: {
                    tabalAlias: 'ReCovid19Report',
                    zip: 'Covid19_report.zip',
                    folder: 'covid19_reports',
                    autoFolder: 'covid19',
                },
                5: {
                    tabalAlias: 'ReQuicklinkReport',
                    zip: 'Quicklink_report.zip',
                    folder: 'quicklink_reports',
                    autoFolder: 'quicklink',
                },
                6: {
                    tabalAlias: 'ReFitnessvideoReport',
                    zip: 'Fitness_video_report.zip',
                    folder: 'fitnessvideo_reports',
                    autoFolder: 'fitnessvideo',
                },
                7: {
                    tabalAlias: 'ReBillboardReport',
                    zip: 'Billboard_report.zip',
                    folder: 'billboard_reports',
                    autoFolder: 'billboard',
                },
                8: {
                    tabalAlias: 'ReEventReport',
                    zip: 'Events_report.zip',
                    folder: 'events_reports',
                    autoFolder: 'events',
                },
                9: {
                    tabalAlias: 'ReHealthReport',
                    zip: 'Health_report.zip',
                    folder: 'health_reports',
                    autoFolder: 'health',
                },
                10: {
                    tabalAlias: 'ReActivityReport',
                    zip: 'Activity_report.zip',
                    folder: 'activity_reports',
                    autoFolder: 'activity',
                },
                11: {
                    tabalAlias: 'ReQuizReport',
                    zip: 'Quiz_report.zip',
                    folder: 'quiz_reports',
                    autoFolder: 'quiz',
                },
                12: {
                    tabalAlias: 'ReEmotionalwellbeingReport',
                    zip: 'Emotional_Well_Being_report.zip',
                    folder: 'emotional_well_being_reports',
                    autoFolder: 'emotional_well_being',
                },
                13: {
                    tabalAlias: 'ReSurveyReport',
                    zip: 'Survey_report.zip',
                    folder: 'survey_users_reports',
                    autoFolder: 'survey_users',
                },
                14: {
                    tabalAlias: 'ReEngagementcomparisonReport',
                    zip: 'Engagement_Comparison_report.zip',
                    folder: 'engagement_comparison_reports',
                    autoFolder: 'engagement_comparison',
                },
                15: {
                    tabalAlias: 'ReReimbursementsReport',
                    zip: 'Reimbursement_report.zip',
                    folder: 'reimbursement_reports',
                    autoFolder: 'reimbursement',
                },
                16: {
                    tabalAlias: 'birBiometricReports',
                    zip: 'Biometrics_report.zip',
                    folder: 'biometrics_reports',
                    autoFolder: 'biometrics',
                },
            };
            const reportTypes = {
                1: 'Incentive Report',
                2: 'My Plan Report',
                3: 'Challenge Report',
                4: 'Covid19 Report',
                5: 'Quicklink Report',
                6: 'Fitness Video Report',
                7: 'Billboards Report',
                8: 'Event Report',
                9: 'Health Report',
                10: 'Activity Report',
                11: 'Quiz Report',
                12: 'Emotional Well-Being Report',
                13: 'Survey Report',
                14: 'Engagement Comparison Report',
                15: 'Reimbursements Report',
                16: 'Biometrics Report',
            };
            const updateByReportType = async (
                reportType: number,
                data: any,
            ) => {
                let updateId = data?.id;
                switch (reportType) {
                    case 1:
                        return this.incentiveReportsService.update(
                            { id: updateId },
                            data,
                        );
                    case 2:
                        return this.incentiveReportsService.update(
                            { id: updateId },
                            data,
                        );
                    case 3:
                        return this.incentiveReportsService.update(
                            { id: updateId },
                            data,
                        );
                    case 4:
                        return this.covidReport.update(data);
                    case 5:
                        return this.quickLinkReportService.update(data);
                    case 6:
                        return this.mediaFitnessVideoReportService.update(data);
                    case 7:
                        return this.billboardReportService.update(data);
                    case 8:
                        return this.eventReportsService.update(
                            { id: updateId },
                            data,
                        );
                    case 9:
                        return this.healthReportService.create(data);
                        break;
                    case 10:
                        return this.activityReportService.update(data);
                    case 11:
                        return this.quizReportService.update(data);
                    case 12:
                        return this.wellbeingReportService.update(data);
                    case 13:
                        return this.surveyReportService.update(data);
                    case 14:
                        return this.engagementComparisonService.create(data);
                        break;
                    case 15:
                        return this.reimbursementReportService.update(data);
                    case 16:
                        // return this.incentiveReportsService.update(data);
                        break;
                    default:
                        return null;
                }
            };
            for (const item of getTodayCompaltedRequest) {
                let moduleId = item.automaticreportSetting.module_id;
                if (reportMappings[moduleId]) {
                    let { zip, folder } = reportMappings[moduleId];
                    ReID = item.id;
                    zipname = zip;
                    storePath = `automatic_report/${folder}/${ReID}`; //ReID
                    zipstorePath = `automatic_report/${folder}/${ReID}/${zipname}`;
                }
                let orgTimezone = 'UTC';
                if (item.request_timezone && item.request_timezone !== '') {
                    orgTimezone = item.request_timezone;
                }
                let infocurrentDateHM = this.commonDateService.DateTimeFormat(
                    'now',
                    'HH:mm',
                    undefined,
                    orgTimezone,
                );
                let mailSendApproval = 0;
                let inProgData = {};
                if (
                    item.request_timezone_time &&
                    item.request_timezone_time !== '' &&
                    infocurrentDateHM >= item.request_timezone_time
                ) {
                    inProgData['id'] = ReID;
                    inProgData['email_status'] = 2;
                    inProgData['updated_date'] =
                        this.commonDateService.DateTimeFormat(
                            'now',
                            'YYYY-MM-DD HH:mm:ss',
                        );
                    await updateByReportType(item.auto_report_type, inProgData);
                    zipFilePath = `${S3_URL}${storePath}/${zipname}`;
                    let checkFileOnBucket = await lastValueFrom(
                        this.commonMicroservice.send(
                            { cmd: 'check_file' },
                            { prefix: zipstorePath, userBucket: 'private' },
                        ),
                    );
                    if (zipstorePath.trim() !== '' && checkFileOnBucket) {
                        zipFileFinalPath = await lastValueFrom(
                            this.commonMicroservice.send(
                                { cmd: 'get_file' },
                                { path: zipstorePath, userBucket: 'private' },
                            ),
                        );
                        mailSendApproval = 1;
                    }
                    else if (
                        (
                            mailSendApproval == 0 &&
                            (!item.file_name || item.file_name == '') &&
                            item.error_message &&
                            item.error_message != '' &&
                            item.status == 1
                        )
                    ) {
                        mailSendApproval = 3;
                    } else if (
                        (
                            mailSendApproval == 0 &&
                            (!item.file_name || item.file_name == '') &&
                            item.error_message != '' &&
                            item.status == 1
                        ) ||
                        zipFileFinalPath == ''
                    ) {
                        mailSendApproval = 2;
                    }
                    
                }
                let attachemnt = [];
                if (zipFileFinalPath != '') {
                    const directory = `./public/upload/${storePath}`;
                    let filePath = path.join(directory, zipname);
                    let filePathh = path.join(`${directory}`);
                    let writeFile = await this.commonFileService.writeZipFile(
                        filePathh,
                        zipFileFinalPath['Body'],
                        zipname,
                    );
                    if (writeFile?.status == 'success') {
                        attachemnt.push({
                            filename: zipname,
                            path: path.resolve(filePath),
                        });
                    }
                }
                if (mailSendApproval == 1 || mailSendApproval == 2 || mailSendApproval == 3) {
                    const autoReportType = item?.auto_report_type;
                    Templatetext['report_type'] =
                        reportTypes[autoReportType] || 'Unknown Report';
                    if (item?.org_id in allOrgCompanyData) {
                        Templatetext['company'] =
                            allOrgCompanyData[item.org_id];
                    }
                    const reportTypeMappings = {
                        1: {
                            list: campaignNamelist,
                            defaultText: 'All Campaigns',
                        },
                        2: { 
                            list: plansNameList, 
                            defaultText: 'All Plans' 
                        },
                        3: {
                            list: ChallengeNameList,
                            defaultText: 'All Challenge',
                        },
                        5: {
                            list: quicklinkNameList,
                            defaultText: 'All Documents',
                        },
                        6: {
                            list: fitnessVideoNameList,
                            defaultText: 'All Videos',
                        },
                        8: { 
                            list: eventList, 
                            defaultText: 'All Events' 
                        },
                        11: {
                            list: quizVideoNameList,
                            defaultText: 'All Quiz',
                        },
                        14: { 
                            list: ECCamNameList, 
                            defaultText: 'All Quiz' 
                        },
                        15: { 
                            list: ReFoINameList, 
                            defaultText: 'All Forms' 
                        },
                    };
                    const excludedReportTypes = [4, 7, 9, 10, 12, 13];
                    const reportType = item?.auto_report_type;
                    if (reportTypeMappings[reportType]) {
                        const { list, defaultText } =
                            reportTypeMappings[reportType];
                        const itemExplode =
                            item?.camp_id && item.camp_id != 0
                                ? item.camp_id.split(',')
                                : [];
                        Templatetext['report_items_name'] = itemExplode.length
                            ? list
                                  .filter(item=>
                                      itemExplode.includes(String(item.id)),
                                  )
                                  .map(item => item.campaign_name || item.title || item.name || '')
                                  .join(' , ')
                            : defaultText;
                    } else if (excludedReportTypes.includes(reportType)) {
                        Templatetext['report_items_name'] = '';
                    }
                    let content = '';
                    if (mailSendApproval === 1) {
                        content = item.automaticreportSetting.email_content;
                    } 
                    else if (mailSendApproval === 2) {
                        if (zipFileFinalPath == '') {
                            content = 'Report file is not available.';
                        } else {
                            content = item.error_message;
                        }
                    }
                    else if (mailSendApproval === 3) {
                        content = `No data available for specific report settings.`;
                    }
                    if (
                        content !== '' ||
                        content !== null ||
                        content !== undefined
                    ) {
                        content =
                            (await this.cronCommonService.onmapUrlContent(
                                content,
                                'mailTemplate',
                            )) || content;
                    }
                    let ToEmails = item.email.replace(/\s/g, '');
                    let tomail = ToEmails.split(',').filter(
                        (email) => email !== '',
                    );
                    let CCEmails = item.send_cc_emails.replace(/\s/g, '');
                    let ccmail = CCEmails ? CCEmails.split(',') : [];
                    let subject = item.automaticreportSetting.email_subject;
                    if (Array.isArray(tomail) && tomail.length === 0) {
                        if (allOrgEmailDatas.hasOwnProperty(item.org_id)) {
                            tomail.push(allOrgEmailDatas[item.org_id]);
                        }
                    }
                    let finalemail = [];
                    let ccmailtmp = [];
                    const SendMailDefaultArray = [
                        "satish.s@zomohealth.com", "sumeet.s@zomohealth.com", 
                        "chirag.s@zomohealth.com", "nikhil.j@zomohealth.com", "dhruvit.g@zomohealth.com", 'smit.p@zomohealth.com', 
                        "ishwar.p@zomohealth.com", "parth.s@zomohealth.com", "shruti.s@zomohealth.com", "abhay.l@zomohealth.com",
                        "sahil.s@zomohealth.com", "atul.p@zomohealth.com", "yogendra.s@zomohealth.com", "alpesh.j@zomohealth.com",
                        
                    ];
                    // i want to saperate out mail for testing purpose which include SendMailDefaultArray emails only
                    // "chirag.s@zomohealth.com", "nikhil.j@zomohealth.com", "dhruvit.g@zomohealth.com",
                    finalemail = [...tomail,  'smit.p@zomohealth.com'];
                    ccmailtmp = [...ccmail];
                    // finalemail = [...SendMailDefaultArray];
                    // ccmailtmp = [...SendMailDefaultArray];
                    finalemail = finalemail.filter(email => SendMailDefaultArray.includes(email));
                    ccmailtmp = ccmailtmp.filter(email => SendMailDefaultArray.includes(email));
                    if (Array.isArray(finalemail) && finalemail.length === 0) {
                        if (allOrgEmailDatas.hasOwnProperty(item.org_id)) {
                            finalemail.push(allOrgEmailDatas[item.org_id]);
                        }
                    }
                    Templatetext['cc'] = ccmailtmp.join(',');
                    Templatetext['full_name'] =
                        allOrgUserDataMembershipCode[item.membership_code]?.full_name || '';
                    Templatetext['first_name'] =
                        allOrgUserDataMembershipCode[item.membership_code]?.first_name || '';
                    Templatetext['company_name'] =
                        allOrgCompanyData[item.org_id]?.company_name || '';
                    Templatetext['company_logo'] = allOrgCompanyData[
                        item.org_id
                    ].company_logo
                        ? `<img src=${S3_URL}companylogos/${item.org_id}/${allOrgCompanyData[item.org_id].company_logo} alt="Company Logo" style="width: 200px; height: 100px;">`
                        : '';
                    Templatetext['type'] = 88; // report mail
                    let emaildata = {
                        sender: ``,
                        receiver: finalemail.join(','),
                        subject: subject,
                        content: Templatetext,
                        template: content,
                        attachment: attachemnt,
                    };
                    let send = await lastValueFrom(
                        this.commonMicroservice.send(
                            { cmd: 'send_email' },
                            emaildata,
                        ),
                    );
                    if (send) {
                        let inProgDataC = {
                            id: ReID,
                            email_status: 1,
                            updated_date: this.commonDateService.DateTimeFormat(
                                'now',
                                'YYYY-MM-DD HH:mm:ss',
                            ),
                        };
                        await updateByReportType(
                            item.auto_report_type,
                            inProgDataC,
                        );
                        emailSendCount += 1;
                    } else {
                        let inProgDataC = {
                            id: ReID,
                            email_status: 0,
                            updated_date: this.commonDateService.DateTimeFormat(
                                'now',
                                'YYYY-MM-DD HH:mm:ss',
                            ),
                        };
                        await updateByReportType(
                            item.auto_report_type,
                            inProgDataC,
                        );
                        emailNotSendCount += 1;
                    }
                } else {
                    let inProgDataC = {
                        id: ReID,
                        email_status: 0,
                        updated_date: this.commonDateService.DateTimeFormat(
                            'now',
                            'YYYY-MM-DD HH:mm:ss',
                        ),
                    };
                    await updateByReportType(
                        item.auto_report_type,
                        inProgDataC,
                    );
                    emailNotSendCount += 1;
                }
            }
            console.log(emailSendCount,'report mail send successfully');
            console.log(emailNotSendCount,'report mail not send');
            return 'Success';
        } catch (error) {
            console.log('error:', error);
            return {
                success: 0,
                message: error.message,
                error: 1,
            };
        }
    }
}

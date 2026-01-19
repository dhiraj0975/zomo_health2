import { cronServiceTableConstant } from '@common-constants';
import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Cron, CronExpression, SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { lastValueFrom } from 'rxjs';
import { AutoReportSettingService } from '../autosetting/autoReportSettings.service';
import { CustomPointUploadService } from '../campaign/custompoint/custom-point-upload.service';
import { DepartmentCronService } from '../census/departments/departmentCron.service';
import { LocationCronService } from '../census/locations/locationCron.service';
import { SkipCronService } from '../census/skip/skipCron.service';
import { SystemCronService } from '../census/system/systemCron.service';
import { TerminateCronService } from '../census/terminate/terminateCron.service';
import { UploadCronService } from '../census/upload/uploadCron.service';
import { ChallengeReportService } from '../challenge/challengeReport/challengeReport.service';
import { MilesCustomPointUploadService } from '../challenge/healthrequest/miles-custom-point/miles-point-upload.service';
import { WeightCustomPointUploadService } from "../challenge/weight-request/weight-custom-point/weight-point-upload.service";
import { BillboardReportService } from "../company/billboard-report/billboard-report.service";
import { CompanyService } from '../company/company.service';
import { MassCommunicationService } from '../company/masscomunication.service';
import { CovidReportService } from '../covidReport/covidReport.service';
import { WellbeingReportService } from '../emotional-well-being';
import { EventReportHelper, RequestEventReportsService } from '../events';
import { FitnessVideoClickService } from '../fitness/fitnessvideoclick.service';
import { AssessmentService } from '../healthassessment/assessments.service';
import { BiometricsService, TobaccoUsesService } from '../healthcheckup';
import { AggregateReportService } from '../healthcheckup/aggregatereport/aggregatereport.service';
import { BiometricHealthRequestAddService } from "../healthcheckup/biometric-health-request";
import { DownloadFormsService } from '../healthcheckup/downloadforms.service';
import { EngagementService } from '../healthcheckup/engagement/engagement.service';
import { FormInstructionsService } from '../healthcheckup/forminstructions.service';
import { HealthReportService } from "../healthcheckup/health-report/health-report.service";
import { HippaReportService } from '../healthcheckup/hippareport/hippareport.service';
import { QuickLinkService } from '../quicklink/quicklink.service';
import { QuizQuizzesService } from '../quiz';
import { ReimbursementService } from '../reimbursement/reimbusement.service';
import { EngagementComparisonReportService } from "../reports";
import { BiometricResultReportService } from "../reports/biometric-result-report/biometric-result-report.service";
import { EhaDetailReportService } from "../reports/eha-detail-report/eha-detail-report.service";
import { HraDetailReportService } from "../reports/hra-detail-report/hra-detail-report.service";
import { SurveyQuestionsService } from '../survey/surveyquestion.service';
import { ActivityFeedService } from '../tracker/activityfeeds.service';
import { QuickLinkReportService } from '../quicklink/quicklinkreport.service';
import { MediaFitnessVideoReportService } from '../fitness/mediafitnessvideoreport.service';
import { ActivityReportService } from '../tracker/activityreport.service';
import { ReimbursementReportService } from '../reimbursement/reimbusementreport.service';
import { IncentiveReportsService } from '../incentivereports/incentivereports.service';
import { QuizReportService } from '../quiz/quiz-report/quizreport.service';
import { BiometricReportsService } from '../biometric';
import { EngagementComparisonService } from '../campaign';
import { SurveyReportService } from '../survey/surveyreport.service';
const moment = require('moment');

@Injectable()
export class CronService {
    private cronData: Record<string, any> = {};
    private isAutoReportGenerateRunning = false;
    private autoReportGenerateStartTime: moment.Moment | null = null;
    constructor(
        private schedulerRegistry: SchedulerRegistry,
        private readonly departmentCronService: DepartmentCronService,
        private readonly locationCronService: LocationCronService,
        private readonly downloadFormsService: DownloadFormsService,
        private readonly systemCronService: SystemCronService,
        private readonly skipCronService: SkipCronService,
        private readonly uploadCronService: UploadCronService,
        private readonly quickLinkService: QuickLinkService,
        private readonly fitnessVideoClickService: FitnessVideoClickService,
        private readonly wellbeingReportService: WellbeingReportService,
        private readonly surveyQuestionsService: SurveyQuestionsService,
        private readonly activityFeedService: ActivityFeedService,
        private readonly reimbursementService: ReimbursementService,
        private readonly formInstructionsService: FormInstructionsService,
        private readonly assessmentService: AssessmentService,
        private readonly terminateCronService: TerminateCronService,
        private readonly customPointUploadService: CustomPointUploadService,
        private readonly milesCustomPointUploadService: MilesCustomPointUploadService,
        private readonly weightCustomPointUploadService: WeightCustomPointUploadService,
        private readonly massCommunicationService: MassCommunicationService,
        private readonly challengeReportService: ChallengeReportService,
        private readonly covidReportService: CovidReportService,
        private readonly companyService: CompanyService,
        @Inject('COMMON_SERVICE')
        private readonly commonMicroservice: ClientProxy,
        private readonly eventReportHelper: EventReportHelper,
        private readonly quizQuizzesService: QuizQuizzesService,
        private readonly tobaccoUsesService: TobaccoUsesService,
        private readonly biometricResultReportService: BiometricResultReportService,
        private readonly hippaReportService: HippaReportService,
        private readonly ehaDetailReportService: EhaDetailReportService,
        private readonly hraDetailReportService: HraDetailReportService,
        private readonly engagementComparisonReportService: EngagementComparisonReportService,
        private readonly biometricsService: BiometricsService,
        private readonly engagementService: EngagementService,
        private readonly billboardReportService: BillboardReportService,
        private readonly healthReportService: HealthReportService,
        private readonly aggregateReportService: AggregateReportService,
        private readonly biometricHealthRequestAddService: BiometricHealthRequestAddService,
        private readonly autoReportSettingService: AutoReportSettingService,
        private readonly quickLinkReportService: QuickLinkReportService,
        private readonly mediaFitnessVideoReportService: MediaFitnessVideoReportService,
        private readonly surveyReportService: SurveyReportService,
        private readonly activityReportService: ActivityReportService,
        private readonly reimbursementReportService: ReimbursementReportService,
        private readonly requestEventReportsService: RequestEventReportsService,
        private readonly incentiveReportsService: IncentiveReportsService,
        private readonly quizReportService: QuizReportService,
        private readonly biometricReportsService: BiometricReportsService,
        private readonly engagementComparisonService: EngagementComparisonService,


    ) {}
    // @Cron('0 */3 * * * *', { name: 'departmentCron' })
    // async departmentCron() {
    //     try {
    //         const job = this.schedulerRegistry.getCronJob(
    //             `CronService.departmentCron`,
    //         );
    //         if (!job) {
    //             const data = this.cronData['departmentCron'];
    //             await this.departmentCronService.importUserProcessDepartment(
    //                 data,
    //             );
    //         }
    //         return;
    //     } catch (error) {
    //         const data = this.cronData['departmentCron'];
    //         console.log('departmentCron started', data, Date.now());
    //         await this.departmentCronService.importUserProcessDepartment(data);
    //     }
    // }
    // @Cron('0 */4 * * * *', { name: 'locationCron' })
    // async locationCron() {
    //     try {
    //         const job = this.schedulerRegistry.getCronJob(
    //             `CronService.locationCron`,
    //         );
    //         if (!job) {
    //             const data = this.cronData['locationCron'];
    //             console.log('locationCron started', data, Date.now());
    //             await this.locationCronService.importUserProcessLocation(data);
    //         }
    //     } catch (error) {
    //         const data = this.cronData['locationCron'];
    //         console.log('locationCron started', data, Date.now());
    //         await this.locationCronService.importUserProcessLocation(data);
    //     }
    // }
    // @Cron('0 */7 * * * *', { name: 'systemCron' })
    // async systemCron() {
    //     const data = this.cronData['systemCron'];
    //     console.log('systemCron started', data, Date.now());
    //     // Your cron job logic here, accessing data
    // }
    // @Cron(CronExpression.EVERY_10_MINUTES, { name: 'uploadCron' })
    // async uploadCron() {
    //     const data = this.cronData['uploadCron'];
    //     console.log('uploadCron started', data);
    //     // Your cron job logic here, accessing data
    // }
    // @Cron(CronExpression.EVERY_30_MINUTES, { name: 'downloadProgramFormCron' })


    @Cron(CronExpression.EVERY_5_MINUTES, { name: 'uploadCustomPoint' })
    async uploadCustomPointCron() {
        if(!process.env.DB_HOST_PROD_MAIN.includes('localhost')){
        const data = await this.customPointUploadService.uploadCustomPoint({});
        }
    }

    /*
    @Cron(CronExpression.EVERY_5_MINUTES, { name: 'autoReport' })
    async autoReportCron() {
        const data = await this.autoReportSettingService.cron_report_request_set();
        const data1 = await this.generateAllReportsCron();
        const data2 = await this.autoReportSettingService.cronAutoReportEmail();
    }
    */

    // @Cron(CronExpression.EVERY_5_MINUTES, { name: 'autoReport' })
    // async autoReportCron() {
    //     const data = await this.autoReportSettingService.cron_report_request_set();
    //     const data1 = await this.generateAllReportsCronNew();
    //     const data2 = await this.autoReportSettingService.cronAutoReportEmail();
    // }
    @Cron(CronExpression.EVERY_MINUTE, { name: 'autoReportRequestSet' })
    async autoReportRequestSetCron() {
        if (!process.env.DB_HOST_PROD_MAIN.includes('localhost')) {
            if (process.env.DOMAIN === 'dev.zomohealth.com') {
                const startTime = moment();
                try {
                    console.log(`[CRON] Starting Auto-Report-Request-Set...`);
                    const data = await this.autoReportSettingService.cron_report_request_set();
                    const duration = moment().diff(startTime, 'milliseconds');
                    console.log(`[CRON] Auto-Report-Request-Set completed in ${duration}ms`);
                    return data;
                } catch (error) {
                    const duration = moment().diff(startTime, 'milliseconds');
                    console.log(`[CRON] Auto-Report-Request-Set failed after ${duration}ms:`, error.message);
                }
            }
        }
    }
    @Cron(CronExpression.EVERY_5_MINUTES, { name: 'autoReportGenerate' })
    async autoReportGenerateCron() {
        if (!process.env.DB_HOST_PROD_MAIN.includes('localhost')) {
            if (process.env.DOMAIN === 'dev.zomohealth.com') {
                if (this.isAutoReportGenerateRunning) {
                    const runningDuration = this.autoReportGenerateStartTime
                        ? moment().diff(this.autoReportGenerateStartTime, 'minutes')
                        : 0;
                    console.log(
                        `[CRON] autoReportGenerate is already running for ${runningDuration} minutes. ` +
                        `Skipping this execution to prevent overlap.`
                    );
                    return {
                        skipped: true,
                        reason: 'Previous execution still running',
                        runningDuration: `${runningDuration} minutes`
                    };
                }
                this.isAutoReportGenerateRunning = true;
                this.autoReportGenerateStartTime = moment();
                try {
                    console.log(`[CRON] Starting Auto-Report-Generate...`);
                    const data = await this.generateAllReportsCron();
                    const duration = moment().diff(this.autoReportGenerateStartTime, 'milliseconds');
                    const durationMinutes = moment().diff(this.autoReportGenerateStartTime, 'minutes', true).toFixed(2);
                    console.log(
                        `[CRON] Auto-Report-Generate completed in ${duration}ms (${durationMinutes} minutes)`,
                        {
                            total: data?.['total'] || 0,
                            successful: data?.['successful'] || 0,
                            failed: data?.['failed'] || 0
                        }
                    );
                    return data;
                } catch (error) {
                    const duration = moment().diff(this.autoReportGenerateStartTime, 'milliseconds');
                    console.log(`[CRON] Auto-Report-Generate failed after ${duration}ms:`, error.message);
                    this.isAutoReportGenerateRunning = false;
                    this.autoReportGenerateStartTime = null;
                } finally {
                    console.log('[CRON] Releasing Lock of Auto-Report-Generate.');
                    this.isAutoReportGenerateRunning = false;
                    this.autoReportGenerateStartTime = null;
                }
            }
        }
    }
    @Cron('0 */3 * * * *', { name: 'autoReportEmail' })
    async autoReportEmailCron() {
        if (!process.env.DB_HOST_PROD_MAIN.includes('localhost')) {
            if (process.env.DOMAIN === 'dev.zomohealth.com') {
                const startTime = moment();
                try {
                    console.log(`[CRON] Starting Auto-Report-Email...`);
                    const data = await this.autoReportSettingService.cronAutoReportEmail();
                    const duration = moment().diff(startTime, 'milliseconds');
                    console.log(`[CRON] Auto-Report-Email completed in ${duration}ms`);
                    return data;
                } catch (error) {
                    const duration = moment().diff(startTime, 'milliseconds');
                    console.log(`[CRON] Auto-Report-Email failed after ${duration}ms:`, error.message);
                }
            }
        }
    }

    @Cron(CronExpression.EVERY_5_MINUTES, { name: 'milesUploadCustomPoint' })
    async milesUploadCustomPointCron() {
        if(!process.env.DB_HOST_PROD_MAIN.includes('localhost')){
        const data = await this.milesCustomPointUploadService.milesUploadCustomPoint({});
        }
    }

    @Cron(CronExpression.EVERY_5_MINUTES, { name: 'weightUploadCustomPoint' })
    async weightUploadCustomPointCron() {
        if(!process.env.DB_HOST_PROD_MAIN.includes('localhost')){
        const data = await this.weightCustomPointUploadService.weightCustomUploadPoint({});
        }
    }

    @Cron(CronExpression.EVERY_5_MINUTES, { name: 'biometricHealthRequest' })
    async biometricHealthRequestCron() {
        if(!process.env.DB_HOST_PROD_MAIN.includes('localhost')){
        const data = await this.biometricHealthRequestAddService.biometricHealthRequestAdd({});
        }
    }

    async downloadProgramFormCron() {
        try {
            const data = this.cronData['downloadProgramFormCron'];
            return await this.downloadFormsService.download_form_process();
        } catch (error) {
            console.log('error => ', error);
        }
        // Your cron job logic here, accessing data
    }
    async pdfFormDownload(data: any) {
        try {
            if (data.name == 'Physician') {
                return await this.downloadFormsService.getGeneratepdf(
                    data.company,
                    data.user,
                    data.authorization,
                    data.forminstruction,
                    data.status,
                    data.foldername,
                    data.signup,
                    data?.filefilter,
                    data?.stdt,
                    data?.endt,
                );
            }
            if (data.name == 'Dentist') {
                return await this.downloadFormsService.getGeneratepdf_dvf(
                    data.company,
                    data.user,
                    data.authorizationdvf,
                    data.forminstruction,
                    data.status,
                    data.foldername,
                    data?.filefilter,
                    data?.stdt,
                    data?.endt,
                );
            }
            if (data.name == 'Optometrist') {
                return await this.downloadFormsService.getGeneratepdf_ovf(
                    data.company,
                    data.user,
                    data.authorizationovf,
                    data.forminstruction,
                    data.status,
                    data.foldername,
                    data?.filefilter,
                    data?.stdt,
                    data?.endt,
                );
            }
            if (data.name == 'Tobacco') {
                return await this.downloadFormsService.getGeneratepdf_ta(
                    data.company,
                    data.user,
                    data.authorizationta,
                    data.forminstruction,
                    data.status,
                    data.foldername,
                    data?.filefilter,
                    data?.stdt,
                    data?.endt,
                );
            }
        } catch (error) {
            console.log('error => ', error);
            return { success: 0, error: 1, message: error.message };
        }
    }
    private startCron(jobName: string, data: any) {
        let job;
        let jobTitle = `CronService.${jobName}${data?.time ? new Date(data.time).getTime() + 1 : ''}`;
        try {
            job = this.schedulerRegistry.getCronJob(jobTitle);
            if (job) {
                job.start();
                return;
            }
        } catch (error) {
            let time: string | Date = CronExpression.EVERY_10_MINUTES;
            if (data?.time) {
                time = new Date(data?.time);
            }
            const cronMethod = this[jobName];
            if (typeof cronMethod !== 'function' && !data?.time) {
                console.error(`Cron method "${jobName}" does not exist`);
                return;
            }
            job = new CronJob(time, async () => {
                try {
                    await cronMethod.call(this, data);
                    // Auto-stop and remove the job
                    job.stop();
                    this.schedulerRegistry.deleteCronJob(jobTitle);
                    console.log(`Cron job "${jobName}" executed and removed.`);
                } catch (err) {
                    console.error(`Error running ${jobName} job:`, err);
                }
            });
            this.schedulerRegistry.addCronJob(jobTitle, job);
        }
        job.start();
        return;
    }
    async importUserProcess(data: any) {
        try {
            switch (data.name) {
                case 'import-user-process-skip':
                    return await this.skipCronService.importUserProcessSkip(
                        data,
                    );
                    break;
                case 'import-user-process-department':
                    return await this.departmentCronService.importUserProcessDepartment(
                        data,
                    );
                    break;
                case 'import-user-process-location':
                    return await this.locationCronService.importUserProcessLocation(
                        data,
                    );
                    break;
                case 'import-user-process-system':
                    return await this.systemCronService.importUserProcessSystem(
                        data,
                    );
                    break;
                case 'import-user-process-upload':
                    return await this.uploadCronService.importUserProcessUpload(
                        data,
                    );
                    break;
                case 'terminate-user-process':
                    return await this.terminateCronService.terminateUserProcess(
                        data,
                    );
                    break;
                default:
                    return `Cron job ${data.name} not found`;
            }
        } catch (error) {
            return error;
        }
    }
    public triggerManualStart(data: any) {
        try {
            const runningJobs = this.schedulerRegistry.getCronJobs();
            for (const [, runningJob] of Object.entries(runningJobs)) {
                if (runningJob.running) {
                    return `Another cron job is already running.`;
                }
            }
            let jobName = '';
            switch (data.name) {
                case 'import-user-process-skip':
                    jobName = 'skipCron';
                    break;
                case 'import-user-process-department':
                    jobName = 'departmentCron';
                    break;
                case 'import-user-process-location':
                    jobName = 'locationCron';
                    break;
                case 'import-user-process-sys':
                    jobName = 'systemCron';
                    break;
                case 'import-user-process-upload':
                    jobName = 'uploadCron';
                    break;
                case 'terminate-user-process':
                    jobName = 'terminateCron';
                    break;
                case 'download-form-process':
                    jobName = 'downloadProgramFormCron';
                    break;
                case 'forms_file_create':
                    jobName = 'send_forms_file_create';
                    break;
                case 'forms-email-send':
                    jobName = 'send_forms_email_send';
                    break;
                case 'reset-hra-generate':
                    jobName = 'reset_hra_generate';
                    break;
                case 'schedule-email':
                    jobName = `schedule_email`;
                    break;
                default:
                    return `Cron job ${data.name} not found`;
            }
            this.cronData[jobName] = data;
            this.startCron(jobName, data);
            return `cron job added successfully`;
        } catch (error) {
            throw new Error(error.message);
        }
    }
    async uploadCustomPoint(data: any) {
        return await this.customPointUploadService.uploadCustomPoint(data);
    }
    async milesUploadCustomPoint(data: any) {
        return await this.milesCustomPointUploadService.milesUploadCustomPoint(
            data,
        );
    }
    async weightUploadCustomPoint(data: any) {
        return await this.weightCustomPointUploadService.weightCustomUploadPoint(data);
    }
    async biometricHealthRequestAdd(data: any) {
        return await this.biometricHealthRequestAddService.biometricHealthRequestAdd(data);
    }
    async createReport(data: any) {
        try {
            const result = await this.getService(
                data.table_name,
                data?.data?.type || '',
                data.data,
            );
            return result ?? true;
        } catch (error) {
            throw new Error(
                `Service not found for tablename: ${data.table_name}`,
            );
        }
    }
    async generateAllReportsCron() {
        try {
            const tables = cronServiceTableConstant.AUTOREPORTTABLES;
            const payload = { auto_request: 1 };
            const reportPromises = [];
            const fetchPromises = Object.keys(tables).map(async (key) => {
                const reportType = tables[key];
                let moduleId = Object.keys(cronServiceTableConstant.REPORTFROMMODULEIDS).find(
                    (key) => cronServiceTableConstant.REPORTFROMMODULEIDS[key] === reportType,
                );
                let module = moduleId ? parseInt(moduleId) : 0;
                let allAutomaticRequest = await this.autoReportSettingService.listRecord(
                    { status: 1, module_id: module },
                    { id: 'ASC' }
                );
                if (allAutomaticRequest.length === 0) {
                    return { reportType, records: [] };
                }
                let records = [];
                switch (reportType) {
                    case 'covid_report':
                        records = await this.covidReportService.listRecord({ status: 0 }, { id: 'ASC' });
                        break;
                    case 'quicklink_report':
                        records = await this.quickLinkReportService.listRecord({ status: 0 }, { id: 'ASC' });
                        break;
                    case 'fod_report':
                        records = await this.mediaFitnessVideoReportService.listRecord({ status: 0 }, { id: 'ASC' });
                        break;
                    case 'ewb_report':
                        records = await this.wellbeingReportService.listRecord({ status: 0 }, { id: 'ASC' });
                        break;
                    case 'survey_report':
                        records = await this.surveyReportService.listRecord({ status: 0 }, { id: 'ASC' });
                        break;
                    case 'activity_report':
                        records = await this.activityReportService.listRecord({ status: 0 }, { id: 'ASC' });
                        break;
                    case 'reimbursements_report':
                        records = await this.reimbursementReportService.listRecord({ status: 0 }, { id: 'ASC' });
                        break;
                    case 'event_report':
                        records = await this.requestEventReportsService.listRecord({ status: 0 }, { id: 'ASC' });
                        break;
                    case 'in_ch_plan_reports':
                        records = await this.incentiveReportsService.listRecord({ status: 0, report_type: 'Challenge' }, { id: 'ASC' });
                        break;
                    case 'quiz_report':
                        records = await this.quizReportService.listRecord({ status: 0 }, { id: 'ASC' });
                        break;
                    case 'health_checkup_report':
                        records = await this.healthReportService.listRecord({ status: 0 }, { id: 'ASC' });
                        break;
                    case 'biometric_result_report':
                        records = await this.biometricReportsService.listRecord({ status: 0 }, { id: 'ASC' });
                        break;
                    case 'engagement_comparison_report':
                        records = await this.engagementComparisonService.listRecord({ status: 0 }, { id: 'ASC' });
                        break;
                    case 'billboard_report':
                        records = await this.billboardReportService.listRecord({ status: 0 }, { id: 'ASC' });
                        break;
                    default:
                        records = [];
                }
                return { reportType, records };
            });
            const allReportLists = await Promise.all(fetchPromises);
            // Now generate all reports without awaiting
            for (const { reportType, records } of allReportLists) {
                if (records.length === 0) continue;
                for (const record of records) {
                    const reportPayload = { ...payload, auto_request_id: record.id };
                    let reportPromise = null;
                    switch (reportType) {
                        case 'covid_report':
                            reportPromise = this.covidReportService.covid19Report(reportPayload);
                            break;
                        case 'quicklink_report':
                            reportPromise = this.quickLinkService.quicklinkReport(reportPayload);
                            break;
                        case 'fod_report':
                            reportPromise = this.fitnessVideoClickService.fitnessFodReport(reportPayload);
                            break;
                        case 'ewb_report':
                            reportPromise = this.wellbeingReportService.ewbReport(reportPayload);
                            break;
                        case 'survey_report':
                            reportPromise = this.surveyQuestionsService.surveyReport(reportPayload);
                            break;
                        case 'activity_report':
                            reportPromise = this.activityFeedService.activityReport(reportPayload);
                            break;
                        case 'reimbursements_report':
                            reportPromise = this.reimbursementService.reimbursementsReport(reportPayload);
                            break;
                        case 'event_report':
                            reportPromise = this.eventReportHelper.eventReportGenerate(reportPayload, { auto_request: 1 });
                            break;
                        case 'in_ch_plan_reports':
                            reportPromise = this.challengeReportService.challengeReport(reportPayload);
                            break;
                        case 'quiz_report':
                            reportPromise = this.quizQuizzesService.quizReport(reportPayload);
                            break;
                        case 'health_checkup_report':
                            reportPromise = this.healthReportService.healthReport(reportPayload);
                            break;
                        case 'biometric_result_report':
                            reportPromise = this.biometricResultReportService.biometricResultReport(reportPayload);
                            break;
                        case 'engagement_comparison_report':
                            reportPromise = this.engagementComparisonReportService.engagementComparisonReport(reportPayload);
                            break;
                        case 'billboard_report':
                            reportPromise = this.billboardReportService.billboardReport(reportPayload);
                            break;
                    }
                    if (reportPromise) {
                        reportPromises.push(reportPromise);
                    }
                }
            }
            // Wait for all reports to complete
            const results = await Promise.allSettled(reportPromises);
            let successful = 0;
            let failed = 0;
            results.forEach((result) => {
                if (result.status === 'fulfilled') {
                    if (typeof result.value === 'object' && result.value !== null) {
                        if (result.value.error === 1 && result.value.message) {
                            failed++;
                        } else {
                            successful++;
                        }
                    } else {
                        successful++;
                    }
                } else {
                    failed++;
                }
            });
            console.log(`Report generation completed: ${successful} successful, ${failed} failed`);
            return {
                total: results.length,
                successful,
                failed,
                results: results.map((result, index) => ({
                    index,
                    status: result.status,
                    message: result.status === 'fulfilled' ? result.value?.message || 'Success' : undefined,
                    error: result.status === 'rejected' ? result.reason?.message : undefined
                }))
            };
        } catch (error) {
            console.error('Report generation failed:', error);
            return `Report generation failed: ${error.message}`;
        }
    }
    async getService(
        tableName: string,
        type: string,
        payload: any,
    ): Promise<any | undefined> {
        try {
            switch (cronServiceTableConstant.TABLES[tableName]) {
                case 'covid_report':
                    return this.covidReportService.covid19Report(payload);
                case 'quicklink_report':
                    return this.quickLinkService.quicklinkReport(payload);
                case 'fod_report':
                    return this.fitnessVideoClickService.fitnessFodReport(payload);
                case 'ewb_report':
                    return this.wellbeingReportService.ewbReport(payload);
                case 'survey_report':
                    return this.surveyQuestionsService.surveyReport(payload);
                case 'activity_report':
                    return this.activityFeedService.activityReport(payload);
                case 'reimbursements_report':
                    return this.reimbursementService.reimbursementsReport(payload);
                case 'event_report':
                    let user = payload?.user;
                    delete payload?.user;
                    return this.eventReportHelper.eventReportGenerate(
                        payload,
                        user,
                    );
                case 'in_ch_plan_reports':
                    if (type === 'challenge') {
                        return this.challengeReportService.challengeReport(payload);
                    }
                    return undefined;
                case 'quiz_report':
                    return this.quizQuizzesService.quizReport(payload);
                case 'health_checkup_report':
                    if (type === 'tobacco') {
                        return this.tobaccoUsesService.tobaccoReport(payload);
                    }
                    if (type === 'phy_tobacco') {
                        return this.tobaccoUsesService.tobaccoReport(payload);
                    }
                    if (type === 'hippa') {
                        return this.hippaReportService.hippaReport(payload);
                    }
                    if (type === 'questionnaire') {
                        return this.formInstructionsService.generateQuestionnaireReport(payload);
                    }
                    if (type === 'participation') {
                        return this.hippaReportService.participationReport(payload);
                    }
                    if (type === 'individual') {
                        return this.hippaReportService.individualReport(payload);
                    }
                    if (type === 'agegender') {
                        return this.biometricsService.agegenderReport(payload);
                    }
                    if (type === 'engagement') {
                        return this.engagementService.engagementReport(payload);
                    }
                    if (type === 'health_report') {
                        return this.healthReportService.healthReport(payload);
                    }
                    if (type === 'aggregate') {
                        return this.aggregateReportService.aggregateReport(payload);
                    }
                    return undefined;
                    break;
                case 'biometric_result_report':
                    return await this.biometricResultReportService.biometricResultReport(payload);
                    break;
                case 'eha_detail_report':
                    return await this.ehaDetailReportService.ehaDetailReport(payload);
                    break;
                case 'hra_detail_report':
                    return await this.hraDetailReportService.hraDetailReport(payload);
                    break;
                case 'engagement_comparison_report':
                    return await this.engagementComparisonReportService.engagementComparisonReport(payload);
                    break;
                case 'billboard_report':
                    return await this.billboardReportService.billboardReport(payload);
                    break;
                default:
                    return undefined;
            }
        } catch (error) {
            console.error(
                `Error fetching service for tableName ${tableName}: ${error.message}`,
            );
            return undefined;
        }
    }
    async send_forms_email(data: any) {
        try {
            return await this.formInstructionsService.sendEmail(
                data.userId,
                data.program_selection,
                data.companyId,
                data.department_id,
                data.Templatetext,
                data.type,
            );
        } catch (error) {
            return error;
        }
    }
    async send_forms_file_create() {
        try {
            return await this.formInstructionsService.send_forms_file_create();
        } catch (error) {
            return error;
        }
    }
    async send_forms_email_send() {
        try {
            return await this.formInstructionsService.send_forms_email_send();
        } catch (error) {
            return error;
        }
    }
    async reset_hra_generate() {
        try {
            return await this.assessmentService.resetHraGenerate();
        } catch (error) {
            return error;
        }
    }
    async mass_communication_mail_request() {
        try {
            return await this.massCommunicationService.massCommunicationMailRequest();
        } catch (error) {
            return error;
        }
    }
    async schedule_email(data: any) {
        try {
            return await lastValueFrom(
                this.commonMicroservice.send({ cmd: 'send_email' }, data),
            );
        } catch (error) {
            return error;
        }
    }
}

import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { CronService, tableConstant } from './module';
import { AutoReportSettingService } from './module/autosetting/autoReportSettings.service';
import { MyPlanReportService } from './module/reports/my-plan-report/my-plan-report.service';

@Controller()
export class AppController {
    constructor(
        private readonly cronService: CronService,
        private readonly autoReportSettingService: AutoReportSettingService,
        private readonly myPlanReportService: MyPlanReportService,
    ) {}

    @MessagePattern({ cmd: 'manual_cron_start' })
    startCronManually(postData: any) {
        return this.cronService.triggerManualStart(postData);
    }

    @MessagePattern({ cmd: 'pdf-form-download' })
    pdfFormDownload(postData: any) {
        return this.cronService.pdfFormDownload(postData);
    }

    @MessagePattern({ cmd: 'import_user_process' })
    importUserProcess(postData: any) {
        return this.cronService.importUserProcess(postData);
    }

    @MessagePattern({ cmd: 'report' })
    autoreport(postData: any) {
        return this.cronService.createReport(postData);
    }

    @MessagePattern({ cmd: 'all-report-cron' })
    allReportCron() {
        return this.cronService.generateAllReportsCron();
    }

    @MessagePattern({ cmd: 'mass_communication_mail_request' })
    massCommunication() {
        return this.cronService.mass_communication_mail_request();
    }

    @MessagePattern({ cmd: 'cron_report_request' })
    cronReportRequest() {
        return this.autoReportSettingService.cron_report_request_set();
    }

    @MessagePattern({ cmd: 'cron_auto_report_email' })
    cronAutoReportEmailRequest() {
        return this.autoReportSettingService.cronAutoReportEmail();
    }

    @MessagePattern({ cmd: 'point_upload' })
    uploadCustomPoint(postData: any) {
        return this.cronService.uploadCustomPoint(postData);
    }

    @MessagePattern({ cmd: 'miles_point_upload' })
    milesUploadCustomPoint(postData: any) {
        return this.cronService.milesUploadCustomPoint(postData);
    }

    @MessagePattern({ cmd: 'weight_point_upload' })
    weightUploadCustomPoint(postData: any) {
        return this.cronService.weightUploadCustomPoint(postData);
    }
    @MessagePattern({ cmd: 'biometric_health_request' })
    biometricHealthRequest(postData: any) {
        return this.cronService.biometricHealthRequestAdd(postData);
    }

    @MessagePattern({ cmd: 'send_forms_email' })
    sendFormsEmail(postData: any) {
        return this.cronService.send_forms_email(postData);
    }

    @MessagePattern({ cmd: 'forms_file_create' })
    formsFileCreate() {
        return this.cronService.send_forms_file_create();
    }

    @MessagePattern({ cmd: 'forms-email-send' })
    formsEmailSend() {
        return this.cronService.send_forms_email_send();
    }

    @MessagePattern({ cmd: 'reset-hra-generate' })
    resetHraGenerate() {
        return this.cronService.reset_hra_generate();
    }

    @MessagePattern({ cmd: 'get-biometric-data' })
    getBiometricData(postData: any) {
        let userArray = postData.userArray;
        let bioWhere = `user_id IN(${userArray.join(',')}) AND (height != "" OR weight != "" OR waist != "" OR alc != "" OR systolic != "" OR diastolic != "" OR total_cholesterol != "" OR hdl != "" OR ldl != "" OR triglycerides != "" OR blood_glucose != "") AND status = '1'`;
        let haWhere = `user_id IN(${userArray.join(',')}) AND (weight != '' OR (height_ft != "" AND height_in != "") OR waist != '' OR alc != '' OR bp_systolic != '' OR bp_diastolic != '' OR total_cholesterol != '' OR hdl != '' OR ldl != '' OR triglycerides != '' OR blood_glucose != '') AND status = '1'`;
        let ftWhere = `user_id IN(${userArray.join(',')}) AND (weight != '' OR (height_ft != '' AND height_in != '') OR alc != '' OR systolic != '' OR diastolic != '' OR chol_total != '' OR hdl != '' OR ldl != '' OR triglycerides != '' OR glucose != '') AND status = '1'`;
        return this.myPlanReportService.biometricsRecord(
            {
                bio: bioWhere,
                hra_bio: haWhere,
                ft_bio: ftWhere,
            },
            [
                tableConstant.HEALTH_ASSESSMENT.TBL_HA_HRABIOMETRICS,
                tableConstant.TRACKERS.TBL_FT_BIOMETRICS,
            ],
            { created: 'DESC', id: 'DESC' },
        );
    }

    @MessagePattern({ cmd: 'test' })
    test() {
        return true;
    }
}

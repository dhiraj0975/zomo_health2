import { UrlManageService } from '@/modules/common';
import { CompanyService } from '@/modules/company/companies/company.service';
import { NotificationsController } from '@/modules/notifications/notifications.controller';
import { appConstant, CommonArrayService, CommonDateService, CommonFileService, CommonService, SubmitFormsDto, tableConstant } from '@common-constants';
import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Inject,
    Post,
    Put,
    Req,
    Res,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { FileInterceptor } from "@nestjs/platform-express";
import { Request, Response } from "express";
import { diskStorage } from "multer";
import { lastValueFrom } from 'rxjs';
import { ActivityService } from 'src/modules/activity/activity/activity.service';
import { CommunicationTemplateTextsService } from 'src/modules/communication/templatetexts/communicationtemplatetexts.service';
import { ClientManagerAssignService } from 'src/modules/company/clientmanagerassign/clientmanagerassign.service';
import { SettingsService } from 'src/modules/company/settings/settings.service';
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import { In, Not } from "typeorm";
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import {
    CreateSubmitFormInput,
    DeleteActivityTrackerFormInput,
    ListSubmitFormInput,
    PaginationSubmitFormInput,
    UpdateSubmitFormInput
} from '../../../input';
import { fileName, filesFilter } from "../../../utils/image-upload.utils";
import { TranslationService } from "../../translation/translation.service";
import { CreateFormsService } from '../createforms/createforms.service';
import { SubmitFormsService } from './submitforms.service';
const path = require('path');
const S3_URL =  process.env.S3_URL_PROD;
@Controller('activitytracker/submit-forms')
@UseGuards(TokenGuard, RoleGuard)
export class SubmitFormsController {
    constructor(
        private readonly createFormsService: CreateFormsService,
        private readonly submitFormsService: SubmitFormsService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonDateService: CommonDateService,
        private readonly commonFileService: CommonFileService,
        private readonly translatorService: TranslationService,
        @Inject('COMMON_SERVICE')
        private commonMicroservice: ClientProxy,
        private readonly activityLogService: ActivityLogService,
        private readonly activityService: ActivityService,
        private readonly communicationTemplateTextService: CommunicationTemplateTextsService,
        private readonly companySettingsService: SettingsService,
        private readonly clientManagerAssignService: ClientManagerAssignService,
        private readonly urlManageService: UrlManageService,
        private readonly companyService: CompanyService,
        private readonly notificationsController: NotificationsController,
    ) { }
    @UseGuards(AccessGuard)
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginationSubmitFormInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let where = `sf.deleted = '0'`;
            if (postData?.submitted_date) {
                let datefield = 'added_date';
                if (postData?.filter_by == 'activity_date') {
                    datefield = 'activity_date';
                }
                let startDate = this.commonDateService.getTodayDate(postData?.submitted_date).format('YYYY-MM-DD');
                where += ` AND DATE_FORMAT(CONVERT_TZ(sf.${datefield},"UTC",CASE WHEN user.timezone != "" THEN user.timezone ELSE "UTC" END),"%Y-%m-%d") = '${startDate}'`;
            }
            if ([appConstant.ROLE.ADMIN, appConstant.ROLE.ORGADMIN, appConstant.ROLE.GLOBALDATAMANAGER].includes(req.tokenUser?.role_id) && postData?.org_id) {
                where += ` AND sf.org_id = ${postData?.org_id}`;
            }
            if (appConstant.ROLE.CLIENTENGAGEMENTMANAGER == req.tokenUser?.role_id){
                let resultedData = await this.clientManagerAssignService.listRecord({user_id: req.tokenUser?.id,status: 1},null);
                if(resultedData.length > 0){
                    where += `AND sf.org_id IN (${resultedData.map(ele=>ele.org_id).join(',')})`;
                }
                else{
                    return res.status(HttpStatus.OK).json({
                        statusCode: 200,
                        success: 1,
                        error: 0,
                        data: {
                            list: [],
                            limit: postData?.limit,
                            page: postData?.page,
                            pages: 0,
                            total: 0
                        },
                        message: 'success',
                    });
                }
            }
            if (postData?.user_id) {
                where += ` AND sf.user_id = ${postData?.user_id}`;
            }
            if (postData?.search_str && postData?.search_str != '') {
                if ([appConstant.ROLE.ADMIN, appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER, appConstant.ROLE.ORGADMIN].includes(req.tokenUser?.role_id)) {
                    switch (postData?.filter_by?.toLowerCase()) {
                        case 'id':
                            where += ` AND sf.id LIKE '%${this.commonFileService.quoteEscaper(postData?.search_str)}%'`;
                            break;
                        case 'title':
                            where += ` AND createForm.title LIKE '%${this.commonFileService.quoteEscaper(postData?.search_str)}%'`;
                            break;
                        case 'name':
                            where += ` AND (user.first_name LIKE '%${this.commonFileService.quoteEscaper(postData?.search_str)}%' OR user.last_name LIKE '%${this.commonFileService.quoteEscaper(postData?.search_str)}%' OR CONCAT(user.first_name, ' ', user.last_name) LIKE '%${this.commonFileService.quoteEscaper(postData?.search_str)}%')`;
                            break;
                        case 'activities':
                            where += ` AND activity.activity_name LIKE '%${this.commonFileService.quoteEscaper(postData?.search_str)}%'`;
                            break;
                        case 'attachment':
                            where += ` AND sf.attachments LIKE '%${this.commonFileService.quoteEscaper(postData?.search_str)}%'`;
                            break;
                        default:
                            where += ` AND (sf.id LIKE '%${this.commonFileService.quoteEscaper(postData?.search_str)}%' OR createForm.title LIKE '%${this.commonFileService.quoteEscaper(postData?.search_str)}%' OR (user.first_name LIKE '%${this.commonFileService.quoteEscaper(postData?.search_str)}%' OR user.last_name LIKE '%${this.commonFileService.quoteEscaper(postData?.search_str)}%' OR CONCAT(user.first_name, ' ', user.last_name) LIKE '%${this.commonFileService.quoteEscaper(postData?.search_str)}%') OR activity.activity_name LIKE '%${this.commonFileService.quoteEscaper(postData?.search_str)}%' OR sf.attachments LIKE '%${this.commonFileService.quoteEscaper(postData?.search_str)}%')`;
                    }
                } else {
                    where += ` AND (sf.id LIKE '%${this.commonFileService.quoteEscaper(postData?.search_str)}%' OR createForm.title LIKE '%${this.commonFileService.quoteEscaper(postData?.search_str)}%' OR activity.activity_name LIKE '%${this.commonFileService.quoteEscaper(postData?.search_str)}%' OR sf.attachments LIKE '%${this.commonFileService.quoteEscaper(postData?.search_str)}%')`;
                }
            }
            if ([0, 1, 2].includes(postData?.status)) {
                where += ` AND (sf.status = '${postData?.status}')`;
            } else {
                /* status 5 is deleted */
                where += ` AND (sf.status != '5')`;
            }
            let resultedData = await this.submitFormsService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(await this.commonArrayService.formatToDto(SubmitFormsDto, resultedData['list'], req.lang));
            if(appConstant.ROLE.GLOBALDATAMANAGER == req.tokenUser?.role_id){
                if(resultedData['list']?.length && resultedData['list'][0]?.['company']){
                    resultedData['company'] = resultedData['list'][0]?.['company'];
                }
                else{
                    resultedData['company'] = await this.companyService.companyFindOne({ id: postData?.org_id, status: Not(2) });
                }
            }
            if ([appConstant.ROLE.REGISTERED, appConstant.ROLE.ORGADMIN, appConstant.ROLE.SPOUSE].includes(req.tokenUser?.role_id)) {
                await Promise.all(resultedData['list'].map(async (ele) => {
                    let userTimeZone = ele.user.timezone ? ele.user.timezone : 'UTC';
                    // if (req.tokenUser?.role_id != appConstant.ROLE.ORGADMIN) {
                        if (ele.activity_date_copy) {
                            // let activityDate = moment.tz(ele.activity_date_copy, 'UTC').tz(userTimeZone).format('YYYY-MM-DD HH:mm:ss');
                            // ele.activity_date = ele.activity_date + ' ' + this.commonDateService.getTodayDate(activityDate).format('HH:mm');
                            let activityDate = this.commonDateService.DateTimeFormat(ele.activity_date_copy, 'utcInputToTz', 'YYYY-MM-DD HH:mm:ss', userTimeZone);
                            let MonthName = this.commonDateService.DateTimeFormat(activityDate, 'MMMM');
                            MonthName = await this.translatorService.frontendReadTranslation(req.lang, this.commonDateService.DateTimeFormat(activityDate, 'MMM')?.toString(), `/LC_MESSAGES/Common/Month`, `static`);
                            let formatedDate = MonthName + ' ' + this.commonDateService.DateTimeFormat(activityDate, 'D') + ', ' + this.commonDateService.DateTimeFormat(activityDate, 'YYYY');
                            if(req.tokenUser?.role_id == appConstant.ROLE.ORGADMIN){
                                ele.activity_date = formatedDate
                            }else{
                                ele.activity_date = formatedDate + ' ' + this.commonDateService.getTodayDate(activityDate).format('HH:mm');
                            }
                        }
                    // }
                    if (ele.added_date_copy) {
                        // let addedDate = moment.tz(ele.added_date_copy, 'UTC').tz(userTimeZone).format('YYYY-MM-DD HH:mm:ss');
                        // ele.added_date = ele.added_date + ' ' + this.commonDateService.getTodayDate(addedDate).format('HH:mm');
                        let addedDate = this.commonDateService.DateTimeFormat(ele.added_date_copy, 'utcInputToTz', 'YYYY-MM-DD HH:mm:ss', userTimeZone);
                        let MonthName = this.commonDateService.DateTimeFormat(addedDate, 'MMMM');
                        MonthName = await this.translatorService.frontendReadTranslation(req.lang, this.commonDateService.DateTimeFormat(addedDate, 'MMM')?.toString(), `/LC_MESSAGES/Common/Month`, `static`);
                        let formatedDate = MonthName + ' ' + this.commonDateService.DateTimeFormat(addedDate, 'D') + ', ' + this.commonDateService.DateTimeFormat(addedDate, 'YYYY');
                        ele.added_date = formatedDate + ' ' + this.commonDateService.getTodayDate(addedDate).format('HH:mm');
                    }
                    if(ele?.createForm?.title){
                        let customeName = await this.translatorService.frontendReadTranslation(req.lang, `title_${ele?.createForm?.['id']}`, `/LC_MESSAGES/ActivityForms/SubmitForm/${postData?.org_id}/${ele?.createForm?.['id']}`,`dynamic`);
                        if (customeName != `title_${ele?.createForm?.['id']}`) {
                            ele.createForm.title = customeName;
                        }
                    }
                    if (ele?.activity?.activity_name) {
                        let customeName = await this.translatorService.frontendReadTranslation(req.lang, `activity_name_${ele?.activity?.['id']}`, `/LC_MESSAGES/ActivityForms/Activities/${postData?.org_id}/${ele?.activity?.['id']}`, `dynamic`);
                        ele.activity.activity_name = (customeName == '' || customeName == `activity_name_${ele?.activity?.['id']}`) ? ele?.activity?.['activity_name'] : customeName;
                    }
                    if (ele?.decline_reason) {
                        let customeName = await this.translatorService.frontendReadTranslation(req.lang,`decline_reason_${ele.id}`, `/LC_MESSAGES/ActivityForms/SubmittedForms/${ele.org_id}/${ele.form_id}/${ele.user_id}`,`dynamic`);
                        if (!customeName.includes('decline_reason_')) {
                            ele.decline_reason = customeName;
                        }
                    }
                }))
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: resultedData,
                message: 'success',
            });
        } catch (error) {
            this.activityLogService.error_log(req.tokenUser?.id,req?.originalUrl, error?.message, error, req);
            throw new HttpException(
                {
                    statusCode: 401,
                    success: 0,
                    error: 1,
                    message: error?.message,
                    data: null,
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }
    @Post('create')
    @UseInterceptors(
        FileInterceptor("attachments", {
            limits: { fileSize: appConstant.FILE_SIZE_2MB },
            storage: diskStorage({
                destination: `${appConstant.ACTIVITY_TRACKER_IMAGE_PATH}`,
                filename: fileName
            }),
            fileFilter: filesFilter
        }),
        AccessGuard
    )
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateSubmitFormInput, @UploadedFile() file: Express.Multer.File) {
        try {
            if (!postData?.user_id || !postData?.org_id || !postData?.form_id || !postData?.activity_id) {
                if (file && file.filename && file.fieldname === 'attachments') {
                    await this.commonFileService.removeFileFromLocal(file.path);
                }
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const formAppStatus = await this.createFormsService.findOne({ id: postData?.form_id, status: 1 });
            if (formAppStatus && formAppStatus.attachment_req && formAppStatus?.attachments && !file) {
                throw Error((await this.translatorService.frontendReadTranslation(req.lang, "ERR_FILE_VALIDATION")).replace("%s", 'attachments'));
            }
            postData.status = '0';
            if (postData?.approval_type && postData?.approval_type == '1') {
                postData.status = '1';
                postData.approval_type = '1';
            }
            postData['attachments'] = ' ';
            if (postData?.notes) {
                postData.notes = this.commonService.stripScripts(postData?.notes);
            }
            if (postData?.activity_date) {
                postData['activity_date'] = this.commonDateService.getTodayDate(postData?.activity_date).format('YYYY-MM-DD') + ' ' + this.commonDateService.getTodayDate().format('HH:mm:ss');
            } else {
                postData['activity_date'] = this.commonDateService.getTodayDate().format('YYYY-MM-DD HH:mm:ss');
            }
            postData['added_date'] = postData['updated_date'] = this.commonDateService.getTodayDate().format('YYYY-MM-DD HH:mm:ss');
            postData['deleted'] = 0;
            let resultedData = await this.submitFormsService.save({ ...postData });
            if (postData?.notes) {
                let dynamicDatas = Object.create(null);
                let tilte = `notes_${resultedData['id']}`;
                dynamicDatas[`${tilte}`] = postData?.notes;
                await this.translatorService.DynamicEngJsonData('ActivityForms', resultedData['org_id'], dynamicDatas, 'Add', 'SubmittedForms', resultedData['form_id'],resultedData['user_id']);
            }
            if (file && file.fieldname === 'attachments' && file.filename) {
                file.originalname = this.commonFileService.formatFileName(file.originalname);
                file.filename = `acttrafiles/subforms/${postData?.org_id.toString()}/${postData?.user_id.toString()}/${this.commonService.generateMD5(resultedData['id'].toString())}.${file.originalname.split('.')[file.originalname.split('.').length - 1]}`;
                await lastValueFrom(this.commonMicroservice.send({ cmd: 'upload_file' }, { path: path.resolve(file.path), filename: file.filename, userBucket: 'private' }));
                postData['attachments'] = file.filename;
            }
            if (postData?.attachments && postData?.attachments != ' ') {
                await this.submitFormsService.update({ id: resultedData['id'] }, { ...postData });
            }
            if (this.commonService.isValidNumber(postData?.status) && postData.status == '1') {
                let message = 'Form has been approved successfully.'
                let logo = `${S3_URL}comn/assets/img/success.png`;
                const recordDetails = {
                    id: resultedData['id'],
                    org_id: postData.org_id,
                    user_id: postData.user_id,
                    form_id: postData.form_id,
                    activity_id: postData.activity_id,
                    createForm: { title: formAppStatus?.title }
                };
                this.addNotification({
                    id: recordDetails?.['id'], 
                    org_id: recordDetails?.['org_id'], 
                    user_id: recordDetails['user_id'], 
                    custom_cname: recordDetails?.['createForm']?.title, 
                    form_id: recordDetails?.['form_id'], 
                    activity_id: recordDetails?.['activity_id'], 
                    title: 'Activity ' + message?.replace(' successfully',''),
                    message: `Your ${recordDetails?.['createForm']?.title} ` + message?.replace(' successfully',''),
                    logo, 
                    url: `https://${process.env.DOMAIN}/activity-forms?tab=1?formId=${recordDetails?.['id']}`,
                    type: 'update',
                }, req);
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, "MSG_FORM_SUBMITTED_SUCCESSFULLY")
            });
        } catch (error) {
            if (file && file.fieldname === 'attachments' && file.filename) {
                await this.commonFileService.removeFileFromLocal(file.path);
            }
            await this.activityLogService.error_log(req.tokenUser?.id,req?.originalUrl, error?.message, error, req);
            throw new HttpException(
                {
                    statusCode: 401,
                    success: 0,
                    error: 1,
                    message: error?.message,
                    data: null,
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }
    @Put('update')
    @UseInterceptors(
        FileInterceptor("attachments", {
            limits: { fileSize: appConstant.FILE_SIZE_2MB },
            storage: diskStorage({
                destination: `${appConstant.ACTIVITY_TRACKER_IMAGE_PATH}`,
                filename: fileName
            }),
            fileFilter: filesFilter
        }),
        AccessGuard
    )
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: UpdateSubmitFormInput, @UploadedFile() file: Express.Multer.File) {
        try {
            if (!postData?.id || !postData?.form_id || !postData?.activity_id) {
                if (file && file.filename && file.fieldname === 'attachments') {
                    await this.commonFileService.removeFileFromLocal(file.path);
                }
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = { id: postData?.id, status: Not(5) };
            const recordDetails = await this.submitFormsService.findOne(where);
            if (!recordDetails) {
                if (file && file.fieldname === 'attachments' && file.filename) {
                    await this.commonFileService.removeFileFromLocal(file.path);
                }
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            if (file && file.fieldname === 'attachments' && file.filename) {
                file.originalname = this.commonFileService.formatFileName(file.originalname);
                file.filename = `acttrafiles/subforms/${recordDetails?.org_id?.toString()}/${recordDetails?.user_id?.toString()}/${this.commonService.generateMD5(recordDetails['id'].toString())}.${file.originalname.split('.')[file.originalname.split('.').length - 1]}`;
                await lastValueFrom(this.commonMicroservice.send({ cmd: 'upload_file' }, { path: path.resolve(file.path), filename: file.filename, userBucket: 'private' }));
                postData['attachments'] = file.filename;
            }
            if (postData?.activity_date) {
                postData['activity_date'] = this.commonDateService.getTodayDate(postData?.activity_date).format('YYYY-MM-DD') + ' ' + this.commonDateService.getTodayDate().format('HH:mm:ss');
            } else {
                postData['activity_date'] = this.commonDateService.getTodayDate().format('YYYY-MM-DD HH:mm:ss');
            }
            const { role_id, ...updatedPostData } = postData;
            const companyData = await this.companySettingsService.findOne({ org_id: recordDetails['org_id'] });
            if (companyData['health_form_mail'] == 1 && postData?.status && postData?.status != recordDetails.status && [appConstant.ROLE.ADMIN,appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER, appConstant.ROLE.ORGADMIN, appConstant.ROLE.GLOBALDATAMANAGER, appConstant.ROLE.WCH].includes(req.tokenUser?.role_id)) {
                let form_title = '';
                let subject = '';
                let toEmail = recordDetails['user']['email'];
                let emailDetails = Object.create(null);
                let type;
                let activity = await this.activityService.findOne(`activity.id = ${recordDetails['activity_id']} AND activity.status != 2 AND activity.activity_display = 0`);
                if (activity) {
                    form_title = activity['activity_name'];
                }
                if (req.tokenUser?.role_id == appConstant.ROLE.GLOBALDATAMANAGER) {
                    //approve_form activity tracker 
                }
                emailDetails['username'] = recordDetails['user']?.username;
                emailDetails['link'] = 'https://' + process.env.DOMAIN;
                emailDetails['form'] = form_title;
                if (postData?.status == 1) {
                    subject = `Approved - ${form_title}`;
                    type = 30;
                    emailDetails['type'] = type;
                    emailDetails['image'] = `<img src=${S3_URL}comn/assets/img/success.png width='50%' />`;
                }
                if (postData?.status == 2) {
                    subject = `Declined - ${form_title}`;
                    type = 31;
                    emailDetails['type'] = type;
                    emailDetails['image'] = `<img src=${S3_URL}comn/assets/img/decline.png width='50%' />`;
                }
                const templateText = await this.communicationTemplateTextService.findOne({ org_id: In([recordDetails['user'].org_id, 0]), type: type });
                let templateNewText = await this.urlManageService.onmapUrlContent(templateText?.['new_text'],'mailTemplate') || templateText?.['text'];
                let emaildata = {
                    sender: ``,
                    receiver: toEmail,
                    subject: subject,
                    content: emailDetails,
                    template: templateNewText,
                }
                await lastValueFrom(this.commonMicroservice.send({ cmd: 'send_email' }, emaildata));
            }
            await this.submitFormsService.update({ id: updatedPostData.id }, updatedPostData);
            if (postData?.decline_reason) {
                let dynamicDatas = Object.create(null);
                let tilte = `decline_reason_${recordDetails?.id}`;
                dynamicDatas[`${tilte}`] = postData?.decline_reason;
                await this.translatorService.DynamicEngJsonData('ActivityForms', recordDetails?.org_id, dynamicDatas, 'Add', 'SubmittedForms', recordDetails['form_id'],recordDetails['user_id']);
            }
            this.activityLogService.create(recordDetails, updatedPostData, tableConstant.ACTIVITY_TRACKER.TBL_SUBMITTED_FORMS, req.tokenUser?.id);
            let message = 'MSG_FORM_SUBMITTED_SUCCESSFULLY';
            if (this.commonService.isValidNumber(postData?.status)) {
                let logo = null;
                if(postData.status == 1){
                    message = 'FORM_APPROVED'
                    logo = `${S3_URL}comn/assets/img/success.png`;
                }
                if(postData.status == 2){
                    message = 'FORM_REJECTED'
                    logo = `${S3_URL}comn/assets/img/decline.png`;
                }
                this.addNotification({
                    id: recordDetails?.['id'], 
                    org_id: recordDetails?.['org_id'], 
                    user_id: recordDetails['user_id'], 
                    custom_cname: recordDetails?.['createForm']?.title, 
                    form_id: recordDetails?.['form_id'], 
                    activity_id: recordDetails?.['activity_id'], 
                    title: 'Activity ' + message?.replace(' successfully',''),
                    message: `Your ${recordDetails?.['createForm']?.title} ` + message?.replace(' successfully',''),
                    logo, 
                    url: `https://${process.env.DOMAIN}/activity-forms?tab=1?formId=${recordDetails?.['id']}`,
                    type: 'update',
                }, req);
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, message || 'Form has been submitted successfully.')
            });
        } catch (error) {
            if (file && file.fieldname === 'attachments' && file.filename) {
                await this.commonFileService.removeFileFromLocal(file.path);
            }
            await this.activityLogService.error_log(req.tokenUser?.id,req?.originalUrl, error?.message, error, req);
            throw new HttpException(
                {
                    statusCode: 401,
                    success: 0,
                    error: 1,
                    message: error?.message,
                    data: null,
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }
    @UseGuards(AccessGuard)
    @Post('delete')
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: DeleteActivityTrackerFormInput) {
        try {
            if (!postData?.id || !postData?.org_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = { id: postData?.id, org_id: postData?.org_id };
            const recordDetails = await this.submitFormsService.findOne(where);
            if (!recordDetails) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }
            /*role 0 = user And role 1 = org admin */
            if (req.tokenUser?.role_id == appConstant.ROLE.REGISTERED) {
                /* status 5 is deleted */
                await this.submitFormsService.update(where,{status: 5});
                this.activityLogService.create(recordDetails, { notes: recordDetails }, tableConstant.ACTIVITY_TRACKER.TBL_SUBMITTED_FORMS, req.tokenUser?.id, 'delete');
            } else {
                await this.submitFormsService.update(where, { deleted: '1' });
                this.activityLogService.create(recordDetails, { deleted: 1 }, tableConstant.ACTIVITY_TRACKER.TBL_SUBMITTED_FORMS, req.tokenUser?.id, 'delete');
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, "MSG_FORM_DELETED_SUCCESSFULLY"),
            });
        } catch (error) {
            this.activityLogService.error_log(req.tokenUser?.id,req?.originalUrl, error?.message, error, req);
            throw new HttpException(
                {
                    statusCode: 401,
                    success: 0,
                    error: 1,
                    message: error?.message,
                    data: null,
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }
    @UseGuards(AccessGuard)
    @Post('get-one')
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id && !postData?.org_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = postData?.id ? postData?.org_id ? { id: postData?.id, org_id: postData?.org_id, status: Not('5') } : { id: postData?.id, status: Not('5')  } : { org_id: postData?.org_id, status: Not('5') };
            if (req.tokenUser?.role_id != appConstant.ROLE.ADMIN || appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER != req.tokenUser?.role_id) {
                where["deleted"] = Not('1');
            }
            let resultedData:any = await this.submitFormsService.findOne(where);
            if (req.tokenUser?.role_id != appConstant.ROLE.ADMIN) {
                if (resultedData?.createForm?.title) {
                    let customeName = await this.translatorService.frontendReadTranslation(req.lang, `title_${resultedData?.createForm?.['id']}`, `/LC_MESSAGES/ActivityForms/SubmitForm/${postData?.org_id}/${resultedData?.createForm?.['id']}`, `dynamic`);
                    if (customeName != `title_${resultedData?.createForm?.['id']}`) {
                        resultedData.createForm.title = customeName;
                    }
                }
                if (resultedData?.activity?.activity_name) {
                    let customeName = await this.translatorService.frontendReadTranslation(req.lang, `activity_name_${resultedData?.activity?.['id']}`, `/LC_MESSAGES/ActivityForms/Activities/${postData?.org_id}/${resultedData?.activity?.['id']}`, `dynamic`);
                    resultedData.activity.activity_name = (customeName == '' || customeName == `activity_name_${resultedData?.activity?.['id']}`) ? resultedData?.activity?.['activity_name'] : customeName;
                }
                if (resultedData?.notes) {
                    let customeName = await this.translatorService.frontendReadTranslation(req.lang,`notes_${resultedData.id}`, `/LC_MESSAGES/ActivityForms/SubmittedForms/${resultedData.org_id}/${resultedData.form_id}/${resultedData.user_id}`,`dynamic`);
                    if (!customeName.includes('notes_')) {
                        resultedData.notes = customeName;
                    }
                }
            }
            resultedData = <any>(
                await this.commonArrayService.formatToDto(SubmitFormsDto, resultedData, req.lang)
            );
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: resultedData,
                message: 'success',
            });
        } catch (error) {
            this.activityLogService.error_log(req.tokenUser?.id,req?.originalUrl, error?.message, error, req);
            throw new HttpException(
                {
                    statusCode: 401,
                    success: 0,
                    error: 1,
                    message: error?.message,
                    data: null,
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }
    @UseGuards(AccessGuard)
    @Post('list')
    async list(@Req() req: Request, @Res() res: Response, @Body() postData: ListSubmitFormInput) {
        try {
            if (!postData?.org_id) {
                if ((!postData?.user_id || !postData?.form_id) && req.tokenUser?.role_id != appConstant.ROLE.ADMIN) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
            }
            let condition;
            condition = { status: Not('5') };
            postData = { ...postData, ...condition }
            let resultedData = await this.submitFormsService.listRecord(["sf.id", "sf.activity_id", "sf.activity_date", "sf.attachments", "sf.deleted", "createForm.id", "createForm.title"], { ...postData },null,[tableConstant.ACTIVITY_TRACKER.TBL_CREATE_FORMS]);
            resultedData = <any>(
                await this.commonArrayService.formatToDto(SubmitFormsDto, resultedData, req.lang)
            );
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: resultedData,
                message: 'success',
            });
        } catch (error) {
            this.activityLogService.error_log(req.tokenUser?.id,req?.originalUrl, error?.message, error, req);
            throw new HttpException(
                {
                    statusCode: 401,
                    success: 0,
                    error: 1,
                    message: error?.message,
                    data: null,
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }
    @UseGuards(AccessGuard)
    @Post('multiple-approve')
    async multipleApprove(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            for (let record of postData?.id.split(',')) {
                let saveData = { status: 1 };
                if (postData?.decline_reason) {
                    saveData['decline_reason'] = postData?.decline_reason;
                }
                const recordDetails = await this.submitFormsService.findOne({ id: record });
                await this.submitFormsService.update({ id: record }, { ...saveData });
                if (postData?.decline_reason) {
                    let dynamicDatas = Object.create(null);
                    let tilte = `decline_reason_${recordDetails?.id}`;
                    dynamicDatas[`${tilte}`] = postData?.decline_reason;
                    await this.translatorService.DynamicEngJsonData('ActivityForms', recordDetails?.org_id, dynamicDatas, 'Add', 'SubmittedForms', recordDetails['form_id'],recordDetails['user_id']);
                }
                this.activityLogService.create(recordDetails, saveData, tableConstant.ACTIVITY_TRACKER.TBL_SUBMITTED_FORMS, req.tokenUser?.id);
                const companyData = await this.companySettingsService.findOne({ org_id: recordDetails?.['org_id'] });
                if (companyData && companyData['health_form_mail'] == 1 && [appConstant.ROLE.ADMIN, appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER, appConstant.ROLE.ORGADMIN, appConstant.ROLE.GLOBALDATAMANAGER, appConstant.ROLE.WCH].includes(req.tokenUser?.role_id)) {
                    let form_title = '';
                    let toEmail = recordDetails['user']['email'];
                    let emailDetails = Object.create(null);
                    let activity = await this.activityService.findOne(`activity.id = ${recordDetails['activity_id']} AND activity.status != 2 AND activity.activity_display = 0`);
                    if (activity) {
                        if(activity.activity_name){
                            let customeName = await this.translatorService.frontendReadTranslation(req.lang,`activity_name_${activity['id']}`, `/LC_MESSAGES/ActivityForms/Activities/${activity['id']}`,`dynamic`);
                            activity.activity_name = (customeName == '' || customeName == `activity_name_${activity['id']}`) ? activity['activity_name'] : customeName;
                        }
                        form_title = activity['activity_name'];
                    }
                    emailDetails['type'] = 30;
                    emailDetails['username'] = recordDetails['user']?.username;
                    emailDetails['link'] = 'https://' + process.env.DOMAIN;
                    emailDetails['image'] = `<img src=${S3_URL}comn/assets/img/success.png width='50%' />`;
                    emailDetails['form'] = form_title;
                    const templateText = await this.communicationTemplateTextService.findOne({ org_id: In([recordDetails['user'].org_id, 0]), type: 30 });
                    let templateNewText = await this.urlManageService.onmapUrlContent(templateText?.['new_text'],'mailTemplate') || templateText?.['text'];
                    let emaildata = {
                        sender: ``,
                        receiver: toEmail,
                        subject: `Approved - ${form_title}`,
                        content: emailDetails,
                        template: templateNewText
                    }
                    await lastValueFrom(this.commonMicroservice.send({ cmd: 'send_email' }, emaildata));
                }
                if (this.commonService.isValidNumber(postData?.status)) {
                    let message = '';
                    let logo = null;
                    if(postData.status == 1){
                        message = 'Form has been approved.'
                        logo = `${S3_URL}comn/assets/img/success.png`;
                    }
                    if(postData.status == 2){
                        message = 'Form has been declined.'
                        logo = `${S3_URL}comn/assets/img/decline.png`;
                    }
                    this.addNotification({
                        id: recordDetails?.['id'], 
                        org_id: recordDetails?.['org_id'], 
                        user_id: recordDetails['user_id'], 
                        custom_cname: recordDetails?.['createForm']?.title, 
                        form_id: recordDetails?.['form_id'], 
                        activity_id: recordDetails?.['activity_id'], 
                        title: 'Activity ' + message,
                        message: `Your ${recordDetails?.['createForm']?.title} ` + message,
                        logo, 
                        url: `https://${process.env.DOMAIN}/activity-forms?tab=1?formId=${recordDetails?.['id']}`,
                        type: 'update',
                    }, req);
                }
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: 'Forms has been approved successfully.',
            });
        } catch (error) {
            this.activityLogService.error_log(req.tokenUser?.id,req?.originalUrl, error?.message, error, req);
            throw new HttpException(
                {
                    statusCode: 401,
                    success: 0,
                    error: 1,
                    message: error?.message,
                    data: null,
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }
    @UseGuards(AccessGuard)
    @Post('translation-list')
    async translationList(@Req() req: Request, @Res() res: Response, @Body() postData: ListSubmitFormInput) {
        try {
            if (!postData?.org_id) {
                if ((!postData?.user_id || !postData?.form_id) && req.tokenUser?.role_id != appConstant.ROLE.ADMIN) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
            }
            let joinTable = [tableConstant.COMPANIES.TBL_COMPANY];
            let fields = ["sf.id", "sf.activity_id", "sf.activity_date", "sf.attachments", "sf.deleted",'company.id','company.company_name'];
            let condition = `sf.org_id = ${postData?.org_id} AND company.status !=2`;
            if (['0', '1', '2'].includes(postData?.status)) {
                condition += ` AND (sf.status = '${postData?.status}')`;
            } else {
                condition += ` AND (sf.status != '5')`;
            }
            if(postData?.org_id){
                condition += ` AND (createForm.status != 2 AND createForm.deleted = 0)`;
                joinTable.push(tableConstant.ACTIVITY_TRACKER.TBL_CREATE_FORMS);
                fields.push("createForm.id", "createForm.title");
            }
            if(postData?.form_id){
                condition += ` AND (sf.form_id = '${postData?.form_id}')`;
                joinTable.push(tableConstant.TBL_USERS);
                fields = [...fields,...["user.id", "user.first_name", "user.last_name", "user.code", "user.timezone"]];
            }
            let resultedData = await this.submitFormsService.listRecord(fields, condition, null, joinTable);
            resultedData = <any>(await this.commonArrayService.formatToDto(SubmitFormsDto, resultedData, req.lang));
            if(postData?.org_id){
                if(postData?.form_id){
                    resultedData = [...new Map(resultedData.filter(ele => ele['user']).map(o => [o['user'].id, o['user']])).values()];
                }
                else{
                    resultedData = [...new Map(resultedData.filter(ele => ele['createForm']).map(o => [o['createForm'].id, o['createForm']])).values()];
                }
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: resultedData,
                message: 'success',
            });
        } catch (error) {
            this.activityLogService.error_log(req.tokenUser?.id,req?.originalUrl, error?.message, error, req);
            throw new HttpException(
                {
                    statusCode: 401,
                    success: 0,
                    error: 1,
                    message: error?.message,
                    data: null,
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }
    async addNotification(formData: any, req: Request) {
        try {
            if(formData?.type == 'add' || formData?.type == 'update'){
                if(formData?.type == 'update'){
                    let whereCondition = { org_id: formData?.org_id};
                    if(formData?.id){ 
                        whereCondition['id'] = formData?.id;
                    }
                    if(formData?.form_id){ 
                        whereCondition['form_id'] = formData?.form_id;
                    }
                    if(formData?.activity_id){
                        whereCondition['activity_id'] = formData?.activity_id;
                    }
                    await this.notificationsController.removeNotification(whereCondition,req);
                }
                let notificationData = {
                    org_id: formData.org_id,
                    user_id: formData?.user_id,
                    title: formData?.title,
                    message: formData?.message,
                    type: 2,
                    module_name: 'Activity form',
                    submodule_name: 'Activity Tracker form',
                    metadata: {
                        id: formData?.id,
                        form_id: formData?.form_id,
                        activity_id: formData?.activity_id,
                        url: formData?.url,
                        logo: formData?.logo ?? null,
                        notification_date: this.commonDateService.getTodayDate().format('YYYY-MM-DD'),
                        notification_sent: 1,
                        notification_sent_count: 0,
                    },
                };
                await this.notificationsController.sendNotification(1, notificationData, req);  
            }
            return;
        }
        catch (error) {
            await this.activityLogService.error_log(req.tokenUser?.id,req?.originalUrl, error?.message, error, req);
            return
        }
    }
}

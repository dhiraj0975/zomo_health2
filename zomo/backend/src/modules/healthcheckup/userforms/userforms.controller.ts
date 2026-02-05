import { UrlManageService } from '@/modules/common';
import { SettingsService } from '@/modules/company/settings/settings.service';
import { FormHelperService } from '@/modules/form/formhelper.service';
import { UserService } from '@/modules/user/user/user.service';
import {
    appConstant,
    CommonArrayService,
    CommonDateService,
    CommonFileService,
    CommonService,
    SubmmittedFormsDto,
    tableConstant,
    UserFormsAttachmentsEntity,
    UserFormsDto
} from '@common-constants';
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
import { FileInterceptor } from '@nestjs/platform-express';
import { Request, Response } from "express";
import * as moment from "moment/moment";
import { diskStorage } from 'multer';
import { lastValueFrom } from 'rxjs';
import { CommunicationTemplateTextsService } from 'src/modules/communication/templatetexts/communicationtemplatetexts.service';
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import { In, Not, Raw } from 'typeorm';
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import {
    CreateUserFormInput,
    DeclineUserFormInput,
    DeleteUserFormInput,
    GetOneUserFormInput,
    ListUserFormInput,
    PaginateWithCompanyInput,
    UpdateUserFormInput
} from '../../../input';
import { fileName, filesFilter } from '../../../utils/image-upload.utils';
import { TranslationService } from '../../translation/translation.service';
import { BiometricsService } from '../biometrics/biometrics.service';
import { DentistsService } from '../dentists/dentists.service';
import { FormInstructionsService } from "../forminstructions/forminstructions.service";
import { OptometristsService } from '../optometrists/optometrists.service';
import { TobaccoUsesService } from '../tobaccouses/tobaccouses.service';
import { UserFormsAttachmentsService } from "../userformsattachments/userformsattachments.service";
import { UserFormsService } from './userforms.service';
const path = require('path');
const S3_URL =  process.env.S3_URL_PROD
@Controller('health-checkup/user-forms')
@UseGuards(TokenGuard, RoleGuard)
export class UserFormsController {
    constructor(
        private readonly userFormsService: UserFormsService,
        @Inject('COMMON_SERVICE')
        private commonMicroservice: ClientProxy,
        private readonly userFormsAttachmentsService: UserFormsAttachmentsService,
        private readonly formInstructionsService: FormInstructionsService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonDateService: CommonDateService,
        private readonly commonFileService: CommonFileService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        private readonly communicationTemplateTextService: CommunicationTemplateTextsService,
        private readonly biometricsService: BiometricsService,
        private readonly tobaccoUsesService: TobaccoUsesService,
        private readonly dentistsService: DentistsService,
        private readonly optometristsService: OptometristsService,
        private readonly urlManageService: UrlManageService,
        private readonly userService: UserService,
        private readonly settingsService: SettingsService,
        private readonly formHelperService: FormHelperService,

    ) {}
    @UseGuards(AccessGuard)
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithCompanyInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            postData.user_id = postData?.user_id ?? req.tokenUser?.id;
            postData.org_id = postData?.org_id ?? req.tokenUser?.org_id;
            if (!postData?.user_id || !postData?.org_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let where = (req.tokenUser?.role_id == appConstant.ROLE.REGISTERED || req.tokenUser?.role_id == appConstant.ROLE.SPOUSE) ? `userForms.org_id = ${postData?.org_id} AND userForms.user_id = ${postData?.user_id}` : `userForms.org_id = ${postData?.org_id} AND userForms.user_id = ${postData?.user_id}`;
            if (postData?.submitted_date) {
                where += ` AND DATE_FORMAT(CONVERT_TZ(userForms.added_date,"UTC",CASE WHEN user.timezone != "" THEN user.timezone ELSE "UTC" END),"%Y-%m-%d") = '${postData?.submitted_date}'`;
            }
            if (postData?.status) {
                where += ` AND (userForms.status = ${postData?.status})`;
            }else{
                where += ` AND (userForms.status != 5)`;
            }
            const getList = await this.formInstructionsService.findOne({company_id: postData?.org_id, status: Not(5)});
            if (postData?.search_str) {
                let resultedData: any = {};
                if (getList.program_selection.trim().length >= 1) {
                    getList.program_selection = getList.program_selection
                        .split(',')
                        .map(item => item.trim().replace(/s$/i, ''))
                        .filter((value, index, self) => self.indexOf(value) === index)
                        .join(',');
                    let dataArray = getList.program_selection.split(",");
                    if (getList.program_custom_name !== null) {
                        var programCustomName = JSON.parse(getList.program_custom_name);
                    }
                    let i = 0;
                    while (i < dataArray.length) {
                        if (programCustomName && programCustomName[dataArray[i]] !== '') {
                            resultedData[dataArray[i]] = programCustomName[dataArray[i]];
                        } else {
                            resultedData[dataArray[i]] = appConstant.HEALTH_FORM_DEFAULT_DATA[dataArray[i]];
                        }
                        i++;
                    }
                }
                resultedData = {...appConstant.HEALTH_FORM_DEFAULT_DATA,...resultedData};
                const getNumbers = (object: {[key: string]: string}, value: string): string[] => {
                    let found = Object.entries(object).filter(([key, val]) =>
                        val.toLowerCase().includes(value.toLowerCase())
                    ).map(([key, val]) => key);
                    return found;
                }
                let number: string[] = getNumbers(resultedData, postData?.search_str);
                let formTitle: string = '';
                if (number && number.length > 0) {
                    formTitle = ` OR (userForms.form_id IN (${number.join(",")}))`;
                }
                where += ` AND (userForms.id LIKE '%${postData?.search_str}%' OR userForms.decline_reason LIKE '%${postData?.search_str}%' ${formTitle})`;
            }
            where += ` AND Userformsattachments.name IS NOT NULL`;
            let resultedData = await this.userFormsService.paginateList(
                where,
                postData,
            ); 
            for (let i = 0; i < resultedData['list'].length; ++i) {
                resultedData['list'][i]['approval_type'] = 0;
                resultedData['list'][i]['formInstructions'] = getList;
            }           
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(UserFormsDto, resultedData['list'], req.lang)
            );     
            if ([appConstant.ROLE.REGISTERED, appConstant.ROLE.SPOUSE].includes(req.tokenUser?.role_id)) {
                await Promise.all(resultedData['list'].map(async (ele) => {                    
                    let userTimeZone = req.tokenUser?.timezone ? req.tokenUser?.timezone : 'UTC';
                    if (ele?.added_date_copy) {    
                        // let addedDatee = moment.tz(ele.added_date_copy, 'UTC').tz(userTimeZone).format('YYYY-MM-DD HH:mm:ss');
                        let addedDate =  this.commonDateService.DateTimeFormat(ele.added_date_copy,'utcInputToTz','YYYY-MM-DD HH:mm:ss',userTimeZone); 
                        let MonthName = this.commonDateService.DateTimeFormat(addedDate, 'MMMM');
                        MonthName = await this.translatorService.frontendReadTranslation(req.lang, this.commonDateService.DateTimeFormat(addedDate, 'MMM')?.toString(), `/LC_MESSAGES/Common/Month`,`static`);
                        let formatedDate = MonthName + ' '+this.commonDateService.DateTimeFormat(addedDate, 'D') + ', '+this.commonDateService.DateTimeFormat(addedDate, 'YYYY');         
                        ele.added_date = formatedDate + ' ' + this.commonDateService.getTodayDate(addedDate).format('HH:mm');
                    }
                }))
            }   
            //Adding translation in programcustome name 
            await Promise.all(
                resultedData?.['list']?.map(async (ele) => {
                    if (ele?.form_id) {
                        const key = `custo_customeLabel_${Number(ele?.form_id) - 1}_${ele?.org_id}`;
                        const translatedProgramCustomName = await this.translatorService.frontendReadTranslation(
                            req.lang,
                            key,
                            `/LC_MESSAGES/HealthForms/SubmitForm/${ele?.org_id}`,
                            "dynamic"
                        );
                        if (translatedProgramCustomName && translatedProgramCustomName !== key) {
                            if (ele?.formInstructions && ele?.formInstructions?.form) {
                                ele.formInstructions.form = translatedProgramCustomName;
                            }
                        } else {
                            ele.formInstructions.form = await this.translatorService.frontendReadTranslation(req.lang, ele.formInstructions.form,'/LC_MESSAGES/HealthForms/SubmitForm','static');
                        }
                    }
                    if (ele?.decline_reason) {
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`decline_reason_${ele.id}`, `/LC_MESSAGES/HealthForms/SubmittedForms/${ele.org_id}/${ele.form_id}/${ele.user_id}`,`dynamic`);
                        if (!customName.includes('decline_reason_')) {
                            ele.decline_reason = customName;
                        }
                    }
                })
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
                  data: [],
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
                destination: `${appConstant.HEALTH_CHECKUP_ZIP_PATH}`,
                filename: fileName
            }),
            fileFilter: filesFilter
        }),
        AccessGuard
    )
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateUserFormInput, @UploadedFile() file: Express.Multer.File) {
        try {
            if (!postData?.org_id || !postData?.user_id || !postData?.form_id || !file) {
                if (file && file.filename && file.fieldname === 'attachments') {
                    await this.commonFileService.removeFileFromLocal(file.path);
                }
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            if (file && file.fieldname === 'attachments' && file.filename) {
                let attachmentData: any = {name: "fileName", user_form_id: postData?.form_id, status: 1};
                let id = await this.userFormsAttachmentsService.save({...attachmentData});
                file.originalname = this.commonFileService.formatFileName(file.originalname);
                let fileName = `hform/subforms/${postData?.org_id.toString()}/${postData?.user_id.toString()}/${this.commonService.generateMD5(id['id'].toString())}.${file.originalname.split('.')[file.originalname.split('.').length - 1]}`
                await lastValueFrom(this.commonMicroservice.send({ cmd: 'upload_file' }, { path: path.resolve(file.path), filename: fileName, userBucket: 'private', deleteFile: false }));
                attachmentData = {name: fileName}
                await this.userFormsAttachmentsService.update({id: id['id']},{...attachmentData});
                let zipPath: any = '';
                await this.commonFileService.fileToZip(file)
                    .then((result) => {
                        zipPath = result;
                    })
                    .catch((error) => {
                        throw new Error(error);
                    });
                postData.status = 1;
                let lastInsertId = await this.userFormsService.save({...postData, zip_filename : ' '});
                if (zipPath != '') {
                    file.originalname = this.commonFileService.formatFileName(file.originalname);
                    let fileName = `hform/subforms/${postData?.org_id.toString()}/${postData?.user_id.toString()}/${appConstant.HEALTH_FORM_DEFAULT_DATA[postData?.form_id].replace(" ","_")}_${this.commonService.generateMD5(postData?.user_id.toString())}_${new Date().getTime()}.zip`;
                    await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(zipPath),  filename: fileName, userBucket: 'private'}));
                    postData['zip_filename'] = fileName;
                    await this.userFormsService.update({id: lastInsertId['id']},{...postData});
                }
                await this.commonFileService.removeFileFromLocal(file.path);
                if (lastInsertId['id'] && id['id']) {
                    await this.userFormsAttachmentsService.update({id: id['id']},{user_form_id: lastInsertId['id']});
                }
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, "MSG_FORM_SUBMITTED_SUCCESSFULLY"),
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
                destination: `${appConstant.HEALTH_CHECKUP_ZIP_PATH}`,
                filename: fileName
            }),
            fileFilter: filesFilter
        }),
        AccessGuard
    )
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: UpdateUserFormInput, @UploadedFile() file: Express.Multer.File) {
        try {
            if (!postData?.id || !postData?.form_id || !postData?.user_id || !postData?.org_id || !file) {
                if (file && file.filename && file.fieldname === 'attachments') {
                    await this.commonFileService.removeFileFromLocal(file.path);
                }
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            var zipPath: any = '';
            await this.commonFileService.fileToZip(file)
                .then((result) => {
                    zipPath = result;
                })
                .catch((error) => {
                    throw new Error(error);
                });
            if (zipPath != '') {
                file.originalname = this.commonFileService.formatFileName(file.originalname);
                let fileName = `healthcheckup/healthforms/${postData?.org_id.toString()}/${postData?.user_id.toString()}/${this.commonService.generateMD5(postData?.user_id.toString())}_${Date.now()}${this.commonService.generateMD5(postData?.user_id.toString())}.${zipPath.split('.')[zipPath.split('.').length - 1]}`
                await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(zipPath),  filename: fileName}));
                postData['zip_filename'] = fileName;
            }
            await this.commonFileService.removeFileFromLocal(file.path);
            const recordDetails = await this.userFormsService.findOne({id: postData?.id,user_id: postData?.user_id,org_id: postData?.org_id});
            await this.userFormsService.update({id: postData?.id,user_id: postData?.user_id,org_id: postData?.org_id},{...postData});
            this.activityLogService.create(recordDetails, postData, tableConstant.HEALTH_CHECKUP.TBL_HC_USER_FORMS, req.tokenUser?.id);
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, "Success"),
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
    @Put('decline')
    async decline(@Req() req: Request, @Res() res: Response, @Body() postData: DeclineUserFormInput) {
        try {
            let user=Object.create(req.tokenUser)
            if (!postData?.id || !postData?.user_id || !postData?.org_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.userFormsService.findOne({ id: postData?.id });
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_RECORD_NOT_FOUND'));
            }
            let userDetails = await this.userService.findUserRecord({ id: Number(postData?.user_id), status: 1 }, ['id', 'first_name', 'last_name', 'email','org_id']);
            let data = {status: 3};
            if (postData?.note) {
                data = {...data, ...{decline_reason: postData?.note}};
            }
            await this.userFormsService.update({ id: postData?.id },data);
            if (postData?.note) {
                let dynamicData = Object.create(null);
                let title = `decline_reason_${recordDetails?.id}`;
                dynamicData[`${title}`] = postData?.note;
                await this.translatorService.DynamicEngJsonData('HealthForms', recordDetails?.org_id, dynamicData, 'Add', 'SubmittedForms', recordDetails['form_id'],recordDetails['user_id']);
            }
            this.activityLogService.create(recordDetails, data, tableConstant.HEALTH_CHECKUP.TBL_HC_USER_FORMS, req.tokenUser?.id);
            // add company setting health_form_mail checking functionality
            let companyDetails = await this.settingsService.findOne(
                {
                    org_id: userDetails?.org_id
                },
                [
                    'org_id',
                    'health_form_mail'
                ]
            );
            if (companyDetails && companyDetails?.health_form_mail && companyDetails.health_form_mail == 1) {
                /* send mail*/
                let templateText = await this.communicationTemplateTextService.findOne({ org_id: In([user.org_id, 0]), type: 28 })
                let templateNewText = await this.urlManageService.onmapUrlContent(templateText?.['new_text'], 'mailTemplate') || templateText?.['text'];
                let toEmail = user.email;
                if (userDetails && userDetails.email) {
                    toEmail = userDetails.email;
                }
                let userName = `${user.first_name} ${user.last_name}`;
                if (userDetails && userDetails.first_name && userDetails.last_name) {
                    userName = `${userDetails.first_name} ${userDetails.last_name}`;
                }
                let emailDetails = Object.create(null);
                emailDetails['type'] = 28;
                emailDetails['Form'] = `${postData?.formName || '-'}`;
                emailDetails['Link'] = 'https://' + process.env.DOMAIN;
                emailDetails['Username'] = userName;
                emailDetails['Image'] = `<img src=${S3_URL}comn/assets/img/decline.png width='50%' />`;
                let emaildata = {
                    sender: ``,
                    receiver: toEmail,
                    subject: `Declined - ${postData?.formName || '-'}`,
                    content: emailDetails,
                    template: templateNewText
                }
                await lastValueFrom(this.commonMicroservice.send({ cmd: 'send_email' }, emaildata));
            }
            if (data?.status == 3) {
                let message = 'Form has been declined';
                let logo =  `${S3_URL}comn/assets/img/decline.png`;
                let formData = JSON.parse(JSON.stringify(appConstant.HEALTH_FORM_DEFAULT_DATA[recordDetails?.['form_id']]));
                this.formHelperService.addNotification({
                    id: recordDetails?.['id'], 
                    org_id: recordDetails?.['org_id'], 
                    user_id: recordDetails['user_id'], 
                    custom_cname: formData.replace(' Forms',''), 
                    form_id: recordDetails?.['form_id'], 
                    title: 'Health ' + message,
                    message: `Your ${formData.replace(' Forms','')} ` + message,
                    logo, 
                    url: `https://${process.env.DOMAIN}/health-forms?tab=1?formId=${recordDetails?.['id']}`,
                    type: 'update',
                }, req);
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, "Success"),
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
    @Post('delete')
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: DeleteUserFormInput) {
        try {
            if([appConstant.ROLE.DATAMANAGER].includes(req.tokenUser?.role_id)){
                postData.user_id = postData?.user_id ?? req.tokenUser?.id;
                if (!postData?.id || !postData?.user_id) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
                }
                const recordDetails = await this.userFormsService.findOne({ id: postData?.id });
                if (!recordDetails) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_RECORD_NOT_FOUND'));
                }
                /* status 5 is deleted */
                await this.userFormsService.update({ id: postData?.id},{status: 5});
                this.activityLogService.create(recordDetails, { notes: recordDetails }, tableConstant.HEALTH_CHECKUP.TBL_HC_USER_FORMS, req.tokenUser?.id, 'delete');
                await lastValueFrom(this.commonMicroservice.send({cmd: 'delete_file'}, {prefix: recordDetails.zip_filename, userBucket: 'private'}));
                const formAttachment = await this.userFormsAttachmentsService.listRecord(["id","user_form_id","name","status"],{ user_form_id: postData?.id});
                await this.userFormsAttachmentsService.update({ user_form_id: postData?.id},{status: 2});
                for (const attachment of formAttachment) {
                    await lastValueFrom(this.commonMicroservice.send({cmd: 'delete_file'}, {prefix: attachment.name, userBucket: 'private'}));
                    this.activityLogService.create(attachment,{ notes: attachment }, tableConstant.HEALTH_CHECKUP.TBL_HC_USER_FORM_ATTACHMENTS, req.tokenUser?.id, 'delete')
                }
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: await this.translatorService.frontendReadTranslation(req.lang,'FORM_DELETED'),
                });
            }else{
                postData.user_id = postData?.user_id ?? req.tokenUser?.id;
                if (!postData?.id || !postData?.user_id) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
                }
                const recordDetails = await this.userFormsService.findOne({ id: postData?.id });
                if (!recordDetails) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_RECORD_NOT_FOUND'));
                }
                await this.userFormsService.update({ id: postData?.id,user_id: postData?.user_id},{status:5});
                this.activityLogService.create(recordDetails, {status:2}, tableConstant.HEALTH_CHECKUP.TBL_HC_USER_FORMS, req.tokenUser?.id, 'delete');
                const formAttachment = await this.userFormsAttachmentsService.listRecord(["id","user_form_id","name","status"],{ user_form_id: postData?.id});
                await this.userFormsAttachmentsService.update({ user_form_id: postData?.id},{status: 2});
                formAttachment?.map((ele)=>this.activityLogService.create(ele, {status:2}, tableConstant.HEALTH_CHECKUP.TBL_HC_USER_FORM_ATTACHMENTS, req.tokenUser?.id, 'delete'));
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: await this.translatorService.frontendReadTranslation(req.lang,'FORM_DELETED'),
                });
            }
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
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: GetOneUserFormInput) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let where = {id: postData?.id};
            if(postData?.org_id){
                where['org_id'] = postData?.org_id;
            }
            let resultedData =Object.create(null)
            if([appConstant.ROLE.DATAMANAGER].includes(req.tokenUser?.role_id)){
                resultedData = await this.userFormsService.dataManagerFindOne(where);
            }else{
                resultedData = await this.userFormsService.findOne(where);
            }
            let physicianTypeName 
            if(resultedData && resultedData.formInstructions && resultedData.formInstructions.program_custom_name !== null){
                physicianTypeName = JSON.parse(resultedData?.formInstructions?.program_custom_name)
            }
            let tobacco_text =''
            let tobacco_cessation_text =''
            let tobaccoOption=[]
            if(resultedData?.form_id == 4){
                tobaccoOption = [ { id: 1, value: "Non-tobacco user" }, { id: 2, value: "Tobacco user" }, { id: 3, value: "Tobacco user planning on participating in a tobacco cessation program" } ];
                tobacco_text = `<p>For purposes of this affidavit, ${resultedData?.company?.company_name} defines tobacco use as smoking cigarettes, clove cigarettes, e-cigarettes, cigars or pipes, or using smokeless tobacco products such as chewing tobacco or snuff.</p></br>`+
                 `<p>If it is unreasonably difficult due to a medical condition for you to achieve the standards for the discount under this program (or it is medically inadvisable for you to attempt to meet the requirements of this program), please contact the ${resultedData?.company?.company_name}  Human Resources and they will work with you to develop another way to qualify for the discount.</p></br>`+
                 `<p><b>Important: Your tobacco use status will be made available to your employer if you completed this affidavit for incentive qualification purposes. &nbsp;&nbsp;Additional questions can be directed to support@zomohealth.com</b></p>`
                if(resultedData && resultedData.formInstructions && resultedData.formInstructions.tobacco_para1 && resultedData.formInstructions.tobacco_para1 != null && resultedData.formInstructions.tobacco_para1 != '' && resultedData.formInstructions.tobacco_para1.trim() != ''){
                    tobacco_text = resultedData?.formInstructions?.tobacco_para1
                }
                // tobacco_cessation_text = `<p>Tobacco Cessation Program Instructions</p>`+
                //     `<p>Welcome to the Tobacco Cessation Program, designed to support you in quitting tobacco use and improving overall health. The program combines education, behavioral strategies, and support systems to help participants overcome nicotine addiction.</p>`+
                //     `<p>Step 1: Enrollment and Assessment<br>Begin by registering with the program and completing an initial assessment. This includes providing your tobacco use history, frequency, type of tobacco consumed, and any previous attempts to quit. The assessment helps create a personalized quit plan.</p>`+
                //     `<p>Step 2: Setting a Quit Date<br>Choose a specific date to stop using tobacco. This allows your body and mind to prepare and helps you commit mentally. Gradual reduction methods may be suggested if immediate cessation is challenging.</p>`+
                //     `<p>Step 3: Behavioral and Counseling Support<br>Attend regular counseling sessions, either one-on-one or in group settings. Learn coping strategies to manage cravings, stress, and triggers. Techniques include mindfulness, habit replacement, and motivational support.</p>`
                if(resultedData && resultedData.formInstructions && resultedData.formInstructions.tobacco_cessation_text && resultedData.formInstructions.tobacco_cessation_text != null && resultedData.formInstructions.tobacco_cessation_text != '' && resultedData.formInstructions.tobacco_cessation_text.trim() != ''){
                    tobacco_cessation_text = resultedData?.formInstructions?.tobacco_cessation_text
                }
            }
            let defaultType = {
                1: "Physician Visit Form",
                2: "Dental Visit Form",
                3: "Optometry/ Ophthalmology Visit Form",
                5: "Biometric Screening Form",
                6: "Age/Gender Preventive Screening Form",
            };
            let mergedType = {};
            if (physicianTypeName && typeof physicianTypeName === "object" && physicianTypeName !== undefined) {
                Object.keys({ ...defaultType, ...physicianTypeName }).forEach((key) => {
                    let value = physicianTypeName[key]?.trim();
                    mergedType[key] = (value && value.length > 0)? physicianTypeName[key]: defaultType[Number(key)]
                });
                physicianTypeName = mergedType
            }else{
                physicianTypeName = defaultType
            }
            const getList = await this.formInstructionsService.findOne({company_id: postData?.org_id ?? resultedData?.org_id, status: Not(5)});
            const allowedExt:string[] = ['jpg', 'jpeg', 'png', 'pdf', 'heic', 'docx', 'doc'];
            let userformsattachments:UserFormsAttachmentsEntity | null = await this.userFormsAttachmentsService.getOne({user_form_id: resultedData?.id,name: Raw(alias => `LOWER(SUBSTRING_INDEX(${alias}, '.', -1)) IN (${allowedExt.map(ext => `'${ext}'`).join(',')})`)},['name','user_form_id'])
            resultedData['formInstructions'] = getList;
            resultedData['approval_type'] = 0;
            resultedData['Userformsattachments'] = userformsattachments;
            resultedData = <any>(
                await this.commonArrayService.formatToDto(UserFormsDto, resultedData, req.lang)
            );
            resultedData['physicianTypeList']=physicianTypeName
            if(tobacco_text != ''){
                resultedData['tobacco_text'] = tobacco_text
            }
            if(tobacco_cessation_text != ''){
                resultedData['tobacco_cessation_text'] = tobacco_cessation_text
            }
            if(tobaccoOption.length != 0){
                resultedData['tobaccoOption'] = tobaccoOption
            }
            if (req.tokenUser?.role_id != appConstant.ROLE.ADMIN) {
                if (resultedData?.form_id) {
                    const key = `custo_customeLabel_${Number(resultedData?.form_id) - 1}_${resultedData?.org_id}`;
                    const translatedProgramCustomName = await this.translatorService.frontendReadTranslation(
                        req.lang,
                        key,
                        `/LC_MESSAGES/HealthForms/SubmitForm/${resultedData?.org_id}`,
                        "dynamic"
                    );
                    if (translatedProgramCustomName && translatedProgramCustomName !== key) {
                        if (resultedData?.formInstructions && resultedData?.formInstructions?.form) {
                            resultedData.formInstructions.form = translatedProgramCustomName;
                        }
                    } else {
                        resultedData.formInstructions.form = await this.translatorService.frontendReadTranslation(req.lang, resultedData?.formInstructions?.form,'/LC_MESSAGES/HealthForms/SubmitForm','static');
                    }
                }
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: resultedData,
                message: await this.translatorService.frontendReadTranslation(req.lang, "Success"),
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
    async list(@Req() req: Request, @Res() res: Response, @Body() postData: ListUserFormInput) {
        try {
            if (!postData?.org_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let resultedData = await this.userFormsService.listRecord(["id","org_id","is_history","user_id","form_id","zip_filename","decline_reason","status","popup_status","added_date","updated_date"],{...postData});
            resultedData = <any>(
                await this.commonArrayService.formatToDto(UserFormsDto, resultedData, req.lang)
            );
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: resultedData,
                message: await this.translatorService.frontendReadTranslation(req.lang, "Success"),
            });
        } catch (error) {
            this.activityLogService.error_log(req.tokenUser?.id,req?.originalUrl, error?.message, error, req);
            throw new HttpException(
                {
                  statusCode: 401,
                  success: 0,
                  error: 1,
                  message: error?.message,
                  data: [],
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }
    @UseGuards(AccessGuard)
    @Post('submitted-form')
    async submitFormPaginate(@Req() req, @Res() res, @Body() postData: any) {
        try {
            const userId = req.tokenUser?.id;
            postData = this.commonService.sanitizePayload(postData);

            const page = Math.max(Number(postData?.page) || 1, 1);
            const limit = Math.min(Math.max(Number(postData?.limit) || 10, 1), 100);
            const start = (page - 1) * limit;
            const end = start + limit;

            const normalizeDateTs = (item: any): number => {
            const candidates = [item?.date_obtain, item?.date_obtain_copy, item?.date_completed, item?.created, item?.updated_at];
            for (const d of candidates) {
                if (d) {
                const ts = new Date(d).getTime();
                if (Number.isFinite(ts)) return ts;
                }
            }
            return 0;
            };

            const safeFormat = async (dtoClass: any, rows: any[]) => {
            if (!rows || !rows.length) return [];
            return <any>(await this.commonArrayService.formatToDto(dtoClass, rows, req.lang));
            };

            const buildFilters = (dateColumn: string): string => {
            let where = `1=1`;
            if (postData?.date_obtain) {
                let startDate = moment(postData?.date_obtain).startOf('day').format('YYYY-MM-DD HH:mm:ss');
                let endDate = moment(postData?.date_obtain).endOf('day').format('YYYY-MM-DD HH:mm:ss');
                where += ` AND (${dateColumn} >= '${startDate}' AND ${dateColumn} <= '${endDate}')`;
            }
            if (postData?.search_str) {
                where += this.commonService.generateDynamicSearchQuery(postData?.search_str ?? '', ['user.first_name', 'user.last_name', 'full_name']);
            }
            return where;
            };

            let biometricsWhere = `biometrics.enter_by = ${userId}`;
            if (postData?.id) biometricsWhere += ` AND biometrics.user_id = ${postData.id}`;
            biometricsWhere += ` AND ${buildFilters('biometrics.created')}`;
            let biometricsresultedData = await this.biometricsService.submittedFormlist(
                biometricsWhere,
                null,
                ['biometrics.created AS date_obtain','biometrics.activity_id AS activity_id','user.first_name AS first_name','user.last_name AS last_name','company.id AS company_id','formInstructions.program_custom_name AS program_custom_name','1 AS form_id']
            );
            biometricsresultedData = await safeFormat(SubmmittedFormsDto, biometricsresultedData);

            let tobaccoWhere = `tu.generated_by = ${userId} AND tu.status != 2`;
            if (postData?.id) tobaccoWhere += ` AND tu.user_id = ${postData.id}`;
            tobaccoWhere += ` AND ${buildFilters('tu.date_completed')}`;
            let tobaccoresultedData = await this.tobaccoUsesService.submittedFormlist(
                tobaccoWhere,
                null,
                ['tu.date_completed AS date_obtain','user.first_name AS first_name','user.last_name AS last_name','company.id AS company_id','formInstructions.program_custom_name AS program_custom_name','4 AS form_id']
            );
            tobaccoresultedData = await safeFormat(SubmmittedFormsDto, tobaccoresultedData);

            let dentalWhere = `d.enter_by = ${userId} AND d.status != 2`;
            if (postData?.id) dentalWhere += ` AND d.userid = ${postData.id}`;
            dentalWhere += ` AND ${buildFilters('d.date_completed')}`;
            let dentalresultedData = await this.dentistsService.submittedFormlist(
                dentalWhere,
                null,
                ['d.date_completed AS date_obtain','user.first_name AS first_name','user.last_name AS last_name','company.id AS company_id','formInstructions.program_custom_name AS program_custom_name','2 AS form_id']
            );
            dentalresultedData = await safeFormat(SubmmittedFormsDto, dentalresultedData);

            let optometristsWhere = `o.enter_by = ${userId} AND o.status != 2`;
            if (postData?.id) optometristsWhere += ` AND o.userid = ${postData.id}`;
            optometristsWhere += ` AND ${buildFilters('o.date_completed')}`;
            let optometristsresultedData = await this.optometristsService.submittedFormlist(
                optometristsWhere,
                null,
                ['o.date_completed AS date_obtain','user.first_name AS first_name','user.last_name AS last_name','company.id AS company_id','formInstructions.program_custom_name AS program_custom_name','3 AS form_id']
            );
            optometristsresultedData = await safeFormat(SubmmittedFormsDto, optometristsresultedData);

            let merged: any[] = [
            ...(biometricsresultedData || []),
            ...(tobaccoresultedData || []),
            ...(dentalresultedData || []),
            ...(optometristsresultedData || []),
            ].map((item) => ({ ...item, _ts: normalizeDateTs(item) }));

             if (postData?.form_type) {
                const formName = appConstant.HEALTH_FORM_DEFAULT_DATA[postData.form_type];
                merged = merged.filter(postData => postData.form_type == formName);
                
            }

            if (!merged.length) {
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: { total: 0, page, limit, list: [] },
                message: await this.translatorService.frontendReadTranslation(req.lang, "Success"),
            });
            }

            merged.sort((a, b) => b._ts - a._ts);
            const total = merged.length;
            const pages = Math.ceil(total / limit);
            const list = merged.slice(start, end);

            return res.status(HttpStatus.OK).json({
            statusCode: 200,
            success: 1,
            error: 0,
            data: { total, page, limit, pages, list },
            message: await this.translatorService.frontendReadTranslation(req.lang, "Success"),
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
    async translationList(@Req() req: Request, @Res() res: Response, @Body() postData: ListUserFormInput) {
        try {
            if (!postData?.org_id) {
                if ((!postData?.user_id || !postData?.form_id) && req.tokenUser?.role_id != appConstant.ROLE.ADMIN) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
            }
            let joinTable = [tableConstant.COMPANIES.TBL_COMPANY];
            let fields = ["userform.id", "userform.form_id", "userform.user_id", "userform.status", "userform.popup_status",'company.id','company.company_name'];
            let condition = `userform.org_id = ${postData?.org_id} AND company.status !=2`;
            if (postData?.status) {
                condition += ` AND (userform.status = ${postData?.status})`;
            }else{
                condition += ` AND (userform.status != 5)`;
            }
            if(postData?.form_id){
                condition += ` AND (userform.form_id = '${postData?.form_id}')`;
                joinTable.push(tableConstant.TBL_USERS);
                fields = [...fields,...["user.id", "user.first_name", "user.last_name", "user.code", "user.timezone"]];
            }
            let resultedData: any = await this.userFormsService.listRecord(fields, condition, null, joinTable);
            resultedData = <any>(await this.commonArrayService.formatToDto(UserFormsDto, resultedData, req.lang));
            let formList: any[] = [];
            if(!postData?.form_id){
                const getList = await this.formInstructionsService.findOne({ company_id: Number(postData?.org_id), status: Not(5) });
                if (getList?.program_selection?.trim()?.length >= 1) {
                    getList.program_selection = getList.program_selection
                        .split(',')
                        .map(item => item.trim().replace(/s$/i, ''))
                        .filter((value, index, self) => self.indexOf(value) === index)
                        .join(',');
                    const dataArray = getList?.program_selection ? getList?.program_selection?.split(",").map(item => item.trim()).filter(Boolean) : [];
                    let programCustomName = {};
                    if (getList?.program_custom_name && getList.program_custom_name !== null && getList.program_custom_name !== undefined) {
                        programCustomName = JSON.parse(getList.program_custom_name);
                    }
                    const defaultProgramCustomName = { ...appConstant.HEALTH_FORM_DEFAULT_DATA };
                    await Promise.all(
                        [...Array(6)].map(async (_, i) => {
                            const key = `custo_customeLabel_${i}_${postData?.org_id}`;
                            const translatedProgramCustomName = await this.translatorService.frontendReadTranslation(
                                req.lang,
                                key,
                                `/LC_MESSAGES/HealthForms/SubmitForm/${postData?.org_id}`,
                                "dynamic"
                            );
                            if (translatedProgramCustomName && translatedProgramCustomName !== key) {
                                defaultProgramCustomName[i + 1] = translatedProgramCustomName;
                            }
                        })
                    );
                    formList = dataArray.map(id => {
                        return {
                            id,
                            title: defaultProgramCustomName[id] || appConstant.HEALTH_FORM_DEFAULT_DATA[id]
                        };
                    });
                }
            }
            if(postData?.org_id){
                if(postData?.form_id){
                    resultedData = [...new Map(resultedData.filter(ele => ele['user']).map(o => [o['user'].id, o['user']])).values()];
                }
                else{
                    const formIds = new Set(resultedData.map(ele => ele.form_id));
                    resultedData = formList.filter(ele => ele.id && formIds.has(Number(ele.id)));
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
}

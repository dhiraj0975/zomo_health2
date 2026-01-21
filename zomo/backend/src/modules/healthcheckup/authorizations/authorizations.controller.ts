import { fileName, imgFilter } from "@/utils/image-upload.utils";
import { appConstant, CommonDateService, CommonFileService, CommonService, tableConstant } from '@common-constants';
import {
    Body,
    Controller,
    HttpException,
    HttpStatus, Inject,
    Post,
    Put,
    Req,
    Res, UploadedFile,
    UseGuards, UseInterceptors,
} from '@nestjs/common';
import { ClientProxy } from "@nestjs/microservices";
import { FileInterceptor } from "@nestjs/platform-express";
import { Request, Response } from "express";
import { diskStorage } from "multer";
import { lastValueFrom } from "rxjs";
import { ActivityService } from 'src/modules/activity/activity/activity.service';
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import { Not } from 'typeorm';
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import {
    DeleteHealthCheckupInput
} from "../../../input";
import { TranslationService } from "../../translation/translation.service";
import { FormInstructionsService } from '../forminstructions/forminstructions.service';
import { TobaccoUsesService } from '../tobaccouses/tobaccouses.service';
import { AuthorizationsService } from './authorizations.service';
import { AuthorizationInput } from './input';
const path = require('path');
@Controller('health-checkup/authorizations')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class AuthorizationsController {
    constructor(
        private readonly authorizationsService: AuthorizationsService,
        private readonly commonDateService: CommonDateService,
        private readonly tobaccoUsesService: TobaccoUsesService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        private readonly formInstructionsService: FormInstructionsService,
        private readonly activityService: ActivityService,
        private readonly commonFileService: CommonFileService,
        @Inject('COMMON_SERVICE')
        private commonMicroservice: ClientProxy,
        private readonly commonService: CommonService,
    ) {}
    @Post('create')
    @UseInterceptors(
        FileInterceptor('user_sign_image', {
            limits: { fileSize: appConstant.FILE_SIZE },
            storage: diskStorage({
                destination: `${appConstant.USER_IMAGE_PATH}`,
                filename: fileName,
            }),
            fileFilter: imgFilter,
        }),
        AccessGuard
    )
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: AuthorizationInput,@UploadedFile() file: Express.Multer.File) {
        try {
            if (file && file.fieldname === 'user_sign_image' && file.filename) {
                postData.signature = ' ';
            } else if (postData.signature) {
                postData.user_sign_image = ''
            }
            if (!postData?.user_id || !postData?.type_of_form || (!postData?.signature && !file)) {
                if (file && file.fieldname === 'user_sign_image' && file.filename) {
                    await this.commonFileService.removeFileFromLocal(file.path);
                }
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let formName = 'Physician Form';
            let returnMsg = await this.translatorService.frontendReadTranslation(req.lang, "PHYSICIAN_FORM_COMPLETE");
            if(postData?.type_of_form == 'Dental'){
                formName = 'Dental Visit Form';
                returnMsg = await this.translatorService.frontendReadTranslation(req.lang, "DENTAL_FORM_COMPLETE");
            }else if(postData?.type_of_form == 'Optometrist'){
                formName = 'Optometrist Form';
                returnMsg = await this.translatorService.frontendReadTranslation(req.lang, "OPTOMETRIC_FORM_COMPLETE");
            }else if(postData?.type_of_form == 'Tabacco'){
                formName = 'Tobacco Affidavit- Non-tobacco user';
                if(postData?.is_tobacco_user == 2){
                    formName = 'Tobacco Affidavit- Tobacco user';
				}else if(postData?.is_tobacco_user == 3){
                    formName = 'Tobacco Affidavit- Tobacco user participating in a tobacco cessation program';
				}
                returnMsg = await this.translatorService.frontendReadTranslation(req.lang, "TABACCO_FORM_COMPLETE");
            }
            let getActivityId = await this.activityService.findOne({activity_name: formName},'',['activity.id']);
            if(!getActivityId){
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACTIVITY_NOT_FOUND"));
            }else{
                postData['activity_id'] = getActivityId.id;
            }
            if (file && file.fieldname === 'user_sign_image' && file.filename) {
                file.originalname = this.commonFileService.formatFileName(file.originalname);
                let filename = `user/health-checkup/${postData?.user_id}/signimg_${this.commonDateService.DateTimeFormat('now','timestamp')}.${file.originalname.split('.')[file.originalname.split('.').length - 1]}`;
                await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(file.path),  filename: filename, userBucket: 'private'}));
                postData['user_sign_image'] = filename;
            }
            postData['date_completed'] = await this.commonDateService.DateTimeFormat('now', 'YYYY-MM-DD HH:mm:ss').toString();
            if(postData?.type_of_form == 'Physician' || postData?.type_of_form == 'Dental' || postData?.type_of_form == 'Optometrist'){
                await this.authorizationsService.save({...postData});
            }else if(postData?.type_of_form == 'Tabacco'){
                await this.tobaccoUsesService.save({...postData});
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: returnMsg
            });
        } catch (error) {
            if (file && file.fieldname === 'user_sign_image' && file.filename) {
                await this.commonFileService.removeFileFromLocal(file.path);
            }
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
    @Put('update')
    @UseInterceptors(
        FileInterceptor('user_sign_image', {
            limits: { fileSize: appConstant.FILE_SIZE },
            storage: diskStorage({
                destination: `${appConstant.USER_IMAGE_PATH}`,
                filename: fileName,
            }),
            fileFilter: imgFilter,
        }),
        AccessGuard
    )
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: AuthorizationInput, @UploadedFile() file: Express.Multer.File) {
        try {
            if (file && file.fieldname === 'user_sign_image' && file.filename) {
                postData.signature = ' ';
            } else if (postData.signature) {
                postData.user_sign_image = ''
            }
            if (!postData?.user_id || !postData?.type_of_form || (!postData?.signature && !file)  || !postData?.id) {
                if (file && file.fieldname === 'user_sign_image' && file.filename) {
                    await this.commonFileService.removeFileFromLocal(file.path);
                }
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let formName = 'Physician Form';
            let returnMsg = await this.translatorService.frontendReadTranslation(req.lang, "PHYSICIAN_FORM_UPDATED");
            if(postData?.type_of_form == 'Dental'){
                formName = 'Dental Visit Form';
                returnMsg = await this.translatorService.frontendReadTranslation(req.lang, "DENTAL_FORM_UPDATED");
            }else if(postData?.type_of_form == 'Optometrist'){
                formName = 'Optometrist Form';
                returnMsg = await this.translatorService.frontendReadTranslation(req.lang, "OPTOMETRIC_FORM_UPDATED");
            }else if(postData?.type_of_form == 'Tabacco'){
                formName = 'Tobacco Affidavit- Non-tobacco user';
                if(postData?.is_tobacco_user == 2){
                    formName = 'Tobacco Affidavit- Tobacco user';
				}else if(postData?.is_tobacco_user == 3){
                    formName = 'Tobacco Affidavit- Tobacco user participating in a tobacco cessation program';
				}
                returnMsg = await this.translatorService.frontendReadTranslation(req.lang, "TABACCO_FORM_UPDATED");
            }
            let getActivityId = await this.activityService.findOne({activity_name: formName},'',['activity.id']);
            if(!getActivityId){
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACTIVITY_NOT_FOUND"));
            }else{
                postData['activity_id'] = getActivityId.id;
            }
            if (file && file.fieldname === 'user_sign_image' && file.filename) {
                file.originalname = this.commonFileService.formatFileName(file.originalname);
                let filename = `user/health-checkup/${postData?.user_id}/signimg_${this.commonDateService.DateTimeFormat('now','timestamp')}.${file.originalname.split('.')[file.originalname.split('.').length - 1]}`;
                await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(file.path),  filename: filename, userBucket: 'private'}));
                postData['user_sign_image'] = filename;
            }
            postData['date_completed'] = await this.commonDateService.DateTimeFormat('now', 'YYYY-MM-DD HH:mm:ss').toString();
            if(postData?.type_of_form == 'Physician' || postData?.type_of_form == 'Dental' || postData?.type_of_form == 'Optometrist'){
                await this.authorizationsService.update({ id: postData?.id, user_id: postData?.user_id },{...postData});
                const recordDetails = await this.authorizationsService.findOne({ id: postData?.id, user_id: postData?.user_id, status: Not(2) });
                this.activityLogService.create(recordDetails, postData, tableConstant.HEALTH_CHECKUP.TBL_HC_AUTHORIZATIONS, req.tokenUser?.id);
            }else if(postData?.type_of_form == 'Tabacco'){
                await this.tobaccoUsesService.update({ id: postData?.id, user_id: postData?.user_id },{...postData});
                const recordDetails = await this.tobaccoUsesService.findOne({ id: postData?.id, user_id: postData?.user_id, status: Not(2) });
                this.activityLogService.create(recordDetails, postData, tableConstant.HEALTH_CHECKUP.TBL_HC_TOBACCO_USES, req.tokenUser?.id);
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: returnMsg
            });
        } catch (error) {
            if (file && file.fieldname === 'user_sign_image' && file.filename) {
                await this.commonFileService.removeFileFromLocal(file.path);
            }
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
    @Post('delete')
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: DeleteHealthCheckupInput) {
        try {
            if (!postData?.id || !postData?.user_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.authorizationsService.findOne({
                id: postData?.id,
                user_id: postData?.user_id, status: Not(2)
            });
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            await this.authorizationsService.update({id: postData?.id, user_id: postData?.user_id},{status: 2});
            this.activityLogService.create(recordDetails, {signature: recordDetails}, tableConstant.HEALTH_CHECKUP.TBL_HC_AUTHORIZATIONS, req.tokenUser?.id, 'delete');
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
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
    @Post('get-one')
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: AuthorizationInput) {
        try {
            if (!postData?.form_type || !postData?.user_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let companyName = req?.tokenUser?.company?.company_name ? req?.tokenUser?.company?.company_name : '';
            let timeZone = req?.tokenUser?.timezone ? req.tokenUser?.timezone : 'UTC';
            let companyid = req?.tokenUser?.org_id ? req?.tokenUser?.org_id : 0;
            let resultedData = {};
            let returnDatas = {};
            if(postData?.form_type != 'Tabacco'){
                resultedData = await this.authorizationsService.findOne({user_id: postData?.user_id, type_of_form: postData?.form_type, status: Not(2)});
            }else{
                resultedData = await this.tobaccoUsesService.findOne({user_id: postData?.user_id, type_of_form: postData?.form_type, status: Not(2)});
                var tobaccoUsesData = await this.formInstructionsService.findOne({company_id: companyid, status: Not(5)});
            }
            if(resultedData && Object.keys(resultedData).length > 0){
                const monthName = this.commonDateService.DateTimeFormat(resultedData['date_completed'], 'MMM', '', timeZone);
                const translatedMonth = await this.translatorService.frontendReadTranslation(req.lang, monthName.toString(), `/LC_MESSAGES/Common/Month`, `static`);
                const timeData = this.commonDateService.DateTimeFormat(resultedData['date_completed'], 'hh:mm', '', timeZone);
                const timeapData = this.commonDateService.DateTimeFormat(resultedData['date_completed'], 'A', '', timeZone);
                const translatedTime = await this.translatorService.frontendReadTranslation(req.lang, timeapData.toString(), `/LC_MESSAGES/Common/Month`, `static`);
                resultedData['date_completed'] = translatedMonth+' '+this.commonDateService.DateTimeFormat(resultedData['date_completed'], 'DD, YYYY','' , timeZone)+' '+timeData+' '+translatedTime;
                returnDatas['filldata'] = resultedData;
            }
            let contentData = '';
            if(postData?.form_type == 'Physician'){
                let namingdata = 'Physician_Visit_Packet';
                if(companyid == 1095){
                    returnDatas['title'] = 'HIPPA Release';
                    namingdata = 'Annual_Physician_Packet';
                }
                contentData += `<p>`+await this.translatorService.frontendReadTranslation(req.lang, 'The', `/LC_MESSAGES/Activities/Activities`,`static`)+` ${companyName} `+await this.translatorService.frontendReadTranslation(req.lang, 'Wellness Program is a free and voluntary program offered through', `/LC_MESSAGES/Activities/Activities`,`static`)+` <b>`+await this.translatorService.frontendReadTranslation(req.lang, 'ZomoHealth', `/LC_MESSAGES/Activities/Activities`,`static`)+`</b>.</p>`;
                if(companyid == 804){
                    contentData += `<p>`+await this.translatorService.frontendReadTranslation(req.lang, 'preventive_healthcare_visits_and_tobacco_cessation', `/LC_MESSAGES/Activities/Activities`,`static`)+`.</p>`;
                    contentData += `<p>`+await this.translatorService.frontendReadTranslation(req.lang, 'The Physician Visit Form and any personal health information will', `/LC_MESSAGES/Activities/Activities`,`static`)+` <b>`+await this.translatorService.frontendReadTranslation(req.lang, 'only', `/LC_MESSAGES/Activities/Activities`,`static`)+`</b> `+await this.translatorService.frontendReadTranslation(req.lang, 'accessed_by_ZomoHealth', `/LC_MESSAGES/Activities/Activities`,`static`)+`. ${companyName} `+ await this.translatorService.frontendReadTranslation(req.lang, 'no_access_participants_personal_health_info', `/LC_MESSAGES/Activities/Activities`,`static`) +` ${companyName} `+ await this.translatorService.frontendReadTranslation(req.lang, 'will know if you participated but your personal health information will not be shared', `/LC_MESSAGES/Activities/Activities`,`static`) +`.</p>`;
                    contentData += `<p>`+await this.translatorService.frontendReadTranslation(req.lang, 'If you agree with the statements below, please sign this form', `/LC_MESSAGES/Activities/Activities`,`static`)+`. <b>`+await this.translatorService.frontendReadTranslation(req.lang, 'Be sure to give this form to your healthcare providers office when you have your preventive health screening', `/LC_MESSAGES/Activities/Activities`,`static`)+`</b>.</p>`;
                    contentData += `<p><ul><li>`+await this.translatorService.frontendReadTranslation(req.lang, 'authorize_all_personal_health_info_Physician_Visit_Form', `/LC_MESSAGES/Activities/Activities`,`static`)+`.</li><li>`+await this.translatorService.frontendReadTranslation(req.lang, 'My permission is voluntary. I can change my mind and cancel this consent at any time by contacting', `/LC_MESSAGES/Activities/Activities`,`static`)+` support@zomohealth.com. <li>`+await this.translatorService.frontendReadTranslation(req.lang, 'cancelling_my_prior_consent', `/LC_MESSAGES/Activities/Activities`,`static`)+`.</li></ul></p>`;
                }else{
                    if(companyid == 831){
                        contentData += `<p>`+await this.translatorService.frontendReadTranslation(req.lang, 'results_of_annual_preventive_care_visit', `/LC_MESSAGES/Activities/Activities`,`static`)+`.</p>`;
                        contentData += `<p>`+await this.translatorService.frontendReadTranslation(req.lang, 'The Physician Visit Packet and any personal health information will', `/LC_MESSAGES/Activities/Activities`,`static`)+` <b>`+await this.translatorService.frontendReadTranslation(req.lang, 'only', `/LC_MESSAGES/Activities/Activities`,`static`)+`</b> `+await this.translatorService.frontendReadTranslation(req.lang, 'accessed_by_ZomoHealth', `/LC_MESSAGES/Activities/Activities`,`static`)+`. ${companyName} `+ await this.translatorService.frontendReadTranslation(req.lang, 'no_access_participants_personal_health_info', `/LC_MESSAGES/Activities/Activities`,`static`) +` ${companyName} `+ await this.translatorService.frontendReadTranslation(req.lang, 'will know if you participated but your personal health information will not be shared', `/LC_MESSAGES/Activities/Activities`,`static`) +`.</p>`;
                        contentData += `<p>`+await this.translatorService.frontendReadTranslation(req.lang, 'If you agree with the statements below, please sign this form', `/LC_MESSAGES/Activities/Activities`,`static`)+`.</p>`;
                    }else{
                        if(companyid == 1143 || companyid == 1145){
                            let nicotine_cessation_data = await this.translatorService.frontendReadTranslation(req.lang, 'preventive_healthcare_visits_nicotine_cessation_zomo', `/LC_MESSAGES/Activities/Activities`,`static`);
                            if(nicotine_cessation_data == 'preventive_healthcare_visits_nicotine_cessation_zomo'){
                                nicotine_cessation_data = 'The Wellness Program encourages you to engage in preventive healthcare visits, as well as nicotine cessation. This form allows your healthcare provider to share the results of your annual preventive care visit (Physician Visit Packet) with ZomoHealth';
                            }
                            contentData += `<p>`+nicotine_cessation_data+`.</p>`;
                        }else if (companyid == 1095){
                            contentData += `<p>`+await this.translatorService.frontendReadTranslation(req.lang, 'The Wellness Program encourages you to engage in preventive healthcare visits, as well as tobacco cessation', `/LC_MESSAGES/Activities/Activities`,`static`)+`.</p>`;
                        }else{
                            contentData += `<p>`+await this.translatorService.frontendReadTranslation(req.lang, 'The Wellness Program encourages you to engage in preventive healthcare visits, as well as tobacco cessation', `/LC_MESSAGES/Activities/Activities`,`static`)+` (${companyName}) `+await this.translatorService.frontendReadTranslation(req.lang, 'with ZomoHealth', `/LC_MESSAGES/Activities/Activities`,`static`)+`.</p>`;
                        }
                        contentData += `<p>`+await this.translatorService.frontendReadTranslation(req.lang, `The ${namingdata} and any personal health information will`, `/LC_MESSAGES/Activities/Activities`,`static`)+` <b>`+await this.translatorService.frontendReadTranslation(req.lang, 'only', `/LC_MESSAGES/Activities/Activities`,`static`)+`</b> `+await this.translatorService.frontendReadTranslation(req.lang, 'accessed_by_ZomoHealth', `/LC_MESSAGES/Activities/Activities`,`static`)+`. ${companyName} `+ await this.translatorService.frontendReadTranslation(req.lang, 'no_access_participants_personal_health_info', `/LC_MESSAGES/Activities/Activities`,`static`) +` ${companyName} `+ await this.translatorService.frontendReadTranslation(req.lang, 'will know if you participated but your personal health information will not be shared', `/LC_MESSAGES/Activities/Activities`,`static`) +`.</p>`;
                        contentData += `<p>`+await this.translatorService.frontendReadTranslation(req.lang, 'If you agree with the statements below, please sign this form', `/LC_MESSAGES/Activities/Activities`,`static`)+` <b>`+ ((companyid != 1095 ) ? await this.translatorService.frontendReadTranslation(req.lang, 'Be sure to give this form to your healthcare providers office when you have your preventive health screening', `/LC_MESSAGES/Activities/Activities`,`static`) : '')+`</b>.</p>`;
                    }
                    contentData += `<p><ul><li>`+await this.translatorService.frontendReadTranslation(req.lang, `authorize_all_personal_health_info_${namingdata}`, `/LC_MESSAGES/Activities/Activities`,`static`)+`.</li><li>`+await this.translatorService.frontendReadTranslation(req.lang, 'My permission is voluntary. I can change my mind and cancel this consent at any time by contacting', `/LC_MESSAGES/Activities/Activities`,`static`)+` support@zomohealth.com. <li>`+await this.translatorService.frontendReadTranslation(req.lang, 'cancelling_my_prior_consent', `/LC_MESSAGES/Activities/Activities`,`static`)+`.</li></ul></p>`;
                }
            }else if(postData?.form_type == 'Dental'){
                contentData += `<p>`+await this.translatorService.frontendReadTranslation(req.lang, 'The', `/LC_MESSAGES/Activities/Activities`,`static`)+` ${companyName} `+await this.translatorService.frontendReadTranslation(req.lang, 'Wellness Program is a free and voluntary program offered through', `/LC_MESSAGES/Activities/Activities`,`static`)+` <b>`+await this.translatorService.frontendReadTranslation(req.lang, 'ZomoHealth', `/LC_MESSAGES/Activities/Activities`,`static`)+`</b>.</p>`;
                contentData += `<p>`+await this.translatorService.frontendReadTranslation(req.lang, 'engage_preventive_dentist_visits', `/LC_MESSAGES/Activities/Activities`,`static`)+`.</p>`;
                contentData += `<p>`+await this.translatorService.frontendReadTranslation(req.lang, 'The Dentist Visit Packet and any personal health information will', `/LC_MESSAGES/Activities/Activities`,`static`)+` <b>`+await this.translatorService.frontendReadTranslation(req.lang, 'only', `/LC_MESSAGES/Activities/Activities`,`static`)+`</b> `+await this.translatorService.frontendReadTranslation(req.lang, 'accessed_by_ZomoHealth', `/LC_MESSAGES/Activities/Activities`,`static`)+`. ${companyName} `+ await this.translatorService.frontendReadTranslation(req.lang, 'no_access_participants_personal_health_info', `/LC_MESSAGES/Activities/Activities`,`static`) +` ${companyName} `+ await this.translatorService.frontendReadTranslation(req.lang, 'will know if you participated but your personal health information will not be shared', `/LC_MESSAGES/Activities/Activities`,`static`) +`.</p>`;
                contentData += `<p>`+await this.translatorService.frontendReadTranslation(req.lang, 'If you agree with the statements below, please sign this form', `/LC_MESSAGES/Activities/Activities`,`static`)+`. <b>`+await this.translatorService.frontendReadTranslation(req.lang, 'Be sure to give this form to your dentists office when you have your preventive visit', `/LC_MESSAGES/Activities/Activities`,`static`)+`</b>.</p>`;
                contentData += `<p><ul><li>`+await this.translatorService.frontendReadTranslation(req.lang, 'authorize_all_personal_health_info_Dentist_Visit_Packet', `/LC_MESSAGES/Activities/Activities`,`static`)+`.</li><li>`+await this.translatorService.frontendReadTranslation(req.lang, 'My permission is voluntary. I can change my mind and cancel this consent at any time by contacting', `/LC_MESSAGES/Activities/Activities`,`static`)+` support@zomohealth.com. <li>`+await this.translatorService.frontendReadTranslation(req.lang, 'cancelling_my_prior_consent', `/LC_MESSAGES/Activities/Activities`,`static`)+`.</li></ul></p>`;
            }else if(postData?.form_type == 'Optometrist'){
                contentData += `<p>`+await this.translatorService.frontendReadTranslation(req.lang, 'The', `/LC_MESSAGES/Activities/Activities`,`static`)+` ${companyName} `+await this.translatorService.frontendReadTranslation(req.lang, 'Wellness Program is a free and voluntary program offered through', `/LC_MESSAGES/Activities/Activities`,`static`)+` <b>`+await this.translatorService.frontendReadTranslation(req.lang, 'ZomoHealth', `/LC_MESSAGES/Activities/Activities`,`static`)+`</b>.</p>`;
                contentData += `<p>`+await this.translatorService.frontendReadTranslation(req.lang, 'engage_preventive_optometrist_visits', `/LC_MESSAGES/Activities/Activities`,`static`)+`.</p>`;
                contentData += `<p>`+await this.translatorService.frontendReadTranslation(req.lang, 'The Optometrist Visit Packet and any personal health information will', `/LC_MESSAGES/Activities/Activities`,`static`)+` <b>`+await this.translatorService.frontendReadTranslation(req.lang, 'only', `/LC_MESSAGES/Activities/Activities`,`static`)+`</b> `+await this.translatorService.frontendReadTranslation(req.lang, 'accessed_by_ZomoHealth', `/LC_MESSAGES/Activities/Activities`,`static`)+`. ${companyName} `+ await this.translatorService.frontendReadTranslation(req.lang, 'no_access_participants_personal_health_info', `/LC_MESSAGES/Activities/Activities`,`static`) +` ${companyName} `+ await this.translatorService.frontendReadTranslation(req.lang, 'will know if you participated but your personal health information will not be shared', `/LC_MESSAGES/Activities/Activities`,`static`) +`.</p>`;
                contentData += `<p>`+await this.translatorService.frontendReadTranslation(req.lang, 'If you agree with the statements below, please sign this form', `/LC_MESSAGES/Activities/Activities`,`static`)+`. <b>`+await this.translatorService.frontendReadTranslation(req.lang, 'Be sure to give this form to your optometrists office when you have your preventive visit', `/LC_MESSAGES/Activities/Activities`,`static`)+`</b>.</p>`;
                contentData += `<p><ul><li>`+await this.translatorService.frontendReadTranslation(req.lang, 'authorize_all_personal_health_info_Optometrist_Visit_Packet', `/LC_MESSAGES/Activities/Activities`,`static`)+`.</li><li>`+await this.translatorService.frontendReadTranslation(req.lang, 'My permission is voluntary. I can change my mind and cancel this consent at any time by contacting', `/LC_MESSAGES/Activities/Activities`,`static`)+` support@zomohealth.com. <li>`+await this.translatorService.frontendReadTranslation(req.lang, 'cancelling_my_prior_consent', `/LC_MESSAGES/Activities/Activities`,`static`)+`.</li></ul></p>`;
            }else if(postData?.form_type == 'Tabacco'){
                if(tobaccoUsesData?.tobacco_para1 && tobaccoUsesData?.tobacco_para1 != ''){
                    let tobacco_para1 = await  this.translatorService.frontendReadTranslation(req.lang, `tobacco_para1_${companyid}`, `/LC_MESSAGES/Activities/${companyid}/Activities`,`dynamic`);
                    if(tobacco_para1 == `tobacco_para1_${companyid}`){
                        tobacco_para1 = tobaccoUsesData?.tobacco_para1;
                    }
                    contentData += tobacco_para1;
                }else{
                    contentData += `<p>`+await this.translatorService.frontendReadTranslation(req.lang, 'For purposes of this affidavit', `/LC_MESSAGES/Activities/Activities`,`static`)+`, ${companyName} `+await this.translatorService.frontendReadTranslation(req.lang, 'defines', `/LC_MESSAGES/Activities/Activities`,`static`)+` `+ ((companyid != 1141) ? await this.translatorService.frontendReadTranslation(req.lang, 'tobacco', `/LC_MESSAGES/Activities/Activities`,`static`) : await this.translatorService.frontendReadTranslation(req.lang, 'nicotine', `/LC_MESSAGES/Activities/Activities`,`static`))+` `+ await this.translatorService.frontendReadTranslation(req.lang, 'use as smoking cigarettes, clove cigarettes, e-cigarettes, cigars or pipes, or using smokeless', `/LC_MESSAGES/Activities/Activities`,`static`) +` `+((companyid != 1141) ? await this.translatorService.frontendReadTranslation(req.lang, 'tobacco', `/LC_MESSAGES/Activities/Activities`,`static`) : await this.translatorService.frontendReadTranslation(req.lang, 'nicotine', `/LC_MESSAGES/Activities/Activities`,`static`))+` `+await this.translatorService.frontendReadTranslation(req.lang, 'products such as chewing tobacco or snuff', `/LC_MESSAGES/Activities/Activities`,`static`)+`.</p>`;
                    if(companyid != 1108){
                        if(companyid != 1160){
                            contentData += `<p>`+await this.translatorService.frontendReadTranslation(req.lang, 'If it is unreasonably difficult due to a medical condition for you to achieve the standards for the discount under this program (or it is medically inadvisable for you to attempt to meet the requirements of this program), please contact the', `/LC_MESSAGES/Activities/Activities`,`static`)+` ${companyName}`+ await this.translatorService.frontendReadTranslation(req.lang, 'Human Resources and they will work with you to develop another way to qualify for the discount', `/LC_MESSAGES/Activities/Activities`,`static`) +`.</p>`;
                        }
                    }
                    if(companyid == 969 || companyid == 1141){
                        contentData += `<p></b>`+await this.translatorService.frontendReadTranslation(req.lang, 'Important Your nicotine use status will be made available to your employer if you completed this affidavit for incentive qualification purposes. Additional questions can be directed to', `/LC_MESSAGES/Activities/Activities`,`static`)+` support@zomohealth.com.</b></p>`;
                    }else{
                        contentData += `<p></b>`+await this.translatorService.frontendReadTranslation(req.lang, 'Important Your tobacco use status will be made available to your employer if you completed this affidavit for incentive qualification purposes. Additional questions can be directed to', `/LC_MESSAGES/Activities/Activities`,`static`)+` support@zomohealth.com.</b></p>`;
                    }
                }
                if(tobaccoUsesData?.tobacco_cessation_text && tobaccoUsesData?.tobacco_cessation_text != ''){
                    let tobacco_cessation_text = await  this.translatorService.frontendReadTranslation(req.lang, `tobacco_cessation_text_${companyid}`, `/LC_MESSAGES/Activities/${companyid}/Activities`,`dynamic`);
                    if(tobacco_cessation_text == `tobacco_cessation_text_${companyid}`){
                        tobacco_cessation_text = tobaccoUsesData?.tobacco_cessation_text;
                    }
                    returnDatas['tobacco_cessation_text'] = tobacco_cessation_text;
                }
            }
            returnDatas['contentData'] = contentData;
            if(postData?.form_type == 'Tabacco'){
                if(companyid == 614 || companyid == 1141){
                    returnDatas['tobaccoOptions'] = [{ id : 1, name : await this.translatorService.frontendReadTranslation(req.lang, 'Non-nicotine user', `/LC_MESSAGES/Activities/Activities`,`static`)}, { id : 2, name : await this.translatorService.frontendReadTranslation(req.lang, 'Nicotine user', `/LC_MESSAGES/Activities/Activities`,`static`)}, { id : 3, name : await this.translatorService.frontendReadTranslation(req.lang, 'Nicotine user planning on participating in a nicotine cessation program', `/LC_MESSAGES/Activities/Activities`,`static`)}];
                }else{
                    returnDatas['tobaccoOptions'] = [{ id : 1, name : await this.translatorService.frontendReadTranslation(req.lang, 'Non-tobacco user', `/LC_MESSAGES/Activities/Activities`,`static`)}, { id : 2, name : await this.translatorService.frontendReadTranslation(req.lang, 'Tobacco user', `/LC_MESSAGES/Activities/Activities`,`static`)}, { id : 3, name : await this.translatorService.frontendReadTranslation(req.lang, 'Tobacco user planning on participating in a tobacco cessation program', `/LC_MESSAGES/Activities/Activities`,`static`)}];
                }
            }
            returnDatas['otherTitles'] = [{ signature : await this.translatorService.frontendReadTranslation(req.lang, 'Signature', `/LC_MESSAGES/Activities/Activities`,`static`), name : await this.translatorService.frontendReadTranslation(req.lang, 'Name', `/LC_MESSAGES/Activities/Activities`,`static`), completedDate : await this.translatorService.frontendReadTranslation(req.lang, 'Completed Date', `/LC_MESSAGES/Activities/Activities`,`static`), memberId : await this.translatorService.frontendReadTranslation(req.lang, 'Member ID', `/LC_MESSAGES/Activities/Activities`,`static`), tobaccoHereby : await this.translatorService.frontendReadTranslation(req.lang, 'I hereby certify that I am a', `/LC_MESSAGES/Activities/Activities`,`static`), lastCompletedDate : await this.translatorService.frontendReadTranslation(req.lang, 'Last Completed Date', `/LC_MESSAGES/Activities/Activities`,`static`) }];
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: returnDatas,
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
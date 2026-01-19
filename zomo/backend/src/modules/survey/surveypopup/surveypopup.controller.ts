import { appConstant, CommonArrayService, CommonFileService, CommonService, SurveyPopupDto, tableConstant } from '@common-constants';
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
import { diskStorage } from 'multer';
import { lastValueFrom } from 'rxjs';
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import { fileName, filesFilter } from 'src/utils/image-upload.utils';
import { Not } from "typeorm";
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import { CreateSurveyPopupInput, PaginationSurveyInput } from "../../../input";
import { TranslationService } from "../../translation/translation.service";
import { FrontService } from "../front/front.service";
import { SurveyPopupService } from './surveypopup.service';
const path = require('path');
@Controller('survey/popup')
@UseGuards(TokenGuard, RoleGuard)
export class SurveyPopupController {
    constructor(
        private readonly surveyPopupService: SurveyPopupService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        private readonly frontService: FrontService,
        @Inject('COMMON_SERVICE')
        private commonMicroservice: ClientProxy,
    ) {}
    @UseGuards(AccessGuard)
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginationSurveyInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let where = ((postData?.status != undefined || postData?.status != null) && postData?.status != '') ? `survey.status = ${postData?.status} `: ([appConstant.ROLE.ADMIN,appConstant.ROLE.ORGADMIN,appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER].includes(req.tokenUser?.role_id)) ? `survey.status != '2' ` : `survey.status NOT IN(2,0) `;
            if (postData?.org_id) {
                where += `AND survey.org_id = ${postData?.org_id}`;
            }
            if (postData?.search_str) {
                where +=  this.commonService.generateDynamicSearchQuery(postData?.search_str,['survey.title','survey.description','survey.department_string']);
            }
            const resultedData = await this.surveyPopupService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(SurveyPopupDto, resultedData['list'], req.lang)
            );
            if(resultedData['list'] && resultedData['list'].length){
                await Promise.all(resultedData['list'].map(async (ele)=>{
                    let customeName;
                    if(ele.title){
                        customeName = await this.translatorService.frontendReadTranslation(req.lang, `survey_popup_title_${ele['org_id']}_${ele['id']}`, `/LC_MESSAGES/Common/SurveyPopup/${postData?.org_id}/${ele.id}`,`dynamic`);
                        if (customeName != `survey_popup_title_${ele['org_id']}_${ele['id']}`) {
                            ele.title = customeName;
                        }
                    }
                    if(ele.description){
                        customeName = await this.translatorService.frontendReadTranslation(req.lang, `survey_popup_description_${ele['org_id']}_${ele['id']}`, `/LC_MESSAGES/Common/SurveyPopup/${postData?.org_id}/${ele.id}`,`dynamic`);
                        if (customeName != `survey_popup_description_${ele['org_id']}_${ele['id']}`) {
                            ele.description = customeName;
                        }
                    }
                    if(ele.additional_note){
                        customeName = await this.translatorService.frontendReadTranslation(req.lang, `survey_popup_note_${ele['org_id']}_${ele['id']}`, `/LC_MESSAGES/Common/SurveyPopup/${postData?.org_id}/${ele.id}`,`dynamic`);
                        if (customeName != `survey_popup_note_${ele['org_id']}_${ele['id']}`) {
                            ele.additional_note = customeName;
                        }
                    }
                    if(ele.pass_need_text){
                        customeName = await this.translatorService.frontendReadTranslation(req.lang, `pass_need_text_${ele['org_id']}_${ele['id']}`, `/LC_MESSAGES/Common/SurveyPopup/${postData?.org_id}/${ele.id}`,`dynamic`);
                        if (customeName != `pass_need_text_${ele['org_id']}_${ele['id']}`) {
                            ele.pass_need_text = customeName;
                        }
                    }
                    if(ele.pass_need_desc){
                        customeName = await this.translatorService.frontendReadTranslation(req.lang, `pass_need_desc_${ele['org_id']}_${ele['id']}`, `/LC_MESSAGES/Common/SurveyPopup/${postData?.org_id}/${ele.id}`,`dynamic`);
                        if (customeName != `pass_need_desc_${ele['org_id']}_${ele['id']}`) {                            
                            ele.pass_need_desc = customeName;
                        }
                    }
                    if(ele.fail_need_text){
                        customeName = await this.translatorService.frontendReadTranslation(req.lang, `fail_need_text_${ele['org_id']}_${ele['id']}`, `/LC_MESSAGES/Common/SurveyPopup/${postData?.org_id}/${ele.id}`,`dynamic`);
                        if (customeName != `fail_need_text_${ele['org_id']}_${ele['id']}`) {
                            ele.fail_need_text = customeName;
                        }
                    }
                    if(ele.fail_need_desc){
                        customeName = await this.translatorService.frontendReadTranslation(req.lang, `fail_need_desc_${ele['org_id']}_${ele['id']}`, `/LC_MESSAGES/Common/SurveyPopup/${postData?.org_id}/${ele.id}`,`dynamic`);
                        if (customeName != `fail_need_desc_${ele['org_id']}_${ele['id']}`) {
                            ele.fail_need_desc = customeName;
                        }
                    }
                }));
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
        FileInterceptor("popup_header_image", {
            limits: { fileSize: appConstant.FILE_SIZE_2MB },
            storage: diskStorage({
                destination: `${appConstant.CHALLENGE_IMAGE_PATH}`,
                filename: fileName
            }),
            fileFilter: filesFilter
        }),
        AccessGuard
    )
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateSurveyPopupInput, @UploadedFile() file: Express.Multer.File) {
        try {
            if (!postData?.org_id || !postData?.title) {
                if (file && file.filename && file.fieldname === 'popup_header_image') {
                    await this.commonFileService.removeFileFromLocal(file.path);
                }
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            postData.fail_need_desc = '';
            if (file && file.fieldname === 'popup_header_image' && file.filename) {
                file.originalname = this.commonFileService.formatFileName(file.originalname);
                let filename = `sphi/${postData?.org_id}/sphiimg_${this.commonService.generateMD5(postData?.org_id.toString())}.${file.originalname.split('.')[file.originalname.split('.').length - 1]}`;
                await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(file.path),  filename: filename}));
                postData.popup_header_image = filename;
            }
            if(postData?.status){
                await this.surveyPopupService.update({org_id: postData?.org_id, status: Not(2)},{status: 0});
            }
            let recordDetails = await this.surveyPopupService.save({...postData, created_by: req.tokenUser?.id, updated_by: req.tokenUser?.id});
            if(recordDetails){
                let dynamicDatas = Object.create(null);
                if(recordDetails['title']){
                    let tilte = `survey_popup_title_${recordDetails['org_id']}_${recordDetails['id']}`
                    dynamicDatas[`${tilte}`]= recordDetails['title'];
                }
                if(recordDetails['description']){
                    let tilte = `survey_popup_description_${recordDetails['org_id']}_${recordDetails['id']}`
                    dynamicDatas[`${tilte}`]= recordDetails['description'];
                }
                if(recordDetails['additional_note']){
                    let tilte = `survey_popup_note_${recordDetails['org_id']}_${recordDetails['id']}`
                    dynamicDatas[`${tilte}`]= recordDetails['additional_note'];
                }
                if(recordDetails['pass_need_text']){
                    let tilte = `pass_need_text_${recordDetails['org_id']}_${recordDetails['id']}`
                    dynamicDatas[`${tilte}`]= recordDetails['pass_need_text'];
                }
                if(recordDetails['pass_need_desc']){
                    let tilte = `pass_need_desc_${recordDetails['org_id']}_${recordDetails['id']}`
                    dynamicDatas[`${tilte}`]= recordDetails['pass_need_desc'];
                }
                if(recordDetails['fail_need_text']){
                    let tilte = `fail_need_text_${recordDetails['org_id']}_${recordDetails['id']}`
                    dynamicDatas[`${tilte}`]= recordDetails['fail_need_text'];
                }
                if(recordDetails['fail_need_desc']){
                    let tilte = `fail_need_desc_${recordDetails['org_id']}_${recordDetails['id']}`
                    dynamicDatas[`${tilte}`]= recordDetails['fail_need_desc'];
                }
                await this.translatorService.DynamicEngJsonData('Common',postData?.org_id,dynamicDatas,'Edit','SurveyPopup',recordDetails['id']?.toString()) 
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: postData,
                message: await this.translatorService.frontendReadTranslation(req.lang, "POPUP_ADDED"),
            });
        } catch (error) {
            if (file && file.filename && file.fieldname === 'popup_header_image') {
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
        FileInterceptor("popup_header_image", {
            limits: { fileSize: appConstant.FILE_SIZE_2MB },
            storage: diskStorage({
                destination: `${appConstant.CHALLENGE_IMAGE_PATH}`,
                filename: fileName
            }),
            fileFilter: filesFilter
        }),
        AccessGuard
    )
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: CreateSurveyPopupInput, @UploadedFile() file: Express.Multer.File) {
        try {
            if (!postData?.id) {
                if (file && file.filename && file.fieldname === 'popup_header_image') {
                    await this.commonFileService.removeFileFromLocal(file.path);
                }
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            const where = { id : postData?.id}
            const surveyCheck = await this.surveyPopupService.findOne(where);
            if (!surveyCheck) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }
            if (file && file.fieldname === 'popup_header_image' && file.filename) {
                file.originalname = this.commonFileService.formatFileName(file.originalname);
                let filename = `sphi/${surveyCheck.org_id}/sphiimg_${this.commonService.generateMD5(surveyCheck['org_id'].toString())}.${file.originalname.split('.')[file.originalname.split('.').length - 1]}`;
                await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(file.path),  filename: filename}));
                postData.popup_header_image = filename;
            }
            if(postData?.status){
                await this.surveyPopupService.update({org_id: postData?.org_id, status: Not(2)},{status: 0});
            } 
            switch (postData?.selected_frequency) {
                case 0:
                case 2:
                case 3:
                    postData.selectedweekday = null;
                    postData.show_login_time = null;
                    break;

                case 1:
                    postData.show_login_time = null;
                    break;

                case 4:
                    postData.selectedweekday = null;
                    postData.show_login_time = postData?.show_login_time ?? null;
                    break;
            }
            await this.surveyPopupService.update({ id: postData?.id },{...postData, updated_by: req.tokenUser?.id});
            this.activityLogService.create(surveyCheck, {...postData, updated_by: req.tokenUser?.id}, tableConstant.SURVEY.TBL_C_SURVEY_POPUP, req.tokenUser?.id);
            if(surveyCheck && postData){
                let dynamicDatas = Object.create(null);
                if(postData['title'] && surveyCheck['title'] != postData['title']){
                    let tilte = `survey_popup_title_${surveyCheck['org_id']}_${surveyCheck['id']}`
                    dynamicDatas[`${tilte}`]= postData['title'];
                }
                if(postData['description'] && surveyCheck['description'] != postData['description']){
                    let tilte = `survey_popup_description_${surveyCheck['org_id']}_${surveyCheck['id']}`
                    dynamicDatas[`${tilte}`]= postData['description'];
                }
                if(postData['additional_note'] && surveyCheck['additional_note'] != postData['additional_note']){
                    let tilte = `survey_popup_note_${surveyCheck['org_id']}_${surveyCheck['id']}`
                    dynamicDatas[`${tilte}`]= postData['additional_note'];
                }
                if(postData['pass_need_text'] && surveyCheck['pass_need_text'] != postData['pass_need_text']){
                    let tilte = `pass_need_text_${surveyCheck['org_id']}_${surveyCheck['id']}`
                    dynamicDatas[`${tilte}`]= postData['pass_need_text'];
                }
                if(postData['pass_need_desc'] && surveyCheck['pass_need_desc'] != postData['pass_need_desc']){
                    let tilte = `pass_need_desc_${surveyCheck['org_id']}_${surveyCheck['id']}`
                    dynamicDatas[`${tilte}`]= postData['pass_need_desc'];
                }
                if(postData['fail_need_text'] && surveyCheck['fail_need_text'] != postData['fail_need_text']){
                    let tilte = `fail_need_text_${surveyCheck['org_id']}_${surveyCheck['id']}`
                    dynamicDatas[`${tilte}`]= postData['fail_need_text'];
                }
                if(postData['fail_need_desc'] && surveyCheck['fail_need_desc'] != postData['fail_need_desc']){
                    let tilte = `fail_need_desc_${surveyCheck['org_id']}_${surveyCheck['id']}`
                    dynamicDatas[`${tilte}`]= postData['fail_need_desc'];
                }
                await this.translatorService.DynamicEngJsonData('Common',surveyCheck?.org_id,dynamicDatas,'Edit','SurveyPopup',surveyCheck['id'])
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: postData,
                message: ((postData?.status != undefined || postData?.status != null) && postData?.status != surveyCheck?.status) ? await this.translatorService.frontendReadTranslation(req.lang, "STATUS_UPDATED") : await this.translatorService.frontendReadTranslation(req.lang, "POPUP_UPDATED")
            });
        } catch (error) {
            if (file && file.filename && file.fieldname === 'popup_header_image') {
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
    @UseGuards(AccessGuard)
    @Post('list')
    async list(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id && !postData?.org_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let where = postData?.org_id ? {org_id: postData?.org_id, status: Not('2')} : {id: postData?.id, status: Not('2')}
            let resultedData: any = await this.frontService.surveyListRecord(["id","title"],{...where});
            resultedData = <any>(
                await this.commonArrayService.formatToDto(SurveyPopupDto, resultedData, req.lang)
            );
            if (req.tokenUser?.role_id != appConstant.ROLE.ADMIN) {
                if (resultedData && resultedData.length) {
                    await Promise.all(resultedData.map(async (ele) => {
                        let customeName;
                        if (ele.title) {
                            customeName = await this.translatorService.frontendReadTranslation(req.lang, `survey_popup_title_${ele['org_id']}_${ele['id']}`, `/LC_MESSAGES/Common/SurveyPopup/${postData?.org_id}/${ele.id}`, `dynamic`);
                            if (customeName != `survey_popup_title_${ele['org_id']}_${ele['id']}`) {
                                ele.title = customeName;
                            }
                        }
                        if (ele.description) {
                            customeName = await this.translatorService.frontendReadTranslation(req.lang, `survey_popup_description_${ele['org_id']}_${ele['id']}`, `/LC_MESSAGES/Common/SurveyPopup/${postData?.org_id}/${ele.id}`, `dynamic`);
                            if (customeName != `survey_popup_description_${ele['org_id']}_${ele['id']}`) {
                                ele.description = customeName;
                            }
                        }
                        if (ele.additional_note) {
                            customeName = await this.translatorService.frontendReadTranslation(req.lang, `survey_popup_note_${ele['org_id']}_${ele['id']}`, `/LC_MESSAGES/Common/SurveyPopup/${postData?.org_id}/${ele.id}`, `dynamic`);
                            if (customeName != `survey_popup_note_${ele['org_id']}_${ele['id']}`) {
                                ele.additional_note = customeName;
                            }
                        }
                        if (ele.pass_need_text) {
                            customeName = await this.translatorService.frontendReadTranslation(req.lang, `pass_need_text_${ele['org_id']}_${ele['id']}`, `/LC_MESSAGES/Common/SurveyPopup/${postData?.org_id}/${ele.id}`, `dynamic`);
                            if (customeName != `pass_need_text_${ele['org_id']}_${ele['id']}`) {
                                ele.pass_need_text = customeName;
                            }
                        }
                        if (ele.pass_need_desc) {
                            customeName = await this.translatorService.frontendReadTranslation(req.lang, `pass_need_desc_${ele['org_id']}_${ele['id']}`, `/LC_MESSAGES/Common/SurveyPopup/${postData?.org_id}/${ele.id}`, `dynamic`);
                            if (customeName != `pass_need_desc_${ele['org_id']}_${ele['id']}`) {
                                ele.pass_need_desc = customeName;
                            }
                        }
                        if (ele.fail_need_text) {
                            customeName = await this.translatorService.frontendReadTranslation(req.lang, `fail_need_text_${ele['org_id']}_${ele['id']}`, `/LC_MESSAGES/Common/SurveyPopup/${postData?.org_id}/${ele.id}`, `dynamic`);
                            if (customeName != `fail_need_text_${ele['org_id']}_${ele['id']}`) {
                                ele.fail_need_text = customeName;
                            }
                        }
                        if (ele.fail_need_desc) {
                            customeName = await this.translatorService.frontendReadTranslation(req.lang, `fail_need_desc_${ele['org_id']}_${ele['id']}`, `/LC_MESSAGES/Common/SurveyPopup/${postData?.org_id}/${ele.id}`, `dynamic`);
                            if (customeName != `fail_need_desc_${ele['org_id']}_${ele['id']}`) {
                                ele.fail_need_desc = customeName;
                            }
                        }
                    }));
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
    @UseGuards(AccessGuard)
    @Post('delete')
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.surveyPopupService.findOne({ id: postData?.id });
            const resultedData = await this.surveyPopupService.update({ id: postData?.id },{status: '2'});
            this.activityLogService.create(recordDetails, {status:2}, tableConstant.SURVEY.TBL_C_SURVEY_POPUP, req.tokenUser?.id, 'delete');
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: resultedData.affected,
                message: await this.translatorService.frontendReadTranslation(req.lang, "POPUP_DELETED"),
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
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = { id: postData?.id };
            if(postData?.org_id){
                where['org_id'] = postData?.org_id;
            }
            let recordDetails = await this.surveyPopupService.findOne(where);
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
            recordDetails = <any>(
                await this.commonArrayService.formatToDto(SurveyPopupDto, recordDetails, req.lang)
            );
            let customeName;
            if(recordDetails.title){
                customeName = await this.translatorService.frontendReadTranslation(req.lang, `survey_popup_title_${recordDetails['org_id']}_${recordDetails['id']}`, `/LC_MESSAGES/Common/SurveyPopup/${postData?.org_id}/${recordDetails.id}`,`dynamic`);
                if (customeName != `survey_popup_title_${recordDetails['org_id']}_${recordDetails['id']}`) {
                    recordDetails.title = customeName;
                }
            }
            if(recordDetails.description){
                customeName = await this.translatorService.frontendReadTranslation(req.lang, `survey_popup_description_${recordDetails['org_id']}_${recordDetails['id']}`, `/LC_MESSAGES/Common/SurveyPopup/${postData?.org_id}/${recordDetails.id}`,`dynamic`);
                if (customeName != `survey_popup_description_${recordDetails['org_id']}_${recordDetails['id']}`) {
                    recordDetails.description = customeName;
                }
            }
            if(recordDetails.additional_note){
                customeName = await this.translatorService.frontendReadTranslation(req.lang, `survey_popup_note_${recordDetails['org_id']}_${recordDetails['id']}`, `/LC_MESSAGES/Common/SurveyPopup/${postData?.org_id}/${recordDetails.id}`,`dynamic`);
                if (customeName != `survey_popup_note_${recordDetails['org_id']}_${recordDetails['id']}`) {
                    recordDetails.additional_note = customeName;
                }
            }
            if(recordDetails.pass_need_text){
                customeName = await this.translatorService.frontendReadTranslation(req.lang, `pass_need_text_${recordDetails['org_id']}_${recordDetails['id']}`, `/LC_MESSAGES/Common/SurveyPopup/${postData?.org_id}/${recordDetails.id}`,`dynamic`);
                if (customeName != `pass_need_text_${recordDetails['org_id']}_${recordDetails['id']}`) {
                    recordDetails.pass_need_text = customeName;
                }
            }
            if(recordDetails.pass_need_desc){
                customeName = await this.translatorService.frontendReadTranslation(req.lang, `pass_need_desc_${recordDetails['org_id']}_${recordDetails['id']}`, `/LC_MESSAGES/Common/SurveyPopup/${postData?.org_id}/${recordDetails.id}`,`dynamic`);
                if (customeName != `pass_need_desc_${recordDetails['org_id']}_${recordDetails['id']}`) {                            
                    recordDetails.pass_need_desc = customeName;
                }
            }
            if(recordDetails.fail_need_text){
                customeName = await this.translatorService.frontendReadTranslation(req.lang, `fail_need_text_${recordDetails['org_id']}_${recordDetails['id']}`, `/LC_MESSAGES/Common/SurveyPopup/${postData?.org_id}/${recordDetails.id}`,`dynamic`);
                if (customeName != `fail_need_text_${recordDetails['org_id']}_${recordDetails['id']}`) {
                    recordDetails.fail_need_text = customeName;
                }
            }
            if(recordDetails.fail_need_desc){
                customeName = await this.translatorService.frontendReadTranslation(req.lang, `fail_need_desc_${recordDetails['org_id']}_${recordDetails['id']}`, `/LC_MESSAGES/Common/SurveyPopup/${postData?.org_id}/${recordDetails.id}`,`dynamic`);
                if (customeName != `fail_need_desc_${recordDetails['org_id']}_${recordDetails['id']}`) {
                    recordDetails.fail_need_desc = customeName;
                }
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: recordDetails,
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

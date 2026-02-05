import { appConstant, CommonArrayService, CommonFileService, CommonService, CovidSettingsDto, tableConstant } from '@common-constants';
import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Inject,
    Post, Put,
    Req,
    Res,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { FileInterceptor } from "@nestjs/platform-express";
import { Request, Response } from "express";
import { diskStorage } from "multer";
import { lastValueFrom } from "rxjs";
import { DepartmentService } from "src/modules/company/departments/department.service";
import { LocationService } from "src/modules/company/locations/location.service";
import { ActivityLogService } from "src/modules/master/activitylog/activitylog.service";
import { fileName, filesFilter } from "src/utils/image-upload.utils";
import { In } from "typeorm";
import { AccessGuard, RoleGuard, TokenGuard } from "../../../guard";
import { CreateCovidSettingsInput, PaginateCovidSettingsInput } from "../../../input";
import { TranslationService } from "../../translation/translation.service";
import { AnswersService } from "../answers/answers.service";
import { QuestionsService } from "../questions/questions.service";
import { SettingsService } from "./settings.service";
const path = require('path');
@Controller('covid/settings')
@UseGuards(TokenGuard, RoleGuard)
export class SettingsController {
    constructor(
        private readonly settingsService: SettingsService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        @Inject('COMMON_SERVICE')
        private commonMicroservice: ClientProxy,
        private readonly DepartmentService: DepartmentService,
        private readonly LocationService: LocationService,
        private readonly questionsService: QuestionsService,
        private readonly answersService: AnswersService,
    ) {
    }
    @UseGuards(AccessGuard)
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateCovidSettingsInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let where = `status !=0`;
            if (postData?.org_id) {
                where += `AND settings.q_id = '${postData?.org_id}`;
            }
            if (postData?.email_setting) {
                where += `AND settings.email_setting = '${postData?.email_setting}`;
            }
            if (postData?.search_str) {
                where += `AND(settings.title LIKE '%${postData?.search_str}%' OR settings.logo LIKE '%${postData?.search_str}%' OR settings.description LIKE '%${postData?.search_str}%' OR settings.department_string LIKE '%${postData?.search_str}%' OR settings.location_string LIKE '%${postData?.search_str}%' OR settings.need_checkup_text LIKE '%${postData?.search_str}%' OR settings.need_checkup_desc LIKE '%${postData?.search_str}%' OR settings.no_need_checkup_text LIKE '%${postData?.search_str}%' OR settings.no_need_checkup_desc LIKE '%${postData?.search_str}%' OR settings.email_added LIKE '%${postData?.search_str}%')`;
            }
            const resultedData = await this.settingsService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(CovidSettingsDto, resultedData['list'], req.lang)
            );
            if(resultedData['list'] && resultedData['list'].length){
                /// here we can optimize it for mutiple fields to 
                let translationMessage = await this.translatorService.readTranslation(req.lang || 'eng', `/LC_MESSAGES/Common/CovidPopup/${req.tokenUser?.org_id}/dynamic.json`);
                if(!translationMessage){
                    translationMessage = await this.translatorService.readTranslation('eng', `/LC_MESSAGES/Common/CovidPopup/${req.tokenUser?.org_id}/dynamic.json`);
                }
                await Promise.all(resultedData['list'].map(async (ele)=>{
                    if(ele.title){
                        ele.title = translationMessage.find((ele)=> ele.type == `covidsetting_popup_title_${ele['org_id']}_${ele['id']}`)?.['translate'] ?? ele.title;
                    }
                    if(ele.description){
                        ele.description = translationMessage.find((ele)=> ele.type == `covidsetting_popup_description_${ele['org_id']}_${ele['id']}`)?.['translate'] ?? ele.description;;
                    }
                    if(ele.additional_note){
                        ele.additional_note = translationMessage.find((ele)=> ele.type == `covidsetting_popup_note_${ele['org_id']}_${ele['id']}`)?.['translate'] ?? ele.additional_note;;
                    }
                    if(ele.no_need_checkup_text){
                        ele.no_need_checkup_text = translationMessage.find((ele)=> ele.type == `no_need_checkup_text_${ele['org_id']}_${ele['id']}`)?.['translate'] ?? ele.no_need_checkup_text;;
                    }
                    if(ele.no_need_checkup_desc){
                        ele.no_need_checkup_desc = translationMessage.find((ele)=> ele.type == `no_need_checkup_desc_${ele['org_id']}_${ele['id']}`)?.['translate'] ?? ele.no_need_checkup_desc;;
                    }
                    if(ele.need_checkup_text){
                        ele.need_checkup_text = translationMessage.find((ele)=> ele.type == `need_checkup_text_${ele['org_id']}_${ele['id']}`)?.['translate'] ?? ele.need_checkup_text;;
                    }
                    if(ele.need_checkup_desc){
                        ele.need_checkup_desc = translationMessage.find((ele)=> ele.type == `need_checkup_desc_${ele['org_id']}_${ele['id']}`)?.['translate'] ?? ele.need_checkup_desc;;
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
    @UseGuards(AccessGuard)
    @Post('get-one')
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            postData.org_id = postData?.org_id ?? req.tokenUser?.org_id;
            if (!postData?.id && !postData?.org_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            if ([appConstant.ROLE.ORGADMIN, appConstant.ROLE.REGISTERED, appConstant.ROLE.SPOUSE].includes(req.tokenUser?.role_id)) {
                const where = postData?.id ? { id: postData?.id } : { org_id: postData?.org_id };
                let settingsDetails = await this.settingsService.findOne(where);
                if (!settingsDetails) {
                    let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
                }
                if (settingsDetails.department_string && settingsDetails.department_string != '') {
                    let departmentIds = JSON.parse(settingsDetails.department_string);
                    settingsDetails['departments'] = await this.DepartmentService.listRecord({ deleted: 0, id: In(departmentIds) });
                }
                if (settingsDetails.location_string && settingsDetails.location_string != '') {
                    let locationIds = JSON.parse(settingsDetails.location_string);
                    settingsDetails['locations'] = await this.LocationService.listRecord(['id', 'code', 'location_name', 'lname', 'city', 'state', 'country'], { deleted: 0, id: In(locationIds) });
                }
                settingsDetails = <any>(
                    await this.commonArrayService.formatToDto(CovidSettingsDto, settingsDetails, req.lang)
                );
                let translationMessage = await this.translatorService.readTranslation(req.lang || 'eng', `/LC_MESSAGES/Common/CovidPopup/${postData?.org_id}/dynamic.json`);
                if(!translationMessage){
                    translationMessage = await this.translatorService.readTranslation('eng', `/LC_MESSAGES/Common/CovidPopup/${postData?.org_id}/dynamic.json`);
                }
                if(settingsDetails.title){
                    settingsDetails.title = translationMessage.find((ele)=> ele.type == `covidsetting_popup_title_${ele['org_id']}_${ele['id']}`)?.['translate'] ?? settingsDetails.title;
                }
                if(settingsDetails.description){
                    settingsDetails.description = translationMessage.find((ele)=> ele.type == `covidsetting_popup_description_${ele['org_id']}_${ele['id']}`)?.['translate'] ?? settingsDetails.description;;
                }
                if(settingsDetails.additional_note){
                    settingsDetails.additional_note = translationMessage.find((ele)=> ele.type == `covidsetting_popup_note_${ele['org_id']}_${ele['id']}`)?.['translate'] ?? settingsDetails.additional_note;;
                }
                if(settingsDetails.no_need_checkup_text){
                    settingsDetails.no_need_checkup_text = translationMessage.find((ele)=> ele.type == `no_need_checkup_text_${ele['org_id']}_${ele['id']}`)?.['translate'] ?? settingsDetails.no_need_checkup_text;;
                }
                if(settingsDetails.no_need_checkup_desc){
                    settingsDetails.no_need_checkup_desc = translationMessage.find((ele)=> ele.type == `no_need_checkup_desc_${ele['org_id']}_${ele['id']}`)?.['translate'] ?? settingsDetails.no_need_checkup_desc;;
                }
                if(settingsDetails.need_checkup_text){
                    settingsDetails.need_checkup_text = translationMessage.find((ele)=> ele.type == `need_checkup_text_${ele['org_id']}_${ele['id']}`)?.['translate'] ?? settingsDetails.need_checkup_text;;
                }
                if(settingsDetails.need_checkup_desc){
                    settingsDetails.need_checkup_desc = translationMessage.find((ele)=> ele.type == `need_checkup_desc_${ele['org_id']}_${ele['id']}`)?.['translate'] ?? settingsDetails.need_checkup_desc;;
                }
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: settingsDetails,
                    message: 'success',
                });
            } else {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
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
    @Post('create')
    @UseInterceptors(
        FileInterceptor("popup_header_image", {
            limits: { fileSize: appConstant.FILE_SIZE_2MB },
            storage: diskStorage({
                destination: `${appConstant.COVID_ASSETS_TEMP_PATH}`,
                filename: fileName
            }),
            fileFilter: filesFilter
        }),
        AccessGuard
    )
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateCovidSettingsInput, @UploadedFile() file: Express.Multer.File) {
        try {
            if (!postData?.org_id || !postData?.title || (postData?.status == undefined || postData?.status == null)) {
                if (file && file.filename && file.fieldname === 'popup_header_image') {
                    await this.commonFileService.removeFileFromLocal(file.path);
                }
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            if ([appConstant.ROLE.ORGADMIN].includes(req.tokenUser?.role_id)) {
                let recordDetails: any = await this.settingsService.findOne({ org_id: postData?.org_id, title: postData?.title });
                if (postData?.department_string && postData?.department_string != '') {
                    postData.department_string = `[${postData?.department_string.trim().split(',').map((item: any) => `"${item}"`)}]`;
                }
                if (postData?.location_string && postData?.location_string != '') {
                    postData.location_string = `[${postData?.location_string.trim().split(',').map((item: any) => `"${item}"`)}]`;
                }
                if (!recordDetails) {
                    recordDetails = await this.settingsService.save(postData);
                }
                if (file && file.fieldname === 'popup_header_image' && file.filename) {
                    file.originalname = this.commonFileService.formatFileName(file.originalname);
                    let filename = `covid/${recordDetails['org_id']}/logo/sphiimg_${this.commonService.generateMD5(recordDetails['org_id'].toString())}.${file.originalname.split('.')[file.originalname.split('.').length - 1]}`;
                    await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(file.path),  filename: filename}));
                    await this.settingsService.update({ id: recordDetails['id'] }, { popup_header_image: filename });
                }
                /* Default Question Answer */
                const existingQuestion = await this.questionsService.findOne({ org_id: postData?.org_id });
                if (!existingQuestion) {
                    const defaultQuestions = [
                        { title: 'Do you have a fever?', org_id: postData?.org_id },
                        { title: 'Do you have shortness of breath?', org_id: postData?.org_id },
                        { title: 'Do you have a cough?', org_id: postData?.org_id },
                        { title: 'Have you interacted with anyone who is positive with the COVID-19 virus without PPE for beyond 2 minutes, less than 6 feet apart?', org_id: postData?.org_id },
                    ];
                    const defaultOptions = [
                        { title: 'Yes' },
                        { title: 'No' },
                    ];
                    for (const questionData of defaultQuestions) {
                        const savedQuestion = await this.questionsService.save(questionData);
                        if(postData?.title){
                            let title = `covidquestion_title_${savedQuestion['id']}`
                            let dynamicData= { [`${title}`]: postData?.title};
                            await this.translatorService.DynamicEngJsonData('Common',postData?.org_id,dynamicData,'Edit','CovidPopup') 
                        }
                        for (const optionData of defaultOptions) {
                            let savedAnswer = await this.answersService.save({ ...optionData, q_id: savedQuestion['id'] });
                            if(postData?.title){
                                let title = `covidanswer_${savedQuestion['id']}_${savedAnswer['id']}`;
                                let dynamicData= { [`${title}`]: postData?.title};
                                await this.translatorService.DynamicEngJsonData('Common',postData?.org_id,dynamicData,'Edit','CovidPopup') 
                            }
                        }
                    }
                }
                if(recordDetails){
                    let dynamicData = Object.create(null);
                    if(recordDetails.title){
                        let title = `covidsetting_popup_title_${recordDetails['org_id']}_${recordDetails['id']}`
                        dynamicData[`${title}`]= recordDetails.title;
                    }
                    if(recordDetails.description){
                        let title = `covidsetting_popup_description_${recordDetails['org_id']}_${recordDetails['id']}`
                        dynamicData[`${title}`]= recordDetails.description;
                    }
                    if(recordDetails.additional_note){
                        let title = `covidsetting_popup_note_${recordDetails['org_id']}_${recordDetails['id']}`
                        dynamicData[`${title}`]= recordDetails.additional_note;
                    }
                    if(recordDetails.no_need_checkup_text){
                        let title = `no_need_checkup_text_${recordDetails['org_id']}_${recordDetails['id']}`
                        dynamicData[`${title}`]= recordDetails.no_need_checkup_text;
                    }
                    if(recordDetails.no_need_checkup_desc){
                        let title = `no_need_checkup_desc_${recordDetails['org_id']}_${recordDetails['id']}`
                        dynamicData[`${title}`]= recordDetails.no_need_checkup_desc;
                    }
                    if(recordDetails.need_checkup_text){
                        let title = `need_checkup_text_${recordDetails['org_id']}_${recordDetails['id']}`
                        dynamicData[`${title}`]= recordDetails.need_checkup_text;
                    }
                    if(recordDetails.need_checkup_desc){
                        let title = `need_checkup_desc_${recordDetails['org_id']}_${recordDetails['id']}`
                        dynamicData[`${title}`]= recordDetails.need_checkup_desc;
                    }
                    await this.translatorService.DynamicEngJsonData('Common',postData?.org_id,dynamicData,'Edit','CovidPopup') 
                }
                /* Default Question Answer */
                return res.status(HttpStatus.CREATED).json({
                    statusCode: 201,
                    success: 1,
                    error: 0,
                    data: null,
                    message: await this.translatorService.frontendReadTranslation(req.lang, 'Covid setting added successfully'),
                });
            } else {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
            }
        } catch (error) {
            if (file && file.filename && file.fieldname === 'popup_header_image') {
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
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = { id: postData?.id };
            const recordDetails = await this.settingsService.findOne(where);
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
            await this.settingsService.update(where, { status: 2 });
            this.activityLogService.create(recordDetails, postData, tableConstant.COVID.COVID_SETTINGS, req.tokenUser?.id, 'delete');
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, 'Covid setting deleted successfully'),
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
    @Put('update')
    @UseInterceptors(
        FileInterceptor("popup_header_image", {
            limits: { fileSize: appConstant.FILE_SIZE_2MB },
            storage: diskStorage({
                destination: `${appConstant.COVID_ASSETS_TEMP_PATH}`,
                filename: fileName
            }),
            fileFilter: filesFilter
        }),
        AccessGuard
    )
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: CreateCovidSettingsInput, @UploadedFile() file: Express.Multer.File) {
        try {
            if (!postData?.id || !postData?.org_id) {
                if (file && file.filename && file.fieldname === 'popup_header_image') {
                    await this.commonFileService.removeFileFromLocal(file.path);
                }
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            if ([appConstant.ROLE.ORGADMIN].includes(req.tokenUser?.role_id)) {
                const where = { id: postData?.id };
                let recordDetails: any = await this.settingsService.findOne(where);
                if (postData?.department_string && postData?.department_string != '') {
                    postData.department_string = `[${postData?.department_string.trim().split(',').map((item: any) => `"${item}"`)}]`;
                }
                if (postData?.location_string && postData?.location_string != '') {
                    postData.location_string = `[${postData?.location_string.trim().split(',').map((item: any) => `"${item}"`)}]`;
                }
                if (!recordDetails) {
                    recordDetails = await this.settingsService.save({
                        ...postData,
                    });
                }
                if (file && file.fieldname === 'popup_header_image' && file.filename) {
                    file.originalname = this.commonFileService.formatFileName(file.originalname);
                    let filename = `covid/${recordDetails['org_id']}/logo/sphiimg_${this.commonService.generateMD5(recordDetails['org_id'].toString())}.${file.originalname.split('.')[file.originalname.split('.').length - 1]}`;
                    await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(file.path),  filename: filename}));
                    postData.popup_header_image = filename;
                }
                await this.settingsService.update(where, postData);
                /* Default Question Answer */
                const existingQuestion = await this.questionsService.findOne({ org_id: postData?.org_id });
                if (!existingQuestion) {
                    const defaultQuestions = [
                        { title: 'Do you have a fever?', org_id: postData?.org_id },
                        { title: 'Do you have shortness of breath?', org_id: postData?.org_id },
                        { title: 'Do you have a cough?', org_id: postData?.org_id },
                        { title: 'Have you interacted with anyone who is positive with the COVID-19 virus without PPE for beyond 2 minutes, less than 6 feet apart?', org_id: postData?.org_id },
                    ];
                    const defaultOptions = [
                        { title: 'Yes' },
                        { title: 'No' },
                    ];
                    for (const questionData of defaultQuestions) {
                        const savedQuestion = await this.questionsService.save(questionData);
                        if(postData?.title){
                            let title = `covidquestion_title_${savedQuestion['id']}`
                            let dynamicData= { [`${title}`]: postData?.title};
                            await this.translatorService.DynamicEngJsonData('Common',postData?.org_id,dynamicData,'Edit','CovidPopup') 
                        }
                        for (const optionData of defaultOptions) {
                            const savedAnswer = await this.answersService.save({ ...optionData, q_id: savedQuestion['id'] });
                            if(postData?.title){
                                let title = `covidanswer_${savedQuestion['id']}_${savedAnswer['id']}`;
                                let dynamicData= { [`${title}`]: postData?.title};
                                await this.translatorService.DynamicEngJsonData('Common',postData?.org_id,dynamicData,'Edit','CovidPopup') 
                            }
                        }
                    }
                }
                /* Default Question Answer */
                this.activityLogService.create(recordDetails, postData, tableConstant.COVID.COVID_SETTINGS, req.tokenUser?.id);
                if(recordDetails){
                    let dynamicData = Object.create(null);
                    if(recordDetails.title){
                        let title = `covidsetting_popup_title_${recordDetails['org_id']}_${recordDetails['id']}`
                        dynamicData[`${title}`]= recordDetails.title;
                    }
                    if(recordDetails.description){
                        let title = `covidsetting_popup_description_${recordDetails['org_id']}_${recordDetails['id']}`
                        dynamicData[`${title}`]= recordDetails.description;
                    }
                    if(recordDetails.additional_note){
                        let title = `covidsetting_popup_note_${recordDetails['org_id']}_${recordDetails['id']}`
                        dynamicData[`${title}`]= recordDetails.additional_note;
                    }
                    if(recordDetails.no_need_checkup_text){
                        let title = `no_need_checkup_text_${recordDetails['org_id']}_${recordDetails['id']}`
                        dynamicData[`${title}`]= recordDetails.no_need_checkup_text;
                    }
                    if(recordDetails.no_need_checkup_desc){
                        let title = `no_need_checkup_desc_${recordDetails['org_id']}_${recordDetails['id']}`
                        dynamicData[`${title}`]= recordDetails.no_need_checkup_desc;
                    }
                    if(recordDetails.need_checkup_text){
                        let title = `need_checkup_text_${recordDetails['org_id']}_${recordDetails['id']}`
                        dynamicData[`${title}`]= recordDetails.need_checkup_text;
                    }
                    if(recordDetails.need_checkup_desc){
                        let title = `need_checkup_desc_${recordDetails['org_id']}_${recordDetails['id']}`
                        dynamicData[`${title}`]= recordDetails.need_checkup_desc;
                    }
                    await this.translatorService.DynamicEngJsonData('Common',postData?.org_id,dynamicData,'Edit','CovidPopup') 
                }
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: await this.translatorService.frontendReadTranslation(req.lang, ((postData?.status != undefined || postData?.status != null) && postData?.status != recordDetails.status) ? 'Covid setting status updated successfully' : 'Covid setting updated successfully'),
                });
            } else {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
            }
        } catch (error) {
            if (file && file.filename && file.fieldname === 'popup_header_image') {
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
    @Post('list')
    async list(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            const where = {
                status: 1,
            };
            let resultedData: any = await this.settingsService.listRecord(where);
            resultedData = <any>(
                await this.commonArrayService.formatToDto(CovidSettingsDto, resultedData, req.lang)
            );
            if(resultedData && resultedData.length){
                let translationMessage = await this.translatorService.readTranslation(req.lang || 'eng', `/LC_MESSAGES/Common/CovidPopup/${req.tokenUser?.org_id}/dynamic.json`);
                if(!translationMessage){
                    translationMessage = await this.translatorService.readTranslation('eng', `/LC_MESSAGES/Common/CovidPopup/${req.tokenUser?.org_id}/dynamic.json`);
                }
                await Promise.all(resultedData.map(async (ele)=>{
                    if(ele.title){
                        ele.title = translationMessage.find((ele)=> ele.type == `covidsetting_popup_title_${ele['org_id']}_${ele['id']}`)?.['translate'] ?? ele.title;
                    }
                    if(ele.description){
                        ele.description = translationMessage.find((ele)=> ele.type == `covidsetting_popup_description_${ele['org_id']}_${ele['id']}`)?.['translate'] ?? ele.description;;
                    }
                    if(ele.additional_note){
                        ele.additional_note = translationMessage.find((ele)=> ele.type == `covidsetting_popup_note_${ele['org_id']}_${ele['id']}`)?.['translate'] ?? ele.additional_note;;
                    }
                    if(ele.no_need_checkup_text){
                        ele.no_need_checkup_text = translationMessage.find((ele)=> ele.type == `no_need_checkup_text_${ele['org_id']}_${ele['id']}`)?.['translate'] ?? ele.no_need_checkup_text;;
                    }
                    if(ele.no_need_checkup_desc){
                        ele.no_need_checkup_desc = translationMessage.find((ele)=> ele.type == `no_need_checkup_desc_${ele['org_id']}_${ele['id']}`)?.['translate'] ?? ele.no_need_checkup_desc;;
                    }
                    if(ele.need_checkup_text){
                        ele.need_checkup_text = translationMessage.find((ele)=> ele.type == `need_checkup_text_${ele['org_id']}_${ele['id']}`)?.['translate'] ?? ele.need_checkup_text;;
                    }
                    if(ele.need_checkup_desc){
                        ele.need_checkup_desc = translationMessage.find((ele)=> ele.type == `need_checkup_desc_${ele['org_id']}_${ele['id']}`)?.['translate'] ?? ele.need_checkup_desc;;
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
}
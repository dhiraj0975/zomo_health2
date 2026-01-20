import { appConstant, CommonArrayService, CommonDateService, CommonFileService, CommonService, CompanyMetaDto, tableConstant } from '@common-constants';
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
    UploadedFiles,
    UseGuards,
    UseInterceptors,
} from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { AnyFilesInterceptor, FileInterceptor } from "@nestjs/platform-express";
import { Request, Response } from "express";
import { diskStorage } from "multer";
import { lastValueFrom } from "rxjs";
import { ActivityLogService } from "src/modules/master/activitylog/activitylog.service";
import { docsFilter, fileName } from "src/utils/image-upload.utils";
import { AccessGuard, RoleGuard, TokenGuard } from "../../../guard";
import { CreateCompanyMetaInput, PaginateWithCompanyInput } from "../../../input";
import { TranslationService } from "../../translation/translation.service";
import { ActivePluginService } from "../activeplugins/activeplugin.service";
import { ClientManagerAssignService } from "../clientmanagerassign/clientmanagerassign.service";
import { MetaService } from "./meta.service";
const path = require('path');
@Controller('company/meta')
@UseGuards(TokenGuard, RoleGuard)
export class MetaController {
    constructor(
        private readonly companyMetaService: MetaService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonDateService: CommonDateService,
        private readonly commonFileService: CommonFileService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        @Inject('COMMON_SERVICE')
        private commonMicroservice: ClientProxy,
        private readonly clientManagerAssignService: ClientManagerAssignService,
        private readonly activePluginService: ActivePluginService
    ) {
    }
    @UseGuards(AccessGuard)
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithCompanyInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let where = 'company.deleted = 0 AND company.companytype_id = 3';
            if (appConstant.ROLE.CLIENTENGAGEMENTMANAGER == req.tokenUser?.role_id){
                let resultedData = await this.clientManagerAssignService.listRecord({user_id: req.tokenUser?.id,status: 1},null);
                if(resultedData.length > 0){
                    where += `AND company.id IN (${resultedData.map(ele=>ele.org_id).join(',')})`;
                }else{
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
            }else{
                let pluginsDetails = await this.activePluginService.listRecord();
                if (!pluginsDetails) {
                    pluginsDetails = <any>[];
                }
                let orgIds = [];
                if (pluginsDetails) {
                    for(let plugin of pluginsDetails){
                        let pluginData = Object.keys(JSON.parse(plugin["plugin_name"]));
                        if(pluginData.includes('Incentive')){
                            orgIds.push(plugin["company_id"]);
                        }
                    }   
                }
                if(orgIds.length > 0){
                    where += ` AND company.id IN (${orgIds.join(',')})`;
                }
            }
            if (postData?.search_str) {
                where += ` AND (companyMeta.due_date_text LIKE '%${postData?.search_str}%' OR company.company_name LIKE '%${postData?.search_str}%')`;
            }
            const resultedData = await this.companyMetaService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(CompanyMetaDto, resultedData['list'], req.lang)
            );
            if(resultedData['list'] && resultedData['list'].length){
                await Promise.all(resultedData['list'].map(async (ele)=>{
                    if(ele.a_popup_title){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang, `agreement_title_content_${ele['org_id']}`, `/LC_MESSAGES/Common/Agreement/${req.tokenUser?.org_id || ele['org_id']}`,`dynamic`);
                        if (customName != `agreement_title_content_${ele['org_id']}`) {
                            ele.a_popup_title = customName;
                        }
                    }
                    if(ele.a_popup_text){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang, `agreement_text_content_${ele['org_id']}`, `/LC_MESSAGES/Common/Agreement/${req.tokenUser?.org_id || ele['org_id']}`,`dynamic`);
                        if (customName != `agreement_text_content_${ele['org_id']}`) {
                            ele.a_popup_text = customName;
                        }
                    }
                    if(ele.user_popup_title){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang, `user_popup_title_${ele['org_id']}`, `/LC_MESSAGES/Common/LoginPopup/${req.tokenUser?.org_id || ele['org_id']}`,`dynamic`);
                        if (customName != `user_popup_title_${ele['org_id']}`) {
                            ele.user_popup_title = customName;
                        }
                    }
                    if(ele.agreement_text){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang, `agreement_text_${ele['org_id']}`, `/LC_MESSAGES/Common/SpouseAuthorizedPopup/${req.tokenUser?.org_id || ele['org_id']}`,`dynamic`);
                        if (customName != `agreement_text_${ele['org_id']}`) {
                            ele.agreement_text = customName;
                        }
                    }
                    if(ele.title){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang, `inpo_pop_title_${ele['org_id']}_${ele['id']}`, `/LC_MESSAGES/Common/InformationPopup/${req.tokenUser?.org_id || ele['org_id']}`,`dynamic`);
                        if (customName != `inpo_pop_title_${ele['org_id']}_${ele['id']}`) {
                            ele.title = customName;
                        }
                    }
                    if(ele.setting_dic){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang, `inpo_setting_dic_${ele['org_id']}_${ele['id']}`, `/LC_MESSAGES/Common/InformationPopup/${req.tokenUser?.org_id || ele['org_id']}`,`dynamic`);
                        if (customName != `inpo_setting_dic_${ele['org_id']}_${ele['id']}`) {
                            ele.setting_dic = customName;
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
                  data: [],
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }
    @UseGuards(AccessGuard)
    @Post('get-one')
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if(postData?.a_popup_default_status == undefined || postData?.a_popup_default_status == null || postData?.a_popup_default_status != 1 ){
                if (!postData?.id && !postData?.org_id) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
             }
             let where: any;
             if(postData?.a_popup_default_status){
                where = { a_popup_default_status: postData?.a_popup_default_status };
             }
             else {
                where = postData?.id ? postData?.org_id ? { id: postData?.id, org_id: postData?.org_id } : { id: postData?.id}: { org_id: postData?.org_id};
             }
            let companyMeta: any = await this.companyMetaService.findOne(where);
             if (!companyMeta?.plan_label) {
                companyMeta = companyMeta || {};
                companyMeta.plan_label = JSON.stringify({completion: 'Congratulations! You have completed the My Plan requirement for the Dividend Program. You are welcome to complete additional My Plans as you work toward health and fitness goals.', required: 'Required', optional: 'Optional', incomplete: 'Incomplete'});
             }
            if (!companyMeta) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }
            companyMeta = <any>(
                await this.commonArrayService.formatToDto(CompanyMetaDto, companyMeta, req.lang)
            );
            if(companyMeta.a_popup_title){
                let customName = await this.translatorService.frontendReadTranslation(req.lang, `agreement_title_content_${companyMeta['org_id']}`, `/LC_MESSAGES/Common/Agreement/${req.tokenUser?.org_id || companyMeta['org_id']}`,`dynamic`);
                if (customName != `agreement_title_content_${companyMeta['org_id']}`) {
                    companyMeta.a_popup_title = customName;
                }
            }
            if(companyMeta.a_popup_text){
                let customName = await this.translatorService.frontendReadTranslation(req.lang, `agreement_text_content_${companyMeta['org_id']}`, `/LC_MESSAGES/Common/Agreement/${req.tokenUser?.org_id || companyMeta['org_id']}`,`dynamic`);
                if (customName != `agreement_text_content_${companyMeta['org_id']}`) {
                    companyMeta.a_popup_text = customName;
                }
            }
            if(companyMeta.user_popup_title){
                let customName = await this.translatorService.frontendReadTranslation(req.lang, `user_popup_title_${companyMeta['org_id']}`, `/LC_MESSAGES/Common/LoginPopup/${req.tokenUser?.org_id || companyMeta['org_id']}`,`dynamic`);
                if (customName != `user_popup_title_${companyMeta['org_id']}`) {
                    companyMeta.user_popup_title = customName;
                }
            }
            if(companyMeta.agreement_text){
                let customName = await this.translatorService.frontendReadTranslation(req.lang, `agreement_text_${companyMeta['org_id']}`, `/LC_MESSAGES/Common/SpouseAuthorizedPopup/${req.tokenUser?.org_id || companyMeta['org_id']}`,`dynamic`);
                if (customName != `agreement_text_${companyMeta['org_id']}`) {
                    companyMeta.agreement_text = customName;
                }
            }
            if(companyMeta.title){
                let customName = await this.translatorService.frontendReadTranslation(req.lang, `inpo_pop_title_${companyMeta['org_id']}_${companyMeta['id']}`, `/LC_MESSAGES/Common/InformationPopup/${req.tokenUser?.org_id || companyMeta['org_id']}`,`dynamic`);
                if (customName != `inpo_pop_title_${companyMeta['org_id']}_${companyMeta['id']}`) {
                    companyMeta.title = customName;
                }
            }
            if(companyMeta.setting_dic){
                let customName = await this.translatorService.frontendReadTranslation(req.lang, `inpo_setting_dic_${companyMeta['org_id']}_${companyMeta['id']}`, `/LC_MESSAGES/Common/InformationPopup/${req.tokenUser?.org_id || companyMeta['org_id']}`,`dynamic`);
                if (customName != `inpo_setting_dic_${companyMeta['org_id']}_${companyMeta['id']}`) {
                    companyMeta.setting_dic = customName;
                }
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: companyMeta,
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
                destination: `${appConstant.REIMBURSEMENT_IMAGE_PATH}`,
                filename: fileName
            }),
            fileFilter: docsFilter
        }),
        AccessGuard
    )
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateCompanyMetaInput, @UploadedFile() file: Express.Multer.File[]) {
        try {
            if(postData?.a_popup_default_status == undefined || postData?.a_popup_default_status == null || postData?.a_popup_default_status != 1 ){
                if (
                    !postData?.org_id
                ) {
                    if (file && file.length > 0) {
                        for(let fileData of file){
                            await this.commonFileService.removeFileFromLocal(`${fileData.path}`);  
                        }
                    }
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
            }
            if (file && file.length > 0) {
                const imageData = [];
                for (let fileData of file) {
                    if (fileData.fieldname == 'emailattachment') {
                        fileData.originalname = this.commonFileService.formatFileName(fileData.originalname);
                        fileData.filename = `comwelattch/${postData['org_id']}/${fileData.originalname.split('.')[0]}_${this.commonDateService.getTodayDate().unix()}.${fileData.originalname.split('.')[fileData.originalname.split('.').length - 1]}`;
                        await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(fileData.path),  filename: fileData.filename, userBucket: 'private'}));
                        imageData.push(fileData.filename);
                    }
                }
                if(imageData && imageData.length> 0){
                    postData['emailattachment'] = JSON.stringify(imageData);
                }
            }
            if(!postData?.enable_widget){
                let enable_widgets={
                    "participationsummary":"0",
                    "upcomingactivities":"0",
                    "chat":"0",
                    "tasklist":"0",
                    "Myplan":"0",
                    "spouseregistration":"0",
                    "supports":"1",
                    "currentpoint":"0",
                    "challengeprogress":"0",
                    "quicklinks":"0",
                    "biometricresult":"0"
                }
                postData.enable_widget= JSON.stringify(enable_widgets)
            }
            let saveData;
            let companyMetaDetails = await this.companyMetaService.findOne({ org_id: postData?.org_id });
            if(companyMetaDetails){
                await this.companyMetaService.update({ id: companyMetaDetails?.id, org_id: postData?.org_id },{...postData,
                    updated_by: req.tokenUser?.id,
                });
                saveData = {
                ...companyMetaDetails,
                ...Object.fromEntries(
                    Object.entries(postData).filter(
                    ([key, value]) => value !== null || companyMetaDetails[key] == null
                    )
                )
                };
            }
            else{
                saveData = await this.companyMetaService.save({...postData,
                created_by: req.tokenUser?.id});
            }
            let dynamicDatas = Object.create(null);
            if(saveData && postData['a_popup_title']){
                let tilte = `agreement_title_content_${saveData['org_id']}`;
                dynamicDatas[`${tilte}`]= postData?.a_popup_title;
            }
            if(saveData && postData['a_popup_text']){
                let tilte = `agreement_text_content_${saveData['org_id']}`;
                dynamicDatas[`${tilte}`]= postData?.a_popup_text;
            }
            await this.translatorService.DynamicEngJsonData('Common',postData?.org_id,dynamicDatas,'Edit','Agreement') 
            if(saveData && postData['user_popup_title']){
                let tilte = `user_popup_title_${saveData['org_id']}`;
                let dynamicDatas= { [`${tilte}`]: postData?.user_popup_title};
                await this.translatorService.DynamicEngJsonData('Common',postData?.org_id,dynamicDatas,'Edit','LoginPopup') 
            }
            if(saveData && postData['agreement_text']){
                let tilte = `agreement_text_${saveData['org_id']}`;
                let dynamicDatas= { [`${tilte}`]: postData?.agreement_text};
                await this.translatorService.DynamicEngJsonData('Common',postData?.org_id,dynamicDatas,'Edit','SpouseAuthorizedPopup') 
            }
            dynamicDatas = Object.create(null);
            if(saveData && postData['title']){
                let tilte = `inpo_pop_title_${saveData['org_id']}`;
                dynamicDatas[`${tilte}`]= postData?.title;
            }
            if(saveData && postData['setting_dic']){
                let tilte = `inpo_setting_dic_${saveData['org_id']}`;
                dynamicDatas[`${tilte}`]= postData?.setting_dic;
            }
            await this.translatorService.DynamicEngJsonData('Common',postData?.org_id,dynamicDatas,'Edit','InformationPopup') 
            return res.status(HttpStatus.CREATED).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: 'Setting Saved Successfully.',
            });
        } catch (error) {
            if (file && file.length > 0) {
                for(let fileData of file){
                    await this.commonFileService.removeFileFromLocal(`${fileData.path}`);  
                }
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
            const where = {id: postData?.id};
            const recordDetails = await this.companyMetaService.findOne(where);
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
            await this.companyMetaService.delete(where);
            this.activityLogService.create(recordDetails, {title: recordDetails}, tableConstant.COMPANIES.TBL_COMPANY_META, req.tokenUser?.id, 'delete');
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
                  data: null,
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }
    @UseGuards(AccessGuard)
    @Post('delete-attachment')
    async deleteattachment(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id || !postData?.emailattachment) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = {id: postData?.id};
            let recordDetails:any = await this.companyMetaService.findOne(where);
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
            await lastValueFrom(this.commonMicroservice.send({cmd: 'delete_file'}, {prefix: postData?.emailattachment, userBucket: 'private'}));
            if(recordDetails.emailattachment.replace(/\\/g, '').includes(postData?.emailattachment)){
                recordDetails.emailattachment = JSON.parse(recordDetails.emailattachment);
                let index = recordDetails.emailattachment.indexOf(postData?.emailattachment);
                if (index !== -1) {
                    recordDetails.emailattachment.splice(index, 1);
                }
                if(!Array.isArray(recordDetails.emailattachment) && recordDetails.emailattachment.length){
                    recordDetails.emailattachment = [recordDetails.emailattachment];
                }
                postData.emailattachment = recordDetails.emailattachment.length ? JSON.stringify(recordDetails.emailattachment) : '';
            }
            await this.companyMetaService.update(where,{emailattachment: postData?.emailattachment});
            this.activityLogService.create(recordDetails, {emailattachment: postData?.emailattachment}, tableConstant.COMPANIES.TBL_COMPANY_META, req.tokenUser?.id, 'delete');
            recordDetails.emailattachment = postData?.emailattachment;
            recordDetails = <any>(
                await this.commonArrayService.formatToDto(CompanyMetaDto, recordDetails, req.lang)
            );
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
    @Put('update')
    @UseInterceptors(
        AnyFilesInterceptor( {
            limits: { fileSize: appConstant.FILE_SIZE },
            storage: diskStorage({
                destination: `${appConstant.CHALLENGE_IMAGE_PATH}`,
                filename: fileName
            }),
            fileFilter: docsFilter
        }),
        AccessGuard
    )
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: CreateCompanyMetaInput, @UploadedFiles() file: Express.Multer.File[]) {
        try {
            if(!postData?.type ){
                if (
                    !postData?.id && !postData?.org_id
                ) {
                    if (file && file.length > 0) {
                        for(let fileData of file){
                            await this.commonFileService.removeFileFromLocal(`${fileData.path}`);  
                        }
                    }
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
            }
            let types 
            if(postData?.type && postData?.type === 'widget'){
                types='widget'
                if(!postData?.org_id){
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
                delete(postData?.type)
            } 
            const where = postData?.id ? postData?.org_id ? { id: postData?.id, org_id: postData?.org_id } : { id: postData?.id}: { org_id: postData?.org_id};
            let recordDetails = await this.companyMetaService.findOne(where);
            if (!recordDetails && postData?.org_id) {
                recordDetails = await this.companyMetaService.findOne({ org_id: postData?.org_id});
                if (!recordDetails) {
                    await this.companyMetaService.save({
                        ...postData,
                        created_by: req.tokenUser?.id
                    });
                }
            }
            if (file && file.length > 0) {
                const imageData = [];
                if(recordDetails?.emailattachment){
                    imageData.push(...JSON.parse(recordDetails?.emailattachment));
                }
                for (let fileData of file) {
                    if (fileData.fieldname == 'emailattachment') {
                        fileData.originalname = this.commonFileService.formatFileName(fileData.originalname);
                        fileData.filename = `comwelattch/${postData['org_id']}/${fileData.originalname.split('.')[0]}_${this.commonDateService.getTodayDate().unix()}.${fileData.originalname.split('.')[fileData.originalname.split('.').length - 1]}`;
                        await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(fileData.path),  filename: fileData.filename, userBucket: 'private'}));
                        imageData.push(fileData.filename);
                    }
                }
                if(imageData && imageData.length> 0){
                    postData['emailattachment'] = JSON.stringify(imageData);
                }
            }
            if (['completion', 'required', 'optional', 'incomplete', 'plantext'].some(key => key in postData)) {
                postData.plan_label = JSON.stringify({"completion": postData?.completion || '', "required": postData?.required || '', "optional": postData?.optional || '', "incomplete": postData?.incomplete || '', "plantext": postData?.plantext || ''})
            }
            await this.companyMetaService.update(where, {...postData, updated_by: req.tokenUser?.id});
            await this.activityLogService.create(recordDetails, postData, tableConstant.COMPANIES.TBL_COMPANY_META, req.tokenUser?.id);
            if (recordDetails && postData?.plan_label) {
                let dynamicDatas= { [`completion_${postData['org_id']}`]: postData?.completion, [`required_${postData['org_id']}`]: postData?.required, [`optional_${postData['org_id']}`]: postData?.optional, [`incomplete_${postData['org_id']}`]: postData?.incomplete, [`plantext_${postData['org_id']}`]: postData?.plantext};
                await this.translatorService.DynamicEngJsonData('MyPlan',postData?.org_id,dynamicDatas,'Edit','PlanLabel')
            }
            if(recordDetails && postData['a_popup_title']){
                let tilte = `agreement_title_content_${postData['org_id']}`;
                let dynamicDatas= { [`${tilte}`]: postData?.a_popup_title};
                await this.translatorService.DynamicEngJsonData('Common',postData?.org_id,dynamicDatas,'Edit','Agreement') 
            }
            if(recordDetails && postData['a_popup_text']){
                let tilte = `agreement_text_content_${postData['org_id']}`;
                let dynamicDatas= { [`${tilte}`]: postData?.a_popup_text};
                await this.translatorService.DynamicEngJsonData('Common',postData?.org_id,dynamicDatas,'Edit','Agreement') 
            }
            if(recordDetails && postData['user_popup_title']){
                let tilte = `user_popup_title_${recordDetails['org_id']}`;
                let dynamicDatas= { [`${tilte}`]: postData?.user_popup_title};
                await this.translatorService.DynamicEngJsonData('Common',postData?.org_id,dynamicDatas,'Edit','LoginPopup') 
            }
            if(recordDetails && postData['agreement_text']){
                let tilte = `agreement_text_${recordDetails['org_id']}`;
                let dynamicDatas= { [`${tilte}`]: postData?.agreement_text};
                await this.translatorService.DynamicEngJsonData('Common',postData?.org_id,dynamicDatas,'Edit','SpouseAuthorizedPopup') 
            }
            let dynamicDatas = Object.create(null);
            if(recordDetails && postData['title']){
                let tilte = `inpo_pop_title_${recordDetails['org_id']}`;
                dynamicDatas[`${tilte}`]= postData?.title;
            }
            if(recordDetails && postData['setting_dic']){
                let tilte = `inpo_setting_dic_${recordDetails['org_id']}`;
                dynamicDatas[`${tilte}`]= postData?.setting_dic;
            }
            await this.translatorService.DynamicEngJsonData('Common',postData?.org_id,dynamicDatas,'Edit','InformationPopup') 
            if(types === 'widget'){
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: 'Your Dashboard Widget Settings Have Been Saved Successfully.',
                });
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: 'Setting Saved Successfully.',
            });
        } catch (error) {
            if (file && file.length > 0) {
                for(let fileData of file){
                    await this.commonFileService.removeFileFromLocal(`${fileData.path}`);  
                }
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
            const where = { };
            let resultedData: any = await this.companyMetaService.listRecord(where);
            resultedData = <any>(
                await this.commonArrayService.formatToDto(CompanyMetaDto, resultedData, req.lang)
            );
            if(resultedData && resultedData.length){
                await Promise.all(resultedData.map(async (ele)=>{
                    if(ele.a_popup_title){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang, `agreement_title_content_${ele['org_id']}`, `/LC_MESSAGES/Common/Agreement/${req.tokenUser?.org_id  || ele['org_id']}`,`dynamic`);
                        if (customName != `agreement_title_content_${ele['org_id']}`) {
                            ele.a_popup_title = customName;
                        }
                    }
                    if(ele.a_popup_text){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang, `agreement_text_content_${ele['org_id']}`, `/LC_MESSAGES/Common/Agreement/${req.tokenUser?.org_id  || ele['org_id']}`,`dynamic`);
                        if (customName != `agreement_text_content_${ele['org_id']}`) {
                            ele.a_popup_text = customName;
                        }
                    }
                    if(ele.user_popup_title){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang, `user_popup_title_${ele['org_id']}`, `/LC_MESSAGES/Common/LoginPopup/${req.tokenUser?.org_id  || ele['org_id']}`,`dynamic`);
                        if (customName != `user_popup_title_${ele['org_id']}`) {
                            ele.user_popup_title = customName;
                        }
                    }
                    if(ele.agreement_text){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang, `agreement_text_${ele['org_id']}`, `/LC_MESSAGES/Common/SpouseAuthorizedPopup/${req.tokenUser?.org_id  || ele['org_id']}`,`dynamic`);
                        if (customName != `agreement_text_${ele['org_id']}`) {
                            ele.agreement_text = customName;
                        }
                    }
                    if(ele.title){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang, `inpo_pop_title_${ele['org_id']}_${ele['id']}`, `/LC_MESSAGES/Common/InformationPopup/${req.tokenUser?.org_id  || ele['org_id']}`,`dynamic`);
                        if (customName != `inpo_pop_title_${ele['org_id']}_${ele['id']}`) {
                            ele.title = customName;
                        }
                    }
                    if(ele.setting_dic){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang, `inpo_setting_dic_${ele['org_id']}_${ele['id']}`, `/LC_MESSAGES/Common/InformationPopup/${req.tokenUser?.org_id  || ele['org_id']}`,`dynamic`);
                        if (customName != `inpo_setting_dic_${ele['org_id']}_${ele['id']}`) {
                            ele.setting_dic = customName;
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
}
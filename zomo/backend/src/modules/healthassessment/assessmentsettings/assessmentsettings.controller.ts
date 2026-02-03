import { appConstant, AssessmentSettingsDto, CommonArrayService, CommonFileService, CommonService, imageConstant, tableConstant } from '@common-constants';
import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Inject,
    Post, Put,
    Req,
    Res, UploadedFile,
    UseGuards, UseInterceptors,
} from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { FileInterceptor } from "@nestjs/platform-express";
import { Request, Response } from "express";
import { diskStorage } from "multer";
import { lastValueFrom } from "rxjs";
import { ClientManagerAssignService } from "src/modules/company/clientmanagerassign/clientmanagerassign.service";
import { SettingsService } from "src/modules/company/settings/settings.service";
import { ActivityLogService } from "src/modules/master/activitylog/activitylog.service";
import { In, Not } from "typeorm";
import { AccessGuard, RoleGuard, TokenGuard } from "../../../guard";
import {
    CreateAssessmentSettingsInput,
    PaginateWithHealthAssessmentInput, UpdateAssessmentSettingsInput
} from "../../../input";
import { fileName, imgFilter } from "../../../utils/image-upload.utils";
import { TranslationService } from "../../translation/translation.service";
import { AssessmentOptionsService } from "../assessmentoptions/assessmentoptions.service";
import { AssessmentOptionsDetailsService } from "../assessmentoptionsdetails/assessmentoptionsdetails.service";
import { AssessmentQuestionsService } from "../assessmentquestions/assessmentquestions.service";
import { AssessmentQuestionsDetailsService } from "../assessmentquestionsdetails/assessmentquestionsdetails.service";
import { AssessmentResultsService } from "../assessmentresults/assessmentresults.service";
import { AssessmentTabsService } from "../assessmenttabs/assessmenttabs.service";
import { FrontService } from "../front/front.service";
import { AssessmentSettingsService } from "./assessmentsettings.service";
const path = require('path');
@Controller('health-assessment/settings')
@UseGuards(TokenGuard, RoleGuard)
export class AssessmentSettingsController {
    constructor(
        private readonly assessmentSettingsService: AssessmentSettingsService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
        private readonly translatorService: TranslationService,
        private readonly assessmentResultsService: AssessmentResultsService,
        private readonly assessmentTabsService: AssessmentTabsService,
        private readonly assessmentQuestionsService: AssessmentQuestionsService,
        private readonly assessmentQuestionsDetailsService: AssessmentQuestionsDetailsService,
        private readonly assessmentOptionsService: AssessmentOptionsService,
        private readonly assessmentOptionsDetailsService: AssessmentOptionsDetailsService,
        private readonly companySettingsService: SettingsService,
        private readonly activityLogService: ActivityLogService,
        @Inject('COMMON_SERVICE')
        private commonMicroservice: ClientProxy,
        private readonly clientManagerAssignService: ClientManagerAssignService,
        private readonly frontService: FrontService,
    ) {
    }
    @UseGuards(AccessGuard)
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithHealthAssessmentInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let where = `healthassessment.status !=0 `;
            if(postData?.organization_id){
                where +=`AND healthassessment.organization_id = '${postData?.organization_id}`;
            }
            if (appConstant.ROLE.CLIENTENGAGEMENTMANAGER == req.tokenUser?.role_id){
                let resultedData = await this.clientManagerAssignService.listRecord({user_id: req.tokenUser?.id,status: 1},null);
                if(resultedData.length > 0){
                    where += `AND healthassessment.organization_id IN (${resultedData.map(ele=>ele.org_id).join(',')})`;
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
            if (postData?.search_str) {
                where += `AND(healthassessment.banner_title LIKE '%${postData?.search_str}%' OR healthassessment.banner_description LIKE '%${postData?.search_str}%' OR healthassessment.banner_image LIKE '%${postData?.search_str}%' OR healthassessment.result_top_decscription LIKE '%${postData?.search_str}%' OR healthassessment.result_bottom_decscription LIKE '%${postData?.search_str}%')`;
            }
            const resultedData = await this.assessmentSettingsService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(AssessmentSettingsDto, resultedData['list'], req.lang)
            );
            if(resultedData['list'] && resultedData['list'].length){
                await Promise.all(resultedData['list'].map(async (ele)=>{
                    if(ele.banner_title){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`assessment_banner_title_${ele.organization_id}_${ele['id']}`, `/LC_MESSAGES/MyHealth/Assessment/eha/${ele.organization_id}`,`dynamic`);
                        ele.banner_title = (customName == '' || customName == `assessment_banner_title_${ele.organization_id}_${ele['id']}`) ? ele['banner_title'] : customName;
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
            postData.organization_id = postData?.organization_id ?? req.tokenUser?.org_id;
            if (!postData?.id && !postData?.organization_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = postData?.id ? postData?.organization_id ? { id: postData?.id, organization_id : postData?.organization_id } : { id: postData?.id } : { organization_id : postData?.organization_id};
            where['status'] = Not('2');
            let assessmentSetting = await this.assessmentSettingsService.findOne(where);
            if (!assessmentSetting) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }
            if (postData?.flag === 1) {
                if (!assessmentSetting.result_top_decscription) {
                    assessmentSetting.result_top_decscription = "<h4>Thank you! How to Approach Your Results</h4>";
                }
                if (!assessmentSetting.result_bottom_decscription) {
                    assessmentSetting.result_bottom_decscription = "<p>Stress, demand, overwhelm, anxiety and/or decision fatigue affect most people in daily life. It is natural to feel grief, fear, sadness, and other feelings when so much may feel out of our control. Often, these are normal reactions. You are not alone, although an isolating or lonely period may often make it feel that way. It's important to recognize the elements that we can control, and to acknowledge that most of us need more support during a stressful time. Ignoring, denial, and distraction can be short term strategies that are understandable, but will not be helpful to us in the long run.<br><br>The research is clear there are small steps we can each take to improve your ability to cope, function, and have more positive feelings. Here are some ideas of steps that may help you along the way. When you look at the following list, start small and pick just one area that you might want to work on. Come back later when you are ready to move on to a different area and try those suggestions.</p>";
                }
            }
            assessmentSetting = <any>(
                await this.commonArrayService.formatToDto(AssessmentSettingsDto, assessmentSetting, req.lang)
            );
            if (assessmentSetting.status === 1 && appConstant.ROLE.REGISTERED == req.tokenUser?.role_id) {
                if(assessmentSetting.banner_title){
                    let customName = await this.translatorService.frontendReadTranslation(req.lang,`assessment_banner_title_${assessmentSetting.organization_id}_${assessmentSetting['id']}`, `/LC_MESSAGES/MyHealth/Assessment/eha/${assessmentSetting.organization_id}`,`dynamic`);
                    assessmentSetting.banner_title = (customName == '' || customName == `assessment_banner_title_${assessmentSetting.organization_id}_${assessmentSetting['id']}`) ? assessmentSetting['banner_title'] : customName;
                }
                if(assessmentSetting?.banner_description){
                    let customName = await this.translatorService.frontendReadTranslation(req.lang,`assessment_banner_description_${assessmentSetting.organization_id}_${assessmentSetting['id']}`, `/LC_MESSAGES/MyHealth/Assessment/eha/${assessmentSetting.organization_id}`,`dynamic`);
                    assessmentSetting.banner_description = (customName == '' || customName == `assessment_banner_description_${assessmentSetting.organization_id}_${assessmentSetting['id']}`) ? assessmentSetting.banner_description : customName;
                }
                if(assessmentSetting?.result_top_decscription){
                    let customName = await this.translatorService.frontendReadTranslation(req.lang,`assessment_result_top_decscription_${assessmentSetting.organization_id}_${assessmentSetting['id']}`, `/LC_MESSAGES/MyHealth/Assessment/eha/${assessmentSetting.organization_id}`,`dynamic`);
                    assessmentSetting.result_top_decscription = (customName == '' || customName == `assessment_result_top_decscription_${assessmentSetting.organization_id}_${assessmentSetting['id']}`) ? assessmentSetting.result_top_decscription : customName;
                }
                if(assessmentSetting?.result_bottom_decscription){
                    let customName = await this.translatorService.frontendReadTranslation(req.lang,`assessment_result_bottom_decscription_${assessmentSetting.organization_id}_${assessmentSetting['id']}`, `/LC_MESSAGES/MyHealth/Assessment/eha/${assessmentSetting.organization_id}`,`dynamic`);
                    assessmentSetting.result_bottom_decscription = (customName == '' || customName == `assessment_result_bottom_decscription_${assessmentSetting.organization_id}_${assessmentSetting['id']}`) ? assessmentSetting.result_bottom_decscription : customName;
                }
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: assessmentSetting,
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
        FileInterceptor("banner_image", {
            limits: { fileSize: appConstant.FILE_SIZE },
            storage: diskStorage({
                destination: `${appConstant.WELLBEING_PATH}`,
                filename: fileName
            }),
            fileFilter: imgFilter
        }),
        AccessGuard
    )
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateAssessmentSettingsInput, @UploadedFile() file: Express.Multer.File) {
        try {
            postData.organization_id = postData?.organization_id ?? req.tokenUser?.org_id;
            if (!postData?.organization_id || !postData?.banner_title) {
                if (file && file.fieldname === 'banner_image' && file.filename) {
                    await this.commonFileService.removeFileFromLocal(file.path);
                }
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            postData['banner_image'] = imageConstant.HEALTH;
            let resultedData = await this.assessmentSettingsService.save({...postData, created_by: req.tokenUser?.id, updated_by: req.tokenUser?.id});
            if (file && file.fieldname === 'banner_image' && file.filename) {
                file.originalname = this.commonFileService.formatFileName(file.originalname);
                file.filename = `emosubanner/${postData?.organization_id.toString()}/emosubanner_${this.commonService.generateMD5(resultedData['id'].toString())}.${file.originalname.split('.')[file.originalname.split('.').length - 1]}`;
                await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(file.path),  filename: file.filename}));
                postData['banner_image'] = file.filename;
                await this.assessmentSettingsService.update({id: resultedData['id']}, {...postData, updated_by : req.tokenUser?.id});
                this.activityLogService.create(resultedData, postData, tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_SETTINGS, req.tokenUser?.id);
            }
            let dynamicDatas = Object.create(null);
            if(postData?.banner_title){
                let tilte = `assessment_banner_title_${postData?.organization_id}_${resultedData['id']}`
                dynamicDatas[`${tilte}`] = postData?.banner_title;
            }
            if(postData?.banner_description){
                let tilte = `assessment_banner_description_${postData?.organization_id}_${resultedData['id']}`
                dynamicDatas[`${tilte}`] = postData?.banner_description;
            }
            if(postData?.result_top_decscription){
                let tilte = `assessment_result_top_decscription_${postData?.organization_id}_${resultedData['id']}`
                dynamicDatas[`${tilte}`] = postData?.result_top_decscription;
            }
            if(postData?.result_bottom_decscription){
                let tilte = `assessment_result_bottom_decscription_${postData?.organization_id}_${resultedData['id']}`
                dynamicDatas[`${tilte}`] = postData?.result_bottom_decscription;
            }
            await this.translatorService.DynamicEngJsonData('MyHealth','eha',dynamicDatas,'Edit','Assessment',postData?.organization_id);
            return res.status(HttpStatus.CREATED).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: 'success',
            });
        } catch (error) {
            if (file && file.fieldname === 'banner_image' && file.filename) {
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
            const where = {id: postData?.id};
            const recordDetails = await this.assessmentSettingsService.findOne(where);
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
            await this.assessmentSettingsService.update(where,{status: 2});
            this.activityLogService.create(recordDetails, {status: 2}, tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_SETTINGS, req.tokenUser?.id, 'delete');
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
    @Put('update')
    @UseInterceptors(
        FileInterceptor("banner_image", {
            limits: { fileSize: appConstant.FILE_SIZE },
            storage: diskStorage({
                destination: `${appConstant.WELLBEING_PATH}`,
                filename: fileName
            }),
            fileFilter: imgFilter
        }),
        AccessGuard
    )
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: UpdateAssessmentSettingsInput, @UploadedFile() file: Express.Multer.File) {
        try {
            postData.organization_id = postData?.organization_id ?? req.tokenUser?.org_id;
            if (!postData?.id || !postData?.organization_id) {
                if (file && file.fieldname === 'banner_image' && file.filename) {
                    await this.commonFileService.removeFileFromLocal(file.path);
                }
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            postData['banner_image'] = imageConstant.HEALTH;
            const recordDetails = await this.assessmentSettingsService.findOne({id: postData?.id});
            let resultedData: any;
            if (!recordDetails) {
                resultedData = await this.assessmentSettingsService.save({...postData, created_by: req.tokenUser?.id, updated_by: req.tokenUser?.id});
            }
            if (file && file.fieldname === 'banner_image' && file.filename) {
                postData.id = postData?.id ? postData?.id : resultedData['id'];
                file.originalname = this.commonFileService.formatFileName(file.originalname);
                file.filename = `emosubanner/${postData?.organization_id.toString()}/emosubanner_${this.commonService.generateMD5(postData?.id.toString())}.${file.originalname.split('.')[file.originalname.split('.').length - 1]}`;
                await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(file.path),  filename: file.filename}));
                postData['banner_image'] = file.filename;
            }
            await this.assessmentSettingsService.update({id: postData?.id}, {...postData, updated_by : req.tokenUser?.id});
            this.activityLogService.create(recordDetails, postData, tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_SETTINGS, req.tokenUser?.id);
            let dynamicDatas = Object.create(null);
            if(postData?.banner_title){
                let tilte = `assessment_banner_title_${postData?.organization_id}_${postData['id']}`
                dynamicDatas[`${tilte}`] = postData?.banner_title;
            }
            if(postData?.banner_description){
                let tilte = `assessment_banner_description_${postData?.organization_id}_${postData['id']}`
                dynamicDatas[`${tilte}`] = postData?.banner_description;
            }
            if(postData?.result_top_decscription){
                let tilte = `assessment_result_top_decscription_${postData?.organization_id}_${postData['id']}`
                dynamicDatas[`${tilte}`] = postData?.result_top_decscription;
            }
            if(postData?.result_bottom_decscription){
                let tilte = `assessment_result_bottom_decscription_${postData?.organization_id}_${postData['id']}`
                dynamicDatas[`${tilte}`] = postData?.result_bottom_decscription;
            }
            await this.translatorService.DynamicEngJsonData('MyHealth','eha',dynamicDatas,'Edit','Assessment',postData?.organization_id);
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, 'MSG_SETTING_UPDATED'),
            });
        } catch (error) {
            if (file && file.fieldname === 'banner_image' && file.filename) {
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
            const where = { };
            let resultedData = await this.assessmentSettingsService.listRecord(where);
            resultedData = <any>(
                await this.commonArrayService.formatToDto(AssessmentSettingsDto, resultedData, req.lang)
            );
            if(resultedData && resultedData.length){
                await Promise.all(resultedData.map(async (ele)=>{
                    if(ele.banner_title){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`assessment_banner_title_${ele.organization_id}_${ele['id']}`, `/LC_MESSAGES/MyHealth/Assessment/eha/${ele.organization_id}`,`dynamic`);
                        ele.banner_title = (customName == '' || customName == `assessment_banner_title_${ele.organization_id}_${ele['id']}`) ? ele['banner_title'] : customName;
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
    @Post('copy-list')
    async copyList(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithHealthAssessmentInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let where = `healthassessment.status !=2 AND healthassessment.copied_organization != 0 `;
            if (postData?.search_str) {
                where += `AND(from_org.company_name LIKE '%${postData?.search_str}%' OR to_org.company_name LIKE '%${postData?.search_str}%')`;
            }
            let resultedData = await this.assessmentSettingsService.paginateList(
                where,
                postData,);
             resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(AssessmentSettingsDto, resultedData['list'], req.lang)
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
    @Post('copy')
    async copy(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.from_org || !postData?.to_org) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let checkExist: any = await this.frontService.assessmentSettingsExists({organization_id: postData?.from_org, status: Not('2')});
            if (!checkExist) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_COPY"));
            }
            let dynamicDatas = Object.create(null);
            let getToOrgSetting = await this.frontService.assessmentSettingsFindOne( ['id'],{ organization_id: postData?.to_org, status: Not('2') });
            let assessmentSettingsId = getToOrgSetting?.id;
            /* get fromOrg setting to copy in toOrg */
            let fromOrgToToOrgData: any = await this.frontService.assessmentSettingsFindOne( ['banner_title','banner_description','banner_image','result_top_decscription','result_bottom_decscription'],{ organization_id: postData?.from_org, status: Not('2') });
            fromOrgToToOrgData = fromOrgToToOrgData ?? {};
            fromOrgToToOrgData['organization_id'] = postData?.to_org;
            fromOrgToToOrgData['copied_organization'] = postData?.from_org;
            fromOrgToToOrgData['created_by'] = 1;
            fromOrgToToOrgData['updated_by'] = 1;
            fromOrgToToOrgData['status'] = 1;
            if (getToOrgSetting?.id) {
                await this.assessmentSettingsService.update({id: getToOrgSetting.id},fromOrgToToOrgData);
            } else {
                let saveSetting = await this.assessmentSettingsService.save(fromOrgToToOrgData);
                assessmentSettingsId = saveSetting['id']
            }
            if(fromOrgToToOrgData?.banner_title){
                let tilte = `assessment_banner_title_${fromOrgToToOrgData?.organization_id}_${assessmentSettingsId}`
                dynamicDatas[`${tilte}`] = fromOrgToToOrgData?.banner_title;
            }
            if(fromOrgToToOrgData?.banner_description){
                let tilte = `assessment_banner_description_${fromOrgToToOrgData?.organization_id}_${assessmentSettingsId}`
                dynamicDatas[`${tilte}`] = fromOrgToToOrgData?.banner_description;
            }
            if(fromOrgToToOrgData?.result_top_decscription){
                let tilte = `assessment_result_top_decscription_${fromOrgToToOrgData?.organization_id}_${assessmentSettingsId}`
                dynamicDatas[`${tilte}`] = fromOrgToToOrgData?.result_top_decscription;
            }
            if(fromOrgToToOrgData?.result_bottom_decscription){
                let tilte = `assessment_result_bottom_decscription_${fromOrgToToOrgData?.organization_id}_${assessmentSettingsId}`
                dynamicDatas[`${tilte}`] = fromOrgToToOrgData?.result_bottom_decscription;
            }
            await this.companySettingsService.update({org_id: postData?.to_org},{is_emo_health_asssessments: 1});
            let resultSaveArray = [];
            let resultData = await this.assessmentResultsService.listRecord({organization_id: postData?.from_org, status: Not('2')},['id','organization_id','title','status','marker-low','marker-mod','marker-high','type','is_response','marker-common','marker-common_last','order_id','no_of_risk']);
            let resultIdsObj1 = {},resultIdsObj2 = {};
            for (let i = 0; i < resultData.length; i++) {
                let data = resultData[i]
                data['organization_id'] = postData?.to_org;
                resultIdsObj1[i] = data['id'];
                delete data['id'];
                data['created_by'] = 1;
                data['updated_by'] = 1;
                resultSaveArray.push(data)
            }
            let saveResult = await this.assessmentResultsService.save(resultSaveArray);
            for (let i = 0; i < saveResult.length; i++) {
                let saveResultData = saveResult[i]
                resultIdsObj2[i] = saveResult[i].id;
                if(saveResultData?.title){
                    let tilte = `assessment_title_${saveResultData?.organization_id}_${saveResultData['id']}`
                    dynamicDatas[`${tilte}`]= saveResultData?.title;
                }
                if(saveResultData['marker-low']){
                    let tilte = `assessment_markerlow_${saveResultData?.organization_id}_${saveResultData['id']}`
                    dynamicDatas[`${tilte}`]= saveResultData['marker-low'];
                }
                if(saveResultData['marker-mod']){
                    let tilte = `assessment_markermod_${saveResultData?.organization_id}_${saveResultData['id']}`
                    dynamicDatas[`${tilte}`]= saveResultData['marker-mod'];
                }
                if(saveResultData['marker-high']){
                    let tilte = `assessment_markerhigh_${saveResultData?.organization_id}_${saveResultData['id']}`
                    dynamicDatas[`${tilte}`]= saveResultData['marker-high'];
                }
                if(saveResultData['marker-common']){
                    let tilte = `assessment_markercommon_${saveResultData?.organization_id}_${saveResultData['id']}`
                    dynamicDatas[`${tilte}`]= saveResultData['marker-common'];
                }
                if(saveResultData['marker-common_last']){
                    let tilte = `assessment_markercommonlast_${saveResultData?.organization_id}_${saveResultData['id']}`
                    dynamicDatas[`${tilte}`]= saveResultData['marker-common_last'];
                }
            }
            const resultIds = {};
            for (let i = 0, len = Object.keys(resultIdsObj1).length; i < len; i++) {
                resultIds[resultIdsObj1[i]] = resultIdsObj2[i];
            }
            let resultedData = await this.frontService.assessmentTabsData(['at.title','at.status','at.sort_order','at.marker-low','at.marker-mod','at.marker-high','aq.id','aq.type','aq.question_type','aq.show_gender','aq.parent_id','aq.parent_option_id','aq.sort_order','aq.required','aq.general_info','aq.not_applicable','aq.m_section_weight','aq.f_section_weight','aq.age_considered','aq.age_limit','aq.age_condition','aq.result_type','aq.status','aqd.id','aqd.question_id','aqd.language_id','aqd.question_title','aqd.main_question_id','aqd.status','ao.id','ao.question_id','ao.parent_id','ao.sort_order','ao.range_type','ao.start_value','ao.end_value','ao.risk_rating','ao.type','ao.status','ao.message_add','aod.id','aod.option_id','aod.language_id','aod.option_title','aod.main_option_id','aod.status'],`at.organization_id = ${postData?.from_org} AND at.status != '2'`, { 'at.sort_order' : 'ASC' }, [{'join_table': 'at.aq','alias':'aq', 'table' : tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_QUESTIONS, 'on_condition' : `at.id = aq.tab_id AND aq.status != '2'`, 'join_type': 'left_many' },{'join_table': 'aq.aqd','alias':'aqd', 'table' : tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_QUESTIONS_DETAILS, 'on_condition' : `aq.id = aqd.question_id AND aqd.status != '2'`, 'join_type': 'left_many' },{'join_table': 'aq.ao','alias':'ao', 'table' : tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_OPTIONS, 'on_condition' : `aq.id = ao.question_id AND ao.status != '2'`, 'join_type': 'left_many' },{'join_table': 'ao.aod','alias':'aod', 'table' : tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_OPTIONS_DETAILS, 'on_condition' : `ao.id = aod.option_id AND aod.status != '2'`, 'join_type': 'left_many' }],'getMany');
            let questionArray = {}, optionArray = {},questionDetailArray = {},optionDetailArray = {};
            for (let i = 0; i < resultedData.length; i++) {
                let data = resultedData[i];
                let copyTab = {title: data['title'],sort_order: data['sort_order'],'marker-low': data['marker-low'],'marker-mod': data['marker-mod'],'marker-high': data['marker-high'],status: data['status'],organization_id: postData?.to_org,created_by: 1,updated_by: 1}
                let saveTab = await this.assessmentTabsService.save({ ...copyTab });
                let tabId = saveTab['id'];
                if(data['title']){
                    let tilte = `assessment_tabs_title_${saveTab['organization_id']}_${saveTab['id']}`
                    dynamicDatas[`${tilte}`]= data['title'];
                }
                if (data['aq'].length) {
                    let questionData = JSON.parse(JSON.stringify(data['aq']));
                    for (let j = 0; j < questionData.length; j++) {
                        let question = questionData[j];
                        let saveQuestionObj = {'type': question['type'],'question_type': question['question_type'],'show_gender': question['show_gender'],'parent_id': question['parent_id'],'parent_option_id': question['parent_option_id'],'sort_order': question['sort_order'],'required': question['required'],'general_info': question['general_info'],'not_applicable': question['not_applicable'],'m_section_weight': question['m_section_weight'],'f_section_weight': question['f_section_weight'],'age_considered': question['age_considered'],'age_limit': question['age_limit'],'age_condition': question['age_condition'],'result_type': question['result_type'],'created_by': 1,'updated_by': 1};
                        if (question['result_type'] != '0') {
                            if (resultIds[question['result_type']]) {
                                saveQuestionObj['result_type'] = resultIds[question['result_type']]
                            }
                        }
                        let tmpQID = question['id'];
                        saveQuestionObj['tab_id'] = tabId;
                        if (question['parent_id'] != '0') {
                            saveQuestionObj['parent_id'] = questionArray[question['parent_id']];
                        }
                        if (question['parent_option_id'] != '0') {
                            saveQuestionObj['parent_option_id'] = optionArray[question['parent_option_id']];
                        }
                        let saveQuestion = await this.assessmentQuestionsService.save({...saveQuestionObj});
                        let questionsId = saveQuestion['id'];
                        questionArray[tmpQID] = questionsId;
                        if (question['aqd'].length) {
                            for (let k = 0; k < question['aqd'].length; k++) {
                                let questionDetail = question['aqd'][k];
                                let saveQuestionDetailObj = {'question_id': questionsId,'language_id': questionDetail['language_id'],'question_title': questionDetail['question_title'],'main_question_id': questionDetail['main_question_id'],'status': questionDetail['status']}
                                let tmpQdID = questionDetail['id'];
                                if (questionDetail['main_question_id'] != '0') {
                                    saveQuestionDetailObj['main_question_id'] = questionDetailArray[questionDetail['main_question_id']];
                                }
                                let questionDetails = await this.assessmentQuestionsDetailsService.save({...saveQuestionDetailObj});
                                if(questionDetail['question_title']){
                                    let tilte = `assessment_question_title_${tabId}_${questionsId}`
                                    dynamicDatas[`${tilte}`] = questionDetail['question_title'];
                                }
                                questionDetailArray[tmpQdID] = questionDetails['id']
                            }
                        }
                        if (question['ao'].length) {
                            for (let k = 0; k < question['ao'].length; k++) {
                                let option = question['ao'][k];
                                let saveOptionObj = {'question_id': questionsId,'parent_id': option['parent_id'],'sort_order': option['sort_order'],'range_type': option['range_type'],'start_value': option['start_value'],'end_value': option['end_value'],'risk_rating': option['risk_rating'],'type': option['type'],'status': option['status'],'message_add': option['message_add'],'created_by': 1,'updated_by': 1}
                                let tmpQdID = option['id'];
                                if (question['parent_id'] != '0') {
                                    saveOptionObj['parent_id'] = optionArray[question['parent_id']];
                                }
                                let saveOptions = await this.assessmentOptionsService.save({...saveOptionObj});
                                let optionId = saveOptions['id']
                                optionArray[tmpQdID] = optionId;
                                if (option['aod'].length) {
                                    for (let l = 0; l < option['aod'].length; l++) {
                                        let optionDetail = option['aod'][l];
                                        let saveOptionDetailObj = {'option_id': optionId,'language_id': optionDetail['language_id'],'option_title': optionDetail['option_title'],'main_option_id': optionDetail['main_option_id'],'status': optionDetail['status']}
                                        let tmpOdID = optionDetail['id'];
                                        if (optionDetail['main_option_id'] != '0') {
                                            saveOptionDetailObj['main_option_id'] = optionDetailArray[optionDetail['main_option_id']];
                                        }
                                        let saveOptionDetail = await this.assessmentOptionsDetailsService.save({...saveOptionDetailObj});
                                        if(optionDetail['option_title']){
                                            let tilte = `assessment_option_title_${questionsId}_${optionId}`
                                            dynamicDatas[`${tilte}`] = optionDetail['option_title'];
                                        }
                                        optionDetailArray[tmpOdID] = saveOptionDetail['id']
                                    }
                                }
                            }
                        }
                    }
                }
            }
            await this.translatorService.DynamicEngJsonData('MyHealth','eha',dynamicDatas,'Edit','Assessment',postData?.to_org);
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
    @Post('copy-delete')
    async copyDelete(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = {id: postData?.id};
            const recordDetails = await this.assessmentSettingsService.findOne(where);
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
            let tabRecords = await this.frontService.assessmentTabsData( ['*'],{organization_id: recordDetails.organization_id, status: Not('2')},null,null,'getRawMany');
            let tabIds = [];
            for (let i = 0; i < tabRecords.length; i++) {
                tabIds.push(tabRecords[i].id);
            }
            await this.assessmentTabsService.update({id: In(tabIds), status: Not('2')},{status: 2});
            for (let i = 0; i < tabRecords.length; i++) {
                this.activityLogService.create(tabRecords[i], {status: 2}, tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_TABS, req.tokenUser?.id, 'delete');
            }
            const questionRecords = await this.assessmentQuestionsService.listRecord({tab_id: In(tabIds),status: Not('2')});
            let questionIds = [];
            for (let i = 0; i < questionRecords.length; i++) {
                questionIds.push(questionRecords[i].id);
            }
            await this.assessmentQuestionsService.update({id: In(questionIds), status: Not('2')},{status: 2});
            for (let i = 0; i < questionRecords.length; i++) {
                this.activityLogService.create(questionRecords[i], {status: 2}, tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_QUESTIONS, req.tokenUser?.id, 'delete');
            }
            let questionDetailData = await this.assessmentQuestionsDetailsService.listRecord({question_id: In(questionIds), status: Not('2')});
            await this.assessmentQuestionsDetailsService.update({question_id: In(questionIds), status: Not('2')},{status: 2});
            for (let i = 0; i < questionDetailData.length; i++) {
                this.activityLogService.create(questionDetailData[i], {status: 2}, tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_QUESTIONS_DETAILS, req.tokenUser?.id, 'delete');
            }
            let optionRecords = await this.frontService.assessmentOptionData( ['*'],{question_id: In(questionIds), status: Not('2')},null,null,'getRawMany');
            let optionIds = [];
            for (let i = 0; i < optionRecords.length; i++) {
                optionIds.push(optionRecords[i].id);
            }
            await this.assessmentOptionsService.update({question_id: In(questionIds), status: Not('2')},{status: 2});
            for (let i = 0; i < optionRecords.length; i++) {
                this.activityLogService.create(optionRecords[i], {status: 2}, tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_OPTIONS, req.tokenUser?.id, 'delete');
            }
            let optionDetailData = await this.assessmentOptionsDetailsService.listRecord({option_id: In(optionIds), status: Not('2')});
            await this.assessmentOptionsDetailsService.update({option_id: In(optionIds), status: Not('2')}, {status:2});
            for (let i = 0; i < optionDetailData.length; i++) {
                this.activityLogService.create(optionDetailData[i], {status:2}, tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_OPTIONS_DETAILS, req.tokenUser?.id,'delete');
            }
            await this.assessmentSettingsService.update(where,{status: 2,copied_organization: 0});
            this.activityLogService.create(recordDetails, {status: 2}, tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_SETTINGS, req.tokenUser?.id, 'delete');
            const compSetting = await this.companySettingsService.findOne({org_id: recordDetails.organization_id});
            await this.companySettingsService.update({org_id: recordDetails.organization_id},{is_emo_health_asssessments: 0});
            this.activityLogService.create(compSetting, {is_emo_health_asssessments: 0}, tableConstant.COMPANIES.TBL_COMPANY_SETTINGS, req.tokenUser?.id);
            const assessmentResultsData = await this.assessmentResultsService.listRecord({organization_id: recordDetails.organization_id, status: Not('2')});
            await this.assessmentResultsService.update({organization_id: recordDetails.organization_id, status: Not('2')},{status:2});
            this.activityLogService.create(assessmentResultsData, {status: 2}, tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_RESULTS, req.tokenUser?.id);
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
}
import { CommonArrayService, CommonDateService, CommonFileService, PostCodesDto } from '@common-constants';
import { Body, Controller, HttpException, HttpStatus, Inject, Post, Req, Res, UseGuards } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { Request, Response } from "express";
import { lastValueFrom } from "rxjs";
import { AccessGuard, RoleGuard, TokenGuard } from "src/guard";
import { ActivityLogService } from "src/modules/master/activitylog/activitylog.service";
import { In, Like, Not } from "typeorm";
import { ActivityService } from "../activity/activity/activity.service";
import { ActivePluginService } from "../company/activeplugins/activeplugin.service";
import { DiseaseFormsService } from "../diseasemanagement/diseaseforms/diseaseforms.service";
import { ManageFormsService } from "../diseasemanagement/manageforms/manageforms.service";
import { PhysicianFormsService } from "../diseasemanagement/physicianforms/physicianforms.service";
import { StandardCareService } from "../diseasemanagement/standardcare/standardcare.service";
import { AuthorizationsService } from "../healthcheckup/authorizations/authorizations.service";
import { TranslationService } from "../translation/translation.service";
import { UserService } from "../user/user/user.service";
import { FormService } from "./form.service";
import { FormHelperService } from "./formhelper.service";
import { findInput, physicianDiseasesStepsInput } from './input';
import { UrlManageService } from '../common';
@Controller('form')
export class FormController {
    constructor(
        private readonly commonArrayService: CommonArrayService,
        private readonly commonDateService: CommonDateService,
        private readonly commonFileService: CommonFileService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        private readonly userService: UserService,
        private readonly authorizationsService: AuthorizationsService,
        private readonly activePluginService: ActivePluginService,
        private readonly diseaseFormsService: DiseaseFormsService,
        private readonly activityService: ActivityService,
        private readonly manageFormsService: ManageFormsService,
        private readonly formService: FormService,
        private readonly standardCareService: StandardCareService,
        private readonly physicianFormsService: PhysicianFormsService,
        private readonly formHelperService: FormHelperService,
        private readonly urlManageService: UrlManageService,
        @Inject('COMMON_SERVICE') private readonly commonMicroservice: ClientProxy,
        @Inject('POSTCODES_SERVICE') private client: ClientProxy,
    ) { }
    @Post('form-list')
    async formList(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.fillType) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let formList = { 1: 'Physician Visit - Preventive', 4: 'Dental Visit', 24: 'Optometrist / Ophthalmologist Visit' };
            if(postData?.fillType == 3){
                formList = { 1: 'Physician', 4: 'Dentist', 24: 'Optometrist' };
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: formList,
                message: 'success'
            });
        } catch (error) {
            this.activityLogService.error_log(req?.tokenUser?.id,req?.originalUrl, error?.message, error, req);
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
    @Post('validUserCode')
    async checkUserExist(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if(postData?.type && postData?.type == 1){   // type = 1 -> Disease
                if (!postData?.user_code || !postData?.form_id) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
            }
            else if(postData?.type && postData?.type == 2){ // type = 2 -> biometrics
                if (!postData?.user_code) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
            }else{
                if (!postData?.user_code || !postData?.form_type) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
            }
            if(postData?.type && postData?.type == 1){   // start type = 1 -> Disease
                let resultedData = Object.create(null);
                let checkuser = await this.userService.findOne(`user.code = '${postData?.user_code}' AND user.role_id IN (2,16)`);
                if (checkuser) {
                    let formdisease = await this.manageFormsService.findOne({ company_id: checkuser.org_id })
                    if (formdisease) {
                        let disList = formdisease?.disease_form_ids?.split(",") || [];
                        let validform = await this.diseaseFormsService.findOne(`diseaseforms.code = '${postData?.form_id}' AND diseaseforms.disease_id IN (${disList.join(',')})`)
                        if (validform) {
                            let activatedUser = await this.userService.findOne(`user.code = '${postData?.user_code}' AND user.role_id IN (2,16) AND user.status = 1`);
                            if (activatedUser) {
                                let activeplugin = await this.activePluginService.getActivePluginList(checkuser.org_id);
                                if (activeplugin?.includes("Diseasemanagement")) {
                                    resultedData = {
                                        user_id: checkuser.id,
                                        form_id: validform.id,
                                        form_code: validform.code,
                                        company_id: checkuser.org_id,
                                        signature: postData?.signature || '',
                                        is_signed: postData?.is_signed || 0,
                                    }
                                } else {
                                    let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "Disease Management Program is not Activated for Organization of this User.");
                                    return res.status(HttpStatus.OK).json({
                                        statusCode: 200,
                                        success: 0,
                                        error: 1,
                                        data: null,
                                        message: errorMessage,
                                    });
                                }
                            } else {
                                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "This Patient / User is Deactivated by Administrator.");
                                return res.status(HttpStatus.OK).json({
                                    statusCode: 200,
                                    success: 0,
                                    error: 1,
                                    data: null,
                                    message: errorMessage,
                                });
                            }
                        } else {
                            let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "This Form ID is not valid for the Diseases of this Organization.");
                            return res.status(HttpStatus.OK).json({
                                statusCode: 200,
                                success: 0,
                                error: 1,
                                data: null,
                                message: errorMessage,
                            });
                        }
                    } else {
                        let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "This Form ID is not valid for the Diseases of this Organization.");
                        return res.status(HttpStatus.OK).json({
                            statusCode: 200,
                            success: 0,
                            error: 1,
                            data: null,
                            message: errorMessage,
                        });
                    }
                }
                else{
                    let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_MEMBERID_NOT_FOUND");
                    return res.status(HttpStatus.OK).json({
                        statusCode: 200,
                        success: 0,
                        error: 1,
                        data: null,
                        message: errorMessage,
                    });
                }
                return res.status(HttpStatus.OK).json({
                    statusCode: 201,
                    success: 1,
                    error: 0,
                    data: resultedData,
                    message: 'success'
                });
            }
            if (postData?.type && postData?.type == 2) {   // start type = 2 -> biometrics
                let resultedData = Object.create(null);
                let checkuser = await this.userService.findOne(`user.code = '${postData?.user_code}' AND user.role_id IN (2,16)`);
                if (checkuser) {
                    let activatedUser = await this.userService.findOne(`user.code = '${postData?.user_code}' AND user.role_id IN (2,16) AND user.status = 1`);
                    if (activatedUser) {
                        resultedData = {
                            user_id: checkuser.id,
                            company_id: checkuser.org_id,
                            signature: postData?.signature || '',
                            is_signed: postData?.is_signed || 0,
                        }
                    } else {
                        let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "This Patient / User is Deactivated by Administrator.");
                        return res.status(HttpStatus.OK).json({
                            statusCode: 200,
                            success: 1,
                            error: 0,
                            data: null,
                            message: errorMessage,
                        });
                    }
                }
                else {
                    let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_MEMBERID_NOT_FOUND");
                    return res.status(HttpStatus.OK).json({
                        statusCode: 200,
                        success: 1,
                        error: 0,
                        data: null,
                        message: errorMessage,
                    });
                }
                return res.status(HttpStatus.OK).json({
                    statusCode: 201,
                    success: 1,
                    error: 0,
                    data: resultedData,
                    message: 'success'
                });
            }
            let resultedData = Object.create(null);
            let checkuser = await this.userService.findOne(`user.code = '${postData?.user_code}' AND user.role_id IN (2,16) AND company.status = 1`);
            if (!checkuser) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_MEMBERID_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 0,
                    error: 1,
                    data: null,
                    message: errorMessage,
                });
            } else {
                let type_of_form = 'Physician';
                if (postData?.form_type == 4) {
                    type_of_form = 'Dental';
                } else if (postData?.form_type == 24) {
                    type_of_form = 'Optometrist';
                }
                let companyid = checkuser.org_id;
                let activeplugin = await this.activePluginService.getActivePluginList(companyid);
                if (activeplugin && activeplugin.length > 0) {
                    if (activeplugin.includes('Healthcheckup')) {
                        let auth = await this.authorizationsService.findOne({ user_id: checkuser.id, type_of_form: type_of_form, status: Not(2) });
                        let program = await this.formService.getFormInstructions({ company_id: companyid },['forminstructions']);
                        let dentaltabsetting = program?.yearly_opts ?? 1;
                        program.program_selection = program.program_selection
                            .split(',')
                            .map(item => item.trim().replace(/s$/i, ''))
                            .filter((value, index, self) => self.indexOf(value) === index)
                            .join(',');
                        let prog = program?.program_selection?.split(',') || [];
                        resultedData.dentaltabsetting = dentaltabsetting;
                        if (postData?.type && postData?.type == 4) {
                            let getCompanyFormLimit = await this.formService.getCompanyFormLimit({ org_id: companyid },['companysettings.id', 'companysettings.org_id', 'companysettings.form_limit']);
                            if (getCompanyFormLimit && getCompanyFormLimit?.form_limit == 1) {
                                resultedData.dentaltabsetting = 2
                            }
                        }
                        resultedData.companyid = companyid;
                        resultedData.user_id = checkuser?.id;
                        if (prog.includes('2') && postData?.form_type == 4) {
                            let dtype = 0;
                            if (auth?.type_of_form == 'Dental') {
                                dtype = 1;
                            }
                            resultedData.start_date = await this.commonDateService.DateTimeFormat(program.dvf_start_date, 'MM-DD-YYYY');
                            resultedData.end_date = await this.commonDateService.DateTimeFormat(program.dvf_end_date, 'MM-DD-YYYY');
                            resultedData.type = dtype;
                            resultedData.form_name = 'Dentist';
                        } else if (prog.includes('3') && postData?.form_type == 24) {
                            let otype = 0;
                            if (auth?.type_of_form == 'Optometrist') {
                                otype = 1;
                            }
                            resultedData.start_date = await this.commonDateService.DateTimeFormat(program.ovf_start_date, 'MM-DD-YYYY');
                            resultedData.end_date = await this.commonDateService.DateTimeFormat(program.ovf_end_date, 'MM-DD-YYYY');
                            resultedData.type = otype;
                            resultedData.form_name = 'Optometrist';
                        } else if (prog.includes('1') && postData?.form_type == 1) {
                            let ptype = 0;
                            if (auth?.type_of_form == 'Physician') {
                                ptype = 1;
                            }
                            resultedData.start_date = await this.commonDateService.DateTimeFormat(program.pf_start_date, 'MM-DD-YYYY');
                            resultedData.end_date = await this.commonDateService.DateTimeFormat(program.pf_end_date, 'MM-DD-YYYY');
                            resultedData.type = ptype;
                            resultedData.form_name = 'Physician';
                        }
                    }
                }
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: resultedData,
                message: 'success'
            });
        } catch (error) {
            this.activityLogService.error_log(req?.tokenUser?.id,req?.originalUrl, error?.message, error, req);
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
    @Post('login-validUserCode')
    @UseGuards(TokenGuard, RoleGuard, AccessGuard)
    async validUserCodeSteps(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            await this.checkUserExist(req, res, postData);
        } catch (error) {
            this.activityLogService.error_log(req?.tokenUser?.id,req?.originalUrl, error?.message, error, req);
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
    @Post('form-steps')
    async formStepsAPI(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try{
            let returnDatas = await this.formHelperService.formSteps(req,postData)
            if (returnDatas?.error && returnDatas.error == 1) {
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 0,
                    error: 1,
                    redirect: 1,
                    data: `/forms`,
                    message: returnDatas?.message
                });
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: returnDatas,
                message: 'success'
            });
        }catch(error){
            this.activityLogService.error_log(req?.tokenUser?.id,req?.originalUrl, error?.message, error, req);
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

    @Post('login-form-steps')
    @UseGuards(TokenGuard, RoleGuard, AccessGuard)
    async loginFormSteps(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            postData.userIdM = req?.tokenUser?.id //after login form datamanager id
            if(postData?.fillType && postData?.fillType == 5){
                postData.fillType = 5 //after physician login form
                postData.form_type = 1
            }else{
                postData.fillType = 2 //after login form
            }
            let result = await this.formHelperService.formSteps(req,  postData);
            if (result?.error && result.error == 1) {
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 0,
                    error: 1,
                    redirect: 1,
                    data: `/forms`,
                    message: result?.message
                });
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: result,
                message: 'success'
            });
        } catch (error) {
            this.activityLogService.error_log(req?.tokenUser?.id,req?.originalUrl, error?.message, error, req);
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
    @Post('step-one')
    async stepOneAPI(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try{
            let result = await this.formHelperService.stepOne(req, postData);
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: result,
                message: 'success'
            });
        }catch(error){
            this.activityLogService.error_log(req?.tokenUser?.id,req?.originalUrl, error?.message, error, req);
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
    
    @Post('biometric')
    async biometricStepAPI(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try{
            let result = await this.formHelperService.biometricStep(req, postData);
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: result,
                message: 'success'
            });
        }catch(error){
            this.activityLogService.error_log(req?.tokenUser?.id,req?.originalUrl, error?.message, error, req);
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
    
    @Post('disease')
    async diseaseStepAPI(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try{
            let result = await this.formHelperService.diseaseStep(req, postData);
            if (result?.error && result.error == 1) {
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 0,
                    error: 1,
                    redirect: 1,
                    data: `/forms`,
                    message: result?.message
                });
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: result,
                message: 'success'
            });
        }catch(error){
            this.activityLogService.error_log(req?.tokenUser?.id,req?.originalUrl, error?.message, error, req);
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
   
    @Post('age')
    async ageStepAPI(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try{
            let result = await this.formHelperService.ageStep(req, postData);
            if (result?.error && result.error == 1) {
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 0,
                    error: 1,
                    redirect: 1,
                    data: `/forms`,
                    message: result?.message
                });
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: result,
                message: 'success'
            });
        }catch(error){
            this.activityLogService.error_log(req?.tokenUser?.id,req?.originalUrl, error?.message, error, req);
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
    
    @Post('tobacco')
    async tobaccoStepAPI(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try{
            let result = await this.formHelperService.tobaccoStep(req, postData);
            if (result?.error && result.error == 1) {
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 0,
                    error: 1,
                    redirect: 1,
                    data: `/forms`,
                    message: result?.message
                });
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: result,
                message: 'success'
            });
        }catch(error){
            this.activityLogService.error_log(req?.tokenUser?.id,req?.originalUrl, error?.message, error, req);
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
    
    @Post('confirm')
    async confirmStepAPI(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try{
            let result = await this.formHelperService.confirmStep(req, postData);
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: result,
                message: 'success'
            });
        }catch(error){
            this.activityLogService.error_log(req?.tokenUser?.id,req?.originalUrl, error?.message, error, req);
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
    
    @Post('physician-register')
    async physicianRegisterAPI(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try{
            let result = await this.formHelperService.physicianRegister(req, postData);
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: result,
                message: 'success'
            });
        }catch(error){
            await this.activityLogService.error_log(req?.tokenUser?.id,req?.originalUrl, error?.message, error);
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
    
    @Post('thanks')
    async thanksStepAPI(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try{
            let result = await this.formHelperService.thanksStep(req, postData);
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: result,
                message: 'success'
            });
        }catch(error){
            this.activityLogService.error_log(req?.tokenUser?.id,req?.originalUrl, error?.message, error, req);
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
    
    @Post('dental')
    async dentalStepAPI(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try{
            let result = await this.formHelperService.dentalStep(req, postData);
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: result,
                message: 'success'
            });
        }catch(error){
            this.activityLogService.error_log(req?.tokenUser?.id,req?.originalUrl, error?.message, error, req);
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
    
    @Post('physician-dental-steps')
    @UseGuards(TokenGuard, RoleGuard, AccessGuard)
    async physicianDentalSteps(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.user_code) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let getUserId = await this.formService.getUserDetails({ code: postData?.user_code, role_id: In([2, 16]), status: '1' }, ['user.id', 'user.org_id','user.membership_code', 'user.dob','user.email','user.first_name']);
            if(getUserId){
                let checkuser = await this.userService.findOne(`user.code = '${postData?.user_code}' AND user.role_id IN (2,16) AND company.status = 1`);
                if(checkuser){
                    let storeData = Object.create(null);
                    let orgId = getUserId.org_id
                    let UserId = getUserId.id
                    let getCompanyFormLimit = await this.formService.getCompanyFormLimit({ org_id: orgId }, ['companysettings.id', 'companysettings.org_id', 'companysettings.form_limit']);
                    let getDentalFormsUsers = await this.formService.getDentalForms({ userid: UserId }, ['dental']);
                    let EntryExist = 0;
                    for (let denVar of getDentalFormsUsers) {
                        let dateCompleted = await this.commonDateService.DateTimeFormat(denVar?.date_completed, 'MM-DD-YYYY');
                        if (denVar?.date_completed && dateCompleted == postData?.visit_date) {
                            EntryExist = 1;
                        } else if (denVar?.date_completed && dateCompleted == postData?.second_visit_date) {
                            EntryExist = 1;
                        }
                    }
                    if (getCompanyFormLimit && getCompanyFormLimit?.form_limit == 1) {
                        EntryExist = 0;
                    }
                    if (EntryExist == 0) {
                        storeData.userid = getUserId.id
                        storeData.physician_id = req?.tokenUser?.id
                        storeData.activity_id = 49
                        storeData.status = 1
                        storeData.is_signed = postData?.is_signed || 0
                        storeData.signature = postData?.signature || ''
                        storeData.date_completed = this.commonDateService.DateTimeFormat(postData?.visit_date, 'YYYY-MM-DD', 'MM-DD-YYYY') + ' 00:00:00';
                        let insertedData = await this.formService.dentalSave(storeData);
                        if (insertedData) {
                            let getFormInstructions = await this.formService.getFormInstructions({ company_id: orgId }, ['forminstructions.id', 'forminstructions.company_id', 'forminstructions.yearly_opts']);
                            if (getFormInstructions && getFormInstructions?.yearly_opts == 1) {
                                storeData.date_completed = await this.commonDateService.DateTimeFormat(postData?.second_visit_date, 'YYYY-MM-DD', 'MM-DD-YYYY') + ' 00:00:00';
                                await this.formService.dentalSave(storeData);
                            }
                            let toEmail = getUserId?.email || '';
                            if (toEmail != '') {
                                let emailDetails = Object.create(null);
                                emailDetails['type'] = 13;
                                emailDetails['First_Name'] = getUserId.first_name;
                                let getCompanyName = await this.formService.getCompanyDetails({ id: orgId }, ['company.company_name']);
                                emailDetails['Company_Name'] = getCompanyName?.company_name;
                                const templateText = await this.formService.getEmailTemplate({ org_id: In([orgId, 0]), type: 13 });
                                let templateNewText = await this.urlManageService.onmapUrlContent(templateText?.['new_text'],'mailTemplate') || templateText?.['text'];
                                let emaildata = {
                                    sender: '',
                                    receiver: toEmail,
                                    subject: 'Dental Visit Packet Receipt Confirmation',
                                    content: emailDetails,
                                    template: templateNewText,
                                    type: 13,
                                }
                                await lastValueFrom(this.commonMicroservice.send({ cmd: 'send_email' }, emaildata));
                            }
                        }else{
                            throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_SOMETHING_WENT_WRONG"));
                        }
                    } else {
                        throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "Error: User has already completed a visit on this date. Please input a different visit date for the second visit."));
                    }
                }else{
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_MEMBERID_NOT_FOUND"));
                }
            }else{
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_MEMBERID_NOT_FOUND"));
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: 'success'
            });
        } catch (error) {
            this.activityLogService.error_log(req?.tokenUser?.id,req?.originalUrl, error?.message, error, req);
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
    @Post('dental-confirm')
    async dentalConfirmStepAPI(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try{
            let result = await this.formHelperService.dentalConfirmStep(req, postData);
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: result,
                message: 'success'
            });
        }catch(error){
            this.activityLogService.error_log(req?.tokenUser?.id,req?.originalUrl, error?.message, error, req);
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
    
    @Post('optometrist')
    async optometristsStepAPI(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try{
            let result = await this.formHelperService.optometristsStep(req, postData);
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: result,
                message: 'success'
            });
        }catch(error){
            this.activityLogService.error_log(req?.tokenUser?.id,req?.originalUrl, error?.message, error, req);
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
    
    @Post('optometrists-confirm')
    async optometristsConfirmStepAPI(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try{
            let result = await this.formHelperService.optometristsConfirmStep(req, postData);
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: result,
                message: 'success'
            });
        }catch(error){
            this.activityLogService.error_log(req?.tokenUser?.id,req?.originalUrl, error?.message, error, req);
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
    @Post('physician-diseases-steps')
    @UseGuards(TokenGuard, RoleGuard, AccessGuard)
    async physicianDiseasesSteps(@Req() req: Request, @Res() res: Response, @Body() postData: physicianDiseasesStepsInput) {
        try {
            if (!postData?.getType) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            if (postData?.getType == 2) {
                if (!postData?.first_step) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
            }
            if (postData?.getType == 1) {
                if (!postData?.first_step || !postData?.standard_dates || !postData?.not_recommended) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
            }
            if (postData?.getType == 2) {
                let firstSteps = postData?.first_step ? JSON.parse(postData?.first_step) : Object.create(null);
                let checkUser = await this.formService.getUserDetails({ id: firstSteps.user_id, role_id: In([2, 16]), status: '1' });
                let forms = await this.diseaseFormsService.findOne(`diseaseforms.id = ${firstSteps.form_id}`)
                let resultedData = Object.create(null)
                if (forms) {
                    let standard_ids = forms?.standard_id?.split(',') || [];
                    let stdDesc = await this.standardCareService.listRecord({ id: In(standard_ids) })
                    resultedData = {
                        first_step: postData?.first_step,
                        user_id: checkUser.id,
                        dob: checkUser.dob,
                        std_desc: stdDesc,
                        forms:{code:forms?.code , title:forms?.title , coverpage_text:forms?.coverpage_text , instructions_text:forms?.instructions_text}
                    }
                } else {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_MEMBERID_NOT_FOUND"));
                }
                return res.status(HttpStatus.OK).json({
                    statusCode: 201,
                    success: 1,
                    error: 0,
                    data: resultedData,
                    message: 'success'
                });
            } else {
                let firstSteps = postData?.first_step ? JSON.parse(postData?.first_step) : Object.create(null);
                let forms = await this.diseaseFormsService.findOne(`diseaseforms.id = ${firstSteps.form_id}`)
                let act_id = await this.activityService.activityFindOne({ 'activity_name': Like(`${forms.id} - ${forms.title}`) }, ['id'], { id: 'ASC' })
                let checkUser = await this.formService.getUserDetails(
                    { id: firstSteps.user_id, role_id: In([2, 16]), status: '1' },
                    ['user.id', 'user.org_id','user.membership_code', 'user.dob','user.gender','user.email','user.first_name','user.last_name']
                );
                let inserteData = Object.create(null);
                let standardDates = this.commonFileService.phpSerialize(JSON.parse(postData?.standard_dates));
                let notRecommended = this.commonFileService.phpSerialize(JSON.parse(postData?.not_recommended));
                inserteData['user_id'] = firstSteps.user_id;
                inserteData['physician_id'] = req?.tokenUser?.id;
                inserteData['disease_formid'] = firstSteps.form_code;
                inserteData['standard_dates'] = standardDates;
                inserteData['not_recommended'] = notRecommended;
                inserteData['date_completed'] = this.commonDateService.DateTimeFormat('now', 'YYYY-MM-DD HH:mm:ss');
                inserteData['signature'] = firstSteps.signature;
                inserteData['is_signed'] = firstSteps.is_signed;
                inserteData['standard_ids'] = forms.standard_id;
                inserteData['activity_id'] = act_id?.id || '';
                let result = await this.physicianFormsService.save(inserteData);
                if (result) {
                    let toEmail = checkUser?.email || '';
                    if (toEmail != '') {
                        let emailDetails = Object.create(null);
                        emailDetails['type'] = 14;
                        emailDetails['First_Name'] = checkUser.first_name;
                        let getCompanyName = await this.formService.getCompanyDetails({ id: checkUser.org_id }, ['company.company_name']);
                        emailDetails['Company_Name'] = getCompanyName?.company_name;
                        const templateText = await this.formService.getEmailTemplate({ org_id: In([checkUser.org_id, 0]), type: 14 });
                        let templateNewText = await this.urlManageService.onmapUrlContent(templateText?.['new_text'],'mailTemplate') || templateText?.['text'];
                        let emaildata = {
                            sender: '',
                            receiver: toEmail,
                            subject: 'Disease Form',
                            content: emailDetails,
                            template: templateNewText,
                            type: 14,
                        }
                        await lastValueFrom(this.commonMicroservice.send({ cmd: 'send_email' }, emaildata));
                    }
                }else{
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_SOMETHING_WENT_WRONG"));
                }
                return res.status(HttpStatus.OK).json({
                    statusCode: 201,
                    success: 1,
                    error: 0,
                    data: null,
                    message: 'success'
                });
            }
        } catch (error) {
            this.activityLogService.error_log(req?.tokenUser?.id,req?.originalUrl, error?.message, error, req);
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
    @Post('physician-optometrists-steps')
    @UseGuards(TokenGuard, RoleGuard, AccessGuard)
    async physicianOptometristsSteps(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.user_code || !postData?.visit_date) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let checkUser = await this.userService.findOne(`user.code = '${postData?.user_code}' AND user.role_id IN (2,16) AND company.status = 1`);
            if (checkUser) {
                let storeData = Object.create(null);
                let orgId = checkUser.org_id
                storeData.userid = checkUser.id
                storeData.physician_id = req?.tokenUser?.id
                storeData.activity_id = 50
                storeData.signature = ''
                storeData.is_signed = 1
                storeData.date_completed = this.commonDateService.DateTimeFormat(postData?.visit_date, 'YYYY-MM-DD', 'MM-DD-YYYY') + ' 00:00:00';
                let insertedData = await this.formService.optometristsSave(storeData);
                if (insertedData) {
                    let toEmail = checkUser?.email || '';
                        if(toEmail != ''){
                            let emailDetails = Object.create(null);
                            emailDetails['type'] = 18;
                            emailDetails['First_Name'] = checkUser.first_name;
                            let getCompanyName = await this.formService.getCompanyDetails({ id: orgId },['company.company_name']);
                            emailDetails['Company_Name'] = getCompanyName?.company_name;
                            const templateText = await this.formService.getEmailTemplate({org_id: In([orgId,0]), type: 18});
                            let templateNewText = await this.urlManageService.onmapUrlContent(templateText?.['new_text'],'mailTemplate') || templateText?.['text'];
                            let emaildata = {
                                sender: '',
                                receiver: toEmail,
                                subject: 'Optometrist Visit Packet Receipt Confirmation',
                                content: emailDetails,
                                template: templateNewText,
                                type: 18,
                            }
                            await lastValueFrom(this.commonMicroservice.send({ cmd: 'send_email' }, emaildata)); 
                        }
                }else{
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_SOMETHING_WENT_WRONG"));
                }
            } else {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_MEMBERID_NOT_FOUND_VALIDATE"));
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: 'success'
            });
        } catch (error) {
            this.activityLogService.error_log(req?.tokenUser?.id,req?.originalUrl, error?.message, error, req);
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
    @Post('find')
    async find(@Req() req: Request, @Res() res: Response, @Body() postData: findInput) {
        try {
            if (!postData?.postcode || !postData?.country) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            postData.country = postData?.country?.toUpperCase() == 'CANADA' ? 'CA' : 'US';
            let dataField: {[key: string]: string} = {'US': 'zipcode', 'CA': 'postalcode'}
            let timezoneDetails = await lastValueFrom(this.client.send({cmd: 'find_postcode'}, [{[dataField[postData?.country]]: [postData?.postcode], countrycode:postData?.country}]));
            if (timezoneDetails.length === 0) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }
            timezoneDetails = await this.commonArrayService.formatToDto(PostCodesDto, timezoneDetails[0], req.lang);
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: timezoneDetails,
                message: 'success',
            });
        } catch (error) {
            this.activityLogService.error_log(req?.tokenUser?.id,req?.originalUrl, error?.message, error, req);
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

import { UrlManageService } from '@/modules/common';
import { appConstant, CommonArrayService, CommonDateService, CommonFileService, CommonService, SpouseDto, tableConstant } from '@common-constants';
import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Inject,
    Post, Put,
    Req,
    Res,
    UseGuards,
} from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { Request, Response } from "express";
import { lastValueFrom } from "rxjs";
import { CommunicationTemplateTextsService } from "src/modules/communication/templatetexts/communicationtemplatetexts.service";
import { CompanyService } from "src/modules/company/companies/company.service";
import { ActivityLogService } from "src/modules/master/activitylog/activitylog.service";
import { UserService } from "src/modules/user/user/user.service";
import { UserSettingsService } from "src/modules/user/usersettings/usersettings.service";
import { In, Not } from "typeorm";
import { AccessGuard, RoleGuard, TokenGuard } from "../../../guard";
import { CreateSpouseInput, PaginateWithSpouseInput } from "../../../input";
import { TranslationService } from "../../translation/translation.service";
import { registerInput } from './input';
import { SpouseService } from "./spouse.service";
@Controller('spouse')
export class SpouseController {
    constructor(
        private readonly spouseService: SpouseService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonDateService: CommonDateService,
        private readonly commonFileService: CommonFileService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        private readonly userService: UserService,
        private readonly userSettingsService: UserSettingsService,
        private readonly communicationTemplateTextService: CommunicationTemplateTextsService,
        private readonly companyService: CompanyService,
        private readonly urlManageService: UrlManageService,
        @Inject('COMMON_SERVICE')
        private commonMicroservice: ClientProxy,
    ) {
    }
    @Post('paginate')
    @UseGuards(TokenGuard, RoleGuard, AccessGuard)
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithSpouseInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let where = `spouse.status != 2 `;
            if (postData?.search_str) {
                where += `AND(spouse.firstname LIKE '%${postData?.search_str}%' OR spouse.lastname LIKE '%${postData?.search_str}%' OR spouse.email LIKE '%${postData?.search_str}%' OR spouse.relationship_id LIKE '%${postData?.search_str}%' OR spouse.activation_key LIKE '%${postData?.search_str}%')`;
            }
            const resultedData = await this.spouseService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(SpouseDto, resultedData['list'], req.lang)
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
    @Post('get-one')
    @UseGuards(TokenGuard, RoleGuard, AccessGuard)
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.user_id || !postData?.relationship_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let returnDetails = Object.create(null);
            let roleId = req.tokenUser?.role_id;
            let relationship_id = req?.tokenUser?.relationship_id || '';
            if(roleId == appConstant.ROLE.SPOUSE){
                let checkLinkUser = await this.userService.findOne({code: relationship_id, role_id: appConstant.ROLE.REGISTERED},['user.id','user.code','user.first_name','user.last_name','user.status','user.email','user.created']);
                let where = { relationship_id: relationship_id, status: Not(2) };
                returnDetails['invitationData'] = await this.spouseService.findOne(where);
                    if(!checkLinkUser){
                        returnDetails['register'] = 0;
                    }else{
                        returnDetails['register'] = 1;
                    }
                    let formattedDateI = await this.commonDateService.DateTimeFormat(returnDetails['invitationData'] ? returnDetails['invitationData']['created'] : checkLinkUser['created'], 'YYYY-MM-DD HH:mm:ss');
                    const monthNameI = await this.commonDateService.DateTimeFormat(formattedDateI, 'MMMM');
                    const translatedMonthI = await this.translatorService.frontendReadTranslation(req.lang, monthNameI.toString(), `/LC_MESSAGES/Common/Month`, `static`);
                    let created:any = `${translatedMonthI.toString().substring(0, 3)} ${ this.commonDateService.DateTimeFormat(formattedDateI, 'D, YYYY')}`;
                    checkLinkUser['created'] = created;
                    returnDetails['user'] = checkLinkUser;
            }else if(roleId == appConstant.ROLE.REGISTERED){
                let where = { relationship_id: postData?.relationship_id, status: Not(2) };
                let spouseInviteCheck:any = await this.spouseService.findOne(where);
                let registerSpouseCheck:any = null;
                registerSpouseCheck = await this.userService.findOne({relationship_id: req.tokenUser?.code, role_id: appConstant.ROLE.SPOUSE},['user.id','user.code','user.first_name','user.last_name','user.status','user.email','user.created']);
                if(registerSpouseCheck){
                    let formattedDate = await this.commonDateService.DateTimeFormat(registerSpouseCheck['created'], 'YYYY-MM-DD HH:mm:ss');
                    const monthName = await this.commonDateService.DateTimeFormat(formattedDate, 'MMMM');
                    const translatedMonth = await this.translatorService.frontendReadTranslation(req.lang, monthName.toString(), `/LC_MESSAGES/Common/Month`, `static`);
                    registerSpouseCheck['created'] = `${translatedMonth.toString().substring(0, 3)} ${ this.commonDateService.DateTimeFormat(formattedDate, 'D, YYYY')}`;
                }
                if(spouseInviteCheck){
                    let formattedDateI = await this.commonDateService.DateTimeFormat(spouseInviteCheck['created'], 'YYYY-MM-DD HH:mm:ss');
                    const monthNameI = await this.commonDateService.DateTimeFormat(formattedDateI, 'MMMM');
                    const translatedMonthI = await this.translatorService.frontendReadTranslation(req.lang, monthNameI.toString(), `/LC_MESSAGES/Common/Month`, `static`);
                    spouseInviteCheck['created'] = `${translatedMonthI.toString().substring(0, 3)} ${ this.commonDateService.DateTimeFormat(formattedDateI, 'D, YYYY')}`;
                    returnDetails['invitationData'] = spouseInviteCheck;
                    if(!registerSpouseCheck){
                        returnDetails['register'] = 0;
                    }else{
                        returnDetails['register'] = 1;
                    }
                    returnDetails['user'] = registerSpouseCheck;
                }else{
                    returnDetails['invitationData'] = null;
                    if(!registerSpouseCheck){
                        returnDetails['register'] = 0;
                    }else{
                        returnDetails['register'] = 1;
                    }
                    returnDetails['user'] = registerSpouseCheck;
                }
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: returnDetails,
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
    @Post('get-one-spouse')
    async getOneSpouse(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if(!postData?.relationship_id || !postData?.activation_key){
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let where = { relationship_id: postData?.relationship_id };
            where['activation_key'] = postData?.activation_key;
            let spouseInviteCheck:any = await this.spouseService.findOne(where);
            let returnDetails = Object.create(null);
            let registerSpouseCheck:any = null;
            if(spouseInviteCheck){
                let formattedDateI = await this.commonDateService.DateTimeFormat(spouseInviteCheck['created'], 'YYYY-MM-DD HH:mm:ss');
                const monthNameI = await this.commonDateService.DateTimeFormat(formattedDateI, 'MMMM');
                const translatedMonthI = await this.translatorService.frontendReadTranslation(req.lang, monthNameI.toString(), `/LC_MESSAGES/Common/Month`, `static`);
                spouseInviteCheck['created'] = `${translatedMonthI.toString().substring(0, 3)} ${ this.commonDateService.DateTimeFormat(formattedDateI, 'D, YYYY')}`;
                returnDetails['invitationData'] = spouseInviteCheck;
                if(!registerSpouseCheck){
                    returnDetails['register'] = 0;
                }else{
                    returnDetails['register'] = 1;
                }
                returnDetails['user'] = registerSpouseCheck;
            }else{
                returnDetails['invitationData'] = null;
                if(!registerSpouseCheck){
                    returnDetails['register'] = 0;
                }else{
                    returnDetails['register'] = 1;
                }
                returnDetails['user'] = registerSpouseCheck;
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: returnDetails,
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
    @UseGuards(TokenGuard, RoleGuard, AccessGuard)
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateSpouseInput) {
        try {
            postData['activation_key'] = this.commonService.generateMD5((new Date()).toString()); 
            if (
                !postData?.firstname ||
                !postData?.lastname ||
                !postData?.relationship_id ||
                !postData?.activation_key ||
                !postData?.email
            ) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            await this.spouseService.save(postData);
            return res.status(HttpStatus.CREATED).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: 'Success : Invitation sent successfully ',
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
    @Post('delete')
    @UseGuards(TokenGuard, RoleGuard, AccessGuard)
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = {id: postData?.id};
            const recordDetails = await this.spouseService.findOne(where);
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
            await this.spouseService.update(where,{status: 2});
            this.activityLogService.create(recordDetails, {stTBL_SPOUSEatus: recordDetails}, tableConstant.TBL_SPOUSE, req.tokenUser?.id, 'delete');
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
    @UseGuards(TokenGuard, RoleGuard, AccessGuard)
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: CreateSpouseInput) {
        try {
            if (
                !postData?.id
            ) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = {id: postData?.id};
            const recordDetails = await this.spouseService.findOne(where);
            if (!recordDetails) {
                await this.spouseService.save({
                    ...postData,
                    created_by: req.tokenUser?.id
                });
            }
            await this.spouseService.update(where, {...postData});
            this.activityLogService.create(recordDetails, postData, tableConstant.TBL_SPOUSE, req.tokenUser?.id);
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: 'Success : Invitation sent successfully ',
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
    @Post('list')
    @UseGuards(TokenGuard, RoleGuard, AccessGuard)
    async list(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            const where = { status: Not(2)};
            let resultedData = await this.spouseService.listRecord(where);
            resultedData = <any>(
                await this.commonArrayService.formatToDto(SpouseDto, resultedData, req.lang)
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
    @Post('invitation')
    @UseGuards(TokenGuard, RoleGuard, AccessGuard)
    async invitation(@Req() req: Request, @Res() res: Response, @Body() postData: CreateSpouseInput) {
        try { 
            if (
                !postData?.firstname ||
                !postData?.lastname ||
                !postData?.email
            ) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            postData.email = postData?.email.trim();
            let user = Object.create(req.tokenUser);
            let user_code = user.code;
            let name = this.commonFileService.capitalizeFirstLetter(user.first_name) + ' ' + this.commonFileService.capitalizeFirstLetter(user.last_name);
            if (!postData?.id) {
                let count: any = await this.userService.findOne(`user.email = '${postData?.email}'`);
                let countInvite: any = await this.spouseService.listRecord({relationship_id: user_code, status: Not(2)});
                count = count ? 1 : 0;
                if (postData?.email.toLowerCase().includes('comcast.net')) {
                    let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, 'The email address you are attempting to enter does not receive emails from ZomoHealth due to blocks by the email provider.  Please utilize another email address such as gmail to ensure you receive requested emails', `/LC_MESSAGES/Dashboard/SpouseRegistration`,`static`);
                    return res.status(HttpStatus.OK).json({
                        statusCode: 200,
                        success: 1,
                        error: 0,
                        data: null,
                        message: errorMessage,
                    });
                }else {
                    if (count > 0) {
                        let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, 'Email is already associated with another account', `/LC_MESSAGES/Dashboard/SpouseRegistration`,`static`);
                        return res.status(HttpStatus.OK).json({
                            statusCode: 200,
                            success: 1,
                            error: 0,
                            data: null,
                            message: errorMessage,
                        });
                    } else if (countInvite.length > 0) {
                        let activationKey = this.commonService.generateMD5(Date.now() + Math.random().toString());
                        await this.spouseService.update({id : countInvite?.[0]?.id},{firstname: postData?.firstname, lastname: postData?.lastname, email: postData?.email, relationship_id: user_code, activation_key: activationKey});
                        let templateText = await this.communicationTemplateTextService.findOne({org_id: In([user.org_id,0]), type: 2});
                        let templateNewText = await this.urlManageService.onmapUrlContent(templateText?.['new_text'],'mailTemplate') || templateText?.['text'];
                        templateText['new_text'] = await this.urlManageService.onmapUrlContent(templateText?.['new_text'],'mailTemplate') || templateText?.['text'];
                        activationKey = 'https://' + process.env.DOMAIN + '/spouse/spouse-registration/' +`${user_code}/${activationKey}`;
                        let emailDetails = {
                            receiver: postData?.email,
                            subject: `Registration Invitation from ${name} - Action Needed`,
                            template: templateNewText,
                            content: { type: 2, cc: user.email, 'First Name': postData?.firstname, 'Name': name, 'Activation Link': activationKey }
                        }
                        await lastValueFrom(this.commonMicroservice.send({ cmd: 'send_email' }, emailDetails));
                    } else {
                        let activationKey = this.commonService.generateMD5(Date.now() + Math.random().toString());
                        let userid = await this.spouseService.save({firstname: postData?.firstname, lastname: postData?.lastname, email: postData?.email, relationship_id: user_code, activation_key: activationKey});
                        activationKey = 'https://' + process.env.DOMAIN + '/spouse/spouse-registration/' +`${user_code}/${activationKey}`;
                        const templateText = await this.communicationTemplateTextService.findOne({org_id: In([user.org_id,0]), type: 2});
                        let templateNewText = await this.urlManageService.onmapUrlContent(templateText?.['new_text'],'mailTemplate') || templateText?.['text'];
                        let emailDetails = {
                            receiver: postData?.email,
                            subject: `Registration Invitation from ${name} - Action Needed`,
                            template: templateNewText,
                            content: { type: 2, cc: user.email, 'First Name': postData?.firstname, 'Name': name, 'Activation Link': activationKey }
                        }
                        await lastValueFrom(this.commonMicroservice.send({ cmd: 'send_email' }, emailDetails));
                    }
                    let successMessage = await this.translatorService.frontendReadTranslation(req.lang, 'Great, an invite has been sent to both your email and the email entered. Please be sure that the link is clicked and the registration is completed', `/LC_MESSAGES/Dashboard/SpouseRegistration`,`static`);
                    return res.status(HttpStatus.OK).json({
                        statusCode: 200,
                        success: 1,
                        error: 0,
                        data: null,
                        message: successMessage,
                    });
                }
            }else{
                let countInvite: any = await this.spouseService.listRecord({relationship_id: postData?.id.toString(), status: Not(2)});
                if (countInvite.length == 0) {
                    return res.status(HttpStatus.OK).json({
                        statusCode: 200,
                        success: 1,
                        error: 0,
                        data: null,
                        message: 'Invalid Link, Please try again.',
                    });
               } else {
                    let countInvite: any = await this.spouseService.listRecord({relationship_id: postData?.id.toString(), status: Not(2)});
                    let activationKey = this.commonService.generateMD5(Date.now() + Math.random().toString());
                    await this.spouseService.update({id : countInvite?.[0]?.id, relationship_id : postData?.id.toString()},{firstname: postData?.firstname, lastname: postData?.lastname, email: postData?.email, relationship_id: user_code, activation_key: activationKey});
                    const templateText = await this.communicationTemplateTextService.findOne({org_id: In([user.org_id,0]), type: 2});
                    let templateNewText = await this.urlManageService.onmapUrlContent(templateText?.['new_text'],'mailTemplate') || templateText?.['text'];
                    activationKey = 'https://' + process.env.DOMAIN + '/spouse_registration/' +`${user_code}/${activationKey}`;
                    let emailDetails = {
                        receiver: countInvite?.[0]?.email,
                        subject: `Registration Invitation from ${name} - Action Needed`,
                        template: templateNewText,
                        content: { type: 2, cc: user.email, 'First Name': postData?.firstname, 'Name': name, 'Activation Link': activationKey }
                    }
                    await lastValueFrom(this.commonMicroservice.send({ cmd: 'send_email' }, emailDetails));
                    let successMessage = await this.translatorService.frontendReadTranslation(req.lang, 'The invitation has been sent again successfully', `/LC_MESSAGES/Dashboard/SpouseRegistration`,`static`);
                    return res.status(HttpStatus.OK).json({
                        statusCode: 200,
                        success: 1,
                        error: 0,
                        data: null,
                        message: successMessage,
                    });
               }
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
    @Post('resend-invitation')
    @UseGuards(TokenGuard, RoleGuard, AccessGuard)
    async resendInvitation(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let user = Object.create(req.tokenUser);
            let user_code = user.code;
            let orgId = user.org_id;
            let countInvite: any = await this.spouseService.listRecord({id: postData?.id, relationship_id: user_code.toString(), status: Not(2)});
            if (countInvite.length == 0) {
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: 'Invalid Link, Please try again.',
                });
            } else {
                let currentDate = await this.commonDateService.DateTimeFormat('now', 'YYYY-MM-DD HH:mm:ss','');
                let activationKey = this.commonService.generateMD5(Date.now() + Math.random().toString());
                await this.spouseService.update({id : countInvite?.[0]?.id, relationship_id : user_code.toString()},{activation_key: activationKey, created: currentDate});
                const templateText = await this.communicationTemplateTextService.findOne({org_id: In([orgId,0]), type: 2});
                let templateNewText = await this.urlManageService.onmapUrlContent(templateText?.['new_text'],'mailTemplate') || templateText?.['text'];
                activationKey = 'https://' + process.env.DOMAIN + '/spouse_registration/' +`${user_code}/${activationKey}`;
                let name = this.commonFileService.capitalizeFirstLetter(user.first_name) + ' ' + this.commonFileService.capitalizeFirstLetter(user.last_name);
                let emailDetails = {
                    receiver: countInvite?.[0]?.email,
                    subject: `Registration Invitation from ${name} - Action Needed`,
                    template: templateNewText,
                    content: { type: 2, cc: user.email, 'First Name': countInvite?.[0]?.firstname, 'Name': name, 'Activation Link': activationKey }
                }
                await lastValueFrom(this.commonMicroservice.send({ cmd: 'send_email' }, emailDetails));
                let successMessage = await this.translatorService.frontendReadTranslation(req.lang, 'The invitation has been sent again successfully', `/LC_MESSAGES/Dashboard/SpouseRegistration`,`static`);
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: successMessage,
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
    @Post('spouse-registration')
    async spouseRegistration(@Req() req: Request, @Res() res: Response, @Body() postData: registerInput) {
        try {
            if(!postData?.type){
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING."));
            }
            if(postData?.type == '1'){
                if(!postData?.invitedUserCode || !postData?.activationKey){
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "Invalid link or Registration has been done."));
                }
            }else{
                if (!postData?.role_id || !postData?.first_name || !postData?.last_name || !postData?.password || !postData?.confpassword || !postData?.email || !postData?.cphone || !postData?.dob || !postData?.gender) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
                if(postData?.password != postData?.confpassword){
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "Password and Confirm Password does not match."));
                }
            }
            let countInvite: any = await this.spouseService.listRecord({activation_key: postData?.activationKey.toString(), relationship_id: postData?.invitedUserCode.toString(), status: Not(2)});
            if(countInvite.length == 0){
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "Invalid link or Registration has been done."));
            }
            countInvite = countInvite?.[0];
            if(postData?.type == '1'){
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: countInvite,
                    message: 'success',
                });
            }else{
                let userCode = await this.spouseService.generateValidCode(postData?.role_id);
                let registerSpouseData = {
                    code: userCode,
                    first_name: postData?.first_name,
                    middle_name: '',
                    num_login: 0,
                    last_login: this.commonDateService.getTodayDate().format('YYYY-MM-DD HH:mm:ss'),
                    last_name: postData?.last_name,
                    email: postData?.email,
                    dob: this.commonDateService.DateTimeFormat(postData?.dob,'YYYY-MM-DD','MM/DD/YYYY'),
                    password: postData?.password,
                    p_email: countInvite.p_email || '',
                    gender: postData?.gender == 'male' ? 'm': 'f',
                }
                let registerSpouseSettingData = {
                    wphone: countInvite.wphone || '',
                    hphone: countInvite.hphone || '',
                };
                let userdetail: any = await this.userService.findOne(`user.code = '${postData?.invitedUserCode}'`);
                if(userdetail){
                    registerSpouseData['membership_code'] = userdetail['membership_code'];
                    registerSpouseData['department_id'] = userdetail['department_id'];
                    registerSpouseData['companytype_id'] = userdetail['companytype_id'];
                    registerSpouseData['org_id'] = userdetail['org_id'];
                }else{
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "Invalid link or Registration has been done."));
                }
                registerSpouseSettingData['cphone'] = postData?.cphone;
                if(userdetail['settings']['address'] != ''){
                    registerSpouseSettingData['address'] = userdetail['settings']['address'];
                }
                if(userdetail['settings']['address2'] != ''){
                    registerSpouseSettingData['address2'] = userdetail['settings']['address2'];
                }
                if(userdetail['settings']['country'] != ''){
                    registerSpouseSettingData['country'] = userdetail['settings']['country'];
                }
                if(userdetail['settings']['state'] != ''){
                    registerSpouseSettingData['state'] = userdetail['settings']['state'];
                }
                if(userdetail['settings']['city'] != ''){
                    registerSpouseSettingData['city'] = userdetail['settings']['city'];
                }
                if(userdetail['settings']['zip'] != ''){
                    registerSpouseSettingData['zip'] = userdetail['settings']['zip'];
                }
                registerSpouseData['relationship_code'] = 'Spouse';
                registerSpouseData['relationship_id'] = userdetail['code'];
                if (/comcast\.net/.test(postData?.email)) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "The email address you are attempting to enter does not receive emails from Zomo Health due to blocks by the email provider.  Please utilize another email address such as gmail to ensure you receive requested emails."));
                }else{
                    if (postData?.first_name && postData?.last_name && postData?.dob) {
                        let firstName = postData?.first_name.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
                        let lastName = postData?.last_name.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
                        // const dobYear:any = moment(postData?.dob, ['YYYY/MM/DD', 'DD-MM-YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD']).year();
                        const dobYear: number = this.commonDateService.getYearFromDate(postData?.dob, ['YYYY/MM/DD', 'DD-MM-YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD', 'MM/DD/YYYY']);
                        registerSpouseData['username'] = await this.spouseService.generateUsername(firstName, lastName, String(dobYear));
                    } else {
                        registerSpouseData['username'] = '';
                    }
                    if(userdetail['settings']['zip'] && userdetail['settings']['country']){
                        let usrTimeZone = await this.commonDateService.getTimezoneFromZipcode(userdetail['settings']['zip'], userdetail['settings']['country']);
                        registerSpouseData['timezone'] = usrTimeZone;
                    }
                    registerSpouseData['role_id'] =  Number(postData?.role_id);
                    registerSpouseData['relationship_code'] = '16';
                    registerSpouseData['status'] = 1;
                    registerSpouseData['user_type'] = 0;
                    registerSpouseData['activation_key'] = this.commonService.generateMD5(Date.now() + Math.random().toString());
                    registerSpouseData['entered_code'] = registerSpouseData['membership_code'];
                    registerSpouseData['new_password'] = postData?.password;
                    registerSpouseData['docpassword'] = this.commonService.docPasswordEncrypt(postData?.confpassword);
                }
                if(Object.keys(registerSpouseData).length == 0){
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "Invalid link or Registration has been done."));
                }else{
                    const createdSpouse = await this.userService.save(registerSpouseData, req);
                    if(createdSpouse){
                        let newSpouseId = createdSpouse['id'];
                        let returnDetails = Object.create(null);
                        returnDetails['un'] = createdSpouse['username'];
                        returnDetails['up'] = postData?.password;
                        registerSpouseSettingData['user_id'] = newSpouseId;
                        const where = { user_id: newSpouseId };
                        const recordDetails = await this.userSettingsService.findOne(where);
                        if (recordDetails) {
                            await this.userSettingsService.update({id: recordDetails['id']},registerSpouseSettingData);
                        }
                        else{
                            await this.userSettingsService.save(registerSpouseSettingData);
                        }
                        let companyDetails = await this.companyService.findOne(`company.code = '${userdetail['membership_code']}' AND company.status = 1`,[tableConstant.COMPANIES.TBL_COMPANY_SETTINGS],['company','companySetting'])
                        let passText = postData.password ?? await this.commonService.adminMailData(companyDetails?.['companySetting']?.['first_login_by'],companyDetails?.['companySetting']?.['pre_first_login_by']);
                        const templateText = await this.communicationTemplateTextService.findOne({ org_id: In([userdetail['org_id'], 0]), type: 25 });
                        let templateTextNew = await this.urlManageService.onmapUrlContent(templateText?.['new_text'], 'mailTemplate') || templateText?.['text'];
                        let toEmail: string = postData?.email;
                        let subject: string = `Welcome to Zomo Health : New Account Created`;
                        let emailDetails = Object.create(null);
                        emailDetails['type'] = 25;
                        emailDetails['firstName'] = postData?.first_name;
                        emailDetails['userName'] = createdSpouse['username'];
                        emailDetails['password'] = passText;
                        emailDetails['companyName'] = companyDetails?.name;
                        emailDetails['name'] = userdetail?.full_name;
                        let emaildata = {
                            sender: ``,
                            receiver: toEmail,
                            subject: subject,
                            content: emailDetails,
                            template: templateTextNew
                        }
                        await lastValueFrom(this.commonMicroservice.send({ cmd: 'send_email' }, emaildata));
                        let encoded = createdSpouse['activation_key'];
                        let passwordEncrypt = this.commonService.passwordEncrypt(`${createdSpouse['code']}:::::${createdSpouse['id']}:::::${postData?.password}`);
                        await this.commonService.makeCurlRequest('POST',process.env.PASSWORDENCRYPTION, {encrypted_assertion: passwordEncrypt},{'Authorization': `Bearer ${encoded}`,'Content-Type': 'application/x-www-form-urlencoded'});
                        await this.spouseService.update({relationship_id: createdSpouse['relationship_id']},{activation_key: ''});
                        return res.status(HttpStatus.OK).json({
                            statusCode: 200,
                            success: 1,
                            error: 0,
                            data: returnDetails,
                            message: await this.translatorService.frontendReadTranslation(req.lang, 'The registration has been done successfully', `/LC_MESSAGES/Dashboard/SpouseRegistration`,`static`),
                        });
                    }else{
                        throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "Invalid link or Registration has been done."));
                    }
                }
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
}
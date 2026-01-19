import { CommonArrayService, CommonService, CommunicationEmailCampaignTemplatesDto, HtmlTagService, tableConstant } from '@common-constants';
import {
    Body,
    Controller,
    Get,
    HttpException,
    HttpStatus,
    Inject,
    Post,
    Put,
    Req,
    Res,
    UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Request, Response } from "express";
import { lastValueFrom } from 'rxjs';
import { CreateCommunicationEmailCampaignTemplatesInput, PaginateWithCommunicationInput } from 'src/input';
import { CompanyService } from 'src/modules/company/companies/company.service';
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import { TranslationService } from 'src/modules/translation/translation.service';
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
@Controller('communication/email-campaign-templates')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class EmailCampaignTemplatesController {
    constructor(
        @Inject('COMMUNICATION_SERVICE')
        private client: ClientProxy,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService,
        private readonly companyService: CompanyService,
        private readonly htmlTagService: HtmlTagService,
        private readonly activityLogService: ActivityLogService,
    ) {}
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithCommunicationInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let where = `communication.status != 2`;
            if(postData?.status){
                where =`communication.status = '${postData?.status}' `;
            }
            const role_id = req.tokenUser?.role_id;
            let orgId = 0;
            let GOType = [];
            if(role_id == 40 || role_id == 41){
                GOType = [0];
            }else if(role_id == 11){
                GOType = [0,1];
                orgId = req.tokenUser?.org_id;
            }else if(role_id == 39){
                GOType = [0,1];
            }else{
                GOType = [0,1];
            }
            if(role_id == 40 || role_id == 41){
                where +=` AND communication.go_type IN (${GOType}) `;
            }else{
                if(postData?.type){
                    where +=` AND communication.go_type = '${postData?.type}' `;
                }else{
                    where +=` AND communication.go_type IN (${GOType}) `;
                }
            }
            if(role_id == 40 || role_id == 41){
                if(postData?.temp_type && (postData?.temp_type == '1' || postData?.temp_type == '2')){
                    where +=` AND communication.temp_type = '${postData?.temp_type}' `;
                }else{
                    where +=` AND communication.temp_type IN ('1','2') `;
                }
            }else{
                if(postData?.temp_type){
                    where +=` AND communication.temp_type = '${postData?.temp_type}' `;
                }
            }
            if(role_id == 11){
                where +=` AND communication.org_id IN (${orgId},0) `;
            }
            if (postData?.search_str) {
                where += ` AND(communication.subject LIKE '%${postData?.search_str}%')`;
            }
            const paginateObj = this.commonArrayService.getPaginationVar(
                postData?.page || 1,
                postData?.limit,
            );
            const order = postData && postData?.order ? postData?.order : 'DESC';
            const orderBy = postData && postData?.order_by ? `communication.${postData?.order_by}` : 'communication.created_date';
            let campaignTemplates = await lastValueFrom(this.client.send({ cmd: 'paginate_campaign_templates' }, {condition: where, order, orderBy, paginate: paginateObj}));
            if (campaignTemplates.length === 0) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            campaignTemplates['list'] = <any>(await this.commonArrayService.formatToDto(CommunicationEmailCampaignTemplatesDto, campaignTemplates['list'], req.lang));
            if(campaignTemplates['list'] && campaignTemplates['list'].length > 0){
                const S3_URL =  process.env.S3_URL_PROD;
                const userOrgId = req.tokenUser?.org_id || 0;
                const companyLogo = req.tokenUser?.company?.company_logo || '';
                let orgLogo = `${S3_URL}Communication/img/newsletter/DefaultLogo.png`;
                if(userOrgId && userOrgId !== 0 && role_id == 11 && companyLogo){
                    orgLogo = `${S3_URL}companylogos/${userOrgId}/${companyLogo}?${Date.now()}`;
                }
                campaignTemplates['list'] = campaignTemplates['list'].map(template => {
                    if(template.template_content !== null && template.template_content !== ''){
                        const imageUrl = (template.org_id && template.org_id !== 0 && template.go_type == 1)
                            ? orgLogo
                            : `${S3_URL}Communication/img/newsletter/DefaultLogo.png`;
                        template.template_content = template.template_content.replace(/<span>\{Logo\}<\/span>/g, '');
                        template.template_content = this.htmlTagService.appendImageToLogoDivs(template.template_content, imageUrl);
                    }
                    return template;
                });
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: campaignTemplates,
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
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = { id: postData?.id };
            let campaignTemplates = await lastValueFrom(this.client.send({ cmd: 'get_one_campaign_templates' }, where));
            if (!campaignTemplates) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            campaignTemplates = <any>(await this.commonArrayService.formatToDto(CommunicationEmailCampaignTemplatesDto, campaignTemplates, req.lang));
            const role_id = req.tokenUser?.role_id;
            let GOType = [];
            if(role_id == 40 || role_id == 41){
                GOType = [0];
            }else if(role_id == 11){
                GOType = [0,1];
            }else if(role_id == 39){
                GOType = [0,1];
            }else{
                GOType = [0,1];
            }
            let accessStatus = 1;
            const cam_go_id = campaignTemplates['go_type'];
            const cam_temp_type = campaignTemplates['temp_type'];
            const restTempType = [1,2];
            if(GOType.includes(cam_go_id)){
                accessStatus = 0;
                if((role_id == 40 || role_id == 41) && !(restTempType.includes(cam_temp_type))){
                    accessStatus = 1;
                }
            }
                if(accessStatus == 1){
                throw new Error('Sorry! You are not authorized to access this template.');
            }else{
                let orgLogos = '';
                let orgThemeColor = '';
                let allOrgList = [];
                if(postData?.type && postData?.type == 'edit'){
                    if(campaignTemplates.template_content !== null){
                        const imageUrl = 'http://localhost/preventioncloud-production-live/Communication/img/newsletter/LogoToAppend.png'; // Replace with your actual image URL
                        const modifiedHtml = this.htmlTagService.appendImageToLogoDivs(campaignTemplates.template_content, imageUrl);
                        campaignTemplates.template_content = modifiedHtml;
                    }
                    let OrgID = campaignTemplates.org_id;
                    let goType = campaignTemplates.go_type;
                    if(OrgID && OrgID != 0 && goType == 1){
                        const orgDatas = await this.companyService.findOne( `company.id = ${OrgID}`, ['meta'],['company','companyMeta']);
                        orgLogos = orgDatas.company_logo;
                        if(orgDatas.companyMeta !== null){
                            orgThemeColor = JSON.parse(orgDatas.companyMeta.newsletterthemecolors);
                        }
                    }
                    let whereOrg: any = { status: 1, deleted: 0 };
                    allOrgList = await this.companyService.listRecord(whereOrg);
                    return res.status(HttpStatus.OK).json({
                        statusCode: 200,
                        success: 1,
                        error: 0,
                        data: {campaignTemplates , orgLogos, orgThemeColor, allOrgList},
                        message: 'success',
                    });
                }else{
                    if(campaignTemplates.template_content !== null){
                        const imageUrl = 'http://localhost/preventioncloud-production-live/Communication/img/newsletter/DefaultLogo.png'; // Replace with your actual image URL
                        const modifiedHtml = this.htmlTagService.appendImageToLogoDivs(campaignTemplates.template_content, imageUrl);
                        campaignTemplates.template_content = modifiedHtml;
                    }
                    return res.status(HttpStatus.OK).json({
                        statusCode: 200,
                        success: 1,
                        error: 0,
                        data: campaignTemplates,
                        message: 'success',
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
    @Post('create')
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateCommunicationEmailCampaignTemplatesInput) {
        try {
            if (!postData?.subject || !postData?.temp_type) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            postData.created_by = req.tokenUser?.id;
            postData.role_id = req.tokenUser?.role_id;
            postData.status = 1;
            postData.created_name = req.tokenUser?.full_name;
            postData.go_type = 0;
            if(req.tokenUser?.role_id == 11){
                const getOrgInfo = await this.companyService.findOne( `company.id = ${req.tokenUser?.org_id}`, [tableConstant.COMPANIES.TBL_COMPANY_META],['company','companyMeta']);
                postData.go_type = 1;
                postData.org_id = getOrgInfo.id;
                postData.org_name = getOrgInfo.company_name;
            }
            let templateDatas = [];
            let resData = {};
            let lastInsertId = 0;
            let resMessage = '';
            templateDatas = await lastValueFrom(this.client.send({ cmd: 'create_campaign_templates' }, postData));
            if(templateDatas){
                lastInsertId = templateDatas['identifiers'][0]['id'];
                resData = {
                    id: lastInsertId,
                };
                resMessage = 'Default Template successfully created.'; 
            }else{
                resMessage = 'Somthing went wrong....';
            }
            return res.status(HttpStatus.CREATED).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: resData,
                message:  resMessage,
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
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: CreateCommunicationEmailCampaignTemplatesInput) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let where = { id: postData?.id};
            let campaignTemplates = await lastValueFrom(this.client.send({ cmd: 'get_one_campaign_templates' }, where));
            if (!campaignTemplates) {
                throw new Error('Sorry! Default template is not found.');
            }else{
                const role_id = req.tokenUser?.role_id;
                let campRoleIdArr = [];
                if(role_id == 40){
                    campRoleIdArr = [role_id,38,39,41];
                }else if(role_id == 41){
                    campRoleIdArr = [role_id,38,39,40];
                }else if(role_id == 11){
                    campRoleIdArr = [role_id];
                }else if(role_id == 39){
                    campRoleIdArr = [role_id,40,41,11];
                }else{
                    campRoleIdArr = [role_id,40,41,39,11];
                }
                let accessStatus = 1;
                const cam_role_id = campaignTemplates['role_id'];
                const cam_temp_type = campaignTemplates['temp_type'];
                const restTempType = [1,2];
                if(campRoleIdArr.includes(cam_role_id)){
                    accessStatus = 0;
                    if((role_id == 40 || role_id == 41) && !(restTempType.includes(cam_temp_type))){
                        accessStatus = 1;
                    }
                }
                if(accessStatus == 0){
                    postData.updated_by = req.tokenUser?.id;
                    let templateDatas = [];
                    let resData = {};
                    let lastInsertId = 0;
                    let resMessage = '';
                    templateDatas = await lastValueFrom(this.client.send({ cmd: 'update_campaign_templates' }, postData));
                    this.activityLogService.create(campaignTemplates, templateDatas, tableConstant.COMMUNICATION.TBL_COM_EMAIL_CAMPAIGNS_TEMPLATES, req.tokenUser?.id);
                    if(templateDatas){
                        lastInsertId = postData?.id;
                        resData = {
                            id: lastInsertId,
                        };
                        resMessage = 'Default Template successfully updated.'; 
                    }else{
                        resMessage = 'Somthing went wrong....';
                    }
                    return res.status(HttpStatus.OK).json({
                        statusCode: 200,
                        success: 1,
                        error: 0,
                        data: resData,
                        message: resMessage,
                    });
                }else{
                    throw new Error('Sorry! You are not authorized to access this template.');
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
    @Put('update-next')
    async updateNext(@Req() req: Request, @Res() res: Response, @Body() postData: CreateCommunicationEmailCampaignTemplatesInput) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let where = { id: postData?.id};
            let campaignTemplates = await lastValueFrom(this.client.send({ cmd: 'get_one_campaign_templates' }, where));
            if (!campaignTemplates) {
                throw new Error('Sorry! Default template is not found.');
            }else{
                const role_id = req.tokenUser?.role_id;
                let campRoleIdArr = [];
                if(role_id == 40){
                    campRoleIdArr = [role_id,38,39,41];
                }else if(role_id == 41){
                    campRoleIdArr = [role_id,38,39,40];
                }else if(role_id == 11){
                    campRoleIdArr = [role_id];
                }else if(role_id == 39){
                    campRoleIdArr = [role_id,40,41,11];
                }else{
                    campRoleIdArr = [role_id,40,41,39,11];
                }
                let accessStatus = 1;
                const cam_role_id = campaignTemplates['role_id'];
                const cam_temp_type = campaignTemplates['temp_type'];
                const restTempType = [1,2];
                if(campRoleIdArr.includes(cam_role_id)){
                    accessStatus = 0;
                    if((role_id == 40 || role_id == 41) && !(restTempType.includes(cam_temp_type))){
                        accessStatus = 1;
                    }
                }
                if(accessStatus == 0){
                    postData.updated_by = req.tokenUser?.id;
                    let templateDatas = [];
                    let resData = {};
                    let lastInsertId = 0;
                    let resMessage = '';
                    const template_content = await this.htmlTagService.removeElementsByClassName(postData?.template_content, 'onluShowImage');
                    postData.template_content = template_content;
                    templateDatas = await lastValueFrom(this.client.send({ cmd: 'update_campaign_templates' }, postData));
                    this.activityLogService.create(campaignTemplates, templateDatas, tableConstant.COMMUNICATION.TBL_COM_EMAIL_CAMPAIGNS_TEMPLATES, req.tokenUser?.id);
                    if(templateDatas){
                        lastInsertId = postData?.id;
                        resData = {
                            id: lastInsertId,
                        };
                        resMessage = 'Default Template successfully saved.'; 
                    }else{
                        resMessage = 'Somthing went wrong....';
                    }
                    return res.status(HttpStatus.OK).json({
                        statusCode: 200,
                        success: 1,
                        error: 0,
                        data: resData,
                        message: resMessage,
                    });
                }else{
                    throw new Error('Sorry! You are not authorized to access this template.');
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
    @Post('status')
    async status(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let where = { id: postData?.id};
            let campaignTemplates = await lastValueFrom(this.client.send({ cmd: 'get_one_campaign_templates' }, where));
            if (!campaignTemplates) {
                throw new Error('Sorry! Default template is not found.');
            }else{
                const role_id = req.tokenUser?.role_id;
                let campRoleIdArr = [];
                if(role_id == 40){
                    campRoleIdArr = [role_id,38,39,41];
                }else if(role_id == 41){
                    campRoleIdArr = [role_id,38,39,40];
                }else if(role_id == 11){
                    campRoleIdArr = [role_id];
                }else if(role_id == 39){
                    campRoleIdArr = [role_id,40,41,11];
                }else{
                    campRoleIdArr = [role_id,40,41,39,11];
                }
                let accessStatus = 1;
                const cam_role_id = campaignTemplates['role_id'];
                const cam_temp_type = campaignTemplates['temp_type'];
                const restTempType = [1,2];
                if(campRoleIdArr.includes(cam_role_id)){
                    accessStatus = 0;
                    if((role_id == 40 || role_id == 41) && !(restTempType.includes(cam_temp_type))){
                        accessStatus = 1;
                    }
                }
                let resMessage = '';
                if(accessStatus == 0){
                    if(postData?.status == 2){
                        resMessage = 'Default template successfully deleted';
                    }else if(postData?.status == 0){
                        resMessage = 'Default template successfully de-activted';
                    }else if(postData?.status == 1){
                        resMessage = 'Default template successfully activated';
                    }
                    await lastValueFrom(this.client.send({ cmd: 'status_campaign_templates' }, postData));
                    this.activityLogService.create(campaignTemplates, postData, tableConstant.COMMUNICATION.TBL_COM_EMAIL_CAMPAIGNS_TEMPLATES, req.tokenUser?.id);
                    return res.status(HttpStatus.OK).json({
                        statusCode: 200,
                        success: 1,
                        error: 0,
                        data: null,
                        message: resMessage,
                    });
                }else{
                    throw new Error('Sorry! You are not authorized to access this template.');
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
    @Post('list')
    async find(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            const role_id = req.tokenUser?.role_id;
            let GOType = [];
            if(role_id == 40 || role_id == 41){
                GOType = [0];
            }else if(role_id == 11){
                GOType = [0,1];
            }else if(role_id == 39){
                GOType = [0,1];
            }else{
                GOType = [0,1];
            }
            let where = `communication.status != 2`;
            if(role_id == 40 || role_id == 41){
                where +=` AND communication.go_type IN (${GOType}) `;
            }
            if(role_id == 40 || role_id == 41){
                where +=` AND communication.temp_type IN ('1','2') `;
            }
            let campaignTemplates = await lastValueFrom(this.client.send({ cmd: 'list_campaign_templates' }, where));
            if (campaignTemplates.length === 0) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            campaignTemplates = <any>(await this.commonArrayService.formatToDto(CommunicationEmailCampaignTemplatesDto, campaignTemplates, req.lang));
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: campaignTemplates,
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
    @Get('template-types')
    async getTemplateType(@Req() req: Request, @Res() res: Response) {
        try {
            let templateTypes = {
                '1': 'Regular',
                '2': 'System Messages',
                '3': 'Challenge',
                '7': 'Common Challenge',
                '4': 'Incentive',
                '5': 'Quiz',
                '6': 'Event',
            };
            let detailsTypes = {
                '4' : {
                    '0': 'Information',
                    '1': 'Participation Summary',
                    '2': 'Incentive Ranking',
                }
            };
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: { templateTypes, detailsTypes },
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
    @Post('copy-template')
    async copyTemplate(@Req() req: Request, @Res() res: Response, @Body() postData: CreateCommunicationEmailCampaignTemplatesInput) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = { id: postData?.id };
            let campaignTemplates = await lastValueFrom(this.client.send({ cmd: 'get_one_campaign_templates' }, where));
            if (!campaignTemplates) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            campaignTemplates = <any>(await this.commonArrayService.formatToDto(CommunicationEmailCampaignTemplatesDto, campaignTemplates, req.lang));
            const campaignTemplatesData = JSON.parse(JSON.stringify(campaignTemplates));
            const role_id = req.tokenUser?.role_id;
            let GOType = [];
            if(role_id == 40 || role_id == 41){
                GOType = [0];
            }else if(role_id == 11){
                GOType = [0,1];
            }else if(role_id == 39){
                GOType = [0,1];
            }else{
                GOType = [0,1];
            }
            let accessStatus = 1;
            const cam_go_id = campaignTemplates['go_type'];
            const cam_temp_type = campaignTemplates['temp_type'];
            const restTempType = [1,2];
            if(GOType.includes(cam_go_id)){
                accessStatus = 0;
                if((role_id == 40 || role_id == 41) && (!restTempType.includes(cam_temp_type))){
                    accessStatus = 1;
                }
            }
            if(accessStatus == 1){
                throw new Error('Sorry! You are not authorized to access this template.');
            }else{
                if(role_id == 40 || role_id == 41){
                    if(!restTempType.includes(cam_temp_type)){
                        throw new Error('Sorry! You are not authorized to access this template.');
                    }
                    campaignTemplates['role_id'] = role_id;
                    campaignTemplates['created_name'] = req.tokenUser?.full_name;
                    campaignTemplates['created_by'] = req.tokenUser?.id;
                    campaignTemplates['status'] = 1;
                    delete campaignTemplates.org_id;
                    delete campaignTemplates.org_name;
                    campaignTemplates['details_type'] = 0;
                }else if(role_id == 11){
                    const getOrgInfo = await this.companyService.findOne( `company.id = ${req.tokenUser?.org_id}`, [tableConstant.COMPANIES.TBL_COMPANY_META],['company','companyMeta']);
                    campaignTemplates['role_id'] = role_id;
                    campaignTemplates['created_name'] = req.tokenUser?.full_name;
                    campaignTemplates['created_by'] = req.tokenUser?.id;
                    campaignTemplates['status'] = 1;
                    campaignTemplates['org_id'] = getOrgInfo.id;
                    campaignTemplates['org_name'] = getOrgInfo.company_name;
                    campaignTemplates['go_type'] = 1;
                }else{
                    if(postData?.go_type == 1){
                        const getOrgInfo = await this.companyService.findOne( `company.id = ${postData?.org_id}`, [tableConstant.COMPANIES.TBL_COMPANY_META],['company','companyMeta']);
                        campaignTemplates['org_id'] = getOrgInfo.id;
                        campaignTemplates['org_name'] = getOrgInfo.company_name;
                        campaignTemplates['role_id'] = 11;
                    }else{
                        campaignTemplates['role_id'] = role_id;
                    }
                    campaignTemplates['created_name'] = req.tokenUser?.full_name;
                    campaignTemplates['created_by'] = req.tokenUser?.id;
                    campaignTemplates['status'] = 1;
                    campaignTemplates['go_type'] = postData?.go_type;
                }
                delete campaignTemplates.id;
                delete campaignTemplates.updated_by;
                delete campaignTemplates.created_date;
                delete campaignTemplates.updated_date;
                let templateDatas = [];
                let resData = {};
                let lastInsertId = 0;
                let resMessage = '';
                templateDatas = await lastValueFrom(this.client.send({ cmd: 'create_campaign_templates' }, campaignTemplates));
                this.activityLogService.create(campaignTemplatesData, templateDatas, tableConstant.COMMUNICATION.TBL_COM_EMAIL_CAMPAIGNS_TEMPLATES, req.tokenUser?.id, 'copy');
                if(templateDatas){
                    lastInsertId = templateDatas['identifiers'][0]['id'];
                    resData = {
                        id: lastInsertId,
                    };
                    resMessage = 'Default Template successfully copied.'; 
                }else{
                    resMessage = 'Somthing went wrong....';
                }
                return res.status(HttpStatus.CREATED).json({
                    statusCode: 201,
                    success: 1,
                    error: 0,
                    data: resData,
                    message:  resMessage,
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
}
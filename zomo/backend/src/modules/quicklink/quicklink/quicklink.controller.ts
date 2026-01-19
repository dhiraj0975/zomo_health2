import { appConstant, CommonArrayService, CommonService, QuicklinkDto, tableConstant } from '@common-constants';
import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Post,
    Put,
    Req,
    Res,
    UseGuards,
} from '@nestjs/common';
import { Request, Response } from "express";
import { ActivityService } from 'src/modules/activity/activity/activity.service';
import { UrlManageService } from 'src/modules/common';
import { ClientManagerAssignService } from 'src/modules/company/clientmanagerassign/clientmanagerassign.service';
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import { In, Not } from "typeorm";
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import {
    CreateQuickLinkInput,
    DeleteQuickLinkInput,
    GetOneQuickLinkInput,
    ListQuickLinkInput, PaginateWithCompanyInput,
    UpdateQuickLinkInput,
} from "../../../input";
import { TranslationService } from "../../translation/translation.service";
import { QuickLinkClicksService } from '../quicklinkclicks/quicklinkclicks.service';
import { QuicklinkOrglistsService } from '../quicklinkorglists/quicklinkorglists.service';
import { QuickLinkService } from './quicklink.service';
import { CompanyService } from '@/modules/company/companies/company.service';

const path = require('path');
const moment = require('moment-timezone');
const S3_URL =  process.env.S3_URL_PROD
@Controller('quick-link/quick-link')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class QuickLinkController {
    constructor(
        private readonly quickLinkService: QuickLinkService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService,
        private readonly quicklinkOrglistsService: QuicklinkOrglistsService,
        private readonly activityLogService: ActivityLogService,
        private readonly quickLinkClicksService: QuickLinkClicksService,
        private readonly clientManagerAssignService: ClientManagerAssignService,
        private readonly activityService: ActivityService,
        private readonly urlManageService: UrlManageService,
        private readonly companyService: CompanyService,
    ) {}
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithCompanyInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            if (!postData?.c_companies_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let where: string = `ql.status = '1'`;
            if (req.tokenUser?.role_id === appConstant.ROLE.WCH) {
                where += ` AND ql.created_by IN (${req.tokenUser?.id}, 1)`;
            }
            if (req.tokenUser?.role_id === appConstant.ROLE.BROKERADMIN) {
                where += ` AND EXISTS (
                    SELECT 1 FROM ${tableConstant.BROKER} b
                    WHERE b.org_id = ql.c_companies_id
                    AND b.broker_admin_id = ${req.tokenUser.id}
                )`;
            }
            if (req.tokenUser?.role_id === appConstant.ROLE.BROKER) {
                where += ` AND EXISTS (
                    SELECT 1 FROM ${tableConstant.BROKER} b
                    WHERE b.org_id = ql.c_companies_id
                    AND b.user_id = ${req.tokenUser.id}
                    AND b.is_global = 1
                )`;
            }
            if (req.tokenUser?.role_id === appConstant.ROLE.REGIONALADMIN) {
                where += ` AND EXISTS (
                    SELECT 1 FROM ${tableConstant.BROKER} b
                    WHERE b.org_id = ql.c_companies_id
                    AND b.user_id = ${req.tokenUser.id}
                )`;
            }
            if (req.tokenUser?.role_id != appConstant.ROLE.ADMIN && appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER != req.tokenUser?.role_id) {
                if (appConstant.ROLE.CLIENTENGAGEMENTMANAGER == req.tokenUser?.role_id){
                    let resultedData = await this.clientManagerAssignService.listRecord({user_id: req.tokenUser?.id,status: 1},null);
                    if(resultedData.length > 0){
                        postData.c_companies_id = resultedData.map((e)=>e.org_id).join(',');
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
                if(postData?.global_folder && postData?.global_folder == 1){
                    where += ` AND orglist.c_companies_id IN(${postData?.c_companies_id}) AND ql.c_companies_id = 0`;
                }else{
                    where += ` AND ql.c_companies_id = ${postData?.c_companies_id}`;
                }
            }else{
                where += ` AND ql.c_companies_id = ${postData?.c_companies_id}`;
            }
            const isNumericSearch = postData?.search_str && !isNaN(Number(postData.search_str));
            if (isNumericSearch) {
                const n = Number(postData.search_str);
                const limit = postData?.limit || 10;
                const page = Math.ceil(n / limit);
                const indexInPage = (n - 1) % limit;
                const numericSearchPostData = {
                    ...postData,
                    page,
                    limit
                };
                const result = await this.quickLinkService.paginateList(where, numericSearchPostData);
                const list = await this.commonArrayService.formatToDto(QuicklinkDto, result['list'], req.lang);
                const ele = list[indexInPage];
                if (ele) {
                    ele.sr_no = n;
                    if (ele?.link && ele?.link.includes('preventioncloud.com')) {
                        let parts = process.env.DOMAIN.split('.');
                        if (parts.length === 3) parts.shift();
                        ele.link = ele?.link.replace('preventioncloud.com', parts.join('.'));
                    }
                    if (ele.title) {
                        let customTitle = await this.translatorService.frontendReadTranslation(
                            req.lang,
                            `title_${ele['id']}`,
                            `/LC_MESSAGES/QuickLink/QuickLink/${ele['c_companies_id']}`,
                            `dynamic`
                        );
                        ele.title = (customTitle === '' || customTitle === `title_${ele['id']}`) ? ele['title'] : customTitle;
                        ele.title = await this.quickLinkService.replacePreventionCloudLinks(ele.title);
                    }
                    if (ele.description) {
                        let customDesc = await this.translatorService.frontendReadTranslation(
                            req.lang,
                            `description_${ele['id']}`,
                            `/LC_MESSAGES/QuickLink/QuickLink/${ele['c_companies_id']}`,
                            `dynamic`
                        );
                        ele.description = (customDesc === '' || customDesc === `description_${ele['id']}`) ? ele['description'] : customDesc;
                    }
                }
                postData.search_str = null;
                const responseList = ele ? [ele] : [];
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: {
                        list: responseList,
                        limit: 1,
                        page: 1,
                        pages: responseList.length > 0 ? 1 : 0,
                        total: responseList.length
                    },
                    message: 'success',
                });
            }
            if (postData?.search_str) {
                where += this.commonService.generateDynamicSearchQuery(postData?.search_str ?? '', ['ql.title','ql.description','ql.link']);
            }
            let resultedData = await this.quickLinkService.paginateList(
                where,
                postData,
            );  
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(QuicklinkDto, resultedData['list'], req.lang)
            ); 
            const startIndex: number = ((postData.page || 1) - 1) * (postData.limit || 10);
            if(resultedData['list'] && resultedData['list'].length){
                await Promise.all(resultedData['list'].map(async (ele: any, index: number)=>{
                    ele.sr_no = startIndex + index + 1;
                    if(ele.title){
                        let customeName = await this.translatorService.frontendReadTranslation(req.lang,`title_${ele['id']}`, `/LC_MESSAGES/QuickLink/QuickLink/${ele['c_companies_id']}`,`dynamic`);
                        ele.title = (customeName == '' || customeName == `title_${ele['id']}`) ? ele['title'] : customeName;
                    }
                    if(ele.description){
                        let customeName = await this.translatorService.frontendReadTranslation(req.lang,`description_${ele['id']}`, `/LC_MESSAGES/QuickLink/QuickLink/${ele['c_companies_id']}`,`dynamic`);
                        ele.description = (customeName == '' || customeName == `description_${ele['id']}`) ? ele['description'] : customeName;
                    }
                    let checkUrl = process.env.DOMAIN + '/download-document/15/';
                    let checkpUrl = process.env.DOMAIN + '/download-pdocument/15/';
                    ele.link = await this.urlManageService.onmapUrl(ele?.link);
                    let Urlcheck = checkUrl.replace('https', 'http');
                    let Urlcheck1 = checkUrl.replace('http', 'https');
                    let Urlcheckp = checkpUrl.replace('https', 'http');
                    let Urlcheckp1 = checkpUrl.replace('http', 'https');
                    const sanitizeId = (value: string) => value.replace(/[^A-Za-z0-9]/g, '');
                    const getInternalId = (linkValue: string) => {
                        const baseName = path.basename(linkValue);
                        return sanitizeId(baseName);
                    };
                    ele.Isinternal = 0;
                    if(ele.link?.includes(Urlcheck)){
                        ele.Isinternal = 1;
                        ele.IsinternalId = parseInt(getInternalId(ele.link));
                    }
                    if(ele.link?.includes(Urlcheck1)){
                        ele.Isinternal = 1;
                        ele.IsinternalId = parseInt(getInternalId(ele.link));
                    }
                    if(ele.link?.includes(Urlcheckp)){
                        ele.Isinternal = 1;
                        ele.IsinternalId = parseInt(getInternalId(ele.link));
                    }
                    if(ele.link?.includes(Urlcheckp1)){
                        ele.Isinternal = 1;
                        ele.IsinternalId = parseInt(getInternalId(ele.link));
                    }
                    ele.title = await this.quickLinkService.replacePreventionCloudLinks(ele.title);
                }));
            }
            const BRRRoles = [appConstant.ROLE.BROKERADMIN, appConstant.ROLE.BROKER, appConstant.ROLE.REGIONALADMIN];
            if (BRRRoles.includes(req.tokenUser?.role_id)) {
                let companyDetails = await this.companyService.companyFindOne(
                    { id: postData?.c_companies_id },
                    ['id', 'code', 'company_name']
                );
                resultedData['company'] = companyDetails || {};
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
    @Post('create')
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateQuickLinkInput) {
        try {
            if ((postData?.c_companies_id == undefined || postData?.c_companies_id == null) || !postData?.title || !postData?.link) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            const company_ids: string[] = postData?.c_companies_id.split(',');
            if (req.tokenUser?.role_id != appConstant.ROLE.ADMIN && appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER != req.tokenUser?.role_id && company_ids.length > 1) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_INVALID_COMPANY'));
            }
            const restrictedRoles = [appConstant.ROLE.BROKERADMIN, appConstant.ROLE.BROKER, appConstant.ROLE.REGIONALADMIN];
            if (restrictedRoles.includes(req.tokenUser?.role_id)) {
                if (!company_ids.includes(String(postData.c_companies_id))) {
                    throw new Error(
                        await this.translatorService.frontendReadTranslation(req.lang, 'ERR_UNAUTHORIZED')
                    );
                }
            }
            if(postData?.healthplanname && Array.isArray(postData?.healthplanname) && postData?.healthplanname.length > 0){
                postData.healthplanname = JSON.stringify(postData?.healthplanname);
            }else{
                postData.healthplanname = '';
            }
            if(company_ids.length > 1){
                postData.c_companies_id = '0';
            }
            let whereCondition: any = {
                title: postData?.title.trim(),
                c_companies_id: postData?.c_companies_id,
                link: postData?.link,
                status: Not(2),
            };
             if (req.tokenUser?.role_id === appConstant.ROLE.WCH) {
               whereCondition.created_by = In([req.tokenUser.id, 1]);
                postData.created_by = req.tokenUser?.id;
            }
            const formCheck = await this.quickLinkService.findOne(whereCondition);
            if (formCheck) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_QUICKLINK_ALREADY_EXIST"));
            }
            const quicklinkData = await this.quickLinkService.save({...postData});
            let dynamicDatas = Object.create(null);
            if(postData?.title){
                let tilte = `title_${quicklinkData['id']}`
                dynamicDatas[`${tilte}`]= postData?.title;
            }            
            if(postData?.description){
                let tilte = `description_${quicklinkData['id']}`
                dynamicDatas[`${tilte}`]= postData?.description;
            }            
            await this.translatorService.DynamicEngJsonData('QuickLink',postData?.c_companies_id,dynamicDatas,'Edit','QuickLink');
            let qAcId:any = 0;
            let activityclick = await this.activityService.activityFindOne({category_id: 43, activity_name: postData?.title, accebility: postData?.c_companies_id});
            if(activityclick){
                if(activityclick?.status != 1){
                    await this.activityService.update({id: activityclick?.id}, {status: 1, updated_by: req.tokenUser?.id});
                }
                qAcId = activityclick?.id;
            } else {
                const qActInsert = await this.activityService.save({category_id: 43, activity_name: postData?.title, accebility: postData?.c_companies_id, created_by: req.tokenUser?.id});
                qAcId = qActInsert?.['id'];
            }
            await this.quickLinkService.update({ id: quicklinkData['id'] },{activity_id: qAcId});
            if(company_ids.length > 1){
                for(let company of company_ids){
                    await this.quicklinkOrglistsService.save({c_companies_id: company, quicklink_id: quicklinkData['id'], created_by: req.tokenUser?.id, updated_by: req.tokenUser?.id});
                }
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: 'Quicklink has been successfully saved.'
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
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: UpdateQuickLinkInput) {
        try {
            if ((postData?.c_companies_id == undefined || postData?.c_companies_id == null) || !postData?.id || (postData?.title && postData?.title == '') || (postData?.link && postData?.link == '')) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            if(postData?.healthplanname && Array.isArray(postData?.healthplanname) && postData?.healthplanname.length > 0){
                postData.healthplanname = JSON.stringify(postData?.healthplanname);
            }else{
                postData.healthplanname = '';
            }
            const where = {id: postData?.id, status: Not(2)}
            const recordDetails = await this.quickLinkService.findOne({...where});
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_RECORD_NOT_FOUND'));
            }
            const orglist = await this.quicklinkOrglistsService.listRecord(["id","c_companies_id","quicklink_id","status"],{quicklink_id: recordDetails['id'], status: 1});
            const company_ids = postData?.c_companies_id.split(',');
            const removedElements = orglist.map((e)=>e.c_companies_id.toString()).filter(element => !company_ids.includes(element));
            const addedElements = company_ids.filter(element => !orglist.map((e)=>e.c_companies_id.toString()).includes(element));
            if(removedElements.length){
                removedElements.map(async(ele)=> {
                    const removedElements = await this.quicklinkOrglistsService.listRecord(["id","c_companies_id","quicklink_id","status","created_by","updated_by","created","update"],{quicklink_id: recordDetails['id'], c_companies_id: ele});
                    await this.quicklinkOrglistsService.update({quicklink_id: recordDetails['id'], c_companies_id: ele}, {status: 2,  updated_by: req.tokenUser?.id});
                    removedElements.map((element)=>this.activityLogService.create(element, {status: 2,  updated_by: req.tokenUser?.id}, tableConstant.QUICK_LINK.TBL_QUICK_LINK_ORGLISTS, req.tokenUser?.id, 'delete'));
                });
            }
            if(addedElements.length >= 1){
                addedElements.map(async(ele)=> await this.quicklinkOrglistsService.save({quicklink_id: recordDetails['id'], c_companies_id: parseInt(ele), status: 1, created_by: req.tokenUser?.id, updated_by: req.tokenUser?.id}));
            }
            if(company_ids.length && recordDetails.c_companies_id.toString() != postData?.c_companies_id){
                postData.c_companies_id= '0';
            }
            await this.quickLinkService.update({ id: postData?.id },{...postData});
            let dynamicDatas = Object.create(null);
            if(postData?.title){
                let tilte = `title_${recordDetails['id']}`
                dynamicDatas[`${tilte}`]= postData?.title;
            }            
            if(postData?.description){
                let tilte = `description_${recordDetails['id']}`
                dynamicDatas[`${tilte}`]= postData?.description;
            }            
            await this.translatorService.DynamicEngJsonData('QuickLink',postData?.c_companies_id,dynamicDatas,'Edit','QuickLink');
            this.activityLogService.create(recordDetails, postData, tableConstant.QUICK_LINK.TBL_QUICK_LINK, req.tokenUser?.id);
            let activityclick = await this.activityService.activityFindOne({category_id: 43, activity_name: postData?.title, accebility: postData?.c_companies_id});    
            if(activityclick){
                if(activityclick?.status != 1){
                    await this.activityService.update({id: activityclick?.id}, {status: 1, updated_by: req.tokenUser?.id});
                }
                if(activityclick?.id != recordDetails['activity_id']){  
                    let quicklinkActivityclick = await this.quickLinkClicksService.listRecord(['id','activity_id','quicklink_id'],{activity_id: activityclick?.id});   
                    if(quicklinkActivityclick){
                        quicklinkActivityclick.map(async(ele)=>{
                            await this.quickLinkClicksService.update({id: ele?.id}, {quicklink_id: postData?.id, updated_by: req.tokenUser?.id});
                            this.activityLogService.create(ele, {quicklink_id: postData?.id}, tableConstant.QUICK_LINK.TBL_QUICK_LINK_CLICKS, req.tokenUser?.id, 'update');
                        });
                    }
                    let quicklinkclick = await this.quickLinkClicksService.listRecord(['id','activity_id','quicklink_id'],{quicklink_id: postData?.id});
                    if(quicklinkclick){
                        quicklinkclick.map(async(ele)=>{
                            await this.quickLinkClicksService.update({id: ele?.id}, {activity_id: activityclick?.id, updated_by: req.tokenUser?.id});
                            this.activityLogService.create(ele, {activity_id: activityclick?.id}, tableConstant.QUICK_LINK.TBL_QUICK_LINK_CLICKS, req.tokenUser?.id, 'update');
                        });
                    }               
                }
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: 'Quicklink has been successfully updated.'
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
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: DeleteQuickLinkInput) {
        try {
            if (!postData?.id || (postData?.c_companies_id == undefined || postData?.c_companies_id == null)) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let where = { id: postData?.id, c_companies_id: postData?.c_companies_id };
            const recordDetails = await this.quickLinkService.findOne({...where});
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_RECORD_NOT_FOUND'));
            }
            await this.quickLinkService.update({id: recordDetails.id},{ status: 2});
            if(recordDetails?.activity_id){
                await this.activityService.update({id: recordDetails.activity_id}, {status: 2});
            }
            this.activityLogService.create(recordDetails, {status:2}, tableConstant.QUICK_LINK.TBL_QUICK_LINK, req.tokenUser?.id, 'delete');
            const orgList = await this.quicklinkOrglistsService.listRecord(["id","c_companies_id","quicklink_id","status","created_by","updated_by","created","update"],{quicklink_id: recordDetails['id']});
            await this.quicklinkOrglistsService.update({quicklink_id: recordDetails['id']},{ status: 2});
            orgList.map((element)=>this.activityLogService.create(element, {status: 2,  updated_by: req.tokenUser?.id}, tableConstant.QUICK_LINK.TBL_QUICK_LINK_ORGLISTS, req.tokenUser?.id, 'delete'));

            if (recordDetails) {
                const titleKey = `title_${recordDetails.id}`;
                const answerKey = `description_${recordDetails.id}`;
                const dynamicData = {
                    [titleKey]: titleKey,
                    [answerKey]: answerKey
                };
                await this.translatorService.DynamicEngJsonData(
                    'QuickLink',
                    recordDetails.c_companies_id,
                    dynamicData,
                    'Delete',
                    'QuickLink'
                );
            }

            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: 'Quicklink has been successfully deleted.',
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
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: GetOneQuickLinkInput) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let where: string =  `ql.id = ${postData?.id}`;
            if(postData?.c_companies_id){
                where += ` AND ql.c_companies_id = ${postData?.c_companies_id}`;
            }
            let resultedData = await this.quickLinkService.findOne(where, req?.tokenUser?.role_id == appConstant.ROLE.ADMIN ? {loadOrglist: true} : null);
            resultedData = <any>(
                await this.commonArrayService.formatToDto(QuicklinkDto, resultedData, req.lang)
            );
            if(resultedData?.title){
                let customeName = await this.translatorService.frontendReadTranslation(req.lang,`title_${resultedData['id']}`, `/LC_MESSAGES/QuickLink/QuickLink/${resultedData['c_companies_id']}`,`dynamic`);
                resultedData.title = (customeName == '' || customeName == `title_${resultedData['id']}`) ? resultedData['title'] : customeName;
            }
            if(resultedData?.description){
                let customeName = await this.translatorService.frontendReadTranslation(req.lang,`description_${resultedData['id']}`, `/LC_MESSAGES/QuickLink/QuickLink/${resultedData['c_companies_id']}`,`dynamic`);
                resultedData.description = (customeName == '' || customeName == `description_${resultedData['id']}`) ? resultedData['description'] : customeName;
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
    @Post('list')
    async list(@Req() req: Request, @Res() res: Response, @Body() postData: ListQuickLinkInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            if (!postData?.c_companies_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let where: string, result: any;
            let user = Object.create(req.tokenUser);
            const order = postData && postData?.order ? postData?.order : 'ASC';
            const orderBy = postData && postData?.order_by ? postData?.order_by : 'sort_order';
            if ([appConstant.ROLE.REGISTERED, appConstant.ROLE.SPOUSE].includes(req.tokenUser?.role_id)) {
                let usersdataChat = user.usersdatawellness ?? '';
                let userTimeZone = user.timezone ?? 'UTC';
                const userCurrentDate = moment().tz(userTimeZone).format('YYYY-MM-DD HH:mm:ss');
                where = `ql.status = 1 AND (ql.c_companies_id = ${postData?.c_companies_id} OR orglist.c_companies_id = ${postData?.c_companies_id})`;
                usersdataChat = usersdataChat.map((user: any) => user.id).join(',');
                if (usersdataChat) {
                    where += ` AND ql.created_by NOT IN (${usersdataChat})`;
                }
                where += ` AND ((ql.dispalybasedon = 0 AND ql.fromdate IS NULL AND ql.todate IS NULL) OR (ql.dispalybasedon = 1 AND ql.fromdate <= '${userCurrentDate}') OR (ql.dispalybasedon = 2 AND ql.fromdate <= '${userCurrentDate}' AND ql.todate >= '${userCurrentDate}'))`;
                result = await this.quickLinkService.listRecord(['ql','folder'], where, { sort_order : order });
                result = <any>(
                    await this.commonArrayService.formatToDto(QuicklinkDto, result, req.lang)
                );
            } else {
                if (!postData?.c_companies_id) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
                let whereObj: any = {c_companies_id:postData?.c_companies_id, status: 1};
                if (req.tokenUser?.role_id === appConstant.ROLE.WCH) {
                    whereObj.created_by = In([req.tokenUser?.id, 1]);
                }
                result = await this.quickLinkService.quickLinkListRecord(['id','c_companies_id','is_video','sort_order','title'], whereObj,{ sort_order : order });
                result = <any>(
                    await this.commonArrayService.formatToDto(QuicklinkDto, result, req.lang)
                );
            }
            if(result && result.length){
                await Promise.all(result.map(async (ele)=>{
                    let checkUrl = process.env.DOMAIN + '/download-document/15/';
                    let checkpUrl = process.env.DOMAIN + '/download-pdocument/15/';
                    ele.link = await this.urlManageService.onmapUrl(ele?.link);
                    let Urlcheck = checkUrl.replace('https', 'http');
                    let Urlcheck1 = checkUrl.replace('http', 'https');
                    let Urlcheckp = checkpUrl.replace('https', 'http');
                    let Urlcheckp1 = checkpUrl.replace('http', 'https');
                    const sanitizeId = (value: string) => value.replace(/[^A-Za-z0-9]/g, '');
                    const getInternalId = (linkValue: string) => {
                        const baseName = path.basename(linkValue);
                        return sanitizeId(baseName);
                    };
                    ele.Isinternal = 0;
                    if(ele.link?.includes(Urlcheck)){
                        ele.Isinternal = 1;
                        ele.IsinternalId = parseInt(getInternalId(ele.link));
                    }
                    if(ele.link?.includes(Urlcheck1)){
                        ele.Isinternal = 1;
                        ele.IsinternalId = parseInt(getInternalId(ele.link));
                    }
                    if(ele.link?.includes(Urlcheckp)){
                        ele.Isinternal = 1;
                        ele.IsinternalId = parseInt(getInternalId(ele.link));
                    }
                    if(ele.link?.includes(Urlcheckp1)){
                        ele.Isinternal = 1;
                        ele.IsinternalId = parseInt(getInternalId(ele.link));
                    }
                    ele.title = await this.quickLinkService.replacePreventionCloudLinks(ele.title);
                    if (ele.folder?.folder_name) {
                        ele.folder.folder_name = await this.quickLinkService.replacePreventionCloudLinks(
                            ele.folder.folder_name
                        );
                    }
                }));
            }
            if ([appConstant.ROLE.REGISTERED, appConstant.ROLE.SPOUSE].includes(req.tokenUser?.role_id)) {
                const tmpFoldersArr = [];
                const processedQuicklinks = [];
                let user_health_plan_name = user.insurance_plan_name;                
                let user_health_plan_issue = user?.on_insurance_plan?.toLowerCase() == 'no' ? 1 : 0;           
                    for (let quicklink of result){
                    let show_folder_in_users = 0;
                    let show_folder_in_users_folder = 0;
                    let showQuickLink = false;
                    if ((user.is_camp_eligible === 1 && quicklink.eligibility === 1) ||
                        (user.is_camp_eligible === 0 && quicklink.eligibility === 2) ||
                        (user.role_id === 2 && user.is_camp_eligible === 1 && quicklink.eligibility === 3) ||
                        (user.role_id === 2 && user.is_camp_eligible === 0 && quicklink.eligibility === 4) ||
                        (user.role_id === 16 && user.is_camp_eligible === 1 && quicklink.eligibility === 5) ||
                        (user.role_id === 16 && user.is_camp_eligible === 0 && quicklink.eligibility === 6)) {
                        showQuickLink = true;
                    }
                    let newLinkPath = await this.urlManageService.onmapUrl(quicklink?.link);
                    quicklink.link = newLinkPath;
                    if (quicklink.eligibility === 0 || showQuickLink) {
                        let tmpFolder = null;
                        let folderIcon = null;
                        if (quicklink?.folder && !tmpFoldersArr?.includes(quicklink?.folder?.folder_name)) {
                            const folderName = quicklink?.folder?.folder_name;
                            if (!tmpFoldersArr.includes(folderName)) {
                                tmpFoldersArr.push(folderName);
                                tmpFolder = folderName;
                                folderIcon = '<i class="fa fa-folder"></i>&nbsp;&nbsp;';
                            }
                        }
                        if (tmpFolder !== null) {
                            let show_of_no_health_plan_user = quicklink?.folder?.usernotonhealthplan == 1 ? 1 : 0;
                            if (show_of_no_health_plan_user == 0 && (quicklink?.folder?.healthplanname == '' || quicklink?.folder?.healthplanname == null)) {                                
                                show_folder_in_users = 1;
                            } else {
                                if (show_of_no_health_plan_user == 1) {
                                    if (user_health_plan_issue == 1) {                                        
                                        show_folder_in_users = 1;
                                    }
                                } else {
                                    let array_of_health_plan_name = (quicklink?.folder?.healthplanname && quicklink?.folder?.healthplanname?.length>0) ? ((Array.isArray(quicklink?.folder?.healthplanname)) ? quicklink?.folder?.healthplanname : JSON.parse(quicklink?.folder?.healthplanname)) : [];
                                    if (array_of_health_plan_name.length && array_of_health_plan_name?.includes(user_health_plan_name)) {                                       
                                        show_folder_in_users = 1;
                                    }
                                }
                            }
                            if (show_folder_in_users == 1) {
                                processedQuicklinks.push({
                                    type: 'folder',
                                    folder_name: tmpFolder,
                                    folder_id: quicklink.folder_id,
                                    icon: folderIcon,
                                    id: quicklink.id,
                                    title: quicklink.title,
                                    description: quicklink.description,
                                    link: quicklink.link,
                                    is_video: quicklink.is_video,
                                    sort_order: quicklink.sort_order,
                                    eligibility: quicklink.eligibility,
                                    company: quicklink.company,
                                    linkType: quicklink.linkType,
                                    orglist: quicklink.orglist,
                                    folder : quicklink?.folder,
                                    Isinternal: quicklink?.Isinternal,
                                    IsinternalId: quicklink?.IsinternalId,
                                    c_companies_id:quicklink.c_companies_id
                                });
                            }
                        } else {
                            if (!Array.isArray(quicklink?.folder) || quicklink?.folder?.filter((item: any) => item).length === 0) {
                                let show_of_no_health_plan_user = quicklink?.usernotonhealthplan == 1 ? 1 : 0;                                                              
                                if (show_of_no_health_plan_user == 0 && (quicklink?.healthplanname == '' || quicklink?.healthplanname == null)) {                                   
                                    show_folder_in_users = 1;
                                } else {
                                    if (show_of_no_health_plan_user == 1) {
                                        if (user_health_plan_issue == 1) {                                            
                                            show_folder_in_users = 1;
                                        }
                                    } else {                                        
                                        let array_of_health_plan_name = (quicklink?.healthplanname && quicklink?.healthplanname?.length>0) ? ((Array.isArray(quicklink?.healthplanname)) ? quicklink?.healthplanname : JSON.parse(quicklink?.healthplanname)) : [];                                      
                                        if (array_of_health_plan_name.length && array_of_health_plan_name.includes(user_health_plan_name)) {                                            
                                            show_folder_in_users = 1;
                                        }
                                    }
                                }
                                if( quicklink?.folder !=null){
                                    let show_of_no_health_plan_user_folder = quicklink?.folder?.usernotonhealthplan == 1 ? 1 : 0;                                                              
                                    if (show_of_no_health_plan_user_folder == 0 && (quicklink?.folder?.healthplanname == '' || quicklink?.folder?.healthplanname == null)) {                                   
                                        show_folder_in_users_folder = 1;
                                    } else {
                                        if (show_of_no_health_plan_user_folder == 1) {
                                            if (user_health_plan_issue == 1) {                                            
                                                show_folder_in_users_folder = 1;
                                            }
                                        } else {                                        
                                            let array_of_health_plan_name_folder = (quicklink?.folder?.healthplanname && quicklink?.folder?.healthplanname?.length>0) ? ((Array.isArray(quicklink?.folder?.healthplanname)) ? quicklink?.folder?.healthplanname : JSON.parse(quicklink?.folder?.healthplanname)) : [];
                                            if (array_of_health_plan_name_folder.length && array_of_health_plan_name_folder?.includes(user_health_plan_name)) {                                            
                                                show_folder_in_users_folder = 1;
                                            }
                                        }
                                    }    
                                }
                                if (show_folder_in_users == 1 && (quicklink?.folder==null || show_folder_in_users_folder == 1)) {
                                    processedQuicklinks.push({
                                        type: 'link',
                                        id: quicklink.id,
                                        folder_id: quicklink.folder_id,
                                        title: quicklink.title,
                                        description: quicklink.description,
                                        link: quicklink.link,
                                        is_video: quicklink.is_video,
                                        icon: quicklink.is_video ? '<i class="fa fa-video-camera"></i>' : '',
                                        sort_order: quicklink.sort_order,
                                        eligibility: quicklink.eligibility,
                                        company: quicklink.company,
                                        linkType: quicklink.linkType,
                                        orglist: quicklink.orglist,
                                        Isinternal: quicklink?.Isinternal,
                                        IsinternalId: quicklink?.IsinternalId,
                                        c_companies_id:quicklink?.c_companies_id
                                    });
                                }
                            }
                        }
                    }                    
                }
                let data = [];
                let resultedData = [];

                for (const item of processedQuicklinks) {
                    if (item.folder_id && item.folder_id != 0) {
                        const folderId = item.folder_id;
                        if (!data[folderId]) {
                            if (item.folder?.folder_name) {
                                let customeName = await this.translatorService.frontendReadTranslation(
                                    req.lang,
                                    `folder_name_${folderId}`,
                                    `/LC_MESSAGES/QuickLink/QuickLink/${item.folder['c_companies_id']}`,
                                    `dynamic`
                                );
                                item.folder.folder_name = (customeName == '' || customeName == `folder_name_${folderId}`) ? item.folder.folder_name : customeName;
                                item.folder.folder_name = await this.quickLinkService.replacePreventionCloudLinks(
                                    item.folder.folder_name
                                );
                            }
                            data[folderId] = {
                                folder_id: folderId,
                                title: item.folder?.folder_name,
                                folders: [],
                            };
                            resultedData.push(data[folderId]);
                        }
                        if (item?.title) {
                            let customeName = await this.translatorService.frontendReadTranslation(
                                req.lang,
                                `title_${item['id']}`,
                                `/LC_MESSAGES/QuickLink/QuickLink/${item['c_companies_id']}`,
                                `dynamic`
                            );

                            item.title = (customeName == '' || customeName == `title_${item['id']}`) ? item['title'] : customeName;
                            item.title = await this.quickLinkService.replacePreventionCloudLinks(item.title);
                        }
                        if (item?.description) {
                            let customeName = await this.translatorService.frontendReadTranslation(
                                req.lang,
                                `description_${item['id']}`,
                                `/LC_MESSAGES/QuickLink/QuickLink/${item['c_companies_id']}`,
                                `dynamic`
                            );
                            item.description = (customeName == '' || customeName == `description_${item['id']}`) ? item['description'] : customeName;
                        }
                        data[folderId].folders.push({
                            id: item.id,
                            title: item.title,
                            description: item.description,
                            link: item.link,
                            is_video: item.is_video,
                            sort_order: item.sort_order,
                            eligibility: item.eligibility,
                            company: item.company,
                            linkType: item.linkType,
                            orglist: item.orglist,
                            Isinternal: item.Isinternal,
                            IsinternalId: item.IsinternalId
                        });
                    } else {
                        if (item?.title) {
                            let customeName = await this.translatorService.frontendReadTranslation(
                                req.lang,
                                `title_${item['id']}`,
                                `/LC_MESSAGES/QuickLink/QuickLink/${item['c_companies_id']}`,
                                `dynamic`
                            );

                            item.title = (customeName == '' || customeName == `title_${item['id']}`) ? item['title'] : customeName;
                            item.title = await this.quickLinkService.replacePreventionCloudLinks(item.title);
                        }
                        if (item?.description) {
                            let customeName = await this.translatorService.frontendReadTranslation(
                                req.lang,
                                `description_${item['id']}`,
                                `/LC_MESSAGES/QuickLink/QuickLink/${item['c_companies_id']}`,
                                `dynamic`
                            );
                            item.description = (customeName == '' || customeName == `description_${item['id']}`) ? item['description'] : customeName;
                        }
                        resultedData.push({
                            id: item.id,
                            title: item.title,
                            description: item.description,
                            link: item.link,
                            is_video: item.is_video,
                            sort_order: item.sort_order,
                            eligibility: item.eligibility,
                            company: item.company,
                            linkType: item.linkType,
                            orglist: item.orglist,
                            Isinternal: item.Isinternal,
                            IsinternalId: item.IsinternalId
                        });
                    }
                }
                result = resultedData;
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: result,
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
    sortData(data) {
        try{
            function sortFolder(folder) {
                if (folder.folders && Array.isArray(folder.folders)) {
                    folder.folders.sort((a, b) => {
                        const aSortOrder = a.sort_order !== undefined ? a.sort_order : Infinity;
                        const bSortOrder = b.sort_order !== undefined ? b.sort_order : Infinity;
                        return aSortOrder - bSortOrder;
                    });
                    folder.folders.forEach(sortFolder);
                }
            }
            data.sort((a, b) => {
                const aSortOrder = a.sort_order !== undefined ? a.sort_order : Infinity;
                const bSortOrder = b.sort_order !== undefined ? b.sort_order : Infinity;
                return aSortOrder - bSortOrder;
            });
            data.forEach(sortFolder);
            return data;
        }catch (error) {
            throw new Error(error.message); 
        }
    }
    @Post('change-order')
    async changeOrder(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if ((postData?.c_companies_id == undefined || postData?.c_companies_id == null) && !postData?.order) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let resultedData: any = await this.quickLinkService.updateOrder(postData, req);
            resultedData = <any>(
                await this.commonArrayService.formatToDto(QuicklinkDto, resultedData, req.lang)
            );
            if(resultedData?.title){
                let customeName = await this.translatorService.frontendReadTranslation(req.lang,`title_${resultedData['id']}`, `/LC_MESSAGES/QuickLink/QuickLink/${resultedData['c_companies_id']}`,`dynamic`);
                resultedData.title = (customeName == '' || customeName == `title_${resultedData['id']}`) ? resultedData['title'] : customeName;
            }
            if(resultedData?.description){
                let customeName = await this.translatorService.frontendReadTranslation(req.lang,`description_${resultedData['id']}`, `/LC_MESSAGES/QuickLink/QuickLink/${resultedData['c_companies_id']}`,`dynamic`);
                resultedData.description = (customeName == '' || customeName == `description_${resultedData['id']}`) ? resultedData['description'] : customeName;
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: resultedData,
                message: await this.translatorService.frontendReadTranslation(req.lang, "SUCCESS_ORDER_CHANGE"),
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
    @Post('list-record')
    async listIds(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if ((postData?.c_companies_id == undefined || postData?.c_companies_id == null) ) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let resultedData = await this.quickLinkService.quickLinkListRecord(['id','title'], {c_companies_id:postData?.c_companies_id});
            if(resultedData && resultedData.length){
                await Promise.all(resultedData.map(async (ele)=>{
                    if(ele.title){
                        let customeName = await this.translatorService.frontendReadTranslation(req.lang,`title_${ele['id']}`, `/LC_MESSAGES/QuickLink/QuickLink/${ele['c_companies_id']}`,`dynamic`);
                        ele.title = (customeName == '' || customeName == `title_${ele['id']}`) ? ele['title'] : customeName;
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
}
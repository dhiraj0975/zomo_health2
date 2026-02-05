import { CampaignActivityService } from '@/modules/campaign/campaignactivity/campaignactivity.service';
import { ActivitiesDto, appConstant, CommonArrayService, CommonFileService, CommonService, tableConstant } from '@common-constants';
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
import { ClientManagerAssignService } from 'src/modules/company/clientmanagerassign/clientmanagerassign.service';
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import { In, Not, Raw } from "typeorm";
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import {
    ActivityActivateDeactivate,
    CopyactivityInput,
    CreateActivityInput,
    DeleteactivityInput,
    ListactivityInput,
    PaginationActivityInput,
    UpdateActivityInput
} from '../../../input';
import { TranslationService } from "../../translation/translation.service";
import { ActivityService } from './activity.service';
@Controller('activity')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class ActivityController {
    constructor(
        private readonly activityService: ActivityService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        private readonly clientManagerAssignService: ClientManagerAssignService,
        private readonly campaignActivityService: CampaignActivityService,
    ) { }
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginationActivityInput) {
        try {
            let enable_activity_type, enable_activity_value;
            if (postData?.enable_activity_tracker) {
                enable_activity_type = `enable_activity_tracker`;
                enable_activity_value = postData?.enable_activity_tracker;
            }
            if (postData?.enable_reimbursement) {
                enable_activity_type = `enable_reimbursement`;
                enable_activity_value = postData?.enable_reimbursement;
            }
            let where = (enable_activity_type) ? `activity.status NOT IN(2,0) ` : `activity.status != '2' `;
            if (req.tokenUser?.role_id == appConstant.ROLE.REGISTERED) {
                if (!postData?.accebility) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
                }
                where = `activity.status != '2' AND activity.${enable_activity_type} = '1' AND activity.accebility = ${postData?.accebility}`;
            }
            postData = this.commonService.sanitizePayload(postData)
            if (postData?.search_str) {
                // we cna remove filterby here currently putting as it is
                if (postData?.filter_by) {
                    if (postData?.filter_by?.toLowerCase() == 'id') {
                        where += this.commonService.generateDynamicSearchQuery(postData?.search_str, 'activity.id');
                    }
                    if (postData?.filter_by?.toLowerCase() == 'activities') {
                        where += this.commonService.generateDynamicSearchQuery(postData?.search_str, 'activity.activity_name');
                    }
                    if (postData?.filter_by?.toLowerCase() == 'activity_type') {
                        where += this.commonService.generateDynamicSearchQuery(postData?.search_str, 'category.category_name');
                    }
                } else {
                    where += this.commonService.generateDynamicSearchQuery(postData?.search_str, ['activity.id','activity.activity_name','category.category_name']);
                }
            }
            if (postData?.visibility || postData?.visibility == 0) {
                if (postData?.visibility == 0) {
                    where += ` AND activity.accebility = ${postData?.visibility}`;
                } else {
                    if (postData?.visibility == 1) {
                        where += ` AND activity.accebility != 0`;
                    } else {
                        where += ` AND (activity.accebility = ${postData?.visibility} OR (activity.accebility = 0 AND activity.activity_display = 0))`;
                    }
                }
            }
            if (postData?.category_id) {
                where += ` AND (activity.category_id = '${postData?.category_id}')`;
            }
            if (postData?.accebility != undefined || postData?.accebility != null) {
                where += ` AND (activity.accebility IN(0,${postData?.accebility}))`;
            }
            if (enable_activity_type) {
                where += ` AND activity.${enable_activity_type} = '${enable_activity_value}'`;
            }
            if (appConstant.ROLE.CLIENTENGAGEMENTMANAGER == req.tokenUser?.role_id){
                let resultedData = await this.clientManagerAssignService.listRecord({user_id: req.tokenUser?.id,status: 1},null);
                if(resultedData.length > 0){
                    where += `AND company.id IN (${resultedData.map(ele=>ele.org_id).join(',')})`;
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
            const resultedData = await this.activityService.paginateList(
                ['activity', 'category', 'company'],
                where,
                postData,
                [tableConstant.ACTIVITIES.TBL_CATEGORIES, tableConstant.COMPANIES.TBL_COMPANY],
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(ActivitiesDto, resultedData['list'], req.lang)
            );
            if(resultedData['list'] && resultedData['list'].length){
                await Promise.all(resultedData['list'].map(async (ele)=>{
                    let activity_type = ele.enable_reimbursement ? 'Reimbursements': 'ActivityForms';
                    if(ele.activity_name){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`activity_name_${ele['id']}`, `/LC_MESSAGES/${activity_type}/Activities/${ele['accebility']}/${ele['id']}`,`dynamic`);
                        ele.activity_name = (customName == '' || customName == `activity_name_${ele['id']}`) ? ele['activity_name'] : customName;
                    }
                    if(ele.category && ele.category.category_name){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`category_name_${ele.category['id']}`, `/LC_MESSAGES/Campaign/Category/${ele.category['id']}`,`dynamic`);
                        ele.category.category_name = (customName == '' || customName == `category_name_${ele.category['id']}`) ? ele.category['category_name'] : customName;
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
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateActivityInput) {
        try {
            if (postData?.enable_activity_tracker || postData?.enable_reimbursement) {
                if (!postData?.activity_name || (postData?.accebility == undefined || postData?.accebility == null)) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
                }
            } else {
                if (!postData?.activity_name || !postData?.category_id || (postData?.accebility == undefined || postData?.accebility == null)) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
                }
            }
            let where = { activity_name: postData?.activity_name, status: Not('2') };
            if (postData?.accebility == 1) {
                postData.accebility = postData?.org_id ?? 0;
                where['accebility'] = In([postData?.org_id, 0]);
            }
            let enable_activity_type, enable_activity_value, category_id;
            if (postData?.enable_activity_tracker) {
                enable_activity_type = `enable_activity_tracker`;
                enable_activity_value = postData?.enable_activity_tracker;
                category_id = postData?.category_id ?? 40;
            }
            if (postData?.enable_reimbursement) {
                enable_activity_type = `enable_reimbursement`;
                enable_activity_value = postData?.enable_reimbursement;
                category_id = postData?.category_id ?? 82;
            }
            if (enable_activity_type) {
                where[enable_activity_type] = 1;
                postData[enable_activity_type] = 1;
                postData['category_id'] = category_id;
            }
            postData.activity_name = postData?.activity_name.trim();
            const activityCheck = await this.activityService.findOne(where);
            if (activityCheck) {
                throw new Error((await this.translatorService.frontendReadTranslation(req.lang, 'ERR_FILES_ALREADY_EXIST')).replace('%s', 'Activity'));
            }
            if (req?.tokenUser?.role_id == appConstant.ROLE.WCH) {
                postData['created_by'] = req?.tokenUser?.id ?? 2;
            } else {
                postData['created_by'] = 2;
            }
            postData['status'] = 1;
            delete postData?.role_id;
            delete postData?.org_id;
            let recordDetails = await this.activityService.save({ ...postData });
            let dynamicData = Object.create(null);
            if(postData?.activity_name){
                let title = `activity_name_${recordDetails['id']}`
                dynamicData[`${title}`]= postData?.activity_name;
            }                        
            let activity_type = postData?.enable_reimbursement  ? 'Reimbursements': 'ActivityForms';
            await this.translatorService.DynamicEngJsonData(activity_type,recordDetails['accebility'],dynamicData,'Edit','Activities',recordDetails['id']); 
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: postData,
                message: 'Activity has been added successfully.'
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
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: UpdateActivityInput) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            let where = { activity_name: postData?.activity_name, status: Not('2'), id: Not(postData?.id) };
            if (postData?.accebility == 1) {
                postData.accebility = postData?.org_id ?? 0;
                where['accebility'] = In([postData?.org_id, 0]);
                delete postData?.org_id;
            }
            let enable_activity_type, enable_activity_value, category_id;
            if (postData?.enable_activity_tracker) {
                enable_activity_type = `enable_activity_tracker`;
                enable_activity_value = postData?.enable_activity_tracker;
                category_id = postData?.category_id ?? 40;
            }
            if (postData?.enable_reimbursement) {
                enable_activity_type = `enable_reimbursement`;
                enable_activity_value = postData?.enable_reimbursement;
                category_id = postData?.category_id ?? 82;
            }
            if (enable_activity_type) {
                where[enable_activity_type] = 1;
                postData[enable_activity_type] = 1;
                postData['category_id'] = category_id;
            }
            const activityCheck = await this.activityService.findOne(where);
            if (activityCheck) {
                throw new Error((await this.translatorService.frontendReadTranslation(req.lang, 'ERR_FILES_ALREADY_EXIST')).replace('%s', 'Activity'));
            }
            const recordDetails = await this.activityService.findOne({ id: postData?.id });
            if(postData?.org_id && postData?.org_id != 0 && postData?.org_id?.toString() != recordDetails?.accebility){
                postData.accebility = postData?.org_id;
            }
            let dynamicData = Object.create(null);
            if(postData?.activity_name){
                let title = `activity_name_${postData['id']}`
                dynamicData[`${title}`]= postData?.activity_name;
            }    
            let activity_type = (postData?.enable_reimbursement || activityCheck?.enable_reimbursement) ? 'Reimbursements': 'ActivityForms';
            await this.translatorService.DynamicEngJsonData(activity_type,postData['accebility'],dynamicData,'Edit','Activities',postData['id']);                 
            await this.activityService.update({ id: postData?.id }, { ...postData });
            this.activityLogService.create(activityCheck, postData, tableConstant.ACTIVITIES.TBL_ACTIVITIES, req.tokenUser?.id);
            let message = 'Activity has been updated successfully.'
            if (this.commonService.isValidNumber(postData?.activity_display)) {
                message = postData.activity_display == 1 ?
                    'Activity is Hide successfully.'
                    : 'Activity is Show successfully.'
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: postData,
                message: message || 'Activity has been updated successfully.'
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
    async list(@Req() req: Request, @Res() res: Response, @Body() postData: ListactivityInput) {
        try {
            if (!postData?.id && (postData?.org_id == undefined || postData?.org_id == null)) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            let where = (postData?.org_id != undefined && postData?.org_id != null) ? { accebility: In([0, postData?.org_id]) } : { id: In(postData?.id.split(",")) }
            where['activity_display'] = 0;
            if (postData?.activity_display) {
                where['activity_display'] = postData?.activity_display;
            }
            where['status'] = Not('2');
            if (postData?.status) {
                where['status'] = postData?.status;
            }
            if (postData?.category_id) {
                where['category_id'] = postData?.category_id;
            }
            if (postData?.enable_activity_tracker) {
                where['enable_activity_tracker'] = 1;
            }
            if (postData?.enable_reimbursement) {
                where['enable_reimbursement'] = 1;
            }
            let resultedData = await this.activityService.listRecord({ ...where }, null, ["activity.id", "activity.activity_name","activity.accebility", "activity.enable_reimbursement"], [tableConstant.ACTIVITIES.TBL_CATEGORIES, tableConstant.COMPANIES.TBL_COMPANY]);
            resultedData = <any>(
                await this.commonArrayService.formatToDto(ActivitiesDto, resultedData, req.lang)
            );
            if (req.tokenUser?.role_id != appConstant.ROLE.ADMIN) {
                if (resultedData && resultedData.length) {
                    await Promise.all(resultedData.map(async (ele) => {
                        let activity_type = ele.enable_reimbursement ? 'Reimbursements' : 'ActivityForms';
                        if (ele.activity_name) {
                            let customName = await this.translatorService.frontendReadTranslation(req.lang, `activity_name_${ele['id']}`, `/LC_MESSAGES/${activity_type}/Activities/${ele['accebilitytranslation']}/${ele['id']}`, `dynamic`);
                            ele.activity_name = (customName == '' || customName == `activity_name_${ele['id']}`) ? ele['activity_name'] : customName;
                        }
                        if (ele.category && ele.category.category_name) {
                            let customName = await this.translatorService.frontendReadTranslation(req.lang, `category_name_${ele.category['id']}`, `/LC_MESSAGES/Campaign/Category/${ele.category['id']}`, `dynamic`);
                            ele.category.category_name = (customName == '' || customName == `category_name_${ele.category['id']}`) ? ele.category['category_name'] : customName;
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
    @Put('copy')
    async copy(@Req() req: Request, @Res() res: Response, @Body() postData: CopyactivityInput) {
        try {
            let returnResponce;
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            const activity = await this.activityService.findOne({ id: postData?.id, status: Not('2') });
            if (activity) {
                const activityData = JSON.parse(JSON.stringify(activity));
                delete activity.id;
                activity.activity_name = activity.activity_name + ' Copy';
                returnResponce = await this.activityService.save({ ...activity });
                this.activityLogService.create(activityData, returnResponce, tableConstant.ACTIVITIES.TBL_ACTIVITIES, req.tokenUser?.id, 'Copy');
            } else {
                throw new Error((await this.translatorService.frontendReadTranslation(req.lang, 'ERR_COPY_FIELD')).replace('%s', 'Activity'));
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: { id: returnResponce.id },
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
    @Put('activity-activate-deactivate')
    async activityActivateDeactivate(@Req() req: Request, @Res() res: Response, @Body() postData: ActivityActivateDeactivate) {
        try {
            if (!postData?.id || (postData?.status == undefined || postData?.status == null)) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.activityService.findOne({ id: postData?.id });
            const resultedData = await this.activityService.update({ id: postData?.id }, { activity_display: postData?.status });
            this.activityLogService.create(recordDetails, { activity_display: postData?.status }, tableConstant.TBL_USERS, req.tokenUser?.id);
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: resultedData.affected,
                message: 'Activity status has been changed successfully.',
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
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: DeleteactivityInput) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.activityService.findOne({ id: postData?.id });
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
            const resultedData = await this.activityService.update({ id: postData?.id }, { status: '2' });
            /* Campaign Activity Delete */
                let campActivityIds = await this.campaignActivityService.assignActivityCampaignIds({activity_id: postData?.id, status: Not(2)});
                if(campActivityIds && campActivityIds.length){
                    await this.campaignActivityService.update({ id: In(campActivityIds)},{ status: 2 });
                    const campaignActivity = await this.campaignActivityService.listRecord({id: In(campActivityIds)});
                    campaignActivity?.map(ele=>this.activityLogService.create(ele, {status: 2}, tableConstant.CAMPAIGN.TBL_CAMPAIGN_ACTIVITY, req.tokenUser?.id, 'activity delete'));
                }
            /* Campaign Activity Delete */
            this.activityLogService.create(recordDetails, { status: 2 }, tableConstant.ACTIVITIES.TBL_ACTIVITIES, req.tokenUser?.id, 'delete');
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: resultedData.affected,
                message: 'Activity has been deleted successfully.',
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
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = { id: postData?.id };
            let recordDetails = await this.activityService.findOne(where);
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
                await this.commonArrayService.formatToDto(ActivitiesDto, recordDetails, req.lang)
            );
            let activity_type = recordDetails.enable_reimbursement ? 'Reimbursements': 'ActivityForms';
            if(recordDetails.activity_name){
                let customName = await this.translatorService.frontendReadTranslation(req.lang,`activity_name_${recordDetails['id']}`, `/LC_MESSAGES/${activity_type}/Activities/${recordDetails['accebility']}/${recordDetails['id']}`,`dynamic`);
                recordDetails.activity_name = (customName == '' || customName == `activity_name_${recordDetails['id']}`) ? recordDetails['activity_name'] : customName;
            }
            if(recordDetails['category'] && recordDetails['category'].category_name){
                let customName = await this.translatorService.frontendReadTranslation(req.lang,`category_name_${recordDetails['category']['id']}`, `/LC_MESSAGES/Campaign/Category/${recordDetails['category']['id']}`,`dynamic`);
                recordDetails['category'].category_name = (customName == '' || customName == `category_name_${recordDetails['category']['id']}`) ? recordDetails['category']['category_name'] : customName;
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
    @Post('activity-list')
    async activityList(@Req() req: Request, @Res() res: Response, @Body() postData: PaginationActivityInput) {
        try {
            if (req.tokenUser?.role_id == appConstant.ROLE.ADMIN && postData?.flag === 1) {
                if (!this.commonService.isValidNumber(postData?.org_id)) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
                let where: any = { accebility : postData?.org_id,activity_name: Raw(alias => `(${alias} IS NOT NULL AND ${alias} != '')`) }
                if (postData?.enable_activity_tracker) {
                    where.enable_activity_tracker = '1'
                }
                if (postData?.enable_reimbursement) {
                    where.enable_reimbursement = '1'
                }
                let resultedData = await this.activityService.activityListRecord(where, ["id", "activity_name"], { id: 'ASC' });
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: resultedData,
                    message: 'success',
                });
            }
            let resultedData: any = [];
            let where = `activity.status != '2' AND activity.category_id NOT IN('66','67')`;
            if (req.tokenUser?.role_id != appConstant.ROLE.ADMIN && appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER != req.tokenUser?.role_id) {
                where += ` AND coach.coach_manager_id = '${req.tokenUser?.id}' `;
            } else {
                where += ` AND coach.coach_manager_id  != '0'`;
                if (!postData?.search_str) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
            }
            postData = this.commonService.sanitizePayload(postData)
            if (postData?.search_str) {
                where += ` AND activity.activity_name LIKE '%${this.commonFileService.quoteEscaper(postData?.search_str)}%' `;
            }
            resultedData = await this.activityService.listRecord(where, null, ["activity.id", "activity.activity_name", "category.id", "category.category_name"], [tableConstant.ACTIVITIES.TBL_CATEGORIES, tableConstant.COMPANIES.TBL_COMPANY, tableConstant.COACH.TBL_CO_COACHES]);
            resultedData.unshift({ id: 0, activity_name: "Add activity" }, { id: -1, activity_name: "Org Specific Activity" });
            resultedData = <any>(
                await this.commonArrayService.formatToDto(ActivitiesDto, resultedData, req.lang)
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
    @Post('activity-list-for-campaign')
    async activityListForCampaign(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if ((req.tokenUser?.role_id == appConstant.ROLE.ADMIN || appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER == req.tokenUser?.role_id) && !postData?.org_id && !postData?.getItems) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let where = `activity.status = 1 AND activity.accebility IN (0,${postData?.org_id})`;
            if (postData?.getItems == 'altactivity') {
                where += ` AND category.qty_req != 0`;
            }
            postData = this.commonService.sanitizePayload(postData)
            if (postData?.search_str) {
                if (postData?.getItems == 'activitys' || postData?.getItems == 'altactivity') {
                    where += ` AND activity.activity_name LIKE '%${this.commonFileService.quoteEscaper(postData?.search_str)}%' `;
                } else {
                    where += ` AND category.category_name LIKE '%${this.commonFileService.quoteEscaper(postData?.search_str)}%' `;
                }
            }
            let resultedData = [];
            if (postData?.getItems == 'activitys' || postData?.getItems == 'altactivity') {
                let selectField = ["activity.id AS id", "activity.activity_name AS activity_name", "category.category_name AS category_name"];
                if (postData?.getItems == 'altactivity') {
                    selectField = ["activity.id AS id", "activity.activity_name AS activity_name","activity.accebility AS accebility", "activity.enable_reimbursement AS enable_reimbursement"];
                }
                resultedData = await this.activityService.campaignActivityRecord(where, selectField, { 'category.category_name': 'ASC', 'activity.activity_name': 'ASC' }, 'list', postData?.getItems);
            } else {
                resultedData = await this.activityService.campaignActivityRecord(where, ["activity.enable_reimbursement AS enable_reimbursement","activity.accebility AS accebility","category.id AS id", "category.category_name AS category_name"], { 'category.category_name': 'ASC' }, 'list', postData?.getItems);
            }
            if(resultedData && resultedData.length){
                await Promise.all(resultedData.map(async (ele)=>{
                    let activity_type = ele.enable_reimbursement ? 'Reimbursements': 'ActivityForms';
                    if(ele.activity_name){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`activity_name_${ele['id']}`, `/LC_MESSAGES/${activity_type}/Activities/${ele['accebility']}/${ele['id']}`,`dynamic`);
                        ele.activity_name = (customName == '' || customName == `activity_name_${ele['id']}`) ? ele['activity_name'] : customName;
                    }
                    if(ele.category && ele.category.category_name){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`category_name_${ele.category['id']}`, `/LC_MESSAGES/Campaign/Category/${ele.category['id']}`,`dynamic`);
                        ele.category.category_name = (customName == '' || customName == `category_name_${ele.category['id']}`) ? ele.category['category_name'] : customName;
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
    @Post('common-activity-list')
    async commonActivityList(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try{
            if(!postData?.category_id || !postData?.is_age_common){
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let resultedData = await this.activityService.activityListRecord({ category_id : postData?.category_id,is_age_common : postData?.is_age_common }, ["id", "activity_name"]);
            resultedData = <any>(
                await this.commonArrayService.formatToDto(ActivitiesDto, resultedData, req.lang)
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
    @Post('check-assign-activity')
    async checkAssignActivity(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let where = `campaignactivity.activity_id = '${postData?.id}' and campaignactivity.status != '2'`;
            let recordDetails:any = await this.campaignActivityService.assignActivityCampaignPaginate(where, postData, ["campaignactivity.id","campaign.id","campaign.campaign_name","company.company_name"]);
            let is_assign = 0;
            if(recordDetails['list'] && recordDetails['list'].length){
                is_assign = 1;
            }
            recordDetails['is_assign'] = is_assign;
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

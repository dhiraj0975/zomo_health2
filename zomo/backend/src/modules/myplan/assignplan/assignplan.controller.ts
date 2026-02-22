import { NotificationsController } from '@/modules/notifications/notifications.controller';
import {
    ActivityEntity,
    appConstant,
    CommonArrayService,
    CommonDateService,
    CommonFileService,
    CommonService, MyPlanAssignActivityEntity, MyPlanAssignBlockEntity,
    MyPlanAssignPlanDto, MyPlanAssignPlanEntity,
    MyPlanBlocksEntity, MyPlanPlansEntity,
    tableConstant
} from '@common-constants';
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
    UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Request, Response } from "express";
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import { In, Not } from "typeorm";
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import {
    CreateAssignPlanInput,
    DeleteAssignPlanInput,
    GetOneAssignPlanInput,
    ListAssignPlanInput,
    PaginateWithCompanyInput,
    UpdateAssignPlanInput
} from "../../../input";
import { ActivityService } from "../../activity/activity/activity.service";
import { CompanyService } from '../../company/companies/company.service';
import { TranslationService } from "../../translation/translation.service";
import { MyPlanActivityService } from "../activity/activity.service";
import { MyPlanAssignActivityService } from '../assignactivity/assignactivity.service';
import { MyPlanAssignBlockService } from '../assignblock/assignblock.service';
import { MyPlanBlocksService } from "../blocks/blocks.service";
import { FrontService } from "../front/front.service";
import { MyPlanPlansService } from "../plans/plans.service";
import { MyPlanAssignPlanService } from './assignplan.service';
const S3_URL =  process.env.S3_URL_PROD
@Controller('my-plan/assign-plan')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class MyPlanAssignPlanController {
    constructor(
        private readonly myPlanAssignPlanService: MyPlanAssignPlanService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonDateService: CommonDateService,
        private readonly commonFileService: CommonFileService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        private readonly companyService: CompanyService,
        private readonly myPlanAssignBlockService: MyPlanAssignBlockService,
        private readonly myPlanAssignActivityService: MyPlanAssignActivityService,
        private readonly myPlanPlansService: MyPlanPlansService,
        private readonly activityService: ActivityService,
        private readonly myPlanBlocksService: MyPlanBlocksService,
        private readonly myPlanActivityService: MyPlanActivityService,
        @Inject('COMMON_SERVICE')
        private commonMicroservice: ClientProxy,
        private readonly frontService: FrontService,
        private readonly notificationsController: NotificationsController,
    ) {}
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithCompanyInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            if (!postData?.org_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let where = `ap.org_id = '${postData?.org_id}' AND ap.status != '2' AND mp.status = '1'`;
            if ((req.tokenUser?.role_id != appConstant.ROLE.ADMIN)) {
                where += ` AND mp.created_by = '${req.tokenUser?.id}'`;
            }
            if (postData?.search_str) {
                    where += ` AND (mp.name LIKE '%${this.commonFileService.quoteEscaper(postData?.search_str)}%' OR ap.name LIKE '%${this.commonFileService.quoteEscaper(postData?.search_str)}%')`;
            }
            const resultedData = await this.myPlanAssignPlanService.paginateList(
                where,
                postData,
                [tableConstant.TBL_USERS],
            );
            let orgDetails = await this.companyService.findOneV1({id: postData?.org_id},[],['company.id','company.company_name']);
            if (!orgDetails) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }
            for (let i = 0; i < resultedData['list'].length; i++) {
                resultedData['list'][i]['org_name'] = orgDetails.company_name;
            }
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(MyPlanAssignPlanDto, resultedData['list'], req.lang)
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
    @Post('create')
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateAssignPlanInput) {
        try {
            let message: string = 'success',errorMessage = [],ids: string[] = [],activityId,blockActivityId,successStatus: number = 1;
            if (postData?.plan_step == 1) {
                if (!postData?.plan_id || !postData?.org_id)  {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
                let planIds: string[] = postData?.plan_id.split(',');
                delete postData?.plan_id;
                delete postData?.plan_step;
                if (postData?.enddate) {
                    postData.enddate = `${postData?.enddate} 23:59:59`
                }
                for (let i = 0; i < planIds.length; i++) {
                    let planWhereCon = {id: planIds[i]};
                    if (req.tokenUser?.role_id != appConstant.ROLE.ADMIN) {
                        postData.created_by = req.tokenUser?.id;
                        planWhereCon['created_by'] = req.tokenUser?.id;
                    } else {
                        postData.created_by = 1;
                    }
                    let recordDetails: MyPlanAssignPlanEntity = await this.myPlanAssignPlanService.findOne(["id"],{plan_id: planIds[i],org_id:postData?.org_id,status: '1'});
                    let getPlan: MyPlanPlansEntity = await this.myPlanPlansService.findOne(planWhereCon,null,["name","status"]);
                    if (recordDetails || getPlan?.status != 1) {
                        successStatus = 0;
                        let translation: string = '';
                        if (getPlan?.status == 2) {
                            translation = await this.translatorService.frontendReadTranslation(req.lang, "ERR_PLAN_DELETED");
                        } else if (getPlan?.status == 0) {
                            translation = await this.translatorService.frontendReadTranslation(req.lang, "ERR_PLAN_DEACTIVATED");
                        } else {
                            translation = await this.translatorService.frontendReadTranslation(req.lang, "ERR_PLAN_ALREADY_ASSIGNED");
                        }
                        errorMessage.push(`${translation.replace('%s', getPlan.name)}`)
                        continue;
                    }
                    let activityData: ActivityEntity[] = await this.activityService.activityListRecord({category_id: In([66,67]),status: Not('2'),accebility: postData?.org_id,created_by: postData?.created_by},["id","category_id","activity_name","accebility"],{id: 'DESC'});
                    let Activity = activityData.reduce((result, activity) => {
                        result[`${activity.category_id}-${activity.accebility}-${activity.activity_name}`] = activity.id;
                        return result;
                    }, {});
                    if (Activity.hasOwnProperty(`66-${postData?.org_id}-${getPlan.name}`)) {
                        activityId = Activity[`66-${postData?.org_id}-${getPlan.name}`];
                    } else {
                        let saveData = await this.activityService.save({activity_name: getPlan.name,activity_display: 0,category_id: '66',accebility: postData?.org_id,created_by: postData?.created_by,status: '1'})
                        activityId = saveData['id'];
                    }
                        let blockList: MyPlanBlocksEntity[] = await this.myPlanBlocksService.listRecord(["id","name","order_id","status","plan_id"],{plan_id: planIds[i],status: Not('2')}, { order_id: 'ASC' });
                        let blockIdArray: number[] = [];
                        for (let l: number = 0; l < blockList.length; l++) {
                            blockIdArray.push(blockList[l].id);
                        }
                        let activityList = await this.myPlanActivityService.listRecord(["ma.id","ma.block_id"],{block_id: In(blockIdArray),status: Not('2')}, { order_id: 'ASC' });
                        let assignActivitySaveData = [],assignBlockSaveData = []
                        for (let j: number = 0; j < blockList.length; j++) {
                            if (Activity.hasOwnProperty(`67-${postData?.org_id}-${blockList[j]?.name}`)) {
                                blockActivityId = Activity[`67-${postData?.org_id}-${blockList[j]?.name}`];
                            } else {
                                let saveData = await this.activityService.save({activity_name: blockList[j]?.name,activity_display: 0,category_id: '67',accebility: postData?.org_id,created_by: postData?.created_by,status: '1'})
                                blockActivityId = saveData['id'];
                            }
                            assignBlockSaveData.push({block_id: blockList[j].id,plan_id: planIds[i],org_id: postData?.org_id,status:'1',activity_id: blockActivityId,startdate: postData?.startdate,enddate: postData?.enddate})
                        }
                        if (assignBlockSaveData?.length > 0) {
                            await this.myPlanAssignBlockService.save(assignBlockSaveData);
                        }
                        for (let k: number = 0; k < activityList.length; k++) {
                            assignActivitySaveData.push({block_id: activityList[k].block_id,plan_id: planIds[i],org_id: postData?.org_id,status:'1',activity_id: activityList[k].id,startdate: postData?.startdate,enddate: postData?.enddate})
                        }
                        if (assignActivitySaveData?.length > 0) {
                            await this.myPlanAssignActivityService.save(assignActivitySaveData);
                        }
                    delete postData?.created_by;
                    let saveData = await this.myPlanAssignPlanService.save({...postData,...{plan_id: planIds[i],activity_id: activityId}});
                    ids.push(saveData['id'].toString())
                    if(postData?.startdate && postData?.enddate){
                        this.addNotification({
                            id: saveData?.['id'], 
                            org_id: saveData?.['org_id'], 
                            user_id: 0, 
                            custom_cname: getPlan.name, 
                            plan_id: planIds[i], 
                            logo: null, 
                            type: 'add',
                            url: `https://${process.env.DOMAIN}/plans/${planIds[i]}`,
                            start_date: postData?.startdate,
                            end_date: postData?.enddate
                        }, req);
                    }
                }
            } else {
                if (!postData?.data || !postData?.plan_step) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
                delete postData?.plan_step;
                let data = JSON.parse(postData?.data);
                for (let i: number = 0; i < data.length; i++) {
                    let dynamicDataAssignBlock = Object.create(null);
                    let dynamicDataAssignPlan = Object.create(null);
                    let dynamicDataAssignActivity = Object.create(null);
                    if (!data[i].plan_id || !data[i].org_id)  {
                        throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                    }
                    let assignPlanData: MyPlanAssignPlanEntity = await this.myPlanAssignPlanService.findOne(["id","plan_id","org_id","activity_id","status","based_on","display_block","startdate","enddate","completion_base","display_plan_to","display_plan_to_health_source","display_plan_to_health","c_range","completion_on","f_range","frequency_base","is_cron","join_based_on","name"],{id: data[i].id,plan_id: data[i].plan_id,status: '1'});
                    let blockList: MyPlanBlocksEntity[] = await this.myPlanBlocksService.listRecord(["id","name","order_id","status","plan_id"],{plan_id: data[i].plan_id,status: Not('2')}, { order_id: 'ASC' });
                    let blockIdArray: number[] = [];
                    for (let l: number = 0; l < blockList.length; l++) {
                        blockIdArray.push(blockList[l].id);
                    }
                    let createdBy: number = 1;
                    if (req.tokenUser?.role_id != appConstant.ROLE.ADMIN) {
                        createdBy = req.tokenUser?.id;
                    }
                    let activityData: ActivityEntity[] = await this.activityService.activityListRecord({category_id: '67',status: Not('2'),accebility: data[i].org_id,created_by: createdBy},["id","category_id","activity_name","accebility"],{id: 'DESC'});
                    let Activity = activityData.reduce((result, activity) => {
                        result[`${activity.category_id}-${activity.accebility}-${activity.activity_name}`] = activity.id;
                        return result;
                    }, {});
                    for (let j: number = 0; j < data[i].mb.length; j++) {
                        if (Activity.hasOwnProperty(`67-${data[i].org_id}-${blockList[j].name}`)) {
                            blockActivityId = Activity[`67-${data[i].org_id}-${blockList[j].name}`];
                        } else {
                            let saveData = await this.activityService.save({activity_name: blockList[j].name,activity_display: 0,category_id: '67',accebility: data[i].org_id,created_by: createdBy,status: '1'})
                            blockActivityId = saveData['id'];
                        }
                        let assignBlockFindOne: MyPlanAssignBlockEntity = await this.myPlanAssignBlockService.findOne({block_id: blockList[j].id,plan_id: data[i].plan_id,org_id: data[i].org_id,status:'1',activity_id: blockActivityId});
                        if (data[i].mb[j].startdate) {
                            data[i].mb[j].startdate = `${await this.commonDateService.DateTimeFormat(data[i].mb[j].startdate,'YYYY-MM-DD','MMMM D, YYYY')} 00:00:00`
                        }
                        if (data[i].mb[j].enddate) {
                            data[i].mb[j].enddate = `${await this.commonDateService.DateTimeFormat(data[i].mb[j].enddate,'YYYY-MM-DD','MMMM D, YYYY')} 23:59:59`
                        }
                        let assignBlockData: Record<string, any> = {name: data[i].mb[j].custom_block,based_on: assignPlanData?.based_on};
                        if (assignPlanData?.based_on === 0) {
                            assignBlockData['startdate'] = null;
                            assignBlockData['enddate'] = null;
                        } else if (assignPlanData?.based_on === 1) {
                            assignBlockData['startdate'] = data[i].mb[j].startdate;
                            assignBlockData['enddate'] = data[i].mb[j].enddate;
                        } else if (assignPlanData?.based_on === 2) {
                            assignBlockData['startdate'] = null;
                            assignBlockData['enddate'] = data[i].mb[j].enddate;
                        }
                        let assignBlockId: number = assignBlockFindOne['id']
                        if (assignBlockFindOne) {
                            await this.myPlanAssignBlockService.update({block_id: blockList[j].id,plan_id: data[i].plan_id,org_id: data[i].org_id,status:'1',activity_id: blockActivityId},{...assignBlockData});
                            this.activityLogService.create(assignBlockFindOne, assignBlockData, tableConstant.MY_PLAN.TBL_MP_ASSIGN_BLOCK, req.tokenUser?.id);
                        } else {
                            assignBlockData.block_id = blockList[j].id;
                            assignBlockData.plan_id = data[i].plan_id;
                            assignBlockData.org_id = data[i].org_id;
                            assignBlockData.status = '1';
                            assignBlockData.activity_id = blockActivityId;
                            let assignBlockSaveData = await this.myPlanAssignBlockService.save({...assignBlockData});
                            assignBlockId = assignBlockSaveData['id']
                        }
                        let blockName: string = data[i].mb[j].custom_block || data[i].mb[j].name
                        if(blockName){
                            let name: string = `block_name_${assignBlockId}_${data[i].org_id}`
                            dynamicDataAssignBlock[`${name}`] = blockName;
                        }
                        for (let k: number = 0; k < data[i].mb[j].activity.length; k++) {
                            let assignActivityFindOne: MyPlanAssignActivityEntity = await this.myPlanAssignActivityService.findOne({block_id: blockList[j].id,plan_id: data[i].plan_id,org_id: data[i].org_id,status:'1',activity_id: data[i].mb[j].activity[k]?.['activity_id']})
                            if (data[i].mb[j].activity[k].startdate) {
                                data[i].mb[j].activity[k].startdate = `${await this.commonDateService.DateTimeFormat(data[i].mb[j].activity[k].startdate,'YYYY-MM-DD','MMMM D, YYYY')} 00:00:00`
                            }
                            if (data[i].mb[j].activity[k].enddate) {
                                data[i].mb[j].activity[k].enddate = `${await this.commonDateService.DateTimeFormat(data[i].mb[j].activity[k].enddate,'YYYY-MM-DD','MMMM D, YYYY')} 23:59:59`
                            }
                            let assignActivityData: Record<string, any> = {name: data[i].mb[j].activity[k].custom_activity,enddate: data[i].mb[j].activity[k]?.enddate,is_month: data[i].mb[j].activity[k]?.is_month,is_month_days: data[i].mb[j].activity[k]?.is_month_days,based_on: assignPlanData?.based_on}
                            if (assignPlanData?.based_on === 0) {
                                assignActivityData['startdate'] = null;
                                assignActivityData['enddate'] = null;
                            } else if (assignPlanData?.based_on === 1) {
                                assignActivityData['startdate'] = data[i].mb[j].activity[k]?.startdate;
                                assignActivityData['enddate'] = data[i].mb[j].activity[k]?.enddate;
                            } else if (assignPlanData?.based_on === 2) {
                                assignActivityData['startdate'] = null;
                                assignActivityData['enddate'] = data[i].mb[j].activity[k]?.enddate;
                            }
                            if (assignActivityFindOne) {
                                await this.myPlanAssignActivityService.update({block_id: blockList[j].id,plan_id: data[i].plan_id,org_id: data[i].org_id,status:'1',activity_id: data[i].mb[j].activity[k]?.['activity_id']},{...assignActivityData})
                                this.activityLogService.create(assignActivityFindOne, assignActivityData, tableConstant.MY_PLAN.TBL_MP_ASSIGN_ACTIVITY, req.tokenUser?.id);
                            } else {
                                assignActivityData.block_id = blockList[j].id;
                                assignActivityData.plan_id = data[i].plan_id;
                                assignActivityData.org_id = data[i].org_id;
                                assignActivityData.status = '1';
                                assignActivityData.activity_id = data[i].mb[j].activity[k]?.['activity_id'];
                                await this.myPlanAssignActivityService.save({...assignActivityData})
                            }
                            let activityName: string = data[i].mb[j].activity[k].custom_activity || data[i].mb[j].activity[k].name
                            if (activityName) {
                                let name: string = `activity_name_${blockList[j].id}_${data[i].mb[j].activity[k]?.['activity_id']}_${data[i].org_id}`
                                dynamicDataAssignActivity[`${name}`]= activityName;
                            }
                        }
                    }
                    if (data[i].startdate) {
                        data[i].startdate = `${await this.commonDateService.DateTimeFormat(data[i].startdate,'YYYY-MM-DD','MMMM D, YYYY')} 00:00:00`;
                    }
                    if (data[i].enddate) {
                        data[i].enddate = `${await this.commonDateService.DateTimeFormat(data[i].enddate,'YYYY-MM-DD','MMMM D, YYYY')} 23:59:59`;
                    }
                    await this.myPlanAssignPlanService.update({id: data[i].id,plan_id:data[i].plan_id},{name: data[i].name,startdate: data[i].startdate,enddate: data[i].enddate});
                    if(data[i].startdate && data[i].enddate){
                        this.addNotification({
                            id: data[i].id, 
                            org_id: data[i].org_id, 
                            user_id: 0, 
                            custom_cname: data[i].name, 
                            plan_id: data[i].plan_id, 
                            logo: null, 
                            type: 'update',
                            url: `https://${process.env.DOMAIN}/plans/${data[i].plan_id}`,
                            start_date: data[i].startdate,
                            end_date: data[i].enddate
                        }, req);
                    }
                    if(data[i]?.name){
                        let name:string = `plan_name_${data[i].id}_${data[i].org_id}`
                        dynamicDataAssignPlan[`${name}`]= data[i].name;
                    }
                    await this.translatorService.DynamicEngJsonData('MyPlan',data[i].org_id,dynamicDataAssignBlock,'Add','MyPlan',data[i].id);
                    this.activityLogService.create(assignPlanData, postData, tableConstant.MY_PLAN.TBL_MP_ASSIGN_PLAN, req.tokenUser?.id);
                    await this.translatorService.DynamicEngJsonData('MyPlan',data[i].org_id,dynamicDataAssignPlan,'Edit','MyPlan',data[i].id);
                    await this.translatorService.DynamicEngJsonData('MyPlan',data[i].org_id,dynamicDataAssignActivity,'Add','MyPlan',data[i].id);
                }
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: successStatus,
                error: 0,
                data: {id: ids.join(","),error_message: errorMessage},
                message: message
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
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: UpdateAssignPlanInput) {
        try {
            let message: string = 'success';
            if (postData?.plan_step == 1) {
                if (!postData?.id || !postData?.plan_id || !postData?.org_id)  {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
                delete postData?.plan_step;
                let dynamicDataAssignPlan = Object.create(null);
                let recordDetails: MyPlanAssignPlanEntity = await this.myPlanAssignPlanService.findOne(["id","plan_id","org_id","activity_id","status","based_on","display_block","startdate","enddate","completion_base","display_plan_to","display_plan_to_health_source","display_plan_to_health","c_range","completion_on","f_range","frequency_base","is_cron","join_based_on","name"],{id: postData?.id,plan_id: postData?.plan_id,status: '1'});
                if (postData?.enddate) {
                    postData.enddate = `${postData?.enddate} 23:59:59`
                }
                await this.myPlanAssignPlanService.update({id: postData?.id,plan_id:postData?.plan_id},{...postData});
                this.activityLogService.create(recordDetails, postData, tableConstant.MY_PLAN.TBL_MP_ASSIGN_PLAN, req.tokenUser?.id);
                if(postData?.startdate || postData?.enddate){
                    let notificationData = {
                        custom_cname: recordDetails?.name, 
                        plan_id: recordDetails['plan_id'], 
                        org_id: recordDetails?.org_id, 
                        id: recordDetails?.id,
                        type: 'update',
                        url: `https://${process.env.DOMAIN}/plans/${recordDetails?.plan_id}`,
                    };
                    if(postData?.startdate){
                        notificationData['start_date'] = postData?.startdate;
                    }
                    if(postData?.enddate){
                        notificationData['end_date'] = postData?.enddate;                    
                    }
                    this.addNotification(notificationData, req);
                }
                if(postData?.name){
                    let name: string = `plan_name_${postData?.id}_${postData?.org_id}`
                    dynamicDataAssignPlan[`${name}`]= postData?.name;
                }
                await this.translatorService.DynamicEngJsonData('MyPlan',postData?.org_id,dynamicDataAssignPlan,'Edit','MyPlan',postData?.id);
            } else {
                if (!postData?.data || !postData?.plan_step) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
                delete postData?.plan_step;
                let data = JSON.parse(postData?.data);
                for (let i: number = 0; i < data.length; i++) {
                    let dynamicDataAssignBlock = Object.create(null),dynamicDataAssignPlan = Object.create(null),dynamicDataAssignActivity = Object.create(null);
                    if (!data[i].id ||!data[i].plan_id || !data[i].org_id)  {
                        throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                    }
                    let assignPlanData: MyPlanAssignPlanEntity = await this.myPlanAssignPlanService.findOne(["id","plan_id","org_id","activity_id","status","based_on","display_block","startdate","enddate","completion_base","display_plan_to","display_plan_to_health_source","display_plan_to_health","c_range","completion_on","f_range","frequency_base","is_cron","join_based_on","name"],{id: data[i].id,plan_id: data[i].plan_id,status: '1'});
                    let blockList: MyPlanBlocksEntity[] = await this.myPlanBlocksService.listRecord(["id","order_id","status","plan_id"],{plan_id: data[i].plan_id,status: Not('2')}, { order_id: 'ASC' });
                    let createdBy: number = 1;
                    if (req.tokenUser?.role_id != appConstant.ROLE.ADMIN) {
                        createdBy = req.tokenUser?.id;
                    }
                    let activityData: ActivityEntity[] = await this.activityService.activityListRecord({category_id: '67',status: Not('2'),accebility: data[i].org_id,created_by: createdBy},["id","category_id","activity_name","accebility"],{id: 'DESC'});
                    let Activity = activityData.reduce((result, activity) => {
                        result[`${activity.category_id}-${activity.accebility}-${activity.activity_name}`] = activity.id;
                        return result;
                    }, {});
                    for (let j: number = 0; j < data[i].mb.length; j++) {
                        let assignBlockFindOne: MyPlanAssignBlockEntity = await this.myPlanAssignBlockService.findOne({block_id: blockList[j].id,plan_id: data[i].plan_id,org_id: data[i].org_id,status: "1"});
                        let assignBlockData: boolean = await this.frontService.assignBlockExists({block_id: blockList[j].id,plan_id: data[i].plan_id,org_id: data[i].org_id,status: "1"});
                        let blockData: Record<string, any> = {name: data[i].mb[j].custom_block}
                        if (data[i].mb[j].startdate) {
                            blockData['startdate'] = `${await this.commonDateService.DateTimeFormat(data[i].mb[j].startdate,'YYYY-MM-DD','MMMM D, YYYY')} 00:00:00`;
                        }
                        if (data[i].mb[j].enddate) {
                            blockData['enddate'] = `${await this.commonDateService.DateTimeFormat(data[i].mb[j].enddate,'YYYY-MM-DD','MMMM D, YYYY')} 23:59:59`;
                        }
                        if (assignPlanData?.based_on === 0) {
                            blockData['startdate'] = null;
                            blockData['enddate'] = null;
                        } else if (assignPlanData?.based_on === 1) {
                            blockData['startdate'] = blockData['startdate'];
                            blockData['enddate'] = blockData['enddate'];
                        } else if (assignPlanData?.based_on === 2) {
                            blockData['startdate'] = null;
                            blockData['enddate'] = blockData['enddate'];
                        }
                        let assignBlockId: number = assignBlockFindOne['id']
                        if (assignBlockFindOne) {
                            await this.myPlanAssignBlockService.update({block_id: blockList[j].id,plan_id: data[i].plan_id,org_id: data[i].org_id,status: '1'},{...blockData});
                            this.activityLogService.create(assignBlockFindOne, blockData, tableConstant.MY_PLAN.TBL_MP_ASSIGN_BLOCK, req.tokenUser?.id);
                        } else {
                            let activityId;
                            if (Activity.hasOwnProperty(`67-${data[i].org_id}-${blockList[j].name}`)) {
                                activityId = Activity[`67-${data[i].org_id}-${blockList[j].name}`];
                            } else {
                                let saveData = await this.activityService.save({activity_name: blockList[j].name,activity_display: 0,category_id: '67',accebility: data[i].org_id,created_by: createdBy,status: '1'})
                                activityId = saveData['id'];
                            }
                            let assignBlockSaveData = await this.myPlanAssignBlockService.save({...{block_id: blockList[j].id,plan_id: data[i].plan_id,org_id: data[i].org_id,status:'1',activity_id: activityId},...blockData});
                            assignBlockId = assignBlockSaveData['id']
                        }
                        let blockName: string = data[i].mb[j].custom_block || data[i].mb[j].name
                        if(blockName){
                            let name: string = `block_name_${assignBlockId}_${data[i].org_id}`
                            dynamicDataAssignBlock[`${name}`]= blockName;
                        }
                        for (let k: number = 0; k < data[i].mb[j].activity.length; k++) {
                            let activityData = {name: data[i].mb[j].activity[k].custom_activity,is_month: data[i].mb[j].activity[k].is_month,is_month_days: data[i].mb[j].activity[k].is_month_days}
                            if (data[i].mb[j].activity[k].startdate) {
                                activityData['startdate'] = `${await this.commonDateService.DateTimeFormat(data[i].mb[j].activity[k].startdate,'YYYY-MM-DD','MMMM D, YYYY')} 00:00:00`;
                            }
                            if (data[i].mb[j].activity[k].enddate) {
                                activityData['enddate'] = `${await this.commonDateService.DateTimeFormat(data[i].mb[j].activity[k].enddate,'YYYY-MM-DD','MMMM D, YYYY')} 23:59:59`;
                            }
                            if (assignPlanData?.based_on === 0) {
                                activityData['startdate'] = null;
                                activityData['enddate'] = null;
                            } else if (assignPlanData?.based_on === 1) {
                                activityData['startdate'] = activityData['startdate'];
                                activityData['enddate'] = activityData['enddate'];
                            } else if (assignPlanData?.based_on === 2) {
                                activityData['startdate'] = null;
                                activityData['enddate'] = activityData['enddate'];
                            }
                            if (data[i].mb[j].activity[k].assign_activity_id) {
                                let assignActivityData: MyPlanAssignActivityEntity = await this.myPlanAssignActivityService.findOne({id: data[i].mb[j].activity[k].assign_activity_id});
                                await this.myPlanAssignActivityService.update({id: data[i].mb[j].activity[k].assign_activity_id},{...activityData});
                                activityData['id'] = data[i].mb[j].activity[k].assign_activity_id;
                                this.activityLogService.create(assignActivityData, postData, tableConstant.MY_PLAN.TBL_MP_ASSIGN_ACTIVITY, req.tokenUser?.id);
                            } else {
                                let activityList = await this.myPlanActivityService.findOne({block_id: blockList[j].id,status: Not('2')}, { order_id: 'ASC' });
                                let saveData = await this.myPlanAssignActivityService.save({...{block_id: blockList[j].id,plan_id: data[i].plan_id,org_id: data[i].org_id,status:'1',activity_id: activityList.id},...activityData});
                                activityData['id'] = saveData['id'];
                            }
                            let activityName = data[i].mb[j].activity[k].custom_activity || data[i].mb[j].activity[k].name
                            if (activityName) {
                                let name: string = `activity_name_${blockList[j].id}_${activityData['id']}_${data[i].org_id}`
                                dynamicDataAssignActivity[`${name}`]= activityName;
                            }
                        }
                    }
                    let recordDetails: MyPlanAssignPlanEntity = await this.myPlanAssignPlanService.findOne(["id","plan_id","org_id","activity_id","status","based_on","display_block","startdate","enddate","completion_base","display_plan_to","display_plan_to_health_source","display_plan_to_health","c_range","completion_on","f_range","frequency_base","is_cron","join_based_on","name"],{id: data[i].id,plan_id: data[i].plan_id,status: '1'});
                    await this.myPlanAssignPlanService.update({id: data[i].id,plan_id:data[i].plan_id},{name: data[i].name});
                    if(postData?.startdate || postData?.enddate){
                        let notificationData = {
                            custom_cname: recordDetails?.name, 
                            plan_id: recordDetails['plan_id'], 
                            org_id: recordDetails?.org_id, 
                            id: recordDetails?.id,
                            type: 'update',
                            url: `https://${process.env.DOMAIN}/plans/${recordDetails?.plan_id}`,
                        };
                        if(postData?.startdate){
                            notificationData['start_date'] = postData?.startdate;
                        }
                        if(postData?.enddate){
                            notificationData['end_date'] = postData?.enddate;                    
                        }
                        this.addNotification(notificationData, req);
                    }
                    await this.translatorService.DynamicEngJsonData('MyPlan',data[i].org_id,dynamicDataAssignBlock,'Add','MyPlan',data[i].id);
                    let planName: string = data[i]?.name || data[i]?.mp?.name
                    if(planName){
                        let name: string = `plan_name_${data[i]?.id}_${data[i]?.org_id}`
                        dynamicDataAssignPlan[`${name}`]= planName;
                    }
                    await this.translatorService.DynamicEngJsonData('MyPlan',data[i].org_id,dynamicDataAssignPlan,'Edit','MyPlan',data[i].id);
                    await this.translatorService.DynamicEngJsonData('MyPlan',data[i].org_id,dynamicDataAssignActivity,'Add','MyPlan',data[i].id);
                    this.activityLogService.create(recordDetails, postData, tableConstant.MY_PLAN.TBL_MP_ASSIGN_PLAN, req.tokenUser?.id);
                }
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: message
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
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: DeleteAssignPlanInput) {
        try {
            if (!postData?.plan_id || !postData?.org_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails: MyPlanAssignPlanEntity = await this.myPlanAssignPlanService.findOne(["id","plan_id","org_id","activity_id","status","based_on","display_block","startdate","enddate","completion_base","display_plan_to","display_plan_to_health_source","display_plan_to_health","c_range","completion_on","f_range","frequency_base","is_cron","join_based_on","name","created","updated"],{plan_id: postData?.plan_id, org_id: postData?.org_id});
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            let assignBlockData: MyPlanAssignBlockEntity[] = await this.myPlanAssignBlockService.listRecord({plan_id: postData?.plan_id,org_id: postData?.org_id,status: Not('2')});
            if (assignBlockData.length > 0) {
                await this.myPlanAssignBlockService.update({plan_id: postData?.plan_id,org_id: postData?.org_id, status: Not('2')},{status:2});
                this.activityLogService.create(assignBlockData, {status:2}, tableConstant.MY_PLAN.TBL_MP_ASSIGN_BLOCK, req.tokenUser?.id, 'delete');
            }
            let assignActivityData: MyPlanAssignActivityEntity[] = await this.frontService.assignActivityListRecord({plan_id: postData?.plan_id,org_id: postData?.org_id,status: Not('2')});
            if (assignActivityData.length > 0) {
                await this.myPlanAssignActivityService.update({plan_id: postData?.plan_id,org_id: postData?.org_id,status: Not('2')},{status:2});
                this.activityLogService.create(assignActivityData, {status:2}, tableConstant.MY_PLAN.TBL_MP_ASSIGN_ACTIVITY, req.tokenUser?.id, 'delete');
            }
            await this.myPlanAssignPlanService.update({plan_id: postData?.plan_id,org_id: postData?.org_id,status: Not('2')},{status:2});
            this.activityLogService.create(recordDetails, {status:2}, tableConstant.MY_PLAN.TBL_MP_ASSIGN_PLAN, req.tokenUser?.id, 'delete');
            this.notificationsController.removeNotification({org_id: recordDetails?.org_id, plan_id: postData?.plan_id},req);
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
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: GetOneAssignPlanInput) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let where = {id: postData?.id};
            if(postData?.org_id){
                where['org_id'] = postData?.org_id;
            }
            let resultedData = await this.myPlanAssignPlanService.findOne(["id","plan_id","org_id","activity_id","status","based_on","display_block","startdate","enddate","completion_base","display_plan_to","display_plan_to_health_source","display_plan_to_health","c_range","completion_on","f_range","frequency_base","is_cron","join_based_on","name"],where);
            resultedData = <any>(
                await this.commonArrayService.formatToDto(MyPlanAssignPlanDto, resultedData, req.lang)
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
    @Post('list')
    async list(@Req() req: Request, @Res() res: Response, @Body() postData: ListAssignPlanInput) {
        try {
            if (!postData?.id || !postData?.org_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let ids = postData?.id.split(',');
            let where: any = { id: In(ids), org_id:postData?.org_id,status: '1'};
            const order = postData && postData?.order ? postData?.order : 'ASC';
            const orderBy = postData && postData?.order_by ? postData?.order_by : 'id';
            let resultedData = await this.myPlanAssignPlanService.listRecord(["ap.id","ap.name","ap.plan_id","ap.org_id","ap.activity_id","ap.status","ap.based_on","ap.display_block","ap.startdate","ap.enddate","ap.completion_base","ap.display_plan_to","ap.display_plan_to_health_source","ap.display_plan_to_health","ap.c_range","ap.completion_on","ap.f_range","ap.frequency_base","ap.is_cron","ap.join_based_on","ap.created","ap.updated","mp.id","mp.name","mb.id","mb.name","mb.order_id","mab.id","mab.name","mab.startdate","mab.enddate","maa.id","maa.activity_id","maa.name","maa.is_month","maa.is_month_days","maa.startdate","maa.enddate","ma.id","ma.activity_id","ma.org_activity_id","ma.module_id","ma.is_category","ac.id","ac.activity_name","ee.event_name","eec.category_name","har.title","csc.custom_cname","ql.title","qz.quiz_name","ep.title"],where, { [orderBy]: order },[tableConstant.MY_PLAN.TBL_MP_PLANS,tableConstant.MY_PLAN.TBL_MP_BLOCKS,tableConstant.MY_PLAN.TBL_MP_ASSIGN_BLOCK,tableConstant.MY_PLAN.TBL_MP_ASSIGN_ACTIVITY,tableConstant.MY_PLAN.TBL_MP_ACTIVITY,tableConstant.ACTIVITIES.TBL_ACTIVITIES],postData);
            resultedData = <any>(
                await this.commonArrayService.formatToDto(MyPlanAssignPlanDto, resultedData, req.lang)
            );
            const dateFormat = async (date, formate) => {
                const formattedDate = await this.commonDateService.DateTimeFormat(date, formate);
                const monthName = await this.commonDateService.DateTimeFormat(formattedDate, 'MMMM');
                const translatedMonth = await this.translatorService.frontendReadTranslation(req.lang, monthName.toString(), `/LC_MESSAGES/Common/Month`, `static`);
                return `${translatedMonth.toString().substring(0, 3)} ${await this.commonDateService.DateTimeFormat(formattedDate, 'D, YYYY')}`;
            }
            for (let k = 0; k < resultedData.length; k++) {
                for (let i = 0; i < resultedData[k]['mb'].length; i++) {
                    resultedData[k]['mb'][i]['startdate'] = resultedData[k]['mb'][i]['startdate'] ? await dateFormat(resultedData[k]['mb'][i]['startdate'], 'YYYY-MM-DD HH:mm:ss') : null;
                    resultedData[k]['mb'][i]['enddate'] = resultedData[k]['mb'][i]['enddate'] ? await dateFormat(resultedData[k]['mb'][i]['enddate'], 'YYYY-MM-DD HH:mm:ss') : null;
                    for (let j = 0; j < resultedData[k]['mb'][i]['activity'].length; j++) {
                        resultedData[k]['mb'][i]['activity'][j]['startdate'] = resultedData[k]['mb'][i]['activity'][j]['startdate'] ? await dateFormat(resultedData[k]['mb'][i]['activity'][j]['startdate'], 'YYYY-MM-DD HH:mm:ss') : null;
                        resultedData[k]['mb'][i]['activity'][j]['enddate'] = resultedData[k]['mb'][i]['activity'][j]['enddate'] ? await dateFormat(resultedData[k]['mb'][i]['activity'][j]['enddate'], 'YYYY-MM-DD HH:mm:ss') : null;
                    }
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
                  data: [],
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }
    @Post('plan-list')
    async planList(@Req() req: Request, @Res() res: Response, @Body() postData: ListAssignPlanInput) {
        try {
            if (!postData?.org_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let where: any = `ap.org_id = '${postData?.org_id}' AND ap.status != '2' AND (ap.name IS NOT NULL OR ap.name != '' OR mp.name IS NOT NULL OR mp.name != '')`;
            const order = postData && postData?.order ? postData?.order : 'ASC';
            const orderBy = postData && postData?.order_by ? postData?.order_by : 'ap.id';
            let resultedData: any = await this.frontService.assignPlanData(['ap.id','ap.name','mp.name'], where, { [orderBy]: order }, [{'join_table': 'ap.mp','alias':'mp', 'table' : tableConstant.MY_PLAN.TBL_MP_PLANS, 'on_condition' : `ap.plan_id = mp.id`, 'join_type': 'left_one' }], 'getMany');
            const resultData = [];
            for (let i = 0; i < resultedData.length; i++) {
                const item = resultedData[i];
                resultData.push({
                    id: item.id,
                    name: item.name || (item.mp && item.mp.name) || ''
                });
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: resultData,
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
    async addNotification(planData: any, req: Request) {
        try {
            let organizationDetails = await this.companyService.findOne({ code: planData?.org_id }, ['company.id']);
            planData.org_id = organizationDetails ? organizationDetails?.id : planData?.org_id;
            let planDetails = await this.myPlanPlansService.findOne({ id: planData?.plan_id }, null, ['id','name','icon']);
            if(planDetails){
                planData.logo = S3_URL + planDetails?.icon;
                planData.custom_cname =  !planData?.custom_cname || planData?.custom_cname == ''  ? planDetails?.name : planData?.custom_cname;
            }
            if(planData?.type == 'add' || planData?.type == 'update'){
                if(planData?.type == 'update'){
                    let whereCondition = { org_id: planData?.org_id };
                    if(planData?.plan_id || planData?.plan_id == 0){ 
                        whereCondition['plan_id'] = planData?.plan_id;
                    }
                    await this.notificationsController.removeNotification(whereCondition,req);
                }
                let message = `${planData?.custom_cname} My Plan`;
                let notificationData = {
                    org_id: planData.org_id,
                    user_id: 0,
                    title: planData?.title ?? "Upcoming My Plan",
                    message: `${planData?.custom_cname} My Plan`,
                    type: 1,
                    module_name: 'My Plans',
                    submodule_name: 'Assign Plans',
                    metadata: {
                        plan_id: planData?.plan_id,
                        id: planData?.id,
                        logo: planData?.logo,
                        url: planData?.url,
                        notification_date: null,
                        notification_sent: 0,
                        notification_sent_count: 0,
                    },
                };
                if(planData?.start_date || planData?.end_date){ 
                    let startDate = this.commonDateService.getTodayDate(planData?.start_date).format('YYYY-MM-DD');
                    notificationData['metadata']['notification_date'] = startDate;
                    notificationData['metadata']['start_date'] = startDate;
                    notificationData['metadata']['notification_sent'] = 0;
                    notificationData['message'] = message + ' Start Today';
                    await this.notificationsController.sendNotification(0, notificationData, req);
                    
                    if(planData?.end_date){
                        notificationData['title'] = 'My Plan Expiration';
                        let endDate = this.commonDateService.getTodayDate(planData?.end_date).format('YYYY-MM-DD');
                        notificationData['metadata']['notification_date'] = endDate;
                        notificationData['metadata']['notification_sent'] = endDate;
                        notificationData['metadata']['notification_sent'] = 1;
                        notificationData['metadata']['end_date'] = endDate;
                        notificationData['message'] = message + ' End Today';
                        await this.notificationsController.sendNotification(0, notificationData, req);
                    }
                }   
            }
            return;
        }
        catch (error) {
            await this.activityLogService.error_log(req.tokenUser?.id,req?.originalUrl, error?.message, error, req);
            return;
        }
    }
}
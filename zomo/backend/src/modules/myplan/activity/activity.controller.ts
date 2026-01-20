import {
    appConstant,
    CommonArrayService,
    CommonFileService,
    CommonService,
    InterlinksEntity,
    MyPlanActivityDto,
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
    Res, UploadedFile,
    UseGuards, UseInterceptors,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { FileInterceptor } from "@nestjs/platform-express";
import { Request, Response } from "express";
import { diskStorage } from "multer";
import { lastValueFrom } from 'rxjs';
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import { In, Not } from "typeorm";
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import {
    CreateMyPlanActivityInput,
    DeleteMyPlanInput,
    GetOneMyPlanInput,
    ListMyPlanInput, PaginateWithCompanyInput, UpdateMyPlanActivityInput,
} from "../../../input";
import { fileName, filesFilter } from "../../../utils/image-upload.utils";
import { ActivityService } from "../../activity/activity/activity.service";
import { ScheduleChallengeService } from "../../challenge/schedulechallenge/schedulechallenge.service";
import { InterlinksService } from "../../company/interlinks/interlinks.service";
import { WellBeingCategoryService } from "../../emotionalwellbeing/wellbeingcategory/wellbeingcategory.service";
import { WellBeingPostService } from "../../emotionalwellbeing/wellbeingpost/wellbeingpost.service";
import { EventService } from "../../events/events/events.service";
import { AssessmentResultsService } from "../../healthassessment/assessmentresults/assessmentresults.service";
import { FitnessVideosService } from "../../mediafitness/videos/fitnessvideos.service";
import { QuickLinkService } from "../../quicklink/quicklink/quicklink.service";
import { QuizQuizzesService } from "../../quiz/quizzes/quizzes.service";
import { TranslationService } from "../../translation/translation.service";
import { MyPlanAssignActivityService } from "../assignactivity/assignactivity.service";
import { MyPlanAssignBlockService } from "../assignblock/assignblock.service";
import { FrontService } from "../front/front.service";
import { MyPlanActivityService } from './activity.service';
const path = require('path');
@Controller('my-plan/activity')
@UseGuards(TokenGuard, RoleGuard)
export class MyPlanActivityController {
    constructor(
        private readonly myPlanActivityService: MyPlanActivityService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        private readonly activityService: ActivityService,
        private readonly eventService: EventService,
        private readonly assessmentResultsService: AssessmentResultsService,
        private readonly scheduleChallengeService: ScheduleChallengeService,
        private readonly quickLinkService: QuickLinkService,
        private readonly quizQuizzesService: QuizQuizzesService,
        private readonly wellbeingPostService: WellBeingPostService,
        @Inject('COMMON_SERVICE')
        private commonMicroservice: ClientProxy,
        private readonly myPlanAssignBlockService: MyPlanAssignBlockService,
        private readonly myPlanAssignActivityService: MyPlanAssignActivityService,
        private readonly interlinksService: InterlinksService,
        private readonly fitnessVideosService: FitnessVideosService,
        private readonly wellbeingCategoryService: WellBeingCategoryService,
        private readonly frontService: FrontService,
    ) {}
    @UseGuards(AccessGuard)
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithCompanyInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            if (!postData?.block_id || !postData?.plan_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let where: any = `ma.block_id = '${postData?.block_id}' AND ma.status != '2'`;
            if (postData?.search_str) {
                let condition = ``;
                if ('All Emotional Well-Being'.toLowerCase().includes(postData?.search_str.toLowerCase())) {
                    condition += ` OR ma.org_activity_id = '0'`;
                }
                for (let i = 1; i < Object.keys(appConstant.BIO_DATA).length; i++) {
                    if (![18, 23, 24, 27, 28, 29].includes(i) && appConstant.BIO_DATA[i].toLowerCase().includes(postData?.search_str.toLowerCase())) {
                        condition += ` OR ma.org_activity_id = '${i}'`;
                    }
                }
                for (let i = 1; i < Object.keys(appConstant.HRA_DATA).length; i++) {
                    if (appConstant.HRA_DATA[i].toLowerCase().indexOf(postData?.search_str.toLowerCase()) !== -1) {
                        condition += ` OR ma.org_activity_id = '${i}'`;
                    }
                }
                where += ` AND (ma.order_id = '${postData?.search_str}' OR ma.days = '${postData?.search_str}' OR ep.title LIKE '%${this.commonFileService.quoteEscaper(postData?.search_str)}%' OR qz.quiz_name LIKE '%${this.commonFileService.quoteEscaper(postData?.search_str)}%' OR ql.title LIKE '%${this.commonFileService.quoteEscaper(postData?.search_str)}%' OR csc.custom_cname LIKE '%${this.commonFileService.quoteEscaper(postData?.search_str)}%' OR har.title LIKE '%${this.commonFileService.quoteEscaper(postData?.search_str)}%' OR eec.category_name LIKE '%${this.commonFileService.quoteEscaper(postData?.search_str)}%' OR ee.event_name LIKE '%${this.commonFileService.quoteEscaper(postData?.search_str)}%' OR ac.activity_name LIKE '%${this.commonFileService.quoteEscaper(postData?.search_str)}%' ${condition})`;
            }
            let resultedData = await this.myPlanActivityService.paginateList(
                ["ma.id","ma.days","ma.status","ma.icon","ma.order_id","ma.activity_id","ma.module_id","ma.is_category","ma.org_activity_id","ma.block_id","ac.id","ac.activity_name","acAge.id","acAge.activity_name","ep.id","ep.title","qz.id","qz.quiz_name","ql.id","ql.title","har.id","har.title","csc.id",'csc.org_id',"csc.custom_cname","eec.id","eec.category_name","ee.id","ee.event_name"],
                where,
                postData,
            );
            await Promise.all(resultedData['list'].map(async (ele) => {
                if(ele['csc'] && ele['csc'].custom_cname){
                    let customName = await this.translatorService.frontendReadTranslation(req.lang,`custom_cname_${ele['csc']['id']}`, `/LC_MESSAGES/Challenge/MyChallenges/${ele['csc'].org_id}/${ele['csc']['id']}`,`dynamic`);
                    ele['csc'].custom_cname = (customName == '' || customName == `custom_cname_${ele['csc']['id']}`) ? ele['csc']['custom_cname'] : customName;
                }
                if(ele['csc'] && ele['csc'].custom_desc){
                    let customName = await this.translatorService.frontendReadTranslation(req.lang,`custom_desc_${ele['csc']['id']}`, `/LC_MESSAGES/Challenge/MyChallenges/${ele['csc'].org_id}/${ele['csc']['id']}`,`dynamic`);
                    ele['csc'].custom_desc = (customName == '' || customName == `custom_desc_${ele['csc']['id']}`) ? ele['csc']['custom_desc'] : customName;
                }
            }));
            resultedData['list'] = resultedData['list'].reduce((acc, {icon, days,status, order_id, ac, acAge, ep, qz, ql, har, csc, eec, ee, id, module_id, is_category, org_activity_id, block_id}, index) => {
                let orgSpecific = (!org_activity_id ? 'Global' : appConstant.MODULE_DATA[module_id]);
                let data = {id: id,name: '',order_id: order_id,days: days,status: status,org_specific: orgSpecific,icon: icon,block_id: block_id};
                if (ac) {
                    data.name = ac?.activity_name || '';
                }
                switch (module_id) {
                    case 1:
                        if (is_category === 0) {
                            data.name = ee?.event_name || '';
                        }
                        if (is_category === 1) {
                            data.name = eec?.category_name || '';
                        }
                        break;
                    case 2:
                        data.name = har?.title || '';
                        break;
                    case 3:
                        data.name = acAge?.activity_name || '';
                        break;
                    case 4:
                        data.name = csc?.custom_cname || '';
                        break;
                    case 5:
                        data.name = ql?.title || '';
                        break;
                    case 6:
                        data.name = qz?.quiz_name || '';
                        break;
                    case 7:
                        let hraName = appConstant.HRA_DATA[org_activity_id];
                        data.name = hraName;
                        break;
                    case 8:
                        let bioName = appConstant.BIO_DATA[org_activity_id];
                        data.name = bioName;
                        break;
                    case 9:
                        data.name = ep?.title || '';
                        if (org_activity_id == 0) {
                            data.name = 'All Emotional Well-Being';
                        }
                        break;
                }
                acc.push(data);
                return acc;
            }, []);
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(MyPlanActivityDto, resultedData['list'], req.lang)
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
    @UseInterceptors(
        FileInterceptor("icon", {
            limits: { fileSize: appConstant.FILE_SIZE_2MB },
            storage: diskStorage({
                destination: `${appConstant.ACTIVITY_ICON_IMAGE_PATH}`,
                filename: fileName
            }),
            fileFilter: filesFilter
        }),
        AccessGuard
    )
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateMyPlanActivityInput, @UploadedFile() file: Express.Multer.File) {
        try {
            if (!this.commonService.isValidNumber(postData?.activity_id) || !postData?.block_id || !file || !postData?.plan_id || !this.commonService.isValidNumber(postData?.days) || (postData?.healthplan === 1 && !postData?.healthplan_name) || (postData?.activity_id == 0 && !postData?.custom_name)) {
                if (file?.filename && file?.fieldname === 'icon') {
                    await this.commonFileService.removeFileFromLocal(file.path);
                }
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            if (postData?.module_id && postData?.org_activity_id) {
                if (postData?.org_activity_id.toLowerCase().indexOf('EVC') !== -1) {
                    postData.is_category = 1;
                }
            }
            if (postData?.activity_id == 0) {
                let activityData = await this.activityService.activityFindOne({activity_name: postData?.custom_name,category_id: '68'},['id']);
                if (!activityData) {
                    let data: any = {
                        activity_name: postData?.custom_name,
                        accebility: 0,
                        activity_display: 0,
                        category_id: '68',
                        created_by: req.tokenUser?.id,
                        status: '1'
                    };
                    let saveActivityData = await this.activityService.save({...data});
                    postData.activity_id = saveActivityData['id'];
                } else {
                    postData.activity_id = activityData.id
                }
                delete postData?.custom_name
            }
            let planActivityData = await this.myPlanActivityService.findOne({ block_id: postData?.block_id, status: Not(2) },{order_id:'DESC'});
            postData['order_id'] = planActivityData && planActivityData['order_id'] ? planActivityData['order_id'] + 1 : 1;
            let saveData = await this.myPlanActivityService.save({...postData});
            let AssignBlockData = await this.myPlanAssignBlockService.listRecord({block_id: postData?.block_id, status: '1'},['org_id','startdate','enddate']);
            for (let i = 0; i < AssignBlockData.length; i++) {
                let data = {
                    activity_id: saveData['id'],
                    block_id: postData?.block_id,
                    plan_id: postData?.plan_id,
                    org_id: AssignBlockData[i].org_id,
                    startdate: AssignBlockData[i].startdate,
                    enddate: AssignBlockData[i].enddate
                }
                await this.myPlanAssignActivityService.save({...data});
            }
            if (file && file.fieldname === 'icon' && file.filename && saveData['id']) {
                file.originalname = this.commonFileService.formatFileName(file.originalname);
                file.filename = `myplans/${postData?.plan_id.toString()}/activity/${this.commonService.generateMD5(saveData['id'].toString().toString())}myactivityl.${file.originalname.split('.')[file.originalname.split('.').length - 1]}`;
                await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(file.path),  filename: file.filename}));
                await this.myPlanActivityService.update({ id: saveData['id'], status: Not(2) },{icon: file.filename});
            }
            let activityName;
            let activityId = postData?.activity_id;
            if ([-1,0].includes(activityId)) {
                let orgActivityId: string = postData?.org_activity_id;
                let orgActivityIds = orgActivityId.replace(/EVC/g, '').split(",");
                let moduleId = postData?.module_id;
                switch (moduleId) {
                    case 1:
                        let eventData = await this.eventService.findOne({id: In(orgActivityIds)});
                        activityName = eventData?.event_name
                        break;
                    case 2:
                        let assessmentData = await this.assessmentResultsService.findOne({id: In(orgActivityIds)});
                        activityName = assessmentData?.title
                        break;
                    case 3:
                        let activityData = await this.activityService.activityFindOne({id: In(orgActivityIds)},['activity_name']);
                        activityName = activityData?.activity_name
                        break;
                    case 4:
                        let scheduleData  = await this.scheduleChallengeService.findOne({id: In(orgActivityIds)});
                        activityName = scheduleData?.custom_cname
                        break;
                    case 5:
                        let quickLinkData = await this.quickLinkService.findOne({id: In(orgActivityIds)});
                        activityName = quickLinkData?.title
                        break;
                    case 6:
                        let quizzesData = await this.quizQuizzesService.findOne({id: In(orgActivityIds)});
                        activityName = quizzesData?.quiz_name
                        break;
                    case 7:
                        let hraName = appConstant.HRA_DATA[orgActivityId];
                        activityName = hraName
                        break;
                    case 8:
                        let bioName = appConstant.BIO_DATA[orgActivityId];
                        activityName = bioName
                        break;
                    case 9:
                        let emPostData = await this.wellbeingPostService.findOne({id: In(orgActivityIds)},['status','title']);
                        activityName = emPostData?.title;
                        break;
                }
            }
            let interLinksData: InterlinksEntity | null = null
            if (postData?.link_type && postData?.link_id){
                interLinksData = await this.interlinksService.getOne({id: postData?.link_id,status: 1},['id','linktitle']);
            }
            let assignPlanData = await this.frontService.assignPlanData(['ap.id','ap.org_id','ab.id','ab.block_id','ab.plan_id','aa.id','aa.org_id','aa.activity_id'],`ap.plan_id = '${postData?.plan_id}' AND ap.status != 2 AND aa.activity_id = '${saveData['id']}'`,null,[{'join_table': 'ap.ab','alias':'ab', 'table' : tableConstant.MY_PLAN.TBL_MP_ASSIGN_BLOCK, 'on_condition' : `ab.plan_id = ap.plan_id AND ab.org_id = ap.org_id`, 'join_type': 'left_one' },{'join_table': 'ab.aa','alias':'aa', 'table' : tableConstant.MY_PLAN.TBL_MP_ASSIGN_ACTIVITY, 'on_condition' : `aa.block_id = ab.block_id AND aa.org_id = ab.org_id`, 'join_type': 'left_one' }],'getMany')
            for (let i = 0; i < assignPlanData.length; i++) {
                let dynamicData = Object.create(null);
                if(activityName){
                    let name = `activity_name_${assignPlanData[i]['ab']['id']}_${assignPlanData[i]['ab']['aa']['id']}_${assignPlanData[i]['org_id']}`
                    dynamicData[`${name}`]= activityName;
                }
                if(postData?.description){
                    let name = `description_${assignPlanData[i]['ab']['id']}_${assignPlanData[i]['ab']['aa']['id']}_${assignPlanData[i]['org_id']}`
                    dynamicData[`${name}`]= postData?.description;
                }
                if(postData?.button_text){
                    let name = `button_text_${assignPlanData[i]['ab']['id']}_${assignPlanData[i]['ab']['aa']['id']}_${assignPlanData[i]['org_id']}`
                    dynamicData[`${name}`]= postData?.button_text;
                } else  if (postData?.link_id && interLinksData['linktitle']){
                    let name = `button_text_${assignPlanData[i]['ab']['id']}_${assignPlanData[i]['ab']['aa']['id']}_${assignPlanData[i]['org_id']}`
                    dynamicData[`${name}`]= interLinksData['linktitle'];
                }
                if(postData?.upload_text){
                    let name = `upload_text_${assignPlanData[i]['ab']['id']}_${assignPlanData[i]['ab']['aa']['id']}_${assignPlanData[i]['org_id']}`
                    dynamicData[`${name}`]= postData?.upload_text;
                }
                await this.translatorService.DynamicEngJsonData('MyPlan',assignPlanData[i]['org_id'],dynamicData,'Add','MyPlan',assignPlanData[i]['id'])
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: 'success'
            });
        } catch (error) {
            if (file && file.fieldname === 'icon' && file.filename) {
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
        FileInterceptor("icon", {
            limits: { fileSize: appConstant.FILE_SIZE_2MB },
            storage: diskStorage({
                destination: `${appConstant.ACTIVITY_ICON_IMAGE_PATH}`,
                filename: fileName
            }),
            fileFilter: filesFilter
        }),
        AccessGuard
    )
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: UpdateMyPlanActivityInput, @UploadedFile() file: Express.Multer.File) {
        try {
            let message = 'success';
            let success = 1;
            if (!postData?.id|| !postData?.block_id || !postData?.plan_id) {
                if (file?.filename && file?.fieldname === 'icon') {
                    await this.commonFileService.removeFileFromLocal(file.path);
                }
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            if (postData?.module_id && postData?.org_activity_id) {
                if (Array.isArray(postData?.org_activity_id)) {
                    postData.org_activity_id = postData?.org_activity_id.join(',');
                    if (postData?.org_activity_id.includes('EVC')) {
                        postData.is_category = 1;
                    }
                }
            }
            if (file && file.filename && file.fieldname === 'icon') {
                file.originalname = this.commonFileService.formatFileName(file.originalname);
                file.filename = `myplans/${postData?.plan_id.toString()}/activity/${this.commonService.generateMD5(postData?.id.toString().toString())}myactivityl.${file.originalname.split('.')[file.originalname.split('.').length - 1]}`;
                await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(file.path),  filename: file.filename}));
                postData.icon = file.filename;
                await this.commonFileService.removeFileFromLocal(file.path);
            }
            let planId = postData?.plan_id
            delete postData?.plan_id
            if (postData?.activity_id == 0) {
                let activityData = await this.activityService.activityFindOne({activity_name: postData?.custom_name,category_id: '68'},['id']);
                if (!activityData) {
                    let data: any = {
                        activity_name: postData?.custom_name,
                        accebility: 0,
                        activity_display: 0,
                        category_id: '68',
                        created_by: req.tokenUser?.id,
                        status: '1'
                    };
                    let saveActivityData = await this.activityService.save({...data});
                    postData.activity_id = saveActivityData['id'];
                } else {
                    postData.activity_id = activityData.id
                }
                delete postData?.custom_name
            }
            if (postData?.status == 1) {
                let activityStatus;
                let activityName;
                const recordDetails = await this.myPlanActivityService.findOne({ id: postData?.id, block_id: postData?.block_id });
                let activityId = postData?.activity_id ?? recordDetails.activity_id;
                if ([-1,0].includes(activityId)) {
                    let orgActivityId = postData?.org_activity_id ?? recordDetails.org_activity_id;
                    let orgActivityIds = orgActivityId.replace(/EVC/g, '').split(",");
                    let moduleId = postData?.module_id ?? recordDetails.module_id;
                    switch (moduleId) {
                        case 1:
                            let eventData = await this.eventService.findOne({id: In(orgActivityIds)});
                            activityStatus = 1;
                            activityName = eventData?.event_name
                            if (!eventData) {
                                activityStatus = orgActivityIds.length > 1 ? 1 : 2;
                            }
                            break;
                        case 2:
                            let assessmentData = await this.assessmentResultsService.findOne({id: In(orgActivityIds)});
                            activityName = assessmentData?.title
                            if (assessmentData) {
                                activityStatus = assessmentData.status;
                            }
                            break;
                        case 3:
                            let activityData = await this.activityService.activityFindOne({id: In(orgActivityIds)},['status','activity_name']);
                            activityName = activityData?.activity_name
                            if (activityData) {
                                activityStatus = activityData.status;
                            }
                            break;
                        case 4:
                            let scheduleData  = await this.scheduleChallengeService.findOne({id: In(orgActivityIds)});
                            activityName = scheduleData?.custom_cname
                            activityStatus = 2;
                            if (scheduleData) {
                                activityStatus = 1;
                            }
                            break;
                        case 5:
                            let quickLinkData = await this.quickLinkService.findOne({id: In(orgActivityIds)});
                            activityName = quickLinkData?.title
                            activityStatus = 2;
                            if (quickLinkData) {
                                activityStatus = 1;
                            }
                            break;
                        case 6:
                            let quizzesData = await this.quizQuizzesService.findOne({id: In(orgActivityIds)});
                            activityName = quizzesData?.quiz_name
                            activityStatus = 2;
                            if (quizzesData) {
                                activityStatus = 1;
                            }
                            break;
                        case 7:
                            let hraName = appConstant.HRA_DATA[orgActivityId];
                            activityName = hraName
                            break;
                        case 8:
                            let bioName = appConstant.BIO_DATA[orgActivityId];
                            activityName = bioName
                            break;
                        case 9:
                            if (orgActivityId.includes('0')) {
                                activityStatus = 1
                            } else {
                                let emPostData = await this.wellbeingPostService.findOne({id: In(orgActivityIds)},['status','title']);
                                if (emPostData) {
                                    activityStatus = emPostData.status;
                                    activityName = emPostData.title;
                                }
                            }
                            break;
                    }
                } else {
                    let activityData = await this.activityService.activityFindOne({id: activityId},['status','activity_name']);
                    activityStatus = activityData?.status;
                    activityName = activityData?.activity_name;
                }
                if (activityStatus == 2) {
                    message = await this.translatorService.frontendReadTranslation(req.lang, 'MSG_DELETED_ACTIVITY_CHANGE');
                    success = 0;
                } else {
                    let data = await this.myPlanActivityService.update({ id: postData?.id, block_id: postData?.block_id, status: Not(2) },{...postData});
                    this.activityLogService.create(recordDetails, postData, tableConstant.MY_PLAN.TBL_MP_ACTIVITY, req.tokenUser?.id);
                    message = await this.translatorService.frontendReadTranslation(req.lang, 'MSG_ACTIVITY_ACTIVATE');
                }
                let AssignBlockData = await this.myPlanAssignBlockService.listRecord({block_id: postData?.block_id, status: '1'},['org_id','startdate','enddate']);
                for (let i = 0; i < AssignBlockData.length; i++) {
                    let data = {
                        activity_id: postData?.id,
                        block_id: postData?.block_id,
                        plan_id: planId,
                        org_id: AssignBlockData[i].org_id,
                        startdate: AssignBlockData[i].startdate,
                        enddate: AssignBlockData[i].enddate
                    }
                    let checkExist: any = await this.frontService.assignActivityExists({activity_id: postData?.id,block_id: postData?.block_id,plan_id: planId,org_id: AssignBlockData[i].org_id});
                    if (!checkExist) {
                        let save = await this.myPlanAssignActivityService.save({...data});
                    }
                }
                let interLinksData: InterlinksEntity | null = null
                if (postData?.link_type && postData?.link_id){
                    interLinksData = await this.interlinksService.getOne({id: postData?.link_id,status: 1},['id','linktitle']);
                }
                let assignPlanData = await this.frontService.assignPlanData(['ap.id','ap.org_id','ab.id','ab.block_id','ab.plan_id','aa.id','aa.org_id','aa.activity_id'],`ap.plan_id = '${planId}' AND ap.status != 2 AND ab.status != 2 AND aa.activity_id = '${postData?.id}'`,null,[{'join_table': 'ap.ab','alias':'ab', 'table' : tableConstant.MY_PLAN.TBL_MP_ASSIGN_BLOCK, 'on_condition' : `ab.plan_id = ap.plan_id AND ab.org_id = ap.org_id`, 'join_type': 'left_one' },{'join_table': 'ab.aa','alias':'aa', 'table' : tableConstant.MY_PLAN.TBL_MP_ASSIGN_ACTIVITY, 'on_condition' : `aa.block_id = ab.block_id AND aa.org_id = ab.org_id`, 'join_type': 'left_one' }],'getMany')
                for (let i = 0; i < assignPlanData.length; i++) {
                    let dynamicData = Object.create(null);
                    if(activityName){
                        let name = `activity_name_${assignPlanData[i]['ab']['id']}_${assignPlanData[i]['ab']['aa']['id']}_${assignPlanData[i]['org_id']}`
                        dynamicData[`${name}`]= activityName;
                    }
                    if(postData?.description){
                        let name = `description_${assignPlanData[i]['ab']['id']}_${assignPlanData[i]['ab']['aa']['id']}_${assignPlanData[i]['org_id']}`
                        dynamicData[`${name}`]= postData?.description;
                    }
                    if(postData?.button_text){
                        let name = `button_text_${assignPlanData[i]['ab']['id']}_${assignPlanData[i]['ab']['aa']['id']}_${assignPlanData[i]['org_id']}`
                        dynamicData[`${name}`]= postData?.button_text;
                    } else  if (postData?.link_id && interLinksData['linktitle']){
                        let name = `button_text_${assignPlanData[i]['ab']['id']}_${assignPlanData[i]['ab']['aa']['id']}_${assignPlanData[i]['org_id']}`
                        dynamicData[`${name}`]= interLinksData['linktitle'];
                    }
                    if(postData?.upload_text){
                        let name = `upload_text_${assignPlanData[i]['ab']['id']}_${assignPlanData[i]['ab']['aa']['id']}_${assignPlanData[i]['org_id']}`
                        dynamicData[`${name}`]= postData?.upload_text;
                    }
                    await this.translatorService.DynamicEngJsonData('MyPlan',assignPlanData[i]['org_id'],dynamicData,'Add','MyPlan',assignPlanData[i]['id'])
                }
            } else {
                const recordDetails = await this.myPlanActivityService.findOne({ id: postData?.id, block_id: postData?.block_id });
                let data = await this.myPlanActivityService.update({ id: postData?.id, block_id: postData?.block_id, status: Not(2) },{...postData});
                this.activityLogService.create(recordDetails, postData, tableConstant.MY_PLAN.TBL_MP_ACTIVITY, req.tokenUser?.id);
                if (postData?.status == 0 && data.affected == 1) {
                    message = await this.translatorService.frontendReadTranslation(req.lang, 'MSG_ACTIVITY_DEACTIVATE');
                }
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: success,
                error: 0,
                data: null,
                message: message
            });
        } catch (error) {
            if (file && file.fieldname === 'icon' && file.filename) {
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
    @Post('delete')
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: DeleteMyPlanInput) {
        try {
            if (!postData?.id || !postData?.block_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            let where = `ma.id = '${postData?.id}' AND ma.block_id = '${postData?.block_id}'`
            if(postData?.organization_id){
                where += ` AND ma.organization_id = '${postData?.organization_id}' AND eec.c_companies_id = '${postData?.organization_id}'`
            }
            const recordDetails = await this.myPlanActivityService.findOne(where);
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            let data = await this.myPlanActivityService.update({id: postData?.id, block_id: postData?.block_id},{status: 2});
            let message = '';
            if (data.affected == 1) {
                message = 'Activity Removed Successfully';
            }
            this.activityLogService.create(recordDetails, {status:2}, tableConstant.MY_PLAN.TBL_MP_ACTIVITY, req.tokenUser?.id, 'delete');
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: message,
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
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: GetOneMyPlanInput) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let where = `ma.id = '${postData?.id}'`
            if(postData?.organization_id){
                where += ` AND ma.organization_id = '${postData?.organization_id}' AND eec.c_companies_id = '${postData?.organization_id}'`
            }
            let resultedData = await this.myPlanActivityService.findOne(where,{id: 'DESC'},[tableConstant.ACTIVITIES.TBL_ACTIVITIES,tableConstant.COMPANIES.TBL_COMPANY,tableConstant.EVENTS.TBL_EV_EVENTS,tableConstant.EVENTS.TBL_EV_EVENT_CATEGORY,tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_RESULTS,tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE,tableConstant.QUICK_LINK.TBL_QUICK_LINK,tableConstant.QUIZ.TBL_QZ_QUIZZES,tableConstant.EMOTIONAL_WELLBEING.TBL_EM_POST]);
            if (!resultedData) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }
            if (resultedData.option_activity_ids) {
                let activityList = [];
                let activityListData = await this.myPlanActivityService.listRecord(["ma.id","ma.module_id","ma.organization_id","ma.activity_id","ma.org_activity_id","ac.activity_name","ee.event_name","eec.category_name","har.title","csc.custom_cname","ql.title","qz.quiz_name","ep.title"],{id: In(resultedData.option_activity_ids.split(',').map(Number))},null,[tableConstant.ACTIVITIES.TBL_ACTIVITIES,tableConstant.COMPANIES.TBL_COMPANY,tableConstant.EVENTS.TBL_EV_EVENTS,tableConstant.EVENTS.TBL_EV_EVENT_CATEGORY,tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_RESULTS,tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE,tableConstant.QUICK_LINK.TBL_QUICK_LINK,tableConstant.QUIZ.TBL_QZ_QUIZZES,tableConstant.EMOTIONAL_WELLBEING.TBL_EM_POST]);
                for (let i = 0; i < activityListData.length; i++) {
                    let title = await this.commonService.moduleList(activityListData[i])
                    activityList.push({id: activityListData[i].id, title: title?.title || '-'});
                }
                resultedData.activity_list = activityList;
            }
            if (this.commonService.isValidNumber(resultedData.module_id)) {
                if (resultedData.module_id == 1) {
                    let moduleData = await this.commonService.moduleList(resultedData);
                    resultedData.module_list = moduleData
                } else {
                    let moduleData = await this.commonService.moduleList(resultedData);
                    resultedData.module_list = [{id: Number(resultedData.org_activity_id), ...moduleData}];
                }
                if (resultedData.module_id == '9' && resultedData.wellbeing_category_id) {
                    let categoryData = await this.wellbeingCategoryService.findOne({id: resultedData.wellbeing_category_id},'wbc.id','DESC');
                    resultedData.wellbeing_category = categoryData;
                }
            }
            if (resultedData.link_type == '1') {
                if (resultedData.link_id) {
                    let interLinksData = await this.interlinksService.findOne({id: resultedData.link_id});
                    resultedData.link_list = interLinksData;
                }
            }
            if (resultedData.activity_id == '4887' && resultedData.fpost_id) {
                let fitnessVideoData = await this.fitnessVideosService.findOne({id: resultedData.fpost_id});
                resultedData.video_type = fitnessVideoData;
            }
            if (resultedData.post_id) {
                let emPostData = await this.wellbeingPostService.findOne({id: resultedData.post_id},['id','title']);
                resultedData.post_video_type = emPostData;
            }
            resultedData = <any>(
                await this.commonArrayService.formatToDto(MyPlanActivityDto, resultedData, req.lang)
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
    @Post('list')
    async list(@Req() req: Request, @Res() res: Response, @Body() postData: ListMyPlanInput) {
        try {
            if ( !postData?.block_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let where: any = { block_id: postData?.block_id, status: '1'};
            if (postData?.id) {
                where['id'] = Not(postData?.id)
            }
            const order = postData && postData?.order ? postData?.order : 'DESC';
            const orderBy = postData && postData?.order_by ? postData?.order_by : 'id';
            let activityList = [];
            let resultedData: any = await this.myPlanActivityService.listRecord(["ma.id","ma.module_id","ma.organization_id","ma.activity_id","ma.org_activity_id","ac.activity_name","ee.event_name","eec.category_name","har.title","csc.custom_cname","ql.title","qz.quiz_name","ep.title"],where,{ [orderBy]: order },[tableConstant.ACTIVITIES.TBL_ACTIVITIES,tableConstant.COMPANIES.TBL_COMPANY,tableConstant.EVENTS.TBL_EV_EVENTS,tableConstant.EVENTS.TBL_EV_EVENT_CATEGORY,tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_RESULTS,tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE,tableConstant.QUICK_LINK.TBL_QUICK_LINK,tableConstant.QUIZ.TBL_QZ_QUIZZES,tableConstant.EMOTIONAL_WELLBEING.TBL_EM_POST]);
            for (let i = 0; i < resultedData.length; i++) {
                let title = await this.commonService.moduleList(resultedData[i])
                activityList.push({id: resultedData[i].id, title: title?.title || '-'});
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: activityList,
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
    @Post('change-order')
    async changeOrder(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (postData?.order.length == 0) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let resultedData = await this.myPlanActivityService.listRecord(["ma.id","ma.order_id"],{ id: In(postData?.order)}, { order_id: 'ASC' });
            const orderArray = postData?.order;
            let answers = resultedData.map(obj => obj.order_id);
            for (let i = 0; i < orderArray.length; i++) {
                await this.myPlanActivityService.update({id: orderArray[i]},{order_id:answers[i]});
            }
            this.activityLogService.create(resultedData, postData, tableConstant.MY_PLAN.TBL_MP_ACTIVITY, req.tokenUser?.id);
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
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
                  data: null,
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }
}
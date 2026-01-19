import {
    appConstant,
    CoachesEntity,
    CommonArrayService,
    CommonDateService,
    CommonFileService,
    CommonHealthService,
    CommonService,
    MyPlanCompleteActivityDto,
    tableConstant,
    UserEntity
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
    Res, UploadedFiles,
    UseGuards, UseInterceptors,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { FileFieldsInterceptor } from "@nestjs/platform-express";
import { Request, Response } from "express";
import * as moment from "moment/moment";
import { diskStorage } from "multer";
import { lastValueFrom } from 'rxjs';
import { RateLimiterMiddleware } from 'src/middleware/rate-limiter.middleware';
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import {In, Not} from "typeorm";
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import {
    DeleteMyPlanInput,
    GetOneMyPlanInput,
    PaginateWithCompanyInput,
    UpdateCompleteActivityInput,
} from "../../../input";
import { datafileFilter, fileName, filesFilter } from "../../../utils/image-upload.utils";
import { CoachesService } from "../../coach/coaches/coaches.service";
import { TranslationService } from "../../translation/translation.service";
import { UserService } from "../../user/user/user.service";
import { MyPlanAssignActivityService } from "../assignactivity/assignactivity.service";
import { MyPlanBlocksService } from "../blocks/blocks.service";
import { MyPlanPlansService } from "../plans/plans.service";
import { MyPlanCompleteActivityService } from './completeactivity.service';
import { CreateCompleteActivityInput } from "./inputs";
const path = require('path');
@Controller('my-plan/complete-activity')
@UseGuards(TokenGuard, RoleGuard)
export class MyPlanCompleteActivityController {
    constructor(
        private readonly myPlanCompleteActivityService: MyPlanCompleteActivityService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonDateService: CommonDateService,
        private readonly commonFileService: CommonFileService,
        private readonly commonHealthService: CommonHealthService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        private readonly userService: UserService,
        private readonly myPlanAssignActivityService: MyPlanAssignActivityService,
        private readonly myPlanBlocksService: MyPlanBlocksService,
        private readonly myPlanPlansService: MyPlanPlansService,
        @Inject('COMMON_SERVICE')
        private commonMicroservice: ClientProxy,
        private coachesService: CoachesService,
    ) {}
    @UseGuards(AccessGuard)
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithCompanyInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let where = `ca.status != '3'`;
            let fields = [],tableData = [];
            const fetchCreatedBy = async () => {
                let createdBy = ''
                if (req.tokenUser?.role_id == appConstant.ROLE.ADMIN) {
                    let coachUser: UserEntity[] = await this.userService.getAll({role_id: In([appConstant.ROLE.GLOBALCOACH,appConstant.ROLE.ADMIN])},['id']);
                    let orgId: string = '';
                    for (let i: number = 0; i < coachUser.length; i++) {
                        if (i > 0) orgId += ',';
                        orgId += `'${coachUser[i].id}'`;
                    }
                    createdBy = ` AND ca.created_by IN(${orgId})`
                }
                return createdBy
            }
            if (postData?.flag_status == '1') {
                where += ` AND ca.activity_id = '7717' AND users.status != '2' AND mp.status != '2' AND mb.status != '2' AND mac.status != '2' AND aac.status != '2' AND cc.status != '2'`;
                fields = ["ca.id","ca.user_id","ca.custom_id","ca.activity_id","ca.image","ca.status","ca.created","ca.source","users.id","users.code","users.first_name","users.last_name","users.username","ac.activity_name","mac.type","mb.name","mp.name","aac.name"];
                tableData = [tableConstant.TBL_USERS,tableConstant.ACTIVITIES.TBL_ACTIVITIES,tableConstant.MY_PLAN.TBL_MP_ACTIVITY,tableConstant.MY_PLAN.TBL_MP_ASSIGN_ACTIVITY,tableConstant.COACH.TBL_CO_COACHES,tableConstant.MY_PLAN.TBL_MP_BLOCKS,tableConstant.MY_PLAN.TBL_MP_PLANS];
            } else if (postData?.flag_status == '2') {
                let createdBy = await fetchCreatedBy()
                where += ` AND users.status != '2' AND company.status != '2' ${createdBy}`;
                fields = ["ca.id","ca.user_id","company.id","company.company_name","users.id","users.code","users.first_name","users.last_name","users.username","users.membership_code"];
                tableData = [tableConstant.TBL_USERS,tableConstant.COMPANIES.TBL_COMPANY];
            } else if (postData?.flag_status == '3') {
                if (!postData?.org_id || !postData?.user_id) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
                let createdBy = await fetchCreatedBy()
                where += ` AND mac.status != '2' AND aac.status != '2' AND mb.status != '2' AND mp.status != '2' AND map.status != '2' ${createdBy}`;
                fields = ["ca.id","ca.updated","mac.id","mac.activity_id","mac.block_id","mac.module_id","mac.organization_id","mac.org_activity_id","mac.days","mac.status","mac.icon","mac.is_category","ac.activity_name","mac.order_id","aac.name","qz.quiz_name","ql.title","har.title","csc.custom_cname","ep.title","ev.event_name","eec.category_name","mb.name","mp.name","map.name"];
                tableData = [tableConstant.ACTIVITIES.TBL_ACTIVITIES,tableConstant.MY_PLAN.TBL_MP_ACTIVITY,tableConstant.MY_PLAN.TBL_MP_ASSIGN_ACTIVITY,tableConstant.MY_PLAN.TBL_MP_BLOCKS,tableConstant.MY_PLAN.TBL_MP_PLANS,tableConstant.MY_PLAN.TBL_MP_ASSIGN_PLAN,tableConstant.EVENTS.TBL_EV_EVENTS,tableConstant.EVENTS.TBL_EV_EVENT_CATEGORY,tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE,tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_RESULTS,tableConstant.QUICK_LINK.TBL_QUICK_LINK,tableConstant.QUIZ.TBL_QZ_QUIZZES,tableConstant.EMOTIONAL_WELLBEING.TBL_EM_POST];
            } else if (postData?.flag_status == '4') {
                where += ` AND ca.activity_id = '7717' AND ma.status != '2' AND maa.status != '2' AND users.status != '2' AND mb.status != '2' AND mp.status != '2'`;
                fields = ["ca.id","ca.updated","ca.created","ca.status","ca.image","ca.notes","users.id","users.code", "users.first_name", "users.last_name", "users.username", "ac.activity_name", "ma.type", "maa.name", "mb.name", "mp.name"];
                tableData = [tableConstant.ACTIVITIES.TBL_ACTIVITIES,tableConstant.MY_PLAN.TBL_MP_ACTIVITY,tableConstant.MY_PLAN.TBL_MP_ASSIGN_ACTIVITY,tableConstant.TBL_USERS,tableConstant.MY_PLAN.TBL_MP_BLOCKS,tableConstant.MY_PLAN.TBL_MP_PLANS];
            }
            if (postData?.flag_status == '3' && postData.user_id) {
                where += ` AND ca.user_id = '${postData?.user_id}'`;
            }
            if (req.tokenUser?.role_id != appConstant.ROLE.ADMIN && appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER != req.tokenUser?.role_id) {
                if (postData?.flag_status == '1') {
                    where += ` AND cc.coach_manager_id = '${req.tokenUser?.id}'`;
                } else if (postData?.flag_status == '2') {
                    let coachWhere = req?.tokenUser?.role_id === appConstant.ROLE.COACH ? {user_id: req.tokenUser?.id, status: 1} : {coach_manager_id: req.tokenUser?.id, status: 1};
                    let coachUser: CoachesEntity[] = await this.coachesService.getAll(coachWhere,['org_id']);
                    let orgId: string = '';
                    for (let i: number = 0; i < coachUser.length; i++) {
                        if (i > 0) orgId += ',';
                        orgId += `'${coachUser[i].org_id}'`;
                    }
                    where += ` AND company.id IN(${orgId}) AND ca.created_by = '${req.tokenUser?.id}'`;
                } else if (postData?.flag_status == '3') {
                    where += ` AND ca.user_id = '${postData?.user_id ?? req.tokenUser?.id}' AND ca.created_by = '${req.tokenUser?.id}'`;
                } else if (postData?.flag_status == '4') {
                    where += ` AND users.membership_code = '${req.tokenUser?.membership_code}'`;
                }
            }
            if ([0, 1, 2].includes(postData?.status)) {
                where += ` AND (ca.status = '${postData?.status}')`;
            }
            if (postData?.upload_date) {
                where += ` AND ca.created LIKE '%${postData?.upload_date}%'`;
            }
            if (postData?.search_str) {
                if (postData?.filter_by) {
                    switch (postData?.filter_by?.toLowerCase()) {
                        case 'user_code':
                            where += ` AND users.code LIKE '%${this.commonFileService.quoteEscaper(postData?.search_str)}%'`;
                            break;
                        case 'username':
                            where += ` AND users.username LIKE '%${this.commonFileService.quoteEscaper(postData?.search_str)}%'`;
                            break;
                        case 'user_name':
                            where += ` AND (users.first_name LIKE '%${this.commonFileService.quoteEscaper(postData?.search_str)}%' OR users.last_name LIKE '%${this.commonFileService.quoteEscaper(postData?.search_str)}%' OR CONCAT(users.first_name, ' ', users.last_name) LIKE '%${this.commonFileService.quoteEscaper(postData?.search_str)}%')`;
                            break;
                        case 'block_name':
                            where += ` AND mb.name LIKE '%${this.commonFileService.quoteEscaper(postData?.search_str)}%'`;
                            break;
                        case 'plan_name':
                            where += ` AND mp.name LIKE '%${this.commonFileService.quoteEscaper(postData?.search_str)}%'`;
                            break;
                        case 'company_name':
                            where += ` AND company.company_name LIKE '%${this.commonFileService.quoteEscaper(postData?.search_str)}%'`;
                            break;
                        default:
                    }
                } else {
                    if (['1','2','4'].includes(postData?.flag_status)) {
                        where += ` AND (users.first_name LIKE '%${this.commonFileService.quoteEscaper(postData?.search_str)}%' OR users.last_name LIKE '%${this.commonFileService.quoteEscaper(postData?.search_str)}%' OR CONCAT(users.first_name, ' ', users.last_name) LIKE '%${this.commonFileService.quoteEscaper(postData?.search_str)}%' `;
                        where += ` OR users.username LIKE '%${this.commonFileService.quoteEscaper(postData?.search_str)}%' OR users.code LIKE '%${this.commonFileService.quoteEscaper(postData?.search_str)}%'`;
                        if (postData?.flag_status == '1') {
                            where += ` OR mb.name LIKE '%${this.commonFileService.quoteEscaper(postData?.search_str)}%' OR mp.name LIKE '%${this.commonFileService.quoteEscaper(postData?.search_str)}%'`;
                        } else if (postData?.flag_status == '2') {
                            where += ` OR company.company_name LIKE '%${this.commonFileService.quoteEscaper(postData?.search_str)}%'`;
                        }else if (postData?.flag_status == '4') {
                            where += ` OR mb.name LIKE '%${this.commonFileService.quoteEscaper(postData?.search_str)}%' OR mp.name LIKE '%${this.commonFileService.quoteEscaper(postData?.search_str)}%' OR ac.activity_name LIKE '%${this.commonFileService.quoteEscaper(postData?.search_str)}%'`;
                        }
                        where += ` )`;
                    } else {
                        let searchFields = ['mb.name', 'mp.name', 'ac.activity_name', 'ev.event_name', 'eec.category_name', 'har.title', 'csc.custom_cname', 'ql.title', 'qz.quiz_name'];
                        where += ` AND (`;
                        for (let i = 0; i < searchFields.length; i++) {
                            where += ` ${i != 0 ? 'OR': '' } ${searchFields[i]} LIKE '%${this.commonFileService.quoteEscaper(postData?.search_str)}%'`;
                        }
                        where += ` )`;
                    }
                }
            }
            const resultedData = await this.myPlanCompleteActivityService.paginateList(
                fields,
                where,
                postData,
                tableData,
            );
            if (postData?.flag_status == '3') {
                for (let i = 0; i < resultedData['list'].length; i++) {
                    let assignName = '';
                    if (resultedData['list'][i]['mac']?.aac?.name) {
                        assignName = resultedData['list'][i]['mac']?.aac?.name;
                    }
                    if (resultedData['list'][i]['mac']['organization_id']) {
                        switch (resultedData['list'][i]['mac']['module_id']) {
                            case 1:
                                if (resultedData['list'][i]['mac']['is_category'] == 1) {
                                    assignName = assignName || resultedData['list'][i]['mac']?.eec?.category_name;
                                } else {
                                    assignName = assignName || resultedData['list'][i]['mac']?.ev?.event_name;
                                }
                                break;
                            case 2:
                                assignName = assignName || resultedData['list'][i]['mac']?.har?.title;
                                break;
                            case 3:
                                assignName = assignName || resultedData['list'][i]['mac']?.ac?.activity_name;
                                break;
                            case 4:
                                assignName = assignName || resultedData['list'][i]['mac']?.csc?.custom_cname;
                                break;
                            case 5:
                                assignName = assignName || resultedData['list'][i]['mac']?.ql?.title;
                                break;
                            case 6:
                                assignName = assignName || resultedData['list'][i]['mac']?.qz?.quiz_name;
                                break;
                            case 7:
                                assignName = assignName || appConstant.HRA_DATA[resultedData['list'][i]['mac']?.org_activity_id];
                                break;
                            case 8:
                                assignName = assignName || appConstant.BIO_DATA[resultedData['list'][i]['mac']?.org_activity_id];
                                break;
                            case 9:
                                assignName = assignName || resultedData['list'][i]['mac']['ep']?.title;
                                break;
                        }
                    } else {
                        assignName = resultedData['list'][i]['mac']?.ac?.activity_name;
                    }
                    resultedData['list'][i]['plan_name'] = resultedData['list'][i]['mac']?.mb?.mp?.map?.name || resultedData['list'][i]['mac']?.mb.mp?.name;
                    resultedData['list'][i]['block_name'] = resultedData['list'][i]['mac']?.mb?.name;
                    resultedData['list'][i]['activity_name'] = assignName || '-';
                }
            }
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(MyPlanCompleteActivityDto, resultedData['list'], req.lang)
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
        FileFieldsInterceptor([
            { name: 'image', maxCount: 1 },
            { name: 'file', maxCount: 1 },
            ], {
            limits: { fileSize: appConstant.FILE_SIZE_2MB },
            storage: diskStorage({
                destination: `${appConstant.COMPLETE_ACTIVITY_FILE_PATH}`,
                filename: fileName
            }),
            /* storage: multer.memoryStorage(),  for file rate limit functionality */
            fileFilter: (req, file, cb) => {
                switch (file.fieldname) {
                    case 'image':
                        filesFilter(req, file, cb);
                        break;
                    case 'file':
                        datafileFilter(req, file, cb);
                        break;
                }
            }
        }),
        AccessGuard
    )
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateCompleteActivityInput, @UploadedFiles() files: Express.Multer.File[]) {
        const rateLimiter = new RateLimiterMiddleware();
        await rateLimiter.use(req, res, async () => {
            try {
                postData.org_id = postData?.org_id ?? req.tokenUser?.org_id;
                let message = 'SUCCESS_ACTIVITY_COMPLETED',flag = 0;
                if (!postData?.org_id || !this.commonService.isValidNumber(postData?.plan_id)) {
                    for (const fieldName of Object.keys(files)) {
                        if (files && files[fieldName] && files[fieldName][0]['fieldname'] === fieldName) {
                            await this.commonFileService.removeFileFromLocal(files[fieldName][0]['path']);
                        }
                    }
                    return res.status(HttpStatus.BAD_REQUEST).json({
                        success: 0,
                        error: 1,
                        data: null,
                        message: await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING")
                    });
                }
                if (req.tokenUser?.role_id == appConstant.ROLE.ADMIN) {
                    postData.created_by = 0
                } else {
                    postData.created_by = req.tokenUser?.id
                }
                let userActivity= {}, selectedActivityArray= [];
                if (postData?.flag == 1) {
                    if (files && files['file'] && files['file'][0]['fieldname'] === 'file') {
                        let excelData: any = await this.commonFileService.createFileToJson(files['file'][0]['path'],'excel_to_json.py',req);
                        if (excelData?.status === 0) {
                            return res.status(HttpStatus.BAD_REQUEST).json({
                                success: 0,
                                error: 1,
                                data: null,
                                message: excelData?.message
                            });
                        }
                        let filePath = files['file'][0]['path'].replace(".xlsx",".json");
                        let jsonData = await this.commonFileService.readFile(filePath);
                        if (Array.isArray(jsonData) && jsonData?.length <= 1) {
                            return res.status(HttpStatus.BAD_REQUEST).json({
                                success: 0,
                                error: 1,
                                data: null,
                                message: await this.translatorService.frontendReadTranslation(req.lang, "ERR_DATA_NOT_FOUND")
                            });
                        }
                            const headers = jsonData[0]; /* First row = column names */
                            jsonData = jsonData.slice(1);
                            for (let i = 0; i < jsonData.length; i++) {
                                const row = jsonData[i];
                                const rowObj = {};
                                /*Convert row into object using headers*/
                                for (let j = 0; j < headers.length; j++) {
                                    rowObj[headers[j]] = row[j];
                                }
                                const activityName = [];
                                for (const key of Object.keys(rowObj)) {
                                    /*Skip fields in CUSTOM_COMPLETION_DATA*/
                                    if (!appConstant.CUSTOM_COMPLETION_DATA.includes(key)) {
                                        const val = rowObj[key];
                                        if (val && val.toString().toLowerCase() === 'yes') {
                                            activityName.push(key);
                                            if (!selectedActivityArray.includes(key)) {
                                                selectedActivityArray.push(key);
                                            }
                                        }
                                    }
                                }
                                /*Store activityName list for the user (using User Id)*/
                                const userId = rowObj[appConstant.CUSTOM_COMPLETION_DATA[1]]; // assuming 2nd item is "User Id"
                                userActivity[userId] = activityName;
                            }
                    }
                    if (selectedActivityArray.length == 0) {
                        for (const fieldName of Object.keys(files)) {
                            if (files && files[fieldName] && files[fieldName][0]['fieldname'] === fieldName) {
                                await this.commonFileService.removeFileFromLocal(files[fieldName][0]['path']);
                            }
                        }
                        return res.status(HttpStatus.BAD_REQUEST).json({
                            success: 0,
                            error: 1,
                            data: null,
                            message: await this.translatorService.frontendReadTranslation(req.lang, "MSG_UPLOAD_ACTIVITY_VALIDATION")
                        });
                    }
                } else if (postData?.flag == 2) {
                    if (!postData?.activity_name) {
                        for (const fieldName of Object.keys(files)) {
                            if (files && files[fieldName] && files[fieldName][0]['fieldname'] === fieldName) {
                                await this.commonFileService.removeFileFromLocal(files[fieldName][0]['path']);
                            }
                        }
                        return res.status(HttpStatus.BAD_REQUEST).json({
                            success: 0,
                            error: 1,
                            data: null,
                            message: this.translatorService.translate(req.lang, "ERR_REQUIRED_PARAM_MISSING")
                        });
                    }
                    let userData = []
                    if ([0,1].includes(postData?.all_user)) {
                        if (postData?.all_user === 1) {
                            userData = await this.userService.usersList({org_id: postData?.org_id, status: '1', role_id: In([2, 16])}, ["user.id"], {id: 'ASC'});
                        } else {
                            if (!postData?.user_id) {
                                for (const fieldName of Object.keys(files)) {
                                    if (files && files[fieldName] && files[fieldName][0]['fieldname'] === fieldName) {
                                        await this.commonFileService.removeFileFromLocal(files[fieldName][0]['path']);
                                    }
                                }
                                return res.status(HttpStatus.BAD_REQUEST).json({
                                    success: 0,
                                    error: 1,
                                    data: null,
                                    message: this.translatorService.translate(req.lang, "ERR_REQUIRED_PARAM_MISSING")
                                });
                            }
                            userData = await this.userService.usersList({id: In(postData?.user_id.split(',')), org_id: postData?.org_id, status: '1', role_id: In([2, 16])}, ["user.id"], {id: 'ASC'});
                        }
                    }
                    selectedActivityArray = postData?.activity_name.map(str => str.trim()) || [];
                    for (let i = 0; i < userData.length; i++) {
                        userActivity[userData[i]['user_id']] = selectedActivityArray
                    }
                }
                if (selectedActivityArray.length > 0) {
                    let where: any = `maa.org_id = '${postData?.org_id}' AND (ma.organization_id = '${postData?.org_id}' OR ma.organization_id IS NULL) AND maa.status = '1' AND ma.status = '1'`;
                    if (postData?.plan_id == 0) {
                        let result = await this.myPlanPlansService.listRecord(["mp.id"],`mp.status = '1' AND map.status = '1' AND map.org_id = '${postData?.org_id}'`, null,[tableConstant.MY_PLAN.TBL_MP_ASSIGN_PLAN]);
                        let resultedData = await this.myPlanBlocksService.listRecord(["id"],{status: In([0,1]), plan_id: In(result.map(item => item.id))});
                        if (resultedData.length > 0) {
                            where += ` AND maa.block_id IN(${resultedData.map(item => item.id).join(",")})`;
                        }
                    } else {
                        let resultedData = await this.myPlanBlocksService.listRecord(["id"],{status: In([0,1]), plan_id: postData?.plan_id});
                        if (resultedData.length > 0) {
                            where += ` AND maa.block_id IN(${resultedData.map(item => item.id).join(",")})`;
                        }
                    }
                    let resultedData = await this.myPlanAssignActivityService.listRecord(where,["maa.id","maa.block_id","maa.name","ma.id","ma.activity_id","maa.activity_id","ma.module_id","ma.is_category","ma.org_activity_id","ac.id","ac.activity_name","acAge.id","acAge.activity_name","ep.id","ep.title","qz.id","qz.quiz_name","ql.id","ql.title","har.id","har.title","csc.id","csc.custom_cname","eec.id","eec.category_name","ee.id","ee.event_name"], { id: 'ASC' },[tableConstant.MY_PLAN.TBL_MP_ACTIVITY,tableConstant.ACTIVITIES.TBL_ACTIVITIES,tableConstant.EMOTIONAL_WELLBEING.TBL_EM_POST,tableConstant.QUIZ.TBL_QZ_QUIZZES,tableConstant.QUICK_LINK.TBL_QUICK_LINK,tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_RESULTS,tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE,tableConstant.EVENTS.TBL_EV_EVENT_CATEGORY,tableConstant.EVENTS.TBL_EV_EVENTS]);
                    let responseData = resultedData.reduce((activityData, {activity_id: maa_activity_id, name, ma}) => {
                        name = (name && name.trim() !== '') ? name?.trim() : '';
                            if (ma?.ac?.id) {
                                let activityName = name || ma?.ac?.activity_name?.trim();
                                if (selectedActivityArray.includes(activityName)) {
                                    let activityId = name ? maa_activity_id : ma?.id;
                                    activityData[activityName] = [...(activityData[activityName] || []), {activity_id: ma?.activity_id,custom_id: activityId}]
                                }
                            }
                            switch (ma?.module_id) {
                                case 1:
                                    if (ma?.ee?.id && ma?.is_category === 0) {
                                        let activityName = name || ma?.ee?.event_name?.trim();
                                        if (selectedActivityArray.includes(activityName)) {
                                            let activityId = name ? maa_activity_id : ma?.id;
                                            activityData[activityName] = [...(activityData[activityName] || []), {activity_id: ma?.activity_id,custom_id: activityId}]
                                        }
                                    }
                                    if (ma?.eec?.id && ma?.is_category === 1) {
                                        let activityName = name || ma?.eec?.category_name?.trim();
                                        if (selectedActivityArray.includes(activityName)) {
                                            let activityId = name ? maa_activity_id : ma?.id;
                                            activityData[activityName] = [...(activityData[activityName] || []), {activity_id: ma?.activity_id,custom_id: activityId}]
                                        }
                                    }
                                    break;
                                case 2:
                                    if (ma?.har?.id) {
                                        let activityName = name || ma?.har?.title?.trim();
                                        if (selectedActivityArray.includes(activityName)) {
                                            let activityId = name ? maa_activity_id : ma?.id;
                                            activityData[activityName] = [...(activityData[activityName] || []), {activity_id: ma?.activity_id,custom_id: activityId}]
                                        }
                                    }
                                    break;
                                case 3:
                                    if (ma?.acAge?.id) {
                                        const activityName = name?.trim() || ma?.acAge?.activity_name?.trim();
                                        if (selectedActivityArray.includes(activityName)) {
                                            const activityId = name ? maa_activity_id : ma?.id;
                                            activityData[activityName] = activityData[activityName] || [];
                                            const alreadyExists = activityData[activityName].some(item => item.custom_id == activityId);
                                            if (!alreadyExists) {
                                                activityData[activityName].push({activity_id: ma?.activity_id, custom_id: activityId});
                                            }
                                        }
                                    }
                                    break;
                                case 4:
                                    if (ma?.csc?.id) {
                                        let activityName = name || ma?.csc?.custom_cname?.trim();
                                        if (selectedActivityArray.includes(activityName)) {
                                            let activityId = name ? maa_activity_id : ma?.id;
                                            activityData[activityName] = [...(activityData[activityName] || []), {activity_id: ma?.activity_id,custom_id: activityId}]
                                        }
                                    }
                                    break;
                                case 5:
                                    if (ma?.ql?.id) {
                                        let activityName = name || ma?.ql?.title?.trim();
                                        if (selectedActivityArray.includes(activityName)) {
                                            let activityId = name ? maa_activity_id : ma?.id;
                                            activityData[activityName] = [...(activityData[activityName] || []), {activity_id: ma?.activity_id,custom_id: activityId}]
                                        }
                                    }
                                    break;
                                case 6:
                                    if (ma?.qz?.id) {
                                        let activityName = name || ma?.qz?.quiz_name?.trim();
                                        if (selectedActivityArray.includes(activityName)) {
                                            let activityId = name ? maa_activity_id : ma?.id;
                                            activityData[activityName] = [...(activityData[activityName] || []), {activity_id: ma?.activity_id,custom_id: activityId}]
                                        }
                                    }
                                    break;
                                case 7:
                                    let hraName = name || appConstant.HRA_DATA[ma?.org_activity_id];
                                    if (selectedActivityArray.includes(hraName)) {
                                        let activityId = name ? maa_activity_id : ma?.id;
                                        activityData[hraName] = [...(activityData[hraName] || []), {activity_id: ma?.activity_id,custom_id: activityId}]
                                    }
                                    break;
                                case 8:
                                    let bioName = name || appConstant.BIO_DATA[ma?.org_activity_id];
                                    if (selectedActivityArray.includes(bioName)) {
                                        let activityId = name ? maa_activity_id : ma?.id;
                                        activityData[bioName] = [...(activityData[bioName] || []), {activity_id: ma?.activity_id,custom_id: activityId}]
                                    }
                                    break;
                                case 9:
                                    if (ma?.ep?.id) {
                                        let activityName = name || ma?.ep?.title?.trim();
                                        if (selectedActivityArray.includes(activityName)) {
                                            let activityId = name ? maa_activity_id : ma?.id;
                                            activityData[activityName] = [...(activityData[activityName] || []), {activity_id: ma?.activity_id,custom_id: activityId}]
                                        }
                                    }else if (ma?.org_activity_id == '0' &&  !selectedActivityArray.includes('All Emotional Well-Being')) {
                                        let activityId = name ? maa_activity_id : ma?.id;
                                        activityData['All Emotional Well-Being'] = [...(activityData['All Emotional Well-Being'] || []), {activity_id: ma?.activity_id,custom_id: activityId}]
                                    }
                                    break;
                            }
                        return activityData;
                    }, []);
                    if (postData?.flag == 1) {
                        let status = await this.commonHealthService.arrayMatch(selectedActivityArray,Object.keys(responseData));
                        if (!status) {
                            for (const fieldName of Object.keys(files)) {
                                if (files && files[fieldName] && files[fieldName][0]['fieldname'] === fieldName) {
                                    await this.commonFileService.removeFileFromLocal(files[fieldName][0]['path']);
                                }
                            }
                            return res.status(HttpStatus.BAD_REQUEST).json({
                                success: 0,
                                error: 1,
                                data: null,
                                message: await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING")
                            });
                        }
                        if (files && files['file'] && files['file'][0]['fieldname'] === 'file') {
                            files['file'][0]['originalname'] = this.commonFileService.formatFileName(files['file'][0]['originalname']);
                            let fileName:string = `${moment().format('YYYY-MM-DD_HH_mm_ss')}_custompoint.${files['file'][0]['originalname'].split('.')[files['file'][0]['originalname'].split('.').length - 1]}`;
                            files['file'][0]['filename'] = `myplans/complete_activity/${fileName}`;
                            await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(files['file'][0]['path']),  filename: files['file'][0]['filename']}));
                            this.activityLogService.create(postData, files['file'][0], tableConstant.MY_PLAN.TBL_MP_COMPLETE_ACTIVITY, req.tokenUser?.id,'copy');
                            await this.commonFileService.removeFileFromLocal(files['file'][0]['path']);
                        }
                    }
                    let completeActivityDate: any = []
                    for (let key in userActivity) {
                        if (userActivity.hasOwnProperty(key) && Array.isArray(userActivity[key])) {
                            for (let i: number = 0; i < userActivity[key].length; i++) {
                                const userActivityKey = userActivity[key][i];
                                const activityData = responseData[userActivityKey]
                                if (activityData && Array.isArray(activityData)) {
                                    for (let j: number = 0; j < activityData.length; j++) {
                                        const data = {
                                            user_id: key,
                                            custom_id: activityData[j]['custom_id'],
                                            activity_id: activityData[j]['activity_id'],
                                            created_by: postData?.created_by,
                                            source: '1',
                                            status: '1',
                                            aftercompletestatus: postData?.aftercompletestatus || 0
                                        }
                                        completeActivityDate.push(data);
                                    }
                                }
                            }
                        }
                    }
                    await this.myPlanCompleteActivityService.save(completeActivityDate);
                } else {
                    postData.user_id = postData?.user_id ?? req.tokenUser?.id.toString();
                    if (!postData?.user_id || !postData?.activity_id || !postData?.custom_id) {
                        for (const fieldName of Object.keys(files)) {
                            if (files && files[fieldName] && files[fieldName][0]['fieldname'] === fieldName) {
                                await this.commonFileService.removeFileFromLocal(files[fieldName][0]['path']);
                            }
                        }
                        return res.status(HttpStatus.BAD_REQUEST).json({
                            success: 0,
                            error: 1,
                            data: null,
                            message: await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING")
                        });
                    }
                    let completeActivityData = await this.myPlanCompleteActivityService.findOne(["ca.id"],{activity_id: postData?.activity_id, custom_id: postData?.custom_id, user_id: postData?.user_id });
                    if (files && files['image'] && files['image'][0]['fieldname'] === 'image') {
                        files['image'][0]['originalname'] = this.commonFileService.formatFileName(files['image'][0]['originalname']);
                        files['image'][0]['filename'] = `myplans/onscreen/${postData?.org_id.toString()}/${postData?.user_id.toString()}/mypui_${this.commonService.generateMD5(postData?.activity_id.toString()+postData?.user_id.toString())}${this.commonDateService.getTodayDate().format('YYYYMMDDHHmmss')}.${files['image'][0]['originalname'].split('.')[files['image'][0]['originalname'].split('.').length - 1]}`;
                        postData.image = files['image'][0]['filename'];
                        await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(files['image'][0]['path']),  filename: files['image'][0]['filename'], userBucket: 'private'}));
                        this.activityLogService.create(postData, files['image'][0], tableConstant.MY_PLAN.TBL_MP_COMPLETE_ACTIVITY, req.tokenUser?.id,'copy');
                        await this.commonFileService.removeFileFromLocal(files['image'][0]['path']);
                    }
                    postData.status = 1;
                    if (postData?.type == 3) {
                        postData.status = 0;
                    }
                    let data = {user_id: postData?.user_id,activity_id: postData?.activity_id,status: postData?.status,custom_id: postData?.custom_id,image: postData?.image,notes: postData?.notes,created_by: Number(postData?.user_id)}
                    if (!completeActivityData || postData?.notes || postData?.image) {
                        if (completeActivityData?.id) {
                            await this.myPlanCompleteActivityService.update({ id: completeActivityData.id, user_id: data.user_id },{...data});
                            this.activityLogService.create(completeActivityData, data, tableConstant.MY_PLAN.TBL_MP_COMPLETE_ACTIVITY, req.tokenUser?.id);
                        } else {
                            await this.myPlanCompleteActivityService.save({...data});
                        }
                    } else {
                        message = 'SUCCESS_ACTIVITY_ALREADY_EXIST';
                        flag = 1;
                    }
                }
                return res.status(HttpStatus.OK).json({
                    statusCode: 201,
                    success: 1,
                    error: 0,
                    data: null,
                    flag: flag,
                    message: await this.translatorService.frontendReadTranslation(req.lang, message)
                });
            } catch (error) {
                for (const fieldName of Object.keys(files)) {
                    if (files && files[fieldName] && files[fieldName][0]['fieldname'] === fieldName) {
                        await this.commonFileService.removeFileFromLocal(files[fieldName][0]['path']);
                    }
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
        });
    }
    @UseGuards(AccessGuard)
    @Put('update')
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: UpdateCompleteActivityInput) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.myPlanCompleteActivityService.findOne(["ca.id","ca.user_id","ca.custom_id","ca.activity_id","ca.image","ca.notes","ca.created_by","ca.source","ca.status","ca.aftercompletestatus","ca.created","ca.updated"],{ id: postData?.id, user_id: postData?.user_id });
            await this.myPlanCompleteActivityService.update({ id: postData?.id},{...postData});
            this.activityLogService.create(recordDetails, postData, tableConstant.MY_PLAN.TBL_MP_COMPLETE_ACTIVITY, req.tokenUser?.id);
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, "SUCCESS_ACTIVITY_COMPLETED")
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
    @Post('delete')
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: DeleteMyPlanInput) {
        try {
            if (!postData?.id || !postData?.user_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.myPlanCompleteActivityService.findOne(["ca.id","ca.user_id","ca.custom_id","ca.activity_id","ca.image","ca.notes","ca.created_by","ca.source","ca.status","ca.aftercompletestatus","ca.created","ca.updated"],{
                id: postData?.id,
                user_id: postData?.user_id
            });
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            await this.myPlanCompleteActivityService.update({id: postData?.id, user_id: postData?.user_id},{status:3});
            this.activityLogService.create(recordDetails, {status:3}, tableConstant.MY_PLAN.TBL_MP_COMPLETE_ACTIVITY, req.tokenUser?.id, 'delete');
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
    @UseGuards(AccessGuard)
    @Post('get-one')
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: GetOneMyPlanInput) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let where = {id: postData?.id};
            if(postData?.user_id){
                where['user_id'] = postData?.user_id ?? req?.tokenUser?.id; 
            }
            let resultedData = await this.myPlanCompleteActivityService.findOne(["ca.id","ca.user_id","ca.custom_id","ca.activity_id","ca.image","ca.status","ca.created","ca.updated","ca.source","ca.notes","users.code","users.first_name","users.last_name","users.username","ac.activity_name","mac.type","mb.name","mp.name","aac.name"],where,null,[tableConstant.ACTIVITIES.TBL_ACTIVITIES,tableConstant.MY_PLAN.TBL_MP_ACTIVITY,tableConstant.MY_PLAN.TBL_MP_ASSIGN_ACTIVITY,tableConstant.TBL_USERS,tableConstant.COACH.TBL_CO_COACHES,tableConstant.MY_PLAN.TBL_MP_BLOCKS,tableConstant.MY_PLAN.TBL_MP_PLANS]);
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
            resultedData = <any>(
                await this.commonArrayService.formatToDto(MyPlanCompleteActivityDto, resultedData, req.lang)
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
}
import {
    appConstant,
    CommonArrayService, CommonDateService,
    CommonFileService,
    CommonService,
    IncentiveReportsEntity,
    MyPlanPlansDto,
    PaginateDto, System_Type,
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
    Res, UploadedFile,
    UseGuards, UseInterceptors,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { FileInterceptor } from "@nestjs/platform-express";
import { Request, Response } from "express";
import { diskStorage } from "multer";
import { lastValueFrom } from 'rxjs';
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import {FindOptionsWhere, In, IsNull, Like, Not} from "typeorm";
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import {
    CreatePlansInput,
    DeleteMyPlanInput,
    GetOneMyPlanInput,
    ListMyPlanInput, PaginateWithCompanyInput,
    UpdatePlansInput
} from "../../../input";
import { fileName, filesFilter } from "../../../utils/image-upload.utils";
import { IncentiveReportsService } from "../../campaign/incentivereports/incentivereports.service";
import { TranslationService } from "../../translation/translation.service";
import { UserService } from "../../user/user/user.service";
import { FrontService } from "../front/front.service";
import { PlanReportPaginateDto } from "./dtos";
import { myPlanReportInput, planReportPaginateInput } from "./inputs";
import { MyPlanPlansService } from './plans.service';
const path = require('path');
@Controller('my-plan/plans')
@UseGuards(TokenGuard, RoleGuard)
export class MyPlanPlansController {
    constructor(
        private readonly myPlanPlansService: MyPlanPlansService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        @Inject('COMMON_SERVICE')
        private commonMicroservice: ClientProxy,
        private readonly frontService: FrontService,
        private readonly userService: UserService,
        private readonly incentiveReportsService: IncentiveReportsService,
        private readonly commonDateService: CommonDateService,
    ) {}
    @UseGuards(AccessGuard)
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithCompanyInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let tableData = [tableConstant.TBL_USERS];
            let fields = ['mp.id', 'mp.name', 'mp.status', 'mp.icon','mp.description', 'users.username', 'users.first_name', 'users.last_name'];
            let where = `mp.status != '2'`;
            if(req.tokenUser?.role_id != appConstant.ROLE.ADMIN){
                where += ` AND mp.created_by = ${req.tokenUser?.id}`;
            }
            if (postData?.search_str) {
                /* user name search fun remove (global coach bug no: 129)*/
                where += ` AND mp.name LIKE '%${this.commonFileService.quoteEscaper(postData?.search_str)}%'`;
            }
            const resultedData = await this.myPlanPlansService.paginateList(
                fields,
                where,
                postData,
                tableData
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(MyPlanPlansDto, resultedData['list'], req.lang)
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
                destination: `${appConstant.PLANS_ICON_IMAGE_PATH}`,
                filename: fileName
            }),
            fileFilter: filesFilter
        }),
        AccessGuard
    )
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreatePlansInput, @UploadedFile() file: Express.Multer.File) {
        try {
            postData.created_by = req.tokenUser?.id;
            if (!postData?.name || !file || !postData?.created_by) {
                if (file && file.filename && file.fieldname === 'icon') {
                    await this.commonFileService.removeFileFromLocal(file.path);
                }
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let where = {name: postData?.name.trim(), status: Not(2)};
            if(req.tokenUser?.role_id != appConstant.ROLE.ADMIN){
                where['created_by'] = req.tokenUser?.id;
            }
            const formCheck = await this.myPlanPlansService.findOne(where,null,['name']);
            if (formCheck) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_PLAN_ALREADY_EXIST"));
            }
            let saveData = await this.myPlanPlansService.save({...postData});
            if (file && file.fieldname === 'icon' && file.filename) {
                file.originalname = this.commonFileService.formatFileName(file.originalname);
                file.filename = `myplans/${saveData['id'].toString()}/plans/${this.commonService.generateMD5(saveData['id'].toString().toString())}myplansl.${file.originalname.split('.')[file.originalname.split('.').length - 1]}`;
                await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(file.path),  filename: file.filename}));
                postData['icon'] = file.filename;
                await this.myPlanPlansService.update({ id: saveData['id'] },{icon: postData['icon']});
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
                destination: `${appConstant.PLANS_ICON_IMAGE_PATH}`,
                filename: fileName
            }),
            fileFilter: filesFilter
        }),
        AccessGuard
    )
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: UpdatePlansInput, @UploadedFile() file: Express.Multer.File) {
        try {
            if (!postData?.id) {
                if (file && file.filename && file.fieldname === 'icon') {
                    await this.commonFileService.removeFileFromLocal(file.path);
                }
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            if (postData?.name) {
                let where = {name: postData?.name.trim(), status: Not(2)};
                if(req.tokenUser?.role_id != appConstant.ROLE.ADMIN){
                    where['created_by'] = req.tokenUser?.id;
                }
                const formCheck = await this.myPlanPlansService.findOne(where,null,['name']);
                if (formCheck) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_PLAN_ALREADY_EXIST"));
                }
            }
            if (file && file.fieldname === 'icon' && file.filename) {
                file.originalname = this.commonFileService.formatFileName(file.originalname);
                file.filename = `myplans/${postData?.id.toString()}/plans/${this.commonService.generateMD5(postData?.id.toString().toString())}myplansl.${file.originalname.split('.')[file.originalname.split('.').length - 1]}`;
                await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(file.path),  filename: file.filename}));
                postData['icon'] = file.filename;
            }
            let where = `mp.id = ${postData?.id}`;
            if(req.tokenUser.role_id != appConstant.ROLE.ADMIN){
                where += ` AND map.org_id = '${postData?.org_id}'`;
            }
            const recordDetails = await this.myPlanPlansService.findOne({ id: postData?.id});
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
            await this.myPlanPlansService.update({ id: postData?.id },{...postData});
            this.activityLogService.create(recordDetails, postData, tableConstant.MY_PLAN.TBL_MP_PLANS, req.tokenUser?.id);
            let assignPlanData = await this.frontService.assignPlanData(['ap.id','ap.plan_id','ap.org_id'],{plan_id: postData?.id,status: Not('2')},null,null,'getMany');
            for (let i = 0; i < assignPlanData.length; i++) {
                let orgId = assignPlanData[i]['org_id'];
                let planId = assignPlanData[i]['plan_id'];
                let assignPlanId = assignPlanData[i]['id'];
                let dynamicData = Object.create(null);
                if(postData?.name){
                    let planName = `plan_name_${planId}_${orgId}`
                    dynamicData[`${planName}`]= postData?.name;
                }
                if(postData?.description){
                    let planDescription = `plan_description_${planId}_${orgId}`
                    dynamicData[`${planDescription}`]= postData?.description;
                }
                await this.translatorService.DynamicEngJsonData('MyPlan',orgId,dynamicData,'Add','MyPlan',assignPlanId);
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
    @UseGuards(AccessGuard)
    @Post('delete')
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: DeleteMyPlanInput) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            let where = {id: postData?.id};
            if(req.tokenUser?.role_id != appConstant.ROLE.ADMIN){
                where['created_by'] = req.tokenUser?.id;
            }
            const recordDetails = await this.myPlanPlansService.findOne(where);
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
            await this.myPlanPlansService.update({id: postData?.id},{status:2});
            this.activityLogService.create(recordDetails, {status:2}, tableConstant.MY_PLAN.TBL_MP_PLANS, req.tokenUser?.id, 'delete');
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
            if(req.tokenUser.role_id != appConstant.ROLE.ADMIN) {
                where['created_by'] = `${postData?.user_id || req?.tokenUser?.id}`;
            }
            let resultedData = await this.myPlanPlansService.findOne(where);
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
                await this.commonArrayService.formatToDto(MyPlanPlansDto, resultedData, req.lang)
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
            if (!postData?.org_id && !postData?.search_str) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let where: any = `mp.status = '1'`;
            const order = postData && postData?.order ? postData?.order : 'DESC';
            const orderBy = postData && postData?.order_by ? postData?.order_by : 'id';
            let result;
            if (req.tokenUser?.role_id != appConstant.ROLE.ADMIN && (!postData?.type || postData?.type != 1)) {
                where +=  ` AND mp.created_by = '${req.tokenUser?.id}'`;
            }
            if (postData?.org_id) {
                where += ` AND map.org_id = ${postData?.org_id} AND map.status = '1'`;
                result = await this.myPlanPlansService.listRecord(["mp.id","mp.name","map.id","map.name","map.startdate","map.enddate"],where, { [orderBy]: order },[tableConstant.MY_PLAN.TBL_MP_ASSIGN_PLAN],postData);
                result.unshift({id:0,name:'All Plans'});
                if(postData?.type && postData?.type == 1){
                    result = result.filter((item: any) => item.id != 0);
                }
            } else {
                where += ` AND mp.name LIKE '%${this.commonFileService.quoteEscaper(postData?.search_str)}%'`;
                result = await this.myPlanPlansService.listRecord(["mp.id","mp.name","mp.icon"],where, { [orderBy]: order });
            }
            result = <any>(
                await this.commonArrayService.formatToDto(MyPlanPlansDto, result, req.lang)
            );
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

    @UseGuards(AccessGuard)
    @Post('my-plan-report')
    async myPlanReport(@Req() req: Request, @Res() res: Response, @Body() postData: myPlanReportInput) {
        try {
            if (!postData.org_id || !postData.camp_id || !postData.user_role || !postData.membership_code) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            const userCheckExistWhereClause: FindOptionsWhere<UserEntity> = {membership_code: postData.membership_code,role_id: In([2,16])};
            let userExist: boolean = await this.userService.checkExists(userCheckExistWhereClause)
            if (!userExist) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_DATA_NOT_FOUND'));
            }

            let checkPlanExist: boolean = await this.myPlanPlansService.commonQueryBuilder([],`plans.status = '1' AND assignPlans.status = '1' AND assignPlans.org_id = ${postData.org_id}`,null,[{'join_table': 'plans.assignPlans','alias':'assignPlans', 'table' : tableConstant.MY_PLAN.TBL_MP_ASSIGN_PLAN, 'on_condition' : `assignPlans.plan_id = plans.id`, 'join_type': 'inner_one' },{'join_table': 'plans.assignRule','alias':'assignRule', 'table' : tableConstant.MY_PLAN.TBL_MP_ASSIGN_RULE, 'on_condition' : `plans.id = assignRule.plan_id AND assignRule.org_id = '${postData?.org_id}' AND assignRule.status = '1'`, 'join_type': 'left_many' },{'join_table': 'assignRule.businessRule','alias':'businessRule', 'table' : tableConstant.MY_PLAN.TBL_MP_BUSINESS_RULE, 'on_condition' : `businessRule.id = assignRule.rule_id AND businessRule.status = '1'`, 'join_type': 'left_one' },{'join_table': 'plans.joinUserPlan','alias':'joinUserPlan', 'table' : tableConstant.MY_PLAN.TBL_MP_JOIN_USER_PLAN, 'on_condition' : `joinUserPlan.plan_id = plans.id`, 'join_type': 'left_one' },{'join_table': 'plans.blocks','alias':'blocks', 'table' : tableConstant.MY_PLAN.TBL_MP_BLOCKS, 'on_condition' : `blocks.plan_id = plans.id AND blocks.status = '1'`, 'join_type': 'left_many' },{'join_table': 'blocks.assignBlock','alias':'assignBlock', 'table' : tableConstant.MY_PLAN.TBL_MP_ASSIGN_BLOCK, 'on_condition' : `assignBlock.block_id = blocks.id AND assignBlock.org_id = '${postData?.org_id}' AND assignBlock.status = '1'`, 'join_type': 'left_one' },{'join_table': 'blocks.completeBlock','alias':'completeBlock', 'table' : tableConstant.MY_PLAN.TBL_MP_COMPLETE_BLOCK, 'on_condition' : `completeBlock.block_id = blocks.id`, 'join_type': 'left_one' },{'join_table': 'blocks.planActivity','alias':'planActivity', 'table' : tableConstant.MY_PLAN.TBL_MP_ACTIVITY, 'on_condition' : `planActivity.block_id = blocks.id AND planActivity.status = '1' AND (planActivity.activity_id != '-1' OR planActivity.organization_id = '${postData?.org_id}')`, 'join_type': 'left_many' },{'join_table': 'planActivity.assignActivity','alias':'assignActivity', 'table' : tableConstant.MY_PLAN.TBL_MP_ASSIGN_ACTIVITY, 'on_condition' : `assignActivity.activity_id = planActivity.id AND assignActivity.status = '1' AND assignActivity.org_id = '${postData?.org_id}'`, 'join_type': 'left_one' },{'join_table': 'planActivity.activity','alias':'activity', 'table' : tableConstant.ACTIVITIES.TBL_ACTIVITIES, 'on_condition' : `planActivity.activity_id = activity.id`, 'join_type': 'left_one' },{'join_table': 'planActivity.completeActivity','alias':'completeActivity', 'table' : tableConstant.MY_PLAN.TBL_MP_COMPLETE_ACTIVITY, 'on_condition' : `completeActivity.custom_id = planActivity.id`, 'join_type': 'left_one' }],'getExists',{})
            if (!checkPlanExist) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_DATA_NOT_FOUND'));
            }
            let condition = {
                "location": postData.location || '',
                "department": postData.department || '',
                "country": postData.country ? `'${postData.country.split(',').map(c => c.trim()).join("','")}'` : '',
                "state": postData.state ? `'${postData.state.split(',').map(c => c.trim()).join("','")}'` : '',
                "city": postData.city ? `'${postData.city.split(',').map(c => c.trim()).join("','")}'` : '',
            }
            let userWhereClause = `User.role_id IN('2','16') AND User.status = '1' AND User.membership_code = '${postData?.membership_code}'`;
            if (postData.department) {
                userWhereClause += ` AND User.department_id IN(${condition.department})`
            }
            if (condition.location) {
                userWhereClause += ` AND User.location IN(${condition.location})`
            }
            if (condition.country) {
                userWhereClause += ` AND Location.country IN(${condition.country})`
            }
            if (condition.state) {
                userWhereClause += ` AND Location.state IN(${condition.state})`
            }
            if (condition.city) {
                userWhereClause += ` AND Location.city IN(${condition.city}) `
            }
            postData.condition = userWhereClause;
            let incentiveReportsWhereClause: FindOptionsWhere<IncentiveReportsEntity> = {camp_id: postData.camp_id,report_type: 'Myplan',condition: postData.condition,status: 0}
            if (this.commonService.isValidNumber(postData?.engagement_report) ) {
                incentiveReportsWhereClause['engagement_report'] = postData?.engagement_report
            }
            if (postData?.start_date_range && postData?.end_date_range) {
                incentiveReportsWhereClause['start_date_range'] = `${await this.commonDateService.DateTimeFormat(new Date(postData.start_date_range), 'YYYY-MM-DD')} 00:00:00`
                incentiveReportsWhereClause['end_date_range'] = `${await this.commonDateService.DateTimeFormat(new Date(postData.end_date_range), 'YYYY-MM-DD')} 00:00:00`
            }
            let incentiveReportsExist: boolean = await this.incentiveReportsService.checkExists(incentiveReportsWhereClause)
            if (incentiveReportsExist) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'MSG_PLAN_REPORT_IN_PROGRESS'));
            }
            postData.system_type = System_Type.NEW;
            postData.report_type = 'Myplan';
            postData.status = 0;
            postData.user_id = req?.tokenUser?.id;
            postData.request_date = new Date().toISOString();
            await this.incentiveReportsService.create(postData)
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang,'MSG_PLAN_REPORT_DOWNLOAD'),
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
    @Post('plan-report-paginate')
    async planReportPaginate(@Req() req: Request, @Res() res: Response, @Body() postData: planReportPaginateInput) {
        try {
            postData.role_id = postData.role_id || req.tokenUser?.role_id
            const paginationParams: PaginateDto = {
                page: postData?.page || 1,
                limit: postData?.limit || 10,
                orderBy: postData?.orderBy || 'id',
                order: postData?.order || 'ASC'
            }
            let result;
            if(req.tokenUser?.role_id == appConstant.ROLE.ADMIN){
                result = await this.incentiveReportsService.commonQueryBuilder(
                    ['incentiveReports.id','incentiveReports.org_id','incentiveReports.user_id','incentiveReports.request_date','incentiveReports.status','incentiveReports.file_name','incentiveReports.camp_id','incentiveReports.engagement_report','plans.id','plans.name','companies.company_name'],
                    {report_type: 'Myplan'},
                    {'incentiveReports.id': 'DESC'},
                    [
                        {
                            join_table: 'incentiveReports.plans',
                            alias: 'plans',
                            table: tableConstant.MY_PLAN.TBL_MP_PLANS,
                            on_condition: `FIND_IN_SET(plans.id, incentiveReports.camp_id) > 0 AND plans.status = '1'`,
                            join_type: 'left_many',
                        },
                        {
                            join_table: 'incentiveReports.companies',
                            alias: 'companies',
                            table: tableConstant.COMPANIES.TBL_COMPANY,
                            on_condition: `companies.id = incentiveReports.org_id AND companies.status = '1'`,
                            join_type: 'left_one',
                        },
                    ],
                    'getManyAndCount',
                    paginationParams,
                );
            } else {
                if (!postData.org_id) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
                }
                result = await this.incentiveReportsService.commonQueryBuilder(
                    ['incentiveReports.id','incentiveReports.org_id','incentiveReports.user_id','incentiveReports.request_date','incentiveReports.status','incentiveReports.file_name','incentiveReports.camp_id','incentiveReports.engagement_report','plans.id','plans.name'],
                    {org_id: postData.org_id,user_role: postData.role_id,report_type: 'Myplan'},
                    {'incentiveReports.id': 'DESC'},
                    [
                        {
                            join_table: 'incentiveReports.plans',
                            alias: 'plans',
                            table: tableConstant.MY_PLAN.TBL_MP_PLANS,
                            on_condition: `FIND_IN_SET(plans.id, incentiveReports.camp_id) > 0 AND plans.status = '1'`,
                            join_type: 'left_many',
                        }
                    ],
                    'getManyAndCount',
                    paginationParams,
                );
            }
            for (let i: number = 0; i < result['list'].length; i++) {
                result['list'][i]['plan'] = ''
                let labelStatus: string = ''
                if (result['list'][i]['status'] == 1) {
                    labelStatus = await this.translatorService.frontendReadTranslation(req.lang,'Completed', `/LC_MESSAGES/common/common`,`static`)
                } else {
                    labelStatus = await this.translatorService.frontendReadTranslation(req.lang,'In Progress', `/LC_MESSAGES/common/common`,`static`)
                }
                if (result['list'][i]?.camp_id == '0') {
                    result['list'][i]['plan'] = await this.translatorService.frontendReadTranslation(req.lang,'All Plans', `/LC_MESSAGES/common/common`,`static`);
                    if (result['list'][i]?.engagement_report == 1) {
                        result['list'][i]['plan'] = await this.translatorService.frontendReadTranslation(req.lang,'All - Engagement Report', `/LC_MESSAGES/common/common`,`static`);
                    }
                } else {
                    let planArray = []
                    for (let j: number = 0; j < result['list'][i]['plans'].length; j++) {
                        let plan = result['list'][i]['plans'][j]
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`plan_name_${plan['id']}_${postData?.org_id}`,`/LC_MESSAGES/MyPlan/MyPlan/${postData?.org_id}/${plan['id']}`,`dynamic`);
                        plan['name'] = (customName == '' || customName == `plan_name_${plan['id']}_${postData?.org_id}`) ? plan['name'] : customName;
                        planArray.push(plan.name)
                    }
                    result['list'][i]['plan'] = planArray.join(',').replace(/,\s*/g, ',\n')
                }
                result['list'][i]['label_status'] = labelStatus
                result['list'][i]['companies'] = result['list'][i]['companies']?.['company_name'] || ''
                result['list'][i]['file_name'] = result['list'][i]['file_name'] ? `reports/${result['list'][i]['file_name']}` : ``
            }
            result['list'] = <any>(
                await this.commonArrayService.formatToDto(PlanReportPaginateDto, result['list'], req.lang)
            );
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: result,
                message: 'success'
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
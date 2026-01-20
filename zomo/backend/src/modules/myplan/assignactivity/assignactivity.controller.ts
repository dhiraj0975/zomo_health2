import { appConstant, CommonArrayService, CommonDateService, CommonFileService, CommonService, MyPlanAssignActivityDto, tableConstant } from '@common-constants';
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
import * as moment from 'moment-timezone';
import * as path from 'path';
import { RateLimiterMiddleware } from 'src/middleware/rate-limiter.middleware';
import { In } from "typeorm";
import { AccessGuard, FileUploadRateLimitGuard, RoleGuard, TokenGuard } from '../../../guard';
import {
    CreateAssignActivityInput,
    DeleteAssignActivityInput,
    GetOneMyPlanInput, ListAssignPlanInput,
    UpdateAssignActivityInput
} from "../../../input";
import { ActivityLogService } from '../../master/activitylog/activitylog.service';
import { TranslationService } from "../../translation/translation.service";
import { UserService } from "../../user/user/user.service";
import { MyPlanBlocksService } from "../blocks/blocks.service";
import { MyPlanPlansService } from "../plans/plans.service";
import { MyPlanAssignActivityService } from './assignactivity.service';
@Controller('my-plan/assign-activity')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class MyPlanAssignActivityController {
    constructor(
        private readonly myPlanAssignActivityService: MyPlanAssignActivityService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonDateService: CommonDateService,
        private readonly commonFileService: CommonFileService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        private readonly myPlanBlocksService: MyPlanBlocksService,
        private readonly myPlanPlansService: MyPlanPlansService,
        private readonly userService: UserService,
    ) {}
    @Post('create')
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateAssignActivityInput) {
        try {
            if (!postData?.block_id || !postData?.plan_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            await this.myPlanAssignActivityService.save({...postData});
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
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
                  data: null,
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }
    @Put('update')
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: UpdateAssignActivityInput) {
        try {
            if (!postData?.id || !postData?.block_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let where = {id: postData?.id, block_id: postData?.block_id};
            if(postData?.org_id){
                where['org_id'] = postData?.org_id;
            }
            const recordDetails = await this.myPlanAssignActivityService.findOne(where);
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            await this.myPlanAssignActivityService.update({ id: postData?.id, block_id: postData?.block_id },{...postData});
            this.activityLogService.create(recordDetails, postData, tableConstant.MY_PLAN.TBL_MP_ASSIGN_ACTIVITY, req.tokenUser?.id);
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
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
                  data: null,
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }
    @Post('delete')
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: DeleteAssignActivityInput) {
        try {
            if (!postData?.id || !postData?.block_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            let where = {id: postData?.id, block_id: postData?.block_id};
            if(postData?.org_id){
                where['org_id'] = postData?.org_id;
            }
            const recordDetails = await this.myPlanAssignActivityService.findOne(where);
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            await this.myPlanAssignActivityService.update({id: postData?.id, block_id: postData?.block_id},{status:2});
            this.activityLogService.create(recordDetails, {status:2}, tableConstant.MY_PLAN.TBL_MP_ASSIGN_ACTIVITY, req.tokenUser?.id, 'delete');
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
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: GetOneMyPlanInput) {
        try {
            if (!postData?.id || !postData?.block_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let where = {id: postData?.id, block_id: postData?.block_id};
            if(postData?.org_id){
                where['org_id'] = postData?.org_id;
            }
            let resultedData = await this.myPlanAssignActivityService.findOne(where);
            resultedData = <any>(
                await this.commonArrayService.formatToDto(MyPlanAssignActivityDto, resultedData, req.lang)
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
            if (!postData?.org_id || !this.commonService.isValidNumber(postData?.plan_id)) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
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
            const order = postData?.order ?? 'ASC';
            const orderBy = postData?.order_by ?? 'id';
            let resultedData = await this.myPlanAssignActivityService.listRecord(where,["maa.id","maa.block_id","maa.name","ma.id","ma.activity_id","ma.module_id","ma.is_category","ma.org_activity_id","ac.id","ac.activity_name","acAge.id","acAge.activity_name","ep.id","ep.title","qz.id","qz.quiz_name","ql.id","ql.title","har.id","har.title","csc.id","csc.org_id","csc.custom_cname","eec.id","eec.category_name","ee.id","ee.event_name"], { [orderBy]: order },[tableConstant.MY_PLAN.TBL_MP_ACTIVITY,tableConstant.ACTIVITIES.TBL_ACTIVITIES,tableConstant.EMOTIONAL_WELLBEING.TBL_EM_POST,tableConstant.QUIZ.TBL_QZ_QUIZZES,tableConstant.QUICK_LINK.TBL_QUICK_LINK,tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_RESULTS,tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE,tableConstant.EVENTS.TBL_EV_EVENT_CATEGORY,tableConstant.EVENTS.TBL_EV_EVENTS]);
            await Promise.all(resultedData.map(async (ele) => {
                if(ele['csc']?.custom_cname){
                    let customName = await this.translatorService.frontendReadTranslation(req.lang,`custom_cname_${ele['csc']['id']}`, `/LC_MESSAGES/Challenge/MyChallenges/${ele['csc'].org_id}/${ele['csc']['id']}`,`dynamic`);
                    ele['csc'].custom_cname = (customName == '' || customName == `custom_cname_${ele['csc']['id']}`) ? ele['csc']['custom_cname'] : customName;
                }
                if(ele['csc']?.custom_desc){
                    let customName = await this.translatorService.frontendReadTranslation(req.lang,`custom_desc_${ele['csc']['id']}`, `/LC_MESSAGES/Challenge/MyChallenges/${ele['csc'].org_id}/${ele['csc']['id']}`,`dynamic`);
                    ele['csc'].custom_desc = (customName == '' || customName == `custom_desc_${ele['csc']['id']}`) ? ele['csc']['custom_desc'] : customName;
                }
            }));
            let responseData = resultedData.reduce((acc, {name, ma}) => {
                name = (name && name.trim() !== '') ? name : '';
                    if (!acc.find(obj => obj.name === name)) {
                        if (ma?.ac?.id) {
                            let finalName = name || ma?.ac?.activity_name;
                            if (!acc.find(obj => obj.name === finalName)) {
                                acc.push({id: ma?.id,name: finalName});
                            }
                        }
                        switch (ma?.module_id) {
                            case 1:
                                if (ma?.ee?.id && ma?.is_category === 0) {
                                    let finalName = name || ma?.ee?.event_name;
                                    if (!acc.find(obj => obj.name === finalName)) {
                                        acc.push({id: ma?.id,name: finalName});
                                    }
                                }
                                if (ma?.eec?.id && ma?.is_category === 1) {
                                    let finalName = name || ma?.eec?.category_name;
                                    if (!acc.find(obj => obj.name === finalName)) {
                                        acc.push({id: ma?.id,name: finalName});
                                    }
                                }
                                break;
                            case 2:
                                if (ma?.har?.id) {
                                    let finalName = name || ma?.har?.title;
                                    if (!acc.find(obj => obj.name === finalName)) {
                                        acc.push({id: ma?.id,name: finalName});
                                    }
                                }
                                break;
                            case 3:
                                if (ma?.acAge?.id) {
                                    let finalName = name || ma?.acAge?.activity_name;
                                    if (!acc.find(obj => obj.name === finalName)) {
                                        acc.push({id: ma?.id,name: finalName});
                                    }
                                }
                                break;
                            case 4:
                                if (ma?.csc?.id) {
                                    let finalName = name || ma?.csc?.custom_cname;
                                    if (!acc.find(obj => obj.name === finalName)) {
                                        acc.push({id: ma?.id,name: finalName});
                                    }
                                }
                                break;
                            case 5:
                                if (ma?.ql?.id) {
                                    let finalName = name || ma?.ql?.title;
                                    if (!acc.find(obj => obj.name === finalName)) {
                                        acc.push({id: ma?.id,name: finalName});
                                    }
                                }
                                break;
                            case 6:
                                if (ma?.qz?.id) {
                                    let finalName = name || ma?.qz?.quiz_name;
                                    if (!acc.find(obj => obj.name === finalName)) {
                                        acc.push({id: ma?.id,name: finalName});
                                    }
                                }
                                break;
                            case 7:
                                let hraName = name || appConstant.HRA_DATA[ma?.org_activity_id];
                                if (!acc.find(obj => obj.name === hraName)) {
                                    acc.push({id: ma?.id,name: hraName});
                                }
                                break;
                            case 8:
                                let bioName = name || appConstant.BIO_DATA[ma?.org_activity_id];
                                if (!acc.find(obj => obj.name === bioName)) {
                                    acc.push({id: ma?.id,name: bioName});
                                }
                                break;
                            case 9:
                                if (ma?.ep?.id) {
                                    let finalName = name || ma?.ep?.title;
                                    if (!acc.find(obj => obj.name === finalName)) {
                                        acc.push({id: ma?.id,name: finalName});
                                    }
                                } else if (ma?.org_activity_id == '0' && !acc.find(obj => obj.name === 'All Emotional Well-Being')) {
                                    acc.push({id: ma?.id,name: 'All Emotional Well-Being'});
                                }
                                break;
                        }
                    }
                return acc;
            }, []);
           return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: responseData,
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
    @Post('custom-completion')
    @UseGuards(FileUploadRateLimitGuard)
    async customCompletion(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        const rateLimiter = new RateLimiterMiddleware();
        await rateLimiter.use(req, res, async () => {
            try {
                if (!postData?.org_id || !this.commonService.isValidNumber(postData?.plan_id)) {
                    throw new Error(this.translatorService.translate(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
                }
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
                const order = postData?.order ?? 'ASC';
                const orderBy = postData?.order_by ?? 'block_id';
                let resultedData = await this.myPlanAssignActivityService.listRecord(where,["maa.id","maa.block_id","maa.name","ma.id","ma.activity_id","ma.module_id","ma.is_category","ma.org_activity_id","ac.id","ac.activity_name","acAge.id","acAge.activity_name","ep.id","ep.title","qz.id","qz.quiz_name","ql.id","ql.title","har.id","har.title","csc.id","csc.org_id","csc.custom_cname","eec.id","eec.category_name","ee.id","ee.event_name"], { [orderBy]: order },[tableConstant.MY_PLAN.TBL_MP_ACTIVITY,tableConstant.ACTIVITIES.TBL_ACTIVITIES,tableConstant.EMOTIONAL_WELLBEING.TBL_EM_POST,tableConstant.QUIZ.TBL_QZ_QUIZZES,tableConstant.QUICK_LINK.TBL_QUICK_LINK,tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_RESULTS,tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE,tableConstant.EVENTS.TBL_EV_EVENT_CATEGORY,tableConstant.EVENTS.TBL_EV_EVENTS]);
                let responseData = resultedData.reduce((acc, {name, ma}) => {
                    name = (name && name.trim() !== '') ? name : '';
                        if (!acc.find(obj => obj.name === name)) {
                            if (ma?.ac?.id) {
                                let finalName = name || ma?.ac?.activity_name;
                                if (!acc.find(obj => obj.name === finalName)) {
                                    acc.push({id: ma?.id,name: finalName});
                                }
                            }
                            switch (ma?.module_id) {
                                case 1:
                                    if (ma?.ee?.id && ma?.is_category === 0) {
                                        let finalName = name || ma?.ee?.event_name;
                                        if (!acc.find(obj => obj.name === finalName)) {
                                            acc.push({id: ma?.id,name: finalName});
                                        }
                                    }
                                    if (ma?.eec?.id && ma?.is_category === 1) {
                                        let finalName = name || ma?.eec?.category_name;
                                        if (!acc.find(obj => obj.name === finalName)) {
                                            acc.push({id: ma?.id,name: finalName});
                                        }
                                    }
                                    break;
                                case 2:
                                    if (ma?.har?.id) {
                                        let finalName = name || ma?.har?.title;
                                        if (!acc.find(obj => obj.name === finalName)) {
                                            acc.push({id: ma?.id,name: finalName});
                                        }
                                    }
                                    break;
                                case 3:
                                    if (ma?.acAge?.id) {
                                        let finalName = name || ma?.acAge?.activity_name;
                                        if (!acc.find(obj => obj.name === finalName)) {
                                            acc.push({id: ma?.id,name: finalName});
                                        }
                                    }
                                    break;
                                case 4:
                                    if (ma?.csc?.id) {
                                        let finalName = name || ma?.csc?.custom_cname;
                                        if (!acc.find(obj => obj.name === finalName)) {
                                            acc.push({id: ma?.id,name: finalName});
                                        }
                                    }
                                    break;
                                case 5:
                                    if (ma?.ql?.id) {
                                        let finalName = name || ma?.ql?.title;
                                        if (!acc.find(obj => obj.name === finalName)) {
                                            acc.push({id: ma?.id,name: finalName});
                                        }
                                    }
                                    break;
                                case 6:
                                    if (ma?.qz?.id) {
                                        let finalName = name || ma?.qz?.quiz_name;
                                        if (!acc.find(obj => obj.name === finalName)) {
                                            acc.push({id: ma?.id,name: finalName});
                                        }
                                    }
                                    break;
                                case 7:
                                    let hraName = name || appConstant.HRA_DATA[ma?.org_activity_id];
                                    if (!acc.find(obj => obj.name === hraName)) {
                                        acc.push({id: ma?.id,name: hraName});
                                    }
                                    break;
                                case 8:
                                    let bioName = name || appConstant.BIO_DATA[ma?.org_activity_id];
                                    if (!acc.find(obj => obj.name === bioName)) {
                                        acc.push({id: ma?.id,name: bioName});
                                    }
                                    break;
                                case 9:
                                    if (ma?.ep?.id) {
                                        let finalName = name || ma?.ep?.title;
                                        if (!acc.find(obj => obj.name === finalName)) {
                                            acc.push({id: ma?.id,name: finalName});
                                        }
                                    } else if (ma?.org_activity_id == '0' && !acc.find(obj => obj.name === 'All Emotional Well-Being')) {
                                        acc.push({id: ma?.id,name: 'All Emotional Well-Being'});
                                    }
                                    break;
                            }
                        }
                    return acc;
                }, []);
                let activityName = responseData.map(item => item.name);
                let userData = await this.userService.listRecord({org_id: postData?.org_id,role_id: In([2,16]),status: '1'},{ 'user.username': "ASC" },['user.id','user.first_name','user.middle_name','user.last_name','user.role_id','user.employeeid','user.dob','user.on_insurance_plan','user.email','settings.jobtitle','settings.wphone','settings.hphone','company.company_name','department.dept_name','location.location_name','location.address1','location.address2','location.city','location.state','location.country','location.zip','company_settings.spouse_option']);
                let jsonData = []
                let customCompletionData = appConstant.CUSTOM_COMPLETION_DATA
                for (let i = 0; i < userData.length; i++) {
                    const user = userData[i];
                    const role = user.role_id == 2 ? 'Register' : (user?.['company_settings']?.['spouse_option'] == 1 ? 'Spouse / Domestic Partner' : 'Spouse');
                    let userdataObj = {
                        [customCompletionData[0]] : user['company']?.['company_name'],
                        [customCompletionData[1]] : user.id,
                        [customCompletionData[2]] : user['department']?.['dept_name'],
                        [customCompletionData[3]] : user.first_name,
                        [customCompletionData[4]] : user.middle_name,
                        [customCompletionData[5]] : user.last_name,
                        [customCompletionData[6]] : role,
                        [customCompletionData[7]] : user['settings']?.['jobtitle'],
                        [customCompletionData[8]] : user.employeeid,
                        [customCompletionData[9]] : await this.commonDateService.DateTimeFormat(user.dob,"MM-DD-YYYY", "YYYY-MM-DD HH:mm:ss"),
                        [customCompletionData[10]] : user.on_insurance_plan,
                        [customCompletionData[11]] : user.email,
                        [customCompletionData[12]] : user['settings']?.['wphone'],
                        [customCompletionData[13]] : user['settings']?.['hphone'],
                        [customCompletionData[14]] : user['location']?.['location_name'] ?? '',
                        [customCompletionData[15]] : user['location']?.['address1'] ?? '',
                        [customCompletionData[16]] : user['location']?.['address2'] ?? '',
                        [customCompletionData[17]] : user['location']?.['city'] ?? '',
                        [customCompletionData[18]] : user['location']?.['state'] ?? '',
                        [customCompletionData[19]] : user['location']?.['country'] ?? '',
                        [customCompletionData[20]] : user['location']?.['zip'] ?? '',
                    };
                    let activityNameObj = Object.fromEntries(activityName.map(key => [key, '']));
                    userdataObj = {...userdataObj, ...activityNameObj}
                    jsonData.push(userdataObj);
                }
                const jsonString = JSON.stringify(jsonData, null, 2);
                let fileName:string = `${moment().format('YYYY-MM-DD_HH_mm_ss')}_custompoint.json`;
                let filePath:string = path.join(`${appConstant.COMPLETE_ACTIVITY_FILE_PATH}`);
                await this.commonFileService.dirIsExist(`${appConstant.COMPLETE_ACTIVITY_FILE_PATH}`);
                let data;
                try {
                    let writeFile = await this.commonFileService.writeFile(filePath, jsonString, fileName);
                    if (writeFile?.status == 'success') {
                        let excelData: any = await this.commonFileService.createJsonToFile(1, `${filePath}/${fileName}`, 'pythonjsontoxlsx.py');
                        if (excelData?.status == 'success') {
                            filePath = `${filePath}/${fileName}`.replace(".json",".xlsx");
                            if (await this.commonFileService.fileExist(filePath)) {
                                data = await this.commonFileService.FileToBase64(filePath);
                            } else {
                                throw new Error(`File does not exist 1`);
                            }
                        }
                    } else {
                        throw new Error(`File does not exist 2`);
                    }
                } catch(err) {
                    throw new Error(`An error occurred: ${err}`);
                }
                fileName = fileName.replace(".json","");
                await this.commonFileService.removeFileFromLocal(`${filePath}/${fileName}.json`);
                await this.commonFileService.removeFileFromLocal(`${filePath}/${fileName}.xlsx`);
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: {excel_data: data,sheet_name: fileName, extension: 'xlsx'},
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
    });
    }
}
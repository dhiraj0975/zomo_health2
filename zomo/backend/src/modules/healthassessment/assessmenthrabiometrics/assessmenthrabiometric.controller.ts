import { appConstant, AssessmentHraBiometricDto, CommonArrayService, CommonDateService, CommonService, tableConstant } from '@common-constants';
import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Post, Put,
    Req,
    Res,
    UseGuards,
} from "@nestjs/common";
import { Request, Response } from "express";
import { ActivityLogService } from "src/modules/master/activitylog/activitylog.service";
import { Like, Not } from "typeorm";
import { AccessGuard, RoleGuard, TokenGuard } from "../../../guard";
import { CreateAssessmentHraBiometricInput, PaginateWithHealthAssessmentInput } from "../../../input";
import { ActivityService } from '../../activity/activity/activity.service';
import { TranslationService } from "../../translation/translation.service";
import { UserService } from "../../user/user/user.service";
import { AssessmentHraBiometricService } from "./assessmenthrabiometric.service";
@Controller('health-assessment/hra-biometrics')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class AssessmentHraBiometricController {
    constructor(
        private readonly assessmentHraBiometricsService: AssessmentHraBiometricService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonDateService: CommonDateService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        private readonly activityService: ActivityService,
        private readonly userService: UserService,
    ) {
    }
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithHealthAssessmentInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let where = `healthassessment.id !=0 `;
            if(postData?.user_id){
                where +=`AND healthassessment.user_id = '${postData?.user_id}`;
            }
            if (postData?.search_str) {
                where += `AND(healthassessment.activity_id LIKE '%${postData?.search_str}%' OR healthassessment.alc LIKE '%${postData?.search_str}%')`;
            }
            const resultedData = await this.assessmentHraBiometricsService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(AssessmentHraBiometricDto, resultedData['list'], req.lang)
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
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id && (!postData?.user_id || !postData?.date)) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = { id: postData?.id, status: Not(2) };
            if (postData?.user_id) {
                where['user_id'] = postData?.user_id;
            }
            if (postData?.date) {
                where['date'] = Like('%' + await this.commonDateService.DateTimeFormat(new Date(postData?.date), 'YYYY-MM-DD') + '%')
            }
            let biometricDetails: any = await this.assessmentHraBiometricsService.findOne(where);
            if (postData?.user_id) {
                let userData = await this.userService.findUserRecord({id: postData?.user_id},['id','first_name','middle_name','last_name','username']);
                biometricDetails = biometricDetails ?? {};
                biometricDetails['user'] = userData
            }
            biometricDetails = <any>(
                await this.commonArrayService.formatToDto(AssessmentHraBiometricDto, biometricDetails, req.lang)
            );
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: biometricDetails,
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
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateAssessmentHraBiometricInput) {
        try {
            if (
                !postData?.user_id ||
                !postData?.activity_id ||
                !postData?.weight_source ||
                !postData?.bp_source ||
                !postData?.test_type ||
                !postData?.blood_glucose_source ||
                !postData?.alc ||
                !postData?.atriskldl ||
                !postData?.cholestrol_source ||
                !postData?.source ||
                !postData?.date
            ) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            await this.assessmentHraBiometricsService.save(postData);
            return res.status(HttpStatus.CREATED).json({
                statusCode: 201,
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
    @Post('delete')
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = {id: postData?.id, status: Not(2)};
            const recordDetails = await this.assessmentHraBiometricsService.findOne(where);
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
            await this.assessmentHraBiometricsService.update(where,{status: 2});
            this.activityLogService.create(recordDetails, {activity_id: recordDetails}, tableConstant.HEALTH_ASSESSMENT.TBL_HA_HRABIOMETRICS, req.tokenUser?.id, 'delete');
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: 'Success : Your Biometrics data was successfully saved ',
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
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: CreateAssessmentHraBiometricInput) {
        try {
            if ((req.tokenUser?.role_id == appConstant.ROLE.ADMIN || appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER == req.tokenUser?.role_id) && !postData?.user_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let message = await this.translatorService.frontendReadTranslation(req.lang, "SUCCESS_BIOMETRICS_DATA");
            let activityIdArray = [];
            const activities = {
                "HS-User Upload - BMI": () => postData?.weight && (postData?.weight != '' && postData?.height_ft != ''),
                "HS-User Upload - Total Cholesterol": () => postData?.total_cholesterol && postData?.total_cholesterol != '',
                "HS-User Upload - HDL": () => postData?.hdl && postData?.hdl != '',
                "HS-User Upload - LDL": () => postData?.ldl && postData?.ldl != '',
                "HS-User Upload - Triglycerides": () => postData?.triglycerides && postData?.triglycerides != '',
                "HS-User Upload - Glucose or AC1": () => postData?.blood_glucose && postData?.alc && (postData?.blood_glucose != '' || postData?.alc != '' || postData?.alc !== null),
                "HS-User Upload - Blood Pressure": () => postData?.bp_systolic && postData?.bp_diastolic && (postData?.bp_systolic != '' || postData?.bp_diastolic != '')
            };
            for (const [activityName, condition] of Object.entries(activities)) {
                if (condition()) {
                    let activityCheck = await this.activityService.activityFindOne({activity_name: activityName, status: Not('2')},['id'],{ id: 'ASC' });
                    if (activityCheck) {
                        activityIdArray.push(activityCheck.id);
                    }
                }
            }
            if (req.tokenUser?.role_id == appConstant.ROLE.ADMIN || appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER == req.tokenUser?.role_id) {
                postData.weight_source = 1;
                postData.bp_source = 1;
                postData.blood_glucose_source = 1;
                postData.cholestrol_source = 1;
                postData.body_fat_source = 1;
                postData.measurement_source = 1;
                if (postData?.weight || postData?.bp_systolic || postData?.bp_diastolic || postData?.blood_glucose || postData?.total_cholesterol) {
                    postData.source = 2;
                }
                const messageGroups = [
                    { message: await this.translatorService.frontendReadTranslation(req.lang, "SUCCESS_BIOMETRICS_MEASUREMENTS"), keys: ["arm", "calve", "hip", "leg", "waist"] },
                    { message: await this.translatorService.frontendReadTranslation(req.lang, "SUCCESS_BIOMETRICS_BODY_FAT"), keys: ["body_fat"] },
                    { message: await this.translatorService.frontendReadTranslation(req.lang, "SUCCESS_BIOMETRICS_CHOLESTEROL"), keys: ["hdl", "ldl", "total_cholesterol", "triglycerides"] },
                    { message: await this.translatorService.frontendReadTranslation(req.lang, "SUCCESS_BIOMETRICS_BLOOD_GLUCOSE"), keys: ["alc", "blood_glucose"] },
                    { message: await this.translatorService.frontendReadTranslation(req.lang, "SUCCESS_BIOMETRICS_BLOOD_PRESSURE"), keys: ["bp_diastolic", "bp_systolic"] },
                    { message: await this.translatorService.frontendReadTranslation(req.lang, "SUCCESS_BIOMETRICS_WEIGHT_HEIGHT"), keys: ["weight"] },
                ];
                const getMessage = (postData, messageGroups) => {
                    const postDataKeys = Object.keys(postData);
                    const matchingGroup = messageGroups.find(group =>
                        postDataKeys.some(key => group.keys.includes(key))
                    );
                    return matchingGroup ? matchingGroup.message : message;
                };
                message = getMessage(postData, messageGroups);
            } else {
                postData.weight_source = 0;
                postData.bp_source = 0;
                postData.blood_glucose_source = 0;
                postData.cholestrol_source = 0;
                postData.body_fat_source = 0;
                postData.measurement_source = 0;
                postData.source = 14;
            }
            postData.activity_id = activityIdArray.join(",");
            if (postData?.date) {
                postData.date = (await this.commonDateService.DateTimeFormat(new Date(postData?.date), 'YYYY-MM-DD')).toString();
            } else {
                postData.date = (await this.commonDateService.DateTimeFormat(new Date(), 'YYYY-MM-DD')).toString();
            }
            let where = {date: Like('%' + postData?.date + '%'), status: Not(2)};
            if (postData?.user_id) {
                where['user_id'] = postData?.user_id
            }
            postData.alc = postData?.alc ?? '';
            const recordDetails = await this.assessmentHraBiometricsService.findOne(where);
            if (!recordDetails) {
                await this.assessmentHraBiometricsService.save(postData);
            } else {
                await this.assessmentHraBiometricsService.update(where, postData);
            }
            this.activityLogService.create(recordDetails, postData, tableConstant.HEALTH_ASSESSMENT.TBL_HA_HRABIOMETRICS, req.tokenUser?.id);
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
    @Post('list')
    async list(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            const where = { status: Not(2)};
            let resultedData = await this.assessmentHraBiometricsService.listRecord(where,null,[],[tableConstant.TBL_USERS]);
            resultedData = <any>(
                await this.commonArrayService.formatToDto(AssessmentHraBiometricDto, resultedData, req.lang)
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
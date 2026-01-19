import { CommonArrayService, CommonDateService, CommonHealthService, CommonService, FtBiometricsDto, tableConstant } from '@common-constants';
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
import * as moment from "moment";
import { AssessmentHraBiometricService } from "src/modules/healthassessment/assessmenthrabiometrics/assessmenthrabiometric.service";
import { BiometricsService } from "src/modules/healthcheckup/biometrics/biometrics.service";
import { ActivityLogService } from "src/modules/master/activitylog/activitylog.service";
import { AccessGuard, RoleGuard, TokenGuard } from "../../../guard";
import { TranslationService } from "../../translation/translation.service";
import { PaginateWithFoodInput } from '../input';
import { FtBiometricsService } from "./biometrics.service";
import { CreateFtBiometricsInput } from './input';
@Controller('tracker/biometrics')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class FtBiometricsController {
    constructor(
        private readonly biometricsService: FtBiometricsService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonDateService: CommonDateService,
        private readonly commonHealthService: CommonHealthService,
        private readonly translatorService: TranslationService,
        private readonly assessmentHraBiometricsService: AssessmentHraBiometricService,
        private readonly hcBiometricsService: BiometricsService,
        private readonly activityLogService: ActivityLogService,
    ) {
    }
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithFoodInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let where = `food.status != 2 `;
            if(postData?.type){
                where +=`AND food.type = '${postData?.type} `;
            }
            if(postData?.user_id){
                where +=`AND food.user_id = '${postData?.user_id} `;
            }
            if (postData?.search_str) {
                where += `AND(food.weight LIKE '%${postData?.search_str}%' OR food.hdl LIKE '%${postData?.search_str}%')`;
            }
            const resultedData = await this.biometricsService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(FtBiometricsDto, resultedData['list'], req.lang)
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
            let biometricDetails = await this.biometricsService.findOne(where);
            if (!biometricDetails) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }
            biometricDetails = <any>(
                await this.commonArrayService.formatToDto(FtBiometricsDto, biometricDetails, req.lang)
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
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateFtBiometricsInput) {
        try {
            if (
                !postData?.user_id ||
                !postData?.type
            ) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            postData['added_date'] = postData?.added_date ?  this.commonDateService.getTodayDate(postData?.added_date).format('YYYY-MM-DD hh:mm:ss'): this.commonDateService.getTodayDate().format('YYYY-MM-DD hh:mm:ss');
            postData['updated_date'] = postData?.added_date;
            postData['postData?.added_date'] = 1;
            await this.biometricsService.save(postData);
            return res.status(HttpStatus.CREATED).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, 'SUCCESS_ACTIVITY_LOG'),
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
            const where = {id: postData?.id};
            const recordDetails = await this.biometricsService.findOne(where);
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
            await this.biometricsService.update(where,{status: 2});
            this.activityLogService.create(recordDetails, {status:2}, tableConstant.TRACKERS.TBL_FT_BIOMETRICS, req.tokenUser?.id, 'delete');
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, 'DELETE_ACTIVITY_LOG'),
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
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: CreateFtBiometricsInput) {
        try {
            if (
                !postData?.id
            ) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = {id: postData?.id};
            const recordDetails = await this.biometricsService.findOne(where);
            if (!recordDetails) {
                await this.biometricsService.save(
                    postData
                );
            }
            await this.biometricsService.update(where, postData);
            this.activityLogService.create(recordDetails, postData, tableConstant.TRACKERS.TBL_FT_BIOMETRICS, req.tokenUser?.id);
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, 'UPDATE_ACTIVITY_LOG'),
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
            postData['user_id'] = postData?.user_id ?? req.tokenUser?.id;
            let where = `food.user_id = ${postData?.user_id} AND food.status = 1`;
            let hcWhere = `hb.user_id = ${postData?.user_id} AND hb.status = 1`
            let hraWhere = `healthassessment.user_id = ${postData?.user_id} AND healthassessment.status = 1`;
            if(postData?.collect_date){
                postData.from_date = moment(postData?.collect_date?.start_date).format('YYYY-MM-DD') || moment().format('YYYY-MM-DD');
                postData.to_date = moment(postData?.collect_date?.end_date).format('YYYY-MM-DD') || moment().format('YYYY-MM-DD');
            }
            if(postData?.from_date && postData?.from_date != '' && postData?.to_date && postData?.to_date != '') {
                let start_date = moment(postData?.from_date).format('YYYY-MM-DD');
                let end_date = moment(postData?.to_date).format('YYYY-MM-DD');
                where += ` AND food.added_date BETWEEN '${start_date} 00:00:00' AND '${end_date} 23:59:59'`;
                hcWhere += ` AND hb.created BETWEEN '${start_date} 00:00:00' AND '${end_date} 23:59:59' `;
                hraWhere += ` AND healthassessment.date BETWEEN '${start_date} 00:00:00' AND '${end_date} 23:59:59'`;
            }
            let resultedftData = await this.biometricsService.listRecord(where);
            let resultedHcData = await this.hcBiometricsService.biometricsListRecord(hcWhere);
            let resultedHraData = await this.assessmentHraBiometricsService.listRecord(hraWhere);
            let Fweight = [], Fblood_pressure = [], Fcholesterol = [], Fblood_glucose = [];
            let i = 0, j = 0, k = 0, l = 0;
            for (let element of resultedftData) {
                let monthName = await this.translatorService.frontendReadTranslation(req.lang, moment(element.added_date).format('MMMM'), `/LC_MESSAGES/Common/Month`,`static`);
                monthName = monthName.toString().substring(0, 3);
                if (element.type === 1) {
                Fweight[i] = {
                    weight: element.weight,
                    height_ft: element.height_in == '12' && element.height_ft !== '8' ? element.height_ft + 1 : element.height_ft,
                    height_in: element.height_in,
                    date: monthName + ' ' + this.commonDateService.getTodayDate(element.added_date).format('D, YYYY'),
                    date_copy: await this.commonDateService.DateTimeFormat(element.added_date, 'MMMM DD, YYYY'),
                    id: element.id,
                    bmi: element.weight ? this.commonHealthService.bmiCalculator(parseFloat(element.weight), parseFloat(element.height_in == '12' && element.height_ft !== '8' ? element.height_ft + 1 : element.height_ft), parseFloat(element.height_in)) : 0
                };
                i++;
                } else if (element.type === 2) {
                Fblood_pressure[j] = {
                    systolic: element.systolic,
                    diastolic: element.diastolic,
                    date: monthName + ' ' + this.commonDateService.getTodayDate(element.added_date).format('D, YYYY'),
                    date_copy: await this.commonDateService.DateTimeFormat(element.added_date, 'MMMM DD, YYYY'),
                    id: element.id
                };
                j++;
                } else if (element.type === 3) {
                Fcholesterol[k] = {
                    chol_total: element.chol_total,
                    hdl: element.hdl,
                    ldl: element.ldl,
                    triglycerides: element.triglycerides,
                    date: monthName + ' ' + this.commonDateService.getTodayDate(element.added_date).format('D, YYYY'),
                    date_copy: await this.commonDateService.DateTimeFormat(element.added_date, 'MMMM DD, YYYY'),
                    id: element.id
                };
                k++;
                } else if (element.type === 4) {
                Fblood_glucose[l] = {
                    glucose_type: element?.glucose_type == 1 ? 'Random' : 'Fasting',
                    glucose_time: element?.glucose_time?.split('_').length === 3 ? `${element?.glucose_time.split('_')[0]}:${element?.glucose_time.split('_')[1]} ${element?.glucose_time.split('_')[2]}` : element?.glucose_time,
                    glucose: element.glucose,
                    medication: element.medication,
                    date: monthName + ' ' + this.commonDateService.getTodayDate(element.added_date).format('D, YYYY'),
                    date_copy: await this.commonDateService.DateTimeFormat(element.added_date, 'MMMM DD, YYYY'),
                    id: element.id
                };
                l++;
                }
            };
            for (let element of resultedHraData) {
                let monthName = await this.translatorService.frontendReadTranslation(req.lang, moment(element.date).format('MMMM'), `/LC_MESSAGES/Common/Month`,`static`);
                monthName = monthName.toString().substring(0, 3);
                if (element.weight !== '' && element.weight !== null) {
                    Fweight[i] = {
                        weight: element.weight,
                        height_ft: element.height_in === 12 && element.height_ft !== 8 ? element.height_ft + 1 : element.height_ft,
                        height_in: element.height_in,
                        date: monthName + ' ' + this.commonDateService.getTodayDate(element.date).format('D, YYYY'),
                        date_copy: await this.commonDateService.DateTimeFormat(element.date, 'MMMM DD, YYYY'),
                        bmi: element.weight ? this.commonHealthService.bmiCalculator(parseFloat(element.weight), parseFloat(element.height_in == '12' && element.height_ft !== '8' ? element.height_ft + 1 : element.height_ft), parseFloat(element.height_in)) : 0
                    };
                    i++;
                } 
                if (element.bp_systolic !== '' && element.bp_systolic !== null) {
                    Fblood_pressure[j] = {
                        systolic: element.bp_systolic,
                        diastolic: element.bp_diastolic,
                        date: monthName + ' ' + this.commonDateService.getTodayDate(element.date).format('D, YYYY'),
                        date_copy: await this.commonDateService.DateTimeFormat(element.date, 'MMMM DD, YYYY'),
                    };
                    j++;
                } 
                if (element.total_cholesterol !== '' && element.total_cholesterol !== null) {
                    Fcholesterol[k] = {
                        chol_total: element.total_cholesterol,
                        hdl: element.hdl,
                        ldl: element.ldl,
                        triglycerides: element.triglycerides,
                        date: monthName + ' ' + this.commonDateService.getTodayDate(element.date).format('D, YYYY'),
                        date_copy: await this.commonDateService.DateTimeFormat(element.date, 'MMMM DD, YYYY'),
                    };
                    k++;
                } 
                if (element.blood_glucose !== '' && element.blood_glucose !== null) {
                    Fblood_glucose[l] = {
                        glucose_type: element?.test_type == 1 ? 'Random' : 'Fasting',
                        glucose_time: '',
                        glucose: element.blood_glucose,
                        medication: '',
                        date: monthName + ' ' + this.commonDateService.getTodayDate(element.date).format('D, YYYY'),
                        date_copy: await this.commonDateService.DateTimeFormat(element.date, 'MMMM DD, YYYY'),
                    };
                    l++;
                }
            };
            for (let element of resultedHcData){
                let monthName = await this.translatorService.frontendReadTranslation(req.lang, moment(element.created).format('MMMM'), `/LC_MESSAGES/Common/Month`,`static`);
                monthName = monthName.toString().substring(0, 3);
                if (element.weight !== '' && element.weight !== null) {
                    Fweight[i] = {
                        weight: element.weight,
                        height_ft: element.height.split(':')[1] === '12' && element.height.split(':')[0] !== '8' ? parseInt(element.height.split(':')[0]) + 1 : parseInt(element.height.split(':')[0]),
                        height_in: element.height.split(':')[1] || null,
                        date: monthName + ' ' + this.commonDateService.getTodayDate(element.created).format('D, YYYY'),
                        date_copy: await this.commonDateService.DateTimeFormat(element.created, 'MMMM DD, YYYY'),
                        bmi: element.weight ? this.commonHealthService.bmiCalculator(parseFloat(element.weight), element.height.split(':')[1] === '12' && element.height.split(':')[0] !== '8' ? parseInt(element.height.split(':')[0]) + 1 : parseInt(element.height.split(':')[0]), element.height.split(':')[1] || 0) : 0
                    };
                    i++;
                } 
                if (element.systolic !== '' && element.systolic !== null) {
                    Fblood_pressure[j] = {
                        systolic: element.systolic,
                        diastolic: element.diastolic,
                        date: monthName + ' ' + this.commonDateService.getTodayDate(element.created).format('D, YYYY'),
                        date_copy: await this.commonDateService.DateTimeFormat(element.created, 'MMMM DD, YYYY'),
                    };
                    j++;
                } 
                if (element.total_cholesterol !== '' && element.total_cholesterol !== null) {
                    Fcholesterol[k] = {
                        chol_total: element.total_cholesterol,
                        hdl: element.hdl,
                        ldl: element.ldl,
                        triglycerides: element.triglycerides,
                        date: monthName + ' ' + this.commonDateService.getTodayDate(element.created).format('D, YYYY'),
                        date_copy: await this.commonDateService.DateTimeFormat(element.created, 'MMMM DD, YYYY'),
                    };
                    k++;
                } 
                if (element.blood_glucose !== '' && element.blood_glucose !== null) {
                    Fblood_glucose[l] = {
                        glucose_type: element?.test_type == 1 ? 'Random' : 'Fasting',
                        glucose_time: '',
                        glucose: element.blood_glucose,
                        medication: '',
                        date: monthName + ' ' + this.commonDateService.getTodayDate(element.created).format('D, YYYY'),
                        date_copy: await this.commonDateService.DateTimeFormat(element.created, 'MMMM DD, YYYY'),
                    };
                    l++;
                }
            };
            Fweight = this.commonService.dynamicSort(Fweight, (a, b) => this.commonDateService.getTodayDate(b.date_copy).unix() - this.commonDateService.getTodayDate(a.date_copy).unix());
            Fblood_pressure = this.commonService.dynamicSort(Fblood_pressure, (a, b) => this.commonDateService.getTodayDate(b.date_copy).unix() - this.commonDateService.getTodayDate(a.date_copy).unix());
            Fcholesterol = this.commonService.dynamicSort(Fcholesterol, (a, b) => this.commonDateService.getTodayDate(b.date_copy).unix() - this.commonDateService.getTodayDate(a.date_copy).unix());
            Fblood_glucose = this.commonService.dynamicSort(Fblood_glucose, (a, b) => this.commonDateService.getTodayDate(b.date_copy).unix() - this.commonDateService.getTodayDate(a.date_copy).unix());
            let current_weight = 0;
            let weight_difference = 0;
            if(Fweight && Fweight.length){
                current_weight = Fweight[0]['weight'];
                weight_difference =  Fweight[1] ? current_weight - Fweight[1]['weight'] : 0;
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: {current_weight, weight_difference, weight: Fweight, blood_pressure: Fblood_pressure, cholesterol : Fcholesterol, blood_glucose: Fblood_glucose},
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
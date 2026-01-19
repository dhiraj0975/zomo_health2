import { appConstant, BodyFeedsDto, CommonArrayService, CommonDateService, CommonHealthService, CommonService, tableConstant } from '@common-constants';
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
import { Not } from "typeorm";
import { AccessGuard, RoleGuard, TokenGuard } from "../../../guard";
import { TranslationService } from "../../translation/translation.service";
import { PaginateWithFoodInput } from '../input';
import { BodyFeedService } from "./bodyfeeds.service";
import { CreateBodyFeedsInput } from './input';
@Controller('tracker/body-feeds')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class BodyFeedsController {
    constructor(
        private readonly bodyFeedsService: BodyFeedService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonDateService: CommonDateService,
        private readonly commonHealthService: CommonHealthService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
    ) {
    }
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithFoodInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            postData.user_id = postData?.user_id ?? req.tokenUser?.id;
            let where = `food.id !=0 AND food.status = 1 `;
            if(postData?.user_id){
                where +=`AND food.user_id = '${postData?.user_id} `;
            }
            if(postData?.method){
                where +=`AND food.method = '${postData?.method} `;
            }
            if (postData?.search_str) {
                where += `AND(food.name LIKE '%${postData?.search_str}%' OR food.userName LIKE '%${postData?.search_str}%')`;
            }
            const resultedData = await this.bodyFeedsService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(BodyFeedsDto, resultedData['list'], req.lang)
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
            postData.user_id = postData?.user_id ?? req.tokenUser?.id;
            const where = { id: postData?.id, status: Not(2) };
            if(postData?.user_id){
                where['user_id'] = postData?.user_id;
            }
            if(postData?.method){
                where['method'] = postData?.method;
            }
            let bodyFeedDetails = await this.bodyFeedsService.findOne(where);
            if (!bodyFeedDetails) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }
            bodyFeedDetails = <any>(
                await this.commonArrayService.formatToDto(BodyFeedsDto, bodyFeedDetails, req.lang)
            );
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: bodyFeedDetails,
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
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateBodyFeedsInput) {
        try {
            postData['logType'] = postData?.logType ?? 'Manual';
            if (
                !postData?.user_id ||
                !postData?.measurementUnit ||
                !postData?.method
            ) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            postData['date'] = postData?.date ?  this.commonDateService.getTodayDate(postData?.date).format('YYYY-MM-DD hh:mm:ss'): this.commonDateService.getTodayDate().format('YYYY-MM-DD hh:mm:ss');
            postData['added_date'] = postData?.date
            //removed for ticket 507
            // if(postData?.measurementUnit == '2'){
            //     if(postData?.chest){
            //         postData['chest'] = postData?.chest * 0.393701;
            //     }
            //     if(postData?.abdominal){
            //         postData['abdominal'] = postData?.abdominal * 0.393701;
            //     }
            //     if(postData?.thigh){
            //         postData['thigh'] = postData?.thigh * 0.393701;
            //     }
            //     if(postData?.tricep){
            //         postData['tricep'] = postData?.tricep * 0.393701;
            //     }
            // }
            await this.bodyFeedsService.save(postData);
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
            const where = {id: postData?.id, status: Not(2)};
            const recordDetails = await this.bodyFeedsService.findOne(where);
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
            await this.bodyFeedsService.update(where,{status: 2});
            this.activityLogService.create(recordDetails, {username: recordDetails}, tableConstant.TRACKERS.TBL_FT_BODY_FEEDS, req.tokenUser?.id, 'delete');
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
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: CreateBodyFeedsInput) {
        try {
            if (
                !postData?.id
            ) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = {id: postData?.id, status: Not(2)};
            const recordDetails = await this.bodyFeedsService.findOne(where);
            postData['measurementUnit'] = postData?.measurementUnit ?? recordDetails.measurementUnit;
            //removed for ticket 507
            // if(postData?.measurementUnit != recordDetails.measurementUnit){
            //     if(postData?.measurementUnit == '2'){
            //         if(postData?.chest){
            //             postData['chest'] = postData?.chest * 0.393701;
            //         }
            //         if(postData?.abdominal){
            //             postData['abdominal'] = postData?.abdominal * 0.393701;
            //         }
            //         if(postData?.thigh){
            //             postData['thigh'] = postData?.thigh * 0.393701;
            //         }
            //         if(postData?.tricep){
            //             postData['tricep'] = postData?.tricep * 0.393701;
            //         }
            //     }
            // }
            if(postData?.date){
                postData['date'] = this.commonDateService.getTodayDate(postData?.date).format('YYYY-MM-DD hh:mm:ss');
            }
            await this.bodyFeedsService.update(where, postData);
            this.activityLogService.create(recordDetails, postData, tableConstant.TRACKERS.TBL_FT_BODY_FEEDS, req.tokenUser?.id);
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
            postData.user_id = postData?.user_id ?? req.tokenUser?.id;
            const where = { status: Not(2)};
            if(postData?.user_id){
                where['user_id'] = postData?.user_id;
            }
            if(postData?.method){
                where['method'] = postData?.method;
            }
            let resultedData = await this.bodyFeedsService.listRecord(where);
            resultedData = <any>(
                await this.commonArrayService.formatToDto(BodyFeedsDto, resultedData, req.lang)
            );
            let graphData = await this.graphStat(postData?.user_id, postData?.method ?? 3, req)
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: {listdata: resultedData, ...graphData},
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
    async graphStat(user_id: number, method: number, req: Request) {
        try {
            let where = {user_id : user_id, method : method, status: Not(2)};
            let resultedData = await this.bodyFeedsService.listRecord(where, { 'bf.date': 'ASC' }, ['age','weight','method','date','chest','abdominal','thigh','tricep','subscapular','suprailiac','midaxillary']);
            let data = [];
            for(let element of resultedData){
                if(!element['gender']){
                    element['gender'] = req.tokenUser?.gender;
                }
                let formattedDate = this.commonDateService.getTodayDate(element.date);
                const monthName = this.commonDateService.DateTimeFormat(formattedDate, 'MMMM');
                const translatedMonth = await this.translatorService.frontendReadTranslation(req.lang, monthName.toString(), `/LC_MESSAGES/Common/Month`, `static`);
                element['date'] = `${translatedMonth.toString().substring(0, 3)} ${this.commonDateService.DateTimeFormat(formattedDate, 'D, YYYY')}`;
                data = [...data,this.commonHealthService.calculateBodyFat(element)];
            }            
            return {chartData: appConstant.BODYFATCHARTDATA, fatData: data ? data.sort((a, b) => a.fatPercentage - b.fatPercentage) : []};
        } catch (error) {
            throw new Error(await this.translatorService.frontendReadTranslation(req.lang, error.message));
        }
    }
}
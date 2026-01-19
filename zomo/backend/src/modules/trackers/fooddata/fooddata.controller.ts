import { CommonArrayService, CommonFileService, CommonService, FoodDataDto } from '@common-constants';
import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Inject,
    Post,
    Req,
    Res,
    UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Request, Response } from "express";
import { lastValueFrom } from 'rxjs';
import { TranslationService } from 'src/modules/translation/translation.service';
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import { ActivityLogService } from "../../master/activitylog/activitylog.service";
import { PaginateWithFoodInput } from '../input';
import {Not} from "typeorm";
@Controller('tracker/food-data')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class FoodDataController {
    constructor(
        @Inject('FOOD_SERVICE')
        private client: ClientProxy,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
    ) {}
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithFoodInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let where = `food.NDB_No !=0 `;
            if(postData?.NDB_No){
                where +=`AND food.NDB_No = '${postData?.NDB_No}' `;
            }
            if (postData?.search_str) {
                where += `AND(food.Long_Desc LIKE '${this.commonFileService.quoteEscaper(postData?.search_str)}%')`;
            }
            const paginateObj = this.commonArrayService.getPaginationVar(
                postData?.page || 1,
                postData?.limit,
            );
            const order = postData && postData?.order ? postData?.order : 'DESC';
            const orderBy = postData && postData?.order_by ? postData?.order_by : 'food.NDB_No';
            let foodRequests = await lastValueFrom(this.client.send({ cmd: 'paginate_food_description' }, {condition: where, order, orderBy, paginate: paginateObj}));
            if (foodRequests.length === 0) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            foodRequests['list'] = <any>(await this.commonArrayService.formatToDto(FoodDataDto, foodRequests['list'], req.lang));
            if(foodRequests['list'] && foodRequests['list'].length){
                await Promise.all(foodRequests['list'].map(async (ele)=>{
                    if(ele.Long_Desc){
                        let NDBNo: number = Number(ele?.NDB_No)
                        let customeName = await this.translatorService.frontendReadTranslation(req.lang,`${ele.Long_Desc}`, `/LC_MESSAGES/Trackers/Nutrition/${NDBNo}`,`dynamic`);
                        ele.Long_Desc = (customeName == '' || customeName == `${ele.Long_Desc}`) ? ele.Long_Desc : customeName;
                    }
                }));
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: foodRequests,
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
            if (!postData?.NDB_No) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = { NDB_No: postData?.NDB_No };
            let foodRequests = await lastValueFrom(this.client.send({ cmd: 'get_one_food_description' }, where));
            if (!foodRequests) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            foodRequests = <any>(await this.commonArrayService.formatToDto(FoodDataDto, foodRequests, req.lang));
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: foodRequests,
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
    async getList(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            let where = "NDB_No != 0";
            if (postData?.search_str) {
                where += ` AND food.Long_Desc LIKE '${this.commonFileService.quoteEscaper(postData.search_str)}%'`;
            }
            let foodRequests = await lastValueFrom(this.client.send({ cmd: 'list_food_description' }, where));
            if (!foodRequests) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            foodRequests = <any>(await this.commonArrayService.formatToDto(FoodDataDto, foodRequests, req.lang));
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: foodRequests,
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

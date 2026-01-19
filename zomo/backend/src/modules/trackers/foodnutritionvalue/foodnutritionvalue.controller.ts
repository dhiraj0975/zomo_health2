import { CommonArrayService, CommonService, FoodNutritionValuesDto, tableConstant } from '@common-constants';
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
import { FoodNutritionValuesService } from "./foodnutritionvalue.service";
import { CreateFoodNutritionInput } from './input';
@Controller('tracker/food-nutrition-values')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class FoodNutritionValuesController {
    constructor(
        private readonly foodFeedsService: FoodNutritionValuesService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
    ) {
    }
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithFoodInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let where = `food.id !=0 AND food.status = 1 `;
            if(postData?.user_id){
                where +=`AND food.user_id = '${postData?.user_id} `;
            }
            if(postData?.foodId){
                where +=`AND food.foodId = '${postData?.foodId} `;
            }
            if (postData?.search_str) {
                where += `AND(food.name LIKE '%${postData?.search_str}%' OR food.userName LIKE '%${postData?.search_str}%')`;
            }
            const resultedData = await this.foodFeedsService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(FoodNutritionValuesDto, resultedData['list'], req.lang)
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
            const where = { id: postData?.id, status: Not(2) };
            let biometricDetails = await this.foodFeedsService.findOne(where);
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
                await this.commonArrayService.formatToDto(FoodNutritionValuesDto, biometricDetails, req.lang)
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
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateFoodNutritionInput) {
        try {
            if (
                !postData?.user_id ||
                !postData?.userName ||
                !postData?.logType ||
                !postData?.appName ||
                !postData?.logId ||
                !postData?.foodUnit ||
                !postData?.amount ||
                !postData?.NDB_No ||
                !postData?.Long_Desc ||
                !postData?.Nutr_No ||
                !postData?.NutrDesc ||
                !postData?.NutrVal ||
                !postData?.logDate ||
                !postData?.collectionDate 
            ) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            await this.foodFeedsService.save(postData);
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
            const recordDetails = await this.foodFeedsService.findOne(where);
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
            await this.foodFeedsService.update(where,{status: 2});
            this.activityLogService.create(recordDetails, {foodUnit: recordDetails}, tableConstant.TRACKERS.TBL_FT_FOOD_NUTRITION_VALUES, req.tokenUser?.id, 'delete');
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
                  data: null,
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }
    @Put('update')
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: CreateFoodNutritionInput) {
        try {
            if (
                !postData?.id
            ) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = {id: postData?.id, status: Not(2)};
            const recordDetails = await this.foodFeedsService.findOne(where);
            if (!recordDetails) {
                await this.foodFeedsService.save(
                    postData
                );
            }
            await this.foodFeedsService.update(where, postData);
            this.activityLogService.create(recordDetails, postData, tableConstant.TRACKERS.TBL_FT_FOOD_NUTRITION_VALUES, req.tokenUser?.id);
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
                  data: null,
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }
    @Post('list')
    async list(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            const where = { status: Not(2) };
            let resultedData = await this.foodFeedsService.listRecord(where);
            resultedData = <any>(
                await this.commonArrayService.formatToDto(FoodNutritionValuesDto, resultedData, req.lang)
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
}
import { CommonArrayService, CommonDateService, CommonService, FoodFeedsDto, tableConstant } from '@common-constants';
import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Inject,
    Post, Put,
    Req,
    Res,
    UseGuards,
} from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { Request, Response } from "express";
import { lastValueFrom } from 'rxjs';
import { ScheduleChallengeService } from "src/modules/challenge/schedulechallenge/schedulechallenge.service";
import { ActivityLogService } from "src/modules/master/activitylog/activitylog.service";
import { Not } from "typeorm";
import { AccessGuard, RoleGuard, TokenGuard } from "../../../guard";
import { TranslationService } from "../../translation/translation.service";
import { FoodNutritionValuesService } from "../foodnutritionvalue/foodnutritionvalue.service";
import { PaginateWithFoodInput } from '../input';
import { FoodFeedService } from "./foodfeeds.service";
import { CreateFoodFeedsInput, ListFoodFeedsInput } from './input';
@Controller('tracker/food-feeds')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class FoodFeedsController {
    constructor(
        @Inject('FOOD_SERVICE')
        private client: ClientProxy,
        private readonly foodFeedsService: FoodFeedService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonDateService: CommonDateService,
        private readonly translatorService: TranslationService,
        private readonly foodNutritionValueService: FoodNutritionValuesService,
        private readonly activityLogService: ActivityLogService,
        private readonly scheduleChallengeService: ScheduleChallengeService
    ) {
    }
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithFoodInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let where = `food.id !=0 AND food.status = 1 `;
            if(postData?.user_id){
                where +=`AND food.user_id = 'let {postData?.user_id} `;
            }
            if(postData?.foodId){
                where +=`AND food.foodId = 'let {postData?.foodId} `;
            }
            if(postData['collect_date']){
                where += ` AND(food.logDate Between '${this.commonDateService.getTodayDate(postData['collect_date']['start_date']).format('YYYY-MM-DD')}' AND '${this.commonDateService.getTodayDate(postData['collect_date']['end_date']).format('YYYY-MM-DD')}' OR food.collectionDate Between '${this.commonDateService.getTodayDate(postData['collect_date']['start_date']).format('YYYY-MM-DD')}' AND '${this.commonDateService.getTodayDate(postData['collect_date']['end_date']).format('YYYY-MM-DD')}')`;
            }
            if (postData?.search_str) {
                where += `AND(food.name LIKE '%let {postData?.search_str}%' OR food.userName LIKE '%let {postData?.search_str}%')`;
            }
            const resultedData = await this.foodFeedsService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(FoodFeedsDto, resultedData['list'], req.lang)
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
            if(!postData?.id){
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
                await this.commonArrayService.formatToDto(FoodFeedsDto, biometricDetails, req.lang)
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
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateFoodFeedsInput) {
        try {
            postData['appName'] = postData?.appName ?? 'User Entry';
            postData['user_id'] = postData?.user_id ?? req.tokenUser?.id;
            postData['userName'] = postData?.userName ?? req.tokenUser?.username;
            postData['appId'] = postData?.appId ?? '';
            postData['logType'] = postData?.logType ?? 'Manual';
            postData['logId'] = postData?.logId ?? 0;
            postData['foodId'] = postData?.foodId ?? '0';
            postData['mealTypeId'] = postData?.mealTypeId ? postData?.mealTypeId : postData?.name == 'Sleep' ? 8 : 0;
            postData['locale'] = postData?.locale ?? '';
            postData['calories'] = postData?.calories ?? 0;
            postData['carbs'] = postData?.carbs ?? 0;
            postData['fat'] = postData?.fat ?? 0;
            postData['fiber'] = postData?.fiber ?? 0;
            postData['protein'] = postData?.protein ?? 0;
            postData['sodium'] = postData?.sodium ?? 0;
            postData['water'] = postData?.water ?? 0;
            postData['logDate'] = postData?.logDate ? this.commonDateService.getTodayDate(postData?.logDate).format('YYYY-MM-DD')  : this.commonDateService.getTodayDate().format('YYYY-MM-DD');
            postData['collectionDate'] = postData?.logDate;
            postData['isFavorite'] = postData?.isFavorite ?? '';
            postData['accessLevel'] = postData?.accessLevel ?? '';
            switch (postData?.activityTypeId){
                case 19:
                  postData['activityType'] = 'Activity Tracker- Sleep';
                break;
                case 18:
                     postData['activityType'] = 'Activity Tracker- Swimming';
                break;
                case 17:
                     postData['activityType'] = 'Activity Tracker- Cycling';
                break;
                case 16:
                     postData['activityType'] = 'Activity Tracker- Running';
                break;
                case 15:
                     postData['activityType'] = 'Activity Tracker- Walking';
                break;
                case 10:
                     postData['activityType'] = 'Water Tracker';
                break;
                case 7:
                     postData['activityType'] = 'Activity Tracker';
                break;
                case 6:
                     postData['activityType'] = 'Food Tracker';
                break;
                case 20:
                     postData['activityType'] = 'Heart Rate';
                break;
                default:
                  postData['activityType'] = postData?.activityType;
           }
            if (
                !postData?.user_id ||
                !postData?.userName ||
                !postData?.appId ||
                !postData?.logType ||
                !postData?.appName ||
                (postData?.logId == undefined || postData?.logId == null),
                !postData?.foodId ||
                !postData?.locale ||
                !postData?.mealTypeId ||
                !postData?.name ||
                (postData?.calories == undefined || postData?.calories == null),
                (postData?.carbs == undefined || postData?.carbs == null),
                (postData?.fat == undefined || postData?.fat == null),
                (postData?.fiber == undefined || postData?.fiber == null),
                (postData?.protein == undefined || postData?.protein == null),
                (postData?.sodium == undefined || postData?.sodium == null),
                (postData?.water == undefined || postData?.water == null),
                (postData?.amount == undefined || postData?.amount == null),
                !postData?.foodUnit ||
                !postData?.activityTypeId ||
                !postData?.activityType 
            ) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            if(postData?.name == 'Water'|| postData?.activityTypeId == 10){ 
                switch (postData?.foodUnit){
                     case "cup":
                       postData['water'] = postData?.amount * 8;
                     break;
                     case "ml":
                          postData['water'] = postData?.amount * 0.033814;
                     break;
                     default:
                       postData['water'] = postData?.amount;
                }
            }
            if(postData?.activityTypeId == 19){
                let sleepLog = await this.foodFeedsService.listRecord({user_id: postData?.user_id, activityTypeId: postData?.activityTypeId, collectionDate: postData?.collectionDate, status: Not(2)});
                let hours = (postData?.water ?? 0 ) * 60;
                let minutes = postData?.amount;
                await Promise.all(sleepLog.map((ele)=>{
                    hours = hours + (ele.water * 60);
                    minutes = minutes + ele.amount;
                }));
                let completedMinute = hours + minutes;
                let requiredMinutes = 1440; // 24 hours in minutes
                if(postData?.challenge_id){
                    let challengeDetails:any = await this.scheduleChallengeService.findChallenge({ id: postData?.challenge_id, status: Not(2) }, ['id', 'custom_cname', 'numberofsteps', 'dailymaxstepscnt']);
                    if(challengeDetails){
                        challengeDetails = challengeDetails[0];
                        let chTotalHours = challengeDetails?.['numberofsteps'] || 0;
                        let chTotalminute = challengeDetails?.['dailymaxstepscnt'] || 0;
                        requiredMinutes = (chTotalHours * 60) + chTotalminute; // Convert hours to minutes
                    }
                }
                if (completedMinute > requiredMinutes) {
                    let hours = 0;
                    let minutes = 0;
                    await Promise.all(sleepLog.map((ele)=>{
                        hours = hours + (ele.water * 60);
                        minutes = minutes + ele.amount;
                    }));
                    let totalMinutes = (hours + minutes);
                    let returnMsg = totalMinutes == 1440 ? `${await this.translatorService.frontendReadTranslation(req.lang, "Error")}! ${await this.translatorService.frontendReadTranslation(req.lang, "Already completed 24 hours for the day")}` : `${await this.translatorService.frontendReadTranslation(req.lang, "Error")}! ${await this.translatorService.frontendReadTranslation(req.lang, "You have Remain")} ${ await this.commonDateService.convertToHoursAndMinutes(1440 - totalMinutes,req)}`;
                    if(postData?.challenge_id){
                        returnMsg = totalMinutes >= requiredMinutes ? `${await this.translatorService.frontendReadTranslation(req.lang, "Error")}! ${await this.translatorService.frontendReadTranslation(req.lang, "Already completed")}` : `${await this.translatorService.frontendReadTranslation(req.lang, "Error")}! ${await this.translatorService.frontendReadTranslation(req.lang, "You have Remain")} ${ await this.commonDateService.convertToHoursAndMinutes(requiredMinutes - totalMinutes,req)}`;
                    }
                    return res.status(HttpStatus.BAD_REQUEST).json({
                        statusCode: 200,
                        success: 0,
                        error: 1,
                        data: null,
                        message: returnMsg
                    });
                }
            }
            let savedResult = await this.foodFeedsService.save(postData);
            let NutCalories =	0;
            let NutFats = 0;
            let NutFiber = 0;
            let NutCarbs = 0;
            let NutSodium = 0;
            let NutProtein = 0;	
            let NutWater = 0;	
            if(postData?.activityTypeId == 6){
                let foodLogQty = postData?.amount;
                let foodWeight = await lastValueFrom(this.client.send({ cmd: 'get_one_weight' }, { NDB_No : postData?.foodId, Msre_Desc: postData?.foodUnit}));
                let foodData = await lastValueFrom(this.client.send({ cmd: 'get_one_food_description' }, `food.NDB_No = '${postData?.foodId}'`));
                if(foodWeight && foodData){
                    let foodWeightIs = foodWeight.Gm_Wgt;
                    const nutritionValuesCount = foodData?.nutrition?.length;
                    if (nutritionValuesCount > 0) {
                        for (let ele of foodData.nutrition) {
                            const NutritionValue = foodLogQty * ((foodWeightIs * ele.Nutr_Val) / 100);
                            const NutritionNDB = foodData.NDB_No;
                            const NutritionLongDesc = foodData.Long_Desc;
                            const NutritionNutrNo = ele.Nutr_No;
                            const NutritionNutrDesc = ele.nutrition_def.NutrDesc;
                            // Example of using Sequelize for insert (modify as per your models)
                            await this.foodNutritionValueService.save({
                            user_id: postData?.user_id,
                            userName: postData?.userName,
                            logType: 'Manual',
                            appName: 'User Entry',
                            foodUnit: postData?.foodUnit,
                            logId: savedResult['id'],
                            amount: foodLogQty,
                            NDB_No: NutritionNDB,
                            Long_Desc: NutritionLongDesc,
                            Nutr_No: NutritionNutrNo,
                            NutrDesc: NutritionNutrDesc,
                            NutrVal: NutritionValue,
                            logDate: postData?.logDate,
                            collectionDate: postData?.logDate
                            });
                            if (NutritionNutrDesc === 'Fatty acids, total monounsaturated' ||
                                NutritionNutrDesc === 'Fatty acids, total polyunsaturated' ||
                                NutritionNutrDesc === 'Fatty acids, total saturated' ||
                                NutritionNutrDesc === 'Fatty acids, total trans' ||
                                NutritionNutrDesc === 'Fatty acids, total trans-monoenoic' ||
                                NutritionNutrDesc === 'Fatty acids, total trans-polyenoic') {
                                NutFats += foodLogQty * ((foodWeightIs * ele.Nutr_Val) / 100);
                            }
                            if (NutritionNutrDesc === 'Fiber, total dietary') {
                                NutFiber += foodLogQty * ((foodWeightIs * ele.Nutr_Val) / 100);
                            }
                            if (NutritionNutrDesc === 'Carbohydrate, by difference') {
                                NutCarbs += foodLogQty * ((foodWeightIs * ele.Nutr_Val) / 100);
                            }
                            if (NutritionNutrDesc === 'Sodium, Na') {
                                NutSodium += foodLogQty * ((foodWeightIs * ele.Nutr_Val) / 100);
                            }
                            if (NutritionNutrDesc === 'Protein') {
                                NutProtein += foodLogQty * ((foodWeightIs * ele.Nutr_Val) / 100);
                            }
                            if (NutritionNutrDesc === 'Water') {
                            }
                            if (NutritionNutrDesc === 'Calories') {
                            }
                        }
                        await this.foodFeedsService.update({id: savedResult['id']},{
                            calories : NutCalories,
                            carbs: NutCarbs,
                            fat: NutFats,
                            fiber: NutFiber,
                            protein: NutProtein,
                            water: (NutWater * 0.0338140225589),
                            sodium: NutSodium
                        });
                    }
                }
            }
            return res.status(HttpStatus.CREATED).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, "SUCCESS_ACTIVITY_LOG")
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
    @Post('food-tracker')
    async trackerFunction(@Req() req: Request, @Res() res: Response, @Body() postData: CreateFoodFeedsInput) {
        try {
            let message = 'success';
            if (postData?.action == 'WaterLog') {
                if (!postData?.foodUnit || !postData?.amount) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
                postData.user_id = postData?.user_id ?? req.tokenUser?.id;
                postData.userName = req.tokenUser?.username;
                postData.collectionDate = postData.logDate = await this.commonDateService.DateTimeFormat(new Date(postData?.logDate),'YYYY-MM-DD').toString() || await this.commonDateService.DateTimeFormat(new Date(),'YYYY-MM-DD').toString();
                postData.activityType = 'Water Tracker';
                postData.activityTypeId = 10;
                postData.name = 'Water';
                postData.appName = 'User Entry';
                postData.logType = 'Manual';
                switch (postData?.foodUnit) {
                    case "cup":
                        postData.water	=	postData?.amount * 8;
                        break;
                    case "ml":
                        postData.water	=	postData?.amount * 0.033814;
                        break;
                    default:
                        postData.water = postData?.amount;
                }
                await this.foodFeedsService.save({...postData});
                message = await this.translatorService.frontendReadTranslation(req.lang,"SUCCESS_ACTIVITY_LOG")
            }
            return res.status(HttpStatus.CREATED).json({
                statusCode: 201,
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
            this.activityLogService.create(recordDetails, {name: recordDetails}, tableConstant.TRACKERS.TBL_FT_FOOD_FEEDS, req.tokenUser?.id, 'delete');
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
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: CreateFoodFeedsInput) {
        try {
            if (
                !postData?.id
            ) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            delete postData?.foodId;
            const where = {id: postData?.id, status: Not(2)};
            let NutCalories =	0;
            let NutFats = 0;
            let NutFiber = 0;
            let NutCarbs = 0;
            let NutSodium = 0;
            let NutProtein = 0;	
            let NutWater = 0;	
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
            if((postData?.name == 'Water' || recordDetails.name == 'Water') && (postData?.amount != recordDetails?.amount || postData?.water != recordDetails?.water || postData?.foodUnit != recordDetails?.foodUnit)){ 
                switch (postData?.foodUnit){
                case "cup":
                    postData['water'] = postData?.amount * 8;
                    break;
                case "ml":
                    postData['water'] = postData?.amount * 0.033814;
                    break;
                default:
                    postData['water'] = postData?.amount;
                }
            }
            let nutritionValueRecords = await this.foodNutritionValueService.listRecord({logId: postData?.id, status: Not(2)});
            for (let ele of nutritionValueRecords) {
                if (ele.NutrDesc === 'Fatty acids, total monounsaturated' ||
                    ele.NutrDesc === 'Fatty acids, total polyunsaturated' ||
                    ele.NutrDesc === 'Fatty acids, total saturated' ||
                    ele.NutrDesc === 'Fatty acids, total trans' ||
                    ele.NutrDesc === 'Fatty acids, total trans-monoenoic' ||
                    ele.NutrDesc === 'Fatty acids, total trans-polyenoic') {
                    NutFats =  NutFats + (postData?.amount *  ele.NutrVal);
                }
                if (ele.NutrDesc === 'Fiber, total dietary') {
                    NutFiber = NutFiber + (postData?.amount *  ele.NutrVal);
                }
                if (ele.NutrDesc === 'Carbohydrate, by difference') {
                    NutCarbs = NutCarbs + (postData?.amount *  ele.NutrVal);
                }
                if (ele.NutrDesc === 'Sodium, Na') {
                    NutSodium = NutSodium + (postData?.amount *  ele.NutrVal);
                }
                if (ele.NutrDesc === 'Protein') {
                    NutProtein = NutProtein + (postData?.amount *  ele.NutrVal);
                }
                if (ele.NutrDesc === 'Water') {
                    NutWater = NutWater + (postData?.amount *  ele.NutrVal);
                }
                if (ele.NutrDesc === 'Calories') {
                }
            }
            NutWater = (NutWater * 0.03381402255891948) + postData['water'] || recordDetails?.water;
            if(postData?.name == 'Sleep' || postData?.activityTypeId == 19) { 
                let sleepLog = await this.foodFeedsService.listRecord({user_id: recordDetails.user_id, activityTypeId: recordDetails.activityTypeId, collectionDate: postData?.collectionDate, status: Not(2)});
                let hours = (postData?.water ?? 0 ) * 60;
                let minutes = postData?.amount;
                await Promise.all(sleepLog?.filter((ele)=> ele.id != recordDetails?.id)?.map((ele)=>{
                    hours = hours + (ele.water * 60);
                    minutes = minutes + ele.amount;
                }));
                let totalHours = ((hours + minutes) / 60);
                if (totalHours > 24) {
                    let hours = 0;
                    let minutes = 0;
                    await Promise.all(sleepLog.map((ele)=>{
                        hours = hours + (ele.water * 60);
                        minutes = minutes + ele.amount;
                    }));
                    let totalMinutes = (hours + minutes);
                    let message ='';
                    if(totalMinutes >= 1440){
                        message = `${await this.translatorService.frontendReadTranslation(req.lang,'Error!')} ${await this.translatorService.frontendReadTranslation(req.lang, "Already completed 24 hours for the day")}`;
                    }
                    else{
                        message = `${await this.translatorService.frontendReadTranslation(req.lang,'Error!')} ${await this.translatorService.frontendReadTranslation(req.lang, "You have Remain")} ${await this.commonDateService.convertToHoursAndMinutes(1440 - totalMinutes,req)}`;
                    }
                    return res.status(HttpStatus.BAD_REQUEST).json({
                        statusCode: 200,
                        success: 0,
                        error: 1,
                        data: null,
                        message: message
                    });
                }
            }
            postData['mealTypeId'] = postData?.mealTypeId ?? recordDetails.mealTypeId;
            postData['name'] = postData?.name ?? recordDetails.name;
            postData['amount'] = postData?.amount ?? recordDetails.amount;
            postData['foodUnit'] = postData?.foodUnit ?? recordDetails.foodUnit;
            postData['water'] = postData['water'] == 0 ? 0 : NutWater;
            postData['calories'] = NutCalories;
            postData['carbs'] = NutCarbs;
            postData['fat'] = NutFats;
            postData['fiber'] = NutFiber;
            postData['protein'] = NutProtein;
            postData['sodium'] = NutSodium;
            await this.foodFeedsService.update(where, postData);
            this.activityLogService.create(recordDetails, postData, tableConstant.TRACKERS.TBL_FT_FOOD_FEEDS, req.tokenUser?.id);
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
    async list(@Req() req: Request, @Res() res: Response, @Body() postData: ListFoodFeedsInput) {
        try {
            let user_id = postData?.user_id ?? req.tokenUser?.id;
            let logDate = postData?.logDate ? this.commonDateService.getTodayDate(postData?.logDate).format('YYYY-MM-DD') :  this.commonDateService.getTodayDate().format('YYYY-MM-DD');
            let where = postData['collect_date'] ? `food.user_id = '${user_id}' AND food.status = 1` : `food.user_id = ${user_id} AND food.logDate = '${logDate}' AND food.status = 1`;
            if(postData?.mealTypeId != undefined || postData?.mealTypeId != null){
                where += ` AND food.mealTypeId = ${postData?.mealTypeId}`;
            }
            if(postData?.name){
                where += ` AND food.name = '${postData?.name}'`;
            }
            if(postData?.activityType){
                where += ` AND food.activityType = '${postData?.activityType}'`;
            }
            if(postData?.activityTypeId){
                where += ` AND food.activityTypeId = '${postData?.activityTypeId}'`;
            }
            if(postData['collect_date']){
                where += ` AND((food.logDate Between '${this.commonDateService.getTodayDate(postData['collect_date']['start_date']).format('YYYY-MM-DD')}' AND '${this.commonDateService.getTodayDate(postData['collect_date']['end_date']).format('YYYY-MM-DD')}') OR (food.collectionDate Between '${this.commonDateService.getTodayDate(postData['collect_date']['start_date']).format('YYYY-MM-DD')}' AND '${this.commonDateService.getTodayDate(postData['collect_date']['end_date']).format('YYYY-MM-DD')}'))`;
            }
            let resultedData = await this.foodFeedsService.listRecord(where);
            resultedData = <any>(
                await this.commonArrayService.formatToDto(FoodFeedsDto, resultedData, req.lang)
            );
            if(postData?.name == 'Water' || postData?.mealTypeId == 0){
                resultedData = <any>{
                    list:  resultedData,
                    totalWaterConsume : resultedData.map(item => item.water).reduce((acc, curr) => acc + curr, 0),
                }
                if(postData?.schedule_id){
                    const grouped = resultedData['list'].reduce((acc, transaction) => {
                        const date = transaction.logDate_copy;
                        if (!acc[date]) {
                          acc[date] = {
                            date: date,  
                            collectionDate: transaction.collectionDate,  
                            collectionDate_copy: transaction.collectionDate_copy,  
                            logDate_copy: transaction.logDate_copy,  
                            water: 0,  
                          };
                        }
                        acc[date].water += transaction.water;   // replace amount to water because of calculation unit wise issue
                        return acc;
                    }, {});
                    let result = Object.values(grouped).map((item: any) => ({
                        ...item,
                        water: Math.round(item?.water * 100) / 100 || 0,
                    }));
                    resultedData['list'] = result;
                    let todayTotal = resultedData['list'].filter(ele => this.commonDateService.getTodayDate(ele.collectionDate_copy).format('YYYY-MM-DD') == this.commonDateService.getTodayDate().format('YYYY-MM-DD'));
                    resultedData['todayTotalWaterConsume'] = Math.round((todayTotal?.length ? todayTotal[0].water : 0) * 100) / 100 || 0;
                }
                if(postData['collect_date'] && Object.keys(postData['collect_date']).length){
                    const grouped = resultedData['list'].reduce((acc, transaction) => {
                        const date = this.commonDateService.getTodayDate(transaction.logDate_copy).format('YYYY-MM-DD');
                        if (!acc[date]) {
                        acc[date] = {
                            date: date,  
                            collectionDate: transaction.collectionDate,  
                            collectionDate_copy: transaction.collectionDate_copy,  
                            logDate_copy: transaction.logDate_copy,  
                            water: 0,  
                        };
                        }
                        acc[date].water += transaction.water;
                        return acc;
                    }, {});
                    for(let ele of resultedData['list']){
                        let todayTotal = grouped[this.commonDateService.getTodayDate(ele.collectionDate_copy).format('YYYY-MM-DD')]?.['water'];
                        ele['todayTotalWaterConsume'] = Math.round(todayTotal * 100) / 100 || 0;
                    }
                }
                resultedData['totalWaterConsume'] = Math.round(resultedData?.['totalWaterConsume'] * 100) / 100 || 0; // round off 0.00
            }
            let hourTrans = await this.translatorService.frontendReadTranslation(req.lang, 'Hr', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
            let minuteTrans = await this.translatorService.frontendReadTranslation(req.lang, 'Min', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
            if(postData?.name == 'Sleep'){
                if(postData?.schedule_id){
                    const grouped = resultedData.reduce((acc, transaction) => {
                        const date = transaction.logDate_copy;
                        if (!acc[date]) {
                          acc[date] = {
                            date: date,  
                            collectionDate: transaction.collectionDate,  
                            collectionDate_copy: transaction.collectionDate_copy,  
                            logDate_copy: transaction.logDate_copy,  
                            water: 0,
                            amount: 0,
                            totalTime: '',
                          };
                        }
                        acc[date].water += transaction.water;
                        acc[date].amount += transaction.amount;
                        let total = this.commonDateService.hour_minutes(acc[date].water, acc[date].amount);
                        acc[date].totalTime = `${total?.hour || 0} ${hourTrans} ${total?.min || 0} ${minuteTrans}`;
                        return acc;
                      }, {});
                    const result = Object.values(grouped);
                    resultedData = result;
                }
            }
            if(resultedData && resultedData.length){
                await Promise.all(resultedData.map(async (ele)=>{
                    let foodId: number = Number(ele?.foodId)
                    if(ele.name){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`${ele.name}`, `/LC_MESSAGES/Trackers/Nutrition/${foodId}`,`dynamic`);
                        ele.name = (customName == '' || customName == `${ele.name}`) ? ele.name : customName;
                    }
                    if(ele.foodUnit){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`foodunit_${ele.foodUnit}_${foodId}`, `/LC_MESSAGES/Trackers/Nutrition/${foodId}`,`dynamic`);
                        ele.foodUnit = (customName == '' || customName == `${ele.foodUnit}`) ? ele.foodUnit : customName;
                    }
                }));
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
    @Post('graph-stat')
    async graphStat(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            let user_id = postData?.user_id ?? req.tokenUser?.id;
            if (
                !user_id
            ) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            } 
            const where = { user_id: req.tokenUser?.id ?? postData?.id, logDate: postData?.logDate ? this.commonDateService.getTodayDate(postData?.logDate).format('YYYY-MM-DD')  : this.commonDateService.getTodayDate().format('YYYY-MM-DD') , status: Not(2)};
            let resultedData = await this.foodFeedsService.listRecord(where);
            let totalCalories = 0;
            let totalCarbs = 0;
            let totalFat = 0;
            let totalFiber = 0;
            let totalProtein = 0;
            let totalSodium = 0;
            let totalWater = 0;
            if(resultedData.length){
                await Promise.all(resultedData.map((element)=>{
                    totalCalories = (totalCalories + (element?.calories ?? 0))
                    totalCarbs = totalCarbs + (element?.carbs ?? 0)
                    totalFat = totalFat + (element?.fat ?? 0)
                    totalFiber = totalFiber + (element?.fiber ?? 0)
                    totalProtein = totalProtein + (element?.protein ?? 0)
                    totalSodium = totalSodium + (element?.sodium ?? 0)
                    totalWater = totalWater + (element?.water ?? 0)
                }));
            }
           let response = {
            appName : resultedData[0]?.appName ?? '',
            logType : resultedData[0]?.logType ?? '',
            totalCalories,
            totalCarbs,
            totalFat,
            totalFiber,
            totalProtein,
            totalSodium,
            totalWater
           };
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: response,
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
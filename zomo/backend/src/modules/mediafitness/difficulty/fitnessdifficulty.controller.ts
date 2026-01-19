import { appConstant, CommonArrayService, CommonService, MediaFitnessDifficultyDto, tableConstant } from '@common-constants';
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
import { In, Not } from "typeorm";
import { AccessGuard, RoleGuard, TokenGuard } from "../../../guard";
import { TranslationService } from "../../translation/translation.service";
import { PaginationWithMediaFitnessInput } from '../input';
import { FitnessVideosService } from "../videos/fitnessvideos.service";
import { FitnessDifficultyService } from "./fitnessdifficulty.service";
import { CreateMediaFitnessDifficultyInput } from './input';
@Controller('media-fitness/difficulty')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class FitnessDifficultyController {
    constructor(
        private readonly fitnessDifficultyService: FitnessDifficultyService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        private readonly fitnessVideosService: FitnessVideosService,
    ) {
    }
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginationWithMediaFitnessInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let where = ([appConstant.ROLE.ADMIN,appConstant.ROLE.ORGADMIN,appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER].includes(req.tokenUser?.role_id)) ? 'fitness.status != 2 ' : 'fitness.status = 1 ';
            if(postData?.org_id){
                where +=`AND fitness.org_id In(0,${postData?.org_id}) `;
            }
            if(postData?.d_id){
                where +=`AND fitness.d_id = '${postData?.d_id}' `;
            }
            if (postData?.search_str) {
                where +=  this.commonService.generateDynamicSearchQuery(postData?.search_str,['fitness.name','fitness.code']);
            }
            const resultedData = await this.fitnessDifficultyService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(MediaFitnessDifficultyDto, resultedData['list'], req.lang)
            );
            if(resultedData['list'] && resultedData['list'].length){
                await Promise.all(resultedData['list'].map(async (ele)=>{
                    if(ele.name){
                        let customeName = await this.translatorService.frontendReadTranslation(req.lang,`fitness_difficulty_${ele['id']}`, `/LC_MESSAGES/Media/Fitnessvideos/${ele['org_id']}/difficulty`,`dynamic`);
                        ele.name = (customeName == '' || customeName == `fitness_difficulty_${ele['id']}`) ? ele['name'] : customeName;
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
    @Post('get-one')
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = { id: postData?.id };
            if(postData?.org_id){
                where['org_id'] = postData?.org_id;
            }
            let difficultyData = await this.fitnessDifficultyService.findOne(where);
            if (!difficultyData) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }
            difficultyData = <any>(
                await this.commonArrayService.formatToDto(MediaFitnessDifficultyDto, difficultyData, req.lang)
            );
            if(difficultyData.name){
                let customeName = await this.translatorService.frontendReadTranslation(req.lang,`fitness_difficulty_${difficultyData['id']}`, `/LC_MESSAGES/Media/Fitnessvideos/${difficultyData['org_id']}/difficulty`,`dynamic`);
                difficultyData.name = (customeName == '' || customeName == `fitness_difficulty_${difficultyData['id']}`) ? difficultyData['name'] : customeName;
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: difficultyData,
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
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateMediaFitnessDifficultyInput) {
        try {
            if(postData?.name){
                postData['code'] = postData?.name.toLowerCase().replace(/ /g, "-");
            }
            if (
                postData?.org_id == undefined || postData?.org_id == null
            ) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let where = {name: postData?.name, org_id: postData?.org_id, status: Not(2)};
            const categoryCheck = await this.fitnessDifficultyService.findOne(where);
            if (categoryCheck) {
                throw Error(await this.translatorService.frontendReadTranslation(req.lang, "This name has already been used."));
            }
            let resultedData = await this.fitnessDifficultyService.save({...postData,
                created_by: req.tokenUser?.id
            });
            let dynamicDatas = Object.create(null);
            if(postData?.name){
                let tilte = `fitness_difficulty_${resultedData['id']}`
                dynamicDatas[`${tilte}`]= postData?.name;
            }                      
            await this.translatorService.DynamicEngJsonData('Media',postData?.org_id,dynamicDatas,'Edit','Fitnessvideos','difficulty');
            return res.status(HttpStatus.CREATED).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, "Difficulty has been added successfully"),
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
            const recordDetails = await this.fitnessDifficultyService.findOne(where);
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
            await this.fitnessDifficultyService.update(where,{status:2});
            this.activityLogService.create(recordDetails, {status:2}, tableConstant.MEDIA_FITNESS.TBL_ME_FOD_DIFFICULTY, req.tokenUser?.id, 'delete');
            let videoData = await this.fitnessVideosService.listRecord({difficulty_id: postData?.id, status: Not('2')});
            await this.fitnessVideosService.update({difficulty_id: postData?.id, status: Not('2')},{status:2});
            await this.activityLogService.create(videoData, {status:2}, tableConstant.MEDIA_FITNESS.TBL_ME_FOD_VIDEOS, req.tokenUser?.id, 'delete');
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, "Difficulty has been deleted successfully"),
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
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: CreateMediaFitnessDifficultyInput) {
        try {
            if (
                !postData?.id
            ) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = {id: postData?.id};
            let recordDetails: any = await this.fitnessDifficultyService.findOne(where);
            if(postData?.name){
                postData['code'] = postData?.name.toLowerCase().replace(/ /g, "-");
                let where = {name: postData?.name, org_id: postData?.org_id, status: Not(2)};
                const categoryCheck = await this.fitnessDifficultyService.findOne(where);
                if (categoryCheck) {
                    throw Error(await this.translatorService.frontendReadTranslation(req.lang, "This name has already been used."));
                }
            }
            if (!recordDetails) {
                recordDetails = await this.fitnessDifficultyService.save({
                    ...postData,
                    created_by: req.tokenUser?.id
                });
            }
            await this.fitnessDifficultyService.update(where, postData);
            let dynamicDatas = Object.create(null);
            if(postData?.name){
                let tilte = `fitness_difficulty_${recordDetails['id']}`
                dynamicDatas[`${tilte}`]= postData?.name;
            }                      
            await this.translatorService.DynamicEngJsonData('Media',postData?.org_id,dynamicDatas,'Edit','Fitnessvideos','difficulty');
            this.activityLogService.create(recordDetails, postData, tableConstant.MEDIA_FITNESS.TBL_ME_FOD_DIFFICULTY, req.tokenUser?.id);
            let videoData = await this.fitnessVideosService.listRecord({difficulty_id: postData?.id});
            await this.fitnessVideosService.update({difficulty_id: postData?.id},{status:postData?.status});
            await this.activityLogService.create(videoData, {status:postData?.status}, tableConstant.MEDIA_FITNESS.TBL_ME_FOD_VIDEOS, req.tokenUser?.id, 'delete');
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, ((postData?.status != undefined || postData?.status != null) && postData?.status != recordDetails.status) ? "Fitness Difficulty status updated successfully" : "Difficulty has been updated successfully"),
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
            const where = {  status: 1 };
            if(postData?.org_id){
                where['org_id'] = In([0,postData?.org_id]);
            }
            let resultedData = await this.fitnessDifficultyService.listRecord(where);
            resultedData = <any>(
                await this.commonArrayService.formatToDto(MediaFitnessDifficultyDto, resultedData, req.lang)
            );
            if(resultedData && resultedData.length){
                await Promise.all(resultedData.map(async (ele)=>{
                    if(ele.name){
                        let customeName = await this.translatorService.frontendReadTranslation(req.lang,`fitness_difficulty_${ele['id']}`, `/LC_MESSAGES/Media/Fitnessvideos/${ele['org_id']}/difficulty`,`dynamic`);
                        ele.name = (customeName == '' || customeName == `fitness_difficulty_${ele['id']}`) ? ele['name'] : customeName;
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
}
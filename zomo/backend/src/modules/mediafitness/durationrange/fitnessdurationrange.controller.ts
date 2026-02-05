import { appConstant, CommonArrayService, CommonService, MediaFitnessDurationRangeDto, tableConstant } from '@common-constants';
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
import { CreateMediaFitnessDifficultyInput } from '../difficulty/input';
import { PaginationWithMediaFitnessInput } from '../input';
import { FitnessVideosService } from "../videos/fitnessvideos.service";
import { FitnessDurationRangeService } from "./fitnessdurationrange.service";
@Controller('media-fitness/duration-range')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class FitnessDurationRangeController {
    constructor(
        private readonly fitnessDurationRangeService: FitnessDurationRangeService,
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
            const resultedData = await this.fitnessDurationRangeService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(MediaFitnessDurationRangeDto, resultedData['list'], req.lang)
            );
            if(resultedData['list'] && resultedData['list'].length){
                await Promise.all(resultedData['list'].map(async (ele)=>{
                    if(ele.name){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`fitness_durationrange_${ele['id']}`, `/LC_MESSAGES/Media/Fitnessvideos/${ele['org_id']}/durationrange}`,`dynamic`);
                        ele.name = (customName == '' || customName == `fitness_durationrange_${ele['id']}`) ? ele['name'] : customName;
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
            let durationRange = await this.fitnessDurationRangeService.findOne(where);
            if (!durationRange) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }
            durationRange = <any>(
                await this.commonArrayService.formatToDto(MediaFitnessDurationRangeDto, durationRange, req.lang)
            );
            if(durationRange.name){
                let customName = await this.translatorService.frontendReadTranslation(req.lang,`fitness_durationrange_${durationRange['id']}`, `/LC_MESSAGES/Media/Fitnessvideos/${durationRange['org_id']}/durationrange}`,`dynamic`);
                durationRange.name = (customName == '' || customName == `fitness_durationrange_${durationRange['id']}`) ? durationRange['name'] : customName;
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: durationRange,
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
            const categoryCheck = await this.fitnessDurationRangeService.findOne(where);
            if (categoryCheck) {
                throw Error(await this.translatorService.frontendReadTranslation(req.lang, "This name has already been used."));
            }
            let resultedData = await this.fitnessDurationRangeService.save({...postData,
                created_by: req.tokenUser?.id
            });
            let dynamicData = Object.create(null);
            if(postData?.name){
                let title = `fitness_durationrange_${resultedData['id']}`
                dynamicData[`${title}`]= postData?.name;
            }                      
            await this.translatorService.DynamicEngJsonData('Media',postData?.org_id,dynamicData,'Edit','Fitnessvideos','durationrange');
            return res.status(HttpStatus.CREATED).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, "Duration Range has been added successfully"),
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
            const recordDetails = await this.fitnessDurationRangeService.findOne(where);
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
            await this.fitnessDurationRangeService.update(where,{status:2});
            this.activityLogService.create(recordDetails, {status:2}, tableConstant.MEDIA_FITNESS.TBL_ME_FOD_DURATION_RANGE, req.tokenUser?.id, 'delete');
            let videoData = await this.fitnessVideosService.listRecord({duration_id: postData?.id, status: Not('2')});
            await this.fitnessVideosService.update({duration_id: postData?.id, status: Not('2')},{status:2});
            await this.activityLogService.create(videoData, {status:2}, tableConstant.MEDIA_FITNESS.TBL_ME_FOD_VIDEOS, req.tokenUser?.id, 'delete');
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, "Duration Range has been deleted successfully"),
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
            let recordDetails: any = await this.fitnessDurationRangeService.findOne(where);
            if(postData?.name){
                postData['code'] = postData?.name.toLowerCase().replace(/ /g, "-");
                let where = {name: postData?.name, org_id: postData?.org_id || recordDetails.org_id, status: Not(2)};
                const categoryCheck = await this.fitnessDurationRangeService.findOne(where);
                if (categoryCheck) {
                    throw Error(await this.translatorService.frontendReadTranslation(req.lang, "This name has already been used."));
                }
            }
            if (!recordDetails) {
                recordDetails = await this.fitnessDurationRangeService.save({
                    ...postData,
                    created_by: req.tokenUser?.id
                });
            }
            await this.fitnessDurationRangeService.update(where, postData);
            let dynamicData = Object.create(null);
            if(postData?.name){
                let title = `fitness_durationrange_${recordDetails['id']}`
                dynamicData[`${title}`]= postData?.name;
            }                      
            await this.translatorService.DynamicEngJsonData('Media',postData?.org_id,dynamicData,'Edit','Fitnessvideos','durationrange');
            this.activityLogService.create(recordDetails, postData, tableConstant.MEDIA_FITNESS.TBL_ME_FOD_DURATION_RANGE, req.tokenUser?.id);
            let videoData = await this.fitnessVideosService.listRecord({duration_id: postData?.id});
            await this.fitnessVideosService.update({duration_id: postData?.id},{status:postData?.status});
            await this.activityLogService.create(videoData, {status:postData?.status}, tableConstant.MEDIA_FITNESS.TBL_ME_FOD_VIDEOS, req.tokenUser?.id, 'delete');
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, ((postData?.status != undefined || postData?.status != null) && postData?.status != recordDetails.status) ? "Fitness Duration Range status updated successfully" : "Duration Range has been updated successfully"),
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
            const where = { status: 1 };
            if(postData?.org_id){
                where['org_id'] = In([0,postData?.org_id]);
            }
            let resultedData = await this.fitnessDurationRangeService.listRecord(where);
            resultedData = <any>(
                await this.commonArrayService.formatToDto(MediaFitnessDurationRangeDto, resultedData, req.lang)
            );
            if(resultedData && resultedData.length){
                await Promise.all(resultedData.map(async (ele)=>{
                    if(ele.name){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`fitness_durationrange_${ele['id']}`, `/LC_MESSAGES/Media/Fitnessvideos/${ele['org_id']}/durationrange}`,`dynamic`);
                        ele.name = (customName == '' || customName == `fitness_durationrange_${ele['id']}`) ? ele['name'] : customName;
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
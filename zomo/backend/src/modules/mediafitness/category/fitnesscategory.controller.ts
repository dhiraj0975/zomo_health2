import { appConstant, CommonArrayService, CommonService, MediaFitnessCategoryDto, tableConstant } from '@common-constants';
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
import { FitnessEquipmentService } from "../equipment/fitnessequipment.service";
import { FitnessFocusService } from "../focus/fitnessfocus.service";
import { PaginationWithMediaFitnessInput } from '../input';
import { FitnessVideoCategoryService } from "../videocategory/fitnessvideocategory.service";
import { FitnessCategoryService } from "./fitnesscategory.service";
import { CreateMediaFitnessCategoryInput } from './input';
@Controller('media-fitness/category')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class FitnessCategoryController {
    constructor(
        private readonly fitnessCategoryService: FitnessCategoryService,
        private readonly fitnessFocusService: FitnessFocusService,
        private readonly fitnessEquipmentService: FitnessEquipmentService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        private readonly fitnessVideoCategoryService: FitnessVideoCategoryService,
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
            if(postData?.cat_id){
                where +=`AND fitness.cat_id = '${postData?.cat_id}' `;
            }
            if (postData?.search_str) {
                where +=  this.commonService.generateDynamicSearchQuery(postData?.search_str,['fitness.name','fitness.code']);
            }
            const resultedData = await this.fitnessCategoryService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(MediaFitnessCategoryDto, resultedData['list'], req.lang)
            );
            if(resultedData['list'] && resultedData['list'].length){
                await Promise.all(resultedData['list'].map(async (ele)=>{
                    if(ele.name){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`fitness_category_${ele['id']}`, `/LC_MESSAGES/Media/Fitnessvideos/${ele['org_id']}/category}`,`dynamic`);
                        ele.name = (customName == '' || customName == `fitness_category_${ele['id']}`) ? ele['name'] : customName;
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
            let categoryData = await this.fitnessCategoryService.findOne(where);
            if (!categoryData) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }
            categoryData = <any>(
                await this.commonArrayService.formatToDto(MediaFitnessCategoryDto, categoryData, req.lang)
            );
            if(categoryData.name){
                let customName = await this.translatorService.frontendReadTranslation(req.lang,`fitness_category_${categoryData['id']}`, `/LC_MESSAGES/Media/Fitnessvideos/${categoryData['org_id']}/category}`,`dynamic`);
                categoryData.name = (customName == '' || customName == `fitness_category_${categoryData['id']}`) ? categoryData['name'] : customName;
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: categoryData,
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
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateMediaFitnessCategoryInput) {
        try {
            if (
                postData?.org_id == undefined || postData?.org_id == null
            ) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            if(postData?.name){
                postData['code'] = postData?.name.toLowerCase().replace(/ /g, "-");
                let where = {name: postData?.name, org_id: postData?.org_id, status: Not(2)};
                const categoryCheck = await this.fitnessCategoryService.findOne(where);
                if (categoryCheck) {
                    throw Error(await this.translatorService.frontendReadTranslation(req.lang, "This name has already been used."));
                }
            }
            let resultedData = await this.fitnessCategoryService.save({...postData,
                created_by: req.tokenUser?.id
            });
            let dynamicData = Object.create(null);
            if(postData?.name){
                let title = `fitness_category_${resultedData['id']}`
                dynamicData[`${title}`]= postData?.name;
            }                      
            await this.translatorService.DynamicEngJsonData('Media',postData?.org_id,dynamicData,'Edit','Fitnessvideos','category');
            return res.status(HttpStatus.CREATED).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, "Category has been added successfully"),
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
            const recordDetails = await this.fitnessCategoryService.findOne(where);
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
            await this.fitnessCategoryService.update(where,{status:2});
            this.activityLogService.create(recordDetails, {status:2}, tableConstant.MEDIA_FITNESS.TBL_ME_FOD_CATEGORY, req.tokenUser?.id, 'delete');
            let videoCategoryData = await this.fitnessVideoCategoryService.listRecord({c_id: postData?.id, status: Not('2')});
            await this.fitnessVideoCategoryService.update({c_id: postData?.id, status: Not('2')}, {status:2});
            await this.activityLogService.create(videoCategoryData, {status:2}, tableConstant.MEDIA_FITNESS.TBL_ME_FOD_VIDEO_CATEGORIES, req.tokenUser?.id,'delete');
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, "Category has been deleted successfully"),
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
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: CreateMediaFitnessCategoryInput) {
        try {
            if (
                !postData?.id
            ) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = {id: postData?.id};
            let recordDetails: any = await this.fitnessCategoryService.findOne(where);
            if(postData?.name){
                postData['code'] = postData?.name.toLowerCase().replace(/ /g, "-");
                let where = {name: postData?.name, org_id: postData?.org_id || recordDetails.org_id, status: Not(2)};
                const categoryCheck = await this.fitnessCategoryService.findOne(where);
                if (categoryCheck) {
                    throw Error(await this.translatorService.frontendReadTranslation(req.lang, "This name has already been used."));
                }
            }
            if (!recordDetails) {
                recordDetails = await this.fitnessCategoryService.save({
                    ...postData,
                    created_by: req.tokenUser?.id
                });
            }
            await this.fitnessCategoryService.update(where, postData);
            let dynamicData = Object.create(null);
            if(postData?.name){
                let title = `fitness_category_${recordDetails['id']}`
                dynamicData[`${title}`]= postData?.name;
            }                      
            await this.translatorService.DynamicEngJsonData('Media',recordDetails.org_id,dynamicData,'Edit','Fitnessvideos','category');
            this.activityLogService.create(recordDetails, postData, tableConstant.MEDIA_FITNESS.TBL_ME_FOD_CATEGORY, req.tokenUser?.id);
            let videoCategoryData = await this.fitnessVideoCategoryService.listRecord({c_id: postData?.id});
            await this.fitnessVideoCategoryService.update({c_id: postData?.id}, {status:postData?.status});
            await this.activityLogService.create(videoCategoryData, {status:postData?.status}, tableConstant.MEDIA_FITNESS.TBL_ME_FOD_VIDEO_CATEGORIES, req.tokenUser?.id,'delete');
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message:  await this.translatorService.frontendReadTranslation(req.lang, ((postData?.status != undefined || postData?.status != null) && postData?.status != recordDetails.status) ? "Categories status updated successfully" : "Category has been updated successfully"),
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
            if ((req.tokenUser?.role_id != appConstant.ROLE.ADMIN && appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER == req.tokenUser?.role_id) && (!postData?.org_id)) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let where = { };
            if (postData?.org_id) {
                where = {org_id: In([postData?.org_id, 0]), status: 1};
            }
            let returnData = {};
            let categoryData = await this.fitnessCategoryService.listRecord(where,['id','name','org_id']);
            categoryData = <any>(
                await this.commonArrayService.formatToDto(MediaFitnessCategoryDto, categoryData, req.lang)
            );
            if(categoryData && categoryData.length){
                await Promise.all(categoryData.map(async (ele)=>{
                    if(ele.name){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`fitness_category_${ele['id']}`, `/LC_MESSAGES/Media/Fitnessvideos/${ele['org_id']}/category`,`dynamic`);
                        ele.name = (customName == '' || customName == `fitness_category_${ele['id']}`) ? ele['name'] : customName;
                    }
                }));
            }
            let category = categoryData.reduce((result, {id, name}) => ({ ...result, [id]: name }), {});
            let focusData = await this.fitnessFocusService.listRecord(where,['id','name','org_id'],{ id: 'ASC' });
            if(focusData && focusData.length){
                await Promise.all(focusData.map(async (ele)=>{
                    if(ele.name){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`fitness_focus_${ele['id']}`, `/LC_MESSAGES/Media/Fitnessvideos/${ele['org_id']}/focus`,`dynamic`);
                        ele.name = (customName == '' || customName == `fitness_focus_${ele['id']}`) ? ele['name'] : customName;
                    }
                }));
            }
            let focus = focusData.reduce((result, {id, name}) => ({ ...result, [id]: name }), {});
            let equipmentData = await this.fitnessEquipmentService.listRecord(where,['id','name','org_id']);
            if(equipmentData && equipmentData.length){
                await Promise.all(equipmentData.map(async (ele)=>{
                    if(ele.name){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`fitness_equipment_${ele['id']}`, `/LC_MESSAGES/Media/Fitnessvideos/${ele['org_id']}/equipment`,`dynamic`);
                        ele.name = (customName == '' || customName == `fitness_equipment_${ele['id']}`) ? ele['name'] : customName;
                    }
                }));
            }
            let equipment = equipmentData.reduce((result, {id, name}) => ({ ...result, [id]: name }), {});
            returnData['category'] = category
            returnData['focus'] = focus
            returnData['equipment'] = equipment
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: returnData,
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
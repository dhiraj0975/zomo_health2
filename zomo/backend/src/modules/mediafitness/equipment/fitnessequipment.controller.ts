import { appConstant, CommonArrayService, CommonService, MediaFitnessEquipmentDto, tableConstant } from '@common-constants';
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
import { PaginationWithMediaFitnessInput } from '../input';
import { FitnessVideoEquipmentService } from "../videoequipment/fitnessvideoequipment.service";
import { FitnessEquipmentService } from "./fitnessequipment.service";
import { CreateMediaFitnessEquipmentInput } from './input';
@Controller('media-fitness/equipment')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class FitnessEquipmentController {
    constructor(
        private readonly fitnessEquipmentService: FitnessEquipmentService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        private readonly fitnessVideoEquipmentService: FitnessVideoEquipmentService,
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
            if(postData?.e_id){
                where +=`AND fitness.e_id = '${postData?.e_id}' `;
            }
            if (postData?.search_str) {
                where +=  this.commonService.generateDynamicSearchQuery(postData?.search_str,['fitness.name','fitness.code']);
            }
            const resultedData = await this.fitnessEquipmentService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(MediaFitnessEquipmentDto, resultedData['list'], req.lang)
            );
            if(resultedData['list'] && resultedData['list'].length){
                await Promise.all(resultedData['list'].map(async (ele)=>{
                    if(ele.name){
                        let customeName = await this.translatorService.frontendReadTranslation(req.lang,`fitness_equipment_${ele['id']}`, `/LC_MESSAGES/Media/Fitnessvideos/${ele['org_id']}/equipment}`,`dynamic`);
                        ele.name = (customeName == '' || customeName == `fitness_equipment_${ele['id']}`) ? ele['name'] : customeName;
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
            let equipmentData = await this.fitnessEquipmentService.findOne(where);
            if (!equipmentData) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }
            equipmentData = <any>(
                await this.commonArrayService.formatToDto(MediaFitnessEquipmentDto, equipmentData, req.lang)
            );
            if(equipmentData.name){
                let customeName = await this.translatorService.frontendReadTranslation(req.lang,`fitness_equipment_${equipmentData['id']}`, `/LC_MESSAGES/Media/Fitnessvideos/${equipmentData['org_id']}/equipment}`,`dynamic`);
                equipmentData.name = (customeName == '' || customeName == `fitness_equipment_${equipmentData['id']}`) ? equipmentData['name'] : customeName;
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: equipmentData,
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
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateMediaFitnessEquipmentInput) {
        try {
            if (
                postData?.org_id == undefined || postData?.org_id == null
            ) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            if(postData?.name){
                postData['code'] = postData?.name.toLowerCase().replace(/ /g, "-");
                let where = {name: postData?.name, org_id: postData?.org_id, status: Not(2)};
                const categoryCheck = await this.fitnessEquipmentService.findOne(where);
                if (categoryCheck) {
                    throw Error(await this.translatorService.frontendReadTranslation(req.lang, "This name has already been used."));
                }
            }
            let resultedData = await this.fitnessEquipmentService.save({...postData,
                created_by: req.tokenUser?.id
            });
            let dynamicDatas = Object.create(null);
            if(postData?.name){
                let tilte = `fitness_equipment_${resultedData['id']}`
                dynamicDatas[`${tilte}`]= postData?.name;
            }                      
            await this.translatorService.DynamicEngJsonData('Media',postData?.org_id,dynamicDatas,'Edit','Fitnessvideos','equipment');
            return res.status(HttpStatus.CREATED).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, "Equipment has been added successfully"),
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
            const recordDetails = await this.fitnessEquipmentService.findOne(where);
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
            await this.fitnessEquipmentService.update(where,{status:2});
            this.activityLogService.create(recordDetails, {status:2}, tableConstant.MEDIA_FITNESS.TBL_ME_FOD_EQUIPMENT, req.tokenUser?.id, 'delete');
            let videoEquipmentData = await this.fitnessVideoEquipmentService.listRecord({e_id: postData?.id, status: Not('2')});
            await this.fitnessVideoEquipmentService.update({e_id: postData?.id, status: Not('2')},{status:2});
            await this.activityLogService.create(videoEquipmentData, {status:2}, tableConstant.MEDIA_FITNESS.TBL_ME_FOD_VIDEO_EQUIPMENT, req.tokenUser?.id, 'delete');
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, "Equipment has been deleted successfully"),
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
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: CreateMediaFitnessEquipmentInput) {
        try {
            if (
                !postData?.id
            ) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = {id: postData?.id};
            let recordDetails:any = await this.fitnessEquipmentService.findOne(where);
            if(postData?.name){
                postData['code'] = postData?.name.toLowerCase().replace(/ /g, "-");
                let where = {name: postData?.name, org_id: postData?.org_id || recordDetails.org_id, status: Not(2)};
                const categoryCheck = await this.fitnessEquipmentService.findOne(where);
                if (categoryCheck) {
                    throw Error(await this.translatorService.frontendReadTranslation(req.lang, "This name has already been used."));
                }
            }
            if (!recordDetails) {
                recordDetails = await this.fitnessEquipmentService.save({
                    ...postData,
                    created_by: req.tokenUser?.id
                });
            }
            await this.fitnessEquipmentService.update(where, postData);
            let dynamicDatas = Object.create(null);
            if(postData?.name){
                let tilte = `fitness_equipment_${recordDetails['id']}`
                dynamicDatas[`${tilte}`]= postData?.name;
            }                      
            await this.translatorService.DynamicEngJsonData('Media',postData?.org_id,dynamicDatas,'Edit','Fitnessvideos','equipment');
            this.activityLogService.create(recordDetails, postData, tableConstant.MEDIA_FITNESS.TBL_ME_FOD_EQUIPMENT, req.tokenUser?.id);
            let videoEquipmentData = await this.fitnessVideoEquipmentService.listRecord({e_id: postData?.id});
            await this.fitnessVideoEquipmentService.update({e_id: postData?.id},{status:postData?.status});
            await this.activityLogService.create(videoEquipmentData, {status:postData?.status}, tableConstant.MEDIA_FITNESS.TBL_ME_FOD_VIDEO_EQUIPMENT, req.tokenUser?.id, 'delete');
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, ((postData?.status != undefined || postData?.status != null) && postData?.status != recordDetails.status) ? "Fitness Equipment status updated successfully" : "Equipment has been updated successfully"),
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
            let resultedData = await this.fitnessEquipmentService.listRecord(where);
            resultedData = <any>(
                await this.commonArrayService.formatToDto(MediaFitnessEquipmentDto, resultedData, req.lang)
            );
            if(resultedData && resultedData.length){
                await Promise.all(resultedData.map(async (ele)=>{
                    if(ele.name){
                        let customeName = await this.translatorService.frontendReadTranslation(req.lang,`fitness_equipment_${ele['id']}`, `/LC_MESSAGES/Media/Fitnessvideos/${ele['org_id']}/equipment}`,`dynamic`);
                        ele.name = (customeName == '' || customeName == `fitness_equipment_${ele['id']}`) ? ele['name'] : customeName;
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
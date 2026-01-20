import { appConstant, CommonArrayService, CommonService, MediaFitnessInstructorDto, tableConstant } from '@common-constants';
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
import { FitnessInstructorStatusService } from "../instructorstatus/fitnessinstructorstatus.service";
import { FitnessVideoInstructorsService } from "../videoinstructors/fitnessvideoinstructors.service";
import { FitnessInstructorService } from "./fitnessinstructor.service";
import { CreateMediaFitnessInstructorInput } from './input';
@Controller('media-fitness/instructor')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class FitnessInstructorController {
    constructor(
        private readonly fitnessInstructorService: FitnessInstructorService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService,
        private readonly fitnessInstructorStatusService: FitnessInstructorStatusService,
        private readonly activityLogService: ActivityLogService,
        private readonly fitnessVideoInstructorsService: FitnessVideoInstructorsService,
    ) {
    }
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginationWithMediaFitnessInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let where = ([appConstant.ROLE.ADMIN,appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER,appConstant.ROLE.ORGADMIN].includes(req.tokenUser?.role_id)) ? 'fitness.status != 2 ' : 'fitness.status = 1 ';
            if(postData?.org_id){
                where +=`AND fitness.org_id In(0,${postData?.org_id}) `;
            }
            if(postData?.e_id){
                where +=`AND fitness.e_id = '${postData?.e_id}' `;
            }
            if (postData?.search_str) {
                where += `AND(fitness.first_name LIKE '%${postData?.search_str}%' OR fitness.last_name LIKE '%${postData?.search_str}%' OR fitness.full_name LIKE '%${postData?.search_str}%')`;
            }
            const resultedData = await this.fitnessInstructorService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(MediaFitnessInstructorDto, resultedData['list'], req.lang)
            );
            if(resultedData['list'] && resultedData['list'].length){
                await Promise.all(resultedData['list'].map(async (ele)=>{
                    if(ele.first_name){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`fitness_instruction_firstname_${ele['id']}`, `/LC_MESSAGES/Media/Fitnessvideos/${ele['org_id']}/instruction}`,`dynamic`);
                        ele.first_name = (customName == '' || customName == `fitness_instruction_firstname_${ele['id']}`) ? ele['first_name'] : customName;
                    }
                    if(ele.last_name){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`fitness_instruction_lastname_${ele['id']}`, `/LC_MESSAGES/Media/Fitnessvideos/${ele['org_id']}/instruction}`,`dynamic`);
                        ele.last_name = (customName == '' || customName == `fitness_instruction_lastname_${ele['id']}`) ? ele['last_name'] : customName;
                    }
                }));
            }
            if(appConstant.ROLE.ORGADMIN == req.tokenUser?.role_id){
                let ids = resultedData['list'].filter(item => item.org_id === 0).map(item => item.id);
                let statusData = await this.fitnessInstructorStatusService.listRecord({i_id: In(ids), org_id: req.tokenUser?.org_id});
                if(statusData){
                    statusData.forEach(item2 => {
                        let foundIndex = resultedData['list'].findIndex(item1 => item2.i_id === item1.id && item2.org_id === req.tokenUser?.org_id);
                        if (foundIndex !== -1) {
                            resultedData['list'][foundIndex].status = item2.status;
                        }
                    });
                }
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
            let instructorData = await this.fitnessInstructorService.findOne(where);
            if (!instructorData) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }
            instructorData = <any>(
                await this.commonArrayService.formatToDto(MediaFitnessInstructorDto, instructorData, req.lang)
            );
            if(instructorData.first_name){
                let customName = await this.translatorService.frontendReadTranslation(req.lang,`fitness_instruction_firstname_${instructorData['id']}`, `/LC_MESSAGES/Media/Fitnessvideos/${instructorData['org_id']}/instruction}`,`dynamic`);
                instructorData.first_name = (customName == '' || customName == `fitness_instruction_firstname_${instructorData['id']}`) ? instructorData['first_name'] : customName;
            }
            if(instructorData.last_name){
                let customName = await this.translatorService.frontendReadTranslation(req.lang,`fitness_instruction_lastname_${instructorData['id']}`, `/LC_MESSAGES/Media/Fitnessvideos/${instructorData['org_id']}/instruction}`,`dynamic`);
                instructorData.last_name = (customName == '' || customName == `fitness_instruction_lastname_${instructorData['id']}`) ? instructorData['last_name'] : customName;
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: instructorData,
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
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateMediaFitnessInstructorInput) {
        try {
            if (
                postData?.org_id == undefined || postData?.org_id == null
            ) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            if(postData?.first_name && postData?.last_name){
                postData['full_name'] = postData?.first_name + ' ' + postData?.last_name;
            }
            let where = {full_name: postData?.full_name, org_id: postData?.org_id, status: Not(2)};
            const categoryCheck = await this.fitnessInstructorService.findOne(where);
            if (categoryCheck) {
                throw Error(await this.translatorService.frontendReadTranslation(req.lang, "This first name and last name combination has already been used."));
            }
            let resultedData = await this.fitnessInstructorService.save({...postData,
                created_by: req.tokenUser?.id
            });
            let dynamicDatas = Object.create(null);
            if(postData?.first_name){
                let tilte = `fitness_instruction_firstname_${resultedData['id']}`
                dynamicDatas[`${tilte}`]= postData?.first_name;
            }                      
            if(postData?.last_name){
                let tilte = `fitness_instruction_lastname_${resultedData['id']}`
                dynamicDatas[`${tilte}`]= postData?.last_name;
            }                      
            await this.translatorService.DynamicEngJsonData('Media',postData?.org_id,dynamicDatas,'Edit','Fitnessvideos','instruction');
            return res.status(HttpStatus.CREATED).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, "Instructor has been added successfully"),
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
            const recordDetails = await this.fitnessInstructorService.findOne(where);
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
            await this.fitnessInstructorService.update(where,{status:2});
            this.activityLogService.create(recordDetails, {status:2}, tableConstant.MEDIA_FITNESS.TBL_ME_FOD_INSTRUCTOR, req.tokenUser?.id, 'delete');
            let videoInstructorsData = await this.fitnessVideoInstructorsService.listRecord({i_id: postData?.id, status: Not('2')});
            await this.fitnessVideoInstructorsService.update({i_id: postData?.id, status: Not('2')},{status:2});
            await this.activityLogService.create(videoInstructorsData, {status:2}, tableConstant.MEDIA_FITNESS.TBL_ME_FOD_VIDEO_INSTRUCTORS, req.tokenUser?.id, 'delete');
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, "Instructor has been deleted successfully"),
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
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: CreateMediaFitnessInstructorInput) {
        try {
            if (
                !postData?.id
            ) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = {id: postData?.id};
            let recordDetails: any = await this.fitnessInstructorService.findOne(where);
            if(postData?.first_name || postData?.last_name){
                postData['full_name'] = ((postData?.first_name ?? recordDetails.first_name) + ' ' + (postData?.last_name ?? recordDetails.last_name));
                let where = {full_name: postData?.full_name, org_id: postData?.org_id, status: Not(2)};
                const categoryCheck = await this.fitnessInstructorService.findOne(where);
                if (categoryCheck) {
                    throw Error(await this.translatorService.frontendReadTranslation(req.lang, "This first name and last name combination has already been used."));
                }
            }
            if (!recordDetails) {
                recordDetails = await this.fitnessInstructorService.save({
                    ...postData,
                    created_by: req.tokenUser?.id
                });
            }
            if(recordDetails.org_id != postData?.org_id && postData?.org_id !=0 && postData?.org_id != undefined && postData?.org_id != null){
                let record = await this.fitnessInstructorStatusService.findOne({i_id: recordDetails.id, org_id: postData?.org_id});
                if(record){
                    await this.fitnessInstructorStatusService.update({id: record.id},{i_id: recordDetails.id, org_id: postData?.org_id, status: postData?.status});
                    this.activityLogService.create(record, {i_id: recordDetails.id, org_id: postData?.org_id, status: postData?.status}, tableConstant.MEDIA_FITNESS.TBL_ME_FOD_INSTRUCTOR_STATUS, req.tokenUser?.id);
                }
                else{
                    await this.fitnessInstructorStatusService.save({i_id: recordDetails.id, org_id: postData?.org_id, status: postData?.status});
                }
                delete postData?.status;
            }
            delete postData?.org_id;
            await this.fitnessInstructorService.update(where, postData);
            let dynamicDatas = Object.create(null);
            if(postData?.first_name){
                let tilte = `fitness_instruction_firstname_${recordDetails['id']}`
                dynamicDatas[`${tilte}`]= postData?.first_name;
            }                      
            if(postData?.last_name){
                let tilte = `fitness_instruction_lastname_${recordDetails['id']}`
                dynamicDatas[`${tilte}`]= postData?.last_name;
            }                      
            await this.translatorService.DynamicEngJsonData('Media',postData?.org_id,dynamicDatas,'Edit','Fitnessvideos','instruction');
            this.activityLogService.create(recordDetails, postData, tableConstant.MEDIA_FITNESS.TBL_ME_FOD_INSTRUCTOR, req.tokenUser?.id);
            let videoInstructorsData = await this.fitnessVideoInstructorsService.listRecord({i_id: postData?.id});
            await this.fitnessVideoInstructorsService.update({i_id: postData?.id},{status:postData?.status});
            await this.activityLogService.create(videoInstructorsData, {status:postData?.status}, tableConstant.MEDIA_FITNESS.TBL_ME_FOD_VIDEO_INSTRUCTORS, req.tokenUser?.id, 'delete');
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, ((postData?.status != undefined || postData?.status != null) && postData?.status != recordDetails.status) ? "Fitnes Instructor status updated successfully" : "Instructor has been updated successfully"),
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
            let resultedData = await this.fitnessInstructorService.listRecord(where);
            resultedData = <any>(
                await this.commonArrayService.formatToDto(MediaFitnessInstructorDto, resultedData, req.lang)
            );
            if(resultedData && resultedData.length){
                await Promise.all(resultedData.map(async (ele)=>{
                    if(ele.first_name){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`fitness_instruction_firstname_${ele['id']}`, `/LC_MESSAGES/Media/Fitnessvideos/${ele['org_id']}/instruction}`,`dynamic`);
                        ele.first_name = (customName == '' || customName == `fitness_instruction_firstname_${ele['id']}`) ? ele['first_name'] : customName;
                    }
                    if(ele.last_name){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`fitness_instruction_lastname_${ele['id']}`, `/LC_MESSAGES/Media/Fitnessvideos/${ele['org_id']}/instruction}`,`dynamic`);
                        ele.last_name = (customName == '' || customName == `fitness_instruction_lastname_${ele['id']}`) ? ele['last_name'] : customName;
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
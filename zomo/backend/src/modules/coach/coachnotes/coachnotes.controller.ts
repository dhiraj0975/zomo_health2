import { CoachNotesDto, CoachNotesEntity, CommonArrayService, CommonDateService, CommonService, tableConstant } from '@common-constants';
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
import { DeepPartial, FindOptionsWhere, Not } from "typeorm";
import { AccessGuard, RoleGuard, TokenGuard } from "../../../guard";
import { TranslationService } from "../../translation/translation.service";
import { PaginateWithCoachesInput } from '../input';
import { CoachNotesService } from "./coachnotes.service";
import { CreateCoachNotesInputs, DeleteCoachNotesInputs, GetCoachNotesInputs, UpdateCoachNotesInputs } from "./inputs";
@Controller('coach/notes')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class CoachNotesController {
    constructor(
        private readonly coachNotesService: CoachNotesService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        private readonly commonDateService: CommonDateService,
    ) {
    }
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithCoachesInput) {
        try {
            let coachId = req.tokenUser?.id;
            postData = this.commonService.sanitizePayload(postData);
            let userId = postData?.user_id;
            let type = postData?.type;
            let where = `notes.coach_id = ${coachId} AND notes.user_id = ${userId} AND notes.status != 2 AND notes.contant_type = ${type}`;
            if (postData?.search_str) {
                where += ` AND(notes.subject LIKE '%${postData?.search_str}%' OR notes.assign_task LIKE '%${postData?.search_str}%' OR notes.note LIKE '%${postData?.search_str}%')`;
            }
            const resultedData = await this.coachNotesService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(CoachNotesDto, resultedData['list'], req.lang)
            );
            await Promise.all(resultedData['list']?.map(async (item) => {
                item.start_time = this.commonDateService.getTodayDate(item['start_time'], "HH:mm:ss").format("h:mm A")
            }));
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
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: GetCoachNotesInputs) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let coachId: number = req.tokenUser?.id;
            const where: FindOptionsWhere<CoachNotesEntity> = { id: postData?.id, coach_id: coachId, user_id: postData?.user_id, status: 1 };
            let coachNotes: CoachNotesEntity | null = await this.coachNotesService.getOne(where);
            await this.coachNotesService.commonQueryBuilder(
                ['notes','user.id','user.code','user.last_name','user.last_name','user.email'],
                where,
                null,
                [
                    {
                        join_table: 'notes.user',
                        alias: 'user',
                        table: tableConstant.TBL_USERS,
                        on_condition: `user.id = notes.user_id AND user.status != 2`,
                        join_type: 'left_one',
                    },
                ],
                'getOne',
            );
            if (!coachNotes) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }
            coachNotes = <any>(
                await this.commonArrayService.formatToDto(CoachNotesDto, coachNotes, req.lang)
            );
            if(coachNotes.start_time){
                coachNotes.start_time = this.commonDateService.getTodayDate(coachNotes['start_time'], "HH:mm:ss").format("h:mm A")
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: coachNotes,
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
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateCoachNotesInputs) {
        try {
            if (!postData?.user_id || !postData?.contant_type) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            if(postData?.contant_type == 1){
                if (!postData?.subject || !postData?.start_date  || !postData?.start_time || !postData?.assign_task || !postData?.interaction_type || !postData?.priority || !postData?.due_date) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
            }else{
                if (!postData?.subject || !postData?.start_date  || !postData?.start_time || !postData?.note || !postData?.interaction_type) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
            }
            postData.timezone = postData?.timezone ?? 'UTC';
            postData.coach_id = postData?.coach_id || req.tokenUser?.id;
            postData.status = 1;
            postData.user_status = 0;
            postData.note = postData?.note ?? '';
            postData.assign_task = postData?.assign_task ?? '';
            postData.due_date = postData?.due_date ?? '0000-00-00';
            await this.coachNotesService.save(postData);
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
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: DeleteCoachNotesInputs) {
        try {
            if (!postData?.id || !postData?.user_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where: FindOptionsWhere<CoachNotesEntity> = {id: postData?.id};
            const recordDetails: CoachNotesEntity | null = await this.coachNotesService.getOne(where);
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
            const updateData: DeepPartial<CoachNotesEntity> = {
                status:2
            };
            await this.coachNotesService.updateRecord(where,updateData);
            this.activityLogService.create(recordDetails, {status:2}, tableConstant.COACH.TBL_CO_NOTES, req.tokenUser?.id,'delete');
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
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: UpdateCoachNotesInputs) {
        try {
            if (!postData?.id || !postData?.user_id || !postData?.contant_type) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where: FindOptionsWhere<CoachNotesEntity> = { id: postData?.id, coach_id: req.tokenUser?.id, user_id: postData?.user_id, contant_type: postData?.contant_type, status: Not(2) };
            const recordDetails: CoachNotesEntity | null = await this.coachNotesService.getOne(where);
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
            const updateData: DeepPartial<CoachNotesEntity> = {
                ...postData,
            };
            await this.coachNotesService.updateRecord(where, updateData);
            this.activityLogService.create(recordDetails, postData, tableConstant.COACH.TBL_CO_NOTES, req.tokenUser?.id);
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
}
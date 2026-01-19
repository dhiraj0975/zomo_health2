import { CommitmentLevelsDto, CommonArrayService, tableConstant } from '@common-constants';
import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Post,
    Put,
    Req,
    Res,
    UseGuards,
} from '@nestjs/common';
import { Request, Response } from "express";
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import {
    CreateCommitmentLevelsInput,
    DeleteChallengeInput,
    GetoneChallengeInput,
    UpdateCommitmentLevelsInput
} from "../../../input";
import { TranslationService } from "../../translation/translation.service";
import { ScheduleChallengeJoinUsersService } from '../schedulechallengejoinusers/schedulechallengejoinusers.service';
import { CommitmentLevelsService } from './commitmentlevels.service';
@Controller('challenge/commitment-levels')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class CommitmentLevelsController {
    constructor(
        private readonly commitmentLevelsService: CommitmentLevelsService,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        private readonly scheduleChallengeJoinUsersService: ScheduleChallengeJoinUsersService,
    ) {}
    @Post('create')
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateCommitmentLevelsInput) {
        try {
            if (!postData?.challenge_id || !postData?.schedule_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            await this.commitmentLevelsService.save({...postData});
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: 'Commitment level added successfully'
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
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: UpdateCommitmentLevelsInput) {
        try {
            if (!postData?.id || !postData?.challenge_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.commitmentLevelsService.findOne({
                id: postData?.id,challenge_id: postData?.challenge_id
            });
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            await this.commitmentLevelsService.update({ id: postData?.id, challenge_id: postData?.challenge_id},{...postData});
            this.activityLogService.create(recordDetails, postData, tableConstant.CHALLENGE.TBL_CH_COMMITMENT_LEVELS, req.tokenUser?.id);
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: 'Commitment level updated successfully'
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
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: DeleteChallengeInput) {
        try {
            if (!postData?.id || !postData?.challenge_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.commitmentLevelsService.findOne({
                id: postData?.id,challenge_id: postData?.challenge_id
            });
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            await this.commitmentLevelsService.update({id: postData?.id, challenge_id: postData?.challenge_id},{status: 2});
            this.activityLogService.create(recordDetails, {status: 2}, tableConstant.CHALLENGE.TBL_CH_COMMITMENT_LEVELS, req.tokenUser?.id, 'delete');
            let joinUsers = await this.scheduleChallengeJoinUsersService.listRecord({trek_level_id: postData?.id},null,['scj']);
            for(let user of joinUsers){
                await this.scheduleChallengeJoinUsersService.update({id: user.id},{trek_level_id: null});
                this.activityLogService.create(user, {trek_level_id: null}, tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE_JOIN_USERS, req.tokenUser?.id, 'remove commitement level');
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: 'Commitment level removed successfully',
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
    @Post('get-one')
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: GetoneChallengeInput) {
        try {
            if (!postData?.id || !postData?.challenge_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let resultedData = await this.commitmentLevelsService.findOne({id: postData?.id, challenge_id: postData?.challenge_id});
            resultedData = <any>(
                await this.commonArrayService.formatToDto(CommitmentLevelsDto, resultedData, req.lang)
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
                  data: null,
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }
    @Post('list')
    async list(@Req() req: Request, @Res() res: Response, @Body() postData: any){
        try {
            let where: any = { status: 1 };  
            if(postData?.schedule_id){
                where['schedule_id'] = postData?.schedule_id;
            }          
            if(postData?.challenge_id){
                where['challenge_id'] = postData?.challenge_id;
            }          
            let result = await this.commitmentLevelsService.listRecord(where);
            result = <any>(
                await this.commonArrayService.formatToDto(CommitmentLevelsDto, result, req.lang)
            );
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: result,
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
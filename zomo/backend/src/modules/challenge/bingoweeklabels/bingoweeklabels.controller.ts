import { BingoWeekLabelsDto, CommonArrayService, tableConstant } from '@common-constants';
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
    CreateBingoWeekLabelsInput,
    DeleteChallengeInput,
    GetOneChallengeInput,
    UpdateBingoWeekLabelsInput
} from "../../../input";
import { TranslationService } from "../../translation/translation.service";
import { ScheduleChallengeService } from '../schedulechallenge/schedulechallenge.service';
import { BingoWeekLabelsService } from './bingoweeklabels.service';
@Controller('challenge/bingo-week-labels')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class BingoWeekLabelsController {
    constructor(
        private readonly bingoWeekLabelsService: BingoWeekLabelsService,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        private readonly scheduleChallengeService: ScheduleChallengeService,
    ) {}
    @Post('create')
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateBingoWeekLabelsInput) {
        try {
            if (!postData?.schedule_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let challengeDetails = await this.scheduleChallengeService.findOne({id: postData?.schedule_id});
            if(postData?.weeks){
                for(let week of postData?.weeks){
                    let recordDetails = await this.bingoWeekLabelsService.save({...week, created_by: req.tokenUser?.id});
                    let dynamicData = Object.create(null);
                    if(week.week_custom_name){
                        let title = `bingoweek_labels_${challengeDetails.id}_${recordDetails['id']}`
                        dynamicData[`${title}`]= week.week_custom_name;
                    }            
                    await this.translatorService.DynamicEngJsonData('Challenge',challengeDetails.org_id,dynamicData,'Edit','MyChallenges',recordDetails['schedule_id']);
                }
            }
            else{
                await this.bingoWeekLabelsService.save({...postData});
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang,'Weeks label has been successfully saved.')
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
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: UpdateBingoWeekLabelsInput) {
        try {
            if (postData?.weeks) {
                for (const week of postData?.weeks) {
                    if(week.id){
                        const recordDetails = await this.bingoWeekLabelsService.findOne({
                            id: week.id,
                          });
                        await this.bingoWeekLabelsService.update({id: week.id},{ ...week, updated_by: req.tokenUser?.id });
                        let dynamicData = Object.create(null);
                        if(week.week_custom_name){
                            let title = `bingoweek_labels_${recordDetails['scheduleChallenge'].id}_${recordDetails['id']}`
                            dynamicData[`${title}`]= week.week_custom_name;
                        }            
                        await this.translatorService.DynamicEngJsonData('Challenge',recordDetails['scheduleChallenge'].org_id,dynamicData,'Edit','MyChallenges',recordDetails['schedule_id']);
                        this.activityLogService.create(
                            recordDetails,
                            week,
                            tableConstant.CHALLENGE.TBL_CH_BINGO_WEEK_LABELS,
                            req.tokenUser?.id
                          );
                    }
                    else{
                        await this.bingoWeekLabelsService.save({ ...week, created_by: req.tokenUser?.id });
                    }
                }
              } 
              else if (!postData?.id || !postData?.schedule_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
              } else {
                const recordDetails = await this.bingoWeekLabelsService.findOne({
                  id: postData?.id,
                  schedule_id: postData?.schedule_id,
                });
                if (!recordDetails) {
                  throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
                }
                await this.bingoWeekLabelsService.update(
                  { id: postData?.id, schedule_id: postData?.schedule_id },
                  { ...postData }
                );
                this.activityLogService.create(
                  recordDetails,
                  postData,
                  tableConstant.CHALLENGE.TBL_CH_BINGO_WEEK_LABELS,
                  req.tokenUser?.id
                );
              }
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang,'Weeks label has been successfully saved.')
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
            if (!postData?.id || !postData?.schedule_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.bingoWeekLabelsService.findOne({
                id: postData?.id,schedule_id: postData?.schedule_id
            });
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            await this.bingoWeekLabelsService.update({id: postData?.id, schedule_id: postData?.schedule_id},{status: 2});
            this.activityLogService.create(recordDetails, {week_custom_name: recordDetails}, tableConstant.CHALLENGE.TBL_CH_BINGO_WEEK_LABELS, req.tokenUser?.id, 'delete');
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang,'Weeks label has been deleted successfully')
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
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: GetOneChallengeInput) {
        try {
            if (!postData?.id || !postData?.schedule_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let resultedData = await this.bingoWeekLabelsService.findOne({id: postData?.id, schedule_id: postData?.schedule_id, status: 1});
            resultedData = <any>(
                await this.commonArrayService.formatToDto(BingoWeekLabelsDto, resultedData, req.lang)
            );
            if(resultedData.week_custom_name){
                let customName = await this.translatorService.frontendReadTranslation(req.lang,`bingoweek_labels_${resultedData.schedule_id}_${resultedData['id']}`, `/LC_MESSAGES/Challenge/MyChallenges/${resultedData['scheduleChallenge'].org_id}/${resultedData.schedule_id}`,`dynamic`);
                resultedData.week_custom_name = (customName == '' || customName == `bingoweek_labels_${resultedData.schedule_id}_${resultedData['id']}`) ? resultedData['week_custom_name'] : customName;
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
                  data: null,
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }
    @Post('list')
    async list(@Req() req: Request,@Res() res: Response, @Body() postData: any){
        try {
            let where: any = { status: 1};            
            let  result = await this.bingoWeekLabelsService.listRecord(where);
            result = <any>(
                await this.commonArrayService.formatToDto(BingoWeekLabelsDto, result, req.lang)
            );
            await Promise.all(result.map(async (ele) => {
                if(ele.week_custom_name){
                    let customName = await this.translatorService.frontendReadTranslation(req.lang,`bingoweek_labels_${ele.schedule_id}_${ele['id']}`, `/LC_MESSAGES/Challenge/MyChallenges/${ele['scheduleChallenge'].org_id}/${ele.schedule_id}`,`dynamic`);
                    ele.week_custom_name = (customName == '' || customName == `bingoweek_labels_${ele.schedule_id}_${ele['id']}`) ? ele['week_custom_name'] : customName;
                }
            }));
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
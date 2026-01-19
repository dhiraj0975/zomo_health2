import { appConstant, CommonArrayService, CommonService, tableConstant, UcaSettingDto } from '@common-constants';
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
import { Request, Response } from 'express';
import { PaginateWithCompanyInput } from 'src/input';
import { BrokerService } from 'src/modules/broker/broker.service';
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import { Like, Not } from "typeorm";
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import { TranslationService } from "../../translation/translation.service";
import { CreateSettingInput, DeleteSettingInput, GetoneSettingInput, ListSettingInput, UpdateSettingInput } from './input';
import { SettingService } from './setting.service';
@Controller('up-coming-activities/setting')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class SettingController {
    constructor(
        private readonly settingService: SettingService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        private readonly brokerService: BrokerService,
    ) {}
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithCompanyInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            if (!postData?.org_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let where = `setting.org_id = ${postData?.org_id} AND status = '1'`;
            if (postData?.search_str) {
                where += ` AND (setting.events LIKE '%${postData?.search_str}%' OR setting.challenges LIKE '%${postData?.search_str}%' OR setting.manual_entry LIKE '%${postData?.search_str}%' OR setting.incentive LIKE '%${postData?.search_str}%' OR setting.future_plan LIKE '%${postData?.search_str}%' OR setting.timeline LIKE '%${postData?.search_str}%')`;
            }
            let resultedData = await this.settingService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(UcaSettingDto, resultedData['list'], req.lang)
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
    @Post('create')
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateSettingInput) {
        try {
            if (!postData?.org_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            await this.settingService.save({...postData});
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: 'success'
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
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: UpdateSettingInput) {
        try {
            if (!postData?.id && !postData?.org_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            if ([appConstant.ROLE.BROKERADMIN, appConstant.ROLE.BROKER, appConstant.ROLE.REGIONALADMIN].includes(req.tokenUser?.role_id)) {
                if (!postData?.org_id) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
                }
            }
            let user = Object.create(req.tokenUser)
            let roleId: number = user.role_id;
            let userId: number = user.id;
            // Check for Broker-Admin, Broker, Regional-Admin role that org_id exits or not.
            if ([appConstant.ROLE.BROKERADMIN, appConstant.ROLE.BROKER, appConstant.ROLE.REGIONALADMIN].includes(req.tokenUser?.role_id)) {
                const checkRoleBBR = await this.brokerService.checkOrgAuthorization(
                    roleId,
                    userId,
                    postData?.org_id,
                );
                if (!checkRoleBBR) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_UNAUTHORIZATION_LOCATION"));
                }
            }
            const where : object = postData?.id ? postData?.org_id ? { id: postData?.id, org_id: postData?.org_id } : { id: postData?.id}: { org_id: postData?.org_id};
            let recordDetails = await this.settingService.findOne(where);
            if(!recordDetails){
               await this.settingService.save(postData);
            }
            else{
                await this.settingService.update({ id: recordDetails?.id, org_id: postData?.org_id },{...postData});
                this.activityLogService.create(recordDetails, postData, tableConstant.UPCOMING_ACTIVITIES.TBL_UCA_SETTING, req.tokenUser?.id);
            }
            recordDetails = await this.settingService.findOne(where);
            recordDetails = <any>(
                await this.commonArrayService.formatToDto(UcaSettingDto, recordDetails, req.lang)
            );
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: recordDetails,
                message: 'Upcoming activity setting saved successfully.'
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
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: DeleteSettingInput) {
        try {
            if (!postData?.id || !postData?.org_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let where = { id: postData?.id, org_id: postData?.org_id };
            const recordDetails = await this.settingService.findOne({...where});
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_RECORD_NOT_FOUND'));
            }
            await this.settingService.update(where,{status: 2});
            this.activityLogService.create(recordDetails, {status:2}, tableConstant.UPCOMING_ACTIVITIES.TBL_UCA_SETTING, req.tokenUser?.id, 'delete');
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
    @Post('get-one')
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: GetoneSettingInput) {
        try {
            if (!postData?.id && !postData?.org_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            if ([appConstant.ROLE.BROKERADMIN, appConstant.ROLE.BROKER, appConstant.ROLE.REGIONALADMIN].includes(req.tokenUser?.role_id)) {
                if (!postData?.org_id) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
                }
            }
            let user = Object.create(req.tokenUser)
            let roleId: number = user.role_id;
            let userId: number = user.id;
            // Check for Broker-Admin, Broker, Regional-Admin role that org_id exits or not.
            if ([appConstant.ROLE.BROKERADMIN, appConstant.ROLE.BROKER, appConstant.ROLE.REGIONALADMIN].includes(roleId)) {
                const checkRoleBBR = await this.brokerService.checkOrgAuthorization(
                    roleId,
                    userId,
                    postData?.org_id,
                );
                if (!checkRoleBBR) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_UNAUTHORIZATION_LOCATION"));
                }
            }  
            let where = postData?.org_id ? postData?.id ? {id: postData?.id, org_id: postData?.org_id} : {org_id: postData?.org_id} : {id: postData?.id};
            let resultedData = await this.settingService.findOne(where);
            resultedData = <any>(
                await this.commonArrayService.formatToDto(UcaSettingDto, resultedData, req.lang)
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
    async list(@Req() req: Request, @Res() res: Response, @Body() postData: ListSettingInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            if (!postData?.org_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let where: any = { org_id: postData?.org_id, status: Not('0')};
            if (postData?.search_str) {
                where = [
                    { org_id: postData?.org_id, status: Not('0'), events: Like('%' + postData?.search_str + '%') },
                    { org_id: postData?.org_id, status: Not('0'), challenges: Like('%' + postData?.search_str + '%') },
                    { org_id: postData?.org_id, status: Not('0'), manual_entry: Like('%' + postData?.search_str + '%') },
                    { org_id: postData?.org_id, status: Not('0'), incentive: Like('%' + postData?.search_str + '%') },
                    { org_id: postData?.org_id, status: Not('0'), future_plan: Like('%' + postData?.search_str + '%') },
                    { org_id: postData?.org_id, status: Not('0'), timeline: Like('%' + postData?.search_str + '%') },
                ];
            }
            const order = postData && postData?.order ? postData?.order : 'DESC';
            const orderBy = postData && postData?.order_by ? postData?.order_by : 'id';
            let resultedData = await this.settingService.listRecord(["id","org_id","events","challenges","manual_entry","incentive","future_plan","timeline","status","created","updated"],where, { [orderBy]: order });
            resultedData = <any>(
                await this.commonArrayService.formatToDto(UcaSettingDto, resultedData, req.lang)
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
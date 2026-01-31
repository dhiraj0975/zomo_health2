import { BiometricOrgSettingDto, CommonArrayService, CommonDateService, CommonService, OrgBiometricDto, tableConstant } from '@common-constants';
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
import { AccessGuard, RoleGuard, TokenGuard } from "../../../guard";
import { CreateBiometricOrgSettingInput } from '../../../input';
import { TranslationService } from '../../translation/translation.service';
import { OrgBiometricService } from '../orgBiometric/orgBiometric.service';
import { BiometricOrgSettingService } from './biometricOrgSetting.service';
@Controller('biometric-org-setting')
@UseGuards(TokenGuard,RoleGuard, AccessGuard)
export class BiometricOrgSettingController {
    constructor(
        private readonly biometricOrgSettingService: BiometricOrgSettingService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        private readonly orgBiometricService: OrgBiometricService,
        private readonly commonDateService: CommonDateService,
    ) {}
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            let where = `status !='0'`;
            postData = this.commonService.sanitizePayload(postData)
            if (postData?.search_str) {
                where += `AND(biometricOrg.is_physician_follow LIKE '%${postData?.search_str}%' OR biometricOrg.is_talk_to_coach LIKE '%${postData?.search_str}%' OR biometricOrg.is_join_challenge LIKE '%${postData?.search_str}%' OR biometricOrg.is_learn_more LIKE '%${postData?.search_str}%')`;
            }
            const resultedData =
                await this.biometricOrgSettingService.paginateList(
                    where,
                    postData,
                );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(
                    BiometricOrgSettingDto,
                    resultedData['list'],
                    req.lang
                )
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
    @Post('get-one')
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id && !postData?.org_id) {
                throw new Error(
                  await this.translatorService.frontendReadTranslation(
                        req.lang,
                        "ERR_REQUIRED_PARAM_MISSING",
                    ),
                );
            }
            const where = { status: 1};
            if(postData?.id){
                where['id'] = postData?.id;
            }
            if(postData?.org_id){
                where['org_id'] = postData?.org_id;
            }
            let biometricDetails = await this.biometricOrgSettingService.findOne(where);
            if (!biometricDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,"ERR_RECORD_NOT_FOUND"),);
            }
            biometricDetails = <any>(await this.commonArrayService.formatToDto(BiometricOrgSettingDto, biometricDetails, req.lang));
            if(biometricDetails?.['biometricOrg']?.length){
                biometricDetails['biometricOrg'] = <any>(await this.commonArrayService.formatToDto(OrgBiometricDto,biometricDetails?.['biometricOrg'],req.lang));
            }
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
    async create(
        @Req() req: Request,
        @Res() res: Response,
        @Body() postData: CreateBiometricOrgSettingInput,
    ) {
        try {
            if (postData?.org_id == undefined) {
                throw new Error(
                  await this.translatorService.frontendReadTranslation(
                        req.lang,
                        "ERR_REQUIRED_PARAM_MISSING",
                    ),
                );
            }
            const recordDetails =
                await this.biometricOrgSettingService.findOne({
                    org_id: postData?.org_id,
                });
            if (!recordDetails) {
               await this.biometricOrgSettingService.save(postData);
            }
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
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id) {
                throw new Error(
                  await this.translatorService.frontendReadTranslation(
                        req.lang,
                        "ERR_REQUIRED_PARAM_MISSING",
                    ),
                );
            }
            const where = { id: postData?.id };
            const recordDetails =
                await this.biometricOrgSettingService.findOne(where);
            if (!recordDetails) {
                throw new Error(
                  await this.translatorService.frontendReadTranslation(
                        req.lang,
                        "ERR_RECORD_NOT_FOUND",
                    ),
                );
            }
            await this.biometricOrgSettingService.update(where,{status: 2});
            this.activityLogService.create(recordDetails, postData, tableConstant.BIOMETRIC.BIR_BIOMETRIC_ORG_SETTING, req.tokenUser?.id, 'delete');
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
    async update(
        @Req() req: Request,
        @Res() res: Response,
        @Body() postData: CreateBiometricOrgSettingInput,
    ) {
        try {
            if (
                !postData?.id ||
                postData?.org_id == undefined
            ) {
                throw new Error(
                  await this.translatorService.frontendReadTranslation(
                        req.lang,
                        "ERR_REQUIRED_PARAM_MISSING",
                    ),
                );
            }
            const where = { id: postData?.id };
            const recordDetails =
                await this.biometricOrgSettingService.findOne(where);
            if (!recordDetails) {
                await this.biometricOrgSettingService.save({
                    ...postData,
                });
            }
            await this.biometricOrgSettingService.update(where, postData);
            this.activityLogService.create(recordDetails, postData, tableConstant.BIOMETRIC.BIR_BIOMETRIC_ORG_SETTING, req.tokenUser?.id);
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
    @Post('list')
    async list(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            const where = {
                status: 1,
            };
            let resultedData =
                await this.biometricOrgSettingService.listRecord(where);
            resultedData = <any>(
                await this.commonArrayService.formatToDto(
                    BiometricOrgSettingDto,
                    resultedData,
                    req.lang
                )
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

    @Post('upsert')
    async upsert(@Req() req: Request, @Res() res: Response,@Body() postData: CreateBiometricOrgSettingInput) {
        try {
            if (postData?.org_id == undefined) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,"ERR_REQUIRED_PARAM_MISSING"));
            }
            let update = 0;
            const org_id = postData.org_id;

            const biometricResult = await this.orgBiometricService.listRecord(`orgBiometric.company_id = ${org_id} AND orgBiometric.status != 2`);
            const biometricTestSetting = postData?.setting;
            delete postData?.setting;
            let recordDetails: any = await this.biometricOrgSettingService.findOne({org_id: postData?.org_id}); 
            if(postData['qualifie_type']==2){
                postData['option'] = postData['option1']; 
            }
            if(postData['qualifie_type']==0){
                postData['option'] = 0;
            }
            if(postData['qualifie_type']==0 || postData['qualifie_type']==1 || postData['qualifie_type']==2){
                postData['category_option'] = 1;
            }
            if(postData['qualifie_type']==3){
                postData['option'] = 0;
            }
            if(!postData['is_required']){
                postData['is_required'] = 0;
            }
            if(!postData['category_option']){
                postData['category_option'] = 1;
            }
            if(postData['is_hire_date']!=''){
                if(postData['is_hire']==1){ 
                    postData['is_hire_date'] = this.commonDateService.DateTimeFormat(postData['is_hire_date'],'YYYY-MM-DD');
                }else{
                    postData['is_hire_date'] = null;
                }
            }
            else{
                postData['is_hire_date'] = null;
            }
            postData['created'] = this.commonDateService.DateTimeFormat('now','YYYY-MM-DD hh:mm:ss');
            if(recordDetails){
                await this.biometricOrgSettingService.update({id: recordDetails.id}, postData);
                update = 1;
            }
            else{
                recordDetails = await this.biometricOrgSettingService.save(postData);
            }
            let dynamicData = Object.create(null);
            if(postData['is_complete_message']!=''){
               let title = `complete_${recordDetails['id']}`;
                dynamicData[`${title}`]= postData?.is_complete_message;
            }
            if(postData['is_incomplete_message']!=''){
                let title = `incomplete_${recordDetails['id']}`;
                dynamicData[`${title}`]= postData?.is_incomplete_message;
            }
            if(postData['is_ontrack_message']!=''){
                let title = `ontrack_${recordDetails['id']}`;
                dynamicData[`${title}`]= postData?.is_ontrack_message;
            }
            await this.translatorService.DynamicEngJsonData('Dashboard',postData?.org_id,dynamicData,'Edit','HealthyBiometricsProgram',null);
            let invalidBlocks = [];
            for(const biometric of biometricTestSetting){
                if(biometric?.id){
                    const orgBiometricDetails = biometricResult.find((orgBiometric) => orgBiometric.id === biometric.id);
                    biometric.id = orgBiometricDetails ? biometric.id : null;
                }
                biometric['company_id'] = org_id;
                biometric['created'] = postData['created'];
                biometric['test1_start_date'] = biometric['test1_start_date'] ? this.commonDateService.DateTimeFormat(biometric['test1_start_date'],'YYYY-MM-DD') : '';
                biometric['test1_end_date'] = biometric['test1_end_date'] ? this.commonDateService.DateTimeFormat(biometric['test1_end_date'],'YYYY-MM-DD') : '';
                biometric['test2_start_date'] = biometric['test2_start_date'] ? this.commonDateService.DateTimeFormat(biometric['test2_start_date'],'YYYY-MM-DD') : '';
                biometric['test2_end_date'] = biometric['test2_end_date'] ? this.commonDateService.DateTimeFormat(biometric['test2_end_date'],'YYYY-MM-DD') : '';

                biometric['is_optional'] = biometric['is_optional'] ?? 0;
                biometric['is_optional_type'] = biometric['is_optional_type'] ?? 0;

                biometric['start_range_male'] = biometric['start_range_male'] ?? 0;
                biometric['end_range_male'] = biometric['end_range_male'] ?? 0;
                biometric['start_range_female'] = biometric['start_range_female'] ?? 0;
                biometric['end_range_female'] = biometric['end_range_female'] ?? 0;

                biometric['graph_low_start'] = biometric['graph_low_start'] ?? 0;
                biometric['graph_low_end'] = biometric['graph_low_end'] ?? 0;
                biometric['graph_mod_start'] = biometric['graph_mod_start'] ?? 0;
                biometric['graph_mod_end'] = biometric['graph_mod_end'] ?? 0;
                biometric['graph_high_start'] = biometric['graph_high_start'] ?? 0;
                biometric['graph_high_end'] = biometric['graph_high_end'] ?? 0;
                biometric['graph_vhigh_start'] = biometric['graph_vhigh_start'] ?? 0;
                biometric['graph_vhigh_end'] = biometric['graph_vhigh_end'] ?? 0;

                biometric['is_required'] = 0;
                biometric['created_by'] = req?.tokenUser?.id;
                biometric['status'] = 1;
                if(!biometric['test1_start_date'] || !biometric['test1_end_date'] || !biometric['test2_start_date'] || !biometric['test2_end_date']){
                    invalidBlocks.push(biometric);
                }
                else{
                    if(biometric?.id){
                        await this.orgBiometricService.update({id: biometric.id}, biometric);
                    }
                    else {
                        await this.orgBiometricService.save(biometric);
                    }
                }
            }
            let message = 'success';
            if(invalidBlocks.length == 0){
                message = update ? `Biometrics Successfully Updated.` : `Biometrics Successfully Added.`;
            }
            else{
                message = 'Some Biometrics Successfully Added. Following are not added, please fix that & try again...'
            }
            message = await this.translatorService.frontendReadTranslation(req.lang, message);
            return res.status(HttpStatus.CREATED).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: invalidBlocks.length > 0 ? invalidBlocks : null,
                message,
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

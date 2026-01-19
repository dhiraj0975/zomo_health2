import { appConstant, BiometricsDto, CommonArrayService, CommonDateService, CommonFileService, CommonService, tableConstant } from '@common-constants';
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
import * as moment from 'moment-timezone';
import { CompanyService } from 'src/modules/company/companies/company.service';
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import { Not } from 'typeorm';
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import {
    CreateBiometricsInput,
    DeleteHealthCheckupInput,
    GetOneHealthCheckupInput,
    PaginateInput,
    UpdateBiometricsInput
} from "../../../input";
import { TranslationService } from "../../translation/translation.service";
import { DentistsService } from "../dentists/dentists.service";
import { FormInstructionsService } from "../forminstructions/forminstructions.service";
import { OptometristsService } from "../optometrists/optometrists.service";
import { TobaccoUsesService } from "../tobaccouses/tobaccouses.service";
import { BiometricsService } from './biometrics.service';
@Controller('health-checkup/biometrics')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class BiometricsController {
    constructor(
        private readonly biometricsService: BiometricsService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonDateService: CommonDateService,
        private readonly commonFileService: CommonFileService,
        private readonly translatorService: TranslationService,
        private readonly companyService: CompanyService,
        private readonly tobaccoUsesService: TobaccoUsesService,
        private readonly formInstructionsService: FormInstructionsService,
        private readonly dentistsService: DentistsService,
        private readonly optometristsService: OptometristsService,
        private readonly activityLogService: ActivityLogService,
    ) {}
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let where = `biometrics.physician_id=${req.tokenUser?.id} AND user.status = 1 AND biometrics.status != 2`;
            if (postData?.search_str) {
                if (moment(postData?.search_str, 'll', true).isValid()) {
                    where += `  AND biometrics.created LIKE '%${moment(postData?.search_str, 'll', true).isValid() ? moment(postData?.search_str, 'll').format('YYYY-MM-DD') : ''}%'`
                }
                else {
                    const search = postData?.search_str.toLowerCase();
                    where += ` AND (LOWER(user.first_name) LIKE '%${search}%' OR LOWER(user.last_name) LIKE '%${search}%' OR LOWER(CONCAT(user.first_name, ' ', user.last_name)) LIKE '%${search}%')`
                }
            }
            let resultedData 
            if(postData?.user_id){
                where = `biometrics.physician_id=${req.tokenUser?.id} AND user.status = 1 AND biometrics.user_id = ${postData?.user_id}`
                resultedData = await this.biometricsService.paginateUserList(
                    where,
                    postData,
                );
            }else{
                resultedData = await this.biometricsService.paginateList(
                    where,
                    postData,
                );
            }
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(BiometricsDto, resultedData['list'], req.lang)
            );
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: resultedData,
                message: 'success',
            });
        } catch (error) {
            await this.activityLogService.error_log(req.tokenUser?.id, req?.originalUrl, error?.message, error);
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
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateBiometricsInput) {
        try {
            if (!postData?.user_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            await this.biometricsService.save({...postData});
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
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: UpdateBiometricsInput) {
        try {
            if (!postData?.id || !postData?.user_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.biometricsService.findOne({ id: postData?.id, user_id: postData?.user_id, status: Not(2) });
            await this.biometricsService.update({ id: postData?.id, user_id: postData?.user_id },{...postData});
            this.activityLogService.create(recordDetails, postData, tableConstant.HEALTH_CHECKUP.TBL_HC_BIOMETRICS, req.tokenUser?.id);
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
    @Post('delete')
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: DeleteHealthCheckupInput) {
        try {
            if (!postData?.id || !postData?.user_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.biometricsService.findOne({
                id: postData?.id,
                user_id: postData?.user_id, status: Not(2)
            });
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            await this.biometricsService.update({id: postData?.id, user_id: postData?.user_id},{status: 2});
            this.activityLogService.create(recordDetails, {disease_id: recordDetails}, tableConstant.HEALTH_CHECKUP.TBL_HC_BIOMETRICS, req.tokenUser?.id, 'delete');
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
                  data: [],
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }
    @Post('preventive-care')
    async  preventiveCare(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let where = `biometrics.id != 0 AND  biometrics.aas_form_prog != '' AND biometrics.status !=2`;
            if (!postData?.terminated_users) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            if (!postData?.org_id) {
                const companyData = await this.companyService.listRecord(`company.deleted = 0 AND company.status = 1 AND activeplugin.plugin_name LIKE '%"Hra":1%'`);
                postData.org_id = companyData && companyData.length ? companyData.map((e)=>e.id).join(',') : ''; 
            }
            if(postData?.org_id && postData?.org_id != ''){
                where += ` AND user.org_id IN(${postData?.org_id.split(',')})`;
            }
            if(postData?.dept_id && postData?.dept_id != ''){
                where += ` AND user.department_id IN(${postData?.dept_id.split(',')})`;
            }
            if(postData?.loc_id && postData?.loc_id != ''){
                where += ` AND user.location IN(${postData?.loc_id.split(',')})`;
            }
            if(postData?.terminated_users && postData?.terminated_users != 1){
                where += ` AND user.status = 1`;
            }else{
                where += ` AND user.status != 2`;
            }
            if(postData?.start_date && postData?.end_date){
                let start_date = this.commonDateService.DateTimeFormat(postData?.start_date,'YYYY-MM-DD','DD-MM-YYYY');
                let end_date = this.commonDateService.DateTimeFormat(postData?.end_date,'YYYY-MM-DD','DD-MM-YYYY');
                where += ` AND biometrics.created BETWEEN '${start_date} 00:00:00' AND '${end_date} 23:59:59' `;
            }
            if(postData?.physician_entered == 1){
                where += ` AND biometrics.source IN(3,11,12)`;
            }
            if(postData?.physician_entered == 0){
                where += ` AND biometrics.source IN(1,13,14,15)`;
            }
            if (postData?.search_str) {
                where += ` AND(CONCAT(user.first_name, ' ', user.last_name) LIKE '%${postData?.search_str}%' OR company.company_name LIKE '%${postData?.search_str}%' OR department.dept_name LIKE '%${postData?.search_str}%' OR location.location_name LIKE '%${postData?.search_str}%')`;
            }
            let fields =[`CONCAT(user.first_name, ' ', user.last_name) AS full_name`,'biometrics.id','biometrics.aas_form_prog','biometrics.source','biometrics.enter_by','biometrics.created','biometrics.inserted','user.id','user.code','user.first_name','user.middle_name','user.last_name','user.username','user.gender','user.email','user.dob','user.date_of_hire','user.employeeid','user.user_type','user.on_insurance_plan','user.insurance_plan_name','company.id','company.company_name','settings.jobtitle','department.id','department.dept_name','location.id', 'location.location_name'];
            let resultedData: any = await this.biometricsService.listRecord(where,null, fields, ((postData?.page || postData?.limit) && postData?.result_type ==1) ? {page: postData?.page, limit: postData?.limit, group_by: true}: {group_by: true});
            let sheetName = `HRAPreventativeCare-Report-${moment().format('DD-MM-YYYY-HH-mm-ss')}`;
            let excelData = null;
            let response = {}
            if(postData?.result_type == 2){
                const transformedArray = this.commonArrayService.transformArray(resultedData);
                excelData = await this.commonFileService.createCSV([...appConstant.USER_HEADERS,...appConstant.PREVENTATIVE_CARE_HEADERS],transformedArray,sheetName);
                let encrypted = this.commonService.passwordEncrypt(excelData); 
                response['file_name'] = sheetName;
                response['file_data'] = encrypted;
                response['extension'] = 'csv';
            }
            else{
                await Promise.all(resultedData['list']?.map(async (ele)=>{
                    if(ele.user){
                        ele.user_id = ele?.user?.id;
                        ele.company = ele?.user?.company;
                        ele.department = ele?.user?.department;
                        ele.location = ele?.user?.location;
                        ele.full_name = ele?.user?.first_name + ' ' + ele?.user?.last_name;
                        delete ele.user;
                    }
                }));
                response = resultedData;
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: response,
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
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: GetOneHealthCheckupInput) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let resultedData = await this.biometricsService.findOne({id: postData?.id, status: Not(2)});
            resultedData = <any>(
                await this.commonArrayService.formatToDto(BiometricsDto, resultedData, req.lang)
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
    @Post('physician-credit-remove')
    async physicianCreditRemove(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateInput) {
        try {
            if (!postData?.search_str) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            const order = postData && postData?.order ? postData?.order : 'DESC';
            const orderBy = postData && postData?.order_by ? postData?.order_by : 'id';
            let resultedData = await this.biometricsService.creditRemove(postData, { [orderBy]: order });
            await Promise.all(resultedData.list.map((e)=>{e['enter_by']= this.commonService.writeEnterBy(e?.source, e?.enter_by); return e}))
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
    @Post('health-data')
    async healthData(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            postData.user_id = postData?.user_id ?? req.tokenUser?.id;
            if (!postData?.user_id || !postData?.org_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let where = {user_id: postData?.user_id, status: '1'}
            let resultedData = await this.biometricsService.biometricsRecord({'bio': where,'hra_bio': where,'ft_bio': where},postData,[tableConstant.TRACKERS.TBL_FT_BIOMETRICS,tableConstant.HEALTH_ASSESSMENT.TBL_HA_HRABIOMETRICS]);
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(BiometricsDto, resultedData['list'], req.lang)
            );
            const tobaccoData = await this.tobaccoUsesService.findOne({
                user_id: postData?.user_id,
                type_of_form: 'Tabacco', status: Not(2)
            });
            let tobaccoStatus = 'Not Complete',tobaccoDateFrom:any = '--/--/----',tobaccoUser = 'Not Complete',dentistsStatus = 'Not Complete', dentistsDateFrom:any = '--/--/----',optometristDateFrom:any = '--/--/----',optometristStatus = 'Not Complete',tobaccoExpirationDate:any = '--/--/----',PreventiveExpirationDate:any = '--/--/----',PreventativeExpirationDate:any = '--/--/----';
            if (tobaccoData) {
                let tobaccoUserArray = {1: 'No', 2: 'Yes', 3: 'Tobacco user participating in a tobacco cessation program'};
                tobaccoStatus = postData?.user_id == tobaccoData.user_id ? 'Complete' : 'Not Complete';
                tobaccoDateFrom = moment(tobaccoData.date_completed).format('MM-DD-YYYY') ?? '--/--/----';
                tobaccoUser = tobaccoUserArray[tobaccoData.is_tobacco_user] ?? 'Not Complete';
            }
            const formInstructionsData = await this.formInstructionsService.findOne({company_id: postData?.org_id, status: Not(5)});
            if ([1, 2].includes(formInstructionsData?.date_range)) {
                let dateValue = new Date(formInstructionsData['ta_end_date']);
                if (!isNaN(dateValue.getTime())) {
                    tobaccoExpirationDate = await this.commonDateService.DateTimeFormat(formInstructionsData['ta_end_date'], 'MM-DD-YYYY');
                }
                let dvfDateValue = new Date(formInstructionsData['dvf_end_date']);
                if (!isNaN(dvfDateValue.getTime())) {
                    PreventiveExpirationDate = await this.commonDateService.DateTimeFormat(formInstructionsData['dvf_end_date'], 'MM-DD-YYYY');
                }
                let ovfDateValue = new Date(formInstructionsData['ovf_end_date']);
                if (!isNaN(ovfDateValue.getTime())) {
                    PreventativeExpirationDate = await this.commonDateService.DateTimeFormat(formInstructionsData['dvf_end_date'], 'MM-DD-YYYY');
                }
            }
            const dentistsData = await this.dentistsService.findOne({userid: postData?.user_id, status: Not(2)});
            if (dentistsData) {
                dentistsStatus = postData?.user_id == dentistsData.userid ? 'Complete' : 'Not Complete';
                dentistsDateFrom = await this.commonDateService.DateTimeFormat(dentistsData.date_completed, 'MM-DD-YYYY');
                dentistsDateFrom = dentistsDateFrom == '' ? '--/--/----' : dentistsDateFrom;
            }
            const optometristData = await this.optometristsService.findOne({
                userid: postData?.user_id, status: Not(2)
            });
            if (optometristData) {
                optometristDateFrom = await this.commonDateService.DateTimeFormat(optometristData.date_completed, 'MM-DD-YYYY');
                optometristDateFrom = optometristDateFrom == '' ? '--/--/----' : optometristDateFrom;
                optometristStatus = postData?.user_id == optometristData.userid ? 'Complete' : 'Not Complete';
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: {tobacco_status: tobaccoStatus,dentists_status: dentistsStatus,optometrist_status: optometristStatus,tobacco_date_from: tobaccoDateFrom,dentists_date_from: dentistsDateFrom,optometrist_date_from: optometristDateFrom,tobacco_user: tobaccoUser,tobacco_expiration_date: tobaccoExpirationDate,preventive_date: PreventiveExpirationDate,preventative_date: PreventativeExpirationDate, list: resultedData},
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
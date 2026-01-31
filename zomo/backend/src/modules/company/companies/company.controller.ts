import { SliderSettingsService } from '@/modules/campaign/slidersettings/slidersettings.service';
import {
    AssessmentHaQuestionsService
} from "@/modules/healthassessment/assessmenthaquestions/assessmenthaquestions.service";
import {
    appConstant,
    AssessmentHaQuestionsEntity,
    CommonArrayService,
    CommonDateService,
    CommonFileService,
    CommonService,
    CompaniesDto,
    CompaniesV1Dto,
    CompanyCEMInfoDto,
    CompanyContractDto, Enum,
    imageConstant,
    tableConstant
} from '@common-constants';
import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Inject,
    Post,
    Put,
    Req,
    Res,
    UploadedFiles,
    UseGuards,
    UseInterceptors,
    Version,
    VERSION_NEUTRAL
} from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { FileFieldsInterceptor } from "@nestjs/platform-express";
import { Request, Response } from "express";
import { diskStorage } from "multer";
import { lastValueFrom } from "rxjs";
import { BrokerService } from 'src/modules/broker/broker.service';
import { CoachesService } from 'src/modules/coach/coaches/coaches.service';
import { ActivityLogService } from "src/modules/master/activitylog/activitylog.service";
import { TranslationService } from "src/modules/translation/translation.service";
import { In, Not } from "typeorm";
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import { CreateCompanyInput, PaginateWithCompanyInput, UpdateCompanyInput } from "../../../input";
import { fileName, imgFilter } from "../../../utils/image-upload.utils";
import { UserService } from "../../user/user/user.service";
import { ActivePluginService } from "../activeplugins/activeplugin.service";
import { ClientManagerAssignService } from "../clientmanagerassign/clientmanagerassign.service";
import { DepartmentService } from "../departments/department.service";
import { FrontService } from "../front/front.service";
import { LocationService } from "../locations/location.service";
import { MetaService } from '../meta/meta.service';
import { SettingsService } from '../settings/settings.service';
import { CompanyService } from './company.service';
import { ListCompanyInput } from './input';
import {SideMenuSettingsService} from "@/modules/company/sidemenusettings/sideMenuSettings.service";
const path = require('path');
@Controller('organization')
export class CompanyController {
    constructor(
        private readonly companyService: CompanyService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonDateService: CommonDateService,
        private readonly commonFileService: CommonFileService,
        private readonly translatorService: TranslationService,
        private readonly departmentService: DepartmentService,
        @Inject('COMMON_SERVICE') 
        private commonMicroservice: ClientProxy,
        @Inject('TIMEZONE_SERVICE') 
        private timeZoneMicroservice: ClientProxy,
        private readonly locationService: LocationService,
        private readonly activityLogService: ActivityLogService,
        private readonly userService: UserService,
        private readonly clientManagerAssignService: ClientManagerAssignService,
        private readonly activePluginService: ActivePluginService,
        private readonly frontService: FrontService,
        private readonly companySettingsService: SettingsService,
        private readonly companyMetaService: MetaService,
        private readonly coachesService: CoachesService,
        private readonly brokerService: BrokerService,
        private readonly assessmentQuestionsService: AssessmentHaQuestionsService,
        private readonly sliderSettingsService: SliderSettingsService,
        private readonly sideMenuSettingsService: SideMenuSettingsService,
    ) {}
    /*
     * Function to get paginate list of organizations
     * - can pass page, limit, order_by, order
     */
    @Post('paginate')
    @UseGuards(TokenGuard, RoleGuard, AccessGuard)
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithCompanyInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let where = `company.deleted = 0 `;
            if (postData?.hasOwnProperty('is_testing') && postData?.is_testing != 'all') {
                where += `AND company.is_testing = ${postData?.is_testing}`;
            }
            if(postData?.filter_by?.toLowerCase() == 'org_type'){
                where += ` AND company_type.company_type LIKE '%${postData?.search_str}%'`;
            }
            if (postData?.search_str && postData?.filter_by?.toLowerCase() != 'org_type') {
                if(postData?.filter_by?.toLowerCase() == 'org_code'){
                    where += ` AND(company.id LIKE '%${postData?.search_str}%' OR company.code = '${postData?.search_str}')`;
                }
                else{
                    where += ` AND (company.code LIKE '%${postData?.search_str}%' OR company.company_name LIKE '%${postData?.search_str}%' OR company.company_logo LIKE '%${postData?.search_str}%')`;
                }
            }
            if (appConstant.ROLE.CLIENTENGAGEMENTMANAGER == req.tokenUser?.role_id){
                let resultedData = await this.clientManagerAssignService.listRecord({user_id: req.tokenUser?.id, status: 1},null);
                if(resultedData.length > 0){
                    where += ` AND company.id IN (${resultedData.map(ele=>ele.org_id).join(',')})`;
                }
                else{
                    return res.status(HttpStatus.OK).json({
                        statusCode: 200,
                        success: 1,
                        error: 0,
                        data: {
                            list: [],
                            limit: postData?.limit,
                            page: postData?.page,
                            pages: 0,
                            total: 0
                        },
                        message: 'success',
                    });
                }
            }
            if(postData?.org_id){
                where += ` AND company.id IN (${postData.org_id})`;
            }
            const resultedData = await this.companyService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(CompaniesDto, resultedData['list'], req.lang)
            );
            let stateData = await this.companyService.stateList(null);
            await Promise.all(resultedData['list']?.map(async (ele) => {
                if(ele?.state){
                    let state = stateData.find(element => element.statecode == ele?.state || element.state == ele?.state);
                    ele.state = state?.['state'];
                    ele.statecode = state?.['statecode'];
                }
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
    /*
     * Function to get details of organization
     * - id is mandatory params
     */
    @Post('get-one')
    @Version(VERSION_NEUTRAL)
    @UseGuards(TokenGuard, RoleGuard, AccessGuard)
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id && !postData?.code) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = `company.deleted = 0 AND(company.id = '${postData?.id??postData?.code}' OR company.code = '${postData?.id??postData?.code}')`;
            let orgDetails = await this.companyService.findOne(where);
            if (!orgDetails) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }
            if(postData?.list){
                orgDetails['departments'] = await this.departmentService.listRecord({status: 1, company_id: orgDetails.id, deleted: 0});
                orgDetails['locations'] = await this.locationService.listRecord(['id', 'location_name', 'is_default'], {status: 1, company_id: orgDetails.id, deleted: 0});
            }
            orgDetails = <any>(
                await this.commonArrayService.formatToDto(CompaniesDto, orgDetails, req.lang)
            );
            let stateData = await this.companyService.stateList(orgDetails?.state);
            if(orgDetails?.state){
                let state = stateData.find(ele => ele.statecode == orgDetails?.state || ele.state == orgDetails?.state);
                orgDetails.state = state?.['state'];
                orgDetails['statecode'] = state?.['statecode'];
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: orgDetails,
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
    /*
     * Function to get details of organization
     * - id is mandatory params
     * version 1 - for org details in frontend tab wise for super admin
     */
    @Post('get-one')
    @Version('1')
    @UseGuards(TokenGuard, RoleGuard, AccessGuard)
    async getOneV1(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id && !postData?.code) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = `company.deleted = 0 AND(company.id = '${postData?.id??postData?.code}' OR company.code = '${postData?.id??postData?.code}')`;
            let fields =['company.id','company.is_testing','company.company_name','company.created','company.company_logo','company.company_logo_dark','company.updated'];
            let joins = [];
            if(postData.tab == 1){
                fields = [...fields,'company_type','company.phone','company.street_address','company.country','company.state','company.city','company.zip','company.status',
                'company_meta.id','company_meta.website','company_settings.id','company_settings.wellnessprog_name','company_contract.id','company_contract.broker','company_contract.billing_name','company_contract.contract_start_date','company_contract.contract_end_date',
                'company_contract.csa','company_contract.industry','company_contract.baa','company_contract.additional_agreement',
                'client_engagement_manager.id','client_engagement_manager.user_id','client_engagement_manager_user.id','client_engagement_manager_user.email','client_engagement_manager_user.first_name','client_engagement_manager_user.last_name','client_engagement_manager_user.email',
                'broker.id','broker.user_id','user.id','user.first_name','user.last_name','user.email'];
                joins = [tableConstant.COMPANIES.TBL_COMPANY_TYPE,tableConstant.COMPANIES.TBL_COMPANY_META,tableConstant.COMPANIES.TBL_COMPANY_SETTINGS,tableConstant.COMPANIES.TBL_COMPANY_CONTRACT,tableConstant.COMPANIES.TBL_C_CLIENT_MANAGER_ASSIGN,tableConstant.COMPANIES.TBL_ASSIGN_BROKERS];
            }
            if(postData.tab == 2){
                fields = [...fields,'company_contract.id',
                    'company_contract.billing_email',
                    'company_contract.billing_frequency',
                    'company_contract.billing_start_date',
                    'company_contract.billing_end_date',
                    'company_contract.package',
                    'company_contract.date_of_expense_submission',
                    'company_contract.expense_description_amount',
                    'company_contract.billing_email_cc',
                    'company_contract.billing_name',
                    'company_meta.id','company_meta.information',
                    'company_settings.id',
                    'client_engagement_manager.id','client_engagement_manager.user_id','client_engagement_manager_user.id','client_engagement_manager_user.email','client_engagement_manager_user.first_name','client_engagement_manager_user.last_name','client_engagement_manager_user.email',
                ];
                joins = [tableConstant.COMPANIES.TBL_COMPANY_CONTRACT,tableConstant.COMPANIES.TBL_COMPANY_META,tableConstant.COMPANIES.TBL_COMPANY_SETTINGS,tableConstant.COMPANIES.TBL_C_CLIENT_MANAGER_ASSIGN];
            }
            if(postData.tab == 3){
                fields = [...fields,'company_support','company_contract.id','company_meta.id','company_settings.id','client_engagement_manager.id','client_engagement_manager.user_id','client_engagement_manager_user.id','client_engagement_manager_user.email','client_engagement_manager_user.first_name','client_engagement_manager_user.last_name','client_engagement_manager_user.email','company_contract.billing_name'];
                joins = [tableConstant.COMPANIES.TBL_C_COMPANY_SUPPORT,tableConstant.COMPANIES.TBL_COMPANY_CONTRACT,tableConstant.COMPANIES.TBL_COMPANY_META,tableConstant.COMPANIES.TBL_COMPANY_SETTINGS,tableConstant.COMPANIES.TBL_C_CLIENT_MANAGER_ASSIGN];
            }
            if(postData.tab == 4){
                fields = [...fields,'company_support.id','company_contract.id','company_meta.id','company_settings.id',
                    'client_engagement_manager.id','client_engagement_manager.user_id','client_engagement_manager_user.id','client_engagement_manager_user.email','client_engagement_manager_user.first_name','client_engagement_manager_user.last_name','client_engagement_manager_user.email',
                    'company_contract.billing_name',
                    'company_info','language','languages'
                ];
                joins = [tableConstant.COMPANIES.TBL_C_COMPANY_SUPPORT,tableConstant.COMPANIES.TBL_COMPANY_META,tableConstant.COMPANIES.TBL_COMPANY_SETTINGS,tableConstant.COMPANIES.TBL_COMPANY_CONTRACT,tableConstant.COMPANIES.TBL_C_CLIENT_MANAGER_ASSIGN,tableConstant.COMPANIES.TBL_COMPANY_CEM_INFO,tableConstant.COMPANIES.TBL_LG_COMPANY_LANGUAGES];
            }
            if(postData.tab == 5){
                fields = [...fields,'company_meta.id','company_settings.id','company_contract.id','company_contract.notes_for_design_team','company_contract.branding_guideline_text','company_contract.branding_guideline_image',
                    'client_engagement_manager.id','client_engagement_manager.user_id','client_engagement_manager_user.id','client_engagement_manager_user.email','client_engagement_manager_user.first_name','client_engagement_manager_user.last_name','client_engagement_manager_user.email',
                    'company_contract.billing_name'
                ];
                joins = [tableConstant.COMPANIES.TBL_COMPANY_CONTRACT,tableConstant.COMPANIES.TBL_COMPANY_META,tableConstant.COMPANIES.TBL_COMPANY_SETTINGS,tableConstant.COMPANIES.TBL_C_CLIENT_MANAGER_ASSIGN];
            }
            if(postData.tab == 6){
                fields = [...fields,'company_contract.id','company_contract.notes_for_data_team','company_meta.id','company_settings.id',
                    'client_engagement_manager.id','client_engagement_manager.user_id','client_engagement_manager_user.id','client_engagement_manager_user.email','client_engagement_manager_user.first_name','client_engagement_manager_user.last_name','client_engagement_manager_user.email',
                    'company_contract.billing_name'
                ];
                joins = [tableConstant.COMPANIES.TBL_COMPANY_CONTRACT,tableConstant.COMPANIES.TBL_COMPANY_META,tableConstant.COMPANIES.TBL_COMPANY_SETTINGS,tableConstant.COMPANIES.TBL_C_CLIENT_MANAGER_ASSIGN];
            }

            let orgDetails = await this.companyService.findOneV1(where, joins, fields);
            if (!orgDetails) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }
            if(orgDetails?.engagement_manager?.length){
                for(let ele of orgDetails?.engagement_manager){
                    if(ele.engagement_manager_user){
                        ele['user'] = ele.engagement_manager_user;
                        delete ele.engagement_manager_user;
                    }
                }
            }
            if(orgDetails?.client_engagement_manager?.length){
                for(let ele of orgDetails?.client_engagement_manager){
                    if(ele.client_engagement_manager_user){
                        ele['user'] = ele.client_engagement_manager_user;
                        delete ele.client_engagement_manager_user;
                    }
                }
            }
            orgDetails = <any>(
                await this.commonArrayService.formatToDto(CompaniesV1Dto, orgDetails, req.lang)
            );
            if(orgDetails.company_contract){
                orgDetails.company_contract = <any>(
                    await this.commonArrayService.formatToDto(CompanyContractDto, orgDetails.company_contract, req.lang)
                );
            }
            if(orgDetails.company_info){
                orgDetails.company_info = <any>(
                    await this.commonArrayService.formatToDto(CompanyCEMInfoDto, orgDetails.company_info, req.lang)
                );
            }
            if(orgDetails?.engagement_manager?.length){
                for(let ele of orgDetails?.engagement_manager){
                    if(ele?.user){
                        ele['full_name'] = ele?.user?.full_name;
                        ele['email'] = ele?.user?.email;
                        delete ele.user;
                    }
                }
            }
            if(orgDetails?.client_engagement_manager?.length){
                for(let ele of orgDetails?.client_engagement_manager){
                    if(ele?.user){
                        ele['full_name'] = ele?.user?.full_name;
                        ele['email'] = ele?.user?.email;
                        delete ele.user;
                    }
                }
            }
            if(orgDetails?.broker?.length){
                for(let ele of orgDetails?.broker){
                    if(ele?.user){
                        ele['full_name'] = ele?.user?.full_name;
                        delete ele.user;
                    }
                }
            }
            if(orgDetails?.company_contract?.broker){
                let brokerList = appConstant.BROKER_LIST;
                orgDetails.company_contract['broker'] = brokerList.find((broker) => broker.name == orgDetails.company_contract.broker || broker.id == orgDetails.company_contract.broker);
            }
            if(orgDetails?.company_contract?.industry){
                let industryList = appConstant.ORG_INDUSTRY_LIST;
                orgDetails.company_contract['industry'] = industryList.find((industry) => industry.name == orgDetails?.company_contract?.industry || industry.id == orgDetails?.company_contract?.industry);
            }
            let stateData = await this.companyService.stateList(orgDetails?.state);
            if(orgDetails?.state){
                let state = stateData.find(ele => ele.statecode == orgDetails?.state || ele.state == orgDetails?.state);
                orgDetails.state = state?.['state'];
                orgDetails.statecode = state?.['statecode'];
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: orgDetails,
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
    /*
     * Function to get list of organizations
     * - can pass search_str, order_by, order
     */
    @Post('list')
    @UseGuards(TokenGuard, RoleGuard, AccessGuard)
    async list(@Req() req: Request, @Res() res: Response, @Body() postData: ListCompanyInput){
        try {
            let user = Object.create(req.tokenUser);
            let roleId: number = user?.role_id;
            let userId: number = user?.id;
            let typeObj = {'hra': "Hra",'health_checkup': "Healthcheckup"}
            if(['hra','health_checkup'].includes(postData?.type)) {
                let result = await this.frontService.companyData( ['company.id','company.code','company.company_name'],`ca.plugin_name LIKE '%"${typeObj[postData?.type]}":1%'  AND company.status = '1' AND company.deleted = '0' AND company.companytype_id = '3'`,null,[{'join_table': 'company.ca','alias':'ca', 'table' : tableConstant.COMPANIES.TBL_ACTIVE_PLUGINS, 'on_condition' : `ca.company_id = company.id`, 'join_type': 'left_one' }],'getMany');
                result = <any>(
                    await this.commonArrayService.formatToDto(CompaniesDto, result, req.lang)
                );
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: result,
                    message: 'success',
                });
            }
            let where: string = `company.status = 1 AND company.deleted = 0 `;
            if(postData?.is_emo_health_asssessments){
                where +=`AND companySetting.is_emo_health_asssessments = 1` ;
            }
            if(postData?.enable_popup){
                where +=`AND companySetting.enable_popup = 1` ;
            }
            if(postData?.activeplugin && postData?.activeplugin != ''){
                where += `AND activeplugin.plugin_name LIKE '%"${postData?.activeplugin}":1%'`;
            }
            if (postData?.search_str) {
                where += ` AND(company.code LIKE '%${postData?.search_str}%' OR company.company_name LIKE '%${postData?.search_str}%')`;
            }
            if (appConstant.ROLE.CLIENTENGAGEMENTMANAGER == roleId){
                let resultedData = await this.clientManagerAssignService.listRecord({user_id: req.tokenUser?.id,status: 1},null);
                if(resultedData.length > 0){
                    where += `AND company.id IN (${resultedData.map(ele=>ele.org_id).join(',')})`;
                }else{
                    return res.status(HttpStatus.OK).json({
                        statusCode: 200,
                        success: 1,
                        error: 0,
                        data: [],
                        message: 'success',
                    });
                }
            }
            // for report list of companies.
            if(postData?.type == 'report'){
                if(appConstant.ROLE.GLOBALCOACH == roleId || appConstant.ROLE.COACH == roleId){
                    let whereCoach = appConstant.ROLE.GLOBALCOACH == roleId ? {coach_manager_id: userId} : { user_id: userId, status: Not(2) };
                    let resultedDataCoach = await this.coachesService.listRecord(whereCoach,null,['coach.org_id']);
                    if(resultedDataCoach.length == 0){
                        return res.status(HttpStatus.OK).json({
                            statusCode: 200,
                            success: 1,
                            error: 0,
                            data: [],
                            message: 'success',
                        });
                    }
                    where += ` AND company.id IN (${resultedDataCoach.map(ele=>ele.org_id).join(',')})`;
                }else if ([appConstant.ROLE.REGIONALADMIN, appConstant.ROLE.BROKERADMIN, appConstant.ROLE.BROKER].includes(req.tokenUser?.role_id)) {
                    let whereBroker: object = { status: Not(2) };
                    switch (roleId) {
                        case appConstant.ROLE.BROKERADMIN:
                            whereBroker = { ...whereBroker, broker_admin_id: userId };
                            break;
                        case appConstant.ROLE.BROKER:
                            whereBroker = { ...whereBroker, user_id: userId, is_global: 1 };
                            break;
                        case appConstant.ROLE.REGIONALADMIN:
                            whereBroker = { ...whereBroker, user_id: userId, is_global: 2 };
                            break;
                        default:
                            return;
                    }
                    let resultedDatabroker = await this.brokerService.brokerOrgList(whereBroker, ['org_id']);
                    if(resultedDatabroker.length == 0){
                        return res.status(HttpStatus.OK).json({
                            statusCode: 200,
                            success: 1,
                            error: 0,
                            data: [],
                            message: 'success',
                        });
                    }
                    where += ` AND company.id IN (${resultedDatabroker.map(ele=>ele.org_id).join(',')})`;
                }
            }
            const order = postData && postData?.order ? postData?.order : 'ASC';
            const orderBy = postData && postData?.order_by ? postData?.order_by : 'company_name';
            let result = await this.companyService.listRecord(where, { [orderBy]: order });
            result = <any>(
                await this.commonArrayService.formatToDto(CompaniesDto, result, req.lang)
            );
            let stateData = await this.companyService.stateList(null);
            await Promise.all(result?.map(async (ele) => {
                if(ele?.state){
                    ele.state = stateData.find(ele => ele.statecode == ele?.state || ele.state == ele?.state);
                }
            }));

            console.log('EmailCampaign Orgs =>', result.map((c) => ({ id: c.id, company_name: c.company_name })));
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
    @Post('assessment-copy')
    @UseGuards(TokenGuard, RoleGuard, AccessGuard)
    async assessmentCopy(@Req() req: Request, @Res() res: Response, @Body() postData: any){
        try {
            let where = `company.status = 1 AND company.deleted = 0 AND company.companytype_id = '3'`;
            if(postData?.is_emo_health_asssessments == '1'){
                where +=`AND cs.is_emo_health_asssessments = 1` ;
            }
            let result = await this.frontService.companyData( ['DISTINCT(company.company_name) AS company_name','company.id AS id'],where,null,[{'join_table': 'at.company','alias':'at', 'table' : tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_TABS, 'on_condition' : `at.organization_id = company.id AND at.status != '2'`, 'join_type': 'inner_many' }, {'join_table': 'cs.company','alias':'cs', 'table' : tableConstant.COMPANIES.TBL_COMPANY_SETTINGS, 'on_condition' : `cs.org_id = company.id`, 'join_type': 'inner_one' }],'getRawMany');
            if(postData?.is_emo_health_asssessments != '1'){
                const id = result.map(obj => obj.id);
                result = await this.companyService.companyListRecord(['id','company_name'],{status:1,id: Not(In(id))});
            }
            result = <any>(
                await this.commonArrayService.formatToDto(CompaniesDto, result, req.lang)
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
    /*
     * Use to create new organization
     * - companytype_id, company_name, status is mandatory params
     */
    @Post('create')
    @UseGuards(TokenGuard, RoleGuard)
    @UseInterceptors(
        FileFieldsInterceptor(
            [
                { name: 'company_logo', maxCount: 1 },
                { name: 'company_logo_dark', maxCount: 1 },
            ],
            {
                limits: { fileSize: appConstant.FILE_SIZE },
                storage: diskStorage({
                    destination: `${appConstant.COMPANY_LOGO_PATH}`,
                    filename: fileName,
                }),
                fileFilter: imgFilter,
            },
        ),
        AccessGuard
    )
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateCompanyInput, @UploadedFiles() files: Record<string, any>) {
        try {
            if (
                !postData?.companytype_id ||
                !postData?.company_name
            ) {
                if (files && files.company_logo && files.company_logo[0].fieldname === 'company_logo' && files.company_logo[0].filename) {
                    await this.commonFileService.removeFileFromLocal(files.company_logo[0].path);
                }
                if (files && files.company_logo_dark && files.company_logo_dark[0].fieldname === 'company_logo_dark' && files.company_logo_dark[0].filename) {
                    await this.commonFileService.removeFileFromLocal(files.company_logo_dark[0].path);
                }
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            if(postData?.company_name){
                postData.company_name = postData?.company_name.trim();
            }
            const companyCheck = await this.companyService.findOneV1({
                company_name: postData?.company_name, deleted: 0, status: 1
            },[],['company.id','company.status']);
            if (companyCheck) {
                if (files && files.company_logo && files.company_logo[0].fieldname === 'company_logo' && files.company_logo[0].filename) {
                    await this.commonFileService.removeFileFromLocal(files.company_logo[0].path);
                }
                if (files && files.company_logo_dark && files.company_logo_dark[0].fieldname === 'company_logo_dark' && files.company_logo_dark[0].filename) {
                    await this.commonFileService.removeFileFromLocal(files.company_logo_dark[0].path);
                }
                throw Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_COMPANY_NAME_EXIST"));
            }
            postData['company_logo'] = imageConstant.COMPANY_LOGO;
            postData.company_name = postData?.company_name?.trim()
            const saveResult = await this.companyService.save({
                ...postData,
                code: '',
                created_by: req.tokenUser?.id,
                updated_by: req.tokenUser?.id
            });
            const companyID = saveResult?.identifiers[0]?.id;
            let prefix = 'CI';
            let plugins = appConstant.DEFAULT_PLUGINS;
            if(postData?.companytype_id == 1){
                prefix = 'BF';
                plugins = appConstant.BROKER_AND_HEALTH_ORG_PLUGINS;
            }
            if(postData?.companytype_id == 2){
                prefix = 'HC';
                plugins = appConstant.BROKER_AND_HEALTH_ORG_PLUGINS;
            }
            await this.activePluginService.save({
                created_by: req.tokenUser?.id,
                company_id: companyID,
                plugin_name: JSON.stringify(plugins)
            });
            /* side menu dynamic json start */
            let sideMenuSettingObj = {
                'showmenulist': {},
                'datasettingmenu': {},
            }
            await this.sideMenuSettingsService.sideMenuSettingJson(sideMenuSettingObj,companyID);
            /* side menu dynamic json end */
            /* create default entry for slider setting */
            if(prefix == 'CI'){
                await this.sliderSettingsService.save({ org_id: companyID, hide: 1, activity_page_tab: 1, dashboard_tab: 1, status: 0});
            }
            /* create default entry for slider setting */
            /* create default entry for company setting and meta zomo-867 */
            await this.companySettingsService.save({ org_id: companyID, created_by: req.tokenUser?.id, updated_by: req.tokenUser?.id, health_form_mail: 1});
            await this.companyMetaService.save({ org_id: companyID, created_by: req.tokenUser?.id});
            /* create default entry for company setting and meta zomo-867 */

            if(req.tokenUser?.role_id == appConstant.ROLE.CLIENTENGAGEMENTMANAGER){
                await this.clientManagerAssignService.save({org_id: companyID, user_id: req.tokenUser['id'], status: 1});
            }
            let timestamp = this.commonDateService.getTodayDate().unix();
            if (files && files.company_logo && files.company_logo[0].fieldname === 'company_logo' && files.company_logo[0].filename) {
                let copyFile = JSON.parse(JSON.stringify(files.company_logo[0]));
                files.company_logo[0].originalname = this.commonFileService.formatFileName(files.company_logo[0].originalname);
                files.company_logo[0].filename = `companylogos/${companyID}/orginallogo/comimg_`+ this.commonService.generateMD5(companyID.toString()) + timestamp.toString()  + '.' + files.company_logo[0].originalname.split('.')[files.company_logo[0].originalname.split('.').length - 1];
                this.commonFileService.copyFile(path.resolve(files.company_logo[0].path),path.resolve(`${files.company_logo[0].path.split('.')[0]}_copy.${files.company_logo[0].path.split('.')[1]}`));
                copyFile['filename']=`${copyFile['filename'].split('.')[0]}_copy.${copyFile['filename'].split('.')[1]}`;
                copyFile['path']=`${files.company_logo[0].path.split('.')[0]}_copy.${files.company_logo[0].path.split('.')[1]}`;
                await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(files.company_logo[0].path),  filename: files.company_logo[0].filename}));
                copyFile.originalname = this.commonFileService.formatFileName(copyFile.originalname);
                copyFile.filename = `companylogos/${companyID}/comimg_`+ this.commonService.generateMD5(companyID.toString()) + timestamp.toString()  + '.' + copyFile.originalname.split('.')[copyFile.originalname.split('.').length - 1]; 
                await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(copyFile.path),  filename: copyFile.filename}));
                postData['company_logo'] = copyFile.filename.split('/')[copyFile.filename.split('/').length -1];
            }
            if (files && files.company_logo_dark && files.company_logo_dark[0].fieldname === 'company_logo_dark' && files.company_logo_dark[0].filename) {
                files.company_logo_dark[0].originalname = this.commonFileService.formatFileName(files.company_logo_dark[0].originalname);
                files.company_logo_dark[0].filename = `companylogos/${companyID}/comimgdark_`+ this.commonService.generateMD5(companyID.toString()) + timestamp.toString()  + '.' + files.company_logo_dark[0].originalname.split('.')[files.company_logo_dark[0].originalname.split('.').length - 1];
                await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(files.company_logo_dark[0].path),  filename: files.company_logo_dark[0].filename}));
                postData['company_logo_dark'] = files.company_logo_dark[0].filename.split('/')[files.company_logo_dark[0].filename.split('/').length -1];
            }
            let companyCode = this.commonService.generateCode(prefix, companyID);
            let codeCheck = await this.companyService.findOneV1({ code: companyCode },[],['company.id','company.code']);
            while (codeCheck) {
                companyCode = this.commonService.generateCode(prefix, companyID);
                codeCheck = await this.companyService.findOneV1({ code: companyCode },[],['company.id','company.code']);
            }
            await this.companyService.update(
                { id: companyID },
                { 
                    code: companyCode, 
                    company_logo:  postData?.company_logo,
                    company_logo_dark: postData['company_logo_dark'] || ''
                },
            );
            const deptResult = await this.departmentService.save({dept_name: postData?.company_name +'_Default', company_id: companyID, default_dept: 'Yes'})
            const deptID = deptResult.identifiers[0].id;
            let deptCode = this.commonService.generateCode('D', deptID);
            let codeCheckDept = await this.departmentService.findOne({
                code: deptCode,
            });
            while (codeCheckDept) {
                deptCode = this.commonService.generateCode('D', deptID);
                codeCheckDept = await this.departmentService.findOne({
                    code: deptCode,
                });
            }
            await this.departmentService.update(
                { id: deptID },
                { code: deptCode },
            );
            const locResult = await this.locationService.save({company_id: companyID, location_name: `${postData?.street_address}, ${postData?.street_address}, ${postData?.city}, ${postData?.state}, ${postData?.zip}, ${postData?.country}`, lname: postData?.street_address, address1: postData?.street_address, city: postData?.city, state: postData?.state, country: postData?.country, zip: postData?.zip, is_default: 1});
            const locationID = locResult.identifiers[0].id;
            let locationCode = this.commonService.generateCode('L', locationID);
            let codeCheckLoc = await this.locationService.findOne({
                code: locationCode,
            });
            while (codeCheckLoc) {
                locationCode = this.commonService.generateCode('L', locationID);
                codeCheckLoc = await this.locationService.findOne({
                    code: locationCode,
                });
            }
            await this.locationService.update(
                { id: locationID },
                { code: locationCode },
            );
            const assessmentQuestion: AssessmentHaQuestionsEntity[] = await this.assessmentQuestionsService.getAll({status: Not(Enum.Two),company_id: Not('0')},['id','company_id']);
            for (let i: number = 0; i < assessmentQuestion.length; i++) {
                let comment = assessmentQuestion[i].company_id.split(',');
                comment.push(companyID)
                assessmentQuestion[i].company_id = comment.join(',')
            }
            await this.assessmentQuestionsService.bulkUpdate('id',assessmentQuestion);
            return res.status(HttpStatus.CREATED).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: {org_id: companyID},
                message: 'The Organization Information Has Been added Successfully.',
            });
        } catch (error) {
            if (files && files.company_logo && files.company_logo[0].fieldname === 'company_logo' && files.company_logo[0].filename) {
                await this.commonFileService.removeFileFromLocal(files.company_logo[0].path);
            }
            if (files && files.company_logo_dark && files.company_logo_dark[0].fieldname === 'company_logo_dark' && files.company_logo_dark[0].filename) {
                await this.commonFileService.removeFileFromLocal(files.company_logo_dark[0].path);
            }
            await this.activityLogService.error_log(req.tokenUser?.id,req?.originalUrl, error?.message, error, req);
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
    /*
     * Use to update organization
     * - id is mandatory params
     */
    @Put('update')
    @UseGuards(TokenGuard, RoleGuard)
    @UseInterceptors(
        FileFieldsInterceptor(
            [
                { name: 'company_logo', maxCount: 1 },
                { name: 'company_logo_dark', maxCount: 1 },
            ],
            {
                limits: { fileSize: appConstant.FILE_SIZE },
                storage: diskStorage({
                    destination: `${appConstant.COMPANY_LOGO_PATH}`,
                    filename: fileName,
                }),
                fileFilter: imgFilter,
            },
        ),
        AccessGuard
    )
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: UpdateCompanyInput, @UploadedFiles() files: Record<string, any>) {
        try {
            if (
                !postData?.id
            ) {
                if (files && files.company_logo && files.company_logo[0].fieldname === 'company_logo' && files.company_logo[0].filename) {
                    await this.commonFileService.removeFileFromLocal(files.company_logo[0].path);
                }
                if (files && files.company_logo_dark && files.company_logo_dark[0].fieldname === 'company_logo_dark' && files.company_logo_dark[0].filename) {
                    await this.commonFileService.removeFileFromLocal(files.company_logo_dark[0].path);
                }
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            for (const key in postData) {
                if (postData[key] === '' && !['company_logo','company_logo_dark'].includes(key)) {
                    delete postData[key];
                }
            }
            const where = { id: postData?.id, deleted: 0 };
            let recordDetails = await this.companyService.findOneV1(where,[],['company']);
            if (!recordDetails) {
                if (files && files.company_logo && files.company_logo[0].fieldname === 'company_logo' && files.company_logo[0].filename) {
                    await this.commonFileService.removeFileFromLocal(files.company_logo[0].path);
                }
                if (files && files.company_logo_dark && files.company_logo_dark[0].fieldname === 'company_logo_dark' && files.company_logo_dark[0].filename) {
                    await this.commonFileService.removeFileFromLocal(files.company_logo_dark[0].path);
                }
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }
            if(postData?.company_name){
                postData.company_name = postData?.company_name?.trim();
            }
            if (postData?.company_name) {
                const companyCheck = await this.companyService.findOneV1({
                    company_name: postData?.company_name,
                    deleted: 0,
                    status: 1,
                    id: Not(postData?.id),
                },[],['company.id','company.status']);
                if (companyCheck) {
                    if (files && files.company_logo && files.company_logo[0].fieldname === 'company_logo' && files.company_logo[0].filename) {
                        await this.commonFileService.removeFileFromLocal(files.company_logo[0].path);
                    }
                    if (files && files.company_logo_dark && files.company_logo_dark[0].fieldname === 'company_logo_dark' && files.company_logo_dark[0].filename) {
                        await this.commonFileService.removeFileFromLocal(files.company_logo_dark[0].path);
                    }
                    throw Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_COMPANY_NAME_EXIST"));
                }
            }
            let timestamp = this.commonDateService.getTodayDate().unix();
            if (files && files.company_logo && files.company_logo[0].fieldname === 'company_logo' && files.company_logo[0].filename) {
                await lastValueFrom(this.commonMicroservice.send({cmd: 'delete_file'}, {prefix: `companylogos/${postData?.id}/orginallogo/` + recordDetails.company_logo}));
                await lastValueFrom(this.commonMicroservice.send({cmd: 'delete_file'}, {prefix: recordDetails.company_logo.replace('/comimg_','/orginallogo/comimg_')}));
                let copyFile = JSON.parse(JSON.stringify(files.company_logo[0]));
                files.company_logo[0].originalname = this.commonFileService.formatFileName(files.company_logo[0].originalname);
                files.company_logo[0].filename = `companylogos/${postData?.id}/orginallogo/comimg_`+ this.commonService.generateMD5(postData?.id.toString()) + '.' + files.company_logo[0].originalname.split('.')[files.company_logo[0].originalname.split('.').length - 1];
                this.commonFileService.copyFile(path.resolve(files.company_logo[0].path),path.resolve(`${files.company_logo[0].path.split('.')[0]}_copy.${files.company_logo[0].path.split('.')[1]}`));
                copyFile['filename']=`${copyFile['filename'].split('.')[0]}_copy.${copyFile['filename'].split('.')[1]}`;
                copyFile['path']=`${files.company_logo[0].path.split('.')[0]}_copy.${files.company_logo[0].path.split('.')[1]}`;
                await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(files.company_logo[0].path),  filename: files.company_logo[0].filename}));
                copyFile.originalname = this.commonFileService.formatFileName(copyFile.originalname);
                copyFile.filename = `companylogos/${postData?.id}/comimg_`+ this.commonService.generateMD5(postData?.id.toString()) + '.' + copyFile.originalname.split('.')[copyFile.originalname.split('.').length - 1]; 
                await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(copyFile.path),  filename: copyFile.filename}));
                postData['company_logo'] = copyFile.filename.split('/')[copyFile.filename.split('/').length -1];
            }
            if (files && files.company_logo_dark && files.company_logo_dark[0].fieldname === 'company_logo_dark' && files.company_logo_dark[0].filename) {
                await lastValueFrom(this.commonMicroservice.send({cmd: 'delete_file'}, {prefix: recordDetails.company_logo_dark}));
                files.company_logo_dark[0].originalname = this.commonFileService.formatFileName(files.company_logo_dark[0].originalname);
                files.company_logo_dark[0].filename = `companylogos/${postData?.id}/comimgdark_`+ this.commonService.generateMD5(postData?.id.toString()) + timestamp.toString()  + '.' + files.company_logo_dark[0].originalname.split('.')[files.company_logo_dark[0].originalname.split('.').length - 1];
                await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(files.company_logo_dark[0].path),  filename: files.company_logo_dark[0].filename}));
                postData['company_logo_dark'] = files.company_logo_dark[0].filename.split('/')[files.company_logo_dark[0].filename.split('/').length -1];
            }
            await this.companyService.update(
              { id: postData?.id },
              {
                  ...postData,
                  id: Number(postData?.id),
                  updated_by: req.tokenUser?.id
              },
            );
            this.activityLogService.create(recordDetails, {
                ...postData,
                id: Number(postData?.id),
                updated_by: req.tokenUser?.id
            }, tableConstant.COMPANIES.TBL_COMPANY, req.tokenUser?.id);
            recordDetails = await this.companyService.findOneV1(where,[],['company']);
            recordDetails = <any>(
                await this.commonArrayService.formatToDto(CompaniesDto, recordDetails, req.lang)
            );
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: recordDetails,
                message: await this.translatorService.frontendReadTranslation(req.lang, 'The Organization Information Has Been Updated Successfully.'),
            });
        } catch (error) {
            if (files && files.company_logo && files.company_logo[0].fieldname === 'company_logo' && files.company_logo[0].filename) {
                await this.commonFileService.removeFileFromLocal(files.company_logo[0].path);
            }
            if (files && files.company_logo_dark && files.company_logo_dark[0].fieldname === 'company_logo_dark' && files.company_logo_dark[0].filename) {
                await this.commonFileService.removeFileFromLocal(files.company_logo_dark[0].path);
            }
            await this.activityLogService.error_log(req.tokenUser?.id,req?.originalUrl, error?.message, error, req);
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
    /*
     * Use to delete an organization
     * - id is mandatory params
     */
    @Post('delete')
    @UseGuards(TokenGuard, RoleGuard, AccessGuard)
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = { id: postData?.id, deleted: 0, status: 1 };
            const recordDetails = await this.companyService.findOneV1(where,[],['company']);
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
            await this.companyService.update(
              { id: postData?.id },
              {
                  status: 2,
                  deleted: 1,
              },
            );
            this.activityLogService.create(recordDetails, {statu:2, deleted:1}, tableConstant.COMPANIES.TBL_COMPANY, req.tokenUser?.id, 'delete');
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
    @Post('org-reset-password')
    @UseGuards(TokenGuard, RoleGuard, AccessGuard)
    async orgResetPassword(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.code) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = { membership_code: postData?.code, role_id: In([2, 16]) };
            await this.userService.update(where, { password: '', new_password: '' });        
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: 'Password has been reset for all users.',
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
    @Post('admin-dashboard')
    @UseGuards(TokenGuard, RoleGuard, AccessGuard)
    async adminDeshboard(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (![appConstant.ROLE.ADMIN,appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER,appConstant.ROLE.CLIENTENGAGEMENTMANAGER].includes(req.tokenUser?.role_id)) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_FORBIDDEN_ACCESS"));
            }
            let dashboardDetails= {};
            let companyIds= [];
            let where = {status : 1 , deleted : 0 , is_testing : 0};
            if(req.tokenUser?.role_id == appConstant.ROLE.CLIENTENGAGEMENTMANAGER){
               let resultedData = await this.clientManagerAssignService.listRecord(`clientManager.user_id = ${req.tokenUser?.id} AND clientManager.status = 1 AND company.status = 1`,null);
                if(resultedData.length > 0){
                    companyIds = resultedData.map(ele=>ele.org_id);
                } 
            }
            else{
                let resultedData = await this.companyService.companyListRecord(['id'],where);
                if(resultedData.length > 0){
                    companyIds = resultedData.map(ele=>ele.id);
                }
            }
            dashboardDetails['companyCount'] = companyIds?.length ?? 0;
            let userCount = await this.userService.countUsers(`user.role_id IN(2) AND user.status = 1 AND user.org_id IN (${companyIds.join(',')})`, ['id']);  
            let spouseCount = await this.userService.countUsers(`user.role_id IN(16) AND user.status = 1 AND user.org_id IN (${companyIds.join(',')})`, ['id']);  
            dashboardDetails['userCount'] = userCount ?? 0;
            dashboardDetails['spouseCount'] = spouseCount ?? 0;
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: dashboardDetails,
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
    /*
     * Function to get list of broker list
     */
    @Post('broker-list')
    @UseGuards(TokenGuard, RoleGuard, AccessGuard)
    async brokerlist(@Req() req: Request, @Res() res: Response, @Body() postData: any){
        try {
            let result = appConstant.BROKER_LIST;
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
        /*
     * Function to get list of industry list
     */
    @Post('industry-list')
    @UseGuards(TokenGuard, RoleGuard, AccessGuard)
    async industrylist(@Req() req: Request, @Res() res: Response, @Body() postData: any){
        try {
            let result = appConstant.ORG_INDUSTRY_LIST;
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

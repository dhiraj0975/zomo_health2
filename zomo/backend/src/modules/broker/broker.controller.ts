import { appConstant, BrokerDto, CommonArrayService, CommonService, tableConstant, UserDto } from '@common-constants';
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
import { Request, Response } from 'express';
import { In, Not } from 'typeorm';
import { AccessGuard, RoleGuard, TokenGuard } from "../../guard";
import { ActivePluginService } from '../company/activeplugins/activeplugin.service';
import { CompanyService } from '../company/companies/company.service';
import { ActivityLogService } from "../master/activitylog/activitylog.service";
import { RegionsService } from '../region/regions/regions.service';
import { TranslationService } from "../translation/translation.service";
import { UserService } from '../user/user/user.service';
import { BrokerService } from "./broker.service";
import { CreateBrokerInput, GetOneBrokerInput, ListBrokerInput, PaginateWithBrokerInput } from './input';
@Controller('broker')
@UseGuards(TokenGuard,RoleGuard, AccessGuard)
export class BrokerController {
    constructor(
        private readonly brokerService: BrokerService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        private readonly regionsService: RegionsService,
        private readonly companyService: CompanyService,
        private readonly userService: UserService,
        private readonly activePluginService: ActivePluginService,
    ) {
    }
    /* 
    * paginate API for brokers also user for broker admin , reginal admin , and broker
    * broker admin , reginal admin , and broker no mandtory fields. 
    */
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithBrokerInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let user = Object.create(req?.tokenUser);
            let roleId: number = user?.role_id;
            let userId: number = user?.id;
            let Company: object = null;
            let companyIds: number[] = [];
            let companyDetails: object = null;
            if (postData?.org_id) {
                let whereCompany: string = `company.id = '${postData?.org_id}' AND company.deleted = 0`;
                companyDetails = await this.companyService.findOneV1(whereCompany, [], ['company.id', 'company.company_name']);
                if (!companyDetails) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_NO_RECORD_FOUND"));
                }
            }
            // FormProgram for Form program module in broker admin role, broker and regional admin.
            if (postData?.type && (postData?.type == 'FormProgram' || postData?.type == 'Challenge' || postData?.type == 'UpcomingActivity' )) {
                let broker: object[] = []; 
                if (appConstant.ROLE.BROKERADMIN == roleId) {
                    broker = await this.brokerService.listRecordWithCCT(
                        `broker.broker_admin_id = ${userId} AND broker.status != 2`,
                        null,
                        ['broker.id', 'company.id', 'company.company_name']
                    )
                }
                else if (appConstant.ROLE.BROKER == roleId) {
                    broker = await this.brokerService.listRecordWithCCT(
                        `broker.user_id = ${userId} AND broker.is_global = 1 AND broker.status != 2`,
                        null,
                        ['broker.id', 'company.id', 'company.company_name']
                    )
                }
                else if (appConstant.ROLE.REGIONALADMIN == roleId) {
                    broker = await this.brokerService.listRecordWithCCT(
                        `broker.user_id = ${userId} AND broker.is_global = 2 AND broker.status != 2`,
                        null,
                        ['broker.id', 'company.id', 'company.company_name']
                    )
                }
                else{
                    broker = [];
                }
                let brokerCompanyIds: number[] = broker.map(b => b?.['company']?.['id']).filter(id => !!id);
                let allActivityPlugin = await this.activePluginService.listRecord({ company_id: In(brokerCompanyIds ?? [0]) });
                if (allActivityPlugin) {
                    for (let activePlugin of allActivityPlugin) {
                        if (activePlugin && activePlugin.plugin_name && activePlugin.plugin_name !== null) {
                            const pluginName = JSON.parse(activePlugin.plugin_name);
                            if ( postData?.type == 'FormProgram' && pluginName && pluginName.hasOwnProperty('Healthcheckup')) {
                                companyIds.push(Number(activePlugin.company_id));
                            }
                            if ( postData.type == 'Challenge' && pluginName && pluginName.hasOwnProperty('Challenge')) {
                                companyIds.push(Number(activePlugin.company_id));
                            }
                            if ( postData.type == 'UpcomingActivity' && pluginName && pluginName.hasOwnProperty('Upcomingactivities')) {
                                companyIds.push(Number(activePlugin.company_id));
                            }
                        }
                    }
                }
            }
            if (appConstant.ROLE.BROKERADMIN == roleId || appConstant.ROLE.REGIONALADMIN == roleId) {
                // for assign time paginate in broker admin role and regional admin  role
                if (postData?.type && postData?.type == 'assignPaginate') {
                    let where: string = `broker.status != 2 AND broker.broker_admin_id = 0 AND user.status = 1`
                    if (postData?.org_id) {
                        where += ` AND broker.org_id = '${postData?.org_id}' `;
                    }
                    if (postData?.user_id) {
                        where += ` AND broker.user_id = '${postData?.user_id}' `;
                    }
                    if (postData?.filter_by?.toLowerCase() == 'user_name') {
                        where += this.commonService.generateDynamicSearchQuery(postData?.search_str ?? '', ['user.first_name', 'user.last_name', 'full_name']);
                    }
                    if (postData?.filter_by?.toLowerCase() == 'location') {
                        where += this.commonService.generateDynamicSearchQuery(postData?.search_str ?? '', ['Location.location_name']);
                    }
                    if (postData?.filter_by?.toLowerCase() == 'department') {
                        where += this.commonService.generateDynamicSearchQuery(postData?.search_str ?? '', ['Department.dept_name']);
                    }
                    if (postData?.filter_by?.toLowerCase() == 'state') {
                        where += this.commonService.generateDynamicSearchQuery(postData?.search_str ?? '', ['broker.state']);
                    }
                    if (postData?.filter_by?.toLowerCase() == 'city') {
                        where += this.commonService.generateDynamicSearchQuery(postData?.search_str ?? '', ['broker.city']);
                    }
                    let resultedData = await this.brokerService.paginateListAssignBroker(
                        where,
                        postData,
                    );
                    resultedData['company'] = companyDetails;
                    return res.status(HttpStatus.OK).json({
                        statusCode: 200,
                        success: 1,
                        error: 0,
                        data: resultedData,
                        message: 'success',
                    });
                }
                // brokerDeptLoc for client management module.
                if (postData?.type && postData?.type == 'brokerDeptLoc') {
                    let where: string = `broker.broker_admin_id = '${userId}' AND broker.status != 2 AND company.deleted = 0`;
                    if(appConstant.ROLE.REGIONALADMIN == roleId){
                        where = `broker.status != 2 AND broker.user_id = ${userId} AND broker.is_global = 2 AND company.deleted = 0`;
                    }
                    if (postData?.search_str) {
                        where += this.commonService.generateDynamicSearchQuery(postData?.search_str ?? '', ['full_name', 'region.region_name', 'company.company_name', 'company.state'], false);
                    }
                    Company = await this.brokerService.paginateListBroker(
                        where,
                        postData,
                        [
                            tableConstant.COMPANIES.TBL_COMPANY_TYPE
                        ],
                        [
                            'broker.id', 'broker.org_id', 'broker.user_id', 'broker.broker_admin_id', 'broker.location', 'broker.department', 'broker.state', 'broker.city',
                            'broker.is_global', 'broker.region_id', 'broker.status', 'company.id', 'company.company_name', 'company.state', 'company_type.id', 'company.code',
                            'company_type.company_type', 'company.city', 'company.country',
                        ]
                    );
                    Company['company'] = companyDetails;
                    return res.status(HttpStatus.OK).json({
                        statusCode: 200,
                        success: 1,
                        error: 0,
                        data: Company,
                        message: 'success',
                    });
                }
            }
            if (appConstant.ROLE.BROKERADMIN == roleId) { 
                // FormProgram for Form program module in broker admin role.
                if (postData?.type && (postData?.type == 'FormProgram' || postData?.type == 'Challenge' || postData?.type == 'UpcomingActivity')) {
                    let where: string = `broker.status != 2 AND broker.broker_admin_id = ${userId} AND company.deleted = 0 AND company.id IN(${companyIds.length > 0 ? companyIds.join(','):null})`
                    if (postData?.search_str) {
                        where += this.commonService.generateDynamicSearchQuery(postData?.search_str ?? '', [ 'company.company_name', 'company.state','company.city','company.country','company.code','company.id','company_type.company_type'], false);
                    }
                    Company = await this.brokerService.paginateListBroker(
                        where,
                        postData,
                        [
                            tableConstant.COMPANIES.TBL_COMPANY_TYPE
                        ],
                        [
                            'broker.id', 'broker.org_id', 'broker.user_id', 'broker.broker_admin_id', 'broker.location', 'broker.department', 'broker.state', 'broker.city',
                            'broker.is_global', 'broker.region_id', 'broker.status', 'company.id', 'company.company_name', 'company.state', 'company_type.id', 'company.code',
                            'company_type.company_type','company.city','company.country',
                        ]
                    );
                    Company['company'] = companyDetails;
                    return res.status(HttpStatus.OK).json({
                        statusCode: 200,
                        success: 1,
                        error: 0,
                        data: Company,
                        message: 'success',
                    });
                }
                let where: string = `broker.broker_admin_id = '${userId}' AND broker.status != 2 AND company.deleted = 0`;
                if (postData?.search_str) {
                    where += this.commonService.generateDynamicSearchQuery(postData?.search_str ?? '', ['full_name','region.region_name','company.company_name','company.state'], false);
                }
                Company = await this.brokerService.paginateListBroker(
                    where,
                    postData,
                    [
                        tableConstant.COMPANIES.TBL_COMPANY_TYPE,// tableConstant.COMPANIES.TBL_COMPANY_SETTINGS,// tableConstant.COMPANIES.TBL_COMPANY_META,// tableConstant.COMPANIES.TBL_COMPANY_CONTRACT,
                        tableConstant.TBL_USERS,
                    ],
                    [
                        'broker.id','broker.org_id','broker.user_id','broker.broker_admin_id','broker.location','broker.department','broker.state','broker.city',
                        'broker.is_global','broker.region_id','broker.status','company.id','company.company_name','company.state','company_type.id',
                        'company_type.company_type','user.id', 'user.first_name', 'user.last_name', 'region.id', 'region.region_name'
                    ]
                );
                Company['company'] = companyDetails;
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: Company,
                    message: 'success',
                });
            }
            if (appConstant.ROLE.BROKER == roleId) {
                // FormProgram for Form program module in broker role.
                if (postData?.type && (postData?.type == 'FormProgram' || postData?.type == 'Challenge' || postData?.type == 'UpcomingActivity')) {
                    let where: string = `broker.status != 2 AND broker.user_id = ${userId} AND broker.is_global = 1 AND company.deleted = 0 AND company.id IN(${companyIds.length > 0 ? companyIds.join(','):null})`
                    if (postData?.search_str) {
                        where += this.commonService.generateDynamicSearchQuery(postData?.search_str ?? '', [ 'company.company_name', 'company.state','company.city','company.country','company.code','company.id','company_type.company_type'], false);
                    }
                    Company = await this.brokerService.paginateListBroker(
                        where,
                        postData,
                        [
                            tableConstant.COMPANIES.TBL_COMPANY_TYPE
                        ],
                        [
                            'broker.id', 'broker.org_id', 'broker.user_id', 'broker.broker_admin_id', 'broker.location', 'broker.department', 'broker.state', 'broker.city',
                            'broker.is_global', 'broker.region_id', 'broker.status', 'company.id', 'company.company_name', 'company.state', 'company_type.id', 'company.code',
                            'company_type.company_type','company.city','company.country',
                        ]
                    );
                    Company['company'] = companyDetails;
                    return res.status(HttpStatus.OK).json({
                        statusCode: 200,
                        success: 1,
                        error: 0,
                        data: Company,
                        message: 'success',
                    });
                }
                let where: string = `broker.user_id = '${userId}' AND broker.is_global = 1 AND company.deleted = 0 AND broker.status = 1`;
                if (postData?.search_str) {
                    where += this.commonService.generateDynamicSearchQuery(postData?.search_str ?? '', ['company.company_name','company.state'], false);
                }
                Company = await this.brokerService.paginateListBroker(
                    where,
                    postData,
                    [
                        tableConstant.COMPANIES.TBL_COMPANY_TYPE,// tableConstant.COMPANIES.TBL_COMPANY_SETTINGS,// tableConstant.COMPANIES.TBL_COMPANY_META,// tableConstant.COMPANIES.TBL_COMPANY_CONTRACT
                    ],
                    [
                        'broker.id','broker.org_id','broker.user_id','broker.broker_admin_id','broker.location','broker.department','broker.state','broker.city',
                        'broker.is_global','broker.region_id','broker.status',
                        'company_type.company_type', 'company_type.id',
                        'company.id', 'company.company_name', 'company.state', 'company.city', 'company.country','company.code',
                    ]
                );
                Company['company'] = companyDetails;
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: Company,
                    message: 'success',
                });
            }
            if (appConstant.ROLE.REGIONALADMIN == roleId) {
                // FormProgram for Form program module in regional admin role.
                if (postData?.type && (postData?.type == 'FormProgram' || postData?.type == 'Challenge' || postData?.type == 'UpcomingActivity')) {
                    let where: string = `broker.status != 2 AND broker.user_id = ${userId} AND broker.is_global = 2 AND company.deleted = 0 AND company.id IN(${companyIds.length > 0 ? companyIds.join(',') : null})`
                    if (postData?.search_str) {
                        where += this.commonService.generateDynamicSearchQuery(postData?.search_str ?? '', ['company.company_name', 'company.state', 'company.city', 'company.country', 'company.code', 'company.id', 'company_type.company_type'], false);
                    }
                    Company = await this.brokerService.paginateListBroker(
                        where,
                        postData,
                        [
                            tableConstant.COMPANIES.TBL_COMPANY_TYPE
                        ],
                        [
                            'broker.id', 'broker.org_id', 'broker.user_id', 'broker.broker_admin_id', 'broker.location', 'broker.department', 'broker.state', 'broker.city',
                            'broker.is_global', 'broker.region_id', 'broker.status', 'company.id', 'company.company_name', 'company.state', 'company_type.id', 'company.code',
                            'company_type.company_type','company.city','company.country',
                        ]
                    );
                    Company['company'] = companyDetails;
                    return res.status(HttpStatus.OK).json({
                        statusCode: 200,
                        success: 1,
                        error: 0,
                        data: Company,
                        message: 'success',
                    });
                }
                let where: string = `broker.user_id = '${userId}' AND broker.is_global = 2 AND company.deleted = 0`;
                if (postData?.search_str) {
                    where += this.commonService.generateDynamicSearchQuery(postData?.search_str ?? '', ['region.region_name','company.company_name','company.state'], false);
                }
                Company = await this.brokerService.paginateListBroker(
                    where,
                    postData,
                    [
                        tableConstant.COMPANIES.TBL_COMPANY_TYPE,// tableConstant.COMPANIES.TBL_COMPANY_SETTINGS,// tableConstant.COMPANIES.TBL_COMPANY_META,// tableConstant.COMPANIES.TBL_COMPANY_CONTRACT,
                        tableConstant.REGION.REGIONS
                    ],
                    [
                        'broker.id','broker.org_id','broker.user_id','broker.broker_admin_id','broker.location','broker.department','broker.state','broker.city',
                        'broker.is_global','broker.region_id','broker.status','company.id','company.company_name','company.state',
                        'company_type.id','company_type.company_type','region.id', 'region.region_name',
                    ]
                );
                Company['company'] = companyDetails;
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: Company,
                    message: 'success',
                });
            }
            if (!postData?.org_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let where: string = `broker.org_id = '${postData?.org_id}'`;
            if(postData?.broker_admin_id){
                where +=`AND broker.broker_admin_id = '${postData?.broker_admin_id}`;
            }
            if(postData?.department){
                where +=`AND broker.department = '${postData?.department}`;
            }
            if(postData?.user_id){
                where +=`AND broker.user_id = '${postData?.user_id}`;
            }
            if(postData?.location){
                where +=`AND broker.location = '${postData?.location}`;
            }
            if (postData?.search_str) {
                where += `AND(broker.city LIKE '%${postData?.search_str}%' OR broker.state LIKE '%${postData?.search_str}%')`;
            }
            const resultedData = await this.brokerService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(BrokerDto, resultedData['list'], req.lang)
            );
            resultedData['company'] = companyDetails;
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
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: GetOneBrokerInput) {
        try {
            if (!postData?.id && !postData?.org_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where: string = postData?.id ? postData?.org_id ? `broker.id = ${postData?.id} AND broker.org_id = ${postData?.org_id}` : `broker.id = ${postData?.id}` : `broker.org_id = ${postData?.org_id}`;
            let brokerDetails = await this.brokerService.findOne(where);
            if (!brokerDetails) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }
            brokerDetails = <any>(
                await this.commonArrayService.formatToDto(BrokerDto, brokerDetails, req.lang)
            );
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: brokerDetails,
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
    /**
     * for broker-organization-paginate for paginate list inside broker-admin role
     * user_id is mendatory fields.
     */
    @Post('broker-organization-paginate')
    async brokerOrganizationPaginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithBrokerInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            if (!postData?.user_id) {
                throw new Error(
                    await this.translatorService.frontendReadTranslation(
                        req.lang,
                        'ERR_REQUIRED_PARAM_MISSING',
                    ),
                );
            }
            let where: string = `broker.status = 1 AND broker.user_id = '${postData?.user_id}' `;
            if ([appConstant.ROLE.ORGADMIN, appConstant.ROLE.BROKERADMIN, appConstant.ROLE.REGIONALADMIN].includes(req.tokenUser?.role_id)) {
                if (postData?.search_str) {
                    where += this.commonService.generateDynamicSearchQuery(postData?.search_str ?? '', ['company.id', 'company.company_name']);
                }
                where += ` AND broker.is_global = 1`;
            }
            const resultedData = await this.brokerService.paginateListWithOrganization(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(BrokerDto, resultedData['list'], req.lang)
            );
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: resultedData,
                message: 'success',
            });
        } catch (error) {
            this.activityLogService.error_log(req.tokenUser?.id, req?.originalUrl, error?.message, error, req);
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
    /**
     * for broker-department-paginate for paginate list inside broker-admin role
     * user_id is mendatory fields.
     */
    @Post('broker-department-paginate')
    async brokerDepartmentPaginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithBrokerInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            if (!postData?.user_id) {
                throw new Error(
                    await this.translatorService.frontendReadTranslation(
                        req.lang,
                        'ERR_REQUIRED_PARAM_MISSING',
                    ),
                );
            }
            let where: string = `broker.status = 1 AND broker.user_id = '${postData?.user_id}' `;
            if ([appConstant.ROLE.ORGADMIN, appConstant.ROLE.BROKERADMIN, appConstant.ROLE.REGIONALADMIN].includes(req.tokenUser?.role_id)) {
                if (postData?.search_str) {
                    where += this.commonService.generateDynamicSearchQuery(postData?.search_str ?? '', ['broker.department', 'Department.dept_name']);
                }
                where += ` AND broker.department != 0`;
            }
            const resultedData = await this.brokerService.paginateListWithDepartment(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(BrokerDto, resultedData['list'], req.lang)
            );
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: resultedData,
                message: 'success',
            });
        } catch (error) {
            this.activityLogService.error_log(req.tokenUser?.id, req?.originalUrl, error?.message, error, req);
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
    /**
     * for broker-location-paginate for paginate list inside broker-admin role
     * user_id is mendatory fields.
     */
    @Post('broker-location-paginate')
    async brokerLocationPaginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithBrokerInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            if (!postData?.user_id) {
                throw new Error(
                    await this.translatorService.frontendReadTranslation(
                        req.lang,
                        'ERR_REQUIRED_PARAM_MISSING',
                    ),
                );
            }
            let where: string = `broker.status = 1 AND broker.user_id = '${postData?.user_id}' `;
            if ([appConstant.ROLE.ORGADMIN, appConstant.ROLE.BROKERADMIN, appConstant.ROLE.REGIONALADMIN].includes(req.tokenUser?.role_id)) {
                if (postData?.type == 'state') {
                    if (postData?.search_str) {
                        where += this.commonService.generateDynamicSearchQuery(postData?.search_str ?? '', ['broker.id', 'broker.state']);
                    }
                    where += ` AND broker.state != '' `;
                } else if (postData?.type == 'city') {
                    if (postData?.search_str) {
                        where += this.commonService.generateDynamicSearchQuery(postData?.search_str ?? '', ['broker.id', 'broker.city']);
                    }
                    where += ` AND broker.city != '' `;
                } else {
                    if (postData?.search_str) {
                        where += this.commonService.generateDynamicSearchQuery(postData?.search_str ?? '', ['broker.location', 'Location.location_name']);
                    }
                    where += ` AND broker.location != 0`;
                }
            }
            const resultedData = await this.brokerService.paginateListWithLocation(
                where,
                postData,
                postData?.type ? postData?.type : ''
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(BrokerDto, resultedData['list'], req.lang)
            );
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: resultedData,
                message: 'success',
            });
        } catch (error) {
            this.activityLogService.error_log(req.tokenUser?.id, req?.originalUrl, error?.message, error, req);
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
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateBrokerInput) {
        try {
            if (
                !postData?.org_id ||
                (postData?.broker_admin_id == undefined || postData?.broker_admin_id == null) ||
                (postData?.location == undefined || postData?.location == null) ||
                (postData?.department == undefined || postData?.department == null)
            ) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            if(!postData?.user_id){
               postData["user_id"]= req.tokenUser?.id?.toString();
            }
            if(!postData?.user_id){
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            for(let user of postData?.user_id.split(',')){
                const recordDetails = await this.brokerService.findOne({org_id: postData?.org_id, user_id: user, broker_admin_id: postData?.broker_admin_id, department: postData?.department});
                if (!recordDetails) {
                    delete postData?.user_id;
                    postData.user_id = user;
                    await this.brokerService.save(postData);
                }
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
            if (!postData?.user_id) {
                if (!postData?.id) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
            }
            let where = Object.create(null);
            if (postData?.user_id) {
                where['user_id'] = postData?.user_id;
            }
            if (postData?.id) {
                where['id'] = postData?.id;
            }
            const recordDetails = await this.brokerService.findOne(where);
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
            await this.brokerService.update(where,{status: 2});
            this.activityLogService.create(recordDetails, {status: 2}, tableConstant.BROKER, req.tokenUser?.id, 'delete');
            let message = ''
            if (postData?.type == 'location') {
                message = 'Location access for this Broker was deleted successfully.'
            }
            else if (postData?.type == 'department') {
                message = 'Department access for this Broker was deleted successfully.'
            }
            else if (postData?.type == 'state') {
                message = 'State access for this Broker was deleted successfully.'
            }
            else if (postData?.type == 'city') {
                message = 'City access for this Broker was deleted successfully.'
            } 
            else if (postData?.type == 'all') {
                message = 'All access for this Broker was deleted successfully.'
            } 
            else {
                message = 'Access was deleted successfully.'
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: message,
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
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: CreateBrokerInput) {
        try {
            let user = Object.create(req.tokenUser);
            let roleId : number = user?.role_id;
            if(roleId == appConstant.ROLE.BROKERADMIN || roleId == appConstant.ROLE.REGIONALADMIN){
                if(!postData?.region_id || !postData?.region_admin || !postData?.assign_orgs){
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
            } else {
                if (
                    !postData?.id &&
                    !postData?.org_id
                ) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
            }
            if (roleId == appConstant.ROLE.BROKERADMIN || roleId == appConstant.ROLE.REGIONALADMIN) {
                let regionDetail = await this.regionsService.findOne({ id: postData?.region_id, status: 1 });
                if (!regionDetail) {
                    let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                    return res.status(HttpStatus.OK).json({
                        statusCode: 200,
                        success: 1,
                        error: 0,
                        data: null,
                        message: errorMessage,
                    });
                }
                let assignedBrokers = await this.brokerService.listRecordWithCCT(
                    `broker.region_id = ${postData?.region_id} AND broker.is_global = 2`,
                    null,
                    ['broker.id', 'company.id']
                )
                let assignedCompanyIds : number[] = assignedBrokers.map(b => Number(b?.['company']?.id));
                let allAssignedBrokers = await this.brokerService.brokerListRecord({ is_global: 2 }, ['id', 'org_id'])
                let assignedOrgIds : number[] = allAssignedBrokers.map(b => Number(b.org_id));
                let inputOrgIds : number[] = postData?.assign_orgs.split(',').map(Number);
                for (let org_id of inputOrgIds) {
                    if (!assignedOrgIds.includes(Number(org_id))) {
                        let brokerData = {
                            org_id: org_id,
                            user_id: regionDetail?.regional_admin,
                            region_id: postData?.region_id,
                            is_global: 2,
                        }
                        await this.brokerService.brokerRoleSave(brokerData);
                    }
                    else {
                        if (!assignedCompanyIds.includes(Number(org_id))) {
                            throw new Error('Selected Organization Was Already Assigned To Another Region');
                        }
                    }
                }
                let toBeDeleted : number[] = assignedCompanyIds.filter(id => !inputOrgIds.includes(id));
                if (toBeDeleted.length > 0) {
                    await this.brokerService.update({ org_id: In(toBeDeleted), is_global: 2 }, { status: 2 });
                }
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: 'Organizations has been Assigned Sucessfully',
                });
            }
            postData.broker_admin_id = postData?.broker_admin_id ? postData?.broker_admin_id : 0 ;
            if(postData?.broker_admin_id == 0 && !postData.region_id) {
                postData.is_global = 1;
            }
            if(postData?.user_id && !postData?.location && !postData?.department && !postData?.state && !postData?.city && !postData.region_id){
                postData.is_global = 1;
            }
            const where = postData?.id ? postData?.org_id ? { id: postData?.id, org_id: postData?.org_id, is_global: postData?.is_global } : { id: postData?.id, is_global: postData?.is_global}: { org_id: postData?.org_id, is_global: postData?.is_global};
            if(postData?.user_id){
                for(let user of postData?.user_id.split(',')){
                    delete postData?.user_id;
                    postData.user_id = user;
                    const recordDetails = await this.brokerService.findOne({...where, user_id: user});
                    if (!recordDetails) {
                        await this.brokerService.save({
                            ...postData,
                        });
                    }
                    else{
                        await this.brokerService.update({id: recordDetails.id}, {...postData, status: 1});
                        this.activityLogService.create(recordDetails, postData, tableConstant.BROKER, req.tokenUser?.id);
                    }
                }
            }
            else{
                const recordDetails = await this.brokerService.findOne(where);
                if (!recordDetails) {
                    await this.brokerService.save({
                        ...postData,
                    });
                }
                await this.brokerService.update(where, {...postData, status: 1});
                this.activityLogService.create(recordDetails, postData, tableConstant.BROKER, req.tokenUser?.id);
            }
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
    /**
     * for brokers list, assign org wise (for broker and broker admin)
     * region_id is mendatory field for assign org list for particule region.
     */
    @Post('list')
    async list(@Req() req: Request, @Res() res: Response, @Body() postData: ListBrokerInput) {
        try {
            let user = Object.create(req.tokenUser);
            let roleId : number = user?.role_id;
            let userId : number= user?.id;
            if (roleId == appConstant.ROLE.BROKERADMIN || roleId == appConstant.ROLE.BROKER || roleId == appConstant.ROLE.REGIONALADMIN) {
                if (postData?.type && postData?.type === 'assignedorg') {
                    let where: string = '';
                    if(roleId == appConstant.ROLE.BROKERADMIN){
                        where = `broker.broker_admin_id = '${userId}' AND broker.status != 2 AND company.deleted = 0`;
                    }else if(roleId == appConstant.ROLE.BROKER){
                        where = `broker.user_id = '${userId}' AND broker.is_global = 1 AND company.deleted = 0 AND broker.status = 1`;
                    }
                    else if(roleId == appConstant.ROLE.REGIONALADMIN){
                        where = `broker.user_id = '${userId}' AND broker.is_global = 2 AND company.deleted = 0`;
                    }else{
                        where = `broker.region_id = ${postData?.region_id ?? null} AND broker.is_global = 2 AND company.deleted = 0`;
                    }
                    let resultDetails = await this.brokerService.listRecordWithCCT(
                        where,
                        null,
                        [
                            'broker.id', 'broker.org_id', 'broker.user_id', 'broker.broker_admin_id', 'broker.location', 'broker.department', 'broker.state', 'broker.city',
                            'broker.is_global', 'broker.region_id', 'broker.status',
                            'company_type.company_type', 'company_type.id',
                            'company.id', 'company.company_name', 'company.state', 'company.city', 'company.country', 'company.code',
                        ]
                    );
                    return res.status(HttpStatus.OK).json({
                        statusCode: 200,
                        success: 1,
                        error: 0,
                        data: resultDetails,
                        message: 'success',
                    });
                }
                if (postData?.type && postData?.type === 'broker') {
                    let result: object[] = [];
                    let where : string = `broker.status = 1`
                    if (postData?.user_id) {
                        where += ` AND broker.user_id = '${postData?.user_id}' `;
                    }
                    if (postData?.filter_by?.toLowerCase() == 'user_name') {
                        where += this.commonService.generateDynamicSearchQuery(postData?.search_str ?? '', ['user.first_name', 'user.last_name', 'full_name']);
                    }
                    if (postData?.filter_by?.toLowerCase() == 'location') {
                        where += this.commonService.generateDynamicSearchQuery(postData?.search_str ?? '', ['Location.location_name']);
                    }
                    if (postData?.filter_by?.toLowerCase() == 'department') {
                        where += this.commonService.generateDynamicSearchQuery(postData?.search_str ?? '', ['Department.dept_name']);
                    }
                    if (postData?.filter_by?.toLowerCase() == 'state') {
                        where += this.commonService.generateDynamicSearchQuery(postData?.search_str ?? '', ['broker.state']);
                    }
                    if (postData?.filter_by?.toLowerCase() == 'city') {
                        where += this.commonService.generateDynamicSearchQuery(postData?.search_str ?? '', ['broker.city']);
                    }
                    let resultedData = await this.brokerService.listRecordWithU(where);
                    if (resultedData?.length > 0) {
                        const userMap = new Map();
                        for (let entry of resultedData) {
                            const userId: number = entry.user_id;
                            if (!userMap.has(userId)) {
                                userMap.set(userId, {
                                    user_id: userId,
                                    // here give id , full name 
                                    user: {
                                        id: entry?.['user']?.id,
                                        first_name: entry?.['user']?.first_name,
                                        last_name: entry?.['user']?.last_name,
                                        full_name: entry?.['user']?.first_name + ' ' + entry?.['user']?.last_name,
                                    },
                                    is_global: 0,
                                    is_location: 0,
                                    is_department: 0,
                                    is_state: 0,
                                    is_city: 0,
                                    states: new Set(),
                                    cities: new Set(),
                                    departments: new Set(),
                                    locations: new Set(),
                                });
                            }
                            const userEntry = userMap.get(userId);
                            // Flags for types
                            if (entry.is_global === 1) {
                                userEntry.is_global = 1;
                            }
                            if (entry.state) {
                                userEntry.is_state = 1;
                                userEntry.states.add(entry?.state.trim());
                            }
                            if (entry.city) {
                                userEntry.is_city = 1;
                                userEntry.cities.add(entry?.city.trim());
                            }
                            if (entry.department) {
                                userEntry.is_department = 1;
                                userEntry.departments.add(entry?.department);
                            }
                            if (entry.location) {
                                userEntry.is_location = 1;
                                userEntry.locations.add(entry?.location);
                            }
                        }
                        // Convert Map to Array and clean up sets
                        for (let userData of userMap.values()) {
                            result.push({
                                ...userData,
                                states: Array.from(userData.states),
                                cities: Array.from(userData.cities),
                                departments: Array.from(userData.departments),
                                locations: Array.from(userData.locations),
                            });
                        }
                    }
                    return res.status(HttpStatus.OK).json({
                        statusCode: 200,
                        success: 1,
                        error: 0,
                        data: result,
                        message: 'success',
                    });
                }
                let broker: object[]; 
                if (appConstant.ROLE.BROKERADMIN == roleId) {
                    broker = await this.brokerService.listRecordWithCCT(
                        `broker.broker_admin_id = ${userId} AND broker.status != 2`,
                        null,
                        ['broker.id', 'company.id', 'company.company_name']
                    )
                }
                else if (appConstant.ROLE.BROKER == roleId) {
                    broker = await this.brokerService.listRecordWithCCT(
                        `broker.user_id = ${userId} AND broker.is_global IN (0,1) AND broker.status != 2`,
                        null,
                        ['broker.id', 'company.id', 'company.company_name'],
                        'broker.org_id'
                    )
                }
                else if (appConstant.ROLE.REGIONALADMIN == roleId) {
                    broker = await this.brokerService.listRecordWithCCT(
                        `broker.user_id = ${userId} AND broker.is_global = 2 AND broker.status != 2`,
                        null,
                        ['broker.id', 'company.id', 'company.company_name']
                    )
                }
                else{
                    broker = [];
                }
                let brokerCompany = broker.map(b => b?.['company']);
                let assignedBrokers = await this.brokerService.listRecordWithCCT(
                    `broker.region_id = ${postData?.region_id ?? null} AND broker.is_global = 2`,
                    null,
                    ['broker.id', 'company.id', 'company.company_name']
                )
                let where = `broker.region_id != ${postData?.region_id ?? null} AND broker.is_global = 2 AND broker.status != 2`;
                let alreadyAssigned = await this.brokerService.listRecordWithCCT(
                    where,
                    null,
                    ['broker.id', 'company.id', 'company.company_name']
                )
                let assignedCompanyIds : number[] = assignedBrokers.map(b => Number(b?.['company']?.id));
                let alreadyAssignedCompanyIds : number[] = alreadyAssigned.map(b => Number(b?.['company']?.id));
                let companyList = [];
                for (let company of brokerCompany) {
                    if (!company?.id) continue;
                    companyList.push({
                        id: company.id,
                        name: company.company_name,
                        selected: assignedCompanyIds.includes(company.id) ? 1 : 0
                    });
                }
                // for assigned company list
                let assignMap: { id: number; name: string; selected: number }[] = [];
                assignedBrokers?.forEach(b => {
                    assignMap.push({
                        id: b?.['company']?.id,
                        name: b?.['company']?.company_name,
                        selected: 1,
                    });
                });
                for (let company of brokerCompany) {
                    if (!company?.id) continue;
                    if (alreadyAssignedCompanyIds?.includes(company?.id)) {
                        assignMap.push({
                            id: company.id,
                            name: company.company_name,
                            selected: 0,
                        });
                    }
                }
                let resultData = {
                    Company: companyList,
                    assignedCompanyList: assignMap,
                };
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: resultData,
                    message: 'success',
                });
            }
            const where = {
                status: 1,
            };
            if(postData?.org_id){
                where["org_id"] = postData?.org_id;
            }
            let resultedData = await this.brokerService.listRecord(where);
            resultedData = <any>(
                await this.commonArrayService.formatToDto(BrokerDto, resultedData, req.lang)
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
    /**
    * broker user view API for broker admin , broker and regional admin.
    * org_id and page and limit is mandtory for broker admin and reginal admin.
    * action, org_id, id(broker id from paginate) and page and limit is mandtory for broker. location_id for location action , department_id for department action, 
    */
    @Post('broker-users')
    async brokerUserView(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.org_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let user = Object.create(req?.tokenUser);
            let roleId :number = user?.role_id;
            let userId :number = user?.id;
            let whereCompany = `company.id = '${postData?.org_id}' AND company.deleted = 0`;
            let companyDetails = await this.companyService.findOneV1(whereCompany,[],['company.id', 'company.company_name']);
            if (!companyDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_NO_RECORD_FOUND"));
            }
            if (appConstant.ROLE.BROKERADMIN == roleId) {
                let whereBroker = {
                    broker_admin_id: userId,
                    org_id: postData?.org_id,
                    status: Not(2)
                }
                let tableData = [tableConstant.MASTER.TBL_ROLES];
                let fields = [
                    'user.first_name','user.last_name','user.code','user.id','user.username','user.status','user.created','role.id','role.title'
                ];
                let checkBroker = await this.brokerService.findOne(whereBroker);
                if (!checkBroker) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_UNAUTHORIZATION_LOCATION"));
                }
                let membershipCode = await this.companyService.getCompanyCodeFromId(postData?.org_id);
                if (!membershipCode) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_NO_RECORD_FOUND"));
                }
                let where = `user.membership_code = '${membershipCode}' AND user.role_id IN (2,11,16) AND user.status =1`;
                if (postData?.search_str) {
                    where += this.commonService.generateDynamicSearchQuery(postData?.search_str ?? '', ['user.username','full_name','user.code'], false);
                }
                let resultedData = await this.userService.paginateList(
                    where,
                    postData,
                    fields,
                    tableData
                );
                resultedData['list'] = <any>(
                    await this.commonArrayService.formatToDto(UserDto, resultedData['list'], req.lang)
                );
                resultedData['company'] = companyDetails;
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: resultedData,
                    message: 'success',
                });
            }
            if (appConstant.ROLE.BROKER == roleId) {
                const { id, org_id } = postData;
                const action = postData?.action?.toLowerCase() || 'organization'
                let whereBroker: any = { user_id: userId, status: Not(2) };
                let WhereUser: any = `user.role_id IN (2,11,16) AND user.status =1`;
                let membershipCode: any;
                let orgId = org_id;
                let tableData = [tableConstant.MASTER.TBL_ROLES];
                let fields = [
                    'user.first_name','user.last_name','user.code','user.id','user.username','user.created','user.status','role.id','role.title'
                ];
                switch (action) {
                    case 'organization':
                        whereBroker = { ...whereBroker, org_id: org_id, is_global: 1 };
                        membershipCode = await this.companyService.getCompanyCodeFromId(orgId);
                        if (!membershipCode) {
                            throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_NO_RECORD_FOUND"));
                        }
                        WhereUser += ` AND user.membership_code = '${membershipCode}'`
                        break;
                    case 'location':
                        whereBroker = { ...whereBroker, org_id: org_id, location: postData?.location_id };
                        membershipCode = await this.companyService.getCompanyCodeFromId(orgId);
                        if (!membershipCode) {
                            throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_NO_RECORD_FOUND"));
                        }
                        WhereUser += ` AND user.membership_code = '${membershipCode}' AND user.location = ${postData?.location_id || 0}`
                        break;
                    case 'department':
                        whereBroker = { ...whereBroker, org_id: org_id, department: postData?.department_id };
                        membershipCode = await this.companyService.getCompanyCodeFromId(orgId);
                        if (!membershipCode) {
                            throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_NO_RECORD_FOUND"));
                        }
                        WhereUser += ` AND user.membership_code = '${membershipCode}' AND user.department_id = ${postData?.department_id || 0}`
                        break;
                    case 'state':
                        whereBroker = { ...whereBroker, id: id, user_id: userId };
                        break;
                    case 'city':
                        whereBroker = { ...whereBroker, id: id, user_id: userId };
                        break;
                    default:
                        throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_UNAUTHORIZATION_LOCATION"));
                }
                const checkBroker = await this.brokerService.findOne(whereBroker);
                if (!checkBroker) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_UNAUTHORIZATION_LOCATION"));
                }
                if (action === 'state' && checkBroker?.state) {
                    orgId = checkBroker.org_id;
                    let state = checkBroker?.state || ''
                    membershipCode = await this.companyService.getCompanyCodeFromId(orgId);
                    if (!membershipCode) {
                        throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_NO_RECORD_FOUND"));
                    }
                    WhereUser += ` AND user.membership_code = '${membershipCode}' AND settings.state = ${state}`;
                    tableData.push(tableConstant.TBL_USERS_SETTINGS)
                } else if (action === 'city' && checkBroker?.city) {
                    orgId = checkBroker.org_id;
                    let city = checkBroker?.city || ''
                    membershipCode = await this.companyService.getCompanyCodeFromId(orgId);
                    if (!membershipCode) {
                        throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_NO_RECORD_FOUND"));
                    }
                    WhereUser += ` AND user.membership_code = '${membershipCode}' AND settings.city = ${city}`
                    tableData.push(tableConstant.TBL_USERS_SETTINGS)
                }
                if (postData?.search_str) {
                    WhereUser += this.commonService.generateDynamicSearchQuery(postData?.search_str ?? '', ['user.username','full_name','user.code'], false);
                }
                const resultedData = await this.userService.paginateList(WhereUser, postData, fields, tableData);
                resultedData['list'] = <any>(
                    await this.commonArrayService.formatToDto(UserDto, resultedData['list'], req.lang)
                );
                resultedData['company'] = companyDetails;
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: resultedData,
                    message: 'success',
                });
            }
            if (appConstant.ROLE.REGIONALADMIN == roleId) {
                let whereRG = {
                    user_id: userId,
                    org_id: postData?.org_id,
                    is_global: 2,
                    status: Not(2)
                }
                let tableData : string[] = [tableConstant.MASTER.TBL_ROLES];
                let fields : string[] = [
                    'user.first_name','user.last_name','user.code','user.id','user.username','user.created','user.status','role.id','role.title'
                ];
                let checkRG = await this.brokerService.findOne(whereRG);
                if (!checkRG) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_UNAUTHORIZATION_LOCATION"));
                }
                let membershipCode = await this.companyService.getCompanyCodeFromId(postData?.org_id);
                if (!membershipCode) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_NO_RECORD_FOUND"));
                }
                let where : string = `user.membership_code = '${membershipCode}' AND user.role_id IN (2,11,16) AND user.status =1`;
                if (postData?.search_str) {
                    where += this.commonService.generateDynamicSearchQuery(postData?.search_str ?? '', ['user.username','full_name','user.code'], false);
                }
                let resultedData = await this.userService.paginateList(
                    where,
                    postData,
                    fields,
                    tableData
                );
                resultedData['list'] = <any>(
                    await this.commonArrayService.formatToDto(UserDto, resultedData['list'], req.lang)
                );
                resultedData['company'] = companyDetails;
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: resultedData,
                    message: 'success',
                });
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: 'success',
            });
        } catch (error) {
            this.activityLogService.error_log(req.tokenUser?.id, req?.originalUrl, error?.message, error, req);
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
    /**
     * API for assign broker.
     * assign_to , org_id, user_id are mendatory fields
     * assign_to = 0 (org) , 1 (Location), 2(Department), 3(state), 4(city)
     */
    @Post('assign')
    async assign(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (
                !this.commonService.isValidNumber(postData?.assign_to) || !postData?.org_id || !postData?.user_id
            ) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let assignData = Object.create(null);
            assignData['org_id'] = postData?.org_id;
            assignData['user_id'] = postData?.user_id;
            if (postData?.assign_to == 0) {
                let global_check = await this.brokerService.findOne({ org_id: postData?.org_id, user_id: postData?.user_id, is_global: 0, status: 1 });
                if (global_check) {
                    await this.brokerService.update({ user_id: global_check?.user_id, org_id: global_check?.org_id }, { status: 2 });
                    this.activityLogService.create(global_check, { status: 2 }, tableConstant.BROKER, req.tokenUser?.id);
                }
                assignData['is_global'] = 1;
                assignData['location'] = 0;
                assignData['department'] = 0;
                assignData['state'] = '';
                assignData['city'] = '';
                let brokerCheck = await this.brokerService.findOne({ org_id: postData?.org_id, user_id: postData?.user_id, is_global: 1, status: 1 });
                if (!brokerCheck) {
                    await this.brokerService.brokerRoleSave({
                        ...assignData,
                        status: 1
                    });
                } else {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ALREADY_ASSIGNED_GLOBAL"));
                }
            } else if (postData?.assign_to == 1 || postData?.assign_to == 2 || postData?.assign_to == 3 || postData?.assign_to == 4) {
                let global_check = await this.brokerService.findOne({ org_id: postData?.org_id, user_id: postData?.user_id, is_global: 1, status: 1 });
                if (!global_check) {
                    if (postData?.assign_to == 1) {
                        if (postData?.location) {
                            for (let location of postData?.location.split(',')) {
                                let location_check = await this.brokerService.findOne({ org_id: postData?.org_id, user_id: postData?.user_id, location: location, status: 1 });
                                if (!location_check) {
                                    await this.brokerService.brokerRoleSave({
                                        ...assignData,
                                        location: location,
                                        is_global: 0,
                                        status: 1
                                    });
                                }
                            }
                        }
                    }
                    if (postData?.assign_to == 2) {
                        if (postData?.department) {
                            for (let department of postData?.department.split(',')) {
                                let department_check = await this.brokerService.findOne({ org_id: postData?.org_id, user_id: postData?.user_id, department: department, status: 1 });
                                if (!department_check) {
                                    await this.brokerService.brokerRoleSave({
                                        ...assignData,
                                        department: department,
                                        is_global: 0,
                                        status: 1
                                    });
                                }
                            }
                        }
                    }
                    if (postData?.assign_to == 3) {
                        if (postData?.state) {
                            for (let state of postData?.state.split(',')) {
                                let state_check = await this.brokerService.findOne({ org_id: postData?.org_id, user_id: postData?.user_id, state: state, status: 1 });
                                if (!state_check) {
                                    await this.brokerService.brokerRoleSave({
                                        ...assignData,
                                        state: state,
                                        is_global: 0,
                                        status: 1
                                    });
                                }
                            }
                        }
                    }
                    if (postData?.assign_to == 4) {
                        if (postData?.city) {
                            for (let city of postData?.city.split(',')) {
                                let city_check = await this.brokerService.findOne({ org_id: postData?.org_id, user_id: postData?.user_id, city: city, status: 1 });
                                if (!city_check) {
                                    await this.brokerService.brokerRoleSave({
                                        ...assignData,
                                        city: city,
                                        is_global: 0,
                                        status: 1
                                    });
                                }
                            }
                        }
                    }
                } else {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ALREADY_ASSIGNED_GLOBAL"));
                }
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: 'Broker Assign Succesfully',
            });
        } catch (error) {
            this.activityLogService.error_log(req.tokenUser?.id, req?.originalUrl, error?.message, error, req);
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
    /**
     * API for broker admin dashboard API for find total client and total-region.
     */
    @Post('broker-dashboard')
    async brokerDashboard(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            let user = Object.create(req?.tokenUser);
            let roleId = user.role_id;
            let userId = user.id;
            let resultData=Object.create(null);
            if ([appConstant.ROLE.BROKERADMIN].includes(roleId)) {
                let where = `broker.broker_admin_id = ${userId} AND company.status = 1 AND broker.status = 1`;
                let company = await this.brokerService.listRecordWithCBR(where, null, ['company.id', 'broker.id']);
                if (company) {
                    resultData['total_client'] = company.length;
                } else {
                    resultData['total_client'] = 0
                }
                let region = await this.regionsService.listRecord({ created_by: userId, status: 1 });
                if (region) {
                    resultData['total_region'] = region.length;
                } else {
                    resultData['total_region'] = 0
                }
            }
            if ([appConstant.ROLE.BROKER].includes(roleId)) {
                let where = `broker.user_id = ${userId} AND broker.is_global = 1 AND company.status = 1 AND broker.status = 1`;
                let company = await this.brokerService.listRecordWithCBR(where, null, ['company.id', 'broker.id','region.id']);
                if (company) {
                    resultData['total_client'] = company.length;
                } else {
                    resultData['total_client'] = 0;
                }
                let regionCount = 0;
                for(let value of company){
                    if(value && value?.['region'] ){
                        regionCount += regionCount
                    }
                }
                resultData['total_region'] = regionCount ?? 0;
            }
            if ([appConstant.ROLE.REGIONALADMIN].includes(roleId)) {
                let where = `broker.user_id = ${userId} AND broker.is_global = 2 AND company.status = 1 AND broker.status = 1`;
                let company = await this.brokerService.listRecordWithCBR(where, null, ['company.id', 'broker.id','region.id']);
                if (company) {
                    resultData['total_client'] = company.length;
                } else {
                    resultData['total_client'] = 0;
                }
                let membershipCode = user?.membership_code
                let totalBrokers = await this.userService.findAllUserRecord(
                    {
                        membership_code:membershipCode,
                        role_id: 7,
                        status: 1
                    }
                    ,['id']
                )
                if (totalBrokers) {
                    resultData['total_broker'] = totalBrokers.length;
                } else {
                    resultData['total_broker'] = 0
                }
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: resultData,
                message: 'success',
            });
        } catch (error) {
            this.activityLogService.error_log(req.tokenUser?.id, req?.originalUrl, error?.message, error, req);
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
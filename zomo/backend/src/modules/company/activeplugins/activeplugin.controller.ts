import { appConstant, CommonFileService, CommonService, tableConstant } from '@common-constants';
import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Inject,
    Post,
    Req,
    Res,
    UseGuards
} from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { Request, Response } from "express";
import { lastValueFrom } from "rxjs";
import { ActivityLogService } from "src/modules/master/activitylog/activitylog.service";
import { TranslationService } from "src/modules/translation/translation.service";
import { AccessGuard, RoleGuard, TokenGuard } from "../../../guard";
import { ActivePluginsInput, PaginateWithCompanyInput } from "../../../input";
import { ClientManagerAssignService } from "../clientmanagerassign/clientmanagerassign.service";
import { CompanyService } from "../companies/company.service";
import { ActivePluginService } from "./activeplugin.service";
@Controller('activeplugin')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class ActivePluginController {
    constructor(
        private readonly activePluginService: ActivePluginService,
        private readonly companyService: CompanyService,
        private readonly commonService: CommonService,
        private readonly commonFileService: CommonFileService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        private readonly clientManagerAssignService: ClientManagerAssignService,
        @Inject('COMMON_SERVICE')
                private commonMicroservice: ClientProxy,
    ) {}
    /*
     * Function to get details of active plugins
     * - company_id is mandatory params
     */
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithCompanyInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let where = `user.status = '1' AND user.role_id IN (2,16) AND active.plugin_name LIKE '%Hra%' AND company.deleted = 0 AND company.status = 1 `;
            if (postData?.role_id) {
                where += ` AND user.role_id IN(${postData?.role_id}) AND user.membership_code = company.code`;
            }
            if(postData?.filter_by?.toLowerCase() == 'username'){
                where += `AND user.username LIKE '%${this.commonFileService.quoteEscaper(postData?.search_str)}%'`;
            }
            if(postData?.filter_by?.toLowerCase() == 'name'){
                where += `AND user.first_name LIKE '%${this.commonFileService.quoteEscaper(postData?.search_str)}%'`;
            }
            if(postData?.filter_by?.toLowerCase() == 'org_name'){
                where += `AND company.company_name LIKE '%${this.commonFileService.quoteEscaper(postData?.search_str)}%'`;
            }
            if (appConstant.ROLE.CLIENTENGAGEMENTMANAGER == req.tokenUser?.role_id){
                let resultedData = await this.clientManagerAssignService.listRecord({user_id: req.tokenUser?.id,status: 1},null);
                if(resultedData.length > 0){
                    where += `AND active.company_id IN (${resultedData.map(ele=>ele.org_id).join(',')})`;
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
            let fields = ['active.id', 'active.company_id','company.id', 'company.code','company.company_name','user.id','user.code','user.role_id','user.first_name','user.middle_name','user.last_name','user.username','user.status'];
            const resultedData = await this.activePluginService.paginateList(
                fields,
                where,
                postData
            )
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
    @Post('get')
    async get(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.company_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const findCompany = await this.companyService.companyFindOne({ id: postData?.company_id, status: 1 });
            if (!findCompany) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }
            let activePlugins = await this.activePluginService.getActivePluginList(postData?.company_id);
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: activePlugins,
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
     * Use to create/update active plugins
     * - company_id and plugin_name is mandatory params
     */
    @Post('set')
    async set(@Req() req: Request, @Res() res: Response, @Body() postData: ActivePluginsInput) {
        try {
            if (!postData?.company_id || !postData?.plugin_name) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const findCompany = await this.companyService.findOneV1({ id: postData?.company_id },[],['company.id','company.status']);
            if (!findCompany || findCompany.status != 1) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, findCompany && findCompany.status != 1 ? "First enable your organization" : "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }
            let activePlugins = {};
            for(let i = 0; i < postData?.plugin_name.length; i++){
                if(this.commonService.isValidPlugin(postData?.plugin_name[i])){
                    activePlugins[postData?.plugin_name[i]] = 1;
                }
            }
            delete postData?.plugin_name;
            if(postData?.membership_plan_id){
                await this.companyService.update({ id: postData?.company_id },{membership_plan_id: postData?.membership_plan_id});
            }
            const pluginsDetails = await this.activePluginService.findOne({ company_id: postData?.company_id });
            if (pluginsDetails) {
                await this.activePluginService.update(
                    { id: pluginsDetails.id },
                    {
                        updated_by: req.tokenUser?.id,
                        ...postData,
                        plugin_name : JSON.stringify(activePlugins)
                    },
                );
                this.activityLogService.create(pluginsDetails, {
                    updated_by: req.tokenUser?.id,
                    ...postData,
                    plugin_name : JSON.stringify(activePlugins)
                }, tableConstant.COMPANIES.TBL_ACTIVE_PLUGINS, req.tokenUser?.id);
            } else {
                await this.activePluginService.save({
                    created_by: req.tokenUser?.id,
                    ...postData,
                    plugin_name: JSON.stringify(activePlugins)
                });
            }
            let resultDetails = {
                pluginname:  Object.keys(activePlugins)
            }
            let fileName = `activeplugin_${postData.company_id}.json`
            let bucketFileName = `local/activeplugin/${postData.company_id}/${fileName}`;
            await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: Buffer.from(JSON.stringify(resultDetails)).toString('base64'), filename: bucketFileName}));
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
    @Post('update-activeplugin-modules')
    async updateActivepluginModules(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            const where = { };
            if (postData?.company_id) {
                where['company_id'] = postData.company_id;
            }
            const resultedData = await this.activePluginService.listRecord(where);
            for (const item of resultedData) {
                const pluginNames = Object.keys(JSON.parse(item.plugin_name));
                const resultDetails = { pluginname: pluginNames };
                const fileName = `activeplugin_${item.company_id}.json`;
                const bucketFileName = `local/activeplugin/${item.company_id}/${fileName}`;
                await lastValueFrom(this.commonMicroservice.send({ cmd: 'upload_file' }, { path: Buffer.from(JSON.stringify(resultDetails)).toString('base64'), filename: bucketFileName, userBucket: 'public', }));
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: '',
                message: 'Success',
            });
        } catch (error) {
            this.activityLogService.error_log(
                req?.tokenUser?.id,
                req?.originalUrl,
                error?.message,
                error,
                req
            );
            throw new HttpException(
                {
                    statusCode: 400,
                    success: 0,
                    error: 1,
                    message: error?.message || 'An error occurred',
                    data: [],
                },
                HttpStatus.BAD_REQUEST
            );
        }
    }
}    
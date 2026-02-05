import { appConstant, CommonArrayService, CommonService, CovidVaccinationTypeDto, tableConstant } from '@common-constants';
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
import { ClientManagerAssignService } from "src/modules/company/clientmanagerassign/clientmanagerassign.service";
import { CompanyService } from "src/modules/company/companies/company.service";
import { ActivityLogService } from "src/modules/master/activitylog/activitylog.service";
import { AccessGuard, RoleGuard, TokenGuard } from "../../../guard";
import { CovidVaccinationTypeInput, PaginateCovidInput } from "../../../input";
import { TranslationService } from "../../translation/translation.service";
import { VaccinationTypeService } from "./vaccinationType.service";
@Controller('covid/vaccination-type')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class VaccinationTypeController {
    constructor(
        private readonly vaccinationTypeService: VaccinationTypeService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService,
        private readonly companyService: CompanyService,
        private readonly activityLogService: ActivityLogService,
        private readonly clientManagerAssignService: ClientManagerAssignService,
    ) {
    }
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateCovidInput) {
        try {
            if ([appConstant.ROLE.ORGADMIN, appConstant.ROLE.ADMIN,appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER].includes(req.tokenUser?.role_id)) {
                let where = [appConstant.ROLE.ORGADMIN, appConstant.ROLE.ADMIN,appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER].includes(req.tokenUser?.role_id) ? `vaccinationType.status NOT IN(2)` : `vaccinationType.status NOT IN(0,2)`;
                if (postData?.filter_by?.toLowerCase() == 'organization') {
                    const order_by = postData?.order_by;
                    const limit = postData?.limit;
                    const page = postData?.page;
                    postData.page = 1;
                    postData.limit = 100;
                    delete postData?.order_by;
                    const companyData = await this.companyService.paginateList(`company.deleted = 0 AND company.status = 1 AND company.company_name LIKE '%${postData?.search_str}%'`, postData as any);
                    postData.org_id = companyData && companyData.list.length ? companyData.list.map((e) => e.id).join(',') : '';
                    postData.order_by = order_by;
                    postData.limit = limit;
                    postData.page = page;
                }
                if (appConstant.ROLE.CLIENTENGAGEMENTMANAGER == req.tokenUser?.role_id){
                    let resultedData = await this.clientManagerAssignService.listRecord({user_id: req.tokenUser?.id,status: 1},null);
                    if(resultedData.length > 0){
                        postData.org_id = resultedData.map((e) => e.org_id).join(',');
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
                if (postData?.org_id != undefined || postData?.org_id != null) {
                    where += ` AND vaccinationType.org_id IN(${postData?.org_id.split(',')})`;
                }
                else{
                    where += ` AND((vaccinationType.org_id = 0) OR (vaccinationType.org_id != 0 AND company.id IS NOT NULL))`;
                }
                if (postData?.search_str && postData?.filter_by?.toLowerCase() != 'organization') {
                    where +=  this.commonService.generateDynamicSearchQuery(postData?.search_str,'vaccinationType.title');
                }
                const resultedData = await this.vaccinationTypeService.paginateList(
                    where,
                    postData,
                );
                resultedData['list'] = <any>(
                    await this.commonArrayService.formatToDto(CovidVaccinationTypeDto, resultedData['list'], req.lang)
                );
                await Promise.all(
                    resultedData['list'].map(async (element) => {
                        if ([appConstant.ROLE.ORGADMIN].includes(req.tokenUser?.role_id)) {
                            if (element['title']) {
                                const translationKey = `vaccination_type_${element['id']}`;
                                const translatedTitle = await this.translatorService.frontendReadTranslation(
                                    req.lang,
                                    translationKey,
                                    `/LC_MESSAGES/Common/CovidPopup/${element['org_id']}`,
                                    `dynamic`
                                );
                                if (translatedTitle !== translationKey) {
                                    element['title'] = translatedTitle;
                                }
                            }
                        }
                        let count = await this.vaccinationTypeService.listRecord({ 'org_id': element.org_id, status: 1 });
                        element['type_count'] = count.length;
                    }));
                   return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: resultedData,
                    message: 'success',
                });
            } else {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
            }
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
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            if ([appConstant.ROLE.ORGADMIN, appConstant.ROLE.ADMIN,appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER].includes(req.tokenUser?.role_id)) {
                const where = { id: postData?.id };
                if(postData?.org_id){
                    where['org_id'] = postData?.org_id;
                }
                let vaccinationTypeDetails = await this.vaccinationTypeService.findOne(where);
                if (!vaccinationTypeDetails) {
                    let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
                }
                vaccinationTypeDetails = <any>(
                    await this.commonArrayService.formatToDto(CovidVaccinationTypeDto, vaccinationTypeDetails, req.lang)
                );
                /*if (vaccinationTypeDetails['title']) {
                    const translationKey = `vaccination_type_${vaccinationTypeDetails['id']}`;
                    const translatedTitle = await this.translatorService.frontendReadTranslation(
                        req.lang,
                        translationKey,
                        `/LC_MESSAGES/Common/CovidPopup/${vaccinationTypeDetails['org_id']}`,
                        `dynamic`
                    );
                    if (translatedTitle !== translationKey) {
                        vaccinationTypeDetails['title'] = translatedTitle;
                    }
                }*/
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: vaccinationTypeDetails,
                    message: 'success',
                });
            } else {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
            }
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
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CovidVaccinationTypeInput) {
        try {
            if (!postData?.title) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            if ([appConstant.ROLE.ORGADMIN, appConstant.ROLE.ADMIN,appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER].includes(req.tokenUser?.role_id)) {
                postData['created_by'] = postData?.created_by ?? req.tokenUser?.id;
                postData['updated_by'] = postData?.updated_by ?? req.tokenUser?.id;
                if (postData?.org_id) {
                    for (let org_id of postData?.org_id.split(',')) {
                        postData.org_id = org_id;
                        const savedVaccinationType = await this.vaccinationTypeService.save({ ...postData, created_by: req.tokenUser?.id, updated_by: req.tokenUser?.id });
                        let dynamicData= { [`vaccination_type_${savedVaccinationType.raw.insertId}`]: postData?.title };
                        await this.translatorService.DynamicEngJsonData('Common',postData?.org_id,dynamicData,'Add','CovidPopup')
                    }
                }
                return res.status(HttpStatus.CREATED).json({
                    statusCode: 201,
                    success: 1,
                    error: 0,
                    data: null,
                    message: await this.translatorService.frontendReadTranslation(req.lang, 'VACCINATION_ADDED'),
                });
            } else {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
            }
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
            if ([appConstant.ROLE.ORGADMIN, appConstant.ROLE.ADMIN,appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER].includes(req.tokenUser?.role_id)) {
                const where = { id: postData?.id };
                const recordDetails = await this.vaccinationTypeService.findOne(where);
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
                await this.vaccinationTypeService.update(where, { status: 2, updated_by: req.tokenUser?.id });
                if (recordDetails) {
                    const titleKey = `vaccination_type_${recordDetails.id}`;
                    const dynamicData = {
                        [titleKey]: titleKey,
                    };
                    await this.translatorService.DynamicEngJsonData(
                        'Common',
                        recordDetails.org_id,
                        dynamicData,
                        'Delete',
                        'CovidPopup'
                    );
                }
                this.activityLogService.create(recordDetails, { status: 2, updated_by: req.tokenUser?.id }, tableConstant.COVID.COVID_VACCINATION_TYPE, req.tokenUser?.id, 'delete');
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: await this.translatorService.frontendReadTranslation(req.lang, 'VACCINATION_DELETED'),
                });
            } else {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
            }
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
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: CovidVaccinationTypeInput) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            if ([appConstant.ROLE.ORGADMIN, appConstant.ROLE.ADMIN,appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER].includes(req.tokenUser?.role_id)) {
                const where = { id: postData?.id };
                const recordDetails = await this.vaccinationTypeService.findOne(where);
                if (!recordDetails) {
                    await this.vaccinationTypeService.save({
                        ...postData,
                        created_by: req.tokenUser?.id,
                        updated_by: req.tokenUser?.id
                    });
                }
                await this.vaccinationTypeService.update(where, {
                    ...postData,
                    updated_by: req.tokenUser?.id
                });
                let dynamicData= { [`vaccination_type_${postData['id']}`]: postData?.title };
                await this.translatorService.DynamicEngJsonData('Common',postData?.org_id,dynamicData,'Edit','CovidPopup')
                this.activityLogService.create(recordDetails, { ...postData, updated_by: req.tokenUser?.id }, tableConstant.COVID.COVID_VACCINATION_TYPE, req.tokenUser?.id);
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: (postData?.status != undefined || postData?.status != null) ? await this.translatorService.frontendReadTranslation(req.lang, "STATUS_UPDATED"): await this.translatorService.frontendReadTranslation(req.lang, 'VACCINATION_UPDATED'),
                });
            } else {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
            }
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
            let resultedData = await this.vaccinationTypeService.listRecord(where);
            resultedData = <any>(
                await this.commonArrayService.formatToDto(CovidVaccinationTypeDto, resultedData, req.lang)
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
}
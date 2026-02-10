import { appConstant, CommonArrayService, CommonService, RegionDto, tableConstant } from '@common-constants';
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
import { BrokerService } from 'src/modules/broker/broker.service';
import { CompanyService } from 'src/modules/company/companies/company.service';
import { ActivityLogService } from "src/modules/master/activitylog/activitylog.service";
import { Not } from "typeorm";
import { AccessGuard, RoleGuard, TokenGuard } from "../../../guard";
import { CreateRegionInput, PaginateRegionInput } from "../../../input";
import { TranslationService } from "../../translation/translation.service";
import { StateCityService } from '../stateCity/stateCity.service';
import { RegionsService } from "./regions.service";
@Controller('region')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class RegionsController {
    constructor(
        private readonly regionService: RegionsService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        private readonly brokerService: BrokerService,
        private readonly stateCityService: StateCityService,
        private readonly companyService: CompanyService,
    ) {
    }
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateRegionInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let user = Object.create(req.tokenUser);
            let userId : number = user?.id;
            let roleId : number = user?.role_id;
            if ([appConstant.ROLE.BROKERADMIN, appConstant.ROLE.REGIONALADMIN].includes(roleId)) {
                if (postData?.type && postData?.type !== '' && postData?.type !== undefined && postData?.type !== null) {
                    let type : string = postData?.type?.toLowerCase();
                    let where : string = `region.status !=2 `;
                    if (type == 'regional') {
                        where += ` AND region.regional_admin = '${userId}'`;
                    } else if (type == 'broker') {
                        where += ` AND region.created_by = '${userId}'`;
                    }
                    if (postData?.search_str) {
                        where += this.commonService.generateDynamicSearchQuery(postData?.search_str ?? '', ['region.region_name', 'full_name'], false);
                    }
                    let field : string[] = ['user.id', 'user.first_name', 'user.last_name', 'region'];
                    const regionsData = await this.regionService.paginateList(
                        where,
                        postData,
                        field,
                        ['s_users']
                    );
                    regionsData['list'] = <any>(
                        await this.commonArrayService.formatToDto(RegionDto, regionsData['list'], req.lang)
                    );
                    // for total clint count in broker admin role.
                    if (regionsData['list'] && regionsData['list'].length) {
                        await Promise.all(regionsData['list'].map(async (ele) => {
                            if (!ele?.Totalclient) {
                                ele['total_client'] = 0;
                            }
                            let countTotalclient = await this.brokerService.brokerCount(`broker.region_id = ${ele?.id} AND broker.status != 2`);
                            ele['total_client'] = countTotalclient || 0;
                        }));
                    }
                    return res.status(HttpStatus.OK).json({
                        statusCode: 200,
                        success: 1,
                        error: 0,
                        data: regionsData,
                        message: 'success',
                    });
                }
            }
            let where : string = 'region.status !=2 ';
            if(postData?.regional_admin) {
                where = `AND region.regional_admin = '${postData?.regional_admin}'`;
            }
            if(postData?.created_by) {
                where = `AND region.created_by = '${postData?.created_by}'`;
            }
            if (postData?.search_str) {
                const conditionString : string = `AND region.region_name LIKE '%${postData?.search_str}%'`;
                where += conditionString;
            }
            const resultedData = await this.regionService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(RegionDto, resultedData['list'], req.lang)
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
            postData = this.commonService.sanitizePayload(postData);
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let user = Object.create(req.tokenUser);
            let roleId : number = user?.role_id;
            if ([appConstant.ROLE.BROKERADMIN, appConstant.ROLE.REGIONALADMIN].includes(roleId)) {
                const where :string = `region.id = ${postData?.id} AND region.status != 2`;
                let regionDetails = await this.regionService.findOneWithR(where);
                if (!regionDetails) {
                    let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                    return res.status(HttpStatus.OK).json({
                        statusCode: 200,
                        success: 1,
                        error: 0,
                        data: null,
                        message: errorMessage,
                    });
                }
                regionDetails = <any>(
                    await this.commonArrayService.formatToDto(RegionDto, regionDetails, req.lang)
                );
                let regionalState = await this.stateCityService.listRecord({ region_id: postData?.id, status: 1, state: Not('') });
                let regionalCity = await this.stateCityService.listRecord({ region_id: postData?.id, status: 1, city: Not('') });
                if (regionalState && regionalState.length > 0) {
                    for (let region of regionalState) {
                        let stateData = await this.companyService.stateList(region?.state ?? '', '');
                        let state = stateData.find(
                            ele =>
                                ele.statecode == region?.state
                                || ele.state == region?.state
                        );
                        region.state = state?.['state'];
                    }
                }
                regionDetails['assigned_states'] = regionalState || [];
                regionDetails['assigned_cities'] = regionalCity || [];
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: regionDetails,
                    message: 'success',
                });
            }
            const where = { id: postData?.id, status: Not(2) };
            let regionDetails = await this.regionService.findOne(where);
            if (!regionDetails) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }
            regionDetails = <any>(
                await this.commonArrayService.formatToDto(RegionDto, regionDetails, req.lang)
            );
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: regionDetails,
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
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateRegionInput) {
        try {
            if (
                !postData?.region_name
            ) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let user = Object.create(req?.tokenUser);
            let userId : number = user?.id;
            let roleId : number = user?.role_id;
            if ([appConstant.ROLE.BROKERADMIN, appConstant.ROLE.REGIONALADMIN].includes(roleId)) {
                let regionData = {
                    region_name: postData?.region_name || '',
                    regional_admin: postData?.regional_admin || 0,
                    created_by: userId
                }
                let regionDetails = await this.regionService.save(regionData);
                if (regionDetails) {
                    let regionId = regionDetails.identifiers[0].id;
                    for (let state of postData?.state.split(',')) {
                        if (state && state !== '') {
                            let checkState = await this.stateCityService.findOne({ state: state, status: 1 });
                            if (!checkState) {
                                let stateData = {
                                    region_id: regionId,
                                    state: state,
                                }
                                await this.stateCityService.save(stateData);
                            }
                            else {
                                throw new Error('Selected State Is Already Assigned To A Region.');
                            }
                        }
                    }
                    for (let city of postData?.city.split(',')) {
                        if (city && city !== '') {
                            let checkCity = await this.stateCityService.findOne({ city: city, status: 1 });
                            if (!checkCity) {
                                let cityData = {
                                    region_id: regionId,
                                    city: city,
                                }
                                await this.stateCityService.save(cityData);
                            }
                            else {
                                throw new Error('Selected City Is Already Assigned To A Region.');
                            }
                        }
                    }
                }
                return res.status(HttpStatus.CREATED).json({
                    statusCode: 201,
                    success: 1,
                    error: 0,
                    data: null,
                    message: 'Region has been Created Succesfully',
                });
            }
            await this.regionService.save({
                ...postData,
                created_by: req.tokenUser?.id
            });
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
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = {id: postData?.id, status: Not(2)};
            const recordDetails = await this.regionService.findOne(where);
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
            let user = Object.create(req?.tokenUser);
            let roleId : number = user?.role_id;
            if(roleId == appConstant.ROLE.BROKERADMIN){
                await this.regionService.update(where,{status: 2});
                this.activityLogService.create(recordDetails, {region_name: recordDetails}, tableConstant.REGION.REGIONS, req.tokenUser?.id, 'delete');
                await this.stateCityService.update({region_id: postData?.id}, {status: 2});
                this.activityLogService.create(recordDetails, {city: recordDetails}, tableConstant.REGION.REGION_STATE_CITY, req.tokenUser?.id, 'delete');
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: 'Region has been Removed Succesfully.',
                });
            }
            if ( roleId == appConstant.ROLE.REGIONALADMIN ) {
                await this.regionService.update(
                    where,
                    {status: 2}
                );
                this.activityLogService.create(recordDetails, {region_name: recordDetails}, tableConstant.REGION.REGIONS, req.tokenUser?.id, 'delete');
                await this.brokerService.update(
                    {region_id: postData?.id},
                    {status: 2}
                );
                this.activityLogService.create(recordDetails, {region_name: recordDetails}, tableConstant.BROKER, req.tokenUser?.id, 'delete');
                await this.stateCityService.update(
                    {region_id: postData?.id}, 
                    {status: 2}
                );
                this.activityLogService.create(recordDetails, {city: recordDetails}, tableConstant.REGION.REGION_STATE_CITY, req.tokenUser?.id, 'delete');
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: 'Region has been Removed Succesfully.',
                });
            }
            await this.regionService.update(where,{status: 2});
            this.activityLogService.create(recordDetails, {region_name: recordDetails}, tableConstant.REGION.REGIONS, req.tokenUser?.id, 'delete');
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
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: CreateRegionInput) {
        try {
            if (
                !postData?.id || !postData?.region_name
            ) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let user = Object.create(req?.tokenUser);
            let roleId : number = user?.role_id;
            if ([appConstant.ROLE.BROKERADMIN, appConstant.ROLE.REGIONALADMIN].includes(roleId)) {
                const where = { id: postData?.id, status: Not(2) };
                const recordDetails = await this.regionService.findOne(where);
                if (!recordDetails) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND"));
                }
                let updatedRegion = await this.regionService.update(where, postData);
                this.activityLogService.create(recordDetails, postData, tableConstant.REGION.REGIONS, req.tokenUser?.id);
                if(updatedRegion){
                    let regionId = postData?.id;
                    for (let state of postData?.state.split(',')) {
                        if (state && state !== '') {
                            let checkState = await this.stateCityService.findOne({ state: state, status: 1 });
                            if (!checkState) {
                                let stateData = {
                                    region_id: regionId,
                                    state: state,
                                }
                                await this.stateCityService.save(stateData);
                            }
                            else {
                                throw new Error('Selected State Is Already Assigned To A Region.');
                            }
                        }
                    }
                    for (let city of postData?.city.split(',')) {
                        if (city && city !== '') {
                            let checkCity = await this.stateCityService.findOne({ city: city, status: 1 });
                            if (!checkCity) {
                                let cityData = {
                                    region_id: regionId,
                                    city: city,
                                }
                                await this.stateCityService.save(cityData);
                            }
                            else {
                                throw new Error('Selected City Is Already Assigned To A Region.');
                            }
                        }
                    }
                    return res.status(HttpStatus.CREATED).json({
                        statusCode: 201,
                        success: 1,
                        error: 0,
                        data: null,
                        message: 'Region has been Updated Succesfully',
                    });
                } else {
                    throw new Error('Region Update Failed.');
                }
            }
            const where = {id: postData?.id, status: Not(2)};
            const recordDetails = await this.regionService.findOne(where);
            if (!recordDetails) {
                await this.regionService.save({
                    ...postData,
                    created_by: req.tokenUser?.id
                });
            }
            await this.regionService.update(where, postData);
            this.activityLogService.create(recordDetails, postData, tableConstant.REGION.REGIONS, req.tokenUser?.id);
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
            const where = { status: Not(2)};
            let resultedData = await this.regionService.listRecord(where);
            resultedData = <any>(
                await this.commonArrayService.formatToDto(RegionDto, resultedData, req.lang)
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
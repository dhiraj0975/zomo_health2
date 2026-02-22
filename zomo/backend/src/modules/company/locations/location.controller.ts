import { appConstant, CommonArrayService, CommonService, LocationsDto, tableConstant } from '@common-constants';
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
    UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Request, Response } from "express";
import { lastValueFrom } from 'rxjs';
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import { TranslationService } from 'src/modules/translation/translation.service';
import { UserService } from 'src/modules/user/user/user.service';
import { In, Like, Not } from 'typeorm';
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import {
    CreateLocationInput,
    PaginateWithCompanyInput,
    UpdateLocationInput,
} from '../../../input';
import { CompanyService } from '../companies/company.service';
import { FrontService } from "../front/front.service";
import { LocationService } from './location.service';
import { ListLocationInput } from './input/listLocation.input';
@Controller('location')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class LocationController {
    constructor(
        @Inject('TIMEZONE_SERVICE')
        private client: ClientProxy,
        private readonly locationService: LocationService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        private readonly userService: UserService,
        private readonly frontService: FrontService,
        @Inject('TIMEZONE_SERVICE') 
        private timeZoneMicroservice: ClientProxy,
        private readonly companyService: CompanyService,
    ) {}
    /*
     * Function to get paginate list of locations
     * - company_id is mandatory params
     * - can pass page, limit, order_by, order
     */
    @Post('paginate')
    async paginate(
        @Req() req: Request,
        @Res() res: Response,
        @Body() postData: PaginateWithCompanyInput,
    ) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            if (!postData?.company_id) {
                throw new Error(
                  await this.translatorService.frontendReadTranslation(
                        req.lang,
                        'ERR_REQUIRED_PARAM_MISSING',
                    ),
                );
            }
            let where = `location.deleted = 0 AND location.company_id = '${postData?.company_id}'`;
            if (postData?.search_str) {
                // ZOMO-3653
                where += this.commonService.generateDynamicSearchQuery(postData?.search_str, ['location.id', 'location.code','location.location_name','location.lname']);
            }
            const resultedData = await this.locationService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(
                    LocationsDto,
                    resultedData['list'],
                    req.lang
                )
            );
            let stateData = await this.companyService.stateList(null);
            await Promise.all(resultedData['list']?.map(async (ele) => {
                if(ele?.state){
                    let state = stateData.find(element => element.statecode == ele?.state || element.state == ele?.state);
                    ele.state = state?.['state'];
                    ele.statecode = state?.['statecode'];
                }
                if (req.lang != 'eng') {
                    if (ele.location_name) {
                        let customName = await this.translatorService.frontendReadTranslation(req.lang, `location_name_${ele['id']}`, `/LC_MESSAGES/OrgAdmin/Location/${postData?.company_id}/${ele['id']}`, `dynamic`);
                        ele.location_name = (customName == '' || customName == `location_name_${ele['id']}`) ? ele['location_name'] : customName;
                    }
                    if (ele.address1) {
                        let customName = await this.translatorService.frontendReadTranslation(req.lang, `location_address1_${ele['id']}`, `/LC_MESSAGES/OrgAdmin/Location/${postData?.company_id}/${ele['id']}`, `dynamic`);
                        ele.address1 = (customName == '' || customName == `location_address1_${ele['id']}`) ? ele['address1'] : customName;
                    }
                    if (ele.address2) {
                        let customName = await this.translatorService.frontendReadTranslation(req.lang, `location_address2_${ele['id']}`, `/LC_MESSAGES/OrgAdmin/Location/${postData?.company_id}/${ele['id']}`, `dynamic`);
                        ele.address2 = (customName == '' || customName == `location_address2_${ele['id']}`) ? ele['address2'] : customName;
                    }
                    if (ele.lname) {
                        let customName = await this.translatorService.frontendReadTranslation(req.lang, `location_lname_${ele['id']}`, `/LC_MESSAGES/OrgAdmin/Location/${postData?.company_id}/${ele['id']}`, `dynamic`);
                        ele.lname = (customName == '' || customName == `location_lname_${ele['id']}`) ? ele['lname'] : customName;
                    }
                    if (ele.city) {
                        let customName = await this.translatorService.frontendReadTranslation(req.lang, `location_city_${ele['id']}`, `/LC_MESSAGES/OrgAdmin/Location/${postData?.company_id}/${ele['id']}`, `dynamic`);
                        ele.city = (customName == '' || customName == `location_city_${ele['id']}`) ? ele['city'] : customName;
                    }
                    if (ele.state) {
                        let customName = await this.translatorService.frontendReadTranslation(req.lang, `location_state_${ele['id']}`, `/LC_MESSAGES/OrgAdmin/Location/${postData?.company_id}/${ele['id']}`, `dynamic`);
                        ele.state = (customName == '' || customName == `location_state_${ele['id']}`) ? ele['state'] : customName;
                    }
                    if (ele.country) {
                        let customName = await this.translatorService.frontendReadTranslation(req.lang, `location_country_${ele['id']}`, `/LC_MESSAGES/OrgAdmin/Location/${postData?.company_id}/${ele['id']}`, `dynamic`);
                        ele.country = (customName == '' || customName == `location_country_${ele['id']}`) ? ele['country'] : customName;
                    }
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
     * Function to get details of the location
     * - id and company_id is mandatory params
     */
    @Post('get-one')
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id || !postData?.company_id) {
                throw new Error(
                  await this.translatorService.frontendReadTranslation(
                        req.lang,
                        'ERR_REQUIRED_PARAM_MISSING',
                    ),
                );
            }
            const where = {
                id: postData?.id,
                company_id: postData?.company_id,
                deleted: 0,
            };
            let locationDetails = await this.locationService.findOne(where);
            if (!locationDetails) {
                throw new Error(
                  await this.translatorService.frontendReadTranslation(
                        req.lang,
                        'ERR_RECORD_NOT_FOUND',
                    ),
                );
            }
            locationDetails = <any>(
                await this.commonArrayService.formatToDto(LocationsDto, locationDetails, req.lang)
            );
            let stateData = await this.companyService.stateList(locationDetails?.state);
            if(locationDetails?.state){
                let state = stateData.find(ele => ele.statecode == locationDetails?.state || ele.state == locationDetails?.state);
                locationDetails.state = state?.['state'];
                locationDetails['statecode'] = state?.['statecode'];
            }
            if (req.lang != 'eng') {
                if (locationDetails.location_name) {
                    let customName = await this.translatorService.frontendReadTranslation(req.lang, `location_name_${locationDetails['id']}`, `/LC_MESSAGES/OrgAdmin/Location/${locationDetails?.company_id}/${locationDetails['id']}`, `dynamic`);
                    locationDetails.location_name = (customName == '' || customName == `location_name_${locationDetails['id']}`) ? locationDetails['location_name'] : customName;
                }
                if (locationDetails.address1) {
                    let customName = await this.translatorService.frontendReadTranslation(req.lang, `location_address1_${locationDetails['id']}`, `/LC_MESSAGES/OrgAdmin/Location/${locationDetails?.company_id}/${locationDetails['id']}`, `dynamic`);
                    locationDetails.address1 = (customName == '' || customName == `location_address1_${locationDetails['id']}`) ? locationDetails['address1'] : customName;
                }
                if (locationDetails.address2) {
                    let customName = await this.translatorService.frontendReadTranslation(req.lang, `location_address2_${locationDetails['id']}`, `/LC_MESSAGES/OrgAdmin/Location/${locationDetails?.company_id}/${locationDetails['id']}`, `dynamic`);
                    locationDetails.address2 = (customName == '' || customName == `location_address2_${locationDetails['id']}`) ? locationDetails['address2'] : customName;
                }
                if (locationDetails.lname) {
                    let customName = await this.translatorService.frontendReadTranslation(req.lang, `location_lname_${locationDetails['id']}`, `/LC_MESSAGES/OrgAdmin/Location/${locationDetails?.company_id}/${locationDetails['id']}`, `dynamic`);
                    locationDetails.lname = (customName == '' || customName == `location_lname_${locationDetails['id']}`) ? locationDetails['lname'] : customName;
                }
                if (locationDetails.city) {
                    let customName = await this.translatorService.frontendReadTranslation(req.lang, `location_city_${locationDetails['id']}`, `/LC_MESSAGES/OrgAdmin/Location/${locationDetails?.company_id}/${locationDetails['id']}`, `dynamic`);
                    locationDetails.city = (customName == '' || customName == `location_city_${locationDetails['id']}`) ? locationDetails['city'] : customName;
                }
                if (locationDetails.state) {
                    let customName = await this.translatorService.frontendReadTranslation(req.lang, `location_state_${locationDetails['id']}`, `/LC_MESSAGES/OrgAdmin/Location/${locationDetails?.company_id}/${locationDetails['id']}`, `dynamic`);
                    locationDetails.state = (customName == '' || customName == `location_state_${locationDetails['id']}`) ? locationDetails['state'] : customName;
                }
                if (locationDetails.country) {
                    let customName = await this.translatorService.frontendReadTranslation(req.lang, `location_country_${locationDetails['id']}`, `/LC_MESSAGES/OrgAdmin/Location/${locationDetails?.company_id}/${locationDetails['id']}`, `dynamic`);
                    locationDetails.country = (customName == '' || customName == `location_country_${locationDetails['id']}`) ? locationDetails['country'] : customName;
                }
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: locationDetails,
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
     * Function to get list of locations
     * - company_id is mandatory params
     * - can pass search_str, order_by, order
     */
    @Post('list')
    async list(@Req() req: Request, @Res() res: Response, @Body() postData: ListLocationInput) {
        try {
            if (!postData?.company_id) {
                throw new Error(
                  await this.translatorService.frontendReadTranslation(
                        req.lang,
                        'ERR_REQUIRED_PARAM_MISSING',
                    ),
                );
            }
            if(postData?.type == 'hra'){
                let result = await this.frontService.locationData( ["DISTINCT(user.location) AS location", "location.id AS id","location.lname AS lname","location.city AS city","location.state AS state","company.company_name AS company_name"],`location.company_id IN (${postData?.company_id}) AND location.deleted = '0' AND company.companytype_id = '3' AND location.id IN(user.location)`,{ 'location.id' : 'ASC' },[{'join_table': 'company.location','alias':'company', 'table' : tableConstant.COMPANIES.TBL_COMPANY, 'on_condition' : `location.company_id = company.id`, 'join_type': 'inner_one' },{'join_table': 'company.user','alias':'user', 'table' : tableConstant.TBL_USERS, 'on_condition' : `user.membership_code = company.code AND user.status = '1' AND user.location != ''`, 'join_type': 'inner_one' }],'getRawMany');
                result = <any>(
                    await this.commonArrayService.formatToDto(LocationsDto, result, req.lang)
                );
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: result,
                    message: 'success',
                });
            }
            if(postData?.type == 'report'){
                let user = req.tokenUser;
                if (!postData?.membership_code) {
                    throw new Error(
                      await this.translatorService.frontendReadTranslation(
                            req.lang,
                            'ERR_REQUIRED_PARAM_MISSING',
                        ),
                    );
                }
                let companyIds = this.commonArrayService.transformToArray(postData?.company_id, ',');
                let whereLocation = `location.company_id IN (${companyIds.join(',')}) AND location.deleted = 0`;
                if (appConstant.ROLE.WCH == req.tokenUser?.role_id) {
                    //for only assign location listing add 'location' at last of function call usersDataWellness
                    // const userList = await this.userService.usersDataWellness(user, `user.role_id != 1 AND user.id != ${user.id} AND user.membership_code = '${user['membership_code']}' AND user.status =1`,'location');         // for only location wise
                    const userList = await this.userService.usersDataWellness(user, `user.role_id != 1 AND user.id != ${user.id} AND user.membership_code = '${user['membership_code']}' AND user.status =1`);          // direct with all users wise who have champion
                    if (!userList || userList.length == 0) {
                        whereLocation += ` AND user.id = 0`;
                    } else {
                        whereLocation += ` AND user.id IN (${userList.map(ele => ele.id).join(',')})`;
                    }
                }
                let locationResult = await this.locationService.userWiseLocationList(whereLocation, ['location.id', 'location.code', 'location.lname', 'location.location_name', 'location.city', 'location.state', 'location.country', 'location.zip']);
                if (locationResult && locationResult.length > 0) {
                    const canadaZips = [];
                    const usZips = [];
                    Object.entries(locationResult).forEach(([key, value]) => {
                        if (value.country === 'Canada') {
                            canadaZips.push(value.zip);
                        } else if (value.country === 'United States') {
                            usZips.push(value.zip);
                        }
                    });
                    let stateDataUs = await lastValueFrom(this.client.send({ cmd: 'find_postcode' }, [{ zipcode: usZips, countrycode: 'US' }]));
                    let stateDataCa = await lastValueFrom(this.client.send({ cmd: 'find_postcode' }, [{ postalcode: canadaZips, countrycode: 'CA' }]));
                    Object.entries(locationResult).forEach(([key, value]) => {
                        if (!locationResult[key].StateFullName) {
                            locationResult[key].StateFullName = '';
                        }
                        if (value.country === 'United States' && stateDataUs) {
                            const matchingState = stateDataUs.find((state) => String(state.postalcode) === String(value.zip));
                            if (matchingState) {
                                locationResult[key].StateFullName = matchingState.state;
                            } else {
                                locationResult[key].StateFullName = value.state;
                            }
                        } else if (value.country === 'Canada' && stateDataCa) {
                            const matchingState = stateDataCa.find((state) => String(state.postalcode) === String(value.zip));
                            if (matchingState) {
                                locationResult[key].StateFullName = matchingState.state;
                            } else {
                                locationResult[key].StateFullName = value.state;
                            }
                        } else {
                            locationResult[key].StateFullName = value.state;
                        }
                    });
                    if (postData?.default == 'all') {
                        let allLocationsOption: any = {
                            id: 0,
                            code: '',
                            location_name: 'All Locations',
                            lname: '',
                            city: '',
                            state: '',
                            country: '',
                            zip: '',
                            StateFullName: '',
                        };
                        locationResult.unshift(allLocationsOption);
                    }
                    if (postData?.country && postData?.country != '') {
                        locationResult = locationResult.filter((ele) => ele?.country == postData?.country);
                    }
                    if (postData?.StateFullName && postData?.StateFullName != '') {
                        locationResult = locationResult.filter((ele) => ele?.['StateFullName'] == postData?.StateFullName);
                    }
                    if (locationResult && locationResult.length && req.lang != 'eng') {
                        await Promise.all(locationResult.map(async (ele) => {
                            if (ele.location_name) {
                                let customName = await this.translatorService.frontendReadTranslation(req.lang, `location_name_${ele['id']}`, `/LC_MESSAGES/OrgAdmin/Location/${postData?.company_id}/${ele['id']}`, `dynamic`);
                                ele.location_name = (customName == '' || customName == `location_name_${ele['id']}`) ? ele['location_name'] : customName;
                            }
                            if (ele.address1) {
                                let customName = await this.translatorService.frontendReadTranslation(req.lang, `location_address1_${ele['id']}`, `/LC_MESSAGES/OrgAdmin/Location/${postData?.company_id}/${ele['id']}`, `dynamic`);
                                ele.address1 = (customName == '' || customName == `location_address1_${ele['id']}`) ? ele['address1'] : customName;
                            }
                            if (ele.address2) {
                                let customName = await this.translatorService.frontendReadTranslation(req.lang, `location_address2_${ele['id']}`, `/LC_MESSAGES/OrgAdmin/Location/${postData?.company_id}/${ele['id']}`, `dynamic`);
                                ele.address2 = (customName == '' || customName == `location_address2_${ele['id']}`) ? ele['address2'] : customName;
                            }
                            if (ele.lname) {
                                let customName = await this.translatorService.frontendReadTranslation(req.lang, `location_lname_${ele['id']}`, `/LC_MESSAGES/OrgAdmin/Location/${postData?.company_id}/${ele['id']}`, `dynamic`);
                                ele.lname = (customName == '' || customName == `location_lname_${ele['id']}`) ? ele['lname'] : customName;
                            }
                            if (ele.city) {
                                let customName = await this.translatorService.frontendReadTranslation(req.lang, `location_city_${ele['id']}`, `/LC_MESSAGES/OrgAdmin/Location/${postData?.company_id}/${ele['id']}`, `dynamic`);
                                ele.city = (customName == '' || customName == `location_city_${ele['id']}`) ? ele['city'] : customName;
                            }
                            if (ele.state) {
                                let customName = await this.translatorService.frontendReadTranslation(req.lang, `location_state_${ele['id']}`, `/LC_MESSAGES/OrgAdmin/Location/${postData?.company_id}/${ele['id']}`, `dynamic`);
                                ele.state = (customName == '' || customName == `location_state_${ele['id']}`) ? ele['state'] : customName;
                            }
                            if (ele.country) {
                                let customName = await this.translatorService.frontendReadTranslation(req.lang, `location_country_${ele['id']}`, `/LC_MESSAGES/OrgAdmin/Location/${postData?.company_id}/${ele['id']}`, `dynamic`);
                                ele.country = (customName == '' || customName == `location_country_${ele['id']}`) ? ele['country'] : customName;
                            }
                        }));
                    }
                    return res.status(HttpStatus.OK).json({
                        statusCode: 200,
                        success: 1,
                        error: 0,
                        data: locationResult,
                        message: 'success',
                    });
                }
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: locationResult,
                    message: 'success',
                });
            }
            postData.company_id = postData?.company_id.toString()
            let where: any = {
                status: 1,
                company_id: In(postData?.company_id.split(',')),
                deleted: 0,
            };
            if (postData?.search_str) {
                where = [
                    {
                        status: 1,
                        company_id: In(postData?.company_id.split(',')),
                        location_name: Like('%' + postData?.search_str + '%'),
                    },
                    {
                        status: 1,
                        company_id: In(postData?.company_id.split(',')),
                        lname: Like('%' + postData?.search_str + '%'),
                    },
                    {
                        status: 1,
                        company_id: In(postData?.company_id.split(',')),
                        code: Like('%' + postData?.search_str + '%'),
                    },
                ];
            }
            const order = postData && postData?.order ? postData?.order : 'DESC';
            const orderBy = postData && postData?.order_by ? postData?.order_by : 'id';
            let result = await this.locationService.listRecord(['id', 'code', 'location_name', 'lname','city','state','country','zip','is_default'],where, {
                [orderBy]: order,
            });
            if(postData?.type == 'all'){
                let allLocationsOption:any = {
                    id: 0,
                    code: '',
                    location_name: 'All Locations',
                    lname: '',
                    city: '',
                    state: '',
                    country: ''
                };
                result.unshift(allLocationsOption);
            }
            result = <any>(
                await this.commonArrayService.formatToDto(LocationsDto, result, req.lang)
            );
            if (result && result.length && req.lang != 'eng') {
                await Promise.all(result.map(async (ele) => {
                    if (ele.location_name) {
                        let customName = await this.translatorService.frontendReadTranslation(req.lang, `location_name_${ele['id']}`, `/LC_MESSAGES/OrgAdmin/Location/${postData?.company_id}/${ele['id']}`, `dynamic`);
                        ele.location_name = (customName == '' || customName == `location_name_${ele['id']}`) ? ele['location_name'] : customName;
                    }
                    if (ele.address1) {
                        let customName = await this.translatorService.frontendReadTranslation(req.lang, `location_address1_${ele['id']}`, `/LC_MESSAGES/OrgAdmin/Location/${postData?.company_id}/${ele['id']}`, `dynamic`);
                        ele.address1 = (customName == '' || customName == `location_address1_${ele['id']}`) ? ele['address1'] : customName;
                    }
                    if (ele.address2) {
                        let customName = await this.translatorService.frontendReadTranslation(req.lang, `location_address2_${ele['id']}`, `/LC_MESSAGES/OrgAdmin/Location/${postData?.company_id}/${ele['id']}`, `dynamic`);
                        ele.address2 = (customName == '' || customName == `location_address2_${ele['id']}`) ? ele['address2'] : customName;
                    }
                    if (ele.lname) {
                        let customName = await this.translatorService.frontendReadTranslation(req.lang, `location_lname_${ele['id']}`, `/LC_MESSAGES/OrgAdmin/Location/${postData?.company_id}/${ele['id']}`, `dynamic`);
                        ele.lname = (customName == '' || customName == `location_lname_${ele['id']}`) ? ele['lname'] : customName;
                    }
                    if (ele.city) {
                        let customName = await this.translatorService.frontendReadTranslation(req.lang, `location_city_${ele['id']}`, `/LC_MESSAGES/OrgAdmin/Location/${postData?.company_id}/${ele['id']}`, `dynamic`);
                        ele.city = (customName == '' || customName == `location_city_${ele['id']}`) ? ele['city'] : customName;
                    }
                    if (ele.state) {
                        let customName = await this.translatorService.frontendReadTranslation(req.lang, `location_state_${ele['id']}`, `/LC_MESSAGES/OrgAdmin/Location/${postData?.company_id}/${ele['id']}`, `dynamic`);
                        ele.state = (customName == '' || customName == `location_state_${ele['id']}`) ? ele['state'] : customName;
                    }
                    if (ele.country) {
                        let customName = await this.translatorService.frontendReadTranslation(req.lang, `location_country_${ele['id']}`, `/LC_MESSAGES/OrgAdmin/Location/${postData?.company_id}/${ele['id']}`, `dynamic`);
                        ele.country = (customName == '' || customName == `location_country_${ele['id']}`) ? ele['country'] : customName;
                    }
                }));
            }

            /*console.log('EmailCampaign Locations =>', result.map((l) => ({ id: l.id, location_name: l.location_name })));*/
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
                  data: [],
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }
    /*
     * Use to create new location
     * - company_id, lname, address1, city, state, country, zip, status is mandatory params
     */
    @Post('create')
    async create(
        @Req() req: Request,
        @Res() res: Response,
        @Body() postData: CreateLocationInput,
    ) {
        try {
            if (
                !postData?.company_id ||
                !postData?.lname ||
                !postData?.address1 ||
                !postData?.city ||
                !postData?.state ||
                !postData?.country ||
                !postData?.zip
            ) {
                throw new Error(
                  await this.translatorService.frontendReadTranslation(
                        req.lang,
                        'ERR_REQUIRED_PARAM_MISSING',
                    ),
                );
            }
            if(postData?.address1){
                postData.address1 = postData?.address1.trim();
            }
            if(postData?.address2){
                postData.address2 = postData?.address2.trim();
            }
            if(postData?.lname){
                postData.lname = postData?.lname.trim();
            }
            if(postData?.city){
                postData.city = postData?.city.trim();
            }
            if(postData?.state){
                postData.state = postData?.state.trim();
            }
            if(postData?.country){
                postData.country = postData?.country.trim();
            }
            const locationCheck = await this.locationService.findOne({
                company_id: postData?.company_id,
                deleted: 0,
                lname: postData?.lname,
                address1: postData?.address1,
                city: postData?.city,
                state: postData?.state,
                country: postData?.country,
                zip: postData?.zip,
            });
            if (locationCheck) {
                throw Error(
                  await this.translatorService.frontendReadTranslation(
                        req.lang,
                        'ERR_LOCATION_NAME_EXIST',
                    ),
                );
            }
            if (!postData?.location_name) {
                let locationParts = [];
                if (postData?.lname) locationParts.push(postData?.lname);
                if (postData?.address1) locationParts.push(postData?.address1);
                if (postData?.address2) locationParts.push(postData?.address2);
                if (postData?.city) locationParts.push(postData?.city);
                if (postData?.state) locationParts.push(postData?.state);
                if (postData?.zip) locationParts.push(postData?.zip);
                if (postData?.country) locationParts.push(postData?.country);
                postData.location_name = locationParts.join(', ');
            }
            const saveResult = await this.locationService.save(postData);
            const locationID = saveResult.identifiers[0].id;
            let dynamicData = Object.create(null);
            if(postData?.location_name){
                let title = `location_name_${locationID}`
                dynamicData[`${title}`]= postData?.location_name;
            } 
            if(postData?.address1){
                let title = `location_address1_${locationID}`
                dynamicData[`${title}`]= postData?.address1;
            }
            if(postData?.address2){
                let title = `location_address2_${locationID}`
                dynamicData[`${title}`]= postData?.address2;
            }
            if(postData?.lname){
                let title = `location_lname_${locationID}`
                dynamicData[`${title}`]= postData?.lname;
            }
            if(postData?.city){
                let title = `location_city_${locationID}`
                dynamicData[`${title}`]= postData?.city;
            }
            if(postData?.state){
                let title = `location_state_${locationID}`
                dynamicData[`${title}`]= postData?.state;
            }
            if(postData?.country){
                let title = `location_country_${locationID}`
                dynamicData[`${title}`]= postData?.country;
            }
            await this.translatorService.DynamicEngJsonData('OrgAdmin',postData?.company_id,dynamicData,'Edit','Location',locationID);
            let locationCode = this.commonService.generateCode('L', locationID);
            let codeCheck = await this.locationService.findOne({
                code: locationCode,
            });
            while (codeCheck) {
                locationCode = this.commonService.generateCode('L', locationID);
                codeCheck = await this.locationService.findOne({
                    code: locationCode,
                });
            }
            await this.locationService.update(
                { id: locationID },
                { code: locationCode },
            );
            return res.status(HttpStatus.CREATED).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: 'Location has been added successfully.',
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
     * Use to update location
     * - id and company_id is mandatory params
     */
    @Put('update')
    async update(
        @Req() req: Request,
        @Res() res: Response,
        @Body() postData: UpdateLocationInput,
    ) {
        try {
            if (!postData?.id || !postData?.company_id) {
                throw new Error(
                  await this.translatorService.frontendReadTranslation(
                        req.lang,
                        'ERR_REQUIRED_PARAM_MISSING',
                    ),
                );
            }
            const where = {
                id: postData?.id,
                deleted: 0,
                company_id: postData?.company_id,
            };
            const recordDetails = await this.locationService.findOne(where);
            if (!recordDetails) {
                throw new Error(
                  await this.translatorService.frontendReadTranslation(
                        req.lang,
                        'ERR_RECORD_NOT_FOUND',
                    ),
                );
            }
            if (
                postData?.lname &&
                postData?.address1 &&
                postData?.city &&
                postData?.state &&
                postData?.country &&
                postData?.zip
            ) {
                const locationCheck = await this.locationService.findOne({
                    company_id: postData?.company_id,
                    deleted: 0,
                    lname: postData?.lname,
                    address1: postData?.address1,
                    city: postData?.city,
                    state: postData?.state,
                    country: postData?.country,
                    zip: postData?.zip,
                    id: Not(postData?.id),
                });
                if (locationCheck) {
                    throw Error(
                      await this.translatorService.frontendReadTranslation(
                            req.lang,
                            'ERR_LOCATION_NAME_EXIST',
                        ),
                    );
                }
            }
            if (!postData?.location_name) {
                let locationParts = [];
                locationParts.push(postData?.lname ?? recordDetails.lname);
                locationParts.push(postData?.address1 ?? recordDetails.address1);
                if(postData?.address2 && postData?.address2 != ''){
                    if (postData?.address2) locationParts.push(postData?.address2); 
                    else if(recordDetails?.address2) locationParts.push(recordDetails?.address2);
                }
                locationParts.push(postData?.city ?? recordDetails.city);
                locationParts.push(postData?.state ?? recordDetails.state);
                locationParts.push(postData?.zip ?? recordDetails.zip);
                locationParts.push(postData?.country ?? recordDetails.country);
                postData.location_name = locationParts.join(', ');
            }
            await this.locationService.update(
                { id: postData?.id },
                {
                    ...postData,
                },
            );
            let locationID = recordDetails?.id;
            let dynamicData = Object.create(null);
            if(postData?.location_name){
                let title = `location_name_${locationID}`
                dynamicData[`${title}`]= postData?.location_name;
            } 
            if(postData?.address1){
                let title = `location_address1_${locationID}`
                dynamicData[`${title}`]= postData?.address1;
            }
            if(postData?.address2){
                let title = `location_address2_${locationID}`
                dynamicData[`${title}`]= postData?.address2;
            }
            if(postData?.lname){
                let title = `location_lname_${locationID}`
                dynamicData[`${title}`]= postData?.lname;
            }
            if(postData?.city){
                let title = `location_city_${locationID}`
                dynamicData[`${title}`]= postData?.city;
            }
            if(postData?.state){
                let title = `location_state_${locationID}`
                dynamicData[`${title}`]= postData?.state;
            }
            if(postData?.country){
                let title = `location_country_${locationID}`
                dynamicData[`${title}`]= postData?.country;
            }
            await this.translatorService.DynamicEngJsonData('OrgAdmin',postData?.company_id,dynamicData,'Edit','Location',locationID);
            this.activityLogService.create(recordDetails, postData, tableConstant.COMPANIES.TBL_LOCATION, req.tokenUser?.id);
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: 'Location has been updated successfully.',
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
     * Use to delete a location
     * - id and company_id is mandatory params
     */
    @Post('delete')
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id || !postData?.company_id) {
                throw new Error(
                  await this.translatorService.frontendReadTranslation(
                        req.lang,
                        'ERR_REQUIRED_PARAM_MISSING',
                    ),
                );
            }
            const where = {
                id: postData?.id,
                deleted: 0,
                company_id: postData?.company_id,
            };
            const recordDetails = await this.locationService.findOne(where);
            if (!recordDetails) {
                throw new Error(
                  await this.translatorService.frontendReadTranslation(
                        req.lang,
                        'ERR_RECORD_NOT_FOUND',
                    ),
                );
            }
            if (recordDetails.is_default == 1) {
                throw new Error(
                  await this.translatorService.frontendReadTranslation(
                        req.lang,
                        'default location cannot be deleted',
                    ),
                );
            }
            await this.locationService.update(
                { id: postData?.id },
                {
                    status: 2,
                    deleted: 1,
                },
            );
            await this.translatorService.DynamicEngJsonData('OrgAdmin',postData?.company_id, null,'Delete','Location',recordDetails?.id);
            const defaultLocation = await this.locationService.findOne({company_id: postData?.company_id, is_default: 1});
            if(defaultLocation){
                await this.userService.update({location: postData?.id, org_id: postData?.company_id},{location: defaultLocation.id})
            }
            this.activityLogService.create(recordDetails, { status: 0, deleted: 1 }, tableConstant.COMPANIES.TBL_LOCATION, req.tokenUser?.id, 'delete');
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: 'Location has been deleted successfully.',
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
    * Function to get list of all state list
    */
    @Post('state-list')
    @UseGuards(TokenGuard, RoleGuard, AccessGuard)
    async stateList(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let result: any;
            if (!postData?.country) {
                result = await this.companyService.stateList(null);
            } else {
                result = await this.companyService.stateList(null, postData?.country);
            }
            // add unique identifier 
            await Promise.all(
                result.map((item, index) => {
                    item.id = index + 1;
                })
            );
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: result,
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
    /*
    * Function to get list of all City list
    * - Country and state are mandatory params
    */
    @Post('city-list')
    @UseGuards(TokenGuard, RoleGuard, AccessGuard)
    async cityList(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.country || !postData?.state) {
                throw new Error(
                  await this.translatorService.frontendReadTranslation(
                        req.lang,
                        'ERR_REQUIRED_PARAM_MISSING',
                    ),
                );
            }
            postData = this.commonService.sanitizePayload(postData);
            let result = await this.companyService.cityList(postData?.state, req, postData?.country);
            // add unique identifier 
            await Promise.all(
                result.map((item, index) => {
                    item.id = index + 1;
                })
            );
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: result,
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

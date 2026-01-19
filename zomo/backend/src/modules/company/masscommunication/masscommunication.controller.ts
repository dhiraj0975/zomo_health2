import { appConstant, CommonArrayService, CommonDateService, CommonService, CompanyMasscommunicationsDto, tableConstant } from '@common-constants';
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
import { In } from 'typeorm';
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import {
    CreateCompanyMassCommunicationInput,
    PaginateWithCompanyInput,
} from '../../../input';
import { MassCommunicationService } from './masscommunication.service';
@Controller('masscommnication')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class MassCommnicationController {
    constructor(
        private readonly massCommunicationService: MassCommunicationService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonDateService: CommonDateService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        @Inject('CRON_SERVICE') private cronMicroservice: ClientProxy,
    ) {}
    /*
     * Function to get paginate list of mass-communication
     * - no mandatory params
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
            let user = Object.create(req.tokenUser);
            let companyId = user?.org_id;
            let roleId = user?.role_id;
            let userId = user?.id;
            let where = `masscommunication.status != 2 AND masscommunication.org_id = '${companyId}' AND masscommunication.user_role = '${roleId}' AND masscommunication.user_id = '${userId}'`;
            if (postData?.search_str) {
                where += this.commonService.generateDynamicSearchQuery(postData?.search_str,
                    [
                        'masscommunication.id', 'masscommunication.department', 'masscommunication.location',
                        'masscommunication.state', 'masscommunication.city', 'masscommunication.state'
                    ]
                );
            }
            const resultedData = await this.massCommunicationService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(
                    CompanyMasscommunicationsDto,
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
                  data: [],
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }
    /*
     * Function to get details of the Mass-Communications
     * - id and org_id is mandatory params
     */
    @Post('get-one')
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id || !postData?.org_id) {
                throw new Error(
                  await this.translatorService.frontendReadTranslation(
                        req.lang,
                        'ERR_REQUIRED_PARAM_MISSING',
                    ),
                );
            }
            const where = {
                id: postData?.id,
                org_id: postData?.org_id,
                status: In([0,1]),
            };
            let masscommnicationDetails = await this.massCommunicationService.findOne(where);
            if (!masscommnicationDetails) {
                throw new Error(
                  await this.translatorService.frontendReadTranslation(
                        req.lang,
                        'ERR_RECORD_NOT_FOUND',
                    ),
                );
            }
            masscommnicationDetails = <any>(
                await this.commonArrayService.formatToDto(CompanyMasscommunicationsDto, masscommnicationDetails, req.lang)
            );
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: masscommnicationDetails,
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
     * Function to Delete mass-communication
     * - id mandatory params
     */
    @Post('delete')
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id) {
                throw new Error(
                    await this.translatorService.frontendReadTranslation(
                        req.lang,
                        'ERR_REQUIRED_PARAM_MISSING',
                    ),
                );
            }
            const where = { id: postData?.id };
            const recordDetails = await this.massCommunicationService.findOne(where);
            if (!recordDetails) {
                throw new Error(
                    await this.translatorService.frontendReadTranslation(
                        req.lang,
                        'ERR_RECORD_NOT_FOUND',
                    ),
                );
            } 
            await this.massCommunicationService.update({ id: postData?.id }, { status: 2});
            this.activityLogService.create(recordDetails, { status: 2}, tableConstant.COMPANIES.TBL_C_MASSCOMMUNICATIONS, req.tokenUser?.id, 'delete');
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: 'Mass Communication mail has been deleted successfully.',
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
     * Function to List data of mass-communication
     * - org_id mandatory params
     */
    @Post('list')
    async list(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.user_id && !postData?.org_id) {
                throw new Error(
                    await this.translatorService.frontendReadTranslation(
                        req.lang,
                        'ERR_REQUIRED_PARAM_MISSING',
                    ),
                );
            }
            let where = { status: In([0, 1]) };
            if (postData?.user_id && postData.user_id !== '' && postData.user_id !== undefined) {
                where['user_id'] = postData.user_id;
            }
            if (postData?.org_id && postData.org_id !== '' && postData.org_id !== undefined) {
                where['org_id'] = postData.org_id;
            }
            let resultedData = await this.massCommunicationService.listRecord(where);
            resultedData = <any>(
                await this.commonArrayService.formatToDto(CompanyMasscommunicationsDto, resultedData, req.lang)
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
                    data: null,
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }
    /*
     * Function to create mass-communication
     * - subject , message mandatory params
     * - department, location, state, city optional params
     * - department and location should be object with key as id and value as name
     * - state and city should be string with comma separated values
     */
    @Post('create')
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateCompanyMassCommunicationInput) {
        try {
            if ((!postData?.subject || postData?.subject == undefined || postData?.subject == null) || (!postData?.message || postData?.message == undefined || postData?.message == null)) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            let user = Object.create(req.tokenUser);
            let orgId = user?.org_id;
            let membershipCode = user?.membership_code;
            let userId = user?.id;
            let roleId = user?.role_id;
            let condition = `User.role_id IN (2,16) AND User.status = 1 AND User.membership_code= '${membershipCode}'`;
            let reportCity = 'All', reportDepartment = 'All', reportState = 'All', reportLocation = 'All';
            if (postData?.department && Object.keys(postData.department).length > 0) {
                let departmentObject = postData?.department || {};
                let departmentIds = Object.keys(departmentObject);
                let filteredDepartmentIds = departmentIds.filter(id => id.trim() !== '');
                if (filteredDepartmentIds.length > 0) {
                    const departmentIdString = filteredDepartmentIds.join(',');
                    condition += ` AND User.department_id IN (${departmentIdString})`;
                    const departmentNames = filteredDepartmentIds
                        .map(id => departmentObject[id])
                        .filter(name => name)
                        .join(',');
                    reportDepartment = departmentNames;
                }
            }
            if (postData?.location && Object.keys(postData.location).length > 0) {
                let locationObject = postData?.location || {};
                let locationIds = Object.keys(locationObject);
                let filteredLocationIds = locationIds.filter(id => id.trim() !== '');
                if (filteredLocationIds.length > 0) {
                    const locationIdString = filteredLocationIds.join(',');
                    condition += ` AND User.location IN (${locationIdString})`;
                    const locationNames = filteredLocationIds
                        .map(id => locationObject[id])
                        .filter(name => name)
                        .join(',');
                    reportLocation = locationNames;
                }
            }
            if (postData?.state && postData?.state !== '' && postData?.state !== undefined) {
                let state = postData?.state.split(',');
                let filteredState = state.filter(s => s.trim() !== '');
                if (filteredState.length > 0) {
                    // need to change at send email time becase state is not in user table its in setting table.
                    const escapedStates = filteredState.map(s => s.replace(/'/g, "''"));
                    condition += ` AND User.state IN ('${escapedStates.join("','")}')`;
                    reportState = filteredState.join(',');
                }
            }
            if (postData?.city && postData?.city !== '' && postData?.city !== undefined) {
                let city = postData?.city.split(',');
                let filteredCity = city.filter(c => c.trim() !== '');
                if (filteredCity.length > 0) {
                    // need to change at send email time becase city is not in user table its in setting table.
                    const escapedCities = filteredCity.map(c => c.replace(/'/g, "''"));
                    condition += ` AND User.city IN ('${escapedCities.join("','")}')`;
                    reportCity = filteredCity.join(',');
                }
            }
            let notify_email = user?.email || '';
            if (postData?.email && postData?.email != '' && postData?.email != undefined) {
                notify_email = postData?.email;
            }
            let findMassCommunication = await this.massCommunicationService.findOne({ user_id: userId, org_id: orgId, status: 0 });
            if (findMassCommunication) {
                throw new Error(
                    await this.translatorService.frontendReadTranslation(
                        req.lang,
                        'Your one mail send request is in progress, we will notify you once mail send is available to request.',
                    ),
                );
            }
            if (postData?.message && postData.message !== '') {
                const domains = appConstant.DOMAINS_LIST;
                const pattern = new RegExp(
                    '(' +
                    domains
                        .map(domain => domain.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')) // Escape special characters
                        .join('|') +
                    ')',
                    'gi'
                );
                postData.message = postData.message.replace(pattern, '{{IMAGE_BASE_URL}}');
            }
            let massCommunicationData = {
                org_id: orgId,
                user_id: userId,
                user_role: roleId,
                membership_code: membershipCode,
                condition: condition,
                subject: postData?.subject || '',
                message: postData?.message || '',
                request_date: this.commonDateService.getTodayDate().format('YYYY-MM-DD HH:mm:ss'),
                campaign_id: postData?.campaign_id || 0,
                event_id: postData?.event_id || 0,
                email: notify_email,
                status: 0,
                flage: 0,
                department: reportDepartment,
                location: reportLocation,
                state: reportState,
                city: reportCity,
            };
            await this.massCommunicationService.save(massCommunicationData);
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: 'Your mail send request is in progress, we will notify you once the mail sending complated.'
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
     * Function to update mass-communication
     * - id and org_id mandatory params
     * - subject , message mandatory params
     * - department, location, state, city optional params
     * - department and location should be object with key as id and value as name
     * - state and city should be string with comma separated values
     */
    @Put('update')
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: CreateCompanyMassCommunicationInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            if ((!postData?.id || postData?.id == undefined || postData?.id == null) || (!postData?.org_id || postData?.org_id == undefined || postData?.org_id == null)) {
                throw new Error(
                    await this.translatorService.frontendReadTranslation(
                        req.lang,
                        'ERR_REQUIRED_PARAM_MISSING',
                    ),
                );
            }
            if ((!postData?.subject || postData?.subject == undefined || postData?.subject == null) || (!postData?.message || postData?.message == undefined || postData?.message == null)) {
                throw new Error(
                    await this.translatorService.frontendReadTranslation(
                        req.lang,
                        'ERR_REQUIRED_PARAM_MISSING',
                    ),
                );
            }
            let user = Object.create(req.tokenUser);
            let orgId = user?.org_id;
            let membershipCode = user?.membership_code;
            let userId = user?.id;
            let roleId = user?.role_id;
            let condition = `User.role_id IN (2,16) AND User.status = 1 AND User.membership_code= '${membershipCode}'`;
            let reportCity = 'All', reportDepartment = 'All', reportState = 'All', reportLocation = 'All';
            if (postData?.department && Object.keys(postData.department).length > 0) {
                let departmentObject = postData?.department || {};
                let departmentIds = Object.keys(departmentObject);
                let filteredDepartmentIds = departmentIds.filter(id => id.trim() !== '');
                if (filteredDepartmentIds.length > 0) {
                    const departmentIdString = filteredDepartmentIds.join(',');
                    condition += ` AND User.department_id IN (${departmentIdString})`;
                    const departmentNames = filteredDepartmentIds
                        .map(id => departmentObject[id])
                        .filter(name => name)
                        .join(',');
                    reportDepartment = departmentNames;
                }
            }
            if (postData?.location && Object.keys(postData.location).length > 0) {
                let locationObject = postData?.location || {};
                let locationIds = Object.keys(locationObject);
                let filteredLocationIds = locationIds.filter(id => id.trim() !== '');
                if (filteredLocationIds.length > 0) {
                    const locationIdString = filteredLocationIds.join(',');
                    condition += ` AND User.location IN (${locationIdString})`;
                    const locationNames = filteredLocationIds
                        .map(id => locationObject[id])
                        .filter(name => name)
                        .join(',');
                    reportLocation = locationNames;
                }
            }
            if (postData?.state && postData?.state !== '' && postData?.state !== undefined) {
                let state = postData?.state.split(',');
                let filteredState = state.filter(s => s.trim() !== '');
                if (filteredState.length > 0) {
                    // need to change at send email time becase state is not in user table its in setting table.
                    const escapedStates = filteredState.map(s => s.replace(/'/g, "''"));
                    condition += ` AND User.state IN ('${escapedStates.join("','")}')`;
                    reportState = filteredState.join(',');
                }
            }
            if (postData?.city && postData?.city !== '' && postData?.city !== undefined) {
                let city = postData?.city.split(',');
                let filteredCity = city.filter(c => c.trim() !== '');
                if (filteredCity.length > 0) {
                    // need to change at send email time becase city is not in user table its in setting table.
                    const escapedCities = filteredCity.map(c => c.replace(/'/g, "''"));
                    condition += ` AND User.city IN ('${escapedCities.join("','")}')`;
                    reportCity = filteredCity.join(',');
                }
            }
            let notify_email = user?.email || '';
            if (postData?.email && postData?.email != '' && postData?.email != undefined) {
                notify_email = postData?.email;
            }
            let findMassCommunication = await this.massCommunicationService.findOne({ id: postData?.id, status: 0 });
            if (!findMassCommunication) {
                throw new Error(
                    await this.translatorService.frontendReadTranslation(
                        req.lang,
                        'ERR_RECORD_NOT_FOUND',
                    ),
                );
            }
            if (postData?.message && postData.message !== '') {
                const domains = appConstant.DOMAINS_LIST;
                const pattern = new RegExp(
                    '(' +
                    domains
                        .map(domain => domain.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')) // Escape special characters
                        .join('|') +
                    ')',
                    'gi'
                );
                postData.message = postData.message.replace(pattern, '{{IMAGE_BASE_URL}}');
            }
            let massCommunicationData = {
                org_id: orgId,
                user_id: userId,
                user_role: roleId,
                membership_code: membershipCode,
                condition: condition,
                subject: postData?.subject || '',
                message: postData?.message || '',
                request_date: postData?.request_date || this.commonDateService.getTodayDate().format('YYYY-MM-DD HH:mm:ss'),
                campaign_id: postData?.campaign_id || 0,
                event_id: postData?.event_id || 0,
                email: notify_email,
                status: 0,
                flage: 0,
                department: reportDepartment,
                location: reportLocation,
                state: reportState,
                city: reportCity,
            };
            await this.massCommunicationService.update({id:postData?.id},massCommunicationData);
            this.activityLogService.create(findMassCommunication, massCommunicationData, tableConstant.COMPANIES.TBL_C_MASSCOMMUNICATIONS, req.tokenUser?.id);
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: 'Your mail send request is updated and in progress, we will notify you once the mail sending complated.'
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
     * Function to get default-data of the Mass-Communications
     * - no mandatory params
     */
    @Post('default-data')
    async massCommunicationDefaultData(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            let result = Object.create(null);
            let user = Object.create(req.tokenUser);
            //Reminder need to change this template add from DB.
            let mail_default = `<!DOCTYPE html>
            <html>

            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>

            <body style="font-size: 18px; font-family:Roboto; margin: 0; padding: 0; color: #111827; line-height: 1.6;">
                <div style="margin: 0 auto; width: 740px;">
                    <div style="margin: 24px;">
                        <header>
                            <img src="{{IMAGE_BASE_URL}}/templateImages/zomologo.png" alt="zomologo" style="width: 206px; height: 39px;">
                        </header>
                        <div>
                            <div style="margin-top: 30px; text-align: center;">
                                <img src="{{IMAGE_BASE_URL}}/templateImages/sendEmail.png" alt="Send Mail" style="width: 340px; height: 355px;" />
                            </div>
                            <div style="width: 652px; margin-top: 35px; ">
                                <p style="margin: 0">Hello <span style="font-weight: 500;">[First Name],</span></p>
                                <p style="margin: 36px 0 30px;">Campaign Name : [Campaign Name]</p>
                                <p style="margin: 36px 0 30px;">Event Name: [Event Name]</p>
                                <p style="margin: 30px 0 45px;">By visiting and logging in, you can see your completion status.</p>
                                <a href="{{IMAGE_BASE_URL}}" style="color: #209985; text-decoration: none; margin: 0;">https://app.zomohealth.com</a>
                                <div style="margin-top: 30px;">
                                <p style="margin: 0;">For any questions regarding the wellness program please ask your HR
                                    administrator. For technical support with Zomohealth.com please contact <a href="#"
                                        style="text-decoration: none; color: #209985;"> support@zomohealth.com </a>
                                </p>
                                </div>
                                <div style="margin-top: 50px;">
                                    <p style="margin: 0;">Thank you,</p>
                                    <p style="margin: 8px 0;">Zomo health Team</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style="background-color: #f1f7f8; width:740px; height:221px;">
                        <div style="margin-top:40px; width:660px; height:99px;">
                            <p style="padding:40px 0 0 44px;;"><b>Download our Zomo health app</b></p>
                            <table style="font-size: 16px; margin-top:14px;">
                                <tbody>
                                    <tr>
                                        <td style="padding-left: 40px;"><a href="#" target="_blank"
                                                style="text-decoration: none;"><img src="{{IMAGE_BASE_URL}}/templateImages/googleplay.png"></a></td>
                                        <td style="padding-left: 8px;"><a href="#" target="_blank"
                                                style="text-decoration: none;"><img src="{{IMAGE_BASE_URL}}/templateImages/applestore.png"></a></td>
                                        <td style="padding-left: 88px;"><img src="{{IMAGE_BASE_URL}}/templateImages/aicpasoc.png"></td>
                                        <td style="padding-left: 8px;"><img src="{{IMAGE_BASE_URL}}/templateImages/Hippa.png"></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <div style="margin:75px 0 0 40px; width:474px; height:26px;">
                            <table style="font-size: 15px;">
                                <tbody>
                                    <tr>
                                        <td style="text-align:center;">1-877-506-5885</td>
                                        <td style="width:40px;text-align:center;margin-left: 20px;"><img src="{{IMAGE_BASE_URL}}/templateImages/ellipse.png">
                                        </td>
                                        <td style="width:30px;text-align:center;margin-left: 15px;"><a
                                                href="mailto:support@zomohealth.com" style="text-decoration: none;color: #111827;"
                                                target="_blank">support@zomohealth.com</a></td>
                                        <td style="width:40px;text-align:center;margin-left: 20px;"><img src="{{IMAGE_BASE_URL}}/templateImages/ellipse.png">
                                        </td>
                                        <td style="width:30px;text-align:center;margin-left: 15px;"><a href="#"
                                                style="text-decoration: none; color: #111827;" target="_blank">
                                                Unsubscribe</a></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </body>

            </html>`;
            const userDomain = 'https://' + process.env.DOMAIN;
            result['mail_default'] = mail_default.replace(/{{IMAGE_BASE_URL}}/g, userDomain);
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
     /**
     * API for Mass-Communication mail cron job.
     */
    @Post('massCommunication-mail-request')
    async massCommunicationMailRequest(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            let ResultData = '';
            ResultData = await lastValueFrom(this.cronMicroservice.send({ cmd: 'mass_communication_mail_request' },  { data: postData, table_name: tableConstant.COMPANIES.TBL_C_MASSCOMMUNICATIONS}));
            if (ResultData) {
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: 'Success',
                    message: 'Success',
                });
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: [],
                message: 'Success',
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

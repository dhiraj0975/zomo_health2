import { appConstant, CommonArrayService, CommonDateService, CommonFileService, CommonService, tableConstant, WellnessAssignmentDto } from '@common-constants';
import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Inject,
    Post, Put,
    Req,
    Res,
    UploadedFiles,
    UseGuards,
    UseInterceptors,
} from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { FileFieldsInterceptor } from "@nestjs/platform-express";
import { Request, Response } from "express";
import { diskStorage } from "multer";
import { lastValueFrom } from "rxjs";
import { ActivityLogService } from "src/modules/master/activitylog/activitylog.service";
import { fileName, imgFilter } from "src/utils/image-upload.utils";
import { AccessGuard, RoleGuard, TokenGuard } from "../../../guard";
import { CreateCompanyWellnessAssignmentInput, PaginateWithCompanyWellnessAssignmentInput } from "../../../input";
import { TranslationService } from "../../translation/translation.service";
import { WellnessAssignmentService } from "./wellnessAssignment.service";
const path = require('path');

@Controller('company/wellness-assignment')
@UseGuards(TokenGuard, RoleGuard)
export class WellnessAssignmentController {
    constructor(
        private readonly wellnessAssignmentService: WellnessAssignmentService,
        @Inject('COMMON_SERVICE') private commonMicroservice: ClientProxy,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonDateService: CommonDateService,
        private readonly commonFileService: CommonFileService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
    ) {
    }
    @UseGuards(AccessGuard)
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithCompanyWellnessAssignmentInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let where = 'wellnessAssignment.status != 0 ';
            if (postData?.type && postData?.type === 'champion') {
                where = `wellnessAssignment.status != 2 AND user.status = 1`
                if (postData?.org_id) {
                    where += ` AND wellnessAssignment.org_id = '${postData?.org_id}' `;
                }
                if (postData?.user_id) {
                    where += ` AND wellnessAssignment.user_id = '${postData?.user_id}' `;
                }
                if (postData?.filter_by?.toLowerCase() == 'user_name') {
                    where += this.commonService.generateDynamicSearchQuery(postData?.search_str, ['user.first_name','user.last_name','full_name']);
                }
                if (postData?.filter_by?.toLowerCase() == 'location') {
                    where += this.commonService.generateDynamicSearchQuery(postData?.search_str, ['Location.location_name']);
                }
                if (postData?.filter_by?.toLowerCase() == 'department') {
                    where += this.commonService.generateDynamicSearchQuery(postData?.search_str, ['Department.dept_name']);
                }
                if (postData?.filter_by?.toLowerCase() == 'state') {
                    where += this.commonService.generateDynamicSearchQuery(postData?.search_str, ['wellnessAssignment.state']);
                }
                if (postData?.filter_by?.toLowerCase() == 'city') {
                    where += this.commonService.generateDynamicSearchQuery(postData?.search_str, ['wellnessAssignment.city']);
                }
                let resultedData = await this.wellnessAssignmentService.paginateListAssignChampion(
                    where,
                    postData,
                );
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: resultedData,
                    message: 'success',
                });
            }
            if (postData?.org_id) {
                where += ` AND wellnessAssignment.org_id = '${postData?.org_id}' `;
            }
            if (postData?.user_id) {
                where += ` AND wellnessAssignment.user_id = '${postData?.user_id}' `;
            }
            if (postData?.location) {
                where += ` AND wellnessAssignment.location = '${postData?.location}' `;
            }
            if (postData?.department) {
                where += ` AND wellnessAssignment.department = '${postData?.department}' `;
            }
            if (postData?.search_str) {
                // where += `AND(wellnessAssignment.state LIKE '%${postData?.search_str}%' OR wellnessAssignment.city LIKE '%${postData?.search_str}%' OR wellnessAssignment.big_img LIKE '%${postData?.search_str}%' OR wellnessAssignment.square_img1 LIKE '%${postData?.search_str}%' OR wellnessAssignment.square_img2 LIKE '%${postData?.search_str}%' OR wellnessAssignment.mob_big_img LIKE '%${postData?.search_str}%')`;
                where += this.commonService.generateDynamicSearchQuery(postData?.search_str ?? '', ['wellnessAssignment.state','wellnessAssignment.city','wellnessAssignment.big_img','wellnessAssignment.square_img1','wellnessAssignment.square_img2','wellnessAssignment.mob_big_img']);
            }
            const resultedData = await this.wellnessAssignmentService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(WellnessAssignmentDto, resultedData['list'], req.lang)
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
    @UseGuards(AccessGuard)
    @Post('wellness-location-paginate')
    async wellnessLocationPaginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithCompanyWellnessAssignmentInput) {
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
            let where = `wellnessAssignment.status = 1 AND wellnessAssignment.user_id = '${postData?.user_id}' `;
            // if (appConstant.ROLE.WCH == req.tokenUser?.role_id) {
            if ([appConstant.ROLE.ORGADMIN,appConstant.ROLE.WCH].includes(req.tokenUser?.role_id)) {
                if (postData?.type == 'state') {
                    if (postData?.search_str) {
                        where += this.commonService.generateDynamicSearchQuery(postData?.search_str ?? '', ['wellnessAssignment.id','wellnessAssignment.state']);
                    }
                    where += ` AND wellnessAssignment.state != '' `;
                } else if (postData?.type == 'city') {
                    if (postData?.search_str) {
                        where += this.commonService.generateDynamicSearchQuery(postData?.search_str ?? '', ['wellnessAssignment.id','wellnessAssignment.city']);
                    }
                    where += ` AND wellnessAssignment.city != '' `;
                } else {
                    if (postData?.search_str) {
                        where += this.commonService.generateDynamicSearchQuery(postData?.search_str ?? '', ['wellnessAssignment.location','Location.location_name']);
                    }
                    where += ` AND wellnessAssignment.location != 0`;
                }
            }
            const resultedData = await this.wellnessAssignmentService.paginateListWithLocation(
                where,
                postData,
                postData?.type ? postData?.type : ''
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(WellnessAssignmentDto, resultedData['list'], req.lang)
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
    @UseGuards(AccessGuard)
    @Post('wellness-department-paginate')
    async wellnessDepartmentPaginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithCompanyWellnessAssignmentInput) {
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
            let where = `wellnessAssignment.status = 1 AND wellnessAssignment.user_id = '${postData?.user_id}' `;
            if ([appConstant.ROLE.ORGADMIN,appConstant.ROLE.WCH].includes(req.tokenUser?.role_id)) {
                if (postData?.search_str) {
                    where += this.commonService.generateDynamicSearchQuery(postData?.search_str ?? '', ['wellnessAssignment.department','Department.dept_name']);
                }
                where += ` AND wellnessAssignment.department != 0`;
            }
            const resultedData = await this.wellnessAssignmentService.paginateListWithDepartment(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(WellnessAssignmentDto, resultedData['list'], req.lang)
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
    @UseGuards(AccessGuard)
    @Post('wellness-organization-paginate')
    async wellnessOrganizationPaginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithCompanyWellnessAssignmentInput) {
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
            let where = `wellnessAssignment.status = 1 AND wellnessAssignment.user_id = '${postData?.user_id}' `;
            if ([appConstant.ROLE.ORGADMIN,appConstant.ROLE.WCH].includes(req.tokenUser?.role_id)) {
                if (postData?.search_str) {
                        where += this.commonService.generateDynamicSearchQuery(postData?.search_str ?? '', ['company.id','company.company_name']);
                    }
                where += ` AND wellnessAssignment.is_global = 1`;
            }
            const resultedData = await this.wellnessAssignmentService.paginateListWithOrganization(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(WellnessAssignmentDto, resultedData['list'], req.lang)
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
    @UseGuards(AccessGuard)
    @Post('get-one')
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (postData?.type && postData?.type == 'champion') {
                if (postData?.user_id && postData?.user_id != 'undefined') {
                    postData['user_id'] = postData?.user_id;
                }
                let where = ` wellnessAssignment.status Not IN (2)`;
                if (postData?.user_id) {
                    where += ` AND wellnessAssignment.user_id = '${postData?.user_id}' `;
                }
                if (postData?.id) {
                    where += ` AND wellnessAssignment.id = '${postData?.id}' `;
                }
                if (postData?.org_id) {
                    where += ` AND wellnessAssignment.org_id = '${postData?.org_id}' `;
                }
                let biometricDetails = await this.wellnessAssignmentService.listRecord(where);
                if (!biometricDetails) {
                    let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                    return res.status(HttpStatus.OK).json({
                        statusCode: 200,
                        success: 1,
                        error: 0,
                        data: null,
                        message: errorMessage,
                    });
                }
                biometricDetails = <any>(
                    await this.commonArrayService.formatToDto(WellnessAssignmentDto, biometricDetails, req.lang)
                );
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: biometricDetails,
                    message: 'success',
                });
            }
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let where = `wellnessAssignment.id = ${postData.id}`;
            if (postData?.org_id) {
                where += `wellnessAssignment.org_id = ${postData.org_id}`
            }
            let biometricDetails = await this.wellnessAssignmentService.findOneWithComapny(where);
            if (!biometricDetails) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }
            biometricDetails = <any>(
                await this.commonArrayService.formatToDto(WellnessAssignmentDto, biometricDetails, req.lang)
            );
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: biometricDetails,
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
    @UseGuards(AccessGuard)
    @Post('create')
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateCompanyWellnessAssignmentInput) {
        try {
            postData['department'] = postData?.department ?? 0;
            postData['is_global'] = postData?.is_global ?? 0;
            if (
                !postData?.org_id ||
                !postData?.user_id ||
                (postData?.is_global == undefined || postData?.is_global == null) ||
                (postData?.department == undefined || postData?.department == null) ||
                !postData?.location
            ) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            for (let user of postData?.user_id.split(',')) {
                const recordDetails = await this.wellnessAssignmentService.findOne({ org_id: postData?.org_id, user_id: user });
                if (!recordDetails) {
                    delete postData?.user_id;
                    postData.user_id = user;
                    await this.wellnessAssignmentService.save(postData);
                }
            }
            await this.wellnessAssignmentService.save(postData);
            return res.status(HttpStatus.CREATED).json({
                statusCode: 201,
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
    @UseGuards(AccessGuard)
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
            const recordDetails = await this.wellnessAssignmentService.findOne(where);
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
            await this.wellnessAssignmentService.update(where, { status: 2 });
            this.activityLogService.create(recordDetails, { status: 2 }, tableConstant.COMPANIES.TBL_COMPANY_WELLNESS_ASSIGNMENTS, req.tokenUser?.id, 'delete');
            let message = ''
            if (postData?.type == 'location') {
                message = 'Location access for this champion was deleted successfully.'
            }
            else if (postData?.type == 'department') {
                message = 'Department access for this champion was deleted successfully.'
            }
            else if (postData?.type == 'state') {
                message = 'State access for this champion was deleted successfully.'
            }
            else if (postData?.type == 'city') {
                message = 'City access for this champion was deleted successfully.'
            } 
            else if (postData?.type == 'all') {
                message = 'All access for this champion was deleted successfully.'
            } 
            else {
                message = 'Access was deleted successfully.'
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: message || 'Access was deleted successfully.',
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
    @Put('update')
    @UseInterceptors(
        FileFieldsInterceptor(
            [
                { name: 'company_logo', maxCount: 1 },
                { name: 'company_logo_dark', maxCount: 1 },
            ],
            {
                limits: { fileSize: appConstant.FILE_SIZE },
                storage: diskStorage({
                    destination: `${appConstant.COMPANY_CHAMPION_LOGO_PATH}`,
                    filename: fileName,
                }),
                fileFilter: imgFilter,
            },
        ),
        AccessGuard
    )
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: CreateCompanyWellnessAssignmentInput, @UploadedFiles() files: Record<string, any>) {
        try {
            if (
                !postData?.id && !postData?.org_id
            ) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            if( postData?.type && postData?.type == 'reset'){
                if (!postData?.id ) {
                    if (files && files.company_logo && files.company_logo[0].fieldname === 'company_logo' && files.company_logo[0].filename) {
                        await this.commonFileService.removeFileFromLocal(files.company_logo[0].path);
                    }
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
                let whereReset = { id: postData?.id};
                const recordDetails = await this.wellnessAssignmentService.findOne(whereReset);
                if (!recordDetails) {
                    if (files && files.company_logo && files.company_logo[0].fieldname === 'company_logo' && files.company_logo[0].filename) {
                        await this.commonFileService.removeFileFromLocal(files.company_logo[0].path);
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
                let updateData = { 
                    compony_logo: null,
                    status: 1,
                }
                await this.wellnessAssignmentService.update({ id: recordDetails.id }, updateData);
                this.activityLogService.create(recordDetails, postData, tableConstant.COMPANIES.TBL_COMPANY_WELLNESS_ASSIGNMENTS, req.tokenUser?.id);

                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: "The Organization's logo has been reseted successfully.",
                });
            }
            if (appConstant.ROLE.WCH == req.tokenUser?.role_id ) {
                if (!postData?.id || !postData?.org_id) {
                    if (files && files.company_logo && files.company_logo[0].fieldname === 'company_logo' && files.company_logo[0].filename) {
                        await this.commonFileService.removeFileFromLocal(files.company_logo[0].path);
                    }
                    if (files && files.company_logo_dark && files.company_logo_dark[0].fieldname === 'company_logo_dark' && files.company_logo_dark[0].filename) {
                        await this.commonFileService.removeFileFromLocal(files.company_logo_dark[0].path);
                    }
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
                let whereWellness = { id: postData?.id, org_id: postData?.org_id };
                const recordDetails = await this.wellnessAssignmentService.findOne(whereWellness);
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
                let timestamp = this.commonDateService.getTodayDate().unix();
                if (files && files.company_logo && files.company_logo[0].fieldname === 'company_logo' && files.company_logo[0].filename) {
                    
                    if (recordDetails?.company_logo && recordDetails?.company_logo != '' && recordDetails?.company_logo != null) {
                        await lastValueFrom(this.commonMicroservice.send({ cmd: 'delete_file' }, { prefix: `companylogos/${postData?.org_id}/orginallogo/` + recordDetails?.company_logo }));
                        await lastValueFrom(this.commonMicroservice.send({ cmd: 'delete_file' }, { prefix: recordDetails?.company_logo?.replace('/champimg_', '/orginallogo/champimg_') }));
                    }

                    let copyFile = JSON.parse(JSON.stringify(files.company_logo[0]));
                    files.company_logo[0].originalname = this.commonFileService.formatFileName(files.company_logo[0].originalname);
                    files.company_logo[0].filename = `companylogos/${postData?.org_id}/orginallogo/champimg_` + this.commonService.generateMD5(postData?.id.toString()) + '.' + files.company_logo[0].originalname.split('.')[files.company_logo[0].originalname.split('.').length - 1];
                    this.commonFileService.copyFile(path.resolve(files.company_logo[0].path), path.resolve(`${files.company_logo[0].path.split('.')[0]}_copy.${files.company_logo[0].path.split('.')[1]}`));
                    copyFile['filename'] = `${copyFile['filename'].split('.')[0]}_copy.${copyFile['filename'].split('.')[1]}`;
                    copyFile['path'] = `${files.company_logo[0].path.split('.')[0]}_copy.${files.company_logo[0].path.split('.')[1]}`;

                    await lastValueFrom(this.commonMicroservice.send({ cmd: 'upload_file' }, { path: path.resolve(files.company_logo[0].path), filename: files.company_logo[0].filename }));

                    copyFile.originalname = this.commonFileService.formatFileName(copyFile.originalname);
                    copyFile.filename = `companylogos/${postData?.org_id}/champimg_` + this.commonService.generateMD5(postData?.id.toString()) + '.' + copyFile.originalname.split('.')[copyFile.originalname.split('.').length - 1];

                    await lastValueFrom(this.commonMicroservice.send({ cmd: 'upload_file' }, { path: path.resolve(copyFile.path), filename: copyFile.filename }));

                    postData['company_logo'] = copyFile.filename.split('/')[copyFile.filename.split('/').length - 1];
                }
                if (files && files.company_logo_dark && files.company_logo_dark[0].fieldname === 'company_logo_dark' && files.company_logo_dark[0].filename) {
                    await lastValueFrom(this.commonMicroservice.send({ cmd: 'delete_file' }, { prefix: recordDetails.company_logo_dark }));
                    files.company_logo_dark[0].originalname = this.commonFileService.formatFileName(files.company_logo_dark[0].originalname);
                    files.company_logo_dark[0].filename = `companylogos/${postData?.org_id}/champimgdark_` + this.commonService.generateMD5(postData?.id.toString()) + timestamp.toString() + '.' + files.company_logo_dark[0].originalname.split('.')[files.company_logo_dark[0].originalname.split('.').length - 1];
                    await lastValueFrom(this.commonMicroservice.send({ cmd: 'upload_file' }, { path: path.resolve(files.company_logo_dark[0].path), filename: files.company_logo_dark[0].filename }));
                    postData['company_logo_dark'] = files.company_logo_dark[0].filename.split('/')[files.company_logo_dark[0].filename.split('/').length - 1];
                }
                await this.wellnessAssignmentService.update({ id: recordDetails.id }, { ...postData, status: 1 });
                this.activityLogService.create(recordDetails, postData, tableConstant.COMPANIES.TBL_COMPANY_WELLNESS_ASSIGNMENTS, req.tokenUser?.id);

                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: "The Organization's logo has been updated successfully.",
                });

            }

            const where = postData?.id ? postData?.org_id ? { id: postData?.id, org_id: postData?.org_id } : { id: postData?.id } : { org_id: postData?.org_id };
            if (postData?.user_id) {
                for (let user of postData?.user_id.split(',')) {
                    delete postData?.user_id;
                    postData.user_id = user;
                    const recordDetails = await this.wellnessAssignmentService.findOne({ ...where, user_id: user });
                    if (!recordDetails) {
                        postData['department'] = postData?.department ?? 0;
                        postData['is_global'] = postData?.is_global ?? 0;
                        await this.wellnessAssignmentService.save({
                            ...postData,
                        });
                    }
                    else {
                        await this.wellnessAssignmentService.update({ id: recordDetails.id }, { ...postData, status: 1 });
                        this.activityLogService.create(recordDetails, postData, tableConstant.COMPANIES.TBL_COMPANY_WELLNESS_ASSIGNMENTS, req.tokenUser?.id);
                    }
                }
            }
            else {
                const recordDetails = await this.wellnessAssignmentService.findOne(where);
                if (!recordDetails) {
                    await this.wellnessAssignmentService.save({
                        ...postData,
                    });
                }
                await this.wellnessAssignmentService.update(where, { ...postData, status: 1 });
                this.activityLogService.create(recordDetails, postData, tableConstant.COMPANIES.TBL_COMPANY_WELLNESS_ASSIGNMENTS, req.tokenUser?.id);
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
    @UseGuards(AccessGuard)
    @Post('list')
    async list(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let where = `wellnessAssignment.status != 2 `;
            if (postData?.org_id) {
                where += ` AND wellnessAssignment.org_id = '${postData?.org_id}' `;
            }

            if (postData?.type && postData?.type === 'champion') {
                let result = [];
                if (postData?.user_id) {
                    where += ` AND wellnessAssignment.user_id = '${postData?.user_id}' `;
                }
                if (postData?.filter_by?.toLowerCase() == 'user_name') {
                    where += this.commonService.generateDynamicSearchQuery(postData?.search_str ?? '', ['user.first_name','user.last_name','full_name']);
                }
                if (postData?.filter_by?.toLowerCase() == 'location') {
                    where += this.commonService.generateDynamicSearchQuery(postData?.search_str ?? '', ['Location.location_name']);
                }
                if (postData?.filter_by?.toLowerCase() == 'department') {
                    where += this.commonService.generateDynamicSearchQuery(postData?.search_str ?? '', ['Department.dept_name']);
                }
                if (postData?.filter_by?.toLowerCase() == 'state') {
                    where += this.commonService.generateDynamicSearchQuery(postData?.search_str ?? '', ['wellnessAssignment.state']);
                }
                if (postData?.filter_by?.toLowerCase() == 'city') {
                    where += this.commonService.generateDynamicSearchQuery(postData?.search_str ?? '', ['wellnessAssignment.city']);
                }
                let resultedData = await this.wellnessAssignmentService.listRecord(where);
                if (resultedData?.length > 0) {
                    const userMap = new Map();
                    for (let entry of resultedData) {
                        const userId = entry.user_id;
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
            } else {
                let resultedData = await this.wellnessAssignmentService.listRecord(where);
                resultedData = <any>(
                    await this.commonArrayService.formatToDto(WellnessAssignmentDto, resultedData, req.lang)
                );
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: resultedData,
                    message: 'success',
                });
            }

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
    @UseGuards(AccessGuard)
    @Post('assign')
    async assign(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (
                !this.commonService.isValidNumber(postData?.assign_to) || !postData?.org_id || !postData?.user_id
            ) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let data = {
                org_id: postData?.org_id,
                user_id: postData?.user_id,
                modified_date: this.commonDateService.getTodayDate().format('YYYY-MM-DD HH:mm:ss'),
            }
            data['img_option'] = null;
            data['img_area'] = 1;
            data['slider_limit'] = 30;
            if (postData?.assign_to == 0) {
                let global_check = await this.wellnessAssignmentService.findOne({ org_id: postData?.org_id, user_id: postData?.user_id, is_global: 0, status: 1 });
                if (global_check) {
                    await this.wellnessAssignmentService.update({ user_id: global_check?.user_id , org_id : global_check?.org_id }, { status: 2 });
                    this.activityLogService.create(global_check, { status: 2 }, tableConstant.COMPANIES.TBL_COMPANY_WELLNESS_ASSIGNMENTS, req.tokenUser?.id);
                }
                data['is_global'] = 1;
                data['location'] = '';
                data['department'] = '';
                data['state'] = '';
                data['city'] = '';


                let Wellnessassignment_check = await this.wellnessAssignmentService.findOne({ org_id: postData?.org_id, user_id: postData?.user_id, is_global: 1, status: 1 });
                if (!Wellnessassignment_check) {
                    await this.wellnessAssignmentService.save({
                        ...data,
                        status: 1
                    });
                } else {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_ALREADY_EXISTS"));
                }
            } else if (postData?.assign_to == 1 || postData?.assign_to == 2 || postData?.assign_to == 3 || postData?.assign_to == 4) {
                let global_check = await this.wellnessAssignmentService.findOne({ org_id: postData?.org_id, user_id: postData?.user_id, is_global: 1, status: 1 });
                if (!global_check) {
                    if (postData?.assign_to == 1) {
                        if (postData?.location) {
                            for (let location of postData?.location.split(',')) {
                                let location_check = await this.wellnessAssignmentService.findOne({ org_id: postData?.org_id, user_id: postData?.user_id, location: location, status: 1 });
                                if (!location_check) {
                                    await this.wellnessAssignmentService.save({
                                        ...data,
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
                                let department_check = await this.wellnessAssignmentService.findOne({ org_id: postData?.org_id, user_id: postData?.user_id, department: department, status: 1 });
                                if (!department_check) {
                                    await this.wellnessAssignmentService.save({
                                        ...data,
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
                                let state_check = await this.wellnessAssignmentService.findOne({ org_id: postData?.org_id, user_id: postData?.user_id, state: state, status: 1 });
                                if (!state_check) {
                                    await this.wellnessAssignmentService.save({
                                        ...data,
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
                                let city_check = await this.wellnessAssignmentService.findOne({ org_id: postData?.org_id, user_id: postData?.user_id, city: city, status: 1 });
                                if (!city_check) {
                                    await this.wellnessAssignmentService.save({
                                        ...data,
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
                message: 'Wellnessassignment assign succesfully',
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
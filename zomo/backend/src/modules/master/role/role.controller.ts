import { appConstant, CommonService, tableConstant } from "@common-constants";
import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Post,
    Put, Req,
    Res,
    UseGuards
} from "@nestjs/common";
import { Request, Response } from "express";
import { TranslationService } from "src/modules/translation/translation.service";
import { Like, Not } from "typeorm";
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import { CreateRoleInput, PaginateRoleInput, UpdateRoleInput } from "../../../input";
import { RolePermissionService } from "../../permission/role-permission/role-permission.service";
import { ActivityLogService } from "../activitylog/activitylog.service";
import { RoleService } from './role.service';
@Controller('role')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class RoleController {
    constructor(private readonly rolesService: RoleService,
                private readonly rolePermissionService: RolePermissionService,
                private readonly translatorService: TranslationService,
                private readonly activityLogService: ActivityLogService,
                private readonly commonService: CommonService,
    ) {}
    /*
     * Function to get paginate list of roles
     * - can pass page, limit, order_by, order
     */
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateRoleInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let where = (req.tokenUser?.role_id == appConstant.ROLE.ADMIN || appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER == req.tokenUser?.role_id) ? `role.status != 2 ` : `role.status = 1 `;
            if (postData?.search_str) {
                where +=  this.commonService.generateDynamicSearchQuery(postData?.search_str,['role.title','role.alias','role.role_desc']);
            }
            const result = await this.rolesService.paginateList(
                where,
                postData,
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
     * Function to get details of role
     * - id is mandatory params
     */
    @Post('get-one')
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const roleDetails = await this.rolesService.findOne({
                id: postData?.id,
            });
            if (!roleDetails) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: roleDetails,
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
     * Function to get list of roles
     * - can pass search_str, order_by, order
     */
    @Post('list')
    async list(@Req() req: Request, @Res() res: Response, @Body() postData: any){
        try {
            postData = this.commonService.sanitizePayload(postData);
            let where = {status : 1};
            if (postData?.search_str) {
                where['title'] = Like('%' + postData?.search_str + '%') ;
            }
            const order = postData && postData?.order ? postData?.order : 'ASC';
            const orderBy = postData && postData?.order_by ? postData?.order_by : 'id';
            const result = await this.rolesService.listRecord(where, { [orderBy]: order });
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
     * Use to create new role
     * - title & alias is mandatory params
     */
    @Post('create')
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateRoleInput) {
        try {
            if (!postData?.alias || !postData?.title) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const roleDetails = await this.rolesService.findOne([{ title: postData?.title }, { alias: postData?.alias }]);
            if (roleDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_DUPLICATE_ENTRY"));
            }
            const roleData = await this.rolesService.save(postData);
            if(postData?.permissions && postData?.permissions.length){
                await Promise.all(
                    postData?.permissions.map(async(permission: any)=>{
                    let input_data = {
                        role_id: roleData.id,
                        method_id: permission,
                        permission: 1 ,
                        status: 1,
                    };
                    await this.rolePermissionService.update(
                        { role_id: roleData.id, method_id: permission },
                        input_data,
                    );
                })
            );
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
    /*
     * Use to update role
     * - id & title are mandatory params
     */
    @Put('update')
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: UpdateRoleInput) {
        try {
            if (!postData?.id || !postData?.title) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const roleDetails = await this.rolesService.findOne({
                id: postData?.id,
            });
            if (!roleDetails) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }
            const roleDuplicate = await this.rolesService.findOne({ title: postData?.title, id: Not(postData?.id) });
            if (roleDuplicate) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_DUPLICATE_ENTRY"));
            }
            await this.rolesService.update(
                { id: postData?.id },
                {
                    ...postData,
                },
            );
            this.activityLogService.create(roleDetails, postData, tableConstant.MASTER.TBL_ROLES, req.tokenUser?.id);
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
}

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
    UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Request, Response } from "express";
import { lastValueFrom } from 'rxjs';
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import { RoleService } from 'src/modules/master/role/role.service';
import { TranslationService } from 'src/modules/translation/translation.service';
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import { PermissionMethodService } from '../permission-method/permission-method.service';
import { RolePermissionService } from './role-permission.service';
const filePath = appConstant.PERMISSIONS_DIR;
@Controller('role-permission')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class RolePermissionController {
    constructor(
        private readonly rolePermissionService: RolePermissionService,
        private readonly permissionMethodService: PermissionMethodService,
        private readonly roleService: RoleService,
        private readonly translatorService: TranslationService,
        private readonly commonService: CommonService,
        private readonly commonFileService: CommonFileService,
        private readonly activityLogService: ActivityLogService,
        @Inject('COMMON_SERVICE')
            private commonMicroservice: ClientProxy,
    ) {}
    /*
     * Use to get all available modules
     * - no param
     */
    @Post('get-modules')
    async findAllModules(@Req() req: Request, @Res() res: Response,) {
        try {
            const permissionModules = await this.permissionMethodService.findModules(
            'permissionMethod.status=1', 'module',
            );
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: permissionModules,
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
     * Use to get all available controllers by module
     * - module mandatory param
     */
    @Post('get-controllers')
    async findControllers(@Req() req: Request, @Res() res: Response, @Body() data: any) {
        try {
            if (!data.module) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const permissionModules = await this.permissionMethodService.findModules(
              'permissionMethod.status=1 AND permissionMethod.module="' + data.module + '"',
              'controller',
            );
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: permissionModules,
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
     * Use to get all available actions by controller
     * - controller mandatory param
     */
    @Post('get-actions')
    async findActions(@Req() req: Request, @Res() res: Response, @Body() data: any) {
        try {
            if (!data.controller) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const permissionModules = await this.permissionMethodService.findActions(
              'permissionMethod.status=1 AND permissionMethod.controller="' + data.controller + '"',
            );
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: permissionModules,
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
     * Use to update permission status of method for specific role
     * - role_id & method_id are mandatory params
     */
    @Post('save')
    async savePermission(@Req() req: Request, @Res() res: Response, @Body() data: any) {
        try {
            if (!data.role_id || !data.method_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            if(data.role_id == appConstant.ROLE.ADMIN || appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER == data.role_id) {
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: 'success',
                });
            }
            const roleDetails = await this.roleService.findOne({
                id: data.role_id,
            });
            if (!roleDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_INVALID_VALUE_PARAM"));
            }
            const methodDetails = await this.permissionMethodService.findOne({
                id: data.method_id,
            });
            if (!methodDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_INVALID_VALUE_PARAM"));
            }
            let input_data = {
                role_id: data.role_id,
                method_id: data.method_id,
                permission: data.permission == 1 ? 1 : 0,
                status: 1,
            };
            const rolepermisssion = await this.rolePermissionService.findOne({ role_id: data.role_id, method_id: data.method_id });
            await this.rolePermissionService.update(
              { role_id: data.role_id, method_id: data.method_id },
              input_data,
            );
            let roleData = await this.commonFileService.decryptFromFile(filePath);
            if(roleData && roleData[data.role_id]){
                if(input_data.permission == 0){
                    roleData[data.role_id] = roleData[data.role_id].filter(v => v !== methodDetails.path);
                }
                else if (!roleData[data.role_id].includes(methodDetails.path)) {
                    roleData[data.role_id].push(methodDetails.path);
                }
                await this.commonService.encryptAndSave(roleData,filePath);
                await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: Buffer.from(JSON.stringify(roleData)).toString('base64'),  filename: filePath.replace('./src/','').replace('encrypted','json'), userBucket: 'private'}));
            }
            if(Object.keys(roleData)?.length == 0 || roleData && !roleData[data.role_id]){
                let permissionData = Object.keys(roleData)?.length == 0 ? {} : roleData ?? {};
                permissionData[data.role_id] = [methodDetails.path];
                await this.commonService.encryptAndSave(permissionData,filePath);
                await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: Buffer.from(JSON.stringify(permissionData)).toString('base64'),  filename: filePath.replace('./src/','').replace('encrypted','json'), userBucket: 'private'}));
            }
            this.activityLogService.create(rolepermisssion, input_data, tableConstant.PERMISSION.TBL_ROLE, req.tokenUser?.id);
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
    @Post('get-role-modules')
    async findAllRoleModules(@Req() req: Request, @Res() res: Response, @Body() data: any) {
        try {
            if (data?.role_id == undefined || data?.role_id == null) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let where = {role_id: data.role_id};
            const permissionModules = await this.permissionMethodService.findRoleModules(where,{module: 'ASC'});
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: permissionModules,
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
    @Post('update-role-modules')
    async updateRoleModules(@Req() req: Request, @Res() res: Response, @Body() data: any) {
        try {
            const rolepermisssion = await this.rolePermissionService.listRecord({},null);
            let result = Object.create(null);
            for (const row of rolepermisssion) {
                const key = String(row.role_id);
                if (!result[key]) {
                  result[key] = [];
                }
                if(row['method'] && row['method'].path){
                    if (!result[key].includes(row['method'].path)) {
                        result[key].push(row['method'].path);
                    }
                }
            }
            if(Object.keys(result).length) {
                await this.commonService.encryptAndSave(result,filePath);
                await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: Buffer.from(JSON.stringify(result)).toString('base64'),  filename: filePath.replace('./src/','').replace('encrypted','json'), userBucket: 'private'}));
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
}

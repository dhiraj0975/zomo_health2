import { appConstant, CommonFileService } from '@common-constants';
import { Body, Controller, Get, HttpException, HttpStatus, Req, RequestMethod, Res, UseGuards } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { ModuleRef, ModulesContainer, Reflector } from '@nestjs/core';
import { Request, Response } from "express";
import { AccessGuard, RoleGuard, TokenGuard } from 'src/guard';
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import { TranslationService } from 'src/modules/translation/translation.service';
import { PermissionMethodService } from './permission-method.service';

@UseGuards(TokenGuard, RoleGuard, AccessGuard)
@Controller('permission-method')
export class PermissionMethodController {
    constructor(
      private readonly moduleRef: ModuleRef,
      private readonly modulesContainer: ModulesContainer,
      private readonly reflector: Reflector,
      private readonly commonFileService: CommonFileService,
      private readonly permissionMethodService: PermissionMethodService, 
      private readonly activityLogService: ActivityLogService,
      private readonly translatorService: TranslationService,
    ) {}

    @Get('sync-methods')
    async syncMethods(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
      try{
        if (req.tokenUser?.role_id !== appConstant.ROLE.ADMIN) {
          throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_FORBIDDEN_ACCESS"));
        }
        const slugArr: string[] = [];
        let addedCount = 0;
        let deletedCount = 0;
        for (const [key, module] of this.modulesContainer.entries()) {
          const { controllers, name: moduleName } = module;
          for (const [controllerName, controller] of controllers) {
            const controllerClass = controller.metatype;
            const controllerPath = this.reflector.get<string>(PATH_METADATA, controllerClass);
            const instance = this.moduleRef.get(controllerClass, { strict: false });
            const prototype = Object.getPrototypeOf(instance);
            const methodNames = Object.getOwnPropertyNames(prototype).filter(
              method => method !== 'constructor' && typeof prototype[method] === 'function'
            );

            for (const methodName of methodNames) {
              const methodFn = prototype[methodName];
              const requestMethod: RequestMethod = this.reflector.get<RequestMethod>(METHOD_METADATA, methodFn);
              const routePath = this.reflector.get<string>(PATH_METADATA, methodFn);

              if (requestMethod !== undefined && routePath !== undefined) { 
                const fullPath = await this.commonFileService.joinPath(controllerPath, routePath);
                const routeMethodString = RequestMethod[requestMethod].toLowerCase(); 
                const slug = `${routeMethodString}-${controllerPath}.${routePath}`;
                const data = {
                  module: moduleName, 
                  controller: controllerClass.name,
                  action: routePath,
                  method: routeMethodString.toUpperCase(), 
                  path: fullPath,
                  slug: slug,
                  status: 1,
                };
                
                let result = await this.permissionMethodService.update(data);
                if(result & result?.new){
                  addedCount++;
                }
                slugArr.push(slug);
              }
            }
          }
        }

        let deletedResult = await this.permissionMethodService.delete(slugArr);
        if(deletedResult){
          deletedCount = deletedResult?.affected ?? 0;
        }
        return res.status(HttpStatus.OK).json({
            statusCode: 200,
            success: 1,
            error: 0,
            data: { addedCount, deletedCount },
            message: 'Methods synced successfully', 
        });
      }
    catch (error) {
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
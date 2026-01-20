import { appConstant, CommonFileService } from '@common-constants';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { TranslationService } from 'src/modules/translation/translation.service';
import { PermissionMethodService } from '../modules/permission/permission-method/permission-method.service';
import { RolePermissionService } from '../modules/permission/role-permission/role-permission.service';
const filePath = appConstant.PERMISSIONS_DIR;
@Injectable()
export class RoleGuard implements CanActivate {
    constructor(
        private readonly rolePermissionService: RolePermissionService,
        private readonly permissionService: PermissionMethodService,
        private readonly translatorService: TranslationService,
        private readonly commonFileService: CommonFileService,
    ) {}
    async canActivate(context: ExecutionContext) {
        const request = context.switchToHttp().getRequest();
        try {
            const userDetails = request.tokenUser;
            if (userDetails?.role_id == appConstant.ROLE.ADMIN || 
                userDetails?.role_id == appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER || 
                userDetails?.role_id == appConstant.ROLE.GLOBALMARKETINGMANAGER || 
                userDetails?.role_id == appConstant.ROLE.NEWSLETTERDESIGNER || 
                userDetails?.role_id == appConstant.ROLE.MARKETINGMANAGER) {
                return true;
            }
            // const permission = await this.permissionService.findOne({
            //     method: request.method,
            //     path: request.path,
            // });
            // if (!permission) {
            //     throw Error(
            //         this.translatorService.translate(
            //             request?.lang,
            //             'ERR_FORBIDDEN_ACCESS',
            //         ),
            //     );
            // }
            // const userRoleDetails = await this.rolePermissionService.findOne({
            //     role_id: userDetails.role_id,
            //     method_id: permission.id,
            //     permission: 1,
            //     status: 1,
            // });
            // if (!userRoleDetails) {
            //     throw Error(
            //         this.translatorService.translate(
            //             request?.lang,
            //             'ERR_FORBIDDEN_ACCESS',
            //         ),
            //     );
            // }
            let data = await this.commonFileService.decryptFromFile(filePath);
            let permission = data[userDetails?.role_id] ?? null;
            if(!data || !permission){
                const userRoleDetails = await this.rolePermissionService.findOne({
                    role_id: userDetails?.role_id,
                    method_id: permission.id,
                    permission: 1,
                    status: 1,
                });
                if (userRoleDetails) {
                    permission = [request.path];
                }
            }
            if(!permission){
                throw Error(
                    this.translatorService.translate(
                        request?.lang,
                        'ERR_FORBIDDEN_ACCESS',
                    ),
                ); 
            }
            else{
                if(!permission.includes(request.path))  {
                    const userRoleDetails = await this.rolePermissionService.findOne({
                        role_id: userDetails?.role_id,
                        method_id: permission.id,
                        permission: 1,
                        status: 1,
                    });
                    if (userRoleDetails) {
                        permission = [request.path];
                    }
                    if(!permission.includes(request.path)) {
                        throw Error(
                            this.translatorService.translate(
                                request?.lang,
                                'ERR_FORBIDDEN_ACCESS',
                            ),
                        ); 
                    }
                }
            }
            return true;
        } catch (err) {
            return false;
        }
    }
}

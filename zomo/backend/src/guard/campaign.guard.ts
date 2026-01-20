import { appConstant } from '@common-constants';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { TranslationService } from 'src/modules/translation/translation.service';

@Injectable()
export class CampaignGuard implements CanActivate {
    constructor(private readonly translatorService: TranslationService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const userDetails = request.tokenUser;

        if (userDetails?.role_id == appConstant.ROLE.NEWSLETTERDESIGNER) {
            throw new Error(
                await this.translatorService.frontendReadTranslation(
                    request?.lang,
                    'ERR_FORBIDDEN_ACCESS'
                )
            );
        }

        if (
            userDetails?.role_id == appConstant.ROLE.ADMIN ||
            userDetails?.role_id == appConstant.ROLE.GLOBALMARKETINGMANAGER ||
            userDetails?.role_id == appConstant.ROLE.MARKETINGMANAGER ||
            userDetails?.role_id == appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER
        ) {
            return true;
        }

        return true;
    }
}

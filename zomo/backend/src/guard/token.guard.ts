import { appConstant, CommonService } from "@common-constants";
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from "express";
import * as jwt from 'jsonwebtoken';
import * as moment from 'moment-timezone';
import { TranslationService } from 'src/modules/translation/translation.service';
import { UserService } from 'src/modules/user/user/user.service';
import { AuthService } from '../modules/auth/auth.service';
import { OnboardingService } from '../modules/onboarding/onboarding.service';
@Injectable()
export class TokenGuard implements CanActivate {
    constructor(private readonly authService: AuthService,
                private readonly commonService: CommonService,
                private readonly translatorService: TranslationService,
                private readonly userService: UserService,
                private readonly onboardingService: OnboardingService,
                ) {}
    async canActivate(context: ExecutionContext) {
        const request: Request = context.switchToHttp().getRequest();
        const {authorization, x_lang} = request.headers;
        const lang: string = Array.isArray(x_lang) ? (x_lang[0] || 'eng') : x_lang;
        try {
            if (!authorization) {
                throw Error(this.translatorService.translate(lang, "ERR_MISSING_AUTHORIZATION"));
            }
            if (authorization.startsWith('Bearer ') == false) {
                throw Error(this.translatorService.translate(lang, "ERR_MISSING_AUTHORIZATION"));
            }

            const token = authorization.slice(7, authorization.length);
            if (!token) {
                return false;
            }
            const deviceDetails = this.commonService.getClientIPAndDeviceDetails(request);
            const decodedToken = await jwt.verify(token, appConstant.JWT.SECRET_KEY);
            if(decodedToken?.['tokenType'] === 'onboarding') {
                const userDetails:any = await this.onboardingService.getOne({ id: decodedToken['id'] });
                if (!userDetails) {
                    return false;
                }
                request.tokenUser = userDetails;
                return true;
            }else {
                const userDetails = await this.authService.findOne({
                    status: 1,
                    id: decodedToken['id'],
                }, null, null, request);
                if (!userDetails || (userDetails && userDetails['status'] != 1)) {
                    return false;
                }
                let mobile = 0
                // restrict same user from multiple device ZOMO-2570
                if(['Android','IOS','iOS','ios','Mac'].includes(deviceDetails?.os_name) && deviceDetails?.client_type != 'browser' && [appConstant.ROLE.REGISTERED,appConstant.ROLE.SPOUSE].includes(userDetails.role_id)){
                    mobile = 1;
                    let currentUserLoginRecord = await this.authService.findUserLogin(`userLogin.id = ${decodedToken?.['user_login_id']} and userLogin.user_id = ${userDetails?.id} and userLogin.login_source = 1 and DATE(userLogin.login_time) = DATE('${moment().format('YYYY-MM-DD')}') and userLogin.source in(1,2)`);
                    let userLoginRecord = await this.authService.findUserLogin(`userLogin.id != ${decodedToken?.['user_login_id']} and userLogin.user_id = ${userDetails?.id} and userLogin.login_source = 1 and DATE(userLogin.login_time) = DATE('${moment().format('YYYY-MM-DD')}') and userLogin.source in(1,2) and userLogin.logout_time = '0000-00-00 00:00:00'`);
                    if(userLoginRecord){
                        if(userLoginRecord?.logout_time?.toString() != '0000-00-00 00:00:00'){
                            userLoginRecord = await this.authService.findUserLogin(`userLogin.id Not(In([${decodedToken?.['user_login_id']},${userLoginRecord?.['id']}])) and userLogin.user_id = ${userDetails?.id} and userLogin.login_source = 1 and DATE(userLogin.login_time) = DATE('${moment().format('YYYY-MM-DD')}') and userLogin.source in(1,2)`);
                        }
                        const date1 = moment(currentUserLoginRecord?.login_time);
                        const date2 = moment(userLoginRecord?.login_time);
                        if(date1.isBefore(date2) && (userLoginRecord?.useragent?.includes('okhttp') || userLoginRecord?.useragent?.includes('zomohealth'))){
                            throw Error("jwt expired");
                        }
                    }
                }
                request['lang'] = lang;
                request.tokenUser = userDetails;
                request.tokenUser['organisation_code'] = userDetails?.['membership_code'] ?? null;
                request.tokenUser['city'] = userDetails?.['settings']?.['city'] ?? null;
                request.tokenUser['state'] = userDetails?.['settings']?.['state'] ?? null;
                request.tokenUser['user_login_id'] = decodedToken?.['user_login_id'] ?? null;
                request.tokenUser['mobile'] = mobile;
                if (userDetails?.role_id == 1) {
                    return true;
                }
                if ([appConstant.ROLE.REGISTERED, appConstant.ROLE.SPOUSE, appConstant.ROLE.WCH].includes(userDetails?.role_id)) {
                    request.tokenUser['usersdatawellness'] = await this.userService.userChallengeData(request.tokenUser);
                }
                return true;
            }
        }
        catch (err){
            if(err.message == "jwt expired") {
                throw Error(this.translatorService.translate(lang, "ERR_EXPIRED_AUTHORIZATION"));
            }
            return false;
        }
    }
}

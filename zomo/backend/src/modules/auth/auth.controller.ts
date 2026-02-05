import { appConstant, CommonDateService, CommonService, Gender, Source, tableConstant, timezoneConstant } from '@common-constants';
import { Body, Controller, HttpException, HttpStatus, Inject, Next, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import * as crypto from 'crypto';
import 'dotenv/config';
import { Request, Response } from "express";
import { decode } from 'jsonwebtoken';
import { lastValueFrom } from 'rxjs';
import { TokenGuard } from 'src/guard';
import { In, Not } from 'typeorm';
import { LoginInput, LogoutInput, RefreshTokenInput } from '../../input';
import { UrlManageService } from '../common';
import { CommunicationTemplateTextsService } from '../communication/templatetexts/communicationtemplatetexts.service';
import { ActivityLogService } from "../master/activitylog/activitylog.service";
import { ThemeSettingsService } from '../themes/themesettings/themesettings.service';
import { TranslationService } from '../translation/translation.service';
import { UserService } from '../user/user/user.service';
import { UserLoginAgreementService } from '../user/userloginagreement/userloginagreement.service';
import { AuthService } from './auth.service';
const argon2 = require('argon2');
const secretPass = process.env.SECRETPASS ?? 'kljhflk73#OO#*U$O(*YO';
const S3_URL =  process.env.S3_URL_PROD
const secretKey = process.env.SECRET_KEY_PROD.slice(0, 32);
const iv = process.env.SECRET_KEY_PROD.slice(0, 16);
@Controller('auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly commonService: CommonService,
        private readonly commonDateService: CommonDateService,
        private readonly translatorService: TranslationService,
        @Inject('POSTCODES_SERVICE')
        private timeZoneMicroservice: ClientProxy,
        @Inject('COMMON_SERVICE')
        private commonMicroservice: ClientProxy,
        private readonly communicationTemplateTextService: CommunicationTemplateTextsService,
        private readonly activityLogService: ActivityLogService,
        private readonly userService: UserService,
        private readonly urlManageService: UrlManageService,
        private readonly themeSettingsService: ThemeSettingsService,
        private readonly userLoginAgreementService: UserLoginAgreementService,
    ) { }
    @Post('login')
    async login(@Res() res, @Req() req, @Body() postData: LoginInput) {
        try {
            let num_otp_login;
            let otp_created;
            postData.email = postData?.email == '' ? null : postData?.email?.trim();
            if (!postData?.auto_login && ((!postData?.email || postData?.email.indexOf(' ') !== -1) || !postData?.password)) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_INVALID_LOGIN"));
            }
            let token = postData?.token;
            delete postData?.token;
            let whereLogin = '(user.username = :email OR user.email = :email) AND user.status != 2';
            if(postData?.auto_login){
                whereLogin = ' user.id = :email AND user.status != 2';
                postData.email = postData.id;
            }
            let userDetails = await this.authService.findOne(whereLogin, {org_id: 'DESC'}, { email: postData?.email }, req);
            if(userDetails?.preferred_language?.alias){
                req.lang = userDetails?.preferred_language?.alias;
            }
            if(userDetails && userDetails.status != 1){
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "The login/password combination was not found"));
            }
            if(userDetails?.new_password == ''){
                userDetails.new_password = null;
            }
            let activeCompany = false;
            if((userDetails?.['company'] && userDetails?.['company']?.['status'] == 1 && userDetails?.['company']?.['deleted'] == 0) || (appConstant.ADMIN_ROLE.includes(userDetails?.role_id) )){
                activeCompany = true;
            }
            if (!userDetails || !activeCompany) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_INVALID_LOGIN"));
            }
            postData['remember_me'] = postData['remember_me'] ? 1 : 0;
           
            if(postData?.role_id == 1 && appConstant.ADMIN_ROLE.includes(userDetails.role_id)){
            }else{
                if(!postData?.role_id && !appConstant.ADMIN_ROLE.includes(userDetails.role_id)){
                }else{

                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
                }
            }
            const deviceDetails = this.commonService.getClientIPAndDeviceDetails(req);
            if(((['Android','IOS','iOS','ios','Mac'].includes(deviceDetails?.os_name) && deviceDetails?.client_type != 'browser') || (["desktop","smartphone","tablet"].includes(deviceDetails?.device?.type) && !deviceDetails?.client_type)) && ![appConstant.ROLE.REGISTERED,appConstant.ROLE.SPOUSE].includes(userDetails.role_id)){
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_INVALID_LOGIN"));
            }
            if((!userDetails?.['new_password'] || userDetails?.['new_password'] == '') && userDetails.password && userDetails.password != ''){
                try{
                    let passwordEncrypt = this.commonService.passwordEncrypt(`${userDetails.code}:::::${userDetails.id}:::::${postData?.password}:::::${userDetails?.username}`);
                    let data = await this.commonService.makeCurlRequest('POST', process.env.CROSSPLATFORMLOGIN, {encrypted_assertion: passwordEncrypt},{'Authorization': `Bearer ''`,'Content-Type': 'application/x-www-form-urlencoded'});
                    if(data){
                        data = JSON.parse(data);
                        if(data['success'] == 1){
                            let updateData = await this.authService.update({ id: userDetails.id }, { new_password: postData?.password });
                            if (updateData) {
                                userDetails.new_password = updateData['new_password']
                            }
                        }
                        if(data['error'] == 1){
                            throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_INVALID_LOGIN"));
                        }
                    }
                }
                catch(error){
                    Next();
                }
            }
            const num_login = userDetails.num_login;
            let updateUserData = {};
            let updateLoginData;
            if(!appConstant.ADMIN_ROLE.includes(userDetails.role_id)){
                if(!userDetails.new_password || userDetails?.new_password == ''){
                    updateLoginData = {
                        user_id: userDetails.id,
                        ip: req.ip,
                        num_login :  num_login ? (num_login + 1) : 1,
                        last_login: this.commonDateService.getTodayDate().format('YYYY-MM-DD HH:mm:ss'),
                        useragent: req.get('User-Agent'),
                        login_time: this.commonDateService.getTodayDate().format('YYYY-MM-DD HH:mm:ss'),
                    }
                    if(userDetails?.['settings']?.['otp_key'] == postData?.password){
                        otp_created = this.commonDateService.getTodayDate(userDetails['settings']['otp_created']).add(1,'hour');
                        let current = this.commonDateService.getTodayDate();
                        if (current <= otp_created) {
                            num_otp_login = userDetails['settings']['num_otp_login'] ? userDetails['settings']['num_otp_login'] + 1 : 1;
                            await this.authService.updateSetting({id: userDetails['settings']['id']},{num_otp_login});
                        }
                        else {
                            throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_INVALID_LOGIN"));
                        }
                    } 
                    else{
                        if (userDetails['company']['status'] && (userDetails['company']['status'] != 1 || userDetails?.['company']?.['deleted'] == 1)) {
                            throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_INVALID_LOGIN"));
                        }
                        if (userDetails&& userDetails['dob'] && userDetails['dob'] != '') {
                            const momentDate = this.commonDateService.getTodayDate(userDetails.dob); 
                            userDetails['dob'] = momentDate.format('MM-DD-YYYY');
                        }
                        if (userDetails &&
                            ((userDetails['dob'] && userDetails['dob'] != '' && (userDetails['company']['setting']['first_login_by'] == 0 && userDetails['company']['setting']['pre_first_login_by'] + this.commonDateService.getTodayDate(userDetails['dob'])?.format('MM-DD-YYYY')?.replace(/[-/]/g, '') == postData?.password?.replace(/[-/]/g, ''))) ||
                                (userDetails['date_of_hire'] && userDetails['date_of_hire'] && (userDetails['company']['setting']['first_login_by'] == 1 && userDetails['company']['setting']['pre_first_login_by'] + this.commonDateService.getTodayDate(userDetails['date_of_hire'])?.format('MM-DD-YYYY')?.replace(/[-/]/g, '') == postData?.password?.replace(/[-/]/g, ''))) ||
                                (userDetails['employeeid'] && userDetails['employeeid'] != '' && (userDetails['company']['setting']['first_login_by'] == 3 && userDetails['company']['setting']['pre_first_login_by'] + userDetails['employeeid'] == postData?.password)) ||
                                (userDetails['securitycode'] && userDetails['securitycode'] != '' && (userDetails['company']['setting']['first_login_by'] == 4 && userDetails['company']['setting']['pre_first_login_by'] + Buffer.from(userDetails['securitycode'], 'base64')?.toString('utf-8')?.replace(/[-/]/g, '')  == postData?.password?.replace(/[-/]/g, ''))) ||
                                (userDetails['dob'] && userDetails['dob'] != '' && (userDetails['company']['setting']['first_login_by'] == 5 && userDetails['company']['setting']['pre_first_login_by'] + userDetails['first_name'] + userDetails['last_name']+ this.commonDateService.getTodayDate(userDetails['dob'])?.format('YYYY')?.replace(/[-/]/g, '') == postData?.password?.replace(/[-/]/g, ''))))
                            && (!userDetails['new_password'] || userDetails?.['new_password'] == ''))
                        {
                            if (userDetails['role_id'] && (userDetails['company']['setting']['allow_du_login'] != undefined || userDetails['company']['setting']['allow_du_login'] != null) && (userDetails['company']['setting']['allow_ds_login'] != undefined || userDetails['company']['setting']['allow_ds_login'] != null) && ((userDetails['role_id'] == 2 && userDetails['company']['setting']['allow_du_login'] == 0) || (userDetails['role_id'] == 16 && userDetails['company']['setting']['allow_ds_login'] == 0))) {
                                let data = {
                                    ssologindata: 1,
                                    text: userDetails['company']?.['meta']?.['sso_dtext'] != '' ? userDetails['company']?.['meta']?.['sso_dtext'] : 'Please click the link below to login with your organization.', 
                                    link: userDetails['company']?.['meta']?.['sso_dlink']
                                }
                                return res.status(HttpStatus.OK).json({
                                    statusCode: 200,
                                    success: 1,
                                    error: 0,
                                    data: data,
                                    message: 'success',
                                });
                            }
                            if ([appConstant.ROLE.REGISTERED,appConstant.ROLE.ORGADMIN,appConstant.ROLE.WCH,appConstant.ROLE.MGR,appConstant.ROLE.SPOUSE].includes(userDetails.role_id)) {
                                updateLoginData['lastuniqid'] = '5';
                            }
                        }
                        else{
                            throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_INVALID_LOGIN"));
                        }
                    }
                }
                else{
                    if(userDetails?.['settings']?.['otp_key'] == postData?.password){
                        otp_created = this.commonDateService.getTodayDate(userDetails['settings']['otp_created']).add(1,'hour');
                        let current = this.commonDateService.getTodayDate();
                        if (current <= otp_created) {
                            num_otp_login = userDetails['settings']['num_otp_login'] ? userDetails['settings']['num_otp_login'] + 1 : 1;
                            await this.authService.updateSetting({id: userDetails['settings']['id']},{num_otp_login});
                        }
                        else {
                            throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_INVALID_LOGIN"));
                        }
                    }
                    else{
                        if(!postData?.auto_login) {
                            let isMatch = await argon2.verify(Buffer.from(userDetails.new_password, 'base64').toString('ascii'), postData?.password);
                            if (!isMatch) {
                                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_INVALID_LOGIN"));
                            }
                        }
                    }
                    if (userDetails['role_id'] && userDetails['company'] && userDetails['company']['setting'] && (userDetails['company']['setting']['allow_du_login'] != undefined || userDetails['company']['setting']['allow_du_login'] != null) && (userDetails['company']['setting']['allow_ds_login'] != undefined || userDetails['company']['setting']['allow_ds_login'] != null) && ((userDetails['role_id'] == 2 && userDetails['company']['setting']['allow_du_login'] == 0) || (userDetails['role_id'] == 16 && userDetails['company']['setting']['allow_ds_login'] == 0))) {
                        let data = {
                            ssologindata: 1,
                            text: userDetails['company']?.['meta']?.['sso_dtext'] != '' ? userDetails['company']?.['meta']?.['sso_dtext'] : 'Please click the link below to login with your organization.', 
                            link: userDetails['company']?.['meta']?.['sso_dlink']
                        }
                        return res.status(HttpStatus.OK).json({
                            statusCode: 200,
                            success: 1,
                            error: 0,
                            data: data,
                            message: 'success',
                        });
                    }
                    updateLoginData = {
                        user_id: userDetails.id,
                        ip: req.ip,
                        num_login :  num_login ? (num_login + 1): 1,
                        last_login: this.commonDateService.getTodayDate().format('YYYY-MM-DD HH:mm:ss'),
                        lastuniqid: '24',
                        useragent: req.get('User-Agent'),
                        login_time: this.commonDateService.getTodayDate().format('YYYY-MM-DD HH:mm:ss')
                    }
                }    
            }
            else{
                if(userDetails?.['settings']?.['otp_key'] == postData?.password && appConstant.ROLE.ADMIN != userDetails.role_id){
                    otp_created = this.commonDateService.getTodayDate(userDetails['settings']['otp_created']).add(1,'hour');
                    let current = this.commonDateService.getTodayDate();
                    if (current <= otp_created) {
                        num_otp_login = userDetails['settings']['num_otp_login'] ? userDetails['settings']['num_otp_login'] + 1 : 1;
                        await this.authService.updateSetting({id: userDetails['settings']['id']},{num_otp_login});
                    }
                    else {
                        throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_INVALID_LOGIN"));
                    }
                }
                else{
                    if(!userDetails.new_password || userDetails.new_password == ''){
                        throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_INVALID_LOGIN"));
                    }
                    let isMatch = await argon2.verify(Buffer.from(userDetails.new_password, 'base64').toString('ascii'), postData?.password);
                    if(!isMatch) {
                        throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_INVALID_LOGIN"));
                    } 
                }
                updateLoginData = {
                    user_id: userDetails.id,
                    ip: req.ip,
                    num_login :  num_login ? (num_login + 1) : 1,
                    last_login: this.commonDateService.getTodayDate().format('YYYY-MM-DD HH:mm:ss'),
                    useragent: req.get('User-Agent'),
                    login_time: this.commonDateService.getTodayDate().format('YYYY-MM-DD HH:mm:ss')
                }
            }        
            // const deviceDetails = this.commonService.getClientIPAndDeviceDetails(req);
            if (deviceDetails && deviceDetails.os_name) {
                switch (deviceDetails.os_name) {
                    case 'Windows':
                    case 'browser':
                        updateLoginData["source"] = Source.Web;
                        break;
                    case 'Android':
                        updateLoginData["source"] = Source.Android;
                        break;
                    case 'IOS':
                        updateLoginData["source"] = Source.IOS;
                        break;
                    case 'Mac':
                        if(deviceDetails?.client_type == 'browser'){
                            updateLoginData["source"] = Source.Web;
                        }else{
                            updateLoginData["source"] = Source.IOS;
                        }
                        break;
                    default:
                        break;
                }
            }
            updateUserData['last_login'] = this.commonDateService.getTodayDate().format('YYYY-MM-DD HH:mm:ss');
            updateUserData['num_login'] = num_login ? (num_login + 1) : 1;
            let loginDetails
            if(updateLoginData && (!userDetails?.['settings']?.['otp_key'] || (userDetails?.['settings']?.['otp_key'] != postData?.password))){
                updateLoginData['login_source'] = 1;
                if(postData?.auto_login){
                    updateLoginData['login_source'] = 3;
                }
                let timeZone = req.get('Timezone') || '';
                updateLoginData['timezone'] = (timeZone!== '' && timeZone !== undefined && timeZone !== null) ? timeZone : userDetails?.timezone ? userDetails?.timezone : 'UTC';
                loginDetails = await this.authService.updateUserLogin(updateLoginData);
            }
            if (postData?.auto_login) {
                updateUserData['preferred_login'] = 1;
            }
            const tokenData = {
                id: userDetails.id,
                role_id: userDetails.role_id,
                organisation_code: userDetails.membership_code,
                user_login_id: loginDetails ? loginDetails['id'] : null,
            };
            const userData = {
                accessToken: await this.authService.generateJwtToken({...tokenData,token: token},deviceDetails, postData['remember_me'], otp_created ? true : false),
                refreshToken: otp_created ? null : await this.authService.generateRefreshJwtToken(tokenData, postData['remember_me']),
                user_login_id: loginDetails ? loginDetails['id'] : null,
            };
            updateUserData["refresh_token"] = userData.refreshToken;
            if(userDetails.timezone && (userDetails.timezone == "" || userDetails.timezone == 'UTC')){
                if(appConstant.EXCLUDE_TIMEZONE_ROLE.includes(userDetails.role_id)){
                    let timezone = await this.user_get_timezone(userDetails, req);
                    updateUserData['timezone'] = timezone;
                }
            }
            if(userDetails['company'] && userDetails['company']?.['meta']){
                if(userDetails['company']?.['meta']?.['enable_widget'] && userDetails['company']?.['meta']?.['enable_widget'] != ''){
                    userDetails['company']['setting']['enable_widget'] = userDetails['company']?.['meta']?.['enable_widget'].includes('{') ? JSON.parse(userDetails['company']?.['meta']?.['enable_widget']): userDetails['company']?.['meta']?.['enable_widget'];
                }
                if(userDetails['company']?.['meta']?.['user_popup_title']){
                    let customName = await this.translatorService.frontendReadTranslation(req.lang, `user_popup_title_${userDetails['org_id']}`, `/LC_MESSAGES/Common/LoginPopup/${userDetails?.['company']?.['id'] || userDetails['org_id']}`,`dynamic`);
                    userDetails['company']['meta']['user_popup_title'] = !customName.includes('user_popup_title_') ? customName : userDetails['company']?.['meta']?.['user_popup_title'];
                }
                userDetails['company']['setting']['a_popup_status'] = userDetails['company']?.['meta']?.['a_popup_status'];
                userDetails['company']['setting']['user_popup_title'] = userDetails['company']?.['meta']?.['user_popup_title'];
                userDetails['company']['setting']['a_popup_logo_status'] = userDetails['company']?.['meta']?.['a_popup_logo_status'];
                userDetails['company']['setting']['a_popup_require'] = userDetails['company']?.['meta']?.['a_popup_require'];
            }
            
            if(userDetails['company'] && userDetails['company']?.['company_logo']){
                userDetails['company']['company_logo_dark'] = userDetails['company']?.['company_logo_dark']?.includes('comimgdark_') ? S3_URL + `companylogos/${userDetails['org_id']}/` + userDetails['company']['company_logo_dark'] :  userDetails['company']?.['company_logo'] ? userDetails['company']?.['company_logo']?.includes('comimg_') ? S3_URL + `companylogos/${userDetails['org_id']}/` + userDetails['company']['company_logo']  : '' : '';
                userDetails['company']['company_logo'] = userDetails['company']?.['company_logo']?.includes('comimg_') ? S3_URL + `companylogos/${userDetails['org_id']}/` + userDetails['company']['company_logo'] : '';
            }
            else{
                if(userDetails['company'] && userDetails['company']?.['company_logo_dark']){
                    userDetails['company']['company_logo_dark'] = userDetails['company']?.['company_logo_dark']?.includes('comimgdark_') ? S3_URL + `companylogos/${userDetails['org_id']}/` + userDetails['company']['company_logo_dark'] : '';
                    userDetails['company']['company_logo'] = userDetails['company']?.['company_logo']?.includes('comimg_') ? S3_URL + `companylogos/${userDetails['org_id']}/` + userDetails['company']['company_logo'] : userDetails['company']?.['company_logo_dark'] ? userDetails['company']?.['company_logo_dark']?.includes('comimgdark_') ? S3_URL + `companylogos/${userDetails['org_id']}/` + userDetails['company']['company_logo_dark'] : '' : '';
                }
            }
            delete userDetails['company']?.['meta'];
            if(![appConstant.ROLE.ORGADMIN,appConstant.ROLE.WCH,appConstant.ROLE.REGISTERED,appConstant.ROLE.SPOUSE].includes(userDetails['role_id'])){
                delete userDetails['company']?.['setting']?.['is_internationalization'];
            }
            if(appConstant.ROLE.ORGADMIN != userDetails['role_id']){
                delete userDetails['company']?.['setting']?.['census_status'];
            }
            let checkService
            try{
                checkService = await lastValueFrom(this.commonMicroservice.send({cmd: 'test'}, {}));
            }
            catch(e){
                checkService = null;
                this.activityLogService.error_log(req?.tokenUser?.id,req?.originalUrl, e?.message, e, req);
            }
            if(userDetails?.['profile_image'] && checkService){
                let fileData = await lastValueFrom(this.commonMicroservice.send({cmd: 'check_file'}, {prefix: userDetails?.['profile_image'] }));
                if(!fileData){
                    userDetails['profile_image'] = '';
                }
            }
            let sideMenuFilePath = null;
            let activePluginPath = null;
            let userHaveChampion = 0;
            if (![
                appConstant.ROLE.ADMIN,
                appConstant.ROLE.CLIENTENGAGEMENTMANAGER,
                appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER,
                appConstant.ROLE.PHYSICIAN,
                appConstant.ROLE.GLOBALCOACH,
                appConstant.ROLE.COACH,
                appConstant.ROLE.DATAMANAGER,
                appConstant.ROLE.GLOBALDATAMANAGER,
                appConstant.ROLE.GLOBALMARKETINGMANAGER,
            ].includes(userDetails['role_id'])) {
                let sideMenuFileName = `side_menu_${userDetails['org_id']}.json`;
                sideMenuFilePath = `local/sidemenu/${userDetails['org_id']}/${sideMenuFileName}`;
                if (sideMenuFilePath && checkService) {
                    let fileData = await lastValueFrom(this.commonMicroservice.send({ cmd: 'check_file' }, { prefix: sideMenuFilePath }));
                    if (!fileData) {
                        sideMenuFilePath = null;
                    } else {
                        sideMenuFilePath = S3_URL + sideMenuFilePath;
                    }
                }
                else {
                    sideMenuFilePath = null;
                }
                let activePluginName = `activeplugin_${userDetails['org_id']}.json`;
                activePluginPath = `local/activeplugin/${userDetails['org_id']}/${activePluginName}`;
                if (activePluginPath && checkService) {
                    let fileData = await lastValueFrom(this.commonMicroservice.send({ cmd: 'check_file' }, { prefix: activePluginPath }));
                    if (!fileData) {
                        activePluginPath = null;
                    } else {
                        activePluginPath = S3_URL + activePluginPath;
                    }
                }
                else {
                    activePluginPath = null;
                }
                // for champion wellness assign check
                if([appConstant.ROLE.REGISTERED, appConstant.ROLE.SPOUSE].includes(userDetails['role_id'])){
                    let userWellnessAssignCheck = await this.userService.usersDataWellness(userDetails , `user.membership_code = '${userDetails['membership_code']}' AND user.id = ${userDetails['id']}`,'','userWise');
                    if( userWellnessAssignCheck && userWellnessAssignCheck.length > 0){
                        userHaveChampion = 1;
                    }
                }

            }
            let tabSettingFilePath = null;
            if (appConstant.ROLE.WCH == userDetails['role_id']) {
                let tabSettingFileName = `tab_setting_${userDetails['id']}.json`;
                tabSettingFilePath = `local/tabsetting/${userDetails['id']}/${tabSettingFileName}`;
                if (tabSettingFilePath && checkService) {
                    let fileData = await lastValueFrom(this.commonMicroservice.send({ cmd: 'check_file' }, { prefix: tabSettingFilePath }));
                    if (!fileData) {
                        tabSettingFilePath = null;
                    } else {
                        tabSettingFilePath = S3_URL + tabSettingFilePath;
                    }
                }
            }
            else{
                tabSettingFilePath = null;
            }
            if(userDetails['timezone']) {
                let timezoneData = await lastValueFrom(this.timeZoneMicroservice.send({cmd: 'find_postcode'}, `tz.timezone_name LIKE '%${userDetails['timezone']}%'`));
                if(timezoneData.length){
                    userDetails['timezone_alias'] = timezoneData[0]?.alias;
                }
            }
            let user_meta = {
                id: userDetails['id'],
                first_name: userDetails.first_name,
                last_name: userDetails.last_name,
                full_name: userDetails.first_name + ' ' + userDetails.last_name,
                email: userDetails.email,
                wphone: userDetails?.['settings']?.wphone,
                code: userDetails.code,
                physiciantype_id: userDetails.physiciantype_id,
                org_id: userDetails['org_id'],
                role_id: userDetails['role_id'],
                timezone: userDetails['timezone'],
                timezone_alias: userDetails['timezone_alias'],
                username: userDetails['username'],
                department_id: userDetails['department_id'],
                location: userDetails['location'],
                Location: userDetails['Location'],
                date_of_hire: userDetails['date_of_hire'],
                preferred_language: userDetails['preferred_language'],
                created: this.commonDateService.getTodayDate(userDetails['created']).format('MMM DD, YYYY'),
                dob: this.commonDateService.getTodayDate(userDetails['dob']).format('MM-DD-YYYY'),
                membership_code: userDetails['membership_code'],
                profile_image:  userDetails?.['profile_image']?.includes('profileimages') ? S3_URL + userDetails['profile_image'] : '',
                gender: Object.keys(Gender).find(key => Gender[key] === userDetails['gender']),
                company: userDetails['company'],
                sideMenuFilePath : sideMenuFilePath,
                activePluginPath: activePluginPath,
                tabSettingFilePath:tabSettingFilePath,
                userHaveChampion: userHaveChampion,
            };
            if(user_meta?.company?.theme_setting && user_meta?.company?.theme_setting?.org_id == 0){
                let themesettings: any = await this.themeSettingsService.findOne({org_id: user_meta?.org_id});
                if(themesettings){
                    user_meta.company.theme_setting = themesettings;
                }
            }
            if(!userDetails.new_password || userDetails?.new_password == ''){
                userData['first_login_by'] = 1; 
            }
            if(userDetails['role_id'] == appConstant.ROLE.SPOUSE){
                let spouseEmail = userDetails['email'];
                let editEmailSpaouse = 0
                let editEmailSpaouseRequired = 0;
                if((userDetails?.['company']?.['setting']?.['spouse_email_collection_on_off'] && userDetails?.['company']?.['setting']?.['spouse_email_collection_on_off'] == 1) && (spouseEmail && (spouseEmail.includes('@preventioncloud.com') || spouseEmail.includes('@zomohealth.com')))){
                    editEmailSpaouse = 1;
                }
                if(userDetails['company']['setting']['spouse_email_collection_required'] && userDetails['company']['setting']['spouse_email_collection_required'] == 1){
                    editEmailSpaouseRequired = 1;
                }
                // if(editEmailSpaouse == 1){
                    userData['editEmailSpaouse'] = editEmailSpaouse;
                    userData['editEmailSpaouseRequired'] = editEmailSpaouseRequired;
                // }
            }
            /* notes: password blank OR popup_status 0 time show popup */
            if([appConstant.ROLE.REGISTERED,appConstant.ROLE.SPOUSE].includes(userDetails['role_id'])){
                if(userDetails?.['company']?.['setting']?.['user_popup_status'] && userDetails?.['company']?.['setting']?.['user_popup_status'] == 1 && userDetails?.['settings']?.['popup_status'] == 0){
                    userData['editEmailPassword'] = 1;
                    delete userData['first_login_by'];
                }
                userData['title'] = userDetails['company']['setting']['user_popup_title'] && userDetails['company']['setting']['user_popup_title'] != '' ? userDetails?.['company']?.['setting']?.['user_popup_title'] : 'Your Account requires a one-time resetting of your Username and Password';
                // login aggrement changes added
                if(user_meta['company']['setting'] && user_meta['company']['setting']['a_popup_status'] == 1){
                    let userLoginAggrement = await this.userLoginAgreementService.findOneUser({user_id: user_meta['id'], org_id: user_meta['org_id'], status: Not('2')},['id'])
                    if(!userLoginAggrement && userLoginAggrement== null ){
                       user_meta['showLoginAgreementTab'] = 1; 
                    }
                }
                
            }
            delete userDetails['company'];
            if(userDetails?.['settings']?.['otp_key'] == postData?.password){
                userData['first_login_by'] ? delete userData['first_login_by'] : null;
                userData['editEmailSpaouse'] ? delete userData['editEmailSpaouse'] : null;
                userData['editEmailSpaouseRequired'] ? delete userData['editEmailSpaouseRequired'] : null;
                userData['pass_key_login_by'] = 1;
            }
            if(userDetails['role_id'] == appConstant.ROLE.ORGADMIN){
                userData['first_login_by'] ? delete userData['first_login_by'] : null;
                userData['editEmailSpaouse'] ? delete userData['editEmailSpaouse'] : null;
                userData['editEmailSpaouseRequired'] ? delete userData['editEmailSpaouseRequired'] : null;
            }
            userData['user_meta'] = user_meta;
            await this.authService.update({
                    id: userDetails.id,
                    role_id: userDetails.role_id,
                },updateUserData);
            if(postData?.auto_login){
                return userData;
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: userData,
                message: 'success',
            });
        } catch (error) {
            console.log("error",error)
            this.activityLogService.error_log(req?.tokenUser?.id,req?.originalUrl, error?.message, error, req);
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
    @Post('logout')
    async logout(@Res() res, @Req() req, @Body() postData: LogoutInput) {
        try {
            if (!postData?.email) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let userDetails = await this.authService.findOne({
                username: postData?.email,
            },null, null, req);
            if (!userDetails) {
                userDetails = await this.authService.findOne({
                    email: postData?.email,
                }, null, null, req);
                if (!userDetails) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_INVALID_LOGIN"));
                }
            }
            await this.authService.update({
                id: userDetails.id,
                role_id: userDetails.role_id,
            }, {refresh_token : null});
            await this.authService.updateUserLogin({id: postData?.['user_login_id'], logout_time: this.commonDateService.getTodayDate().format('YYYY-MM-DD HH:mm:ss')});
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: 'success',
            });
        } catch (error) {
            this.activityLogService.error_log(req?.tokenUser?.id,req?.originalUrl, error?.message, error, req);
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
    @Post('refresh-token')
    async refresh(@Res() res, @Req() req, @Body() postData: RefreshTokenInput) {
        try {
            if (!postData?.accessToken || !postData?.refreshToken) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let accessTokenData = decode(postData.accessToken);
            let userDetails = await this.authService.checkJwtToken(postData?.refreshToken);
            await this.authService.updateUserLogin({id: accessTokenData?.['user_login_id'], logout_time: this.commonDateService.getTodayDate().format('YYYY-MM-DD HH:mm:ss')});
            if (!userDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_EXPIRED_AUTHORIZATION"));
            }
            // restrict same user from multiple device ZOMO-2570
            let userLoginRecord = await this.authService.findUserLogin(`userLogin.id != ${accessTokenData?.['user_login_id']} and userLogin.user_id = ${userDetails?.['id']} and userLogin.login_source = 1 and DATE(userLogin.login_time) = DATE('${this.commonDateService.getTodayDate().format('YYYY-MM-DD HH:mm:ss')}') and userLogin.source in(1,2) and userLogin.logout_time = '0000-00-00 00:00:00'`);
            if(userLoginRecord){
                let currentUserLoginRecord = await this.authService.findUserLogin(`userLogin.id = ${accessTokenData?.['user_login_id']} and userLogin.user_id = ${userDetails?.['id']} and userLogin.login_source = 1 and DATE(userLogin.login_time) = DATE('${this.commonDateService.getTodayDate().format('YYYY-MM-DD')}') and userLogin.source in(1,2)`);
                if(userLoginRecord?.logout_time?.toString() != '0000-00-00 00:00:00'){
                    userLoginRecord = await this.authService.findUserLogin(`userLogin.id Not(In([${accessTokenData?.['user_login_id']},${userLoginRecord?.['id']}])) and userLogin.user_id = ${userDetails?.['id']} and userLogin.login_source = 1 and DATE(userLogin.login_time) = DATE('${this.commonDateService.getTodayDate().format('YYYY-MM-DD HH:mm:ss')}') and userLogin.source in(1,2)`);
                }
                const date1 = this.commonDateService.getTodayDate(currentUserLoginRecord?.login_time);
                const date2 = this.commonDateService.getTodayDate(userLoginRecord?.login_time);
                if(date1.isBefore(date2) && (userLoginRecord?.useragent?.includes('okhttp') || userLoginRecord?.useragent?.includes('zomohealth'))){
                    await this.authService.updateUserLogin({id: userLoginRecord?.['id'], logout_time: this.commonDateService.getTodayDate().format('YYYY-MM-DD HH:mm:ss')});
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_EXPIRED_AUTHORIZATION"));
                }
            }
            delete userDetails["organisation_code"];
            delete userDetails["user_login_id"];
            userDetails["refreshToken"]= postData?.refreshToken;
            userDetails =  await this.authService.checkRefreshToken({accessToken: postData?.accessToken, refreshToken: userDetails});
            if (!userDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_EXPIRED_AUTHORIZATION"));
            }
            const deviceDetails = this.commonService.getClientIPAndDeviceDetails(req);
            const updateLoginData = {
                user_id: userDetails["id"],
                login_time: new Date(),
                login_source: 1,
                useragent: req.get('User-Agent')
            };
            if (deviceDetails && deviceDetails.os_name) {
                switch (deviceDetails.os_name) {
                    case 'Windows':
                    case 'browser':
                        updateLoginData["source"] = Source.Web;
                        break;
                    case 'Android':
                        updateLoginData["source"] = Source.Android;
                        break;
                    case 'IOS':
                        updateLoginData["source"] = Source.IOS;
                        break;
                    default:
                        break;
                }
            }
            const updateUserData = {
                last_login: updateLoginData.login_time,
                num_login: userDetails["num_login"] ? parseInt(userDetails["num_login"]) + 1 : 1
            };
            if (req.ip) {
                updateUserData["ip"] = req.ip;
                updateLoginData["ip"] = req.ip;
            }
            const loginDetails = await this.authService.updateUserLogin(updateLoginData);
            const tokenData = {
                id: userDetails["id"],
                role_id: userDetails["role_id"],
                organisation_code: userDetails["membership_code"],
                user_login_id: loginDetails ? loginDetails['id'] : null,
            };
            const userData = {
                accessToken: await this.authService.generateJwtToken(tokenData,deviceDetails),
                refreshToken: await this.authService.generateRefreshJwtToken(tokenData),
            };
            await this.authService.update({
                id: userDetails["id"],
                role_id: userDetails["role_id"],
            }, {refresh_token: userData.refreshToken});
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: userData,
                message: 'success',
            });
        } catch (error) {
            this.activityLogService.error_log(req?.tokenUser?.id,req?.originalUrl, error?.message, error, req);
            throw new HttpException(
                {
                  statusCode: 401,
                  success: 0,
                  error: 1,
                  message: error?.message,
                  data: null,
                },
                HttpStatus.UNAUTHORIZED,
              );
        }
    }
    async user_get_timezone(userdata: any, req: Request){
        try{
            let timezone = "UTC";
            let country = "";
            let zip = "";
            let timezoneData
            if(userdata['settings']['zip'] && userdata['settings']['zip'] != "") {
                zip = userdata['settings']['zip'];
                country = userdata['settings']['country'];
            }
            userdata['User'] = Object.create(null);
            if(userdata['Location']) {
                userdata['User']['Location'] = userdata['Location'];            
            }
            if(userdata['company']) {
                userdata['User']['Company'] = userdata['company'];            
            } 
            if(zip == "" && userdata['User']['Location'] && userdata['User']['Location']['zip'] && userdata['User']['Location']['zip'] != "") {
                zip = userdata['User']['Location']['zip'];
                country = userdata['User']['Location']['country'];
            }            
            if(zip == "" && userdata['User']['Company'] && userdata['User']['Company']['zip'] && userdata['User']['Company']['zip'] != "") {
                zip = userdata['User']['Company']['zip'];
                country = userdata['User']['Company']['country'];
            }                
            if(zip == "") {                
                if(userdata['User'] && userdata['User']['Company'] && userdata['User']['Company']['code'] && userdata['User']['Company']['code'] != ''){
                    let membership_code = userdata['User']['Company']['code'];
                    let get_org_admin_zip =  await this.authService.findOne({role_id: 11, membership_code: membership_code, status: 1},{id: 'DESC'},null, req);
                    if(get_org_admin_zip['zip'] && get_org_admin_zip['zip'] != "") {
                        zip = get_org_admin_zip['zip'];
                        country = get_org_admin_zip['country'];
                    }
                    if(zip == "") {
                        if(get_org_admin_zip['Location']['zip'] && get_org_admin_zip['Location']['zip'] != "") {
                            zip = get_org_admin_zip['Location']['zip'];
                            country = get_org_admin_zip['Location']['country'];
                        }
                    }
                    if(zip == "") {
                        if(get_org_admin_zip['company']['zip'] && get_org_admin_zip['company']['zip'] != "") {
                            zip = get_org_admin_zip['company']['zip'];
                            country = get_org_admin_zip['company']['country'];
                        }
                    }
                }            
            }
            if(zip != "") {
                if(country == "United States" || country == "US") {
                    timezoneData = await lastValueFrom(this.timeZoneMicroservice.send({cmd: 'find_postcode'}, [{zipcode: [zip], countrycode: 'US'}]));
                } else {
                    timezoneData = await lastValueFrom(this.timeZoneMicroservice.send({cmd: 'find_postcode'}, [{postalcode: [zip], countrycode: 'CA'}]));
                }
                if(timezoneData && timezoneData[0]['timezone']) {
                    timezone = timezoneData[0]['timezone'];
                    if(timezone !== 'UTC'){
                        if(timezone.includes('GMT')){
                            let timezones = timezoneConstant.TIMEZONE;
                            timezone = timezones[timezone] || 'UTC';
                        }
                        await this.authService.update({id: userdata['id']},{
                            timezone: timezone,
                        });
                    }
                }
            }
           return timezone;
        } catch (error) {
            this.activityLogService.error_log(req?.tokenUser?.id,req?.originalUrl, error?.message, error, req);
            throw new Error(await this.translatorService.frontendReadTranslation(req.lang, error.message));
        }
    }
    @Post('add-device-token')
    @UseGuards(TokenGuard)
    async addDeviceToken(@Res() res, @Req() req, @Body() postData: any) {
        try {
            if (!postData?.token) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            postData['user_id'] = req.tokenUser?.id ?? postData?.user_id;
            const deviceDetails = this.commonService.getClientIPAndDeviceDetails(req);            
            await this.authService.addDeviceToken(postData,deviceDetails);
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: 'success',
            });
        } catch (error) {
            this.activityLogService.error_log(req?.tokenUser?.id,req?.originalUrl, error?.message, error, req);
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
    @Post('forgot-username')
    async forgotUsername(@Res() res, @Req() req, @Body() postData: any) {
        try {
            if (!postData?.email && !postData?.first_name && !postData?.last_name) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "Please enter your first name, last name, and e-mail/username or date of birth."));
            }
            let where = `user.first_name = '${postData?.first_name}' AND user.last_name = '${postData?.last_name}'`;
            if(postData?.dob && this.commonDateService.getTodayDate(postData?.dob).isValid()){
                where += ` AND user.dob = '${this.commonDateService.getTodayDate(postData?.dob).format('YYYY-MM-DD')}'`;
            }
            if(postData?.email){
                where += ` AND user.email = '${postData?.email}' `;
            }
            let userDetails = await this.authService.findOne(where, null, null, req);
            if(userDetails){
                let toEmail = userDetails['email'];
                let emailDetails = Object.create(null);
                emailDetails['type'] = 20;
                emailDetails['name'] = userDetails.first_name;
                emailDetails['username'] = userDetails.username;
                emailDetails['company_name'] = userDetails?.['company']?.['company_name'];
                const templateText = await this.communicationTemplateTextService.findOne({org_id: In([userDetails.org_id,0]), type: 20});
                let templateNewText = await this.urlManageService.onmapUrlContent(templateText?.['new_text'],'mailTemplate') || templateText?.['text'];
                let emaildata = {
                    sender: `Zomo Health<noreply@${process.env.DOMAIN}>`,
                    receiver: toEmail,
                    subject: 'Forgot Username',
                    content: emailDetails,
                    template: templateNewText
                }
                await lastValueFrom(this.commonMicroservice.send({ cmd: 'send_email' }, emaildata));
            }
            else{
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "If this e-mail exists in our database, we will send you a message with a link."));
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: 'An email has been sent with your username.',
            });
        } catch (error) {
            this.activityLogService.error_log(req?.tokenUser?.id,req?.originalUrl, error?.message, error, req);
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
    @Post('forgot-password')
    async forgotPassword(@Res() res, @Req() req, @Body() postData: any) {
        try {
            if (!postData?.email && !postData?.first_name && !postData?.last_name) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "Please enter your first name, last name, and e-mail/username or date of birth."));
            }
            let where = `user.first_name = '${postData?.first_name}' AND user.last_name = '${postData?.last_name}'`;
            if(postData?.dob && this.commonDateService.getTodayDate(postData?.dob).isValid()){
                where += ` AND user.dob = '${this.commonDateService.getTodayDate(postData?.dob).format('YYYY-MM-DD')}'`;
            }
            if(postData?.email){
                where += ` AND (user.email = '${postData?.email}' OR user.username = '${postData?.email}')`;
            }
            let userDetails = await this.authService.findOne(where,null, null, req);
            if(userDetails){
                const activationKey = this.commonService.generateMD5(Date.now() + Math.random().toString());
                await this.authService.update({id: userDetails.id},{activation_key: activationKey});
                let toEmail = userDetails['email'];
                let emailDetails = Object.create(null);
                emailDetails['type'] = 7;
                emailDetails['name'] = userDetails.first_name;
                emailDetails['reset_link'] = 'https://' + process.env.DOMAIN + '/reset-password/' +`${userDetails.username}/${activationKey}`;
                emailDetails['company_name'] = userDetails?.['company']?.['company_name'];
                const templateText = await this.communicationTemplateTextService.findOne({org_id: In([userDetails.org_id,0]), type: 7}); 
                let templateNewText = await this.urlManageService.onmapUrlContent(templateText?.['new_text'],'mailTemplate') || templateText?.['text'];
                let emaildata = {
                    sender: `Zomo Health<noreply@${process.env.DOMAIN}>`,
                    receiver: toEmail,
                    subject: `[Zomo Health] Reset Password`,
                    content: emailDetails,
                    template: templateNewText
                }
                await lastValueFrom(this.commonMicroservice.send({ cmd: 'send_email' }, emaildata));
            }
            else{
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "If this e-mail exists in our database, we will send you a message with a link."));
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: 'An email has been sent with instructions for resetting your password.',
            });
        } catch (error) {
            this.activityLogService.error_log(req?.tokenUser?.id,req?.originalUrl, error?.message, error, req);
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
    @Post('reset-password')
    async resetPassword(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try { 
            console.log(`reset password php postData =${postData}, headers: ${req.headers.authorization}`);  
            let phpData = {...postData, headers: req.headers.authorization};
            if (!postData?.encrypted_assertion && (!postData?.username && !postData?.activation_key)) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'Invalid link or Reset Key has been already used. Please click on Forgot Password link and check your mail.',),);
            }
            let where: any = { username: postData?.username , activation_key: postData?.activation_key };
            let activation_key;
            let decrypt_data;
            if(postData?.encrypted_assertion){
                if (!req.headers.authorization || req.headers.authorization.startsWith('Bearer ') == false) {
                    throw Error(this.translatorService.translate(req.lang, "ERR_MISSING_AUTHORIZATION"));
                }
                if(req.headers.authorization){
                    activation_key = req.headers.authorization.slice(7, req.headers.authorization.length);
                }
                const decipher = crypto.createDecipheriv('aes-256-cbc', secretKey, iv);
                let decrypted = decipher.update(postData?.encrypted_assertion, 'base64', 'utf8');
                decrypted += decipher.final('utf8');
                decrypt_data = decrypted.split(':::::');
                postData.password = decrypt_data[2];
                where = { id: decrypt_data[1], code: decrypt_data[0], activation_key: activation_key };
                console.log(`reset password php decrypt_data: ${decrypt_data}`);
                phpData['decrypt_data'] = decrypt_data;
                this.activityLogService.error_log(req?.tokenUser?.id, req?.originalUrl, 'reset-password-php', phpData, req) 
            }
            let recordDetails = await this.authService.findOne(where, null, null, req); 
            if (!recordDetails) {
                throw new Error(
                    await this.translatorService.frontendReadTranslation(
                        req.lang,
                        'Invalid link or Reset Key has been already used. Please click on Forgot Password link and check your mail.',
                    ),
                );
            }
            if(postData?.password){
                if(!recordDetails.new_password || recordDetails?.new_password == ''){
                }
                else{
                    let isMatch = await argon2.verify(Buffer.from(recordDetails.new_password, 'base64').toString('ascii'), postData?.password);
                    if(isMatch) {
                        throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'Make sure your new password is different than your current password','/LC_MESSAGES/Common/LoginPopup','static'));
                    }
                }
                postData.new_password = postData?.password;
                const activationKey = this.commonService.generateMD5(Date.now() + Math.random().toString());
                let updateData = {
                    activation_key: activationKey,
                    new_password: postData?.password
                };
                let encoded = postData?.password + secretPass;
                encoded =  Buffer.from(encoded, 'utf-8').toString('base64');
                updateData['activation_key'] = encoded;
                delete postData?.password;
                let updatedData = await this.authService.update({id: recordDetails.id},updateData);
                this.activityLogService.create(recordDetails, updateData, tableConstant.TBL_USERS, req.tokenUser?.id, 'reset-password-update');
                if(!postData?.encrypted_assertion){
                    let passwordEncrypt = this.commonService.passwordEncrypt(`${recordDetails.code}:::::${recordDetails.id}:::::${postData?.new_password}`);
                    await this.commonService.makeCurlRequest('POST', process.env.PASSWORDENCRYPTION, {encrypted_assertion: passwordEncrypt},{'Authorization': `Bearer ${encoded}`,'Content-Type': 'application/x-www-form-urlencoded'});                   
                }
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: 'Your password has been reset successfully. Please re-login.',
            });
        } catch (error) {
            this.activityLogService.error_log(req?.tokenUser?.id,req?.originalUrl, error?.message, error, req);
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

    @Post('verify-token')
    async verifyToken(@Req() req, @Res() res, @Body() postData) {
        try {
            const { token } = postData;

            if (!token) {
                throw new Error("Token missing");
            }

            const decoded: any = await this.authService.checkJwtToken(token);

            if (!decoded || !decoded.user_id) {
                throw new Error("Invalid token");
            }
            postData.id = decoded.user_id;
            postData.auto_login = '1';
            const responseData = await this.login(res,req,postData);
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                data: responseData,
            });
        } catch (error) {
            this.activityLogService.error_log(req?.tokenUser?.id,req?.originalUrl, error?.message, error, req);
            return res.status(HttpStatus.UNAUTHORIZED).json({
                statusCode: 401,
                success: 0,
                message: error.message
            });
        }
    }
    @Post('redirect-token')
    async redirectToken(@Req() req, @Res() res, @Body() postData) {
        try {
            if (!req.headers.authorization || req?.headers?.authorization?.startsWith('Bearer ') == false) {
                throw Error(this.translatorService.translate(req.lang, "ERR_MISSING_AUTHORIZATION"));
            }
            let token 
            if(req.headers.authorization){
                token = req.headers.authorization.slice(7, req.headers.authorization.length);
            }

            const decoded: any = await this.authService.checkJwtToken(token);
            if (!decoded) {
                throw new Error("Invalid token");
            }
            // validation checks need to be added here for redirect token
            let userData = {plugin: 'Users'};
            userData['user_id'] = decoded?.id;
            userData['role_id'] = decoded?.role_id;
            const responseData = await this.authService.jwtToken(userData, '1m');
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                data: {token: responseData},
            });
        } catch (error) {
            this.activityLogService.error_log(req?.tokenUser?.id,req?.originalUrl, error?.message, error, req);
            return res.status(HttpStatus.UNAUTHORIZED).json({
                statusCode: 401,
                success: 0,
                message: error.message
            });
        }
    }
    @Post('reset-password-link-check')
    async resetPasswordLinkCheck(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {         
            if (!postData?.username && !postData?.activation_key) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'Invalid link or Reset Key has been already used. Please click on Forgot Password link and check your mail.',),);
            }
            let where: any = { username: postData?.username , activation_key: postData?.activation_key };
            let recordDetails = await this.authService.findOne(where, null, null, req); 
            let data = {
                message: "Valid Link",
                password_reset: 1
            }
            if (!recordDetails) {
                data = {
                    message: 'Invalid link or Reset Key has been already used. Please click on Forgot Password link and check your mail.',
                    password_reset: 0
                }
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: data,
                message: 'success',
            });
        } catch (error) {
            this.activityLogService.error_log(req?.tokenUser?.id,req?.originalUrl, error?.message, error, req);
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

import { appConstant, tableConstant, UserEntity, UserLoginEntity, UserSettingsEntity, UserTokenEntity } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Request } from "express";
import { decode, sign, SignOptions, verify } from 'jsonwebtoken';
import { Repository } from 'typeorm';
import { ActivityLogService } from '../master/activitylog/activitylog.service';
@Injectable()
export class InternalService {
    constructor(
        @InjectRepository(UserEntity, appConstant.READ_LOGIN.toLowerCase())
        private readonly readReplicaUserRepository: Repository<UserEntity>,
        @InjectRepository(UserEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaUserRepository: Repository<UserEntity>,
        @InjectRepository(UserSettingsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaUserSettingRepository: Repository<UserSettingsEntity>,
        @InjectRepository(UserLoginEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaUserLoginRepository: Repository<UserLoginEntity>,
        @InjectRepository(UserTokenEntity, appConstant.READ_LOGIN.toLowerCase())
        private readonly readReplicaUserTokenRepository: Repository<UserTokenEntity>,
        @InjectRepository(UserTokenEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaUserTokenRepository: Repository<UserTokenEntity>,
        private readonly activityLogService: ActivityLogService,
    ) {}
    deviceData(tokenData: any, deviceDetails: any, token: string) {
        if (
            (deviceDetails && deviceDetails.os_name) ||
            deviceDetails.client_name.includes('Postman')
        ) {
            switch (deviceDetails.os_name) {
                case 'Windows':
                case 'browser':
                    tokenData['webToken'] = token;
                    break;
                case 'Android':
                case 'IOS':
                    tokenData['appToken'] = token;
                    break;
                default:
                    tokenData['webToken'] = token;
                    break;
            }
        }
        return tokenData;
    }
    async save(data: any, req) {
        let id = 100 + req.tokenUser?.role_id;
        const savedResult = this.writeReplicaUserRepository.create({...data, lastuniqid: id });
        return await this.writeReplicaUserRepository.save(savedResult);
    }
    async findOne(condition: any, orderBy = null, parameters = {}, req: Request = null) {
        try {
            if (!orderBy) {
                orderBy = { id: 'DESC' };
            }
            return await this.readReplicaUserRepository.createQueryBuilder('user')
            .leftJoinAndMapOne(
                'user.settings',
                tableConstant.TBL_USERS_SETTINGS,
                'settings',
                `settings.user_id = user.id`,
            )
            .leftJoinAndMapOne(
                'user.Location',
                tableConstant.COMPANIES.TBL_LOCATION,
                'Location',
                `Location.id = user.location`,
            )
            .leftJoinAndMapOne(
                'user.company',
                tableConstant.COMPANIES.TBL_COMPANY,
                'company',
                `company.id = user.org_id`,
            )
            .leftJoinAndMapOne(
                'company.setting',
                tableConstant.COMPANIES.TBL_COMPANY_SETTINGS,
                'setting',
                `setting.org_id = user.org_id`,
            )
            .leftJoinAndMapOne(
                'company.meta',
                tableConstant.COMPANIES.TBL_COMPANY_META,
                'meta',
                `meta.org_id = user.org_id`,
            )
            .leftJoinAndMapOne(
                'company.theme_setting',
                tableConstant.THEMES.TBL_THEMES_SETTINGS,
                'theme_setting',
                `theme_setting.org_id In(user.org_id,0) AND theme_setting.status = 1`,
            )
            .where(condition, parameters)
            .select(['user','settings','Location',
                'company.company_logo','company.status',
                'company.company_name',
                'company.deleted',
                'company.company_logo_dark',
                'setting.eligibility',
                'setting.img_option',
                'setting.img_area',
                'setting.first_login_by',
                'setting.pre_first_login_by',
                'setting.agreement_status',
                'setting.spouse_widget',
                'setting.spouse_option',
                'setting.chat_setting',                                               
                'setting.video_setting',                                          
                'setting.video_action',
                'setting.passport_menu',                         
                'setting.covid_menu',                            
                'setting.allow_du_login',                                         
                'setting.allow_ds_login',                                              
                'setting.chat_with_coach',                                            
                'setting.chat_type',                                             
                'setting.form_limit' ,
                'setting.show_quicklink_in_sidebar',
                'setting.is_emo_health_asssessments',
                'setting.pointsleaderboardpopup',
                'setting.pointsleaderboard',
                'setting.pointsleaderboardmin',
                'setting.user_popup_status',
                'setting.spouse_email_collection_on_off'   ,                          
                'setting.spouse_email_collection_required' ,
                'setting.title',/* not use remove in db*/
                'setting.popup_based_on',
                'setting.health_a_based_on',
                'setting.plan_order',
                'setting.user_form_setting',
                'setting.is_internationalization',
                'setting.census_status',
                'setting.employee_id',
                'setting.is_reqd_empid',
                'setting.e_timezone_setting',
                'setting.dashboard_point_leaboard',
                'setting.campaign_id',
                'setting.lock_username',
                'setting.hide_assessment',
                'setting.ha_biomatricstep_hs',
                'setting.health_form_mail',
                'setting.health_form_popup',
                'setting.editable_pdf',
                'meta.enable_widget',
                'meta.sso_dtext',
                'meta.sso_dlink',
                'meta.a_popup_status',
                'meta.a_popup_logo_status',
                'meta.user_popup_title',
                'theme_setting.id',
                'theme_setting.org_id',
                'theme_setting.theme_color',
                'theme_setting.header_color',
                'theme_setting.link_color',
                'theme_setting.icons_color',
                'theme_setting.button_color',
                'theme_setting.progress_color',
                'theme_setting.progress_hra_low_color',
                'theme_setting.progress_hra_mod_color',
                'theme_setting.progress_hra_high_color',
                'theme_setting.progress_hra_very_high_color',
                'theme_setting.progress_very_high_color',
                'theme_setting.table_color',
                'theme_setting.enable_theme_mode',
            ])
            .orderBy(`theme_setting.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
            .getOne();
        }
        catch (error) {
            this.activityLogService.error_log(req?.tokenUser?.id,req?.originalUrl, error?.message, error, req);
            if((typeof error == "string" && error?.includes('MySQL')) || error?.message?.includes('MySQL') || error?.message?.includes('--read-only option')){
                const dbHost = this.readReplicaUserRepository.manager.connection.options;
                console.log('connection details', {type: dbHost?.type, host: dbHost?.['host'], name: dbHost?.name, database: dbHost?.database});
            }
            return null;
        }
    }
    async generateJwtToken(data: any, deviceDetails: any, rememberMe: number = 0) {
        let expiresIn = rememberMe ? '29d' : appConstant.JWT.EXPIRES_IN; 
        const token = sign(data, appConstant.JWT.SECRET_KEY, {
            expiresIn
        } as SignOptions);
        let tokenData = { user_id: data.id };
        tokenData = this.deviceData(tokenData, deviceDetails, data.token);
        await this.upsertUserToken(tokenData);
        return token;
    }
    async generateRefreshJwtToken(data: any, rememberMe: number = 0) {
        return sign(data, appConstant.JWT.SECRET_KEY,{expiresIn: rememberMe ? '30d' : '60m'});
    }
    async checkJwtToken(token: string) {
        try {
            return verify(token, appConstant.JWT.SECRET_KEY);
        } catch (error) {
            return null;
        }
    }
    async checkRefreshToken(data: any) {
        try {
            const accessTokenData = verify(
                data.accessToken,
                appConstant.JWT.SECRET_KEY,
            );
            if (
                accessTokenData && data.refreshToken && data.refreshToken['id'] === accessTokenData['id']
            ) {
                return await this.findOne({
                    id: data.refreshToken['id'],
                    refresh_token: data.refreshToken.refreshToken,
                });
            }
        } catch (error) {
            let accessTokenData = decode(data.accessToken);
            if (
                accessTokenData && data.refreshToken && data.refreshToken['id'] === accessTokenData['id']
            ) {
                return await this.findOne({
                    id: data.refreshToken['id'],
                    refresh_token: data.refreshToken.refreshToken,
                });
            }
            return null;
        }
    }
    async upsertUserToken(tokenData: any) {
        const savedResult = await this.writeReplicaUserTokenRepository.createQueryBuilder(
            'userToken',
        )
            .update(UserTokenEntity)
            .set(tokenData)
            .where({ user_id: tokenData.user_id })
            .execute();
        if (!savedResult || savedResult?.affected == 0) {
            const savedResult = this.writeReplicaUserTokenRepository.create(tokenData);
            await this.writeReplicaUserTokenRepository.save(savedResult);
        }
        return true;
    }
    async update(condition: any, data: any) {
        if (data.new_password) {
            const entityToUpdate = new UserEntity();
            Object.assign(entityToUpdate, data);
            await entityToUpdate.hashPassword();
            data.new_password = entityToUpdate.new_password
        }
        await this.writeReplicaUserRepository.createQueryBuilder('user')
            .update(UserEntity)
            .set(data)
            .where(condition)
            .execute();
        return data;
    }
    async updateSetting(condition: any, data: any) {
        return await this.writeReplicaUserSettingRepository.createQueryBuilder('settings')
            .update(UserSettingsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async updateUserLogin(data: any) {
        const savedResult = this.writeReplicaUserLoginRepository.create(data);
        return await this.writeReplicaUserLoginRepository.save(savedResult);
    }
    async addDeviceToken(data: any, deviceDetails: any) {
        let tokenData = { user_id: data.user_id };
        tokenData = this.deviceData(tokenData, deviceDetails, data.token);
        return await this.upsertUserToken(tokenData);
    }
    async getUserDeviceToken(data: any) {
        return await this.readReplicaUserTokenRepository.createQueryBuilder('userToken')
        .where({ user_id: data.user_id })
        .getOne();
    }
}

import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { AppService } from './app.service';
import { FitbitCommonService } from "./common";

@Controller()
export class AppController {
    constructor(
        private readonly appService: AppService,
        private readonly fitbitCommonService: FitbitCommonService,
    ) {
    }

    @MessagePattern({cmd: 'paginate_auth_users'})
    async paginateAuthUsers(postData: any) {
        postData.where +=` AND authUser.consumer_key='${process.env.FITBIT_CLIENT_ID}'`;
        return await this.appService.paginateList(
            postData?.where,
            postData?.paginationParam
        );
    }

    @MessagePattern({cmd: 'get_one_auth_user'})
    getOneAuthUser(postData: any) {
        postData.where +=` AND authUser.consumer_key='${process.env.FITBIT_CLIENT_ID}'`;
        return this.appService.findOne(postData?.where, postData?.fields);
    }

    @MessagePattern({cmd: 'create_auth_user'})
    async createAuthUser(postData: any) {
        let tokenResponse = await this.fitbitCommonService.fetchFitbitToken(postData.code);
        typeof tokenResponse === 'string' && (tokenResponse = JSON.parse(tokenResponse));
        const accessToken = tokenResponse?.access_token;
        if (tokenResponse?.errors || !accessToken) {
            return "FITBIT_CODE_ERROR";
        }
        let fitbitUserProfile = await this.fitbitCommonService.fetchFitbitUserProfile(accessToken);
        typeof fitbitUserProfile === 'string' && (fitbitUserProfile = JSON.parse(fitbitUserProfile));
        if (fitbitUserProfile?.errors || !fitbitUserProfile || !fitbitUserProfile?.user) {
            return "FITBIT_PROFILE_ERROR";
        }
        const app_id = fitbitUserProfile?.user?.encodedId;
        const existingUser = await this.appService.findOne(`authUser.status!=2 AND authUser.app_name='Fitbit' AND authUser.app_id='${app_id}'`, ['authUser.id']);
        if (existingUser) {
            return "USER_FITBIT_ACCOUNT_LINKED_WITH_ANOTHER_USER";
        }
        const userData = {
            user_id: postData.user_id,
            username: postData.username,
            statusFB: 'NA',
            consumer_key: process.env.FITBIT_CLIENT_ID,
            consumer_secret: process.env.FITBIT_CLIENT_SECRET,
            token_key: JSON.stringify(tokenResponse),
            token_secret: '',
            app_name: 'Fitbit',
            app_id: app_id,
            user_timezone: fitbitUserProfile?.user?.timezone || 'UTC'
        };
        await this.appService.save(userData);
        return "SUCCESS";
    }

    @MessagePattern({cmd: 'delete_auth_user'})
    deleteAuthUser(postData: any) {
        return this.appService.update(postData?.condition, postData?.data);
    }

    @MessagePattern({cmd: 'get_auth_url_fitbit'})
    getFitbitAuthURL() {
        return `${process.env.FITBIT_AUTHORISZATION_URL}/oauth2/authorize?response_type=code&client_id=${process.env.FITBIT_CLIENT_ID}&redirect_uri=${process.env.FITBIT_REDIRECT_URI}&scope=${encodeURIComponent('activity sleep profile')}&expires_in=604800`;
    }

    @MessagePattern({cmd: 'sync_fitbit_steps'})
    async syncFitbitSteps(postData: any) {
        return await this.appService.syncSteps(postData);
    }
    
    @MessagePattern({ cmd: 'test' })
    test() {
      return true;
    }
}

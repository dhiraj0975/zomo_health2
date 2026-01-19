import { CommonDateService, CommonService } from "@common-constants";
import { Injectable } from '@nestjs/common';

@Injectable()
export class FitbitCommonService {
    constructor(
        private readonly commonService: CommonService,
        private readonly commonDateService: CommonDateService
    ) {}

    async fetchFitbitToken(code: string): Promise<any> {
        try {
            const { FITBIT_CLIENT_ID, FITBIT_CLIENT_SECRET, FITBIT_REDIRECT_URI, FITBIT_ENDPOINT_URL } = process.env;
            if (!FITBIT_CLIENT_ID || !FITBIT_CLIENT_SECRET || !FITBIT_REDIRECT_URI || !FITBIT_ENDPOINT_URL) {
                throw new Error('Missing Fitbit Environment Configuration.');
            }
            const params = new URLSearchParams({
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: FITBIT_REDIRECT_URI,
                client_id: FITBIT_CLIENT_ID,
            });
            const headers = {
                Authorization: 'Basic ' + Buffer.from(`${FITBIT_CLIENT_ID}:${FITBIT_CLIENT_SECRET}`).toString('base64'),
                'Content-Type': 'application/x-www-form-urlencoded',
            };
            const accessTokenURL = `${FITBIT_ENDPOINT_URL}/oauth2/token`;
            return await this.commonService.makeCurlRequest(
                'POST',
                accessTokenURL,
                params,
                headers,
                true
            );
        } catch(err){
            throw new Error(err.message);
        }
    }

    async fetchFitbitUserProfile(accessToken: string): Promise<any> {
        try {
            const { FITBIT_ENDPOINT_URL } = process.env;
            if (!FITBIT_ENDPOINT_URL) {
                throw new Error('Missing Fitbit Environment Configuration.');
            }
            const headers = {
                Authorization: `Bearer ${accessToken}`
            };
            const fitbitUserProfileUrl = `${FITBIT_ENDPOINT_URL}/1/user/-/profile.json`;
            return await this.commonService.makeCurlRequest(
                'GET',
                fitbitUserProfileUrl,
                null,
                headers,
                true
            );
        } catch(err){
            throw new Error(err.message);
        }
    }

    async refreshFitbitToken(refreshToken: string): Promise<any> {
        try {
            const { FITBIT_CLIENT_ID, FITBIT_CLIENT_SECRET, FITBIT_ENDPOINT_URL } = process.env;
            if (!FITBIT_CLIENT_ID || !FITBIT_CLIENT_SECRET || !FITBIT_ENDPOINT_URL) {
                throw new Error('Missing Fitbit Environment Configuration.');
            }
            const refreshTokenURL = `${FITBIT_ENDPOINT_URL}/oauth2/token`;
            const headers = {
                Authorization: 'Basic ' + Buffer.from(`${FITBIT_CLIENT_ID}:${FITBIT_CLIENT_SECRET}`).toString('base64'),
                'Content-Type': 'application/x-www-form-urlencoded'
            };
            const params = new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: refreshToken,
            });
            return await this.commonService.makeCurlRequest(
                'POST',
                refreshTokenURL,
                params,
                headers,
                true
            );
        } catch(err){
            throw new Error(err.message);
        }
    }

    async fetchSteps(accessToken: string, startDate: string, endDate: string): Promise<any> {
        try {
            const { FITBIT_ENDPOINT_URL } = process.env;
            if (!FITBIT_ENDPOINT_URL) {
                throw new Error('Missing Fitbit Environment Configuration.');
            }
            const headers = {
                Authorization: `Bearer ${accessToken}`
            };
            const fitbitStepsUrl = `${FITBIT_ENDPOINT_URL}/1/user/-/activities/steps/date/${startDate}/${endDate}.json`;
            return await this.commonService.makeCurlRequest(
                'GET',
                fitbitStepsUrl,
                null,
                headers,
                true
            );
        } catch(err){
            return "FITBIT_GET_STEP_API_ERROR";
        }
    }

    getDateRange(duration: string, customStartDate?: string): { startDate: string; endDate: string } {
        let startDate: any;
        let endDate = this.commonDateService.getTodayDate().format('YYYY-MM-DD');
        if (customStartDate) {
            endDate = this.commonDateService.getTodayDate(customStartDate);
            if (!endDate.isValid()) {
                endDate = this.commonDateService.getTodayDate().format('YYYY-MM-DD');
            }
            endDate = endDate.format('YYYY-MM-DD');
        }
        switch (duration) {
            case '3d':
                startDate = this.commonDateService.getTodayDate(endDate).subtract(3, 'days').format('YYYY-MM-DD');
                break;
            case '7d':
                startDate = this.commonDateService.getTodayDate(endDate).subtract(7, 'days').format('YYYY-MM-DD');
                break;
            case '1m':
                startDate = this.commonDateService.getTodayDate(customStartDate).startOf('month').format('YYYY-MM-DD');
                endDate   = this.commonDateService.getTodayDate(customStartDate).endOf('month').format('YYYY-MM-DD');
                if(this.commonDateService.getTodayDate(endDate).isAfter(this.commonDateService.getTodayDate())){
                    endDate = this.commonDateService.getTodayDate().format('YYYY-MM-DD');
                }
                break;
            default:
                startDate = endDate;
        }
        return { startDate, endDate };
    }
}

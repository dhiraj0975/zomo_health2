import {
    appConstant
} from '@common-constants';
import { Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { ActivityLogService } from '../module/master/activitylog/activitylog.service';
export class CronCommonService {
    constructor(
        private readonly activityLogService: ActivityLogService,
        @Inject('TIMEZONE_SERVICE')
        private timeZoneMicroservice: ClientProxy,
    ) {}

    async errorLog(
        user_id: number = 0,
        endPoint: any = '',
        message: any = '',
        log: any = '',
        req: any = '',
    ): Promise<void> {
        this.activityLogService.errorLog(user_id, endPoint, message, log, req);
    }

    async onmapUrlContent(
        content: string | null | undefined,
        type: string = '',
    ): Promise<string> {
        if (!content) return '';
        let userDomain: string = 'https://' + process.env.DOMAIN;
        let domains: string[] = appConstant.DOMAINS_LIST;
        if (type == 'mailTemplate') {
            domains.push('{{IMAGE_BASE_URL}}');
        }
        // Create one regex pattern to match all domains
        const pattern = new RegExp(
            '(' +
                domains
                    .map((domain) =>
                        domain.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'),
                    ) // Escape special characters
                    .join('|') +
                ')',
            'gi',
        );
        return content.replace(pattern, userDomain);
    }

    async stateList(statecode, req: any, stateArray: string[] = []){
        try {
            let stateData;
            let where = { countrycode: 'US' };
            if (statecode) {
                where['statecode'] = statecode;
            }
            if (stateArray.length) {
                where['state'] = stateArray.join("','");
            }
            let timezoneData = await lastValueFrom(
                this.timeZoneMicroservice.send({ cmd: 'state_list' }, [where]),
            );
            stateData = timezoneData;
            where['countrycode'] = 'CA';
            timezoneData = await lastValueFrom(
                this.timeZoneMicroservice.send({ cmd: 'state_list' }, [where]),
            );
            stateData = [...stateData, ...timezoneData];
            return stateData;
        } catch (error) {
            throw new Error(error.message);
        }
    }
}

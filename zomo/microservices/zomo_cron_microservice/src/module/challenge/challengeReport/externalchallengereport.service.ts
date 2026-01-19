import {
    CommonArrayService,
    CommonDateService,
    CommonHealthService,
    ScheduleChallengeEntity,
    tableConstant
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { cronAppConstant } from 'src/common';
import { ActivityFeedService } from 'src/module/tracker/activityfeeds.service';
import { UserService } from 'src/module/user/user.service';
import { ChallengeExternalLinkService } from '../externallinkuser/externallinkuser.service';
import { TeamsService } from '../team/teams.service';
import { TeamMembersService } from '../teammember/teammembers.service';
const moment = require('moment-timezone');

@Injectable()
export class ExternalChallengeReportService {
    constructor(
        private readonly commonDateService: CommonDateService,
        private readonly userService: UserService,
        private readonly commonArrayService: CommonArrayService,
        private readonly activityFeedsService: ActivityFeedService,
        private readonly commonHealthService: CommonHealthService,
        private readonly teamsService: TeamsService,
        private readonly teamMembersService: TeamMembersService,
        private readonly challengeExternalLinkService: ChallengeExternalLinkService,
    ) {}

    async externalChallengeReport(schedule: Partial<ScheduleChallengeEntity>,condition: string = '',result_type: number = 1,paginateObj: any = null, activityList = []) {
        try {
            let result = await this.externalChallengeReportHelper(
                schedule,
                condition.replace(/User/gi, "user"),
                result_type,
                paginateObj,
                activityList,
            );
            return result;
        } catch (error) {
            throw new Error(error);
        }
    }

    async externalChallengeReportHelper(schedule: Partial<ScheduleChallengeEntity>, condition: string = '', result_type: number = 1, paginateObj: any = null, activityList = []) {
        try {
            let joinTable = [
                {'alias':'user', 'table' : tableConstant.TBL_USERS, 'on' : `elu.user_id = user.id`, 'connect' : 'elu', 'type' : 'LEFT' },
                {'alias':'sc', 'table' : tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE, 'on' : `sc.id = elu.schedule_id` , 'connect' : 'user', 'type' : 'INNER' },
                {'alias':'company', 'table' : tableConstant.COMPANIES.TBL_COMPANY, 'on' : `company.id = user.org_id AND company.status = 1`, 'connect' : 'user', 'type' : 'LEFT' },
                {'alias':'companySetting', 'table' : tableConstant.COMPANIES.TBL_COMPANY_SETTINGS, 'on' : `companySetting.org_id = user.org_id`, 'connect' : 'user', 'type' : 'LEFT' },
                {'alias':'department', 'table' : tableConstant.COMPANIES.TBL_DEPARTMENT, 'on' : `department.id = user.department_id`, 'connect' : 'user', 'type' : 'LEFT' },
                {'alias':'Location', 'table' : tableConstant.COMPANIES.TBL_LOCATION, 'on' : `Location.id = user.location`, 'connect' : 'user', 'type' : 'LEFT' },
            ];
            let fields = ['elu','user','Location','department.id','department.dept_name','company.id','company.company_name','companySetting.spouse_option'];
            let recordList = await this.challengeExternalLinkService.listRecord(condition.replace('scj','elu'),null,fields,null,joinTable);

            const userMap = new Map<number, typeof recordList[0] & { count: number }>();
            for (const record of recordList) {
                const { user_id } = record;
                if (userMap.has(user_id)) {
                    userMap.get(user_id)!.count += 1;
                } else {
                    userMap.set(user_id, { ...record['user'], count: 1 });
                }
            }
            const userList = Array.from(userMap.values());
            if(userList.length){     
                if(result_type == 2){
                    let clm_name_arr = [...cronAppConstant.USER_HEADER_DATA,'CLICK COUNT'];
                    let resultData = {};
                    const clm_data_user = await Promise.all(
                        userList.map(async (user) => {
                            const row: any[] = [];
                            const tempdatainfo = await this.commonHealthService.CommonFieldDataCallingCovid(user,clm_name_arr);
                            row.push(...Object.values(tempdatainfo));
                            row.push(user.count)
                            return row;
                        }),
                    );
                    let userSheetData = [clm_name_arr, ...clm_data_user];
                    resultData['user'] = userSheetData;
                    return resultData;
                }
            }
            if (result_type == 1) {
                const finalPaginateObj = this.commonArrayService.getPaginationVar(paginateObj?.page || 1, paginateObj?.limit || 10);
                let total = userList?.length || 0;
                let resultDetails = this.commonArrayService.paginationResponseChallengeReport(userList, total, finalPaginateObj);
                return resultDetails;
            }
        } catch (error) {
            throw new Error(error);
        }
    }
}

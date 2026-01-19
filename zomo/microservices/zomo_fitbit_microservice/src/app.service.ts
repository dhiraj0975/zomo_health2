import { ActivityFeedsEntity, appConstant, CommonArrayService, CommonDateService, CommonFileService, FtAuthorizedUsersEntity, tableConstant } from "@common-constants";
import { Injectable } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FitbitCommonService } from "./common";
import { PaginateWithAuthUserInput } from "./input";

@Injectable()
export class AppService {
    constructor(
        private schedulerRegistry: SchedulerRegistry,
        @InjectRepository(FtAuthorizedUsersEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaAuthorizedUsersRepository: Repository<FtAuthorizedUsersEntity>,
        @InjectRepository(FtAuthorizedUsersEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaAuthorizedUsersRepository: Repository<FtAuthorizedUsersEntity>,
        @InjectRepository(ActivityFeedsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaActivityFeedsRepository: Repository<ActivityFeedsEntity>,
        @InjectRepository(ActivityFeedsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaActivityFeedsRepository: Repository<ActivityFeedsEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
        private readonly fitbitCommonService: FitbitCommonService,
        private readonly commonDateService: CommonDateService
    ) {
        this.createFitbitCronJobs();
        /*this.fitbitSyncJob({ duration: '7d' });*/
    }

    private createFitbitCronJobs() {
        /*const jobs = [
            { name: 'fitbitSync7Days_5am', time: '0 5 * * *', data: { duration: '7d' } },
            { name: 'fitbitSync1Day_6am', time: '0 6 * * *', data: { duration: '1d' } },
            { name: 'fitbitSync1Day_7am', time: '0 7 * * *', data: { duration: '1d' } },
            { name: 'fitbitSync1Day_8am', time: '0 8 * * *', data: { duration: '1d' } },
            { name: 'fitbitSync7Days_9am', time: '0 9 * * *', data: { duration: '7d' } },
            { name: 'fitbitSync3Days_10am', time: '0 10 * * *', data: { duration: '3d' } },
            { name: 'fitbitSync1Day_11am', time: '0 11 * * *', data: { duration: '1d' } },
            { name: 'fitbitSync1Day_12pm', time: '0 12 * * *', data: { duration: '1d' } },
            { name: 'fitbitSync1Day_1pm', time: '0 13 * * *', data: { duration: '1d' } },
            { name: 'fitbitSync1Day_1_40pm', time: '40 13 * * *', data: { duration: '1d' } },
            { name: 'fitbitSync3Days_1am', time: '0 1 * * *', data: { duration: '3d' } },
            { name: 'fitbitSync1Day_2am', time: '0 2 * * *', data: { duration: '1d' } },
            { name: 'fitbitSync1Day_3am', time: '0 3 * * *', data: { duration: '1d' } },
            { name: 'fitbitSync1Day_4am', time: '0 4 * * *', data: { duration: '1d' } },
            { name: 'fitbitSync1Day_3pm', time: '0 15 * * *', data: { duration: '1d' } },
            { name: 'fitbitSync1Day_4pm', time: '0 16 * * *', data: { duration: '1d' } },
            { name: 'fitbitSync1Day_5pm', time: '0 17 * * *', data: { duration: '1d' } },
            { name: 'fitbitSync1Day_6pm', time: '0 18 * * *', data: { duration: '1d' } },
            { name: 'fitbitSync1Day_7pm', time: '0 19 * * *', data: { duration: '1d' } },
            { name: 'fitbitSync1Day_8pm', time: '0 20 * * *', data: { duration: '1d' } },
            { name: 'fitbitSync3Days_9pm', time: '0 21 * * *', data: { duration: '3d' } },
            { name: 'fitbitSync1Day_10pm', time: '0 22 * * *', data: { duration: '1d' } },
            { name: 'fitbitSync1Day_11pm', time: '0 23 * * *', data: { duration: '1d' } },
            { name: 'fitbitSync1Day_midnight', time: '0 0 * * *', data: { duration: '1d' } }
        ];

        for (const job of jobs) {
            try {
                const cronJob = new CronJob(job.time, async () => {
                    try {
                        console.log(`[CronService] ${job.name} started at ${new Date()}`);
                        await this.fitbitSyncJob(job.data);
                        console.log(`[CronService] ${job.name} completed`);
                    } catch (err) {
                        console.error(`[CronService] Error in ${job.name}:`, err);
                    }
                });

                this.schedulerRegistry.addCronJob(`CronService.${job.name}`, cronJob);
                cronJob.start();
                console.log(`[CronService] ${job.name} scheduled with cron: ${job.time}`);
            } catch (error) {
                console.error(`[CronService] Failed to schedule ${job.name}:`, error);
            }
        }*/
    }

    async fitbitSyncJob(data: any) {
        try {
            const { duration } = data;
            const { FITBIT_CLIENT_ID } = process.env;
            let date = this.commonDateService.getTodayDate().format('YYYY-MM-DD');
            const authUsers = await this.listAuthorizedUsers({ status: '1', consumer_key: FITBIT_CLIENT_ID });
            const results = [];
            for (const authUser of authUsers) {
                const syncStatus = await this.syncSteps({authUser: authUser, duration: duration, date: date});
                results.push({
                    userId: authUser.user_id,
                    message: syncStatus,
                });
            }
            return {
                success: true,
                message: `Finished Fitbit sync for ${authUsers.length} user(s).`,
                results,
            };
        } catch (err) {
            console.error('Error in Fitbit Sync Job:', err);
        }
    }

    async paginateList(condition: any, paginationParam: PaginateWithAuthUserInput) {
        try{
            const paginateObj = this.commonArrayService.getPaginationVar(
                paginationParam.page || 1,
                paginationParam.limit,
            );
            const order =
                paginationParam && paginationParam.order
                    ? paginationParam.order
                    : 'DESC';
            const orderBy =
                paginationParam && paginationParam.order_by
                    ? paginationParam.order_by
                    : 'authUser.id';
            const queryResult = await this.readReplicaAuthorizedUsersRepository.createQueryBuilder('authUser')
                .leftJoinAndMapOne(
                    'authUser.user',
                    tableConstant.TBL_USERS,
                    'user',
                    `user.id = authUser.user_id`,
                )
                .leftJoinAndMapOne(
                    'authUser.company',
                    tableConstant.COMPANIES.TBL_COMPANY,
                    'company',
                    `company.id = user.org_id AND company.status = 1`,
                )
                .where(condition)
                .orderBy(orderBy, <any>order)
                .take(paginateObj.take)
                .skip(paginateObj.skip)
                .getManyAndCount();
            const [result, total] = queryResult;
            return {
                list: result,
                total: total,
                pages: Math.ceil(total / paginateObj.take),
                limit: paginateObj.take,
                page: paginateObj.page,
            };
        } catch (err) {
            console.error('Error in Fitbit Paginage:', err);
        }
    }

    async findOne(condition: any, fields: any = []) {
        return await this.readReplicaAuthorizedUsersRepository.createQueryBuilder('authUser')
            .where(condition)
            .select(fields.length > 0 ? fields : ['authUser.id','authUser.username'])
            .getOne();
    }

    async save(data: any) {
        const savedResult = this.writeReplicaAuthorizedUsersRepository.create(data);
        return await this.writeReplicaAuthorizedUsersRepository.insert(savedResult);
    }

    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaAuthorizedUsersRepository.metadata);
        return await this.writeReplicaAuthorizedUsersRepository.createQueryBuilder('authUser')
            .update(FtAuthorizedUsersEntity)
            .set(data)
            .where(condition)
            .execute();
    }

    async listAuthorizedUsers(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = {id: 'DESC'};
        }
        return await this.readReplicaAuthorizedUsersRepository.find({
            where: condition,
            select: ['id', 'user_id', 'username', 'token_key', 'app_id'],
            order: orderBy,
        });
    }

    async syncSteps(data: any) {
        try {
            const { authUser, duration, date } = data;
            if (!authUser || !duration || !date) {
                return "FITBIT_MISSING_PARAMS";
            }
            const { id, user_id, username, app_id } = authUser;
            let { token_key } = authUser;
            token_key && (typeof token_key === 'string') && (token_key = JSON.parse(token_key));
            const { access_token, refresh_token, scope, token_type } = token_key;
            if (!id || !user_id || !username || !app_id || !access_token || !refresh_token || !scope || !token_type) {
                return "FITBIT_MISSING_AUTH_PARAMS";
            }
            const { startDate, endDate } = this.fitbitCommonService.getDateRange(duration, date);
            let stepData = await this.fitbitCommonService.fetchSteps(access_token, startDate, endDate);
            stepData && (typeof stepData === 'string') && (stepData = JSON.parse(stepData));
            if (stepData?.errors || !stepData || !stepData['activities-steps']) {
                const newTokenResponse = await this.fitbitCommonService.refreshFitbitToken(refresh_token);
                let token_key = newTokenResponse;
                token_key && (typeof token_key === 'string') && (token_key = JSON.parse(token_key));
                if (token_key?.errors || !token_key || !token_key.access_token) {
                    return "FITBIT_REFRESH_TOKEN_ERROR";
                }
                const { access_token: newAccessToken } = token_key;
                await this.update({ id: id }, { token_key: newTokenResponse });
                stepData = await this.fitbitCommonService.fetchSteps(newAccessToken, startDate, endDate);
                stepData && (typeof stepData === 'string') && (stepData = JSON.parse(stepData));
                if (stepData?.errors || !stepData || !stepData['activities-steps']) {
                    return "FITBIT_STEP_API_ERROR";
                }
            }
            stepData = stepData['activities-steps'];
            if(stepData.length === 0) {
                return "FITBIT_STEP_DATA_NOT_FOUND";
            }
            for (const step of stepData) {
                const { dateTime: collectionDate, value } = step;
                const steps = Number(value);
                if (steps > 0) {
                    const stepPayload = {
                        user_id: user_id,
                        userName: username,
                        appId: app_id,
                        appName: 'Fitbit',
                        logType: 'Tracker',
                        logId: 0,
                        activityId: 0,
                        parentId: 0,
                        parentName: 'Fitness',
                        calories: 0,
                        steps,
                        distance: 0,
                        duration: 0,
                        hasStartTime: '',
                        startTime: this.commonDateService.getTodayDate().format('HH:mm'),
                        timeFormat: '24',
                        isFavorite: '',
                        description: '',
                        collectionDate,
                        activityName: 'Steps',
                        unit: 'steps',
                        activityTypeId: '11',
                        activityType: 'Steps',
                    };
                    const existing = await this.findOneActivity(`actFeed.user_id='${user_id}' AND actFeed.collectionDate='${collectionDate}' AND actFeed.appName='Fitbit' AND actFeed.logType='Tracker' AND actFeed.status!=2`, ['actFeed.acId', 'actFeed.steps']);
                    if (!existing) {
                        await this.saveActivity(stepPayload);
                    } else {
                        if (existing.steps != steps) {
                            await this.updateActivity({ acId: existing.acId }, stepPayload);
                        }
                    }
                }
            }
            return "SUCCESS";
        } catch (error) {
            console.log(error);
            return "FITBIT_STEP_SYNC_CODE_ERROR";
        }
    }

    async findOneActivity(condition: any, fields: any = []) {
        return await this.readReplicaActivityFeedsRepository.createQueryBuilder('actFeed')
            .where(condition)
            .select(fields.length > 0 ? fields : ['actFeed.acId'])
            .getOne();
    }

    async saveActivity(data: any) {
        const savedResult = this.writeReplicaActivityFeedsRepository.create(data);
        return await this.writeReplicaActivityFeedsRepository.insert(savedResult);
    }
    async updateActivity(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaActivityFeedsRepository.metadata);
        return await this.writeReplicaActivityFeedsRepository.createQueryBuilder('actFeed')
            .update(ActivityFeedsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
}

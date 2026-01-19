import {
    appConstant,
    BaseService,
    CensusCustomFieldsEntity,
    CensusCustomFieldsValuesEntity,
    CommonArrayService,
    CommonDateService,
    CommonFileService,
    CommonHealthService,
    CommonService,
    IncentiveReportsEntity,
    LocationsEntity,
    tableConstant,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class IncentiveReportsService extends BaseService<IncentiveReportsEntity> {
    constructor(
        @InjectRepository(
            IncentiveReportsEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaIncentiveReportsRepository: Repository<IncentiveReportsEntity>,
        @InjectRepository(
            IncentiveReportsEntity,
            appConstant.MAIN.toLowerCase(),
        )
        private readonly writeReplicaIncentiveReportsRepository: Repository<IncentiveReportsEntity>,
        @InjectRepository(
            LocationsEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaLocationsRepository: Repository<LocationsEntity>,
        @InjectRepository(LocationsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaLocationsRepository: Repository<LocationsEntity>,
        @InjectRepository(
            CensusCustomFieldsEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaCensusCustomFieldsRepository: Repository<CensusCustomFieldsEntity>,
        @InjectRepository(
            CensusCustomFieldsValuesEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaCensusCustomFieldsValuesRepository: Repository<CensusCustomFieldsValuesEntity>,
        @InjectRepository(
            CensusCustomFieldsEntity,
            appConstant.MAIN.toLowerCase(),
        )
        private readonly writeReplicaCensusCustomFieldsRepository: Repository<CensusCustomFieldsEntity>,
        private readonly commonService: CommonService,
        commonArrayService: CommonArrayService,
        private readonly commonDateService: CommonDateService,
        private readonly commonFileService: CommonFileService,
        private readonly commonHealthService: CommonHealthService,
    ) {
        super(
            readReplicaIncentiveReportsRepository,
            writeReplicaIncentiveReportsRepository,
            'incentiveReports',
            commonArrayService,
        );
    }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaIncentiveReportsRepository.findOne({
            where: condition,
            order: orderBy,
        });
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaIncentiveReportsRepository.find({
            where: condition,
            select: ['id', 'user_id', 'org_id', 'membership_code'],
            order: orderBy,
        });
    }
    async listRecordReport(condition: any) {
        const queryBuilder = this.readReplicaIncentiveReportsRepository
            .createQueryBuilder()
            .where(condition);
        const result = await queryBuilder.getMany();
        return result;
    }
    async listIARecord(condition: any, orderBy: any = null, fields: any = []) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        const queryResult = await this.readReplicaIncentiveReportsRepository
            .createQueryBuilder('incentivereports')
            .innerJoinAndMapOne(
                'incentivereports.automaticreportSetting',
                tableConstant.REPORT.TBL_AU_AUTO_REPORT_SETTINGS,
                'automaticreportSetting',
                `incentivereports.report_setting_id = automaticreportSetting.id`,
            );
        return await queryResult
            .select(fields)
            .where(condition)
            .orderBy(
                `incentivereports.${Object.keys(orderBy)[0]}`,
                orderBy[Object.keys(orderBy)[0]],
            )
            .getMany();
    }
    async save(data: any) {
        const savedResult =
            this.writeReplicaIncentiveReportsRepository.create(data);
        return await this.writeReplicaIncentiveReportsRepository.save(
            savedResult,
        );
    }
    async update(condition: any, data: any, type: string = '') {
        data = await this.commonFileService.filterDataByEntityColumns(
            data,
            this.writeReplicaIncentiveReportsRepository.metadata,
        );
        if (data.auto_report_zip_password) {
            const entityToUpdate = new IncentiveReportsEntity();
            Object.assign(entityToUpdate, data);
            await entityToUpdate.hashPassword();
            data.auto_report_zip_password =
                entityToUpdate.auto_report_zip_password;
        }
        let query = this.writeReplicaIncentiveReportsRepository
            .createQueryBuilder('incentivereports')
            .update(IncentiveReportsEntity)
            .set(data)
            .where(condition);
            if(type == 'limit'){
                query = query.limit(1);
            }
            return await query.execute();
    }
    async updateIncentiveReports(reportType: string) {
        if (reportType) {
            return await this.writeReplicaIncentiveReportsRepository
                .createQueryBuilder()
                .update(IncentiveReportsEntity)
                .set({
                    total_download: () => 'total_download + 1',
                    status: 0,
                })
                .where({ report_type: `${reportType}` })
                .andWhere('created_date < NOW() - INTERVAL 4 HOUR')
                .andWhere('status = 2')
                .limit(1)
                .execute();
        }
    }
    async getLocations(condition: any, fields: any = []) {
        return await this.readReplicaLocationsRepository.find({
            where: condition,
            select: fields,
        });
    }
    async getCensusCustomFields(condition: any, fields: any = []) {
        return await this.readReplicaCensusCustomFieldsRepository.find({
            where: condition,
            select: fields,
        });
    }
    async getUserCensusFieldValue(condition: any, fields: any = []) {
        return await this.readReplicaCensusCustomFieldsValuesRepository.find({
            where: condition,
            select: fields,
        });
    }
    async customQueryRun(query: string) {
        return await this.readReplicaIncentiveReportsRepository.query(query);
    }
    async findOneReport(condition: string) {
        return await this.readReplicaIncentiveReportsRepository
            .createQueryBuilder('incentivereports')
            .leftJoinAndMapOne(
                'incentivereports.company',
                tableConstant.COMPANIES.TBL_COMPANY,
                'company',
                `company.id = incentivereports.org_id`,
            )
            .where(condition)
            .limit(1)
            .orderBy('incentivereports.request_date', 'ASC')
            .getOne();
    }

    async campaignActivityCalculation(type:any = 'user',userId:any = null, activityArrays:any = [], otherDatas:any = []){
        let {
            rewardKey = 0,
            tempRewardCdateR = 'required_by_user',
            requiredUser = [],
            OptionalUser = [],
            ComprequiredUser = [],
            CompOptionalUser = [],
            sliderSetting = null,
            userDateOfHireTS = '',
            userDateOfHire = '',
            afterDeadline = false,
            userMeetRequirementDate = '',
            headerDataManyActualActivity = 0,
            tmpUserRewardTmp = {},
            tmpRewardAll = [],
            TotalRequiredactivity = 0,
            rewardHireDateSetting = 0,
        } = Object.assign({}, ...otherDatas);
        if (activityArrays && activityArrays?.length > 0) {
            for (const act of activityArrays) {
                let dateOne = '', dateTwo = '', dateThree = '';
                let actPoint: string | number = 0;
                let actCustPoint = 0;
                let actDate = "";
                const activityID = act?.['id'] || 0;
                const activityMaxPoint = Number(act?.['max_point']) || 0;
                const activityQuantity = Number(act?.['quentity']) || 0;
                const activityPointForEach = Number(act?.['point_for_each']) || 0;
                const activityConsiderAfrerDeadline = Number(act?.['consider_after_deadline']) || 0;
                const activityConsiderAfrerDeadlineDate = act?.['after_deadline_date'] || '';
                const actStartDate:any = act['start_date'];
                const actEndDate:any = act['end_date'];
                const actStartDateTS:any = await this.commonDateService.DateTimeFormat(act['start_date'],'timestamp','YYYY-MM-DD HH:mm:ss');
                const actEndDateTS:any = await this.commonDateService.DateTimeFormat(act['end_date'],'timestamp','YYYY-MM-DD HH:mm:ss');
                if (act?.['custompoint'] && Object.keys(act?.['custompoint'])?.length > 0) {
                    if(act?.['custompoint']?.[userId]){
                        actCustPoint += act['custompoint'][userId]['Total'];
                        actDate = act['custompoint'][userId]['Time'];
                        if(!act?.['users']?.[userId]){
                            let rewardCompAry = [];
                            let activityCompAry = [];
                            for (let [keyCA, valueCA] of Object.entries(act.custompoint[userId].rewardCompAry)) {
                                valueCA = (typeof valueCA === 'string') ? parseInt(valueCA) : valueCA;
                                const rewardTotals = Object.values(rewardCompAry).reduce((sum:any, value:any) => sum + value, 0);
                                if(rewardTotals != activityMaxPoint){
                                    let newValue = (rewardTotals as number) + (valueCA as number);
                                    if(newValue > activityMaxPoint){
                                        if(rewardCompAry[keyCA]){
                                            rewardCompAry[keyCA] += (activityMaxPoint - (rewardTotals as number));
                                        }else{
                                            rewardCompAry[keyCA] = (activityMaxPoint - (rewardTotals as number));
                                        }
                                    }else{
                                        if(rewardCompAry[keyCA]){
                                            rewardCompAry[keyCA] += (valueCA as number);
                                        }else{
                                            rewardCompAry[keyCA] = (valueCA as number);
                                        }
                                    }
                                }
                            }
                            for (let [keyCA, valueCA] of Object.entries(act.custompoint[userId].activityCompAry)) {
                                valueCA = (typeof valueCA === 'string') ? parseInt(valueCA) : valueCA;
                                const rewardTotals = Object.values(activityCompAry).reduce((sum:any, value:any) => sum + value, 0);
                                if(rewardTotals != activityMaxPoint){
                                    let newValue = (rewardTotals as number) + (valueCA as number);
                                    if(newValue > activityMaxPoint){
                                        if(activityCompAry[keyCA]){
                                            activityCompAry[keyCA] += (activityMaxPoint - (rewardTotals as number));
                                        }else{
                                            activityCompAry[keyCA] = (activityMaxPoint - (rewardTotals as number));
                                        }
                                    }else{
                                        if(activityCompAry[keyCA]){
                                            activityCompAry[keyCA] += (valueCA as number);
                                        }else{
                                            activityCompAry[keyCA] = (valueCA as number);
                                        }
                                    }
                                }
                            }

                            if (act?.[tempRewardCdateR] == "Y") {
                                requiredUser.push(activityCompAry);
                                ComprequiredUser.push(rewardCompAry);
                            } else {
                                OptionalUser.push(activityCompAry);
                                CompOptionalUser.push(rewardCompAry);
                            }
                        }
                    }
                }
                if (act?.['users'] && Object.keys(act?.['users'])?.length > 0) {
                    if (act?.['users']?.[userId] && act?.['users']?.[userId]?.['Point'] > 0) {
                        actPoint = act['users'][userId]['Point'];   
                        actDate = (act['users'][userId] && act['users'][userId]['Time'] && act['users'][userId]['Time'] != '') ? act['users'][userId]['Time'] : '';
                    }else if(actCustPoint <= 0){
                        actPoint = 0;
                        actDate = "";
                    }
                }
                actPoint = actCustPoint + Number(actPoint);
                if (actPoint > activityMaxPoint) {
                    actPoint = activityMaxPoint;
                }
                if (sliderSetting && sliderSetting?.['hide'] === 0) {
                    if ((activityQuantity * activityPointForEach) <= actPoint) {
                        actPoint = "Yes";
                    } else {
                        actPoint = "No";
                    }
                }
                if (actDate != "") {
                    dateOne = await this.commonDateService.DateTimeFormat(actDate, 'timestamp', 'YYYY-MM-DD');
                    dateTwo = await this.commonDateService.DateTimeFormat(act?.['end_date'], 'timestamp', 'YYYY-MM-DD HH:mm:ss');
                    if (activityConsiderAfrerDeadline === 1 && (activityConsiderAfrerDeadlineDate != '' || activityConsiderAfrerDeadlineDate != '0000-00-00 00:00:00')) {
                        dateThree = await this.commonDateService.DateTimeFormat(activityConsiderAfrerDeadlineDate, 'timestamp', 'YYYY-MM-DD HH:mm:ss');
                    }
                    if (rewardHireDateSetting === 1 && userDateOfHire != '') {
                        let totaldays = 0;
                        totaldays =  Math.floor((actEndDateTS - actStartDateTS) / (60 * 60 * 24)) + 1;
                        if (actStartDateTS < userDateOfHireTS) {
                            dateTwo = this.commonDateService.getTodayDate(userDateOfHire).add(totaldays, 'days').format('YYYY-MM-DD');
                            if (activityConsiderAfrerDeadline === 1 && (activityConsiderAfrerDeadlineDate != '' || activityConsiderAfrerDeadlineDate != '0000-00-00 00:00:00')) {
                                dateThree = this.commonDateService.getTodayDate(userDateOfHire).add(totaldays, 'days').format('YYYY-MM-DD');
                            }
                        }
                    }
                    if (dateThree && dateThree != '' && (dateOne > dateTwo && dateOne <= dateThree)) {
                        actPoint = actPoint + " - After Deadline";
                        afterDeadline = true;
                    }
                    if (userMeetRequirementDate != '') {
                        if (this.commonDateService.DateTimeFormat(userMeetRequirementDate, 'timestamp', 'YYYY-MM-DD') <= this.commonDateService.DateTimeFormat(actDate, 'timestamp', 'YYYY-MM-DD')) {
                            userMeetRequirementDate = actDate;
                        }
                    } else {
                        userMeetRequirementDate = actDate;
                    }
                    actDate = await this.commonDateService.DateTimeFormat(actDate, 'MM-DD-YYYY', 'YYYY-MM-DD');
                    if (act?.[tempRewardCdateR] == "Y") {
                        if (act?.['users']?.[userId] && act?.['users']?.[userId]?.['activityCompAry']) {
                            requiredUser.push(act['users'][userId]['activityCompAry']);
                            ComprequiredUser.push(act['users'][userId]['rewardCompAry']);
                        }
                    } else {
                        if (act?.['users']?.[userId] && act?.['users']?.[userId]?.['activityCompAry']) {
                            OptionalUser.push(act['users'][userId]['activityCompAry']);
                            CompOptionalUser.push(act['users'][userId]['rewardCompAry']);
                        }
                    }
                }else if (actDate == "" && Number(actPoint) > 0) {
                    actDate = "Manual Points";
                }
                if(type == 'user'){
                    if (headerDataManyActualActivity == 0) {
                        tmpUserRewardTmp[rewardKey].push(actPoint);
                        tmpRewardAll.push(actPoint);

                        tmpUserRewardTmp[rewardKey].push(actDate);
                        tmpRewardAll.push(actDate);
                    }
                }
                if (Number(actPoint) != 0) {
                    if (act?.[tempRewardCdateR] == 'Y') {
                        TotalRequiredactivity++;
                    }
                }
            }
        }
        let returnData = {
            requiredUser : requiredUser,
            ComprequiredUser : ComprequiredUser,
            OptionalUser : OptionalUser,
            CompOptionalUser : CompOptionalUser,
            afterDeadline : afterDeadline,
            userMeetRequirementDate : userMeetRequirementDate,
            tmpUserRewardTmp : tmpUserRewardTmp,
            tmpRewardAll : tmpRewardAll,
            TotalRequiredactivity : TotalRequiredactivity
        };
        return returnData
    }
}

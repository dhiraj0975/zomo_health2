import {
    appConstant,
    BaseService,
    CommonArrayService,
    CommonDateService,
    CommonService,
    tableConstant,
    timezoneConstant,
    UserEntity,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { CronCommonService } from 'src/common';
import { DataSource, Repository } from 'typeorm';
import { PaginateWithUserInput } from './input';


@Injectable()
export class UserService extends BaseService<UserEntity> {
    constructor(
        @InjectRepository(UserEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaUserRepository: Repository<UserEntity>,
        @InjectRepository(UserEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaUserRepository: Repository<UserEntity>,
        private readonly commonService: CommonService,
        commonArrayService: CommonArrayService,
        private readonly commonDateService: CommonDateService,
        private readonly cronCommonService: CronCommonService,
        @InjectDataSource(appConstant.READ_REPLICA.toLowerCase())
        private readonly dataSource: DataSource,
    ) {
        super(
            readReplicaUserRepository,
            writeReplicaUserRepository,
            'users',
            commonArrayService,
        );
    }
    async save(data: any) {
        let id = 100 + data?.role_id;
        const savedResult = this.writeReplicaUserRepository.create({
            ...data,
            lastuniqid: id,
        });
        return await this.writeReplicaUserRepository.insert(savedResult);
    }
    async findOne(condition: any, field: any[] = [], orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaUserRepository.findOne({
            select: field,
            where: condition,
            order: orderBy,
        });
    }

    async update(condition: any, data: any) {
        return await this.writeReplicaUserRepository
            .createQueryBuilder('user')
            .update(UserEntity)
            .set(data)
            .where(condition)
            .execute();
    }

    async listRecord(condition: any, field: any[] = [], orderBy: any = null, groupBy: string = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        if (groupBy) {
            return await this.readReplicaUserRepository
                .createQueryBuilder('user')
                .where(condition)
                .select(field)
                .orderBy(
                    `user.${Object.keys(orderBy)[0]}`,
                    orderBy[Object.keys(orderBy)[0]],
                )
                .groupBy(groupBy)
                .getRawMany();
        }
        return await this.readReplicaUserRepository
            .createQueryBuilder('user')
            .where(condition)
            .select(field)
            .orderBy(
                `user.${Object.keys(orderBy)[0]}`,
                orderBy[Object.keys(orderBy)[0]],
            )
            .getRawMany();
    }
    async listUDLRecord(condition: any) {
        return await this.readReplicaUserRepository
            .createQueryBuilder('user')
            .leftJoinAndMapOne(
                'user.department',
                tableConstant.COMPANIES.TBL_DEPARTMENT,
                'department',
                `department.id = user.department_id`,
            )
            .leftJoinAndMapOne(
                'user.location',
                tableConstant.COMPANIES.TBL_LOCATION,
                'location',
                `location.id = user.location`,
            )
            .where(condition)
            .orderBy('user.id', 'DESC')
            .getMany();
    }
    async listCRecord(condition: any, fields: any[] = ['user']) {
        return await this.readReplicaUserRepository
            .createQueryBuilder('user')
            .leftJoinAndMapOne(
                'user.company',
                tableConstant.COMPANIES.TBL_COMPANY,
                'company',
                `company.id = user.org_id AND company.status = 1`,
            )
            .leftJoinAndMapOne(
                'company.meta',
                tableConstant.COMPANIES.TBL_COMPANY_META,
                'meta',
                `meta.org_id = company.id`,
            )
            .where(condition)
            .select(fields)
            .orderBy('user.id', 'DESC')
            .getMany();
    }
    async listUDLCSRecords(
        condition: any,
        orderBy: any = null,
        fields: any[] = null,
        groupBy: any = null,
    ) {
        if (!orderBy) {
            orderBy = { code: 'ASC' };
        }
        let data = await this.readReplicaUserRepository
            .createQueryBuilder('User')
            .leftJoinAndMapOne(
                'User.company',
                tableConstant.COMPANIES.TBL_COMPANY,
                'company',
                `company.id = User.org_id AND company.status = 1`,
            )
            .leftJoinAndMapOne(
                'User.department',
                tableConstant.COMPANIES.TBL_DEPARTMENT,
                'department',
                `department.id = User.department_id`,
            )
            .leftJoinAndMapOne(
                'User.Location',
                tableConstant.COMPANIES.TBL_LOCATION,
                'Location',
                `Location.id = User.Location`,
            )
            .leftJoinAndMapOne(
                'company.companySetting',
                tableConstant.COMPANIES.TBL_COMPANY_SETTINGS,
                'companySetting',
                `companySetting.org_id = User.org_id`,
            )
            .leftJoinAndMapOne(
                'User.settings',
                tableConstant.TBL_USERS_SETTINGS,
                'settings',
                'settings.user_id = User.id',
            )
            .where(condition)
            .orderBy(
                `User.${Object.keys(orderBy)[0]}`,
                orderBy[Object.keys(orderBy)[0]],
            );
        if (fields) {
            data.select(fields);
        }
        return data.getMany();
    }

    async covidReportData(
        condition: any,
        innerCondition: any,
        paginationParam: any = null,
        field: any[] = [
            'User.role_id',
            'User.new_password',
            'User.timezone',
            'User.is_camp_eligible',
            'User.department_id',
            'User.location',
            'User.org_id',
            'User.id',
            'User.email',
            'User.on_insurance_plan',
            'User.gender',
            'User.relationship_id',
            'User.code',
            'User.username',
            'User.middle_name',
            'User.dob',
            'User.date_of_hire',
            'User.first_name',
            'User.last_name',
            'User.insurance_plan_name',
            'settings.jobtitle',
            'settings.wphone',
            'settings.hphone',
            'company.company_name',
            'department.dept_name',
            'Location.lname',
            'Location.address1',
            'Location.city',
            'Location.state',
            'Location.zip',
            'Location.country',
            'Coviduseranswers.id',
            'Coviduseranswers.question_answers',
            'Coviduseranswers.created',
            'Coviduseranswers.are_you_vaccinated',
            'Coviduseranswers.tested_positive_covid',
            'Coviduseranswers.vaccination_type',
            'Coviduseranswers.vecctionationrecord',
            'Coviduseranswers.testpositivecertificate',
            'Coviduseranswers.lastvaccinationdate',
            'Coviduseranswers.lastreportdate',
            'Covidvaccinationtyp.title',
            "CONVERT_TZ(`Coviduseranswers`.`Created`,'UTC',CASE WHEN `User`.`timezone` != '' THEN `User`.`timezone` ELSE 'UTC' END) as converted_time",
        ],
    ) {
        try {
            let paginateObj;
            if (paginationParam !== null) {
                paginateObj =
                    paginationParam !== null
                        ? this.commonArrayService.getPaginationVar(
                            paginationParam.page || 1,
                            paginationParam.limit,
                        )
                        : null;
            }
            let data = this.readReplicaUserRepository
                .createQueryBuilder('User')
                .leftJoinAndMapOne(
                    'User.company',
                    tableConstant.COMPANIES.TBL_COMPANY,
                    'company',
                    `company.id = User.org_id AND company.status = 1`,
                )
                .leftJoinAndMapOne(
                    'User.department',
                    tableConstant.COMPANIES.TBL_DEPARTMENT,
                    'department',
                    `department.id = User.department_id`,
                )
                .leftJoinAndMapOne(
                    'User.Location',
                    tableConstant.COMPANIES.TBL_LOCATION,
                    'Location',
                    `Location.id = User.location`,
                )
                .leftJoinAndMapOne(
                    'User.settings',
                    tableConstant.TBL_USERS_SETTINGS,
                    'settings',
                    `settings.user_id = User.id`,
                )
                .leftJoinAndMapOne(
                    'User.Coviduseranswers',
                    tableConstant.REPORT.COVID_USER_ANSWERS,
                    'Coviduseranswers',
                    `${innerCondition}`,
                )
                .leftJoinAndMapOne(
                    'User.Covidvaccinationtyp',
                    tableConstant.REPORT.COVID_VACCINATION_TYPE,
                    'Covidvaccinationtyp',
                    `Covidvaccinationtyp.id = Coviduseranswers.vaccination_type`,
                )
                .where(condition)
                .orderBy('User.id', 'DESC')
                .addOrderBy('Coviduseranswers.id', 'DESC')
                .select(field)
                .groupBy('User.id')
                .addGroupBy('DATE_FORMAT(Coviduseranswers.created, "%Y-%m-%d")');
            let resultData
            if (paginationParam === null) {
                resultData = await data.getMany();
            }
            else {
                let finalData = await data.take(paginateObj.take).skip(paginateObj.skip).getManyAndCount();
                const [result, total] = finalData;
                resultData = this.commonArrayService.paginationResponse(
                    result,
                    total,
                    paginateObj,
                );
            }
            return resultData;
        } catch (error) {
            throw new Error(error.message);
        }
    }
    async surveyReport(condition: any, innerCondition: any, surveyPopupCondition: any, paginationParam: any = null, field: any[] =
        [
            'User.role_id as user_role_id', 'User.new_password as user_new_password', 'User.timezone as user_timezone', 'User.is_camp_eligible as user_is_camp_eligible',
            'User.department_id as user_department_id', 'User.location as user_location', 'User.org_id as user_org_id', 'User.id as user_id', 'User.email as user_email',
            'User.on_insurance_plan as user_on_insurance_plan', 'User.gender as user_gender', 'User.relationship_id as user_relationship_id', 'User.code as user_code',
            'User.username as user_username', 'User.middle_name as user_middle_name', 'User.dob as user_dob', 'User.date_of_hire as user_date_of_hire',
            'User.first_name as user_first_name', 'User.last_name as user_last_name', 'User.insurance_plan_name as user_insurance_plan_name',
            'settings.jobtitle as settings_jobtitle', 'settings.wphone as settings_wphone', 'settings.hphone as settings_hphone',
            'company.company_name as company_name', 'department.dept_name as department_name',
            'Location.lname as location_name', 'Location.address1 as location_address1', 'Location.city as location_city', 'Location.state as location_state',
            'Location.zip as location_zip', 'Location.country as location_country',
            'Surveyuseranswers.id as surveyanswer_id', 'Surveyuseranswers.popup_id as surveyanswer_popup_id', 'Surveyuseranswers.question_answers as surveyanswer_question_answers',
            'Surveyuseranswers.created as surveyanswer_created',
            // "CONVERT_TZ(`Surveyuseranswers`.`created`,'UTC',CASE WHEN `User`.`timezone` != '' THEN `User`.`timezone` ELSE 'UTC' END) as surveyanswer_converted_time"
        ]
    ) {
        let paginateObj
        if (paginationParam !== null) {
            paginateObj = paginationParam !== null ? this.commonArrayService.getPaginationVar(
                paginationParam.page || 1,
                paginationParam.limit,
            ) : '';
        }
        let data = this.readReplicaUserRepository.createQueryBuilder('User')
            .leftJoinAndMapOne(
                'User.company',
                tableConstant.COMPANIES.TBL_COMPANY,
                'company',
                `company.id = User.org_id AND company.status = 1`,
            )
            .leftJoinAndMapOne(
                'User.department',
                tableConstant.COMPANIES.TBL_DEPARTMENT,
                'department',
                `department.id = User.department_id`,
            )
            .leftJoinAndMapOne(
                'User.Location',
                tableConstant.COMPANIES.TBL_LOCATION,
                'Location',
                `Location.id = User.location`,
            )
            .leftJoinAndMapOne(
                'User.settings',
                tableConstant.TBL_USERS_SETTINGS,
                'settings',
                `settings.user_id = User.id`,
            )
            .leftJoinAndMapMany(
                'User.Surveyuseranswers',
                tableConstant.SURVEY.TBL_C_SURVEY_USER_ANSWERS,
                'Surveyuseranswers',
                `${innerCondition}`,
            )
            .leftJoinAndMapOne(
                'User.Surveypopup',
                tableConstant.SURVEY.TBL_C_SURVEY_POPUP,
                'Surveypopup',
                `${surveyPopupCondition}`,
            )
            .where(condition)
            .orderBy('Surveyuseranswers.id', 'DESC');
        let rawData: any[];
        let total = 0;
        if (paginationParam === null) {
            rawData = await data.select(field).getRawMany();
        } else {
            let totalData =
                await data.select(['User.id as user_id', 'Surveyuseranswers.id as surveyanswer_id'])
                    .getRawMany();
            total = totalData?.length || 0;
            rawData = await data.select(field)
                .offset(paginateObj.skip)
                .limit(paginateObj.take)
                .getRawMany();
        }
        const groupedData = rawData.reduce((acc, row) => {
            acc.push({
                id: row?.user_id,
                first_name: row?.user_first_name,
                last_name: row?.user_last_name,
                code: row?.user_code,
                timezone: row?.user_timezone,
                email: row?.user_email,
                role_id: row?.user_role_id,
                company: { company_name: row?.company_name },
                department: { dept_name: row?.department_name },
                Location: {
                    lname: row?.location_name,
                    address1: row?.location_address1,
                    city: row?.location_city,
                    state: row?.location_state,
                    zip: row?.location_zip,
                    country: row?.location_country,
                },
                settings: {
                    jobtitle: row?.settings_jobtitle,
                    wphone: row?.settings_wphone,
                    hphone: row?.settings_hphone,
                },
                Surveyuseranswers: row?.surveyanswer_id
                    ? {
                        id: row?.surveyanswer_id,
                        popup_id: row?.surveyanswer_popup_id,
                        question_answers: row?.surveyanswer_question_answers,
                        created: row?.surveyanswer_created,
                    }
                    : {}
            });
            return acc;
        }, []);
        if (paginationParam === null) {
            return groupedData;
        } else {
            return this.commonArrayService.paginationResponse(groupedData, total, paginateObj);
        }
    }
    async list(
        condition: any,
        orderBy: any = null,
        fields: any[] = null,
        groupBy: any = null,
        joinTable: any = [],
    ) {
        try {
            if (!orderBy) {
                orderBy = { 'user.id': 'DESC' };
            }
            let data = this.readReplicaUserRepository.createQueryBuilder('user');
            if (joinTable && joinTable.length > 0) {
                for (let i = 0; i < joinTable.length; i++) {
                    if (joinTable[i].type == 'INNER') {
                        data = data.innerJoinAndMapOne(
                            `${joinTable[i].connect}.${joinTable[i].alias}`,
                            joinTable[i].table,
                            joinTable[i].alias,
                            joinTable[i].on,
                        );
                    } else {
                        data = data.leftJoinAndMapOne(
                            `${joinTable[i].connect}.${joinTable[i].alias}`,
                            joinTable[i].table,
                            joinTable[i].alias,
                            joinTable[i].on,
                        );
                    }
                }
            } else {
                data = data
                    .leftJoinAndMapOne(
                        'user.role',
                        tableConstant.MASTER.TBL_ROLES,
                        'role',
                        `role.id = user.role_id`,
                    )
                    .leftJoinAndMapOne(
                        'user.company',
                        tableConstant.COMPANIES.TBL_COMPANY,
                        'company',
                        `company.id = user.org_id AND company.status = 1`,
                    )
                    .leftJoinAndMapOne(
                        'user.company_settings',
                        tableConstant.COMPANIES.TBL_COMPANY_SETTINGS,
                        'company_settings',
                        `company_settings.id = user.org_id`,
                    )
                    .leftJoinAndMapOne(
                        'user.department',
                        tableConstant.COMPANIES.TBL_DEPARTMENT,
                        'department',
                        `department.id = user.department_id`,
                    )
                    .leftJoinAndMapOne(
                        'user.settings',
                        tableConstant.TBL_USERS_SETTINGS,
                        'settings',
                        `settings.user_id = user.id`,
                    )
                    .leftJoinAndMapOne(
                        'user.location',
                        tableConstant.COMPANIES.TBL_LOCATION,
                        'location',
                        `location.id = user.location`,
                    )
                    .leftJoinAndMapMany(
                        'user.userLogin',
                        tableConstant.TBL_USERS_LOGIN,
                        'userLogin',
                        `userLogin.user_id = user.id`,
                    );
            }
            data = data
                .select(fields)
                .where(condition)
                .orderBy(
                    `${Object.keys(orderBy)[0]}`,
                    orderBy[Object.keys(orderBy)[0]],
                );
            if (groupBy !== null) {
                data.groupBy(groupBy);
            }
            return await data.getMany();
        } catch (error) {
            throw new Error(error.message);
        }
    }
    async findOneWithTable(
        condition: any,
        fields: any[] = [
            'User',
            'role',
            'company',
            'companysetting',
            'department',
            'settings',
            'location',
        ],
    ) {
        return await this.readReplicaUserRepository
            .createQueryBuilder('User')
            .leftJoinAndMapOne(
                'User.role',
                tableConstant.MASTER.TBL_ROLES,
                'role',
                `role.id = User.role_id`,
            )
            .leftJoinAndMapOne(
                'User.company',
                tableConstant.COMPANIES.TBL_COMPANY,
                'company',
                `company.id = User.org_id AND company.status = 1`,
            )
            .leftJoinAndMapOne(
                'User.companysetting',
                tableConstant.COMPANIES.TBL_COMPANY_SETTINGS,
                'companysetting',
                `companysetting.org_id = User.org_id`,
            )
            .leftJoinAndMapOne(
                'User.department',
                tableConstant.COMPANIES.TBL_DEPARTMENT,
                'department',
                `department.id = User.department_id AND department.status = 1 AND department.deleted = 0`,
            )
            .leftJoinAndMapOne(
                'User.settings',
                tableConstant.TBL_USERS_SETTINGS,
                'settings',
                `settings.user_id = User.id`,
            )
            .leftJoinAndMapOne(
                'User.location',
                tableConstant.COMPANIES.TBL_LOCATION,
                'location',
                `location.id = User.location AND location.status = 1 AND location.deleted = 0`,
            )
            .where(condition)
            .select(fields)
            .orderBy('User.id', 'DESC')
            .getOne();
    }
    async usersDataWellness(
        user: any,
        whereCondition: string = '',
        subType: string = '',
        type: string = '',
    ) {
        let field = ['User.id'];
        let condition;
        let wellnessCondition;
        if (user && user?.['settings'] && user?.['settings']?.state) {
            let stateData = await this.cronCommonService.stateList(
                user?.['settings']?.state,
                '',
            );
            let state = stateData.find(
                (ele) =>
                    ele.statecode == user['settings']?.state ||
                    ele.state == user['settings']?.state,
            );
            user['settings'].state = state?.['state'];
            user['settings'].statecode = state?.['statecode'];
        }
        let query = this.readReplicaUserRepository.createQueryBuilder('User');
        if ((user.role_id == 2 || user.role_id == 16) && type == '') {
            wellnessCondition = `wellnessAssignment.org_id = ${user.org_id} AND wellnessAssignment.user_id = User.id AND wellnessAssignment.status = 1
                                    AND(
                                    (wellnessAssignment.location = ${user.location} AND wellnessAssignment.location != 0) OR
                                    (wellnessAssignment.department = ${user.department_id} AND wellnessAssignment.department != 0) OR
                                    (wellnessAssignment.state = "${user?.settings?.state}" AND wellnessAssignment.state !='') OR
                                    (wellnessAssignment.state = "${user?.settings?.statecode}" AND wellnessAssignment.state !='') OR
                                    (wellnessAssignment.city = "${user?.settings?.city}" AND wellnessAssignment.city !='') OR
                                    wellnessAssignment.is_global = 1
                                    )`;
            condition = `User.role_id = 12 AND User.membership_code = '${user['membership_code']}' AND wellnessAssignment.id IS NULL`;
            query = query
                .leftJoinAndMapOne(
                    'User.wellnessAssignment',
                    tableConstant.COMPANIES.TBL_COMPANY_WELLNESS_ASSIGNMENTS,
                    'wellnessAssignment',
                    wellnessCondition,
                )
                .groupBy('User.id');
        }
        if (user.role_id == 12) {
            // for champion role wellness assignment
            wellnessCondition = `wellnessAssignment.org_id = ${user.org_id} AND wellnessAssignment.user_id = ${user.id} AND wellnessAssignment.status = 1
                                    AND(
                                    (wellnessAssignment.location = User.location AND User.location != 0) OR
                                    (wellnessAssignment.department = User.department_id AND User.department_id != 0) OR
                                    (wellnessAssignment.state = settings.state AND settings.state !='') OR
                                    (wellnessAssignment.city = settings.city AND settings.city !='') OR
                                    wellnessAssignment.is_global = 1
                                    )`;
            if (subType == 'location') {
                wellnessCondition = `wellnessAssignment.org_id = ${user.org_id} AND wellnessAssignment.user_id = ${user.id} AND wellnessAssignment.status = 1
                                    AND
                                    ( 
                                    (wellnessAssignment.location = User.location AND User.location != 0) OR
                                    (wellnessAssignment.state = settings.state AND settings.state !='') OR
                                    (wellnessAssignment.city = settings.city AND settings.city !='') OR
                                    wellnessAssignment.is_global = 1 
                                    )`;
            }
            if (subType == 'department') {
                wellnessCondition = `wellnessAssignment.org_id = ${user.org_id} AND wellnessAssignment.user_id = ${user.id} AND wellnessAssignment.status = 1
                                        AND(
                                        (wellnessAssignment.department = User.department_id AND User.department_id != 0) OR
                                        wellnessAssignment.is_global = 1
                                        )`;
            }
            query = query
                .innerJoinAndMapOne(
                    'User.settings',
                    tableConstant.TBL_USERS_SETTINGS,
                    'settings',
                    `settings.user_id = User.id`,
                )
                .innerJoinAndMapOne(
                    'User.wellnessAssignment',
                    tableConstant.COMPANIES.TBL_COMPANY_WELLNESS_ASSIGNMENTS,
                    'wellnessAssignment',
                    wellnessCondition,
                );
            condition = `User.org_id = ${user.org_id}`;
            field = [
                'User.id',
                'User.first_name',
                'User.last_name',
                'User.email',
                'User.code',
            ];
            //for champion role chat module.
            if (type && type !== '' && type == 'chat') {
                query.groupBy('User.id');
            }
        }
        if ((user.role_id == 2 || user.role_id == 16) && type == 'userWise') {
            // for user wise wellness assignment
            wellnessCondition = `wellnessAssignment.org_id = ${user.org_id} AND wellnessAssignment.status = 1
                                    AND(
                                    (wellnessAssignment.location = ${user.location} AND wellnessAssignment.location != 0) OR
                                    (wellnessAssignment.department = ${user.department_id} AND wellnessAssignment.department != 0) OR
                                    (wellnessAssignment.state = "${user?.settings?.state}" AND wellnessAssignment.state !='') OR
                                    (wellnessAssignment.state = "${user?.settings?.statecode}" AND wellnessAssignment.state !='') OR
                                    (wellnessAssignment.city = "${user?.settings?.city}" AND wellnessAssignment.city !='') OR
                                    wellnessAssignment.is_global = 1
                                    )`;
            condition = ` User.membership_code = '${user['membership_code']}' AND User.id = ${user.id}`;
            query = query
                .innerJoinAndMapMany(
                    'User.wellnessAssignment',
                    tableConstant.COMPANIES.TBL_COMPANY_WELLNESS_ASSIGNMENTS,
                    'wellnessAssignment',
                    wellnessCondition,
                )
                .orderBy('wellnessAssignment.id', 'DESC');
            field = [
                'User.id',
                'User.first_name',
                'User.last_name',
                'User.email',
                'User.code',
                'wellnessAssignment',
            ];
        }
        if ((user.role_id == 2 || user.role_id == 16) && type == 'userLogin') {
            // for user login wellness assignment data
            wellnessCondition = `wellnessAssignment.org_id = ${user.org_id} AND wellnessAssignment.status = 1
                                AND(
                                (wellnessAssignment.location = ${user.location} AND wellnessAssignment.location != 0) OR
                                (wellnessAssignment.department = ${user.department_id} AND wellnessAssignment.department != 0) OR
                                (wellnessAssignment.state = "${user?.settings?.state}" AND wellnessAssignment.state !='') OR
                                (wellnessAssignment.state = "${user?.settings?.statecode}" AND wellnessAssignment.state !='') OR
                                (wellnessAssignment.city = "${user?.settings?.city}" AND wellnessAssignment.city !='') OR
                                wellnessAssignment.is_global = 1
                                )`;
            condition = `User.membership_code = '${user['membership_code']}' AND User.id = ${user['id']}`;
            query = query
                .innerJoinAndMapOne(
                    'User.wellnessAssignment',
                    tableConstant.COMPANIES.TBL_COMPANY_WELLNESS_ASSIGNMENTS,
                    'wellnessAssignment',
                    wellnessCondition,
                )
                .groupBy('User.id');
        }
        if (whereCondition && whereCondition != '') {
            condition = whereCondition;
        }
        return await query.where(condition).select(field).getMany();
    }

    async listUSRecords(
        condition: any,
        orderBy: any = null,
        fields: any[] = null,
    ) {
        if (!orderBy) {
            orderBy = { code: 'ASC' };
        }
        let data = await this.readReplicaUserRepository
            .createQueryBuilder('User')
            .leftJoinAndMapOne(
                'User.settings',
                tableConstant.TBL_USERS_SETTINGS,
                'settings',
                'settings.user_id = User.id',
            )
            .where(condition)
            .orderBy(
                `User.${Object.keys(orderBy)[0]}`,
                orderBy[Object.keys(orderBy)[0]],
            )
            .groupBy('User.id');
        if (fields) {
            data.select(fields);
        }
        return data.getMany();
    }
    async challengeReportPaginate(
        condition: string,
        paginationParam: Partial<PaginateWithUserInput> | null = null,
        fields: string[] = ['User'],
        joinTable: string[] = [],
    ) {
        let paginateObj: { page: number; take: number; skip: number } | null =
            null;
        if (paginationParam !== null) {
            paginateObj =
                paginationParam !== null
                    ? this.commonArrayService.getPaginationVar(
                        paginationParam.page || 1,
                        paginationParam.limit,
                    )
                    : null;
        }
        let data = this.readReplicaUserRepository
            .createQueryBuilder('User')
            .innerJoinAndMapOne(
                'User.scj',
                tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE_JOIN_USERS,
                'scj',
                `scj.user_id = User.id`,
            )
            .leftJoinAndMapOne(
                'User.company',
                tableConstant.COMPANIES.TBL_COMPANY,
                'company',
                `company.id = User.org_id AND company.status = 1`,
            )
            .leftJoinAndMapOne(
                'User.department',
                tableConstant.COMPANIES.TBL_DEPARTMENT,
                'department',
                `department.id = User.department_id`,
            )
            .leftJoinAndMapOne(
                'User.Location',
                tableConstant.COMPANIES.TBL_LOCATION,
                'Location',
                `Location.id = User.location`,
            )
            .leftJoinAndMapOne(
                'User.companySetting',
                tableConstant.COMPANIES.TBL_COMPANY_SETTINGS,
                'companySetting',
                `companySetting.org_id = User.org_id`,
            );
        if (joinTable && joinTable.includes(tableConstant.CHALLENGE.TBL_CH_TEAM_MEMBERS)) {
            data = data.leftJoinAndMapOne(
                'User.teamMember',
                tableConstant.CHALLENGE.TBL_CH_TEAM_MEMBERS,
                'teamMember',
                `teamMember.user_id = scj.user_id AND  teamMember.team_id IN (SELECT team_id FROM ch_team_schedule WHERE schedule_id = scj.schedule_id AND status = 1) AND teamMember.status = 1`,
            ).innerJoinAndMapOne(
                'teamMember.team',
                tableConstant.CHALLENGE.TBL_CH_TEAMS,
                'team',
                `team.id = teamMember.team_id AND team.status = 1`,
            );
        }
        if (joinTable && joinTable.includes(tableConstant.CHALLENGE.TBL_CH_RECIPE)) {
            data = data.leftJoinAndMapMany(
                'User.recipe',
                tableConstant.CHALLENGE.TBL_CH_RECIPE,
                'recipe',
                `recipe.user_id = scj.user_id AND recipe.schedule_id = scj.schedule_id AND recipe.status = 1`,
            )
        }
        data = data.where(condition).orderBy('User.id', 'DESC').select(fields);
        let resultData;
        if (paginationParam === null) {
            resultData = await data.getMany();
        } else {
            data = data.take(paginateObj.take).skip(paginateObj.skip);
            let finalData = await data.getManyAndCount();
            const [result, total] = finalData;
            resultData = this.commonArrayService.paginationResponse(
                result,
                total,
                paginateObj,
            );
        }
        return resultData;
    }
    async getOrgAdminAndCompanyTimezoneFromCompanyId(condition: any) {
        let userData = await this.findOneWithTable(condition, [
            'User',
            'company',
        ]);
        let timezone = 'UTC';
        if (userData) {
            timezone = userData['timezone'];
            if (timezone.trim() != '') {
                if (timezone.trim() == 'Pacific Standard Time (PST)') {
                    timezone = 'America/Los_Angeles';
                }
                if (timezone.trim() == 'Mountain Standard Time (MST)') {
                    timezone = 'America/Denver';
                }
                if (timezone.trim() == 'Central Standard Time (CST)') {
                    timezone = 'America/Chicago';
                }
                if (timezone.trim() == 'Eastern Standard Time (EST)') {
                    timezone = 'America/New_York';
                }
            }
        }
        if (timezone == 'UTC') {
            let zip = userData?.['company']?.zip;
            let timezoneData = this.commonService.sanitize(
                await this.commonDateService.getTimezoneFromZipcode(
                    zip,
                    userData?.['company']?.country,
                ),
            );
            if (timezone.includes('GMT')) {
                let timezones = timezoneConstant.TIMEZONE;
                timezone = timezones[timezoneData] || 'UTC';
            }
            timezone = timezoneData;
            if (timezone.trim() != '') {
                if (timezone.trim() == 'Pacific Standard Time (PST)') {
                    timezone = 'America/Los_Angeles';
                }
                if (timezone.trim() == 'Mountain Standard Time (MST)') {
                    timezone = 'America/Denver';
                }
                if (timezone.trim() == 'Central Standard Time (CST)') {
                    timezone = 'America/Chicago';
                }
                if (timezone.trim() == 'Eastern Standard Time (EST)') {
                    timezone = 'America/New_York';
                }
            }
        }
        return timezone;
    }
    async listUINRecords(condition: string, orderBy: { [key: string]: 'ASC' | 'DESC' } = null, fields: string[] = ['User'], joinTable: string[] = [], groupBy: string = null, havingCondition: string = '') {
        let query = this.readReplicaUserRepository.createQueryBuilder('User');
        if (joinTable && joinTable.includes(
            tableConstant.CAMPAIGN.TBL_IN_CUSTOM_POINT ||
            tableConstant.HEALTH_ASSESSMENT.TBL_HA_HRABIOMETRICS ||
            tableConstant.HEALTH_CHECKUP.TBL_HC_BIOMETRICS ||
            tableConstant.HEALTH_CHECKUP.TBL_HC_DENTISTS ||
            tableConstant.HEALTH_CHECKUP.TBL_HC_OPTOMETRISTS ||
            tableConstant.HEALTH_CHECKUP.TBL_HC_TOBACCO_USES
        )) {
            query = query.innerJoinAndMapOne(
                'User.ent',
                joinTable[0],
                'ent',
                `ent.user_id = User.id`,
            );
        }
        query = query
            .where(condition)
            .select(fields);
        if (orderBy) {
            query = query.orderBy(orderBy);
        }
        if (groupBy) {
            query = query.groupBy(groupBy);
        }
        if (havingCondition) {
            query = query.having(havingCondition);
        }
        return await query.getMany();
    }
    async generateTPTHReport(
        reportType: 'tobacco' | 'phy_tobacco' | 'hippa' | 'questionnaire',
        condition: string = '',
        innerCondition: string = '',
        paginationParam: Partial<PaginateWithUserInput> | null = null,
        field: string[] = [
            'User.role_id AS user_role_id', 'User.new_password AS user_new_password', 'User.timezone AS user_timezone',
            'User.is_camp_eligible AS user_is_camp_eligible', 'User.department_id AS user_department_id', 'User.location AS user_location', 'User.org_id AS user_org_id',
            'User.id AS user_id', 'User.email AS user_email', 'User.on_insurance_plan AS user_on_insurance_plan', 'User.gender AS user_gender',
            'User.relationship_id AS user_relationship_id', 'User.code AS user_code', 'User.username AS user_username', 'User.middle_name AS user_middle_name', 'User.dob AS user_dob',
            'User.date_of_hire AS user_date_of_hire', 'User.first_name AS user_first_name', 'User.last_name AS user_last_name', 'User.insurance_plan_name AS user_insurance_plan_name',
            'settings.jobtitle AS settings_jobtitle', 'settings.wphone AS settings_wphone', 'settings.hphone AS settings_hphone', 'User.employeeid AS user_employeeid',
            'company.company_name AS company_name', 'department.dept_name AS department_name',
            'Location.lname AS location_name', 'Location.address1 AS location_address1',
            'Location.city AS location_city', 'Location.state AS location_state', 'Location.zip AS location_zip', 'Location.country AS location_country',
        ]
    ) {
        const isPhyTobacco = reportType === 'phy_tobacco';
        const isTobaccoReport = reportType === 'tobacco' || reportType === 'phy_tobacco';
        const isHippaReport = reportType === 'hippa';
        const isQuestionnaireReport = reportType === 'questionnaire';
        const joinConfig = this.getJoinConfig(reportType, isPhyTobacco);
        let query = this.readReplicaUserRepository.createQueryBuilder('User')
            .leftJoinAndMapOne(
                'User.company',
                tableConstant.COMPANIES.TBL_COMPANY,
                'company',
                `company.id = User.org_id AND company.deleted = 0`,
            )
            .leftJoinAndMapOne(
                'User.department',
                tableConstant.COMPANIES.TBL_DEPARTMENT,
                'department',
                `department.id = User.department_id`,
            )
            .leftJoinAndMapOne(
                'User.Location',
                tableConstant.COMPANIES.TBL_LOCATION,
                'Location',
                `Location.id = User.location`,
            )
            .leftJoinAndMapOne(
                'User.settings',
                tableConstant.TBL_USERS_SETTINGS,
                'settings',
                `settings.user_id = User.id`,
            )
            .innerJoin(
                qb => {
                    return qb
                        .select('ranked.id', 'id')
                        .addSelect('ranked.user_id', 'user_id')
                        .addSelect(isTobaccoReport ? 'ranked.is_tobacco_user' : null, isTobaccoReport ? 'is_tobacco_user' : undefined)
                        .addSelect(isQuestionnaireReport ? 'ranked.medical_status_one' : null, isQuestionnaireReport ? 'medical_status_one' : undefined)
                        .addSelect(isQuestionnaireReport ? 'ranked.medical_status_two' : null, isQuestionnaireReport ? 'medical_status_two' : undefined)
                        .addSelect(isQuestionnaireReport ? 'ranked.participation_wp' : null, isQuestionnaireReport ? 'participation_wp' : undefined)
                        .addSelect(isQuestionnaireReport ? 'ranked.wellness_score_one' : null, isQuestionnaireReport ? 'wellness_score_one' : undefined)
                        .addSelect(isQuestionnaireReport ? 'ranked.wellness_score_two' : null, isQuestionnaireReport ? 'wellness_score_two' : undefined)
                        .addSelect('ranked.' + joinConfig.dateAlias, joinConfig.dateAlias)
                        .from(subQb => {
                            return subQb
                                .select(`${joinConfig.alias}.id`, 'id')
                                .addSelect(`${joinConfig.alias}.user_id`, 'user_id')
                                .addSelect(
                                    isTobaccoReport ? `${joinConfig.alias}.is_tobacco_user` : null,
                                    isTobaccoReport ? 'is_tobacco_user' : undefined
                                )
                                .addSelect(
                                    isQuestionnaireReport ? `${joinConfig.alias}.medical_status_one` : null,
                                    isQuestionnaireReport ? 'medical_status_one' : undefined
                                )
                                .addSelect(
                                    isQuestionnaireReport ? `${joinConfig.alias}.medical_status_two` : null,
                                    isQuestionnaireReport ? 'medical_status_two' : undefined
                                )
                                .addSelect(
                                    isQuestionnaireReport ? `${joinConfig.alias}.participation_wp` : null,
                                    isQuestionnaireReport ? 'participation_wp' : undefined
                                )
                                .addSelect(
                                    isQuestionnaireReport ? `${joinConfig.alias}.wellness_score_one` : null,
                                    isQuestionnaireReport ? 'wellness_score_one' : undefined
                                )
                                .addSelect(
                                    isQuestionnaireReport ? `${joinConfig.alias}.wellness_score_two` : null,
                                    isQuestionnaireReport ? 'wellness_score_two' : undefined
                                )
                                .addSelect(
                                    joinConfig.dateSelect,
                                    joinConfig.dateAlias
                                )
                                .addSelect(
                                    `ROW_NUMBER() OVER (PARTITION BY ${joinConfig.alias}.user_id ORDER BY ${joinConfig.alias}.${joinConfig.dateAlias} DESC)`,
                                    'rn'
                                )
                                .from(joinConfig.sourceTable, joinConfig.alias)
                                .where(isHippaReport ? '1=1' : (innerCondition || '1=1'));
                        }, 'ranked')
                        .where('ranked.rn = 1');
                },
                joinConfig.tableName,
                `${joinConfig.tableName}.user_id = User.id`
            )
            .where(condition)
            .orderBy('User.last_name', 'ASC');
        const selectFields = [
            ...field,
            `${joinConfig.tableName}.id AS ${joinConfig.alias}_id`,
            `${joinConfig.tableName}.user_id AS ${joinConfig.alias}_user_id`,
            ...(isTobaccoReport ? [`${joinConfig.tableName}.is_tobacco_user AS ${joinConfig.alias}_is_tobacco_user`] : []),
            `${joinConfig.tableName}.${joinConfig.dateAlias} AS ${joinConfig.alias}_${joinConfig.dateAlias}`,
        ];
        if (isQuestionnaireReport) {
            selectFields.push(
                '(CASE WHEN medical_status_one = 1 THEN "Yes" ELSE "No" END) as medical_status_one',
                '(CASE WHEN medical_status_two = 1 THEN "Yes" ELSE "No" END) as medical_status_two',
                '(CASE WHEN participation_wp = 1 THEN "Yes" ELSE "No" END) as participation_wp',
                '(CASE WHEN wellness_score_one = 1 THEN "Yes" ELSE "No" END) as wellness_score_one',
                '(CASE WHEN wellness_score_two = 1 THEN "Yes" ELSE "No" END) as wellness_score_two'
            );
        }
        let total = 0;
        let rawData: any[];
        if (paginationParam) {
            const paginateObj = this.commonArrayService.getPaginationVar(
                paginationParam.page || 1,
                paginationParam.limit,
            );
            const totalData = await query.select(['User.id']).getRawMany();
            total = totalData.length;
            rawData = await query
                .select(selectFields)
                .offset(paginateObj.skip)
                .limit(paginateObj.take)
                .getRawMany();
            const groupedData = this.transformReportData(rawData, reportType, isPhyTobacco);
            return this.commonArrayService.paginationResponse(groupedData, total, paginateObj);
        }
        rawData = await query.select(selectFields).getRawMany();
        const groupedData = this.transformReportData(rawData, reportType, isPhyTobacco);
        return groupedData;
    }
    private getJoinConfig(reportType: string, isPhyTobacco: boolean) {
        if (reportType === 'hippa') {
            return {
                tableName: 'Authorization',
                alias: 'a',
                sourceTable: 'hc_authorizations',
                dateSelect: 'a.date_completed',
                dateAlias: 'date_completed',
            };
        }
        if (reportType === 'questionnaire') {
            return {
                tableName: 'Questionnaireuser',
                alias: 'q',
                sourceTable: 'hc_questionnaireusers',
                dateSelect: 'q.created',
                dateAlias: 'created',
            };
        }
        const alias = isPhyTobacco ? 'b' : 't';
        return {
            tableName: isPhyTobacco ? 'Biometric' : 'Tobaccouses',
            alias: alias,
            sourceTable: isPhyTobacco ? 'hc_biometrics' : 'hc_tabaccouses',
            dateSelect: isPhyTobacco
                ? `${alias}.created`
                : `${alias}.date_completed`,
            dateAlias: isPhyTobacco ? 'created' : 'date_completed',
        };
    }
    private transformReportData(rawData: any[], reportType: string, isPhyTobacco: boolean) {
        const isHippaReport = reportType === 'hippa';
        const isTobaccoReport = reportType === 'tobacco' || reportType === 'phy_tobacco';
        const isQuestionnaireReport = reportType === 'questionnaire';
        const joinTableAlias = isHippaReport ? 'a' : isQuestionnaireReport ? 'q' : (isPhyTobacco ? 'b' : 't');
        const dateFieldKey = isHippaReport
            ? 'a_date_completed'
            : (isQuestionnaireReport ? 'q_created' : (isPhyTobacco ? 'b_created' : 't_date_completed'));
        const entityName = isHippaReport
            ? 'Authorization' : isQuestionnaireReport ? 'Questionnaireuser'
                : (isPhyTobacco ? 'Biometric' : 'Tobaccouses');
        return rawData.map(row => ({
            id: row?.user_id,
            first_name: row?.user_first_name,
            last_name: row?.user_last_name,
            code: row?.user_code,
            username: row?.user_username,
            gender: row?.user_gender,
            dob: row?.user_dob,
            date_of_hire: row?.user_date_of_hire,
            middle_name: row?.user_middle_name,
            relationship_id: row?.user_relationship_id,
            on_insurance_plan: row?.user_on_insurance_plan,
            insurance_plan_name: row?.user_insurance_plan_name,
            org_id: row?.user_org_id,
            department_id: row?.user_department_id,
            employeeid: row?.user_employeeid,
            timezone: row?.user_timezone,
            is_camp_eligible: row?.is_camp_eligible,
            email: row?.user_email,
            role_id: row?.user_role_id,
            company: {
                company_name: row?.company_name
            },
            department: {
                dept_name: row?.department_name
            },
            Location: {
                lname: row?.location_name,
                address1: row?.location_address1,
                city: row?.location_city,
                state: row?.location_state,
                zip: row?.location_zip,
                country: row?.location_country,
            },
            settings: {
                jobtitle: row?.settings_jobtitle,
                wphone: row?.settings_wphone,
                hphone: row?.settings_hphone,
            },
            [entityName]: row?.[`${joinTableAlias}_id`] ? {
                id: row[`${joinTableAlias}_id`],
                user_id: row[`${joinTableAlias}_user_id`],
                ...(isTobaccoReport && { is_tobacco_user: row[`${joinTableAlias}_is_tobacco_user`] }),
                ...(isPhyTobacco
                    ? { created: row[dateFieldKey] }
                    : { date_completed: row[dateFieldKey] }
                ),
                ...(isQuestionnaireReport
                    && { created: row[dateFieldKey] }
                ),
                ...(isQuestionnaireReport && {
                    medical_status_one: row['medical_status_one'],
                    medical_status_two: row['medical_status_two'],
                    participation_wp: row['participation_wp'],
                    wellness_score_one: row['wellness_score_one'],
                    wellness_score_two: row['wellness_score_two'],
                })
            } : {}
        }));
    }
    async participationReport(
        condition: string = '',
        paginationParam: Partial<PaginateWithUserInput> | null = null,
        fields: string[] = ['User'],
        bioCondition: string = '',
        hraCondition: string = '',
        denCondition: string = '',
        optCondition: string = '',
        tobCondition: string = '',
        orderBy: { [key: string]: 'ASC' | 'DESC' } = { 'User.last_name': 'ASC' }
    ) {
        if (!orderBy) {
            orderBy = { code: 'ASC' };
        }
        let paginateObj: { page: number; take: number; skip: number } | null = null;
        if (paginationParam) {
            paginateObj = this.commonArrayService.getPaginationVar(
                paginationParam.page || 1,
                paginationParam.limit,
            );
        }
        let data = this.readReplicaUserRepository.createQueryBuilder('User')
            .leftJoinAndMapOne(
                'User.company',
                tableConstant.COMPANIES.TBL_COMPANY,
                'company',
                `company.id = User.org_id AND company.status = 1`,
            )
            .leftJoinAndMapOne(
                'User.Biometric',
                tableConstant.HEALTH_CHECKUP.TBL_HC_BIOMETRICS,
                'Biometric',
                `Biometric.id = (
                    SELECT b.id 
                    FROM ${tableConstant.HEALTH_CHECKUP.TBL_HC_BIOMETRICS} b 
                    WHERE b.user_id = User.id 
                    AND (${bioCondition || '1=1'})
                    ORDER BY b.created DESC 
                    LIMIT 1
                )`
            )
            .leftJoinAndMapOne(
                'User.Hrabiometric',
                tableConstant.HEALTH_ASSESSMENT.TBL_HA_HRABIOMETRICS,
                'Hrabiometric',
                `Hrabiometric.id = (
                    SELECT h.id 
                    FROM ${tableConstant.HEALTH_ASSESSMENT.TBL_HA_HRABIOMETRICS} h 
                    WHERE h.user_id = User.id 
                    AND (${hraCondition || '1=1'})
                    ORDER BY h.date DESC 
                    LIMIT 1
                )`
            )
            .leftJoinAndMapOne(
                'User.Dentist',
                tableConstant.HEALTH_CHECKUP.TBL_HC_DENTISTS,
                'Dentist',
                `Dentist.id = (
                    SELECT d.id 
                    FROM ${tableConstant.HEALTH_CHECKUP.TBL_HC_DENTISTS} d 
                    WHERE d.userid = User.id 
                    AND (${denCondition || '1=1'})
                    ORDER BY d.date_completed DESC 
                    LIMIT 1
                )`
            )
            .leftJoinAndMapOne(
                'User.Optometrist',
                tableConstant.HEALTH_CHECKUP.TBL_HC_OPTOMETRISTS,
                'Optometrist',
                `Optometrist.id = (
                    SELECT o.id 
                    FROM ${tableConstant.HEALTH_CHECKUP.TBL_HC_OPTOMETRISTS} o 
                    WHERE o.userid = User.id 
                    AND (${optCondition || '1=1'})
                    ORDER BY o.date_completed DESC 
                    LIMIT 1
                )`
            )
            .leftJoinAndMapOne(
                'User.Tabaccouse',
                tableConstant.HEALTH_CHECKUP.TBL_HC_TOBACCO_USES,
                'Tabaccouse',
                `Tabaccouse.id = (
                    SELECT t.id 
                    FROM ${tableConstant.HEALTH_CHECKUP.TBL_HC_TOBACCO_USES} t 
                    WHERE t.user_id = User.id 
                    AND (${tobCondition || '1=1'})
                    ORDER BY t.date_completed DESC 
                    LIMIT 1
                )`
            )
            .where(condition)
            .select(fields);
        data = data.orderBy('User.username', 'DESC');
        let resultData;
        if (paginationParam === null) {
            resultData = await data.getMany();
        } else {
            data = data.take(paginateObj.take).skip(paginateObj.skip);
            const [result, total] = await data.getManyAndCount();
            resultData = this.commonArrayService.paginationResponse(result, total, paginateObj);
        }
        return resultData;
    }
    async userCDLSList(condition: string, fields: string[] = ['User'], paginationParam: Partial<PaginateWithUserInput> | null = null, type: string = '', orderBy: { [key: string]: 'ASC' | 'DESC' } = { 'User.id': 'DESC' }) {
        let paginateObj: { page: number; take: number; skip: number } | null =
            null;
        if (paginationParam !== null) {
            paginateObj =
                paginationParam !== null
                    ? this.commonArrayService.getPaginationVar(
                        paginationParam.page || 1,
                        paginationParam.limit,
                    )
                    : null;
        }
        if (!orderBy) {
            orderBy = { 'User.id': 'DESC' };
        }
        let data = this.readReplicaUserRepository.createQueryBuilder('User')
            .leftJoinAndMapOne(
                'User.company',
                tableConstant.COMPANIES.TBL_COMPANY,
                'company',
                `company.id = User.org_id AND company.status = 1`,
            )
            .leftJoinAndMapOne(
                'User.department',
                tableConstant.COMPANIES.TBL_DEPARTMENT,
                'department',
                `department.id = User.department_id`,
            )
            .leftJoinAndMapOne(
                'User.Location',
                tableConstant.COMPANIES.TBL_LOCATION,
                'Location',
                `Location.id = User.location`,
            )
            .leftJoinAndMapOne(
                'User.settings',
                tableConstant.TBL_USERS_SETTINGS,
                'settings',
                `settings.user_id = User.id`,
            );
        data = data.where(condition).select(fields);
        if (type && type != '' && type == 'list') {
            let resultData: string[] | object[] | { [key: string]: string | number | boolean | object };
            if (paginationParam === null) {
                resultData = await data.orderBy(orderBy).groupBy('User.id').getMany();
            } else {
                data = data.take(paginateObj.take).skip(paginateObj.skip);
                let finalData = await data.orderBy(orderBy).groupBy('User.id').getManyAndCount();
                const [result, total] = finalData;
                resultData = this.commonArrayService.paginationResponse(
                    result,
                    total,
                    paginateObj,
                );
            }
            return resultData;
        }
        return await data.getOne();
    }
    async aggregateReportData(condition: string, bioCondition: string = '', dataCondition: string = '', joinTable: string[] = [], fields: string[] = [
        'User.gender', 'User.id', 'User.dob', 'User.username', 'User.first_name', 'User.last_name', 'User.created',
        'Biometric.id', 'Biometric.user_id', 'Biometric.created', 'Biometric.weight', 'Biometric.bmi', 'Biometric.systolic', 'Biometric.diastolic', 'Biometric.blood_glucose',
        'Biometric.test_type', 'Biometric.alc', 'Biometric.hdl', 'Biometric.ldl', 'Biometric.total_cholesterol', 'Biometric.triglycerides',
        'Dentist.id', 'Optometrist.id', 'Tabaccouse.id',
    ]) {
        let query = this.readReplicaUserRepository.createQueryBuilder('User');
        if (joinTable && joinTable.includes(
            tableConstant.HEALTH_CHECKUP.TBL_HC_BIOMETRICS)) {
            query = query.leftJoinAndMapMany(
                `User.Biometric`,
                tableConstant.HEALTH_CHECKUP.TBL_HC_BIOMETRICS,
                `Biometric`,
                `Biometric.user_id = User.id ${bioCondition == '' ? '' : ' AND ' + bioCondition}`,
            );
        }
        if (joinTable && joinTable.includes(
            tableConstant.HEALTH_CHECKUP.TBL_HC_DENTISTS ||
            tableConstant.HEALTH_CHECKUP.TBL_HC_OPTOMETRISTS ||
            tableConstant.HEALTH_CHECKUP.TBL_HC_TOBACCO_USES
        )) {
            for (let i = 0; i < joinTable.length; i++) {
                let tableName = '';
                let aliasName = '';
                switch (joinTable[i]) {
                    case tableConstant.HEALTH_CHECKUP.TBL_HC_DENTISTS:
                        tableName = tableConstant.HEALTH_CHECKUP.TBL_HC_DENTISTS;
                        aliasName = 'Dentist';
                        break;
                    case tableConstant.HEALTH_CHECKUP.TBL_HC_OPTOMETRISTS:
                        tableName = tableConstant.HEALTH_CHECKUP.TBL_HC_OPTOMETRISTS;
                        aliasName = 'Optometrist';
                        break;
                    case tableConstant.HEALTH_CHECKUP.TBL_HC_TOBACCO_USES:
                        tableName = tableConstant.HEALTH_CHECKUP.TBL_HC_TOBACCO_USES;
                        aliasName = 'Tabaccouse';
                        break;
                }
                let conditionStr = '';
                conditionStr = aliasName == 'Tabaccouse' ? `${aliasName}.user_id = User.id AND ${aliasName}.type_of_form = 'Tabacco'` : `${aliasName}.userid = User.id`;
                if (tableName && aliasName) {
                    query = query.leftJoinAndMapOne(
                        `User.${aliasName}`,
                        tableName,
                        aliasName,
                        `${conditionStr}  AND (${dataCondition || '1=1'})`,
                    );
                }
            }
        }
        query = query
            .where(condition)
            .select(fields)
            .orderBy('Biometric.created', 'DESC')
        // .groupBy('User.id');

        return await query.getMany();
    }
    async getBiometricsForCohortReport(
        from_date_0: string,
        to_date_0: string,
        from_date_1: string,
        to_date_1: string,
        userIds: string,
        sourceConditions: { srccond: string; srccond_ha_hr: string }
    ): Promise<any[]> {
        const userIdArray = userIds.split(',').map(id => parseInt(id.trim()));
        const hcBioQuery = this.dataSource
            .createQueryBuilder()
            .select([
                `CASE WHEN created BETWEEN :from0 AND :to0 THEN '1' ELSE '2' END as Datarange`,
                'user_id', 'height', 'weight', 'bmi', 'systolic', 'diastolic',
                'blood_glucose', 'alc', 'total_cholesterol', 'hdl', 'ldl',
                'triglycerides', 'waist', 'test_type', 'source', 'enter_by', 'created'
            ])
            .from('hc_biometrics', 'bio')
            .where('user_id IN (:...userIds)', { userIds: userIdArray })
            .andWhere(
                '((created BETWEEN :from0 AND :to0) OR (created BETWEEN :from1 AND :to1))',
                { from0: from_date_0, to0: to_date_0, from1: from_date_1, to1: to_date_1 }
            );

        if (sourceConditions.srccond) {
            hcBioQuery.andWhere(sourceConditions.srccond.replace(' AND ', ''));
        }
        return await hcBioQuery.getRawMany();
    }
    async challengeRecipeReportPaginate(
    condition: string,
    paginationParam: Partial<PaginateWithUserInput> | null = null,
    fields: string[] = ['User'],
    joinTable: string[] = [],
) {
    let paginateObj: { page: number; take: number; skip: number } | null = null;
    if (paginationParam !== null) {
        paginateObj = this.commonArrayService.getPaginationVar(
            paginationParam.page || 1,
            paginationParam.limit,
        );
    }
    let data = this.readReplicaUserRepository
        .createQueryBuilder('User')
        .innerJoinAndMapOne(
            'User.scj',
            tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE_JOIN_USERS,
            'scj',
            `scj.user_id = User.id`,
        )
        .leftJoinAndMapOne(
            'User.company',
            tableConstant.COMPANIES.TBL_COMPANY,
            'company',
            `company.id = User.org_id AND company.status = 1`,
        )
        .leftJoinAndMapOne(
            'User.department',
            tableConstant.COMPANIES.TBL_DEPARTMENT,
            'department',
            `department.id = User.department_id`,
        )
        .leftJoinAndMapOne(
            'User.Location',
            tableConstant.COMPANIES.TBL_LOCATION,
            'Location',
            `Location.id = User.location`,
        )
        .leftJoinAndMapOne(
            'User.companySetting',
            tableConstant.COMPANIES.TBL_COMPANY_SETTINGS,
            'companySetting',
            `companySetting.org_id = User.org_id`,
        )
        .leftJoinAndMapOne(
            'User.recipe',
            tableConstant.CHALLENGE.TBL_CH_RECIPE,
            'recipe',
            `recipe.user_id = scj.user_id AND recipe.schedule_id = scj.schedule_id AND recipe.status = 1`,
        );
    if (joinTable && joinTable.includes(tableConstant.CHALLENGE.TBL_CH_TEAM_MEMBERS)) {
        data = data
            .leftJoinAndMapOne(
                'User.teamMember',
                tableConstant.CHALLENGE.TBL_CH_TEAM_MEMBERS,
                'teamMember',
                `teamMember.user_id = scj.user_id AND teamMember.team_id IN (SELECT team_id FROM ch_team_schedule WHERE schedule_id = scj.schedule_id AND status = 1) AND teamMember.status = 1`,
            )
            .innerJoinAndMapOne(
                'teamMember.team',
                tableConstant.CHALLENGE.TBL_CH_TEAMS,
                'team',
                `team.id = teamMember.team_id AND team.status = 1`,
            );
    }
    data = data
        .where(condition)
        .orderBy('User.id', 'DESC')
        .select(fields);
    
    let resultData;
    if (paginationParam === null) {
        const rawData = await data.getRawMany();
        resultData = this.transformRawToNested(rawData);
    } else {
        const totalQuery = data.clone();
        const totalData = await totalQuery.getRawMany();
        const total = totalData.length;
        const rawResult = await data
            .limit(paginateObj.take)
            .offset(paginateObj.skip)
            .getRawMany();
        const result = this.transformRawToNested(rawResult);
        resultData = this.commonArrayService.paginationResponse(
            result,
            total,
            paginateObj,
        );
    }
    return resultData;
}
    private transformRawToNested(rawData: any[]): any[] {
        return rawData.map(row => {
            const nested: any = {};
            const mainEntity = 'User';
            for (const key in row) {
                const firstUnderscoreIndex = key.indexOf('_');
                if (firstUnderscoreIndex === -1) {
                    nested[key] = row[key];
                    continue;
                }
                const tableName = key.substring(0, firstUnderscoreIndex);
                const fieldName = key.substring(firstUnderscoreIndex + 1);
                if (tableName === mainEntity) {
                    nested[fieldName] = row[key];
                } else {
                    if (!nested[tableName]) {
                        nested[tableName] = {};
                    }
                    nested[tableName][fieldName] = row[key];
                }
            }
            return nested;
        });
    }
}

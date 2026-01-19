import {
  appConstant,
  BaseService,
  CommonArrayService,
  CommonDateService,
  CommonFileService,
  tableConstant,
  UserEntity
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Request } from "express";
import { UserInterface } from 'src/interface';
import { CompanyService } from 'src/modules/company/companies/company.service';
import { FindOptionsWhere, Repository } from 'typeorm';
import { PaginateWithUserInput } from "../../../input";
import { Transform, TransformCallback} from 'stream';
@Injectable()
export class UserService  extends BaseService<UserEntity> {
  constructor(
    @InjectRepository(UserEntity, appConstant.READ_REPLICA.toLowerCase())
    private readonly readReplicaUserRepository: Repository<UserEntity>,
    @InjectRepository(UserEntity, appConstant.MAIN.toLowerCase())
    private readonly writeReplicaUserRepository: Repository<UserEntity>,
    commonArrayService: CommonArrayService,
    private readonly commonDateService: CommonDateService,
    private readonly commonFileService: CommonFileService,
    private readonly companyService: CompanyService,
  ) {
    super(readReplicaUserRepository, writeReplicaUserRepository, 'users', commonArrayService );
  }
  async paginateList(condition: any, paginationParam: PaginateWithUserInput,fields: any[] = [],tableData: any[] = [],wellnessCondition: any = null) {
    const paginateObj = this.commonArrayService.getPaginationVar(
      paginationParam.page || 1,
      paginationParam.limit,
    );
    const order: string =
      paginationParam && paginationParam.order
        ? paginationParam.order
        : 'DESC';
    const orderBy: string =
      paginationParam && paginationParam.order_by
        ? `user.${paginationParam.order_by}`
        : 'user.created';
    let queryResult: any = this.readReplicaUserRepository.createQueryBuilder('user')
      if (tableData.includes(tableConstant.MASTER.TBL_ROLES)) {
        queryResult = queryResult.leftJoinAndMapOne(
            'user.role',
            tableConstant.MASTER.TBL_ROLES,
            'role',
            `role.id = user.role_id`,
        )
      }
      if (tableData.includes(tableConstant.COMPANIES.TBL_COMPANY)) {
        queryResult = queryResult.leftJoinAndMapOne(
            'user.company',
            tableConstant.COMPANIES.TBL_COMPANY,
            'company',
            `company.id = user.org_id AND company.status = 1`,
        )
      }
      if (tableData.includes(tableConstant.COMPANIES.TBL_DEPARTMENT)) {
        queryResult = queryResult.leftJoinAndMapOne(
            'user.department',
            tableConstant.COMPANIES.TBL_DEPARTMENT,
            'department',
            `department.id = user.department_id`,
        )
      }
      if (tableData.includes(tableConstant.COMPANIES.TBL_LOCATION)) {
        queryResult = queryResult.leftJoinAndMapOne(
            'user.Location',
            tableConstant.COMPANIES.TBL_LOCATION,
            'Location',
            `Location.id = user.location`,
        )
      }
      if (tableData.includes(tableConstant.COMPANIES.TBL_COMPANY_SETTINGS)) {
        queryResult = queryResult.leftJoinAndMapOne(
            'user.company_setting',
            tableConstant.COMPANIES.TBL_COMPANY_SETTINGS,
            'company_setting',
            `company_setting.org_id = user.org_id`,
        )
      }
      if (tableData.includes(tableConstant.CHALLENGE.TBL_CH_CHAT_SETTINGS)) {
        queryResult = queryResult.leftJoinAndMapOne(
            'user.cs',
            tableConstant.CHALLENGE.TBL_CH_CHAT_SETTINGS,
            'cs',
            `cs.user_id = user.id`,
        )
      }
      if (tableData.includes(tableConstant.TBL_USERS_SETTINGS)) {
        queryResult = queryResult.leftJoinAndMapOne(
            'user.settings',
            tableConstant.TBL_USERS_SETTINGS,
            'settings',
            `settings.user_id = user.id`,
        )
      }
      if( tableData.includes(tableConstant.COMPANIES.TBL_COMPANY_WELLNESS_ASSIGNMENTS)) {
        queryResult = queryResult.innerJoinAndMapOne(
          'user.userSetting',
          tableConstant.TBL_USERS_SETTINGS,
          'userSetting',
          `userSetting.user_id = user.id`,
        )
          .innerJoinAndMapOne(
            'user.wellnessAssignment',
            tableConstant.COMPANIES.TBL_COMPANY_WELLNESS_ASSIGNMENTS,
            'wellnessAssignment',
            `${wellnessCondition}`,
          )
      }
    queryResult = await queryResult.where(condition)
      .orderBy(orderBy, <any>order)
      .select(fields)
      .take(paginateObj.take)
      .skip(paginateObj.skip)
      .getManyAndCount();
    const [result, total] = queryResult;
    if(result && result.length && tableData.includes(tableConstant.TBL_USERS)){
      await Promise.all(result.map(async(ele)=> {
        if(ele.code){
          let data = await this.readReplicaUserRepository.createQueryBuilder('user')
          .where(`user.relationship_id = '${ele.code}'`)
          .select(['user.id','user.code','user.username','user.first_name','user.last_name','user.profile_image'])
          .getOne();
          if(data){
            ele['spouse'] = data;
          }
          else{
            ele['spouse'] = null;
          }
        }
      }));
    }
    return this.commonArrayService.paginationResponse(result, total, paginateObj);
  }
  async paginateListChampion(condition: any, innerCondition: any, paginationParam: PaginateWithUserInput, fields: any[] =
    ['user.id', 'user.status', 'user.role_id', 'user.date_of_hire', 'user.first_name', 'user.last_name', 'user.code', 'user.username',
      'role.id', 'role.title',
      'userSetting.id',
      'wellnessAssignment.id']) {
    const paginateObj = this.commonArrayService.getPaginationVar(
      paginationParam.page || 1,
      paginationParam.limit,
    );
    const order =
      paginationParam && paginationParam.order
        ? paginationParam.order
        : 'ASC';
    const orderBy =
      paginationParam && paginationParam.order_by
        ? paginationParam.order_by
        : 'user.first_name';
    let queryResult: any = this.readReplicaUserRepository.createQueryBuilder('user')
      .innerJoinAndMapOne(
        'user.userSetting',
        tableConstant.TBL_USERS_SETTINGS,
        'userSetting',
        `userSetting.user_id = user.id`,
      )
      .innerJoinAndMapOne(
        'user.wellnessAssignment',
        tableConstant.COMPANIES.TBL_COMPANY_WELLNESS_ASSIGNMENTS,
        'wellnessAssignment',
        `${innerCondition}`,
      )
      .leftJoinAndMapOne(
            'user.role',
            tableConstant.MASTER.TBL_ROLES,
            'role',
            `role.id = user.role_id`,
        )
    queryResult = await queryResult.where(condition)
      .orderBy(orderBy, <any>order)
      .addOrderBy('user.last_name', 'ASC')
      .select(fields)
      .take(paginateObj.take)
      .skip(paginateObj.skip)
      .getManyAndCount();
    const [result, total] = queryResult;
    // return this.commonArrayService.paginationResponse(result, total, paginateObj);
    if(result && result.length ){
      await Promise.all(result.map(async(ele)=> {
        if(ele.code){
          let data = await this.readReplicaUserRepository.createQueryBuilder('user')
          .where(`user.relationship_id = '${ele.code}'`)
          .select(['user.id','user.code','user.username','user.first_name','user.last_name','user.profile_image'])
          .getOne();
          if(data){
            ele['spouse'] = data;
          }
          else{
            ele['spouse'] = null;
          }
        }
      }));
    }
    return this.commonArrayService.paginationResponse(result, total, paginateObj);
  }
  async save(data: any, req: Request) {
    let id = 100 + req?.tokenUser?.role_id || data?.role_id;
    const savedResult = this.writeReplicaUserRepository.create({ ...data, lastuniqid: id });
    return await this.writeReplicaUserRepository.save(savedResult);
  }
  async delete(condition: any) {
    await this.writeReplicaUserRepository.delete(condition);
  }
  async findOne(condition: any, fields: any[] = ['user','role','company','companysetting','department','settings','Location','company_type.id','company_type.company_type',]) {
    return await this.readReplicaUserRepository.createQueryBuilder('user')
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
        'user.company_type',
        tableConstant.COMPANIES.TBL_COMPANY_TYPE,
        'company_type',
        `company_type.id = user.companytype_id`,
      )
      .leftJoinAndMapOne(
        'user.companysetting',
        tableConstant.COMPANIES.TBL_COMPANY_SETTINGS,
        'companysetting',
        `companysetting.org_id = user.org_id`,
      )
      .leftJoinAndMapOne(
        'user.department',
        tableConstant.COMPANIES.TBL_DEPARTMENT,
        'department',
        `department.id = user.department_id AND department.status = 1 AND department.deleted = 0`,
      )
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
        `Location.id = user.location AND Location.status = 1 AND Location.deleted = 0`,
      )
      .leftJoinAndMapOne(
        'company.meta',
        tableConstant.COMPANIES.TBL_COMPANY_META,
        'meta',
        `meta.org_id = user.org_id`,
      )
      .leftJoinAndMapOne(
          'user.preferred_language',
          tableConstant.TBL_LANGUAGES,
          'preferred_language',
          `preferred_language.id = user.preferred_lang`,
      )
      .where(condition)
      .select(fields)
      .orderBy('user.id', 'DESC')
      .getOne();
  }
  async agreementReport(condition: any,fields: any[] = null) {
    let result = this.readReplicaUserRepository.createQueryBuilder('user')
      .leftJoinAndMapOne(
        'user.company',
        tableConstant.COMPANIES.TBL_COMPANY,
        'company',
        `company.id = user.org_id AND company.status = 1`,
      )
      .leftJoinAndMapOne(
        'user.department',
        tableConstant.COMPANIES.TBL_DEPARTMENT,
        'department',
        `department.id = user.department_id AND department.status = 1 AND department.deleted = 0`,
      )
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
        `Location.id = user.location AND Location.status = 1 AND Location.deleted = 0`,
      )
      .leftJoinAndMapOne(
        'user.UserLoginAgreement',
        tableConstant.TBL_USER_LOGIN_AGREEMENT,
        'UserLoginAgreement',
        `UserLoginAgreement.user_id = user.id`,
      )
      .where(condition)
      .orderBy('user.id', 'DESC')
      .select(fields);
      return await result.getMany();
  }
  async listRecordTemplate(condition: any, orderBy: any = null, fields: any[] = null, groupBy :any = null, joinTable: any = []) : Promise<UserInterface[]> {
    if (!orderBy) {
      orderBy = { 'user.id': 'DESC' };
    }
    let data= this.readReplicaUserRepository.createQueryBuilder('user')
      data = data.leftJoinAndMapOne(
              'user.settings',
              tableConstant.TBL_USERS_SETTINGS,
              'settings',
              `settings.user_id = user.id`,
          )
    data = data.select(fields)
        .where(condition)
        .orderBy(Object.keys(orderBy)[0], orderBy[Object.keys(orderBy)[0]]);
    if(groupBy !== null){
      data.groupBy(groupBy);
    }
    return await data.getMany()
  }
  async listRecord(condition: any, orderBy: any = null, fields: any[] = null, groupBy :any = null, joinTable: any = []) : Promise<UserInterface[]> {
    if (!orderBy) {
      orderBy = { 'user.id': 'DESC' };
    }
    let data= this.readReplicaUserRepository.createQueryBuilder('user')
      if(joinTable && joinTable.length > 0){
        for(let i = 0; i < joinTable.length; i++){
            if(joinTable[i].type == 'INNER'){
                data = data.innerJoinAndMapOne(
                    `${joinTable[i].connect}.${joinTable[i].alias}`,
                    joinTable[i].table,
                    joinTable[i].alias,
                    joinTable[i].on,
                );
            } else if(joinTable[i].type == 'LEFTMANY'){
              data = data.leftJoinAndMapMany(
                    `${joinTable[i].connect}.${joinTable[i].alias}`,
                    joinTable[i].table,
                    joinTable[i].alias,
                    joinTable[i].on,
                );
            } else{
              data = data.leftJoinAndMapOne(
                  `${joinTable[i].connect}.${joinTable[i].alias}`,
                  joinTable[i].table,
                  joinTable[i].alias,
                  joinTable[i].on,
              );
            }
        }
      }
      else{
        data = data.leftJoinAndMapOne(
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
        )
      }
      data = data.select(fields)
      .where(condition)
      .orderBy(Object.keys(orderBy)[0], orderBy[Object.keys(orderBy)[0]]);
      if(groupBy !== null){
        data.groupBy(groupBy);
      }
      return await data.getMany()
  }
  async listUDLCSRecords(condition: any, orderBy: any = null, fields: any[] = null, groupBy :any = null) {
    if (!orderBy) {
      orderBy = { code: 'ASC' };
    }
    let data= await this.readReplicaUserRepository.createQueryBuilder('user')
      .leftJoinAndMapOne(
        'user.company',
        tableConstant.COMPANIES.TBL_COMPANY,
        'company',
        `company.id = user.org_id AND company.status = 1`,
      )
      .leftJoinAndMapOne(
        'user.department',
        tableConstant.COMPANIES.TBL_DEPARTMENT,
        'department',
        `department.id = user.department_id`,
      )
      .leftJoinAndMapOne(
        'user.Location',
        tableConstant.COMPANIES.TBL_LOCATION,
        'Location',
        `Location.id = user.location`,
      )
      .leftJoinAndMapOne(
        'company.companySetting',
        tableConstant.COMPANIES.TBL_COMPANY_SETTINGS,
        'companySetting',
        `companySetting.org_id = user.org_id`,
      )
      .leftJoinAndMapOne(
        'user.settings',
        tableConstant.TBL_USERS_SETTINGS,
        'settings',
        'settings.user_id = user.id',
      )
      .where(condition)
      .orderBy(`user.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]]);
      if (fields) {
        data.select(fields);
      }
      return data.getMany()
  }
  async reportListRecordsStream(
    condition: any,
    orderBy: any = null,
    fields: any[] = null,
    groupBy: any = null,
  ) {
    if (!orderBy) {
      orderBy = { id: 'ASC' };
    }
    const queryBuilder = this.readReplicaUserRepository.createQueryBuilder('user')
      .innerJoinAndMapOne(
        'user.company',
        tableConstant.COMPANIES.TBL_COMPANY,
        'company',
        'company.id = user.org_id AND company.status = 1',
      )
      .leftJoinAndMapOne(
        'user.department',
        tableConstant.COMPANIES.TBL_DEPARTMENT,
        'department',
        'department.id = user.department_id',
      )
      .leftJoinAndMapOne(
        'user.settings',
        tableConstant.TBL_USERS_SETTINGS,
        'settings',
        'settings.user_id = user.id',
      )
      .leftJoinAndMapOne(
        'user.Location',
        tableConstant.COMPANIES.TBL_LOCATION,
        'Location',
        `Location.id = user.location`,
      )
      .leftJoinAndMapMany(
        'user.userLogin',
        tableConstant.TBL_USERS_LOGIN,
        'userLogin',
        'userLogin.user_id = user.id',
      )
      .where(condition);
    if (groupBy) queryBuilder.groupBy(groupBy);
    if (fields) queryBuilder.select(fields);
    queryBuilder
      .orderBy(`user.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
      .addOrderBy('userLogin.login_time', 'DESC');
    const dbStream = await queryBuilder.stream();
    // TRUE TRANSFORM STREAM — GROUP BY USER ON THE FLY
    const groupByUserStream = new Transform({
      objectMode: true,
      transform(this: any, row: any, encoding: string, callback: TransformCallback) {
        const userId = row.user_id;
        if (!this.currentUser || this.currentUser.id !== userId) {
          if (this.currentUser) {
            this.push(this.currentUser);
          }
          this.currentUser = {
            id: row.user_id,
            role_id: row.user_role_id,
            membership_code: row.user_membership_code,
            department_id: row.user_department_id,
            location: row.user_location,
            status: row.user_status,
            num_login: row.user_num_login,
            last_login: row.user_last_login,
            code: row.user_code,
            on_insurance_plan: row.user_on_insurance_plan,
            gender: row.user_gender,
            username: row.user_username,
            first_name: row.user_first_name,
            middle_name: row.user_middle_name,
            last_name: row.user_last_name,
            relationship_id: row.user_relationship_id,
            dob: row.user_dob,
            date_of_hire: row.user_date_of_hire,
            insurance_plan_name: row.user_insurance_plan_name,
            email: row.user_email,
            timezone: row.user_timezone,
            company: row.company_id ? { id: row.company_id, company_name: row.company_company_name } : null,
            department: row.department_id ? { id: row.department_id, dept_name: row.department_dept_name } : null,
            settings: row.settings_id ? { id: row.settings_id, jobtitle: row.settings_jobtitle } : null,
            Location: row.Location_id ? { id: row.Location_id, lname: row.Location_lname } : null,
            userLogin: []
          };
        }
        if (row.userLogin_id) {
          this.currentUser.userLogin.push({
            id: row.userLogin_id,
            user_id: row.userLogin_user_id,
            ip: row.userLogin_ip,
            source: row.userLogin_source,
            timezone: row.userLogin_timezone,
            login_time: row.userLogin_login_time,
            useragent: row.userLogin_useragent,
          });
        }
        callback();
      },
      flush(this: any, callback: TransformCallback) {
        if (this.currentUser) {
          this.push(this.currentUser);
        }
        this.currentUser = null;
        callback();
      }
    });
    return dbStream.pipe(groupByUserStream);
  }
  async listUDLRecord(condition: any) {
    return await this.readReplicaUserRepository.createQueryBuilder('user')
      .leftJoinAndMapOne(
        'user.department',
        tableConstant.COMPANIES.TBL_DEPARTMENT,
        'department',
        `department.id = user.department_id`,
      )
      .leftJoinAndMapOne(
        'user.Location',
        tableConstant.COMPANIES.TBL_LOCATION,
        'Location',
        `Location.id = user.location`,
      )
      .where(condition)
      .orderBy('user.id', 'DESC')
      .getMany();
  }
  async findUserRecord(condition: FindOptionsWhere<UserEntity>, field: (keyof UserEntity)[] = [], orderBy: object = null): Promise<UserEntity | null> {
    if (!orderBy) {
      orderBy = { id: 'DESC' };
    }
    return await this.readReplicaUserRepository.findOne({
      select: field,
      where: condition,
      order: orderBy,
    });
  }
  async findAllUserRecord(condition: any, field: any[] = [], orderBy: any = null , groupBy : any =null) {
    if (!orderBy) {
      orderBy = { id: 'DESC' };
    }
    if (groupBy) {
      const queryBuilder = this.readReplicaUserRepository.createQueryBuilder('user');
      queryBuilder.select(field);
      queryBuilder.where(condition);
      queryBuilder.groupBy(groupBy);
      Object.keys(orderBy).forEach((key) => {
        queryBuilder.addOrderBy(`user.${key}`, orderBy[key]);
      });
      return await queryBuilder.getRawMany();
    }
    return await this.readReplicaUserRepository.find({
      select: field,
      where: condition,
      order: orderBy,
    });
  }
  async update(condition: any, data: any) {
    if (data.new_password) {
      const entityToUpdate = new UserEntity();
      Object.assign(entityToUpdate, data);
      await entityToUpdate.hashPassword();
      // data.password = entityToUpdate.password
      data.new_password = entityToUpdate.new_password
    }
    data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaUserRepository.metadata);
    return await this.writeReplicaUserRepository.createQueryBuilder('user')
      .update(UserEntity)
      .set(data)
      .where(condition)
      .execute();
  }
  async getHealthPlan(condition: string) {
    return await this.readReplicaUserRepository.createQueryBuilder('user')
      .where(condition)
      .select(['user.insurance_plan_name'])
      .getMany();
  }
  async getProfile(condition: any) {
    return await this.readReplicaUserRepository.createQueryBuilder('user')
      .leftJoinAndMapOne(
        'user.settings',
        tableConstant.TBL_USERS_SETTINGS,
        'settings',
        `settings.user_id = user.id`,
      )
      .leftJoinAndMapOne(
        'user.company',
        tableConstant.COMPANIES.TBL_COMPANY,
        'company',
        `company.id = user.org_id AND company.status = 1`,
      )
      .leftJoinAndMapOne(
        'user.department',
        tableConstant.COMPANIES.TBL_DEPARTMENT,
        'department',
        `department.id = user.department_id AND department.status = 1 AND department.deleted = 0`,
      )
      .leftJoinAndMapOne(
        'user.Location',
        tableConstant.COMPANIES.TBL_LOCATION,
        'Location',
        `Location.id = user.location AND Location.status = 1 AND Location.deleted = 0`,
      )
      .leftJoinAndMapOne(
        'company.company_type',
        tableConstant.COMPANIES.TBL_COMPANY_TYPE,
        'company_type',
        `company_type.id = company.companytype_id`,
      )
      .where(condition)
      .select([
        'user', 
        'settings', 
        'company.id',
        'company.company_name',
        'company.company_logo',
        'department.id',
        'department.dept_name',
        'Location.id',
        'Location.location_name',
        'company_type.id',
        'company_type.company_type',
      ])
      .orderBy('user.id', 'DESC')
      .getOne();
  }
  async userFilerForCampaign(type: string, condition: string, pageid: number = null, limit: number = null) {
    if (type == 'testUser') {
      return await this.readReplicaUserRepository
        .createQueryBuilder('user')
        .leftJoinAndMapOne(
          'user.company',
          tableConstant.COMPANIES.TBL_COMPANY,
          'company',
          `company.id = user.org_id AND company.status = 1`,
        )
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
        .leftJoinAndMapOne(
          'user.settings',
          tableConstant.TBL_USERS_SETTINGS,
          'settings',
          `settings.user_id = user.id`,
        )
        .select([
          '`user`.`id` AS `ID`',
          '`user`.`first_name` AS `First Name`',
          '`user`.`last_name` AS `Last Name`',
          '`user`.`email` AS `Email`',
          '(CASE WHEN user.gender = "m" THEN "Male" WHEN user.gender = "f" THEN "Fe-male" WHEN user.gender = "o" THEN "Others" END) as Gender',
          '`user`.`insurance_plan_name` AS `Health Plan`',
          '`user`.`code` AS `User Code`',
          '`user`.`username` AS `User Name`',
          '(CASE WHEN (user.status = 1) THEN "Active"  ELSE "De-Active" END) as Status',
          '(CASE WHEN user.role_id = "2" THEN "Employee" WHEN user.role_id = "16" THEN "Spouse" END) as Role',
          '`company`.`company_name` AS `Organization Name`',
          '`department`.`dept_name` AS `Department`',
          '`location`.`location_name` AS `Location`',
          '(CASE WHEN settings.email_receiving = "1" THEN "No" WHEN settings.email_receiving = "0" THEN "Yes" END) as Subscribe'
        ])
        .where(condition)
        .orderBy('user.first_name', 'ASC')
        .getRawOne();
    } else if (type == 'count') {
      return await this.readReplicaUserRepository
        .createQueryBuilder('user')
        .leftJoinAndMapOne(
          'user.company',
          tableConstant.COMPANIES.TBL_COMPANY,
          'company',
          `company.id = user.org_id AND company.status = 1`,
        )
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
        .leftJoinAndMapOne(
          'user.settings',
          tableConstant.TBL_USERS_SETTINGS,
          'settings',
          `settings.user_id = user.id`,
        )
        .select([
          '`user`.`id` AS `ID`',
          '`user`.`first_name` AS `First Name`',
          '`user`.`last_name` AS `Last Name`',
          '`user`.`email` AS `Email`',
          '(CASE WHEN user.gender = "m" THEN "Male" WHEN user.gender = "f" THEN "Fe-male" WHEN user.gender = "o" THEN "Others" END) as Gender',
          '`user`.`insurance_plan_name` AS `Health Plan`',
          '`user`.`code` AS `User Code`',
          '`user`.`username` AS `User Name`',
          '(CASE WHEN (user.status = 1) THEN "Active"  ELSE "De-Active" END) as Status',
          '(CASE WHEN user.role_id = "2" THEN "Employee" WHEN user.role_id = "16" THEN "Spouse" END) as Role',
          '`company`.`company_name` AS `Organization Name`',
          '`department`.`dept_name` AS `Department`',
          '`location`.`location_name` AS `Location`',
          '(CASE WHEN settings.email_receiving = "1" THEN "No" WHEN settings.email_receiving = "0" THEN "Yes" END) as Subscribe'
        ])
        .where(condition)
        .getCount();
    } else if (type == 'multipleIds') {
      return await this.readReplicaUserRepository
        .createQueryBuilder('user')
        .leftJoinAndMapOne(
          'user.company',
          tableConstant.COMPANIES.TBL_COMPANY,
          'company',
          `company.id = user.org_id AND company.status = 1`,
        )
        .leftJoinAndMapOne(
          'user.department',
          tableConstant.COMPANIES.TBL_DEPARTMENT,
          'department',
          `department.id = user.department_id`,
        )
        .leftJoinAndMapOne(
          'user.Location',
          tableConstant.COMPANIES.TBL_LOCATION,
          'Location',
          `Location.id = user.location`,
        )
        .leftJoinAndMapOne(
          'user.settings',
          tableConstant.TBL_USERS_SETTINGS,
          'settings',
          `settings.user_id = user.id`,
        )
        .select([
          '`user`.`id`',
          '`user`.`id`'
        ])
        .where(condition)
        .getRawMany();
    } else if (type == 'multiple') {
      const paginateObj = this.commonArrayService.getPaginationVar(
        pageid || 1,
        limit,
      );
      return await this.readReplicaUserRepository
        .createQueryBuilder('user')
        .leftJoinAndMapOne(
          'user.company',
          tableConstant.COMPANIES.TBL_COMPANY,
          'company',
          `company.id = user.org_id AND company.status = 1`,
        )
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
        .leftJoinAndMapOne(
          'user.settings',
          tableConstant.TBL_USERS_SETTINGS,
          'settings',
          `settings.user_id = user.id`,
        )
        .select([
          '`user`.`id` AS `ID`',
          '`user`.`first_name` AS `First Name`',
          '`user`.`last_name` AS `Last Name`',
          '`user`.`email` AS `Email`',
          '(CASE WHEN user.gender = "m" THEN "Male" WHEN user.gender = "f" THEN "Fe-male" WHEN user.gender = "o" THEN "Others" END) as Gender',
          '`user`.`insurance_plan_name` AS `Health Plan`',
          '`user`.`code` AS `User Code`',
          '`user`.`username` AS `User Name`',
          '(CASE WHEN (user.status = 1) THEN "Active"  ELSE "De-Active" END) as Status',
          '(CASE WHEN user.role_id = "2" THEN "Employee" WHEN user.role_id = "16" THEN "Spouse" END) as Role',
          '`company`.`company_name` AS `Organization Name`',
          '`department`.`dept_name` AS `Department`',
          '`location`.`location_name` AS `Location`',
          '(CASE WHEN settings.email_receiving = "1" THEN "No" WHEN settings.email_receiving = "0" THEN "Yes" END) as Subscribe'
        ])
        .where(condition)
        .orderBy('user.id', 'ASC')
        .limit(paginateObj.take)
        .offset(paginateObj.skip)
        .getRawMany();
    } else if (type == 'single') {
      return await this.readReplicaUserRepository
        .createQueryBuilder('user')
        .leftJoinAndMapOne(
          'user.company',
          tableConstant.COMPANIES.TBL_COMPANY,
          'company',
          `company.id = user.org_id AND company.status = 1`,
        )
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
        .leftJoinAndMapOne(
          'user.settings',
          tableConstant.TBL_USERS_SETTINGS,
          'settings',
          `settings.user_id = user.id`,
        )
        .select([
          '`user`.`id` AS `ID`',
          '`user`.`first_name` AS `First Name`',
          '`user`.`last_name` AS `Last Name`',
          '`user`.`email` AS `Email`',
          '(CASE WHEN user.gender = "m" THEN "Male" WHEN user.gender = "f" THEN "Fe-male" WHEN user.gender = "o" THEN "Others" END) as Gender',
          '`user`.`insurance_plan_name` AS `Health Plan`',
          '`user`.`code` AS `User Code`',
          '`user`.`username` AS `User Name`',
          '(CASE WHEN (user.status = 1) THEN "Active"  ELSE "De-Active" END) as Status',
          '(CASE WHEN user.role_id = "2" THEN "Employee" WHEN user.role_id = "16" THEN "Spouse" END) as Role',
          '`company`.`company_name` AS `Organization Name`',
          '`department`.`dept_name` AS `Department`',
          '`location`.`location_name` AS `Location`',
          '(CASE WHEN settings.email_receiving = "1" THEN "No" WHEN settings.email_receiving = "0" THEN "Yes" END) as Subscribe'
        ])
        .where(condition)
        .getRawOne();
    } else if (type == 'GroupTestUser') {
      return await this.readReplicaUserRepository
        .createQueryBuilder('user')
        .leftJoinAndMapOne(
          'user.company',
          tableConstant.COMPANIES.TBL_COMPANY,
          'company',
          `company.id = user.org_id AND company.status = 1`,
        )
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
        .leftJoinAndMapOne(
          'user.settings',
          tableConstant.TBL_USERS_SETTINGS,
          'settings',
          `settings.user_id = user.id`,
        )
        .select([
          '`user`.`id` AS `ID`',
          '`user`.`membership_code` AS `company_code`',
          '`user`.`first_name` AS `First Name`',
          '`user`.`last_name` AS `Last Name`',
          '`user`.`email` AS `Email`',
          '(CASE WHEN user.gender = "m" THEN "Male" WHEN user.gender = "f" THEN "Fe-male" WHEN user.gender = "o" THEN "Others" END) as Gender',
          '`user`.`insurance_plan_name` AS `Health Plan`',
          '`user`.`code` AS `User Code`',
          '`user`.`username` AS `User Name`',
          '(CASE WHEN (user.status = 1) THEN "Active"  ELSE "De-Active" END) as Status',
          '(CASE WHEN user.role_id = "2" THEN "Employee" WHEN user.role_id = "16" THEN "Spouse" END) as Role',
          '`company`.`company_name` AS `Organization Name`',
          '`department`.`dept_name` AS `Department`',
          '`location`.`location_name` AS `Location`',
          '(CASE WHEN settings.email_receiving = "1" THEN "No" WHEN settings.email_receiving = "0" THEN "Yes" END) as Subscribe'
        ])
        .where(condition)
        .groupBy('user.membership_code')
        .getRawMany();
    }
  }
  async activePluginsRecord(condition: any, select: any[] = ['biometrics'], paginationParam: any = null) {
    let paginateObj = null;
    if (paginationParam) {
      paginateObj = this.commonArrayService.getPaginationVar(
        paginationParam.page || 1,
        paginationParam.limit,
      );
    }
    const order =
      paginationParam && paginationParam.order
        ? paginationParam.order
        : 'DESC';
    const orderBy =
      paginationParam && paginationParam.order_by
        ? `user.${paginationParam.order_by}`
        : 'user.id';
    let query: any = this.readReplicaUserRepository.createQueryBuilder('user')
      .leftJoinAndMapOne(
        'user.active',
        tableConstant.COMPANIES.TBL_ACTIVE_PLUGINS,
        'active',
        `user.org_id = active.company_id`,
      )
      .innerJoinAndMapOne(
        'user.company',
        tableConstant.COMPANIES.TBL_COMPANY,
        'company',
        `company.id = user.org_id`,
      )
      .where(condition)
      .select(select)
    if (paginateObj) {
      query = await query
        .orderBy(orderBy, <any>order)
        .take(paginateObj.take)
        .skip(paginateObj.skip)
        .getManyAndCount()
    } else {
      query = await query.getMany();
    }
    return query;
  }
  async usersList(condition: any, field: any[] = [], orderBy: any = null) {
    if (!orderBy) {
      orderBy = { id: 'DESC' };
    }
    let query = this.readReplicaUserRepository.createQueryBuilder('user')
      .where(condition)
      .select(field)
      .orderBy(`user.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]]);
      return await query.getRawMany();
  }
  async userChallengeData(user: UserInterface) {
    let query = this.readReplicaUserRepository.createQueryBuilder('user');
    let condition = '';
    if (user.role_id == 2 || user.role_id == 16 || user.role_id == 20) {
      condition = `user.role_id = 12 AND user.membership_code = '${user.membership_code}' AND wellness.id is Null`;
      /* user?.settings?.city 's issue fix use quoteEscaper*/
      query = query
        .leftJoinAndMapOne(
          'user.wellness',
          tableConstant.COMPANIES.TBL_COMPANY_WELLNESS_ASSIGNMENTS,
          'wellness',
          `(wellness.org_id = ${user.org_id} AND wellness.user_id = user.id) AND 
          (
            (wellness.location = ${user?.location} and wellness.location != 0) OR 
            (wellness.department = ${user?.department_id} and wellness.department != 0) OR
            (wellness.state = '${this.commonFileService.quoteEscaper(user?.settings?.state)}' and wellness.state != '') OR
            (wellness.city = '${this.commonFileService.quoteEscaper(user?.settings?.city)}' and wellness.city != '') OR
            (wellness.is_global = 1)
          )`,
        );
    }
    if (user.role_id == 12) {
      condition = `user.org_id = '${user.org_id}' `;
      query = query
        .innerJoinAndMapOne(
          'user.setting',
          tableConstant.TBL_USERS_SETTINGS,
          'setting',
          `setting.user_id = user.id`,
        )
        .innerJoinAndMapOne(
          'user.wellness',
          tableConstant.COMPANIES.TBL_COMPANY_WELLNESS_ASSIGNMENTS,
          'wellness',
          `(wellness.org_id = ${user?.org_id} AND wellness.user_id = ${user.id}) AND 
          (
            (wellness.location = user.location and user.location != 0) OR 
            (wellness.department = user.department_id and user.department_id != 0) OR
            (wellness.state = setting.state and setting.state != "") OR
            (wellness.city = setting.city and setting.city != "") OR
            (wellness.is_global = 1)
          )`,
        );
    }
    query = query.where(condition);
    return await query.getMany();
  }

  async findUserFullRecord(condition: any, field: any[] = ['user.id', 'user.first_name', 'user.last_name', 'user.email', 'user.code'] , table: string = ''): Promise<UserInterface> {
    let query = this.readReplicaUserRepository.createQueryBuilder('user');
      if(table === 'c_companies') {
        query = query
          .leftJoinAndMapOne(
            'user.company',
            tableConstant.COMPANIES.TBL_COMPANY,
            'company',
            `company.id = user.org_id AND company.status = 1`,
          );
        }

     return await query.leftJoinAndMapOne(
        'user.settings',
        tableConstant.TBL_USERS_SETTINGS,
        'settings',
        `settings.user_id = user.id`,
      )
      .where(condition)
      .select(field)
      .getOne();
  }
  async countUsers(condition: any, field: any[] = [], orderBy: any = null) {
    if (!orderBy) {
      orderBy = { id: 'DESC' };
    }
    return await this.readReplicaUserRepository.createQueryBuilder('user')
      .where(condition)
      .select(field)
      .orderBy(`user.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
      .getCount();
  }
  async getCompanyDetails(condition: any) {
    return await this.readReplicaUserRepository.createQueryBuilder('user')
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
        `meta.org_id = user.org_id`,
      )
      .where(condition)
      .select([
        'user', 'company.id', 'company.company_name', 'company.code', 'company.company_logo', 'company.status',
         'meta',
      ])
      .orderBy('user.id', 'DESC')
      .getOne();
  }

  async usersDataWellness(user: Partial<UserInterface>, whereCondition: string = '', subType: string = '', type: string = '') : Promise<UserEntity[]> {
    let field: string[] = ['user.id'];
    let condition: string = '';
    let wellnessCondition: string = '';
    let query = this.readReplicaUserRepository.createQueryBuilder('user');
    // for handling state code comming from user setting
    if (user && user?.['settings'] && user?.['settings']?.state) {
      let stateData = await this.companyService.stateList(user?.['settings']?.state, '');
      let state = stateData.find(
        ele =>
          ele.statecode == user['settings']?.state
          || ele.state == user['settings']?.state
      );
      user['settings'].state = state?.['state'];
      user['settings']['statecode'] = state?.['statecode'];
    }
    if((user.role_id == 2 || user.role_id == 16) && type == ''){  
      wellnessCondition = `wellnessAssignment.org_id = ${user.org_id} AND wellnessAssignment.user_id = user.id AND wellnessAssignment.status = 1
      AND(
      (wellnessAssignment.location = ${user.location} AND wellnessAssignment.location != 0) OR
      (wellnessAssignment.department = ${user.department_id} AND wellnessAssignment.department != 0) OR
      (wellnessAssignment.state = "${user?.settings?.state}" AND wellnessAssignment.state !='') OR
      (wellnessAssignment.state = "${user?.settings?.['statecode']}" AND wellnessAssignment.state !='') OR
      (wellnessAssignment.city = "${user?.settings?.city}" AND wellnessAssignment.city !='') OR
      wellnessAssignment.is_global = 1
      )`;
      condition = `user.role_id = 12 AND user.membership_code = '${user['membership_code']}' AND wellnessAssignment.id IS NULL`;
      query = query
      .leftJoinAndMapOne(
        'user.wellnessAssignment',
        tableConstant.COMPANIES.TBL_COMPANY_WELLNESS_ASSIGNMENTS,
        'wellnessAssignment',
        wellnessCondition,
      )
      .groupBy('user.id')
    }
    if(user.role_id == 12){       // for champion role wellness assignment
      wellnessCondition = `wellnessAssignment.org_id = ${user.org_id} AND wellnessAssignment.user_id = ${user.id} AND wellnessAssignment.status = 1
      AND(
      (wellnessAssignment.location = user.location AND user.location != 0) OR
      (wellnessAssignment.department = user.department_id AND user.department_id != 0) OR
      (wellnessAssignment.state = settings.state AND settings.state !='') OR
      (wellnessAssignment.city = settings.city AND settings.city !='') OR
      wellnessAssignment.is_global = 1
      )`;
      if(subType == 'location'){
        wellnessCondition = `wellnessAssignment.org_id = ${user.org_id} AND wellnessAssignment.user_id = ${user.id} AND wellnessAssignment.status = 1
        AND
        ( 
          (wellnessAssignment.location = user.location AND user.location != 0) OR
          (wellnessAssignment.state = settings.state AND settings.state !='') OR
          (wellnessAssignment.city = settings.city AND settings.city !='') OR
          wellnessAssignment.is_global = 1 
        )`;
      }
      if(subType == 'department'){
        wellnessCondition = `wellnessAssignment.org_id = ${user.org_id} AND wellnessAssignment.user_id = ${user.id} AND wellnessAssignment.status = 1
        AND(
        (wellnessAssignment.department = user.department_id AND user.department_id != 0) OR
        wellnessAssignment.is_global = 1
        )`;
      }
      query = query
        .innerJoinAndMapOne(
          'user.settings',
          tableConstant.TBL_USERS_SETTINGS,
          'settings',
          `settings.user_id = user.id`,
        )
        .innerJoinAndMapOne(
          'user.wellnessAssignment',
          tableConstant.COMPANIES.TBL_COMPANY_WELLNESS_ASSIGNMENTS,
          'wellnessAssignment',
          wellnessCondition,
        );
      condition = `user.org_id = ${user.org_id}`;
      //for champion role chat module.
      if(type && type !== '' && type == 'chat'){
        query.groupBy('user.id');
      }
    }
    if ((user.role_id == 2 || user.role_id == 16) && type == 'userWise') {        // for user wise wellness assignment
      wellnessCondition = `wellnessAssignment.org_id = ${user.org_id} AND wellnessAssignment.status = 1
      AND(
      (wellnessAssignment.location = ${user.location} AND wellnessAssignment.location != 0) OR
      (wellnessAssignment.department = ${user.department_id} AND wellnessAssignment.department != 0) OR
      (wellnessAssignment.state = "${user?.settings?.state}" AND wellnessAssignment.state !='') OR
      (wellnessAssignment.state = "${user?.settings?.['statecode']}" AND wellnessAssignment.state !='') OR
      (wellnessAssignment.city = "${user?.settings?.city}" AND wellnessAssignment.city !='') OR
      wellnessAssignment.is_global = 1
      )`;
      condition = ` user.membership_code = '${user['membership_code']}' AND user.id = ${user.id}`;
      query = query
        .innerJoinAndMapMany(
          'user.wellnessAssignment',
          tableConstant.COMPANIES.TBL_COMPANY_WELLNESS_ASSIGNMENTS,
          'wellnessAssignment',
          wellnessCondition,
        ).orderBy('wellnessAssignment.id', 'DESC');
      field  = ['user.id', 'user.first_name', 'user.last_name', 'user.email', 'user.code' , 'wellnessAssignment'];
    }
    if ((user.role_id == 2 || user.role_id == 16) && type == 'userLogin') {   // for user login wellness assignment data
      wellnessCondition = `wellnessAssignment.org_id = ${user.org_id} AND wellnessAssignment.status = 1
                AND(
                (wellnessAssignment.location = ${user.location} AND wellnessAssignment.location != 0) OR
                (wellnessAssignment.department = ${user.department_id} AND wellnessAssignment.department != 0) OR
                (wellnessAssignment.state = "${user?.settings?.state}" AND wellnessAssignment.state !='') OR
                (wellnessAssignment.state = "${user?.settings?.['statecode']}" AND wellnessAssignment.state !='') OR
                (wellnessAssignment.city = "${user?.settings?.city}" AND wellnessAssignment.city !='') OR
                wellnessAssignment.is_global = 1
                )`;
      condition = `user.membership_code = '${user['membership_code']}' AND user.id = ${user['id']}`;
      query = query
        .innerJoinAndMapOne(
          'user.wellnessAssignment',
          tableConstant.COMPANIES.TBL_COMPANY_WELLNESS_ASSIGNMENTS,
          'wellnessAssignment',
          wellnessCondition,
        )
        .groupBy('user.id');
    }
    if(whereCondition && whereCondition !=''){
      condition = whereCondition;
    }
    return await query
      .where(condition)
      .select(field)
      .getMany();
  }
  async getAllUsers(condition: any, fields: any = ['id', 'name'], joinTale: any = []) {
    let query = this.readReplicaUserRepository.createQueryBuilder('user');
        if(joinTale && joinTale.length > 0){
            for(let i = 0; i < joinTale.length; i++){
                if(joinTale[i].type == 'INNER'){
                    query = query.innerJoinAndMapOne(
                        `${joinTale[i].connect}.${joinTale[i].alias}`,
                        joinTale[i].table,
                        joinTale[i].alias,
                        joinTale[i].on,
                    );
                }else{
                    query = query.leftJoinAndMapOne(
                        `${joinTale[i].connect}.${joinTale[i].alias}`,
                        joinTale[i].table,
                        joinTale[i].alias,
                        joinTale[i].on,
                    );
                }
            }
        }
        return await query.where(condition)
        .select(fields)
        .orderBy({
            'user.id': 'ASC',
        })
        .getMany();
  }
  async getUserBOTData(condition: string, fields: any = ['id', 'first_name', 'last_name', 'email', 'code']) {
    return await this.readReplicaUserRepository.createQueryBuilder('user')
      .leftJoinAndMapOne(
        'user.biometric',
        tableConstant.HEALTH_CHECKUP.TBL_HC_BIOMETRICS,
        'biometric',
        `biometric.user_id = user.id`,
      )
      .leftJoinAndMapOne(
        'user.hrabiometric',
        tableConstant.HEALTH_ASSESSMENT.TBL_HA_HRABIOMETRICS,
        'hrabiometric',
        `hrabiometric.user_id = user.id`,
      )
      .leftJoinAndMapOne(
        'user.dentist',
        tableConstant.HEALTH_CHECKUP.TBL_HC_DENTISTS,
        'dentist',
        `dentist.userid = user.id`,
      )
      .leftJoinAndMapOne(
        'user.optometrist',
        tableConstant.HEALTH_CHECKUP.TBL_HC_OPTOMETRISTS,
        'optometrist',
        `optometrist.userid = user.id`,
      )
      .leftJoinAndMapOne(
        'user.tabaccouse',
        tableConstant.HEALTH_CHECKUP.TBL_HC_TOBACCO_USES,
        'tabaccouse',
        `tabaccouse.user_id = user.id`,
      ).where(condition)
      .select(fields)
      .orderBy('user.username', 'DESC')
      .addOrderBy('biometric.created', 'DESC')
      .addOrderBy('hrabiometric.date', 'DESC')
      .addOrderBy('dentist.date_completed', 'DESC')
      .addOrderBy('optometrist.date_completed', 'DESC')
      .addOrderBy('tabaccouse.date_completed', 'DESC')
      .getOne();
  }
  async getUsersForCampaignReport(membershipcode: string, userIds: number[]): Promise<any[]> {
    try {
      return await this.readReplicaUserRepository.find({
        select: [
          'id', 'first_name', 'last_name', 'code', 'role_id',
          'date_of_hire', 'department_id', 'location',
          'relationship_id', 'status'
        ],
        where: {
          membership_code: membershipcode,
          id: userIds as any,
          status: 1
        },
        order: {
          last_name: 'ASC'
        }
      });
    } catch (error) {
      throw new Error(error.message);
    }
  }
}
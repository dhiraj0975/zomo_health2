import {
    appConstant,
    BaseService,
    CommonArrayService,
    CommonFileService,
    CommonService,
    CompaniesEntity,
    tableConstant
} from '@common-constants';
import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { Request } from "express";
import { lastValueFrom } from 'rxjs';
import { CompanyInterface } from 'src/interface';
import { InsertResult, Repository } from 'typeorm';
import { CreateCompanyInput, PaginateWithCompanyInput } from "../../../input";
@Injectable()
export class CompanyService extends BaseService<CompaniesEntity> {
  constructor(
    @InjectRepository(CompaniesEntity, appConstant.READ_REPLICA.toLowerCase())
    private readonly readReplicaCompanyRepository: Repository<CompaniesEntity>,
    @InjectRepository(CompaniesEntity, appConstant.MAIN.toLowerCase())
    private readonly writeReplicaCompanyRepository: Repository<CompaniesEntity>,
        commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
        private readonly commonService: CommonService,
    @Inject('TIMEZONE_SERVICE') 
        private timeZoneMicroservice: ClientProxy,
  ) {
    super(readReplicaCompanyRepository, writeReplicaCompanyRepository, 'companies', commonArrayService);
  }
  async paginateList(condition: any, paginationParam: PaginateWithCompanyInput) {
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
        : 'company.id';
    const queryResult = await this.readReplicaCompanyRepository.createQueryBuilder('company')
      .leftJoinAndMapOne(
        'company.company_type',
        tableConstant.COMPANIES.TBL_COMPANY_TYPE,
        'company_type',
        `company_type.id = company.companytype_id`,
      )
      .leftJoinAndMapOne(
        'company.company_settings',
        tableConstant.COMPANIES.TBL_COMPANY_SETTINGS,
        'company_settings',
        `company_settings.org_id = company.id`,
      )
      .leftJoinAndMapOne(
        'company.company_meta',
        tableConstant.COMPANIES.TBL_COMPANY_META,
        'company_meta',
        `company_meta.org_id = company.id`,
      )
      .leftJoinAndMapOne(
        'company.census_frequency',
        tableConstant.COMPANIES.TBL_C_CENSUS_FREQUENCY,
        'census_frequency',
        `census_frequency.organization_id = company.id`,
      )
      .leftJoinAndMapOne(
        'company.diseasemanagement',
        tableConstant.COMPANIES.TBL_ACTIVE_PLUGINS,
        'diseasemanagement',
        `diseasemanagement.company_id  = company.id AND plugin_name LIKE '%"Diseasemanagement":1%'`,
      )
      .leftJoinAndMapOne(
        'company.questionnairesettings',
        tableConstant.HEALTH_CHECKUP.TBL_HC_QUESTIONNAIRE_SETTINGS,
        'questionnairesettings',
        `questionnairesettings.org_id = company.id`,
      )
      .leftJoinAndMapOne(
        'company.membership_plan',
        tableConstant.COMPANIES.TBL_C_MEMBERSHIP_PLAN,
        'membership_plan',
        `membership_plan.id = company.membership_plan_id`,
      )
      .where(condition)
      .orderBy(orderBy, <any>order)
      .take(paginateObj.take)
      .skip(paginateObj.skip)
      .getManyAndCount();
    const [result, total] = queryResult;
    return this.commonArrayService.paginationResponse(result, total, paginateObj);
  }
  async themePpaginateList(condition: any, paginationParam: PaginateWithCompanyInput) {
    const paginateObj = this.commonArrayService.getPaginationVar(
      paginationParam.page || 1,
      paginationParam.limit,
    );
    const queryResult = await this.readReplicaCompanyRepository.createQueryBuilder('company')
      .where(condition)
      .select(['company.id', 'company.code', 'company.company_name', 'company.company_logo'])
      .take(paginateObj.take)
      .skip(paginateObj.skip)
      .getManyAndCount();
    const [result, total] = queryResult;
    return this.commonArrayService.paginationResponse(result, total, paginateObj);
  }
  async findOne(condition: string | object, joinTable: string[] = [],fields: string[] = ['company']): Promise<CompaniesEntity | any> {
    let query;
    if(joinTable && joinTable.length){
      query = this.readReplicaCompanyRepository.createQueryBuilder('company');
      if (joinTable.includes(tableConstant.COMPANIES.TBL_COMPANY_SETTINGS)) {
        query = query
        .leftJoinAndMapOne(
          'company.companySetting',
          tableConstant.COMPANIES.TBL_COMPANY_SETTINGS,
          'companySetting',
          `companySetting.org_id = company.id`,
        );
      } 
      if (joinTable.includes(tableConstant.COMPANIES.TBL_COMPANY_META)) {
        query = query
        .leftJoinAndMapOne(
          'company.companyMeta',
          tableConstant.COMPANIES.TBL_COMPANY_META,
          'companyMeta',
          `companyMeta.org_id = company.id`,
        );
      }
      if (joinTable.includes(tableConstant.COMPANIES.TBL_COMPANY_CONTRACT)) {
        query = query
        .leftJoinAndMapOne(
          'company.companyContract',
          tableConstant.COMPANIES.TBL_COMPANY_CONTRACT,
          'companyContract',
          `companyContract.org_id = company.id`,
        );
      }
      if (joinTable.includes(tableConstant.COMPANIES.TBL_C_MEMBERSHIP_PLAN)) {
        query = query
        .leftJoinAndMapOne(
          'company.membership_plan',
          tableConstant.COMPANIES.TBL_C_MEMBERSHIP_PLAN,
          'membership_plan',
          `membership_plan.id = company.membership_plan_id`,
        );
      }
      if (joinTable.includes(tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_SETTINGS)) {
        query = query
        .leftJoinAndMapOne(
         'company.assessment_settings',
          tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_SETTINGS,
          'assessment_settings',
          `assessment_settings.organization_id = company.id`,
        );
      }
      query = await query.select(fields)
      .where(condition)
      .getOne();
    }
    else {
      query = await this.readReplicaCompanyRepository.createQueryBuilder('company')
      .leftJoinAndMapOne(
        'company.company_type',
        tableConstant.COMPANIES.TBL_COMPANY_TYPE,
        'company_type',
        `company_type.id = company.companytype_id`,
      )
        .leftJoinAndMapOne(
          'company.company_settings',
          tableConstant.COMPANIES.TBL_COMPANY_SETTINGS,
          'company_settings',
          `company_settings.org_id = company.id`,
        )
        .leftJoinAndMapOne(
          'company.companyMeta',
          tableConstant.COMPANIES.TBL_COMPANY_META,
          'companyMeta',
          `companyMeta.org_id = company.id`,
        )
        .leftJoinAndMapOne(
          'company.membership_plan',
          tableConstant.COMPANIES.TBL_C_MEMBERSHIP_PLAN,
          'membership_plan',
          `membership_plan.id = company.membership_plan_id`,
        )
        .select(['company', 'company_type','company_settings.lock_username','companyMeta.id','companyMeta.emailattachment', 'companyMeta.custom_text', 'membership_plan.id','membership_plan.name'])
        .where(condition)
        .getOne();
    }
    return query;
  }
  async findOneV1(condition: any, joinTable: string[] = [],fields: any[] = ['company']) {
    let query;
      query = this.readReplicaCompanyRepository.createQueryBuilder('company');
      if (joinTable.includes(tableConstant.COMPANIES.TBL_COMPANY_TYPE)) {
        query = query
        .leftJoinAndMapOne(
          'company.company_type',
          tableConstant.COMPANIES.TBL_COMPANY_TYPE,
          'company_type',
          `company_type.id = company.companytype_id`,
        );
      } 
      if (joinTable.includes(tableConstant.COMPANIES.TBL_COMPANY_SETTINGS)) {
        query = query
        .leftJoinAndMapOne(
          'company.company_settings',
          tableConstant.COMPANIES.TBL_COMPANY_SETTINGS,
          'company_settings',
          `company_settings.org_id = company.id`,
        );
      } 
      if (joinTable.includes(tableConstant.COMPANIES.TBL_COMPANY_META)) {
        query = query
        .leftJoinAndMapOne(
          'company.company_meta',
          tableConstant.COMPANIES.TBL_COMPANY_META,
          'company_meta',
          `company_meta.org_id = company.id`,
        );
      }
      if (joinTable.includes(tableConstant.COMPANIES.TBL_COMPANY_CONTRACT)) {
        query = query
        .leftJoinAndMapOne(
          'company.company_contract',
          tableConstant.COMPANIES.TBL_COMPANY_CONTRACT,
          'company_contract',
          `company_contract.org_id = company.id`,
        );
      }
      if (joinTable.includes(tableConstant.COMPANIES.TBL_C_COMPANY_SUPPORT)) {
        query = query
        .leftJoinAndMapOne(
          'company.company_support',
          tableConstant.COMPANIES.TBL_C_COMPANY_SUPPORT,
          'company_support',
          `company_support.org_id = company.id`,
        );
      }
      if (joinTable.includes(tableConstant.COMPANIES.TBL_C_MEMBERSHIP_PLAN)) {
        query = query
        .leftJoinAndMapOne(
          'company.membership_plan',
          tableConstant.COMPANIES.TBL_C_MEMBERSHIP_PLAN,
          'membership_plan',
          `membership_plan.id = company.membership_plan_id`,
        );
      }
      if (joinTable.includes(tableConstant.COMPANIES.TBL_LOCATION)) {
        query = query
        .leftJoinAndMapOne(
         'company.locations',
          tableConstant.COMPANIES.TBL_LOCATION,
          'locations',
          `locations.company_id = company.id AND locations.status = 1 AND locations.deleted = 0`,
        );
      }
      if (joinTable.includes(tableConstant.COMPANIES.TBL_DEPARTMENT)) {
        query = query
        .leftJoinAndMapOne(
         'company.departments',
          tableConstant.COMPANIES.TBL_DEPARTMENT,
          'departments',
          `departments.company_id = company.id AND departments.status = 1 AND departments.deleted = 0`,
        );
      }
      if (joinTable.includes(tableConstant.COMPANIES.TBL_LG_COMPANY_LANGUAGES)) {
        query = query
        .leftJoinAndMapOne(
         'company.language',
          tableConstant.COMPANIES.TBL_LG_COMPANY_LANGUAGES,
          'language',
          `language.company_id = company.id AND language.status = 1`,
        )
        .leftJoinAndMapMany(
            'language.languages',
            tableConstant.TBL_LANGUAGES,
            'languages',
            `FIND_IN_SET(languages.id, REPLACE(language.language_id, ' ', '')) > 0 AND languages.status = 1`,
          );
      }
      if (joinTable.includes(tableConstant.COMPANIES.TBL_C_CLIENT_MANAGER_ASSIGN)) {
        query = query
        .leftJoinAndMapMany(
         'company.client_engagement_manager',
          tableConstant.COMPANIES.TBL_C_CLIENT_MANAGER_ASSIGN,
          'client_engagement_manager',
          `client_engagement_manager.org_id = company.id AND client_engagement_manager.status = 1`,
        )
        .leftJoinAndMapOne(
            'client_engagement_manager.client_engagement_manager_user',
            tableConstant.TBL_USERS,
            'client_engagement_manager_user',
            `client_engagement_manager_user.id = client_engagement_manager.user_id`,
        );
      }
      if (joinTable.includes(tableConstant.COMPANIES.TBL_ASSIGN_BROKERS)) {
        query = query
        .leftJoinAndMapMany(
         'company.broker',
          tableConstant.COMPANIES.TBL_ASSIGN_BROKERS,
          'broker',
          `broker.company_id = company.id AND broker.status = 1`,
        )
        .leftJoinAndMapOne(
            'broker.user',
            tableConstant.TBL_USERS,
            'user',
            `user.id = broker.user_id`,
        );
      }
      if (joinTable.includes(tableConstant.COMPANIES.TBL_COMPANY_CEM_INFO)) {
        query = query
        .leftJoinAndMapOne(
         'company.company_info',
          tableConstant.COMPANIES.TBL_COMPANY_CEM_INFO,
          'company_info',
          `company_info.org_id = company.id`,
        );
      }
      query = await query.select(fields)
      .where(condition)
      .getOne();
    return query;
  }
  async companyFindOne(condition: any, fields: any[] = [],orderBy: any = null) {
    if (!orderBy) {
      orderBy = { id: 'DESC' };
    }
    return await this.readReplicaCompanyRepository.findOne({
      where: condition,
      select : fields,
      order: orderBy,
    });
  }
  async listRecord(condition: string | object, orderBy: object = null, fields: string[] = ['company.id', 'company.code', 'company.company_name', 'companySetting.is_emo_health_asssessments', 'companySetting.id']): Promise<CompaniesEntity[]> {
    if (!orderBy) {
      orderBy = { id: 'DESC' };
    }
    let query = this.readReplicaCompanyRepository.createQueryBuilder('company')
      .leftJoinAndMapOne(
        'company.companySetting',
        tableConstant.COMPANIES.TBL_COMPANY_SETTINGS,
        'companySetting',
        `companySetting.org_id = company.id`,
      )
      .leftJoinAndMapOne(
        'company.activeplugin',
        tableConstant.COMPANIES.TBL_ACTIVE_PLUGINS,
        'activeplugin',
        `activeplugin.company_id  = company.id`,
      );
      if(fields.some(field => field.startsWith('assessmentSettings'))){
        query = query
        .leftJoinAndMapOne(
          'company.assessmentSettings',
          tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_SETTINGS,
          'assessmentSettings',
          `assessmentSettings.organization_id  = company.id`,
        );
      }
      return await query
      .select(fields)
      .where(condition)
      .orderBy(`company.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
      .getMany();
  }
  async companyListRecord(fields: any = [], condition: any, orderBy: any = null) {
    if (!orderBy) {
      orderBy = { id: 'DESC' };
    }
    return await this.readReplicaCompanyRepository.find({
      where: condition,
      select: fields,
      order: orderBy,
    });
  }
  async save(data: CreateCompanyInput): Promise<InsertResult> {
    const savedResult = this.writeReplicaCompanyRepository.create(data);
    return await this.writeReplicaCompanyRepository.insert(savedResult);
  }
  async update(condition: any, data: any) {
    data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaCompanyRepository.metadata);
    return await this.writeReplicaCompanyRepository.createQueryBuilder('company')
      .update(CompaniesEntity)
      .set(data)
      .where(condition)
      .execute();
  }
  async getCompanyCodeFromId(id: number) {
    const getCode = await this.readReplicaCompanyRepository.findOne({
      where: { id },
      select: ['code'],
    });
    if (!getCode) {
      throw new Error("Company not found");
    }
    return getCode.code
  }
  async getCompnayIdFromCode(companyCode: string) {
    const getCode = await this.readReplicaCompanyRepository.findOne({
      where: ({ code: companyCode }),
      select: ['id'],
    });
    return getCode.id
  }
  async getCompnayLogoOnIdCode(companyIdCode: any, type: string) {
    if (type === 'id') {
      const getCode = await this.readReplicaCompanyRepository.findOne({
        where: { id: companyIdCode },
        select: ['company_logo'],
      });
      return getCode.company_logo;
    } else {
      const getCode = await this.readReplicaCompanyRepository.findOne({
        where: ({ code: companyIdCode }),
        select: ['company_logo'],
      });
      return getCode.company_logo;
    }
  }
  async formpaginateList(condition: string | object, paginationParam: PaginateWithCompanyInput): Promise<{
      list: CompanyInterface[];
      total: number;
      pages: number;
      limit: number;
      page: number;
    }>{
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
        : 'company.id';
    var queryResult = await this.readReplicaCompanyRepository.createQueryBuilder('company')
      .leftJoinAndMapOne(
        'company.activeplugin',
        tableConstant.COMPANIES.TBL_ACTIVE_PLUGINS,
        'activeplugin',
        `activeplugin.company_id  = company.id And activeplugin.plugin_name LIKE '%Healthcheckup%'`,
      )
      .leftJoinAndMapOne(
        'company.forminstructions',
        tableConstant.HEALTH_CHECKUP.TBL_HC_FORM_INSTRUCTIONS,
        'forminstructions',
        `forminstructions.company_id = company.id AND forminstructions.status !=2`,
      )
      .where(condition)
      .orderBy(orderBy, <any>order)
      .take(paginateObj.take)
      .skip(paginateObj.skip)
      .getManyAndCount();
    const [result, total] = queryResult;
    return this.commonArrayService.paginationResponse(result, total, paginateObj);
  }
  async stateList(statecode, type: string = null) {
    try {
      let stateData: any;
      if (type && type.toLowerCase() == 'us') {
        let where = { countrycode: 'US' };
        if (statecode) {
          where['statecode'] = statecode;
        }
        let timezoneData = await lastValueFrom(this.timeZoneMicroservice.send({ cmd: 'state_list' }, [where]));
        stateData = timezoneData;
        return stateData;
      }
      if (type && type.toLowerCase() == 'ca') {
        let where = { countrycode: 'CA' };
        let timezoneData = await lastValueFrom(this.timeZoneMicroservice.send({ cmd: 'state_list' }, [where]));
        stateData = timezoneData;
        return stateData;
      }
      let where = { countrycode: 'US' };
      if (statecode) {
        where['statecode'] = statecode;
      }
      let timezoneData = await lastValueFrom(this.timeZoneMicroservice.send({ cmd: 'state_list' }, [where]));
      stateData = timezoneData;
      where['countrycode'] = 'CA';
      timezoneData = await lastValueFrom(this.timeZoneMicroservice.send({ cmd: 'state_list' }, [where]));
      stateData = [...stateData, ...timezoneData];
      return stateData;
    }
    catch (error) {
      throw new Error(error.message);
    }
  }
  async cityList(statecode, req: Request, type: string = null) {
    try {
      let cityData: any;
      if (type && type.toLowerCase() == 'us') {
        let where = { countrycode: 'US' };
        if (statecode) {
          where['statecode'] = statecode;
        }
        let timezoneData = await lastValueFrom(this.timeZoneMicroservice.send({ cmd: 'city_list' }, [where]));
        cityData = timezoneData;
        return cityData;
      }
      if (type && type.toLowerCase() == 'ca') {
        let where = { countrycode: 'CA' };
        let timezoneData = await lastValueFrom(this.timeZoneMicroservice.send({ cmd: 'city_list' }, [where]));
        cityData = timezoneData;
        return cityData;
      }
      let where = { countrycode: 'US' };
      if (statecode) {
        where['statecode'] = statecode;
      }
      let timezoneData = await lastValueFrom(this.timeZoneMicroservice.send({ cmd: 'city_list' }, [where]));
      cityData = timezoneData;
      where['countrycode'] = 'CA';
      timezoneData = await lastValueFrom(this.timeZoneMicroservice.send({ cmd: 'city_list' }, [where]));
      cityData = [...cityData, ...timezoneData];
      return cityData;
    }
    catch (error) {
      throw new Error(error.message);
    }
  }
  async companypaginateList(condition: string, paginationParam: PaginateWithCompanyInput, fields: any = []): Promise<{
      list: CompanyInterface[];
      total: number;
      pages: number;
      limit: number;
      page: number;
    }>{
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
        : 'company.id';
    let queryResult = await this.readReplicaCompanyRepository.createQueryBuilder('company')
        .leftJoinAndMapOne(
          'company.company_setting',
          tableConstant.COMPANIES.TBL_COMPANY_SETTINGS,
          'company_setting',
          `company_setting.org_id = company.id`,
        )
      .where(condition)
      .select(fields)
      .orderBy(orderBy, <any>order)
      .take(paginateObj.take)
      .skip(paginateObj.skip)
      .getManyAndCount();
    const [result, total] = queryResult;
    return this.commonArrayService.paginationResponse(result, total, paginateObj);
  }
  async getCompanyZipPassword(cId) {
    try{
        let result = await this.findOne(`company.id = ${cId}`,['meta'],['company.id','company.code','companyMeta.zip_report_password']);
        result = await this.commonService.mergeCompanyTables(result);
        if (
            result &&
            result.zip_report_password &&
            result.zip_report_password !== ""
        ) {
            return result.zip_report_password;
        } else {
            return `${result.code}_${result.id}`;
        }
    }catch (error) {
        throw new Error(error.message); 
    }
  }
  // Service: Corrected Query
  async getCompanylist(condition: any = '', fields: any = [], joinTable: any = []) {
    try {
      let query = this.readReplicaCompanyRepository.createQueryBuilder('company'); // 'company' is the alias

      if (joinTable && joinTable.length > 0) {
        for (let i = 0; i < joinTable.length; i++) {
          if (joinTable[i].type === 'INNER') {
            query = query.innerJoinAndMapOne(
                `${joinTable[i].connect}.${joinTable[i].alias}`,
                joinTable[i].table,
                joinTable[i].alias,
                joinTable[i].on
            );
          } else {
            query = query.leftJoinAndMapOne(
                `${joinTable[i].connect}.${joinTable[i].alias}`,
                joinTable[i].table,
                joinTable[i].alias,
                joinTable[i].on
            );
          }
        }
      }
      console.log("Condition:", condition);
      console.log("Fields:", fields);

      query = query.where(condition).select(fields);
      query = query.orderBy('company.id', 'ASC');

      // Execute the query
      const companyData = await query.getMany();
      return companyData;

    } catch (error) {
      console.error('Error in getCompanylist:', error.message);
      throw new Error(error.message);
    }
  }
  async getCompanyName(cId) {
    try{
        let result = await this.findOne(`company.id = ${cId}`,[],['company.id','company.company_name']);
        return result?.company_name;
    }catch (error) {
        throw new Error(error.message); 
    }
  }
}

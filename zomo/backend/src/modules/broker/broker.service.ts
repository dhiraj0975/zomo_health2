import { appConstant, BrokerEntity, CommonArrayService, CommonFileService, tableConstant } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaginateWithBrokerInput } from './input';
@Injectable()
export class BrokerService {
    constructor(
        @InjectRepository(BrokerEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaBrokerRepository: Repository<BrokerEntity>,
        @InjectRepository(BrokerEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaBrokerRepository: Repository<BrokerEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {
    }
    async paginateList(condition: string, paginationParam: PaginateWithBrokerInput): Promise<{
      list: object[];
      total: number;
      pages: number;
      limit: number;
      page: number;
    }> {
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
                : 'broker.id';
        const queryResult = await this.readReplicaBrokerRepository.createQueryBuilder('broker')
        .leftJoinAndMapOne(
            'broker.company',
            tableConstant.COMPANIES.TBL_COMPANY,
            'company',
            `company.id = broker.org_id AND company.status = 1`,
          )
          .leftJoinAndMapOne(
            'company.company_type',
            tableConstant.COMPANIES.TBL_COMPANY_TYPE,
            'company_type',
            `company_type.id = company.companytype_id`,
          )
          .leftJoinAndMapOne(
            'broker.user',
            tableConstant.TBL_USERS,
            'user',
            `user.id = broker.user_id`,
          )
          .leftJoinAndMapOne(
            'broker.broker_admin',
            tableConstant.TBL_USERS,
            'broker_admin',
            `broker_admin.id = broker.broker_admin_id`,
          )
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    // for assign time paginate in broker admin role
    async paginateListAssignBroker(condition: any, paginationParam: PaginateWithBrokerInput, req: any = null): Promise<{
      list: object[];
      total: number;
      pages: number;
      limit: number;
      page: number;
    }> {
      const paginateObj = this.commonArrayService.getPaginationVar(
        paginationParam.page || 1,
        paginationParam.limit || 10,
      );
      const order =
        paginationParam && paginationParam.order
          ? paginationParam.order
          : 'DESC';
      const orderBy =
        paginationParam && paginationParam.order_by
          ? paginationParam.order_by
          : 'user.id';
      const queryBuilder = this.readReplicaBrokerRepository
        .createQueryBuilder('broker')
        .leftJoinAndMapOne(
          'broker.user',
          tableConstant.TBL_USERS,
          'user',
          `user.id = broker.user_id`,
        )
        .leftJoinAndMapOne(
          'broker.Location',
          tableConstant.COMPANIES.TBL_LOCATION,
          'Location',
          `Location.id = broker.location`,
        )
        .leftJoinAndMapOne(
          'broker.Department',
          tableConstant.COMPANIES.TBL_DEPARTMENT,
          'Department',
          `Department.id = broker.department`,
        );

      const totalCount = await queryBuilder.select('COUNT(DISTINCT user.id) AS total')
        .where(condition)
        .getRawOne();
      let queryWithPagination = queryBuilder.select([
        'user.id AS user_id',
        'user.first_name AS first_name',
        'user.last_name AS last_name',
        'Location.id AS location_id',
        'Location.location_name AS location_name',
        'Department.id AS dept_id',
        'Department.dept_name AS dept_name',
        'CONCAT(user.first_name, " ", user.last_name) AS full_name',
        'MAX(broker.is_global) AS is_global',
        'GROUP_CONCAT(DISTINCT CASE WHEN TRIM(COALESCE(broker.state, "")) != "" THEN broker.state ELSE NULL END) AS states',
        'GROUP_CONCAT(DISTINCT CASE WHEN TRIM(COALESCE(broker.city, "")) != "" THEN broker.city ELSE NULL END) AS cities',
        'GROUP_CONCAT(DISTINCT CASE WHEN COALESCE(broker.department, "") != "0" AND TRIM(COALESCE(broker.department, "")) != "" THEN broker.department ELSE NULL END) AS departments',
        'GROUP_CONCAT(DISTINCT CASE WHEN TRIM(COALESCE(broker.location, "")) != "0" AND TRIM(COALESCE(broker.location, "")) != "" THEN broker.location ELSE NULL END) AS locations',
        'CASE WHEN GROUP_CONCAT(DISTINCT CASE WHEN TRIM(COALESCE(broker.state, "")) != "" THEN broker.state ELSE NULL END) IS NOT NULL THEN 1 ELSE 0 END AS is_state',
        'CASE WHEN GROUP_CONCAT(DISTINCT CASE WHEN TRIM(COALESCE(broker.city, "")) != "" THEN broker.city ELSE NULL END) IS NOT NULL THEN 1 ELSE 0 END AS is_city',
        'CASE WHEN GROUP_CONCAT(DISTINCT CASE WHEN COALESCE(broker.department, "") != "0" AND TRIM(COALESCE(broker.department, "")) != "" THEN broker.department ELSE NULL END) IS NOT NULL THEN 1 ELSE 0 END AS is_department',
        'CASE WHEN GROUP_CONCAT(DISTINCT CASE WHEN TRIM(COALESCE(broker.location, "")) != "0" AND TRIM(COALESCE(broker.location, "")) != "" THEN broker.location ELSE NULL END) IS NOT NULL THEN 1 ELSE 0 END AS is_location',
      ])
        .where(condition)
        .groupBy('user.id')
        .orderBy(orderBy, <any>order).getQuery();
      queryWithPagination += ` LIMIT ${paginateObj.take} OFFSET ${paginateObj.skip}`;
      let result = await this.readReplicaBrokerRepository.query(queryWithPagination);
      const total = totalCount ? parseInt(totalCount.total) : 0;
      result = result?.filter(
        (item: any) =>
          item.user_id !== null && item.user_id !== undefined
      );
      const transformedResult = result.map((item) => ({
        user_id: item.user_id,
        user: {
          id: item.user_id,
          first_name: item.first_name,
          last_name: item.last_name,
          full_name: item.full_name,
        },
        is_global: parseInt(item.is_global) || 0,
        is_state: parseInt(item.is_state) || 0,
        is_city: parseInt(item.is_city) || 0,
        is_department: parseInt(item.is_department) || 0,
        is_location: parseInt(item.is_location) || 0,
        states: item.states ? item.states.split(',').filter((s: string) => s && s.trim() !== '') : [],
        cities: item.cities ? item.cities.split(',').filter((c: string) => c && c.trim() !== '') : [],
        departments: item.departments ? item.departments.split(',').filter((d: string) => d && d.trim() !== '' && d !== '0') : [],
        locations: item.locations ? item.locations.split(',').filter((l: string) => l && l.trim() !== '' && l !== '0') : [],
      }));

      return this.commonArrayService.paginationResponse(transformedResult, total, paginateObj);
    }
    async paginateListWithLocation(condition: any, paginationParam: PaginateWithBrokerInput, type: string = null) {
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
          : 'broker.id';
      const queryResult = this.readReplicaBrokerRepository.createQueryBuilder('broker')
        .innerJoinAndMapOne(
          'broker.company',
          tableConstant.COMPANIES.TBL_COMPANY,
          'company',
          `company.id = broker.org_id AND company.status = 1`,
        );
      if (type == 'state') {
        queryResult.leftJoinAndMapOne(
          'broker.Location',
          tableConstant.COMPANIES.TBL_LOCATION,
          'Location',
          `Location.company_id = broker.org_id AND broker.state = Location.state`,
        )
      }
      else if (type == 'city') {
        queryResult.leftJoinAndMapOne(
          'broker.Location',
          tableConstant.COMPANIES.TBL_LOCATION,
          'Location',
          `Location.company_id = broker.org_id AND broker.city = Location.city`,
        )
      }
      else {
        queryResult.leftJoinAndMapOne(
          'broker.Location',
          tableConstant.COMPANIES.TBL_LOCATION,
          'Location',
          `Location.company_id = broker.org_id AND broker.location = Location.id`,
        );
      }
      let finalData = await queryResult.where(condition)
        .orderBy(orderBy, <any>order)
        .take(paginateObj.take)
        .skip(paginateObj.skip)
        .getManyAndCount();
      const [result, total] = finalData;
      return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async paginateListWithDepartment(condition: any, paginationParam: PaginateWithBrokerInput) {
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
          : 'broker.id';
      const queryResult = await this.readReplicaBrokerRepository.createQueryBuilder('broker')
        .innerJoinAndMapOne(
          'broker.company',
          tableConstant.COMPANIES.TBL_COMPANY,
          'company',
          `company.id = broker.org_id AND company.status = 1`,
        )
        .leftJoinAndMapOne(
          'broker.Department',
          tableConstant.COMPANIES.TBL_DEPARTMENT,
          'Department',
          `Department.company_id = broker.org_id AND broker.department = Department.id`,
        )
        .where(condition)
        .orderBy(orderBy, <any>order)
        .take(paginateObj.take)
        .skip(paginateObj.skip)
        .getManyAndCount();
      const [result, total] = queryResult;
      return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async paginateListWithOrganization(condition: any, paginationParam: PaginateWithBrokerInput) {
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
          : 'broker.id';
      const queryResult = await this.readReplicaBrokerRepository.createQueryBuilder('broker')
        .innerJoinAndMapOne(
          'broker.company',
          tableConstant.COMPANIES.TBL_COMPANY,
          'company',
          `company.id = broker.org_id AND company.status = 1`,
        )
        .where(condition)
        .orderBy(orderBy, <any>order)
        .take(paginateObj.take)
        .skip(paginateObj.skip)
        .getManyAndCount();
      const [result, total] = queryResult;
      return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async paginateListBroker(condition: string, paginationParam: PaginateWithBrokerInput, joinTable: string[] = [],fields : string[] = []): Promise<{
      list: object[];
      total: number;
      pages: number;
      limit: number;
      page: number;
    }> {
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
          : 'broker.id';
      let queryResult: any = await this.readReplicaBrokerRepository.createQueryBuilder('broker')
        .innerJoinAndMapOne(
          'broker.company',
          tableConstant.COMPANIES.TBL_COMPANY,
          'company',
          `company.id = broker.org_id AND company.status = 1`,
        );
      if (joinTable && joinTable.length > 0) {
        if (joinTable.includes(tableConstant.COMPANIES.TBL_COMPANY_TYPE)) {
          queryResult.innerJoinAndMapOne(
            'company.company_type',
            tableConstant.COMPANIES.TBL_COMPANY_TYPE,
            'company_type',
            `company_type.id = company.companytype_id`,
          )
        }
        if (joinTable.includes(tableConstant.COMPANIES.TBL_COMPANY_SETTINGS)) {
          queryResult.leftJoinAndMapOne(
            'company.company_settings',
            tableConstant.COMPANIES.TBL_COMPANY_SETTINGS,
            'company_settings',
            `company_settings.org_id = company.id`,
          )
        }
        if (joinTable.includes(tableConstant.COMPANIES.TBL_COMPANY_META)) {
          queryResult.leftJoinAndMapOne(
            'company.company_meta',
            tableConstant.COMPANIES.TBL_COMPANY_META,
            'company_meta',
            `company_meta.org_id = company.id`,
          )
        }
        if (joinTable.includes(tableConstant.COMPANIES.TBL_COMPANY_CONTRACT)) {
          queryResult.leftJoinAndMapOne(
            'company.company_contract',
            tableConstant.COMPANIES.TBL_COMPANY_CONTRACT,
            'company_contract',
            `company_contract.org_id = company.id`,
          )
        }
        if (joinTable.includes(tableConstant.TBL_USERS)) {
          queryResult
          .leftJoinAndMapOne(
            'broker.broker_user',
            tableConstant.BROKER,
            'broker_user',
            `broker_user.org_id = broker.org_id AND broker_user.is_global = 2`,
          )
          .leftJoinAndMapOne(
            'broker.user',
            tableConstant.TBL_USERS,
            'user',
            `user.id = broker_user.user_id`,
          )
          .leftJoinAndMapOne(
            'broker.region',
            tableConstant.REGION.REGIONS,
            'region',
            `region.id = broker_user.region_id`,
          )
        }
        if (joinTable.includes(tableConstant.REGION.REGIONS)) {
          queryResult.leftJoinAndMapOne(
            'broker.region',
            tableConstant.REGION.REGIONS,
            'region',
            `region.id = broker.region_id`,
          )
        }
      }
      queryResult = await queryResult.where(condition)
        .orderBy(orderBy, <any>order)
        .take(paginateObj.take)
        .skip(paginateObj.skip)
        .select(fields)
        .getManyAndCount();
      
      const [result, total] = queryResult;
      return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async paginateListBrokerWithGrp(condition: any, paginationParam: PaginateWithBrokerInput, fields: any[] = []) {
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
          : 'broker.id';
      let queryResult: any = await this.readReplicaBrokerRepository.createQueryBuilder('broker')
        .innerJoinAndMapOne(
          'broker.company',
          tableConstant.COMPANIES.TBL_COMPANY,
          'company',
          `company.id = broker.org_id AND company.status = 1`,
        ).innerJoinAndMapOne(
          'company.company_type',
          tableConstant.COMPANIES.TBL_COMPANY_TYPE,
          'company_type',
          `company_type.id = company.companytype_id`,
        )
      const totalCount = await queryResult.select('COUNT(DISTINCT broker.org_id) AS total')
        .where(condition)
        .getRawOne();
      queryResult = queryResult.where(condition)
        .orderBy(orderBy, <any>order)
        .take(paginateObj.take)
        .skip(paginateObj.skip)
        .select(fields)
        .groupBy('company.id')
        .getQuery();

      queryResult += ` LIMIT ${paginateObj.take} OFFSET ${paginateObj.skip}`;
      const result = await this.readReplicaBrokerRepository.query(queryResult);
      const total = totalCount ? parseInt(totalCount.total) : 0;
      const resultData = result.map((item) => ({
        id: item?.broker_id ?? null,
        company: {
          id: item?.company_id ?? null,
          code: item?.company_code ?? null,
          company_name: item?.company_company_name ?? null,
          state: item?.company_state ?? null,
          city: item?.company_city ?? null,
          country: item?.company_country ?? null,
        },
        company_type: {
          id: item?.company_type_id ?? null,
          company_type: item?.company_type_company_type ?? null,
        }
      }));
      return this.commonArrayService.paginationResponse(resultData, total, paginateObj);
    }
    async findOne(condition: string | object): Promise<BrokerEntity> {
        return await this.readReplicaBrokerRepository.createQueryBuilder('broker')
        .leftJoinAndMapOne(
            'broker.company',
            tableConstant.COMPANIES.TBL_COMPANY,
            'company',
            `company.id = broker.org_id AND company.status = 1`,
          )
          .leftJoinAndMapOne(
            'company.company_type',
            tableConstant.COMPANIES.TBL_COMPANY_TYPE,
            'company_type',
            `company_type.id = company.companytype_id`,
          )
          .leftJoinAndMapOne(
            'broker.user',
            tableConstant.TBL_USERS,
            'user',
            `user.id = broker.user_id`,
          )
          .leftJoinAndMapOne(
            'broker.broker_admin',
            tableConstant.TBL_USERS,
            'broker_admin',
            `broker_admin.id = broker.broker_admin_id`,
          )
            .where(condition)
            .orderBy(`broker.id`, 'DESC')
            .getOne();
    }
    async checkOrgAuthorization(role_id :number, user_id:number, org_id: number | string): Promise<boolean | BrokerEntity>{
      let where : string = `broker.status != 2 AND broker.org_id = ${org_id}`;
      switch (role_id) {
        case appConstant.ROLE.BROKERADMIN:
          where += ` AND broker.broker_admin_id = ${user_id}`;
          break;
        case appConstant.ROLE.BROKER:
          where += ` AND broker.user_id = ${user_id} AND broker.is_global = 1`;
          break;
        case appConstant.ROLE.REGIONALADMIN:
          where += ` AND broker.user_id = ${user_id} AND broker.is_global = 2`;
          break;
        default:
          return;
      }
      const userRoleCheck = await this.findOne(where);
      if (!userRoleCheck) {
        return false
      }
      return userRoleCheck;
    }
    async listRecord(condition: string | object, orderBy: object = null, fields: string[] = ['broker', 'company', 'company_type', 'user']): Promise<BrokerEntity[]> {
        if (!orderBy) {
          orderBy = { id: 'DESC' };
        }
        return await this.readReplicaBrokerRepository.createQueryBuilder('broker')
        .leftJoinAndMapOne(
            'broker.company',
            tableConstant.COMPANIES.TBL_COMPANY,
            'company',
            `company.id = broker.org_id AND company.status = 1`,
          )
          .leftJoinAndMapOne(
            'company.company_type',
            tableConstant.COMPANIES.TBL_COMPANY_TYPE,
            'company_type',
            `company_type.id = company.companytype_id`,
          )
          .leftJoinAndMapOne(
            'broker.user',
            tableConstant.TBL_USERS,
            'user',
            `user.id = broker.user_id`,
          )
          .leftJoinAndMapOne(
            'broker.broker_admin',
            tableConstant.TBL_USERS,
            'broker_admin',
            `broker_admin.id = broker.broker_admin_id`,
          )
            .where(condition)
            .orderBy(`broker.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
            .getMany();
    }
    async brockerAdminList(condition: string | object, orderBy: object = null, fields: string[] = ['broker']): Promise<BrokerEntity[]> {
        if (!orderBy) {
          orderBy = { id: 'DESC' };
        }
        return await this.readReplicaBrokerRepository.createQueryBuilder('broker')
        .where(condition)
        .orderBy(`broker.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
        .getMany();
    }
    async listRecordWithU(condition: string | object, orderBy: object = null, fields: string[] = ['broker',  'user']): Promise<BrokerEntity[]> {
      if (!orderBy) {
        orderBy = { id: 'DESC' };
      }
      return await this.readReplicaBrokerRepository.createQueryBuilder('broker')
        .leftJoinAndMapOne(
            'broker.user',
            tableConstant.TBL_USERS,
            'user',
            `user.id = broker.user_id`,
          )
        .where(condition)
        .orderBy(`broker.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
        .select(fields)
        .getMany();
    }
    async listRecordWithCBR(condition: any, orderBy: any = null, fields: any = ['broker', 'company', 'company_type', 'user']) {
      if (!orderBy) {
        orderBy = { id: 'DESC' };
      }
      return await this.readReplicaBrokerRepository.createQueryBuilder('broker')
        .leftJoinAndMapOne(
          'broker.company',
          tableConstant.COMPANIES.TBL_COMPANY,
          'company',
          `company.id = broker.org_id AND company.status = 1`,
        )
        .leftJoinAndMapOne(
          'broker.br',
          tableConstant.BROKER,
          'br',
          `br.org_id = broker.org_id and br.is_global = 2`,
        )
        .leftJoinAndMapOne(
          'broker.region',
          tableConstant.REGION.REGIONS,
          'region',
          `region.id = broker.region_id`,
        )
        .where(condition)
        .orderBy(`broker.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
        .select(fields)
        .getMany();
    }
    async listRecordWithCCT(condition: string, orderBy: object = null, fields: string[] = ['broker', 'company', 'company_type', 'user'] , groupBy: string = null): Promise<BrokerEntity[]> {
      if (!orderBy) {
        orderBy = { id: 'DESC' };
      }
      let query:any = this.readReplicaBrokerRepository.createQueryBuilder('broker')
        .innerJoinAndMapOne(
          'broker.company',
          tableConstant.COMPANIES.TBL_COMPANY,
          'company',
          `company.id = broker.org_id AND company.status = 1`,
        )
        .innerJoinAndMapOne(
          'company.company_type',
          tableConstant.COMPANIES.TBL_COMPANY_TYPE,
          'company_type',
          `company_type.id = company.companytype_id`,
        )
        .where(condition)
        .orderBy(`broker.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
        .select(fields);

        if(groupBy){
          query = query.groupBy('broker.org_id');
        }
        return await query.getMany();
    }
    async brokerListRecord(condition: any,fields: any[] = [], orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaBrokerRepository.find({
            where: condition,
            select: fields,
            order: orderBy,
        });
    }
    async brokerOrgList(condition: any,fields: any[] = []) {
      return await this.readReplicaBrokerRepository.find({
          where: condition,
          select: fields
      });
    }
    async save(data: any) {
        data.broker_admin_id = data?.broker_admin_id ? data.broker_admin_id : 0 ;
        data.user_id = data?.user_id ? data.user_id : 0 ;
        data.location = data?.location ? data.location : 0 ;
        data.department = data?.department ? data.department : 0 ;
        data.state = data?.state ? data.state : '' ;
        data.city = data?.city ? data.city : '' ;
        if(data.broker_admin_id == 0 && !data.region_id) {
          data.is_global = 1;
        }
        const savedResult = this.writeReplicaBrokerRepository.create(data);
        return await this.writeReplicaBrokerRepository.save(savedResult);
    }
    async brokerRoleSave(data: any) {
        data.broker_admin_id = data?.broker_admin_id ? data.broker_admin_id : 0 ;
        data.user_id = data?.user_id ? data.user_id : 0 ;
        data.location = data?.location ? data.location : 0 ;
        data.department = data?.department ? data.department : 0 ;
        data.state = data?.state ? data.state : '' ;
        data.city = data?.city ? data.city : '' ;
        data.is_global = data?.is_global ? data.is_global : 0 ;
        const savedResult = this.writeReplicaBrokerRepository.create(data);
        return await this.writeReplicaBrokerRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
      data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaBrokerRepository.metadata);
        return await this.writeReplicaBrokerRepository.createQueryBuilder('broker')
            .update(BrokerEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicaBrokerRepository.delete(condition);
    }
    async brokerCount(condition: any) {
      return await this.writeReplicaBrokerRepository.createQueryBuilder('broker')
          .where(condition)
          .getCount();
    }
    async checkBroker(condition:any = null, field:any = ['broker']){
      try{
        return await this.readReplicaBrokerRepository.createQueryBuilder('broker')
          .where(condition)
          .select(field)
          .getMany();
      }catch (error) {
          throw new Error(error.message); 
      }
    }
}
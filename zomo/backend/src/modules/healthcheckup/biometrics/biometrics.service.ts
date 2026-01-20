import {
  appConstant,
  BaseService,
  BiometricsEntity,
  CommonArrayService,
  CommonDateService,
  CommonFileService,
  CommonService,
  tableConstant
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PaginateInput } from 'src/input';
import { AssessmentHraBiometricService } from 'src/modules/healthassessment/assessmenthrabiometrics/assessmenthrabiometric.service';
import {Between, Repository} from 'typeorm';
import { FtBiometricsService } from "../../trackers/biometrics/biometrics.service";
import {BiometricData, ProcessedBiometricData} from "@/interface";
@Injectable()
export class BiometricsService extends BaseService<BiometricsEntity> {
    constructor(
        @InjectRepository(BiometricsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaBiometricsRepository: Repository<BiometricsEntity>,
        @InjectRepository(BiometricsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaBiometricsRepository: Repository<BiometricsEntity>,
        private readonly commonService: CommonService,
        commonArrayService: CommonArrayService,
        private readonly commonDateService: CommonDateService,
        private readonly commonFileService: CommonFileService,
        private readonly assessmentHraBiometricsService: AssessmentHraBiometricService,
        private readonly ftBiometricsService: FtBiometricsService,
    ) {
        super(readReplicaBiometricsRepository,writeReplicaBiometricsRepository,'biometrics',commonArrayService);
    }
    async paginateUserList(condition: any, paginationParam: PaginateInput) {
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
          : 'biometrics.created';
      const queryResult = await this.readReplicaBiometricsRepository.createQueryBuilder('biometrics')
        .leftJoinAndMapOne(
          'biometrics.user',
          tableConstant.TBL_USERS,
          'user',
          `user.id = biometrics.user_id AND user.role_id IN(2,16)`,
        )
        .where(condition)
        .orderBy(orderBy, <any>order)
        .take(paginateObj.take)
        .skip(paginateObj.skip)
        .getManyAndCount();
      const [result, total] = queryResult;
      return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
  async paginateList(condition: any, paginationParam: PaginateInput) {
    const paginateObj = this.commonArrayService.getPaginationVar(
      paginationParam.page || 1,
      paginationParam.limit,
    );
    const order = paginationParam?.order || 'DESC';
    const orderBy = paginationParam?.order_by || 'biometrics.created';
    const queryResult = await this.readReplicaBiometricsRepository.createQueryBuilder('biometrics')  // for result
      .leftJoinAndMapOne(
        'biometrics.user',
        tableConstant.TBL_USERS,
        'user',
        `user.id = biometrics.user_id AND user.role_id IN(2,16)`,
      )
      .where(condition)
      .orderBy(orderBy, <any>order)
      .take(paginateObj.take)
      .skip(paginateObj.skip)
      .groupBy('biometrics.user_id')
      .getMany();
    const queryBuilder = this.readReplicaBiometricsRepository.createQueryBuilder('biometrics') //for total
      .leftJoinAndMapOne(
        'biometrics.user',
        tableConstant.TBL_USERS,
        'user',
        `user.id = biometrics.user_id AND user.role_id IN(2,16)`,
      )
      .where(condition)
      .select([
        'COUNT(biometrics.user_id) OVER() AS cnt',
      ])
      .orderBy(orderBy, <any>order)
      .groupBy('biometrics.user_id');
    const result = await queryBuilder.getRawOne();
    const total = result?.cnt ? parseInt(result.cnt, 10) : 0;
    return this.commonArrayService.paginationResponse(queryResult, total, paginateObj);
  }
    async save(data: any) {    
        data.co_testing_method = data.co_testing_method ? data.co_testing_method : 0;     
        data.disease_id = data.disease_id ? data.disease_id : ''; 
        data.co_qualitative_results_check_one = data.co_qualitative_results_check_one ? data.co_qualitative_results_check_one : 0;
        data.co_qualitative_results = data.co_qualitative_results ? data.co_qualitative_results : '';
        data.date_obtain = data.date_obtain ? data.date_obtain : '0000-00-00';
        data.enter_by = data.enter_by ? data.enter_by : 0;
        const savedResult = this.writeReplicaBiometricsRepository.create(data);
        return await this.writeReplicaBiometricsRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
      data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaBiometricsRepository.metadata);
        return await this.writeReplicaBiometricsRepository.createQueryBuilder('b')
            .update(BiometricsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaBiometricsRepository.delete(condition);
    }
    async findOne(condition: any, orderBy: any = null,field: any[] = []) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaBiometricsRepository.findOne({
            select: field,
            where: condition,
            order: orderBy,
        });
    }
    async listRecord(condition: any, orderBy: any = null, select: any[] = ['biometrics'], paginationParam: any = null) {
        if (!orderBy) {
            orderBy = { 'biometrics.id': 'DESC' };
        }
        let paginateObj = null;
        let groupBy = null;
        if(paginationParam){
          if(paginationParam.page || paginationParam.limit){
            paginateObj = this.commonArrayService.getPaginationVar(
              paginationParam.page || 1,
              paginationParam.limit,
            );
          }
          if(paginationParam.group_by){
            groupBy = 'biometrics.user_id';
          }
      }
        let query = await this.readReplicaBiometricsRepository.createQueryBuilder('biometrics')
        .leftJoinAndMapOne(
            'biometrics.user',
            tableConstant.TBL_USERS,
            'user',
            `user.id = biometrics.user_id AND user.role_id IN(2,16)`,
          )
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
            `company.id = user.org_id`,
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
        .where(condition)
        if(condition.includes('HA_biometrics')){
          query = query
          .leftJoinAndMapOne(
            'user.HA_biometrics',
            tableConstant.HEALTH_ASSESSMENT.TBL_HA_HRABIOMETRICS,
            'HA_biometrics',
            `HA_biometrics.user_id = user.id`,
          )
        }
        if(groupBy){
          query = query.groupBy(groupBy);
        }
        if(paginateObj){
            query = query
            // .take(paginateObj.take)
            // .skip(paginateObj.skip)
            .select(select)
            .orderBy(`${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]]);
            let result = await query.getMany();
            return this.commonArrayService.paginationResponse(this.commonArrayService.paginate(result, paginateObj.take || 10 , paginateObj.page || 1), result.length, paginateObj)
        }
        else{
          return await query.getMany();
        }
    }
    async biometricsListRecord(condition: any, select: any[] = [],orderBy: any = null) {
        if (!orderBy) {
            orderBy = { 'hb.id': 'DESC' };
        }
        let queryResult: any = await this.readReplicaBiometricsRepository.createQueryBuilder('hb')
            .where(condition)
            .select(select)
            .orderBy(`${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
            .getRawMany();
        return queryResult
    }
    async biometricsRecord(condition: any,paginationParam, tableData: any[] = []) {
      try{
          let search: boolean = true;
          if(this.commonDateService.isValidDate(paginationParam?.search_str)){
              search = false
              let startDate = `${this.commonDateService.getTodayDate(paginationParam.search_str).format('YYYY-MM-DD')} 00:00:00`;
              let endDate = `${this.commonDateService.getTodayDate(paginationParam.search_str).format('YYYY-MM-DD')} 23:59:59`;
              condition['bio'] = {...condition['bio'],created: Between(startDate, endDate)};
              condition['hra_bio'] = {...condition['hra_bio'],date: Between(startDate, endDate)};
              condition['ft_bio'] = {...condition['ft_bio'],added_date: Between(startDate, endDate)};
          }
          const recordData = async (data) =>  {
              let responseData = [];
              for (let biomatrics of data) {
                  let bmi: number = 0;
                  if('weight' in biomatrics && 'height_ft' in biomatrics && 'height_in' in biomatrics){
                      let weight: number = Number(biomatrics.weight);
                      let ft: number = Number(biomatrics.height_ft);
                      let inch: number = Number(biomatrics.height_in);
                      let inFT: number = ft * 12;
                      let totalInches: number = inFT + inch;
                      if (totalInches * totalInches != 0) {
                          bmi = parseFloat(((weight / (totalInches * totalInches)) * 703).toFixed(2));
                      }
                  }
                  let bioData = {
                      acl: '',
                      bmi: bmi,
                      id: biomatrics.id,
                      frm: biomatrics.frm,
                      systolic: biomatrics.systolic,
                      diastolic : biomatrics.diastolic,
                      total_cholesterol: biomatrics.total_cholesterol ? biomatrics.total_cholesterol : biomatrics.chol_total,
                      hdl: biomatrics.hdl,
                      ldl: biomatrics.ldl,
                      triglycerides: biomatrics.triglycerides,
                      blood_glucose: biomatrics.blood_glucose ? biomatrics.blood_glucose : biomatrics.glucose,
                      source: biomatrics.source ? biomatrics.source : 14,
                      created: biomatrics.added_date ? await this.commonDateService.DateTimeFormat(biomatrics.added_date, 'MM-DD-YYYY') : await this.commonDateService.DateTimeFormat(biomatrics.created, 'MM-DD-YYYY'),
                      enter_by: 0,
                      waist: biomatrics.waist,
                  };
                  responseData.push({...biomatrics,...bioData});
              }
              return responseData;
          }
          let HcData = await this.readReplicaBiometricsRepository.createQueryBuilder('hb')
              .where(condition['bio'])
              .select(["hb.id AS id","hb.alc AS alc","hb.bmi AS bmi","hb.systolic AS systolic","hb.diastolic AS diastolic","hb.total_cholesterol AS total_cholesterol","hb.hdl AS hdl","hb.ldl AS ldl","hb.triglycerides AS triglycerides","hb.blood_glucose AS blood_glucose","hb.waist AS waist","hb.source AS source","hb.created AS created","DATE_FORMAT(hb.created, '%Y-%m-%d %H:%i:%s') AS log_date_tmp","hb.enter_by AS enter_by","'Biometric' AS frm"])
              .orderBy(`hb.created`, 'DESC')
              .getRawMany();
          let resultedData = HcData;
          if (tableData.includes(tableConstant.HEALTH_ASSESSMENT.TBL_HA_HRABIOMETRICS)) {
              let selectHra = ["healthassessment.id AS id","healthassessment.alc AS alc","healthassessment.weight AS weight","healthassessment.height_ft AS height_ft","healthassessment.height_in AS height_in","healthassessment.bp_systolic AS systolic","healthassessment.bp_diastolic AS diastolic","healthassessment.total_cholesterol AS total_cholesterol","healthassessment.hdl AS hdl","healthassessment.ldl AS ldl","healthassessment.triglycerides AS triglycerides","healthassessment.blood_glucose AS blood_glucose","healthassessment.waist AS waist","healthassessment.source AS source","healthassessment.date AS created","DATE_FORMAT(healthassessment.date, '%Y-%m-%d %H:%i:%s') AS log_date_tmp","0 AS enter_by","'Hrabiometric' AS frm"];
              let HraData = await this.assessmentHraBiometricsService.listRecord(condition['hra_bio'], null,selectHra,[]);
              HraData = await recordData(HraData);
              resultedData = [...resultedData, ...HraData];
          }
          if (tableData.includes(tableConstant.TRACKERS.TBL_FT_BIOMETRICS)) {
              let selectBio = ["food.id AS id","CONCAT(food.height_ft, '.', food.height_in) AS height","food.height_ft AS height_ft","food.height_in AS height_in","food.weight AS weight","food.systolic AS systolic ","food.diastolic AS diastolic","food.glucose AS blood_glucose","food.chol_total AS total_cholesterol","food.hdl AS hdl","food.ldl AS ldl","food.triglycerides AS triglycerides","food.added_date AS created","NULL AS waist","DATE_FORMAT(food.added_date, '%Y-%m-%d %H:%i:%s') AS log_date_tmp","0 AS enter_by","'FBiometric' AS frm"];
              let ftBioData = await this.ftBiometricsService.listRecord(condition['ft_bio'],null,selectBio);
              ftBioData = await recordData(ftBioData);
              resultedData = [...resultedData, ...ftBioData];
          }
          resultedData = this.commonService.dynamicSort(resultedData, (a, b) => new Date(b['created']).getTime() - new Date(a['created']).getTime());
          if (paginationParam.page && paginationParam.limit) {

              const getUserType = (source: number, enterBy: number): string => {
                  const userTypeMap: { [key: number]: string } = {
                      1: 'User Entered',
                      13: 'User Entered',
                      14: 'User Entered',
                      15: 'User Entered',
                      3: 'Physician Entered',
                      11: 'Physician Entered',
                      12: 'Physician Entered',
                  };
                  if (source === 2) {
                      return enterBy === 0 ? 'Admin Entered' : 'Physician Entered';
                  }
                  return userTypeMap[source] || 'Physician Entered';
              };

              const processBiometricData = (resultedData: BiometricData[]): ProcessedBiometricData[] => {
                  const processedData: ProcessedBiometricData[] = [];

                  for (let i: number = 0; i < resultedData.length; i++) {
                      const row: BiometricData = resultedData[i];
                      const processedRow: ProcessedBiometricData = {
                          id: row.id,
                          height: row.height,
                          weight: row.weight,
                          bmi: row.bmi && row.bmi !== '0' ? row.bmi : 'No Data Entered',
                          systolic: row.systolic || 'No Data Entered',
                          diastolic: row.diastolic || 'No Data Entered',
                          blood_glucose: row.blood_glucose || 'No Data Entered',
                          alc: row.alc || 'No Data Entered',
                          total_cholesterol: row.total_cholesterol || 'No Data Entered',
                          hdl: row.hdl || 'No Data Entered',
                          ldl: row.ldl || 'No Data Entered',
                          triglycerides: row.triglycerides || 'No Data Entered',
                          waist: row.waist || 'No Data Entered',
                          user_type: getUserType(row.source, row.enter_by),
                          source: row.source,
                          frm: row.frm,
                          enter_by: row.enter_by,
                          created: row.created || 'No Data Entered',
                      };
                      processedData.push(processedRow);
                  }
                  return processedData;
              };
              let processedResult: ProcessedBiometricData[] = processBiometricData(resultedData);

              const searchBiometricDataSpecific = (
                  data: ProcessedBiometricData[],
                  search_str: string,
                  searchFields?: Array<keyof ProcessedBiometricData>
              ): ProcessedBiometricData[] => {
                  if (!search_str || search_str.trim() === '') {
                      return data;
                  }
                  const searchLower = search_str.toLowerCase().trim();
                  const fieldsToSearch: Array<keyof ProcessedBiometricData> = searchFields || ['bmi', 'systolic', 'diastolic', 'blood_glucose', 'alc', 'hdl', 'ldl', 'total_cholesterol', 'triglycerides', 'waist', 'created'];
                  const filteredData = data.filter((row) => {
                      return fieldsToSearch.some((field) => {
                          const value = row[field];
                          if (value === null || value === undefined) {
                              return false;
                          }
                          return value.toString().toLowerCase().includes(searchLower);
                      });
                  });
                  return filteredData;
              };
              if (search) {
                processedResult = searchBiometricDataSpecific(processedResult, paginationParam?.search_str, ['bmi', 'systolic', 'diastolic', 'blood_glucose', 'alc', 'hdl', 'ldl', 'total_cholesterol', 'triglycerides', 'waist', 'user_type'])
              }
              let paginateObj = this.commonArrayService.getPaginationVar(
                  paginationParam.page || 1,
                  paginationParam.limit,
              );
              return this.commonArrayService.paginationResponse(this.commonArrayService.paginate(processedResult, paginateObj.take || 10 , paginateObj.page || 1), processedResult.length, paginateObj)
          } else {
              return resultedData;
          }
      }catch (error) {
          throw new Error(error.message); 
      }
    }
  async creditRemove(paginationParam: any = null, orderBy: any = null) {
      if (!orderBy) {
        orderBy = { id: 'DESC' };
      }
      let paginateObj = this.commonArrayService.getPaginationVar(
        paginationParam.page || 1,
        paginationParam.limit,
      );
      let HcData = await this.readReplicaBiometricsRepository.createQueryBuilder('biometrics')
        .leftJoinAndMapOne(
          'biometrics.user',
          tableConstant.TBL_USERS,
          'user',
          `user.id = biometrics.user_id AND user.status = 1`,
        )
          .where(`(biometrics.source = 2 OR biometrics.source = 3 OR biometrics.source = 11 OR biometrics.source = 12) AND (CONCAT(user.first_name, ' ', user.last_name) LIKE '%${paginationParam.search_str}%' OR user.code LIKE '%${paginationParam.search_str}%')`)
          .select(['biometrics.id','user.code','user.first_name','user.last_name','biometrics.alc','biometrics.bmi','biometrics.systolic','biometrics.diastolic','biometrics.total_cholesterol','biometrics.hdl','biometrics.ldl','biometrics.triglycerides','biometrics.blood_glucose','biometrics.waist','biometrics.source','biometrics.created'])
          .orderBy(`biometrics.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
          .getMany();
      let selectHra = ['healthassessment.id','user.code','user.first_name','user.last_name','healthassessment.alc','healthassessment.weight','healthassessment.bp_systolic','healthassessment.bp_diastolic','healthassessment.total_cholesterol','healthassessment.hdl','healthassessment.ldl','healthassessment.triglycerides','healthassessment.blood_glucose','healthassessment.waist','healthassessment.source','healthassessment.date']
      let HraData = await this.assessmentHraBiometricsService.listRecord(`(healthassessment.source = 2 OR healthassessment.source = 3 OR healthassessment.source = 11 OR healthassessment.source = 12) AND (CONCAT(user.first_name, ' ', user.last_name) LIKE '%${paginationParam.search_str}%' OR user.code LIKE '%${paginationParam.search_str}%') AND healthassessment.status != 2`, null,selectHra,[tableConstant.TBL_USERS]);
      const combinedResult = [...HcData.map((e)=> {e['frm']= 'Biometric'; e['created_date'] = e.created.getTime().toString(); return e} ), ...HraData.map((e)=> {e['frm']= 'Hrabiometric';e['systolic']= e.bp_systolic;e['diastolic']= e.bp_diastolic;e['created_date']= e.date.getTime().toString(); return e})];
      return this.commonArrayService.paginationResponse(this.commonArrayService.paginate(combinedResult, paginateObj.take || 10 , paginateObj.page || 1), combinedResult.length, paginateObj)
  }
  async creditUpdate(postData: any) {
    if(postData?.frm == 'Biometric'){
      if(postData?.delete){
        await this.writeReplicaBiometricsRepository.delete({id: postData?.id})
      }
      if(postData?.date){
        await this.writeReplicaBiometricsRepository.update({id: postData?.id},{created: postData?.date})
      }
    }
    if(postData?.frm == 'Hrabiometric'){
      if(postData?.delete){
        await this.writeReplicaBiometricsRepository.delete({id: postData?.id})
      }
      if(postData?.date){
        await this.assessmentHraBiometricsService.update({id: postData?.id},{date: postData?.date})
      }
    }
    return true;
}
  async submittedFormlist(condition: any, orderBy: any = null, select: any[] = ['biometrics']) {
    if (!orderBy) {
        orderBy = { 'biometrics.id': 'DESC' };
    }
    let query = await this.readReplicaBiometricsRepository.createQueryBuilder('biometrics')
      .innerJoinAndMapOne(
        'biometrics.user',
        tableConstant.TBL_USERS,
        'user',
        `user.id = biometrics.user_id`,
      )
      .leftJoinAndMapOne(
        'biometrics.company',
        tableConstant.COMPANIES.TBL_COMPANY,
        'company',
        `company.id = user.org_id`,
      )
      .leftJoinAndMapOne(
        'biometrics.formInstructions',
        tableConstant.HEALTH_CHECKUP.TBL_HC_FORM_INSTRUCTIONS,
        'formInstructions',
        `formInstructions.company_id = user.org_id`,
      )
      .where(condition)
      .select(select)
      .getRawMany();
    return query
  }
}

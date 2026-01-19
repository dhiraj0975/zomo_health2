import { AgeActivityEntity, AgeGenderCompleteEntity, appConstant, AssessmentHraBiometricEntity, BiometricsEntity, CommonDateService, CommunicationTemplateTextsEntity, CompaniesEntity, CompanySettingsEntity, DentistsEntity, DepartmentsEntity, DiseaseFormsEntity, DiseaseManageFormsEntity, DiseasesEntity, FormInstructionsEntity, OptometristsEntity, tableConstant, TobaccoUsesEntity, UserEntity } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class FormService {
    constructor(
        @InjectRepository(UserEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaUserRepository: Repository<UserEntity>,
        @InjectRepository(FormInstructionsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaFormInstructionsRepository: Repository<FormInstructionsEntity>,
        @InjectRepository(DiseaseManageFormsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaDiseaseManageFormsRepository: Repository<DiseaseManageFormsEntity>,
        @InjectRepository(DiseaseFormsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaDiseaseFormsRepository: Repository<DiseaseFormsEntity>,
        @InjectRepository(DiseasesEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaDiseasesRepository: Repository<DiseasesEntity>,
        @InjectRepository(AgeActivityEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaAgeActivityRepository: Repository<AgeActivityEntity>,
        @InjectRepository(BiometricsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaBiometricsRepository: Repository<BiometricsEntity>,
        @InjectRepository(BiometricsEntity, appConstant.MAIN.toLowerCase())
        private readonly readReplicaBiometricsRepository: Repository<BiometricsEntity>,
        @InjectRepository(AssessmentHraBiometricEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaHraBiometricsRepository: Repository<AssessmentHraBiometricEntity>,
        @InjectRepository(TobaccoUsesEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaTobaccoUsesRepository: Repository<TobaccoUsesEntity>,
        @InjectRepository(DentistsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaDentistsRepository: Repository<DentistsEntity>,
        @InjectRepository(DentistsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaDentistsRepository: Repository<DentistsEntity>,
        @InjectRepository(CompanySettingsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaCompanySettingsRepository: Repository<CompanySettingsEntity>,
        @InjectRepository(CommunicationTemplateTextsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaCommunicationTemplateTextsRepository: Repository<CommunicationTemplateTextsEntity>,
        @InjectRepository(CompaniesEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaCompaniesRepository: Repository<CompaniesEntity>,
        @InjectRepository(AgeGenderCompleteEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaAgeGenderCompleteRepository: Repository<AgeGenderCompleteEntity>,
        @InjectRepository(OptometristsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaOptometristsRepository: Repository<OptometristsEntity>,
        @InjectRepository(OptometristsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaOptometristsRepository: Repository<OptometristsEntity>,
        @InjectRepository(DepartmentsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaDepartmentsRepository: Repository<DepartmentsEntity>,
        private readonly commonDateService: CommonDateService,
    ) {}
    async getUserDetails(condition: any,  fields: any = ['user.id', 'user.code', 'user.role_id', 'user.username', 'user.email']) {
        return await this.readReplicaUserRepository.createQueryBuilder('user')
            .where(condition)
            .select(fields)
            .getOne();
    }
    async getFormInstructions(condition: any, fields: any = ['forminstructions.id', 'forminstructions.name', 'forminstructions.description']) {
        return await this.readReplicaFormInstructionsRepository.createQueryBuilder('forminstructions')
            .where(condition)
            .select(fields)
            .getOne();
    }
    async getManageForms(condition: any, fields: any = ['mform.id', 'mform.company_id', 'forminstructions.disease_form_ids']) {
        return await this.readReplicaDiseaseManageFormsRepository.createQueryBuilder('mform')
            .where(condition)
            .select(fields)
            .getOne();
    }
    async checkValidForm(condition: any) {
        return await this.readReplicaDiseaseFormsRepository.createQueryBuilder('dform')
            .where(condition)
            .getOne();
    }
    async getDiseaseList(condition: any, fields: any = ['diseases']) {
        return await this.readReplicaDiseasesRepository.createQueryBuilder('diseases')
            .where(condition)
            .select(fields)
            .getMany();
    }
    async getAgeActivitys(condition: any, fields: any = ['ageactivity.id', 'ageactivity.age', 'ageactivity.activity']) {
        let query = this.readReplicaAgeActivityRepository.createQueryBuilder('ageactivity')
            .where(condition)
            .select(fields);
        return await query.getMany();
    }
    async biometricSave(data: any) {    
        data.physician_id = data?.physician_id ? data?.physician_id : 0;    
        data.co_testing_method = data?.co_testing_method ? data?.co_testing_method : 0;      
        data.disease_id = data?.disease_id ? data?.disease_id : ''; 
        data.co_qualitative_results_check_one = data?.co_qualitative_results_check_one ? data?.co_qualitative_results_check_one : 0;
        data.co_qualitative_results = data?.co_qualitative_results ? data?.co_qualitative_results : '';
        data.date_obtain = data?.date_obtain ? data?.date_obtain : '0000-00-00';
        data.enter_by = data?.enter_by ? data?.enter_by : 0;
        const savedResult = this.writeReplicaBiometricsRepository.create(data);
        return await this.writeReplicaBiometricsRepository.save(savedResult);
    }
    async getDentalForms(condition: any, fields: any = ['dental.id', 'dental.userid', 'dental.activity_id', 'dental.physician_id', 'dental.date_completed', 'dental.signature', 'dental.is_signed', 'dental.enter_by']) {
        let query = this.readReplicaDentistsRepository.createQueryBuilder('dental')
            .where(condition)
            .select(fields);
        return await query.getMany();
    }
    async getCompanyFormLimit(condition: any, fields: any = ['companysettings.id', 'companysettings.org_id', 'companysettings.form_limit']) {
        let query = this.readReplicaCompanySettingsRepository.createQueryBuilder('companysettings')
            .where(condition)
            .select(fields);
        return await query.getOne();
    }
    async dentalSave(data: any) {
        data.physician_id = data?.physician_id ? data?.physician_id : 0;    
        data.enter_by = data?.enter_by ? data?.enter_by : 0;
        const savedResult = this.writeReplicaDentistsRepository.create(data);
        return await this.writeReplicaDentistsRepository.save(savedResult);
    }
    async getEmailTemplate(condition: any) {
        return await this.readReplicaCommunicationTemplateTextsRepository.findOne({
            where: condition,
        });
    }
    async getCompanyDetails(condition: any, fields: any = ['company.id', 'company.company_name', 'company.code']) {
        return await this.readReplicaCompaniesRepository.createQueryBuilder('company')
            .where(condition)
            .select(fields)
            .getOne();
    }
    async saveAgeGenderComplete(data: any) {
        data = Object.values(data);
        const savedResult = this.writeReplicaAgeGenderCompleteRepository.create(data);
        return await this.writeReplicaAgeGenderCompleteRepository.save(savedResult);
    }
    async getOptometrictsForms(condition: any, fields: any = ['optometrist.id', 'optometrist.userid', 'optometrist.activity_id', 'optometrist.physician_id', 'optometrist.date_completed', 'optometrist.signature', 'optometrist.is_signed', 'optometrist.enter_by']) {
        let query = this.readReplicaOptometristsRepository.createQueryBuilder('optometrist')
            .where(condition)
            .select(fields);
        return await query.getMany();
    }
    async optometristsSave(data: any) {
        data.physician_id = data?.physician_id ? data?.physician_id : 0;    
        data.enter_by = data?.enter_by ? data?.enter_by : 0;
        const savedResult = this.writeReplicaOptometristsRepository.create(data);
        return await this.writeReplicaOptometristsRepository.save(savedResult);
    }
    async validPhyCode() {
        const code = `HC${Math.floor(100000 + Math.random() * 900000)}`;
        const existingUser = await this.readReplicaUserRepository.findOne({ where: { code } });
        if (existingUser) {
          return this.validPhyCode(); // Recursively generate a new code if duplicate
        }
        return code;
    }
    async getMemCodeOnDeptId(code: any = '') {
        let query = this.readReplicaCompaniesRepository.createQueryBuilder('company')
        .leftJoinAndMapMany(
            'company.departments',
            tableConstant.COMPANIES.TBL_DEPARTMENT,
            'departments',
            `departments.default_dept = 'Yes' AND departments.company_id = company.id`,
        )
        .where({ code : code });
        let data = await query.getOne();
        if(data){
            return data;
        }else{
            let queryD = this.readReplicaDepartmentsRepository.createQueryBuilder('department')
            .where({ code : code });
            let dataD = await queryD.getOne();
            if(dataD){
               let queryC = this.readReplicaCompaniesRepository.createQueryBuilder('company')
                .where({ id : dataD.company_id });
                return await queryC.getOne();
            }else{
                return null;
            }
        }
    }
    async getDentalAdded(userId: number, fields: any = [
        'dental.id AS dental_id', 'dental.userid AS dental_userid','dental.date_completed AS dental_date_completed', 
    ]) {
        let query = this.readReplicaDentistsRepository.createQueryBuilder('dental')
            .where(`dental.userid = ${userId}`)
            .orderBy('dental.date_completed', 'DESC')
            .select(fields);
        const result = await query.getRawOne();
        if (result && result.dental_date_completed) {
            return `${await this.commonDateService.DateTimeFormat(result.dental_date_completed, 'MM-DD-YYYY','YYYY-MM-DD HH:mm:ss')}`;
        }
        return '';
    }
    async getOptometristsAdded(userId: number, fields: any = [
        'optometrist.id AS optometrist_id', 'optometrist.userid AS optometrist_userid', 'optometrist.date_completed AS optometrist_date_completed',
    ]) {
        let query = this.readReplicaOptometristsRepository.createQueryBuilder('optometrist')
            .where(`optometrist.userid = ${userId}`)
            .orderBy('optometrist.date_completed', 'DESC')
            .select(fields);
        const result = await query.getRawOne();
        if (result && result.optometrist_date_completed) {
            return `${await this.commonDateService.DateTimeFormat(result.optometrist_date_completed, 'MM-DD-YYYY','YYYY-MM-DD HH:mm:ss')}`;
        }
        return '';
    }
    async getTabaccouseAdded(userId: number, fields: any = [
        'tobacco.id AS tobacco_id', 'tobacco.user_id AS tobacco_user_id',  'tobacco.date_completed AS tobacco_date_completed'
    ]) {
        let query = this.readReplicaTobaccoUsesRepository.createQueryBuilder('tobacco')
            .where(`tobacco.user_id = ${userId}`)
            .orderBy('tobacco.date_completed', 'DESC')
            .select(fields);
        const result = await query.getRawOne();
        if (result && result.tobacco_date_completed) {
            return `${await this.commonDateService.DateTimeFormat(result.tobacco_date_completed, 'MM-DD-YYYY','YYYY-MM-DD HH:mm:ss')}`;
        }
        return '';
    }
    // async getBiometricAdded(userId: number) {
    //     const subQuery1 = this.readReplicaBiometricsRepository
    //         .createQueryBuilder('hc')
    //         .select([
    //             'hc.alc AS alc',
    //             'hc.bmi AS bmi',
    //             'hc.systolic AS systolic',
    //             'hc.diastolic AS diastolic',
    //             'hc.total_cholesterol AS total_cholesterol',
    //             'hc.hdl AS hdl',
    //             'hc.ldl AS ldl',
    //             'hc.triglycerides AS triglycerides',
    //             'hc.blood_glucose AS blood_glucose',
    //             'hc.source AS source',
    //             'hc.created AS created'
    //         ])
    //         .where('hc.user_id = :userId', { userId });
    //     const subQuery2 = this.readReplicaHraBiometricsRepository
    //         .createQueryBuilder('ha')
    //         .select([
    //             'ha.alc AS alc',
    //             'TRUNCATE((ha.weight * 703) / (((ha.height_ft * 12) + ha.height_in) * ((ha.height_ft * 12) + ha.height_in)), 2) AS bmi',
    //             'ha.bp_systolic AS systolic',
    //             'ha.bp_diastolic AS diastolic',
    //             'ha.total_cholesterol AS total_cholesterol',
    //             'ha.hdl AS hdl',
    //             'ha.ldl AS ldl',
    //             'ha.triglycerides AS triglycerides',
    //             'ha.blood_glucose AS blood_glucose',
    //             'ha.source AS source',
    //             'ha.date AS created'
    //         ])
    //         .where(`ha.user_id = ${userId}`);
    //         console.log('Query-=',this.readReplicaBiometricsRepository
    //         .createQueryBuilder()
    //         .select(['biometric.created','biometric.id'])
    //         .from(`(${subQuery1.getQuery()} UNION ALL ${subQuery2.getQuery()})`, 'biometric')
    //         .where(
    //             'biometric.alc IS NOT NULL AND biometric.alc != "" OR ' +
    //             'biometric.bmi IS NOT NULL AND biometric.bmi != "" OR ' +
    //             'biometric.systolic IS NOT NULL AND biometric.systolic != "" OR ' +
    //             'biometric.diastolic IS NOT NULL AND biometric.diastolic != "" OR ' +
    //             'biometric.total_cholesterol IS NOT NULL AND biometric.total_cholesterol != "" OR ' +
    //             'biometric.hdl IS NOT NULL AND biometric.hdl != "" OR ' +
    //             'biometric.ldl IS NOT NULL AND biometric.ldl != "" OR ' +
    //             'biometric.triglycerides IS NOT NULL AND biometric.triglycerides != "" OR ' +
    //             'biometric.blood_glucose IS NOT NULL AND biometric.blood_glucose != ""'
    //         )
    //         .orderBy('biometric.created', 'DESC')
    //         .limit(1).getQuery());
            
    //     const result = await this.readReplicaBiometricsRepository
    //         .createQueryBuilder()
    //         .select(['biometric.created','biometric.id'])
    //         .from(`(${subQuery1.getQuery()} UNION ALL ${subQuery2.getQuery()})`, 'biometric')
    //         .where(
    //             'biometric.alc IS NOT NULL AND biometric.alc != "" OR ' +
    //             'biometric.bmi IS NOT NULL AND biometric.bmi != "" OR ' +
    //             'biometric.systolic IS NOT NULL AND biometric.systolic != "" OR ' +
    //             'biometric.diastolic IS NOT NULL AND biometric.diastolic != "" OR ' +
    //             'biometric.total_cholesterol IS NOT NULL AND biometric.total_cholesterol != "" OR ' +
    //             'biometric.hdl IS NOT NULL AND biometric.hdl != "" OR ' +
    //             'biometric.ldl IS NOT NULL AND biometric.ldl != "" OR ' +
    //             'biometric.triglycerides IS NOT NULL AND biometric.triglycerides != "" OR ' +
    //             'biometric.blood_glucose IS NOT NULL AND biometric.blood_glucose != ""'
    //         )
    //         .orderBy('biometric.created', 'DESC')
    //         .limit(1)
    //         .getRawOne();
    //     if (result && result.created) {
    //         return `${await this.commonDateService.DateTimeFormat(result.created, 'MM-DD-YYYY','YYYY-MM-DD HH:mm:ss')}`;
    //     }
    //     return '';
    // }
    async getBiometricAdded(userId: number) {
        const subQuery1 = this.readReplicaBiometricsRepository
            .createQueryBuilder('hc')
            .select([
                'hc.alc AS alc',
                'hc.bmi AS bmi',
                'hc.systolic AS systolic',
                'hc.diastolic AS diastolic',
                'hc.total_cholesterol AS total_cholesterol',
                'hc.hdl AS hdl',
                'hc.ldl AS ldl',
                'hc.triglycerides AS triglycerides',
                'hc.blood_glucose AS blood_glucose',
                'hc.source AS source',
                'hc.created AS created'
            ])
            .where('hc.user_id = ?', [userId]);

        const subQuery2 = this.readReplicaHraBiometricsRepository
            .createQueryBuilder('ha')
            .select([
                'ha.alc AS alc',
                'TRUNCATE((ha.weight * 703) / (((ha.height_ft * 12) + ha.height_in) * ((ha.height_ft * 12) + ha.height_in)), 2) AS bmi',
                'ha.bp_systolic AS systolic',
                'ha.bp_diastolic AS diastolic',
                'ha.total_cholesterol AS total_cholesterol',
                'ha.hdl AS hdl',
                'ha.ldl AS ldl',
                'ha.triglycerides AS triglycerides',
                'ha.blood_glucose AS blood_glucose',
                'ha.source AS source',
                'ha.date AS created'
            ])
            .where('ha.user_id = ?', [userId]);

        const result = await this.readReplicaBiometricsRepository.manager
            .query(`
            SELECT biometric.created
            FROM (
                ${subQuery1.getQuery()}
                UNION ALL
                ${subQuery2.getQuery()}
            ) as biometric
            WHERE 
                (biometric.alc IS NOT NULL AND biometric.alc != '') OR
                (biometric.bmi IS NOT NULL AND biometric.bmi != '') OR
                (biometric.systolic IS NOT NULL AND biometric.systolic != '') OR
                (biometric.diastolic IS NOT NULL AND biometric.diastolic != '') OR
                (biometric.total_cholesterol IS NOT NULL AND biometric.total_cholesterol != '') OR
                (biometric.hdl IS NOT NULL AND biometric.hdl != '') OR
                (biometric.ldl IS NOT NULL AND biometric.ldl != '') OR
                (biometric.triglycerides IS NOT NULL AND biometric.triglycerides != '') OR
                (biometric.blood_glucose IS NOT NULL AND biometric.blood_glucose != '')
            ORDER BY biometric.created DESC
            LIMIT 1
        `, [userId, userId]);

        if (result && result.length > 0 && result[0].created) {
            return `${await this.commonDateService.DateTimeFormat(result[0].created, 'MM-DD-YYYY', 'YYYY-MM-DD HH:mm:ss')}`;
        }
        return '';
    }
}
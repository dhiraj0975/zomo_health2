import { appConstant, AuthorizationsEntity, BiometricsEntity, CommonArrayService, CommonFileService, DiseaseFormsEntity, DiseasesEntity, FormInstructionsEntity, MyPlanAssignPlanEntity, tableConstant, TobaccoUsesEntity } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { PaginateWithCompanyInput } from "../../../input";
@Injectable()
export class FormInstructionsService {
    constructor(
        @InjectRepository(FormInstructionsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaFormInstructionsRepository: Repository<FormInstructionsEntity>,
        @InjectRepository(FormInstructionsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaFormInstructionsRepository: Repository<FormInstructionsEntity>,
        @InjectRepository(AuthorizationsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaAuthorizationsRepository: Repository<AuthorizationsEntity>,
        @InjectRepository(TobaccoUsesEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaTobaccoUsesRepository: Repository<TobaccoUsesEntity>,
        @InjectRepository(MyPlanAssignPlanEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaMyPlanAssignPlanRepository: Repository<MyPlanAssignPlanEntity>,
        @InjectRepository(BiometricsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaBiometricsRepository: Repository<BiometricsEntity>,
        @InjectRepository(DiseasesEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaDiseasesRepository: Repository<DiseasesEntity>,
        @InjectRepository(DiseaseFormsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaDiseaseFormsRepository: Repository<DiseaseFormsEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) { }
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
                : 'forminstructions.created';
        var queryResult = await this.readReplicaFormInstructionsRepository.createQueryBuilder('forminstructions')
            .leftJoinAndMapOne(
                'forminstructions.company',
                tableConstant.COMPANIES.TBL_COMPANY,
                'company',
                `company.id = forminstructions.company_id AND company.deleted = 0 AND company.companytype_id = 3`,
            )
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async save(data: any) {
        const savedResult = this.writeReplicaFormInstructionsRepository.create(data);
        return await this.writeReplicaFormInstructionsRepository.save(savedResult);
    }
    async delete(condition: any) {
        await this.writeReplicaFormInstructionsRepository.delete(condition);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaFormInstructionsRepository.metadata);
        return await this.writeReplicaFormInstructionsRepository.createQueryBuilder('forminstructions')
            .update(FormInstructionsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async findOne(condition: FindOptionsWhere<FormInstructionsEntity>, orderBy: object = null, fields = ['forminstructions'],tableData: any[] = []): Promise<FormInstructionsEntity | null> {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        let query = this.writeReplicaFormInstructionsRepository.createQueryBuilder('forminstructions');
        if(tableData && tableData.length > 0 && tableData.includes(tableConstant.COMPANIES.TBL_COMPANY)){
            query = query.leftJoinAndMapOne(
                        'forminstructions.company',
                        tableConstant.COMPANIES.TBL_COMPANY,
                        'company',
                        `company.id = forminstructions.company_id AND company.status = 1`,
                        );
        } 
        return await query
            .select(fields)
            .where(condition)
            .orderBy(`forminstructions.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
            .getOne();
    }
    async listRecord(fields: any, condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaFormInstructionsRepository.find({
            select: fields,
            where: condition,
            order: orderBy,
        });
    }
    async templetextsRecord(condition: any, orderBy: any = null, form_type: any = null) {
        let formType = { 0: 'IdentificationCover', 1: 'Physician', 2: 'Dentist', 3: 'Optometrist', 4: 'Tobacco', 5: 'Disease' };
        let form_type_id = Object.keys(formType).find(key => formType[key] === form_type);
        let fields = ['forminstructions.id', `${form_type}`];
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        let query = this.readReplicaFormInstructionsRepository.createQueryBuilder('forminstructions')
            .leftJoinAndMapMany(
                `forminstructions.${form_type}`,
                tableConstant.HEALTH_CHECKUP.TBL_HC_FORM_INSTRUCTIONS_TEMPLATE_TEXTS,
                `${form_type}`,
                `${form_type}.form_type = ${form_type_id} AND ${form_type}.org_id IN (forminstructions.company_id,0)`,
            )
        if (form_type == 'Physician' || form_type == 'Disease') {
            fields = [...fields, 'diseases', 'diseasesforms', 'coverpages'];
            query = query.leftJoinAndMapMany(
                'forminstructions.diseases',
                tableConstant.DISEASE_MANAGEMENT.TBL_DS_DISEASES,
                'diseases',
                `FIND_IN_SET(diseases.id, forminstructions.assign_disease_ids) AND diseases.status = 1`
            )
                .leftJoinAndMapMany(
                    'forminstructions.diseasesforms',
                    tableConstant.DISEASE_MANAGEMENT.TBL_DS_FORMS,
                    'diseasesforms',
                    `FIND_IN_SET(diseasesforms.disease_id, forminstructions.disease_ids) AND diseasesforms.status = 1`
                )
                .leftJoinAndMapMany(
                    'forminstructions.coverpages',
                    tableConstant.DISEASE_MANAGEMENT.TBL_DS_COVER_PAGES,
                    'coverpages',
                    `coverpages.form_id = diseasesforms.id  AND coverpages.org_id = forminstructions.company_id`
                )
        }
        return await query
            .select(fields)
            .where(condition)
            .orderBy(`forminstructions.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
            .getOne();
    }
    async getFormInstructionData(condition:any = ''){
        return await this.readReplicaFormInstructionsRepository.createQueryBuilder('form_instruction')
        .where(condition)
        .getOne();
    }
    async getAuthorizationPopupData(condition:any = ''){
        return await this.readReplicaAuthorizationsRepository.createQueryBuilder('authorization')
        .where(condition)
        .getOne();
    }
    async getTobaccousesPopupData(condition:any = ''){
        return await this.readReplicaTobaccoUsesRepository.createQueryBuilder('tobacco')
        .where(condition)
        .getOne();
    }
    async getDiseaseIDS(condition:any = ''){
        return await this.readReplicaBiometricsRepository.createQueryBuilder('biometrics')
        .where(condition)
        .select(['biometrics.disease_id'])
        .orderBy('biometrics.created', 'DESC')
        .limit(1)
        .getOne();
    }
    async getDiseaseFormOrder(condition:any = ''){
        let query = this.readReplicaDiseasesRepository.createQueryBuilder('diseases')
        .where(condition);
        return await query.getOne();
    }
    async getDiseaseForms(condition:any = ''){
        let query = this.readReplicaDiseaseFormsRepository.createQueryBuilder('dforms')
        .where(condition);
        return await query.getOne();
    }
    async getMyPlanActivities(condition:any = '', fields:any = []){
        let query = this.readReplicaMyPlanAssignPlanRepository.createQueryBuilder('mpassignplan')
        .leftJoinAndMapMany(
            'mpassignplan.assignblock',
            tableConstant.MY_PLAN.TBL_MP_ASSIGN_BLOCK,
            'assignblock',
            `assignblock.plan_id = mpassignplan.plan_id AND assignblock.status = 1`,
        )
        .leftJoinAndMapMany(
            'assignblock.mpaactivity',
            tableConstant.MY_PLAN.TBL_MP_ACTIVITY,
            'mpaactivity',
            `mpaactivity.block_id = assignblock.block_id AND mpaactivity.status = 1`,
        )
        .leftJoinAndMapMany(
            'mpaactivity.inactivity',
            tableConstant.ACTIVITIES.TBL_ACTIVITIES,
            'inactivity',
            `inactivity.id = mpaactivity.activity_id AND inactivity.status = 1`,
        )
        .where(condition)
        .select(fields);
        let result = await query.getRawMany();
        return Object.fromEntries(
            result.map(({ activity_id, description }) => [activity_id, description || ''])
        );
    }
}

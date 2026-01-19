import { appConstant, CommonArrayService, CommonFileService, DiseasePhysicianFormsEntity, tableConstant } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaginateWithDiseaseManagementInput } from "../../../input";
@Injectable()
export class PhysicianFormsService {
    constructor(
        @InjectRepository(DiseasePhysicianFormsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaDiseasePhysicianFormsRepository: Repository<DiseasePhysicianFormsEntity>,
        @InjectRepository(DiseasePhysicianFormsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaDiseasePhysicianFormsRepository: Repository<DiseasePhysicianFormsEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {
    }
    async paginateList(condition: any, paginationParam: PaginateWithDiseaseManagementInput) {
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
                : 'physicianforms.id';
        const queryResult = await this.readReplicaDiseasePhysicianFormsRepository.createQueryBuilder('physicianforms')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async paginateListPhysician(condition: any, paginationParam: any, field: any = ['physicianforms.*']) {
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
                : 'physicianforms.id';
        const queryResult = await this.readReplicaDiseasePhysicianFormsRepository.createQueryBuilder('physicianforms')
            .leftJoinAndMapOne(
                'physicianforms.user',
                tableConstant.TBL_USERS,
                'user',
                `user.id = physicianforms.user_id AND user.role_id IN(2,16)`,
            )
            .leftJoinAndMapOne(
                'physicianforms.form',
                tableConstant.DISEASE_MANAGEMENT.TBL_DS_FORMS,
                'form',
                `form.code = physicianforms.disease_formid`,
            )
            .leftJoinAndMapOne(
                'physicianforms.disease',
                tableConstant.DISEASE_MANAGEMENT.TBL_DS_DISEASES,
                'disease',
                `disease.id = form.disease_id`,
            )
            .where(condition)
            .select(field)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: any) {
        return await this.readReplicaDiseasePhysicianFormsRepository.findOne({
            where: condition,
        });
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaDiseasePhysicianFormsRepository.find({
            where: condition,
            select: [],
            order: orderBy,
        });
    }
    async save(data: any) {
        const savedResult = this.writeReplicaDiseasePhysicianFormsRepository.create(data);
        return await this.writeReplicaDiseasePhysicianFormsRepository.insert(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaDiseasePhysicianFormsRepository.metadata);
        return await this.writeReplicaDiseasePhysicianFormsRepository.createQueryBuilder('physicianforms')
            .update(DiseasePhysicianFormsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicaDiseasePhysicianFormsRepository.delete(condition);
    }
}
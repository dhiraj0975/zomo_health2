import { appConstant, CommonArrayService, CommonFileService, ManageDiseaseEntity, tableConstant } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaginateWithDiseaseManagementInput } from "../../../input";
@Injectable()
export class ManageDiseaseService {
    constructor(
        @InjectRepository(ManageDiseaseEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaManageDiseaseRepository: Repository<ManageDiseaseEntity>,
        @InjectRepository(ManageDiseaseEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaManageDiseaseRepository: Repository<ManageDiseaseEntity>,
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
                : 'managedisease.id';
        const queryResult = await this.readReplicaManageDiseaseRepository.createQueryBuilder('managedisease')
        .leftJoinAndMapOne(
            'managedisease.disease_form',
            tableConstant.DISEASE_MANAGEMENT.TBL_DS_FORMS,
            'disease_form',
            `disease_form.id = managedisease.disease_form_ids`,
          )
          .leftJoinAndMapOne(
            'managedisease.disease',
            tableConstant.DISEASE_MANAGEMENT.TBL_DS_DISEASES,
            'disease',
            `disease.id = managedisease.disease_id`,
          )
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: any) {
        return await this.readReplicaManageDiseaseRepository.createQueryBuilder('managedisease')
        .leftJoinAndMapOne(
            'managedisease.disease_form',
            tableConstant.DISEASE_MANAGEMENT.TBL_DS_FORMS,
            'disease_form',
            `disease_form.id = managedisease.disease_form_ids`,
          )
          .leftJoinAndMapOne(
            'managedisease.disease',
            tableConstant.DISEASE_MANAGEMENT.TBL_DS_DISEASES,
            'disease',
            `disease.id = managedisease.disease_id`,
          )
            .where(condition)
            .getOne();
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaManageDiseaseRepository.createQueryBuilder('managedisease')
        .leftJoinAndMapOne(
            'managedisease.disease_form',
            tableConstant.DISEASE_MANAGEMENT.TBL_DS_FORMS,
            'disease_form',
            `disease_form.id = managedisease.disease_form_ids`,
          )
          .leftJoinAndMapOne(
            'managedisease.disease',
            tableConstant.DISEASE_MANAGEMENT.TBL_DS_DISEASES,
            'disease',
            `disease.id = managedisease.disease_id`,
          )
            .where(condition)
            .getMany();
    }
    async save(data: any) {
        const savedResult = this.writeReplicaManageDiseaseRepository.create(data);
        return await this.writeReplicaManageDiseaseRepository.insert(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaManageDiseaseRepository.metadata);
        return await this.writeReplicaManageDiseaseRepository.createQueryBuilder('managedisease')
            .update(ManageDiseaseEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicaManageDiseaseRepository.delete(condition);
    }
}
import { appConstant, CommonArrayService, CommonFileService, DiseaseFormsEntity, tableConstant } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaginateInput } from "../../../input";
@Injectable()
export class DiseaseFormsService {
    constructor(
        @InjectRepository(DiseaseFormsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaDiseaseFormsRepository: Repository<DiseaseFormsEntity>,
        @InjectRepository(DiseaseFormsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaDiseaseFormsRepository: Repository<DiseaseFormsEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {
    }
    async paginateList(condition: any, paginationParam: PaginateInput) {
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
                : 'diseaseforms.id';
        const queryResult = await this.readReplicaDiseaseFormsRepository.createQueryBuilder('diseaseforms')
        .leftJoinAndMapOne(
            'diseaseforms.disease',
            tableConstant.DISEASE_MANAGEMENT.TBL_DS_DISEASES,
            'disease',
            `disease.id = diseaseforms.disease_id`,
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
        return await this.readReplicaDiseaseFormsRepository.createQueryBuilder('diseaseforms')
        .leftJoinAndMapOne(
            'diseaseforms.disease',
            tableConstant.DISEASE_MANAGEMENT.TBL_DS_DISEASES,
            'disease',
            `disease.id = diseaseforms.disease_id`,
          )
            .where(condition)
            .getOne();
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaDiseaseFormsRepository.createQueryBuilder('diseaseforms')
        .leftJoinAndMapOne(
            'diseaseforms.disease',
            tableConstant.DISEASE_MANAGEMENT.TBL_DS_DISEASES,
            'disease',
            `disease.id = diseaseforms.disease_id`,
          )
            .where(condition)
            .orderBy('diseaseforms.created', 'DESC')
            .getMany();
    }
    async save(data: any) {
        const savedResult = this.writeReplicaDiseaseFormsRepository.create(data);
        return await this.writeReplicaDiseaseFormsRepository.insert(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaDiseaseFormsRepository.metadata);
        return await this.writeReplicaDiseaseFormsRepository.createQueryBuilder('diseaseforms')
            .update(DiseaseFormsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicaDiseaseFormsRepository.delete(condition);
    }
}
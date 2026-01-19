import { appConstant, CommonArrayService, CommonFileService, DiseaseStandardCareEntity, tableConstant } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaginateWithDiseaseManagementInput } from "../../../input";
@Injectable()
export class StandardCareService {
    constructor(
        @InjectRepository(DiseaseStandardCareEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaDiseaseStandardCareRepository: Repository<DiseaseStandardCareEntity>,
        @InjectRepository(DiseaseStandardCareEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaDiseaseStandardCareRepository: Repository<DiseaseStandardCareEntity>,
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
                : 'standardcare.id';
        const queryResult = await this.readReplicaDiseaseStandardCareRepository.createQueryBuilder('standardcare')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: any) {
        return await this.writeReplicaDiseaseStandardCareRepository.createQueryBuilder('standardcare')
            .leftJoinAndMapOne(
                'standardcare.disease',
                tableConstant.DISEASE_MANAGEMENT.TBL_DS_DISEASES,
                'disease',
                `standardcare.disease_id = disease.id`,
            )
        .where(condition)
        .getOne()
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaDiseaseStandardCareRepository.find({
            where: condition,
            select: [],
            order: orderBy,
        });
    }
    async save(data: any) {
        const savedResult = this.writeReplicaDiseaseStandardCareRepository.create(data);
        return await this.writeReplicaDiseaseStandardCareRepository.insert(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaDiseaseStandardCareRepository.metadata);
        return await this.writeReplicaDiseaseStandardCareRepository.createQueryBuilder('standardcare')
            .update(DiseaseStandardCareEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicaDiseaseStandardCareRepository.delete(condition);
    }
}
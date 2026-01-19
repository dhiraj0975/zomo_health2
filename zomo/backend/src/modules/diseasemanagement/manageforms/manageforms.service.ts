import { appConstant, CommonArrayService, CommonFileService, DiseaseManageFormsEntity, tableConstant } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaginateWithDiseaseManagementInput } from "../../../input";
@Injectable()
export class ManageFormsService {
    constructor(
        @InjectRepository(DiseaseManageFormsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaDiseaseManageFormsRepository: Repository<DiseaseManageFormsEntity>,
        @InjectRepository(DiseaseManageFormsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaDiseaseManageFormsRepository: Repository<DiseaseManageFormsEntity>,
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
                : 'manageforms.id';
        const queryResult = await this.readReplicaDiseaseManageFormsRepository.createQueryBuilder('manageforms')
        .leftJoinAndMapMany(
            'manageforms.diseases',
            tableConstant.DISEASE_MANAGEMENT.TBL_DS_DISEASES,
            'diseases',
            `FIND_IN_SET(diseases.id, manageforms.disease_form_ids) > 0`,
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
        return await this.readReplicaDiseaseManageFormsRepository.createQueryBuilder('manageforms')
            .where(condition)
            .getOne();
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaDiseaseManageFormsRepository.find({
            where: condition,
            select: [],
            order: orderBy,
        });
    }
    async save(data: any) {
        const savedResult = this.writeReplicaDiseaseManageFormsRepository.create(data);
        return await this.writeReplicaDiseaseManageFormsRepository.insert(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaDiseaseManageFormsRepository.metadata);
        return await this.writeReplicaDiseaseManageFormsRepository.createQueryBuilder('manageforms')
            .update(DiseaseManageFormsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicaDiseaseManageFormsRepository.delete(condition);
    }
}
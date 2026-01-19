import { appConstant, CommonArrayService, CommonFileService, DiseasesEntity, tableConstant } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ActivityLogService } from "src/modules/master/activitylog/activitylog.service";
import { Repository } from "typeorm";
import { PaginateWithDiseaseManagementInput } from "../../../input";
@Injectable()
export class DiseasesService {
    constructor(
        @InjectRepository(DiseasesEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaDiseaseRepository: Repository<DiseasesEntity>,
        @InjectRepository(DiseasesEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaDiseaseRepository: Repository<DiseasesEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
        private readonly activityLogService: ActivityLogService,
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
                : 'disease.id';
        const queryResult = await this.readReplicaDiseaseRepository.createQueryBuilder('disease')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: any) {
        return await this.readReplicaDiseaseRepository.findOne({
            where: condition,
        });
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaDiseaseRepository.find({
            where: condition,
            select: [],
            order: orderBy,
        });
    }
    async save(data: any) {
        const savedResult = this.writeReplicaDiseaseRepository.create(data);
        return await this.writeReplicaDiseaseRepository.insert(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaDiseaseRepository.metadata);
        return await this.writeReplicaDiseaseRepository.createQueryBuilder('disease')
            .update(DiseasesEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicaDiseaseRepository.delete(condition);
    }
    async getCount(condition: any) {
        return await this.readReplicaDiseaseRepository.createQueryBuilder('disease')
        .where(condition)
        .orderBy('weight', 'DESC')
        .getOne();
    }
    async updateOrder(data: any, req:any =null) {
        let i = 0;
        for(let id of data.order) {
            await this.writeReplicaDiseaseRepository.createQueryBuilder('disease')
                .update(DiseasesEntity)
                .set({weight: ++i})
                .where({id})
                .execute();
                this.activityLogService.create({id:id, weight: 0}, {weight: i}, tableConstant.DISEASE_MANAGEMENT.TBL_DS_DISEASES, req.tokenUser?.id);
        }
    }
}
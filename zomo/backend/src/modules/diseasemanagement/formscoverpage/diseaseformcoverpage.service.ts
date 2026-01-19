import { appConstant, CommonArrayService, CommonFileService, DiseaseFormCoverPagesEntity } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaginateWithDiseaseManagementInput } from "../../../input";
@Injectable()
export class DiseaseFormCoverPageService {
    constructor(
        @InjectRepository(DiseaseFormCoverPagesEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaDiseaseFormsCoverPageRepository: Repository<DiseaseFormCoverPagesEntity>,
        @InjectRepository(DiseaseFormCoverPagesEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaDiseaseFormsCoverPageRepository: Repository<DiseaseFormCoverPagesEntity>,
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
                : 'coverpage.id';
        const queryResult = await this.readReplicaDiseaseFormsCoverPageRepository.createQueryBuilder('coverpage')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: any) {
        return await this.readReplicaDiseaseFormsCoverPageRepository.findOne({
            where: condition,
        });
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaDiseaseFormsCoverPageRepository.find({
            where: condition,
            select: [],
            order: orderBy,
        });
    }
    async save(data: any) {
        const savedResult = this.writeReplicaDiseaseFormsCoverPageRepository.create(data);
        return await this.writeReplicaDiseaseFormsCoverPageRepository.insert(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaDiseaseFormsCoverPageRepository.metadata);
        return await this.writeReplicaDiseaseFormsCoverPageRepository.createQueryBuilder('coverpage')
            .update(DiseaseFormCoverPagesEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicaDiseaseFormsCoverPageRepository.delete(condition);
    }
    async createUpdate(condition: any, data: any) {   
        data = await this.commonFileService.filterDataByEntityColumns(data, this.readReplicaDiseaseFormsCoverPageRepository.metadata);    
        let recordDetails = await this.readReplicaDiseaseFormsCoverPageRepository.findOne({ where: condition });       
        if (recordDetails) {
            await this.writeReplicaDiseaseFormsCoverPageRepository.update(condition, data);
            return {...recordDetails, update:1};
        } else {
            return await this.writeReplicaDiseaseFormsCoverPageRepository.save(data);
        }
    }
}
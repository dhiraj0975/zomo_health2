import { appConstant, CommonArrayService, CommonFileService, MediaFitnessEquipmentEntity } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaginationWithMediaFitnessInput } from '../input';
@Injectable()
export class FitnessEquipmentService {
    constructor(
        @InjectRepository(MediaFitnessEquipmentEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaFitnessEquipmentRepository: Repository<MediaFitnessEquipmentEntity>,
        @InjectRepository(MediaFitnessEquipmentEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaFitnessEquipmentRepository: Repository<MediaFitnessEquipmentEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {
    }
    async paginateList(condition: any, paginationParam: PaginationWithMediaFitnessInput) {
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
                : 'fitness.id';
        const queryResult = await this.readReplicaFitnessEquipmentRepository.createQueryBuilder('fitness')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: any) {
        return await this.readReplicaFitnessEquipmentRepository.findOne({
            where: condition,
        });
    }
    async listRecord(condition: any,fields: any = ['*'], orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaFitnessEquipmentRepository.find({
            where: condition,
            select: fields,
            order: orderBy,
        });
    }
    async save(data: any) {
        const savedResult = this.writeReplicaFitnessEquipmentRepository.create(data);
        return await this.writeReplicaFitnessEquipmentRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaFitnessEquipmentRepository.metadata);
        return await this.writeReplicaFitnessEquipmentRepository.createQueryBuilder('fitness')
            .update(MediaFitnessEquipmentEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicaFitnessEquipmentRepository.delete(condition);
    }
}
import { appConstant, CommonArrayService, CommonFileService, MediaFitnessVideoEquipmentEntity } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaginationWithMediaFitnessInput } from '../input';
@Injectable()
export class FitnessVideoEquipmentService {
    constructor(
        @InjectRepository(MediaFitnessVideoEquipmentEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaFitnessVideoEquipmentRepository: Repository<MediaFitnessVideoEquipmentEntity>,
        @InjectRepository(MediaFitnessVideoEquipmentEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaFitnessVideoEquipmentRepository: Repository<MediaFitnessVideoEquipmentEntity>,
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
        const queryResult = await this.readReplicaFitnessVideoEquipmentRepository.createQueryBuilder('fitness')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: any) {
        return await this.readReplicaFitnessVideoEquipmentRepository.findOne({
            where: condition,
        });
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaFitnessVideoEquipmentRepository.find({
            where: condition,
            select: [],
            order: orderBy,
        });
    }
    async save(data: any) {
        const savedResult = this.writeReplicaFitnessVideoEquipmentRepository.create(data);
        return await this.writeReplicaFitnessVideoEquipmentRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaFitnessVideoEquipmentRepository.metadata);
        return await this.writeReplicaFitnessVideoEquipmentRepository.createQueryBuilder('fitness')
            .update(MediaFitnessVideoEquipmentEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicaFitnessVideoEquipmentRepository.delete(condition);
    }
}
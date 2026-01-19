import { appConstant, CommonArrayService, CommonFileService, MediaFitnessVideoStatusEntity } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaginationWithMediaFitnessInput } from '../input';
@Injectable()
export class FitnessVideoStatusService {
    constructor(
        @InjectRepository(MediaFitnessVideoStatusEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaFitnessVideoStatusRepository: Repository<MediaFitnessVideoStatusEntity>,
        @InjectRepository(MediaFitnessVideoStatusEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaFitnessVideoStatusRepository: Repository<MediaFitnessVideoStatusEntity>,
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
        const queryResult = await this.readReplicaFitnessVideoStatusRepository.createQueryBuilder('fitness')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: any) {
        return await this.readReplicaFitnessVideoStatusRepository.findOne({
            where: condition,
        });
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaFitnessVideoStatusRepository.find({
            where: condition,
            select: [],
            order: orderBy,
        });
    }
    async save(data: any) {
        const savedResult = this.writeReplicaFitnessVideoStatusRepository.create(data);
        return await this.writeReplicaFitnessVideoStatusRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaFitnessVideoStatusRepository.metadata);
        return await this.writeReplicaFitnessVideoStatusRepository.createQueryBuilder('fitness')
            .update(MediaFitnessVideoStatusEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicaFitnessVideoStatusRepository.delete(condition);
    }
}
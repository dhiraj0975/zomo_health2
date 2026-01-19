import { appConstant, CommonArrayService, CommonFileService, MediaFitnessVideoSeriesEntity } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaginationWithMediaFitnessInput } from '../input';
@Injectable()
export class FitnessVideoSeriesService {
    constructor(
        @InjectRepository(MediaFitnessVideoSeriesEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaFitnessVideoSeriesRepository: Repository<MediaFitnessVideoSeriesEntity>,
        @InjectRepository(MediaFitnessVideoSeriesEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaFitnessVideoSeriesRepository: Repository<MediaFitnessVideoSeriesEntity>,
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
        const queryResult = await this.readReplicaFitnessVideoSeriesRepository.createQueryBuilder('fitness')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: any) {
        return await this.readReplicaFitnessVideoSeriesRepository.findOne({
            where: condition,
        });
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaFitnessVideoSeriesRepository.find({
            where: condition,
            select: [],
            order: orderBy,
        });
    }
    async save(data: any) {
        const savedResult = this.writeReplicaFitnessVideoSeriesRepository.create(data);
        return await this.writeReplicaFitnessVideoSeriesRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaFitnessVideoSeriesRepository.metadata);
        return await this.writeReplicaFitnessVideoSeriesRepository.createQueryBuilder('fitness')
            .update(MediaFitnessVideoSeriesEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicaFitnessVideoSeriesRepository.delete(condition);
    }
}
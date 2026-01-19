import { appConstant, CommonArrayService, CommonFileService, MediaFitnessSeriesEntity } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaginationWithMediaFitnessInput } from '../input';
@Injectable()
export class FitnessSeriesService {
    constructor(
        @InjectRepository(MediaFitnessSeriesEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaFitnessSeriesRepository: Repository<MediaFitnessSeriesEntity>,
        @InjectRepository(MediaFitnessSeriesEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaFitnessSeriesRepository: Repository<MediaFitnessSeriesEntity>,
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
        const queryResult = await this.readReplicaFitnessSeriesRepository.createQueryBuilder('fitness')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: any) {
        return await this.readReplicaFitnessSeriesRepository.findOne({
            where: condition,
        });
    }
    async listRecord(condition: any,fields: any[] = [], orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaFitnessSeriesRepository.find({
            where: condition,
            select: fields,
            order: orderBy,
        });
    }
    async save(data: any) {
        const savedResult = this.writeReplicaFitnessSeriesRepository.create(data);
        return await this.writeReplicaFitnessSeriesRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaFitnessSeriesRepository.metadata);
        return await this.writeReplicaFitnessSeriesRepository.createQueryBuilder('fitness')
            .update(MediaFitnessSeriesEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicaFitnessSeriesRepository.delete(condition);
    }
}
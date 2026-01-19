import { appConstant, CommonArrayService, CommonFileService, MediaFitnessFocusEntity } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaginationWithMediaFitnessInput } from '../input';
@Injectable()
export class FitnessFocusService {
    constructor(
        @InjectRepository(MediaFitnessFocusEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaFitnessDifficultyRepository: Repository<MediaFitnessFocusEntity>,
        @InjectRepository(MediaFitnessFocusEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaFitnessDifficultyRepository: Repository<MediaFitnessFocusEntity>,
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
        const queryResult = await this.readReplicaFitnessDifficultyRepository.createQueryBuilder('fitness')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: any) {
        return await this.readReplicaFitnessDifficultyRepository.findOne({
            where: condition,
        });
    }
    async listRecord(condition: any, fields: any = ['*'], orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaFitnessDifficultyRepository.find({
            where: condition,
            select: fields,
            order: orderBy,
        });
    }
    async save(data: any) {
        const savedResult = this.writeReplicaFitnessDifficultyRepository.create(data);
        return await this.writeReplicaFitnessDifficultyRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaFitnessDifficultyRepository.metadata);
        return await this.writeReplicaFitnessDifficultyRepository.createQueryBuilder('fitness')
            .update(MediaFitnessFocusEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicaFitnessDifficultyRepository.delete(condition);
    }
}
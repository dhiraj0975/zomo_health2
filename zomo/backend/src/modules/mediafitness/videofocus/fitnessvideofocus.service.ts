import { appConstant, CommonArrayService, CommonFileService, MediaFitnessVideoFocusEntity } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaginationWithMediaFitnessInput } from '../input';
@Injectable()
export class FitnessVideoFocusService {
    constructor(
        @InjectRepository(MediaFitnessVideoFocusEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaFitnessVideoFocusRepository: Repository<MediaFitnessVideoFocusEntity>,
        @InjectRepository(MediaFitnessVideoFocusEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaFitnessVideoFocusRepository: Repository<MediaFitnessVideoFocusEntity>,
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
        const queryResult = await this.readReplicaFitnessVideoFocusRepository.createQueryBuilder('fitness')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: any) {
        return await this.readReplicaFitnessVideoFocusRepository.findOne({
            where: condition,
        });
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaFitnessVideoFocusRepository.find({
            where: condition,
            select: [],
            order: orderBy,
        });
    }
    async save(data: any) {
        const savedResult = this.writeReplicaFitnessVideoFocusRepository.create(data);
        return await this.writeReplicaFitnessVideoFocusRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaFitnessVideoFocusRepository.metadata);
        return await this.writeReplicaFitnessVideoFocusRepository.createQueryBuilder('fitness')
            .update(MediaFitnessVideoFocusEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicaFitnessVideoFocusRepository.delete(condition);
    }
}
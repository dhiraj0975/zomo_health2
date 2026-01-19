import { appConstant, CommonArrayService, CommonFileService, MediaFitnessVideoInstructorsEntity } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaginationWithMediaFitnessInput } from '../input';
@Injectable()
export class FitnessVideoInstructorsService {
    constructor(
        @InjectRepository(MediaFitnessVideoInstructorsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaFitnessVideoInstructorsRepository: Repository<MediaFitnessVideoInstructorsEntity>,
        @InjectRepository(MediaFitnessVideoInstructorsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaFitnessVideoInstructorsRepository: Repository<MediaFitnessVideoInstructorsEntity>,
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
        const queryResult = await this.readReplicaFitnessVideoInstructorsRepository.createQueryBuilder('fitness')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: any) {
        return await this.readReplicaFitnessVideoInstructorsRepository.findOne({
            where: condition,
        });
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaFitnessVideoInstructorsRepository.find({
            where: condition,
            select: [],
            order: orderBy,
        });
    }
    async save(data: any) {
        const savedResult = this.writeReplicaFitnessVideoInstructorsRepository.create(data);
        return await this.writeReplicaFitnessVideoInstructorsRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaFitnessVideoInstructorsRepository.metadata);
        return await this.writeReplicaFitnessVideoInstructorsRepository.createQueryBuilder('fitness')
            .update(MediaFitnessVideoInstructorsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicaFitnessVideoInstructorsRepository.delete(condition);
    }
}
import { appConstant, CommonArrayService, CommonFileService, MediaFitnessInstructorStatusEntity } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaginationWithMediaFitnessInput } from '../input';
@Injectable()
export class FitnessInstructorStatusService {
    constructor(
        @InjectRepository(MediaFitnessInstructorStatusEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaFitnessInstructorStatusRepository: Repository<MediaFitnessInstructorStatusEntity>,
        @InjectRepository(MediaFitnessInstructorStatusEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaFitnessInstructorStatusRepository: Repository<MediaFitnessInstructorStatusEntity>,
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
        const queryResult = await this.readReplicaFitnessInstructorStatusRepository.createQueryBuilder('fitness')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: any) {
        return await this.readReplicaFitnessInstructorStatusRepository.findOne({
            where: condition,
        });
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaFitnessInstructorStatusRepository.find({
            where: condition,
            select: [],
            order: orderBy,
        });
    }
    async save(data: any) {
        const savedResult = this.writeReplicaFitnessInstructorStatusRepository.create(data);
        return await this.writeReplicaFitnessInstructorStatusRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaFitnessInstructorStatusRepository.metadata);
        return await this.writeReplicaFitnessInstructorStatusRepository.createQueryBuilder('fitness')
            .update(MediaFitnessInstructorStatusEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicaFitnessInstructorStatusRepository.delete(condition);
    }
}
import { appConstant, CommonArrayService, CommonFileService, MediaFitnessVideoCategoryEntity } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaginationWithMediaFitnessInput } from '../input';
@Injectable()
export class FitnessVideoCategoryService {
    constructor(
        @InjectRepository(MediaFitnessVideoCategoryEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaFitnessVideoCategoryRepository: Repository<MediaFitnessVideoCategoryEntity>,
        @InjectRepository(MediaFitnessVideoCategoryEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaFitnessVideoCategoryRepository: Repository<MediaFitnessVideoCategoryEntity>,
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
        const queryResult = await this.readReplicaFitnessVideoCategoryRepository.createQueryBuilder('fitness')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: any) {
        return await this.readReplicaFitnessVideoCategoryRepository.findOne({
            where: condition,
        });
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaFitnessVideoCategoryRepository.find({
            where: condition,
            select: [],
            order: orderBy,
        });
    }
    async save(data: any) {
        const savedResult = this.writeReplicaFitnessVideoCategoryRepository.create(data);
        return await this.writeReplicaFitnessVideoCategoryRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaFitnessVideoCategoryRepository.metadata);
        return await this.writeReplicaFitnessVideoCategoryRepository.createQueryBuilder('fitness')
            .update(MediaFitnessVideoCategoryEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicaFitnessVideoCategoryRepository.delete(condition);
    }
}
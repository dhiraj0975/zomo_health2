import { appConstant, CommonArrayService, CommonDateService, CommonFileService, MediaFitnessVideoClickEntity, tableConstant } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaginationWithMediaFitnessInput } from '../input';
@Injectable()
export class FitnessVideoClickService {
    constructor(
        @InjectRepository(MediaFitnessVideoClickEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaFitnessVideoClickRepository: Repository<MediaFitnessVideoClickEntity>,
        @InjectRepository(MediaFitnessVideoClickEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaFitnessVideoClickRepository: Repository<MediaFitnessVideoClickEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonDateService: CommonDateService,
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
        const queryResult = await this.readReplicaFitnessVideoClickRepository.createQueryBuilder('fitness')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: any) {
        return await this.readReplicaFitnessVideoClickRepository.findOne({
            where: condition,
        });
    }
    async listRecord(condition: any, orderBy: any = null, fields: any = ['fitness.*'],) {
        if (!orderBy) {
            orderBy = { 'fitness.id': 'DESC' };
        }
        return await this.readReplicaFitnessVideoClickRepository.createQueryBuilder('fitness')
        .where(condition)
        .select(fields)
        .orderBy(`${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
        .getRawMany();
    }
    async save(data: any) {
        const savedResult = this.writeReplicaFitnessVideoClickRepository.create(data);
        return await this.writeReplicaFitnessVideoClickRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaFitnessVideoClickRepository.metadata);
        return await this.writeReplicaFitnessVideoClickRepository.createQueryBuilder('fitness')
            .update(MediaFitnessVideoClickEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicaFitnessVideoClickRepository.delete(condition);
    }
}
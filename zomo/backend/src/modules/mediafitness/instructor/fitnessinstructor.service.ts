import { appConstant, CommonArrayService, CommonFileService, MediaFitnessInstructorEntity } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaginationWithMediaFitnessInput } from '../input';
@Injectable()
export class FitnessInstructorService {
    constructor(
        @InjectRepository(MediaFitnessInstructorEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaFitnessInstructorRepository: Repository<MediaFitnessInstructorEntity>,
        @InjectRepository(MediaFitnessInstructorEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaFitnessInstructorRepository: Repository<MediaFitnessInstructorEntity>,
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
        const queryResult = await this.readReplicaFitnessInstructorRepository.createQueryBuilder('fitness')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: any) {
        return await this.readReplicaFitnessInstructorRepository.findOne({
            where: condition,
        });
    }
    async listRecord(condition: any, fields: any[] = [], orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaFitnessInstructorRepository.find({
            where: condition,
            select: fields,
            order: orderBy,
        });
    }
    async save(data: any) {
        const savedResult = this.writeReplicaFitnessInstructorRepository.create(data);
        return await this.writeReplicaFitnessInstructorRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaFitnessInstructorRepository.metadata);
        return await this.writeReplicaFitnessInstructorRepository.createQueryBuilder('fitness')
            .update(MediaFitnessInstructorEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicaFitnessInstructorRepository.delete(condition);
    }
}
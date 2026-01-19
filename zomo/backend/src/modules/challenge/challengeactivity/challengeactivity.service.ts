import { appConstant, ChallengeActivityEntity, CommonArrayService, CommonFileService } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PaginateWithChallengeInput } from 'src/input';
import { Repository } from 'typeorm';
@Injectable()
export class ChallengeActivityService {
    constructor(
        @InjectRepository(ChallengeActivityEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaChallengeActivityRepository: Repository<ChallengeActivityEntity>,
        @InjectRepository(ChallengeActivityEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaChallengeActivityRepository: Repository<ChallengeActivityEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {}
    async paginateList(condition: any, paginationParam: PaginateWithChallengeInput) {
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
                : 'challenge.created';
        let queryResult = await this.readReplicaChallengeActivityRepository.createQueryBuilder('challenge')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async save(data: any) {
        const savedResult = this.writeReplicaChallengeActivityRepository.create(data);
        return await this.writeReplicaChallengeActivityRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaChallengeActivityRepository.metadata);
        return await this.writeReplicaChallengeActivityRepository.createQueryBuilder('ca')
            .update(ChallengeActivityEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaChallengeActivityRepository.delete(condition);
    }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaChallengeActivityRepository.findOne({
            where: condition,
            order: orderBy,
        });
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaChallengeActivityRepository.find({
            where: condition,
            order: orderBy,
        });
    }
}

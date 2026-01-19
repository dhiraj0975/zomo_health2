import { TagsInterface } from '@/interface';
import { appConstant, ChallengeTagsEntity, CommonArrayService, CommonFileService } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaginateInput } from "../../../input";
@Injectable()
export class ChallengeTagsService {
    constructor(
        @InjectRepository(ChallengeTagsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaTagsRepository: Repository<ChallengeTagsEntity>,
        @InjectRepository(ChallengeTagsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaTagsRepository: Repository<ChallengeTagsEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {
    }
    async paginateList(condition: any, paginationParam: PaginateInput) {
        const paginateObj = this.commonArrayService.getPaginationVar(
            paginationParam.page || 1,
            paginationParam.limit,
        );
        const order = paginationParam && paginationParam.order
                ? paginationParam.order
                : 'DESC';
        const orderBy = paginationParam && paginationParam.order_by
                ? paginationParam.order_by
                : 'tags.id';
        const queryResult = await this.readReplicaTagsRepository.createQueryBuilder('tags')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: any) {
        return await this.readReplicaTagsRepository.createQueryBuilder('tags')
            .where(condition)
            .getOne();
    }
    async listRecord(condition: any, orderBy: any = null): Promise<TagsInterface[]> {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaTagsRepository.createQueryBuilder('tags')
        .where(condition)
        .orderBy(`tags.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
        .getMany();
    }
    async save(data: any) {
        const savedResult = this.writeReplicaTagsRepository.create(data);
        return await this.writeReplicaTagsRepository.insert(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaTagsRepository.metadata);
        return await this.writeReplicaTagsRepository.createQueryBuilder('tags')
            .update(ChallengeTagsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicaTagsRepository.delete(condition);
    }

    async getCount(condition: any) {       
        return await this.readReplicaTagsRepository.createQueryBuilder('tags')
        .where(condition)
        .orderBy('id', 'DESC')
        .getOne();
    }
}
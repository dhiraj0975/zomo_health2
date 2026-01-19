import { appConstant, CommonArrayService, CommonFileService, MediaPostEntity, tableConstant } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaginationWithMediaFitnessInput } from '../input';
@Injectable()
export class MediaPostService {
    constructor(
        @InjectRepository(MediaPostEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaMediaPostRepository: Repository<MediaPostEntity>,
        @InjectRepository(MediaPostEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaMediaPostRepository: Repository<MediaPostEntity>,
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
                : 'media.id';
        const queryResult = await this.readReplicaMediaPostRepository.createQueryBuilder('media')
        .leftJoinAndMapOne(
            'media.category',
            tableConstant.MEDIA_FITNESS.TBL_ME_CATEGORY,
            'category',
            `category.id = media.cat_id `,
        )
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: any) {
        return await this.readReplicaMediaPostRepository.findOne({
            where: condition,
        });
    }
    async listRecord(condition: any, fields: any = ['*'],orderBy: any = 'id',order: any = 'DESC') {
        return await this.readReplicaMediaPostRepository.createQueryBuilder()
            .where(condition)
            .select(fields)
            .where(condition)
            .orderBy(orderBy, order)
            .getRawMany();
    }
    async save(data: any) {
        const savedResult = this.writeReplicaMediaPostRepository.create(data);
        return await this.writeReplicaMediaPostRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaMediaPostRepository.metadata);
        return await this.writeReplicaMediaPostRepository.createQueryBuilder('media')
            .update(MediaPostEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicaMediaPostRepository.delete(condition);
    }
}
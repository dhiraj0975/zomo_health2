import { appConstant, BannedWordEntity, CommonArrayService, CommonFileService } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PaginateWithChallengeInput } from 'src/input';
import { Repository } from 'typeorm';
@Injectable()
export class BannedWordService {
    constructor(
        @InjectRepository(BannedWordEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaBannedWordRepository: Repository<BannedWordEntity>,
        @InjectRepository(BannedWordEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaBannedWordRepository: Repository<BannedWordEntity>,
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
                : 'bw.add_date';
        let queryResult = await this.readReplicaBannedWordRepository.createQueryBuilder('bw')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async save(data: any) {
        const savedResult = this.writeReplicaBannedWordRepository.create(data);
        return await this.writeReplicaBannedWordRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaBannedWordRepository.metadata);
        return await this.writeReplicaBannedWordRepository.createQueryBuilder('bw')
            .update(BannedWordEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaBannedWordRepository.delete(condition);
    }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaBannedWordRepository.findOne({
            where: condition,
            order: orderBy,
        });
    }
    async listRecord(condition: any, field: any = ['bw'], orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaBannedWordRepository.createQueryBuilder('bw')
            .where(condition)
            .select(field)
            .getRawMany();
    }
}

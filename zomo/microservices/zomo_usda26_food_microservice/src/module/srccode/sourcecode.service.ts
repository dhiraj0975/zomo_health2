import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { appConstant } from 'src/constant';
import { SourceCodeEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class SourceCodeService {
    constructor(
        @InjectRepository(SourceCodeEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaSourceCodeRepository: Repository<SourceCodeEntity>,
        @InjectRepository(SourceCodeEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaSourceCodeRepository: Repository<SourceCodeEntity>,
    ) {}
    async createSourceCode(data: any) {
        const savedResult = this.writeReplicaSourceCodeRepository.create(data);
        return await this.writeReplicaSourceCodeRepository.insert(savedResult);
    }
    async updateSourceCode(condition: any, data: any) {
        return await this.writeReplicaSourceCodeRepository.createQueryBuilder('food')
            .update(SourceCodeEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async deleteSourceCode(condition: any) {
        return await this.writeReplicaSourceCodeRepository.delete(condition);
    }
    async listSourceCode(condition: any) {
        return await this.readReplicaSourceCodeRepository.createQueryBuilder('food')
            .where(condition)
            .getMany();
    }
    async getOneSourceCode(condition: any) {
        return await this.readReplicaSourceCodeRepository.createQueryBuilder('food')
            .where(condition)
            .getOne();
    }
    async paginateSourceCode(
        condition: any,
        order: any,
        orderBy: any,
        paginateObj: any,
    ) {
        const queryResult = await this.readReplicaSourceCodeRepository.createQueryBuilder(
            'food',
        )
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return {
            list: result,
            total: total,
            pages: Math.ceil(total / paginateObj.take),
            limit: paginateObj.take,
            page: paginateObj.page,
        };
    }
}

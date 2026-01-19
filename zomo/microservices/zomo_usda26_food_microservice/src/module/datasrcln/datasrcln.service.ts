import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { appConstant } from 'src/constant';
import { DataSrcLnEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class DataSrcLnService {
    constructor(
        @InjectRepository(DataSrcLnEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaDataSourceLnRepository: Repository<DataSrcLnEntity>,
        @InjectRepository(DataSrcLnEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaDataSourceLnRepository: Repository<DataSrcLnEntity>,
    ) {}
    async createDataSource(data: any) {
        const savedResult = this.writeReplicaDataSourceLnRepository.create(data);
        return await this.writeReplicaDataSourceLnRepository.insert(savedResult);
    }
    async updateDataSource(condition: any, data: any) {
        return await this.writeReplicaDataSourceLnRepository.createQueryBuilder('food')
            .update(DataSrcLnEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async deleteDataSource(condition: any) {
        return await this.writeReplicaDataSourceLnRepository.delete(condition);
    }
    async listDataSource(condition: any) {
        return await this.readReplicaDataSourceLnRepository.createQueryBuilder('food')
            .where(condition)
            .getMany();
    }
    async getOneDataSource(condition: any) {
        return await this.readReplicaDataSourceLnRepository.createQueryBuilder('food')
            .where(condition)
            .getOne();
    }
    async paginateDataSource(
        condition: any,
        order: any,
        orderBy: any,
        paginateObj: any,
    ) {
        const queryResult = await this.readReplicaDataSourceLnRepository.createQueryBuilder(
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

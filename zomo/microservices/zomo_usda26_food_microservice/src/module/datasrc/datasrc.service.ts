import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { appConstant } from 'src/constant';
import { DataSrcEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class DataSrcService {
    constructor(
        @InjectRepository(DataSrcEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaDataSourceRepository: Repository<DataSrcEntity>,
        @InjectRepository(DataSrcEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaDataSourceRepository: Repository<DataSrcEntity>,
    ) {}
    async createDataSource(data: any) {
        const savedResult = this.writeReplicaDataSourceRepository.create(data);
        return await this.writeReplicaDataSourceRepository.insert(savedResult);
    }
    async updateDataSource(condition: any, data: any) {
        return await this.writeReplicaDataSourceRepository.createQueryBuilder('food')
            .update(DataSrcEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async deleteDataSource(condition: any) {
        return await this.writeReplicaDataSourceRepository.delete(condition);
    }
    async listDataSource(condition: any) {
        return await this.readReplicaDataSourceRepository.createQueryBuilder('food')
            .where(condition)
            .getMany();
    }
    async getOneDataSource(condition: any) {
        return await this.readReplicaDataSourceRepository.createQueryBuilder('food')
            .where(condition)
            .getOne();
    }
    async paginateDataSource(
        condition: any,
        order: any,
        orderBy: any,
        paginateObj: any,
    ) {
        const queryResult = await this.readReplicaDataSourceRepository.createQueryBuilder(
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

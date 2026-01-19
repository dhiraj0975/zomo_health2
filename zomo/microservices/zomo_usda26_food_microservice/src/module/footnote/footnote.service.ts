import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { appConstant } from 'src/constant';
import { FootNoteEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class FootNoteService {
    constructor(
        @InjectRepository(FootNoteEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaFootNoteRepository: Repository<FootNoteEntity>,
        @InjectRepository(FootNoteEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaFootNoteRepository: Repository<FootNoteEntity>,
    ) {}
    async createFootNote(data: any) {
        const savedResult = this.writeReplicaFootNoteRepository.create(data);
        return await this.writeReplicaFootNoteRepository.insert(savedResult);
    }
    async updateFootNote(condition: any, data: any) {
        return await this.writeReplicaFootNoteRepository.createQueryBuilder('food')
            .update(FootNoteEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async deleteFootNote(condition: any) {
        return await this.writeReplicaFootNoteRepository.delete(condition);
    }
    async listFootNote(condition: any) {
        return await this.readReplicaFootNoteRepository.createQueryBuilder('food')
            .where(condition)
            .getMany();
    }
    async getOneFootNote(condition: any) {
        return await this.readReplicaFootNoteRepository.createQueryBuilder('food')
            .where(condition)
            .getOne();
    }
    async paginateFootNote(
        condition: any,
        order: any,
        orderBy: any,
        paginateObj: any,
    ) {
        const queryResult = await this.readReplicaFootNoteRepository.createQueryBuilder(
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

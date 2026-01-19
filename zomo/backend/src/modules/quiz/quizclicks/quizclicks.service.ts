import { appConstant, CommonFileService, QuizClicksEntity } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class QuizClicksService {
    constructor(
        @InjectRepository(QuizClicksEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaQuizClicksRepository: Repository<QuizClicksEntity>,
        @InjectRepository(QuizClicksEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaQuizClicksRepository: Repository<QuizClicksEntity>,
        private readonly commonFileService: CommonFileService,
    ) {}
    async save(data: any) {
        const savedResult = this.writeReplicaQuizClicksRepository.create(data);
        return await this.writeReplicaQuizClicksRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaQuizClicksRepository.metadata);
        return await this.writeReplicaQuizClicksRepository.createQueryBuilder('qc')
            .update(QuizClicksEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaQuizClicksRepository.delete(condition);
    }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaQuizClicksRepository.findOne({
            where: condition,
            order: orderBy,
        });
    }
}

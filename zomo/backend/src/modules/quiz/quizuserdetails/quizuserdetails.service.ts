import { appConstant, CommonFileService, QuizUserDetailsEntity } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class QuizUserDetailsService {
    constructor(
        @InjectRepository(QuizUserDetailsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaQuizUserDetailsRepository: Repository<QuizUserDetailsEntity>,
        @InjectRepository(QuizUserDetailsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaQuizUserDetailsRepository: Repository<QuizUserDetailsEntity>,
        private readonly commonFileService: CommonFileService,
    ) {}
    async save(data: any) {
        const savedResult = this.writeReplicaQuizUserDetailsRepository.create(data);
        return await this.writeReplicaQuizUserDetailsRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaQuizUserDetailsRepository.metadata);
        return await this.writeReplicaQuizUserDetailsRepository.createQueryBuilder('ud')
            .update(QuizUserDetailsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaQuizUserDetailsRepository.delete(condition);
    }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaQuizUserDetailsRepository.findOne({
            where: condition,
            order: orderBy,
        });
    }
    async listRecord(condition: any, orderBy: any = null, fields: any = ['ud.*']) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaQuizUserDetailsRepository.createQueryBuilder('ud')
        .where(condition)
        .select(fields)
        .orderBy(`ud.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
        .getRawMany();
    }
}

import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SurveyEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class SurveyService {
    constructor(
        @InjectRepository(SurveyEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaSurveyRepository: Repository<SurveyEntity>,
        @InjectRepository(SurveyEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaSurveyRepository: Repository<SurveyEntity>,
    ) {}
    async create(data: any) {
        const savedResult = this.writeReplicaSurveyRepository.create(data);
        return await this.writeReplicaSurveyRepository.save(savedResult);
    }
}

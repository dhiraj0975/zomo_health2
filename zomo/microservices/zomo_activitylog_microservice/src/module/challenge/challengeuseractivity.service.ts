import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FitnessUserActivityEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class ChallengeUserActivityService {
    constructor(
        @InjectRepository(FitnessUserActivityEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaFitnessUserActivityRepository: Repository<FitnessUserActivityEntity>,
        @InjectRepository(FitnessUserActivityEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaFitnessUserActivityRepository: Repository<FitnessUserActivityEntity>,
    ) {}
    async create(data: any) {
        const savedResult = this.writeReplicaFitnessUserActivityRepository.create(data);
        return await this.writeReplicaFitnessUserActivityRepository.save(savedResult);
    }
}

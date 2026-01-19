import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TobaccoUsesEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class HealthCheckupTobaccoUsesService {
    constructor(
        @InjectRepository(TobaccoUsesEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaHealthCheckupTobaccoUsesRepository: Repository<TobaccoUsesEntity>,
        @InjectRepository(TobaccoUsesEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaHealthCheckupTobaccoUsesRepository: Repository<TobaccoUsesEntity>,
    ) {}
    async create(data: any) {
        const savedResult =
            this.writeReplicaHealthCheckupTobaccoUsesRepository.create(data);
        return await this.writeReplicaHealthCheckupTobaccoUsesRepository.save(savedResult);
    }
}

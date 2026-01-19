import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CoachEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class CoachService {
    constructor(
        @InjectRepository(CoachEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaCoachRepository: Repository<CoachEntity>,
        @InjectRepository(CoachEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaCoachRepository: Repository<CoachEntity>,
    ) {}
    async create(data: any) {
        const savedResult = this.writeReplicaCoachRepository.create(data);
        return await this.writeReplicaCoachRepository.save(savedResult);
    }
}

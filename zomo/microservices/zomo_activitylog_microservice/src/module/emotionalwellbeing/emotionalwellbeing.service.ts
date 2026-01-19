import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EmotionalWellbeingEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class EmotionalWellbeingService {
    constructor(
        @InjectRepository(EmotionalWellbeingEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaEmotionalWellbeingRepository: Repository<EmotionalWellbeingEntity>,
        @InjectRepository(EmotionalWellbeingEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaEmotionalWellbeingRepository: Repository<EmotionalWellbeingEntity>,
    ) {}
    async create(data: any) {
        const savedResult = this.writeReplicaEmotionalWellbeingRepository.create(data);
        return await this.writeReplicaEmotionalWellbeingRepository.save(savedResult);
    }
}

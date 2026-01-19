import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EmotionalWellbeingPostEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class EmotionalWellbeingPostService {
    constructor(
        @InjectRepository(EmotionalWellbeingPostEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaEmotionalWellbeingPostRepository: Repository<EmotionalWellbeingPostEntity>,
        @InjectRepository(EmotionalWellbeingPostEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaEmotionalWellbeingPostRepository: Repository<EmotionalWellbeingPostEntity>,
    ) {}
    async create(data: any) {
        const savedResult = this.writeReplicaEmotionalWellbeingPostRepository.create(data);
        return await this.writeReplicaEmotionalWellbeingPostRepository.save(savedResult);
    }
}

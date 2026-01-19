import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MediaFitnessVideoEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class MediaFitnessVideoService {
    constructor(
        @InjectRepository(MediaFitnessVideoEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaMediaFitnessVideoRepository: Repository<MediaFitnessVideoEntity>,
        @InjectRepository(MediaFitnessVideoEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaMediaFitnessVideoRepository: Repository<MediaFitnessVideoEntity>,
    ) {}
    async create(data: any) {
        const savedResult = this.writeReplicaMediaFitnessVideoRepository.create(data);
        return await this.writeReplicaMediaFitnessVideoRepository.save(savedResult);
    }
}

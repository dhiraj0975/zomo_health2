import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MediaPostEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class MediaFitnessPostService {
    constructor(
        @InjectRepository(MediaPostEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaMediaFitnessPostRepository: Repository<MediaPostEntity>,
        @InjectRepository(MediaPostEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaMediaFitnessPostRepository: Repository<MediaPostEntity>,
    ) {}
    async create(data: any) {
        const savedResult = this.writeReplicaMediaFitnessPostRepository.create(data);
        return await this.writeReplicaMediaFitnessPostRepository.save(savedResult);
    }
}

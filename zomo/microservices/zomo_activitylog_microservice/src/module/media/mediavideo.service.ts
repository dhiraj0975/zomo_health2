import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MediaVideosEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class MediaVideoService {
    constructor(
        @InjectRepository(MediaVideosEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaMediaVideoRepository: Repository<MediaVideosEntity>,
        @InjectRepository(MediaVideosEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaMediaVideoRepository: Repository<MediaVideosEntity>,
    ) {}
    async create(data: any) {
        const savedResult = this.writeReplicaMediaVideoRepository.create(data);
        return await this.writeReplicaMediaVideoRepository.save(savedResult);
    }
}

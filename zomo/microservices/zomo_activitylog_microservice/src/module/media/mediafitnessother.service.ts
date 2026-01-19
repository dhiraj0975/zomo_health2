import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MediaFitnessOtherEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class MediaFitnessOtherService {
    constructor(
        @InjectRepository(MediaFitnessOtherEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaMediaFitnessOtherRepository: Repository<MediaFitnessOtherEntity>,
        @InjectRepository(MediaFitnessOtherEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaMediaFitnessOtherRepository: Repository<MediaFitnessOtherEntity>,
    ) {}
    async create(data: any) {
        const savedResult = this.writeReplicaMediaFitnessOtherRepository.create(data);
        return await this.writeReplicaMediaFitnessOtherRepository.save(savedResult);
    }
}

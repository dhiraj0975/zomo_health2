import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DefaultEntity } from 'src/entity/default';
import { Repository } from 'typeorm';
@Injectable()
export class DefaultService {
    constructor(
        @InjectRepository(DefaultEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaQuickLinkRepository: Repository<DefaultEntity>,
        @InjectRepository(DefaultEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaQuickLinkRepository: Repository<DefaultEntity>,
    ) {}
    async create(data: any) {
        const savedResult = this.writeReplicaQuickLinkRepository.create(data);
        return await this.writeReplicaQuickLinkRepository.save(savedResult);
    }
}

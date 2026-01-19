import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QuickLinkEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class QuickLinkService {
    constructor(
        @InjectRepository(QuickLinkEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaQuickLinkRepository: Repository<QuickLinkEntity>,
        @InjectRepository(QuickLinkEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaQuickLinkRepository: Repository<QuickLinkEntity>,
    ) {}
    async create(data: any) {
        const savedResult = this.writeReplicaQuickLinkRepository.create(data);
        return await this.writeReplicaQuickLinkRepository.save(savedResult);
    }
}

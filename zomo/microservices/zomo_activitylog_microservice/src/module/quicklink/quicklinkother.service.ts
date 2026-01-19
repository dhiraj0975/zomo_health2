import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QuickLinkOtherEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class QuickLinkOtherService {
    constructor(
        @InjectRepository(QuickLinkOtherEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaQuickLinkRepository: Repository<QuickLinkOtherEntity>,
        @InjectRepository(QuickLinkOtherEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaQuickLinkRepository: Repository<QuickLinkOtherEntity>,
    ) {}
    async create(data: any) {
        const savedResult = this.writeReplicaQuickLinkRepository.create(data);
        return await this.writeReplicaQuickLinkRepository.save(savedResult);
    }
}

import { appConstant, QuickLinkClicksEntity, QuickLinkEntity } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class FrontService {
    constructor(
        @InjectRepository(QuickLinkClicksEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaQuickLinkClicksRepository: Repository<QuickLinkClicksEntity>,
        @InjectRepository(QuickLinkEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaQuickLinkRepository: Repository<QuickLinkEntity>,
    ) {}
    async quickLinkClicksExists(condition: any) {
        return this.readReplicaQuickLinkClicksRepository.exist({
            where: condition
        });
    }
    async quickLinkOne(fields: any[] = [],condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaQuickLinkRepository.findOne({
            where: condition,
            select: fields,
            order: orderBy,
        });
    }
}

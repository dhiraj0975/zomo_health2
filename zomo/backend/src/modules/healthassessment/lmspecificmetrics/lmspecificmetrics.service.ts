import { appConstant, lmspecificmetricsEntity } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class LmspecificmetricsService {
    constructor(
        @InjectRepository(lmspecificmetricsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicalmspecificmetricsRepository: Repository<lmspecificmetricsEntity>,
    ) {}
    async findOne(condition: any) {
        return await this.readReplicalmspecificmetricsRepository.findOne({
            where: condition,
        });
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicalmspecificmetricsRepository.find({
            where: condition,
            select: [],
            order: orderBy,
        });
    }
}

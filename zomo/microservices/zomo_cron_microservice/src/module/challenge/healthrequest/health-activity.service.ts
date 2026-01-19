import {
    appConstant,
    CommonArrayService,
    CommonFileService,
    HealthActivityEntity,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class HealthActivityService {
    constructor(
        @InjectRepository(
            HealthActivityEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaHealthActivityRepository: Repository<HealthActivityEntity>,
        @InjectRepository(HealthActivityEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaHealthActivityRepository: Repository<HealthActivityEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {}
    async listRecord(
        fields: any[] = [],
        condition: any,
        orderBy: any = null,
    ): Promise<HealthActivityEntity[]> {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaHealthActivityRepository.find({
            select: fields,
            where: condition,
            order: orderBy,
        });
    }
}

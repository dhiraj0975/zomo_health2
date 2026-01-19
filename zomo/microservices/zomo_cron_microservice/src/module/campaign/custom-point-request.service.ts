import { appConstant, CustomPointRequestEntity } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class CustomPointRequestService {
    constructor(
        @InjectRepository(
            CustomPointRequestEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaCustomPointRequestRepository: Repository<CustomPointRequestEntity>,
        @InjectRepository(
            CustomPointRequestEntity,
            appConstant.MAIN.toLowerCase(),
        )
        private readonly writeReplicaCustomPointRequestRepository: Repository<CustomPointRequestEntity>,
    ) {}

    async findOne(condition: any, fields: any = [], orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaCustomPointRequestRepository.findOne({
            where: condition,
            select: fields,
            order: orderBy,
        });
    }

    async update(condition: any, data: any) {
        return await this.writeReplicaCustomPointRequestRepository
            .createQueryBuilder('custompointrequest')
            .update(CustomPointRequestEntity)
            .set(data)
            .where(condition)
            .execute();
    }
}

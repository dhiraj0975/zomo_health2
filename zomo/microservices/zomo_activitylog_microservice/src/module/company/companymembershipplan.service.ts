import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MembershipPlanEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class MembershipPlanService {
    constructor(
        @InjectRepository(MembershipPlanEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaMembershipPlanRepository: Repository<MembershipPlanEntity>,
        @InjectRepository(MembershipPlanEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaMembershipPlanRepository: Repository<MembershipPlanEntity>,
    ) {}
    async create(data: any) {
        const savedResult = this.writeReplicaMembershipPlanRepository.create(data);
        return await this.writeReplicaMembershipPlanRepository.save(savedResult);
    }
}

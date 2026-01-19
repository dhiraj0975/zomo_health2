import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CompanySideMenuEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class CompanySideMenuService {
    constructor(
        @InjectRepository(CompanySideMenuEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaCompanySideMenuRepository: Repository<CompanySideMenuEntity>,
        @InjectRepository(CompanySideMenuEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaCompanySideMenuRepository: Repository<CompanySideMenuEntity>,
    ) {}
    async create(data: any) {
        const savedResult = this.writeReplicaCompanySideMenuRepository.create(data);
        return await this.writeReplicaCompanySideMenuRepository.save(savedResult);
    }
}

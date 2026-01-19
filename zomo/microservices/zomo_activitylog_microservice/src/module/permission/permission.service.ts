import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PermissionEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class PermissionService {
    constructor(
        @InjectRepository(PermissionEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaPermissionRepository: Repository<PermissionEntity>,
        @InjectRepository(PermissionEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaPermissionRepository: Repository<PermissionEntity>,
    ) {}
    async create(data: any) {
        const savedResult = this.writeReplicaPermissionRepository.create(data);
        return await this.writeReplicaPermissionRepository.save(savedResult);
    }
}

import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CompanyDepartmentLocationEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class CompanyDepartmentLocationService {
    constructor(
        @InjectRepository(CompanyDepartmentLocationEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaCompanyDepartmentLocationRepository: Repository<CompanyDepartmentLocationEntity>,
        @InjectRepository(CompanyDepartmentLocationEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaCompanyDepartmentLocationRepository: Repository<CompanyDepartmentLocationEntity>,
    ) {}
    async create(data: any) {
        const savedResult =
            this.writeReplicaCompanyDepartmentLocationRepository.create(data);
        return await this.writeReplicaCompanyDepartmentLocationRepository.save(savedResult);
    }
}

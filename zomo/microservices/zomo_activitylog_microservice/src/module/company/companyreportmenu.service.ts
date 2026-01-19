import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CompanyReportMenuEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class CompanyReportMenuService {
    constructor(
        @InjectRepository(CompanyReportMenuEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaCompanyReportMenuRepository: Repository<CompanyReportMenuEntity>,
        @InjectRepository(CompanyReportMenuEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaCompanyReportMenuRepository: Repository<CompanyReportMenuEntity>,
    ) {}
    async create(data: any) {
        const savedResult = this.writeReplicaCompanyReportMenuRepository.create(data);
        return await this.writeReplicaCompanyReportMenuRepository.save(savedResult);
    }
}

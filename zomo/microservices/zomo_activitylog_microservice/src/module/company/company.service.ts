import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CompanyEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class CompanyService {
    constructor(
        @InjectRepository(CompanyEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaCompanyRepository: Repository<CompanyEntity>,
        @InjectRepository(CompanyEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaCompanyRepository: Repository<CompanyEntity>,
    ) {}
    async create(data: any) {
        const savedResult = this.writeReplicaCompanyRepository.create(data);
        return await this.writeReplicaCompanyRepository.save(savedResult);
    }
}

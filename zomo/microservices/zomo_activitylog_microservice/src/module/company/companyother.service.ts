import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CompanyOtherEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class CompanyOtherService {
    constructor(
        @InjectRepository(CompanyOtherEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaCompanyOtherRepository: Repository<CompanyOtherEntity>,
        @InjectRepository(CompanyOtherEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaCompanyOtherRepository: Repository<CompanyOtherEntity>,
    ) {}
    async create(data: any) {
        const savedResult = this.writeReplicaCompanyOtherRepository.create(data);
        return await this.writeReplicaCompanyOtherRepository.save(savedResult);
    }
}

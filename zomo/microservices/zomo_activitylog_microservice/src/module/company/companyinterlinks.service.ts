import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CompanyInterlinksEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class CompanyInterlinksService {
    constructor(
        @InjectRepository(CompanyInterlinksEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaCompanyInterlinksRepository: Repository<CompanyInterlinksEntity>,
        @InjectRepository(CompanyInterlinksEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaCompanyInterlinksRepository: Repository<CompanyInterlinksEntity>,
    ) {}
    async create(data: any) {
        const savedResult = this.writeReplicaCompanyInterlinksRepository.create(data);
        return await this.writeReplicaCompanyInterlinksRepository.save(savedResult);
    }
}

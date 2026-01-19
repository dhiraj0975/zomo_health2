import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CompanyCEMInfoEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class CompanyCEMInfoService {
    constructor(
        @InjectRepository(CompanyCEMInfoEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaCompanyOtherRepository: Repository<CompanyCEMInfoEntity>,
        @InjectRepository(CompanyCEMInfoEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaCompanyOtherRepository: Repository<CompanyCEMInfoEntity>,
    ) {}
    async create(data: any) {
        const savedResult = this.writeReplicaCompanyOtherRepository.create(data);
        return await this.writeReplicaCompanyOtherRepository.save(savedResult);
    }
}

import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LanguageEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class LanguageService {
    constructor(
        @InjectRepository(LanguageEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaLanguageRepository: Repository<LanguageEntity>,
        @InjectRepository(LanguageEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaLanguageRepository: Repository<LanguageEntity>,
    ) {}
    async create(data: any) {
        const savedResult = this.writeReplicaLanguageRepository.create(data);
        return await this.writeReplicaLanguageRepository.save(savedResult);
    }
}

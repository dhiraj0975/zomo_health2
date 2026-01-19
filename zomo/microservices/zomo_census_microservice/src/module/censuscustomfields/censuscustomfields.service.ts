import {
    appConstant,
    CommonArrayService,
    CommonFileService,
    CensusCustomFieldsEntity,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class CensusCustomFieldsService {
    constructor(
        @InjectRepository(
            CensusCustomFieldsEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaCensusCustomFieldsRepository: Repository<CensusCustomFieldsEntity>,
        @InjectRepository(
            CensusCustomFieldsEntity,
            appConstant.MAIN.toLowerCase(),
        )
        private readonly writeReplicaCensusCustomFieldsRepository: Repository<CensusCustomFieldsEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {}
    async listRecord(fields: any, condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaCensusCustomFieldsRepository.find({
            select: fields,
            where: condition,
            order: orderBy,
        });
    }
}

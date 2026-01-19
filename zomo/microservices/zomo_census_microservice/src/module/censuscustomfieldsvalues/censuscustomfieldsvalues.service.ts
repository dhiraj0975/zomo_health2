import {
    appConstant,
    CommonFileService,
    CensusCustomFieldsValuesEntity,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class CensusCustomFieldsValuesService {
    constructor(
        @InjectRepository(
            CensusCustomFieldsValuesEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaCensusCustomFieldsValuesRepository: Repository<CensusCustomFieldsValuesEntity>,
        @InjectRepository(
            CensusCustomFieldsValuesEntity,
            appConstant.MAIN.toLowerCase(),
        )
        private readonly writeReplicaCensusCustomFieldsValuesRepository: Repository<CensusCustomFieldsValuesEntity>,
        private readonly commonFileService: CommonFileService,
    ) {}
    async listRecord(fields: any, condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaCensusCustomFieldsValuesRepository.find({
            select: fields,
            where: condition,
            order: orderBy,
        });
    }
    /*async save(data: any) {
        const savedResult = this.writeReplicaCensusCustomFieldsValuesRepository.create(data);
        return await this.writeReplicaCensusCustomFieldsValuesRepository.save(savedResult);
    }*/
    async save(data: any | any[]) {
        const entities =
            this.writeReplicaCensusCustomFieldsValuesRepository.create(data);
        return await this.writeReplicaCensusCustomFieldsValuesRepository.save(
            entities,
        );
    }
}

import {
    appConstant,
    CommonFileService,
    ImportUserRequestEntity,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class ImportUserRequestService {
    constructor(
        @InjectRepository(
            ImportUserRequestEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaImportUserRequestRepository: Repository<ImportUserRequestEntity>,
        @InjectRepository(
            ImportUserRequestEntity,
            appConstant.MAIN.toLowerCase(),
        )
        private readonly writeReplicaImportUserRequestRepository: Repository<ImportUserRequestEntity>,
        private readonly commonFileService: CommonFileService,
    ) {}

    async save(data: any) {
        const savedResult =
            this.writeReplicaImportUserRequestRepository.create(data);
        return await this.writeReplicaImportUserRequestRepository.save(
            savedResult,
        );
    }
    async delete(condition: any) {
        await this.writeReplicaImportUserRequestRepository.delete(condition);
    }
    async findOne(condition: any, orderBy = null, fields: any[] = []) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaImportUserRequestRepository.findOne({
            where: condition,
            select: fields,
            order: orderBy,
        });
    }
    async listRecord(condition: any, orderBy = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaImportUserRequestRepository.find({
            where: condition,
            order: orderBy,
        });
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(
            data,
            this.writeReplicaImportUserRequestRepository.metadata,
        );
        return await this.writeReplicaImportUserRequestRepository
            .createQueryBuilder('importUser')
            .update(ImportUserRequestEntity)
            .set(data)
            .where(condition)
            .execute();
    }
}

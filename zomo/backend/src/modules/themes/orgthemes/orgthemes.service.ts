import { appConstant, CommonFileService, OrgThemesEntity } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class OrgThemesService {
    constructor(
        @InjectRepository(OrgThemesEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaOrgThemesRepository: Repository<OrgThemesEntity>,
        @InjectRepository(OrgThemesEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaOrgThemesRepository: Repository<OrgThemesEntity>,
        private readonly commonFileService: CommonFileService,
    ) {}
    async findOne(condition: any) {
        return await this.readReplicaOrgThemesRepository.findOne({
            where: condition,
        });
    }
    async save(data: any) {
        const savedResult = this.writeReplicaOrgThemesRepository.create(data);
        return await this.writeReplicaOrgThemesRepository.insert(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaOrgThemesRepository.metadata);
        return await this.writeReplicaOrgThemesRepository.createQueryBuilder('themes')
            .update(OrgThemesEntity)
            .set(data)
            .where(condition)
            .execute();
    }
}

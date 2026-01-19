import { appConstant, CommonArrayService, CommonFileService, CompanyNumberOfLiveReportsEntity } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { FindOptionsWhere, InsertResult, Repository } from "typeorm";
@Injectable()
export class CompanyNumberOfLiveReportsService {
    constructor(
        @InjectRepository(CompanyNumberOfLiveReportsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicacompanyNumberOfLiveReportsRepository: Repository<CompanyNumberOfLiveReportsEntity>,
        @InjectRepository(CompanyNumberOfLiveReportsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicacompanyNumberOfLiveReportsRepository: Repository<CompanyNumberOfLiveReportsEntity>,
    ) { }
    async findOne(condition: FindOptionsWhere<CompanyNumberOfLiveReportsEntity>, select: any[] = []): Promise<CompanyNumberOfLiveReportsEntity | null> {
        return await this.readReplicacompanyNumberOfLiveReportsRepository.findOne({
            where: condition,
            select: select
        });
    }
    async listRecord(condition: FindOptionsWhere<CompanyNumberOfLiveReportsEntity>, orderBy: object = null): Promise<CompanyNumberOfLiveReportsEntity[]> {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicacompanyNumberOfLiveReportsRepository.find({
            where: condition,
            select: [],
            order: orderBy,
        });
    }
    async save(data: Partial<CompanyNumberOfLiveReportsEntity>): Promise<CompanyNumberOfLiveReportsEntity> {
        const savedResult = this.writeReplicacompanyNumberOfLiveReportsRepository.create(data);
        return await this.writeReplicacompanyNumberOfLiveReportsRepository.save(savedResult);
    }
}
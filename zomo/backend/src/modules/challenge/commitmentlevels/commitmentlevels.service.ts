import { appConstant, CommitmentLevelsEntity, CommonFileService } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class CommitmentLevelsService {
    constructor(
        @InjectRepository(CommitmentLevelsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaCommitmentLevelsRepository: Repository<CommitmentLevelsEntity>,
        @InjectRepository(CommitmentLevelsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaCommitmentLevelsRepository: Repository<CommitmentLevelsEntity>,
        private readonly commonFileService: CommonFileService,
    ) {}
    async save(data: any) {
        const savedResult = this.writeReplicaCommitmentLevelsRepository.create(data);
        return await this.writeReplicaCommitmentLevelsRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaCommitmentLevelsRepository.metadata);
        return await this.writeReplicaCommitmentLevelsRepository.createQueryBuilder('aod')
            .update(CommitmentLevelsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaCommitmentLevelsRepository.delete(condition);
    }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaCommitmentLevelsRepository.findOne({
            where: condition,
            order: orderBy,
        });
    }
    async listRecord(condition: any, field:any = ['id','level_value','level_type'], orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaCommitmentLevelsRepository.find({
            where: condition,
            select: field,
            order: orderBy,
        });
    }
}

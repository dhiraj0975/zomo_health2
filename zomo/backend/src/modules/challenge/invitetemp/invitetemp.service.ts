import { appConstant, CommonFileService, InviteTempEntity } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class InviteTempService {
    constructor(
        @InjectRepository(InviteTempEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaInviteTempRepository: Repository<InviteTempEntity>,
        @InjectRepository(InviteTempEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaInviteTempRepository: Repository<InviteTempEntity>,
        private readonly commonFileService: CommonFileService,
    ) {}
    async save(data: any) {
        const savedResult = this.writeReplicaInviteTempRepository.create(data);
        return await this.writeReplicaInviteTempRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaInviteTempRepository.metadata);
        return await this.writeReplicaInviteTempRepository.createQueryBuilder('it')
            .update(InviteTempEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaInviteTempRepository.delete(condition);
    }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaInviteTempRepository.findOne({
            where: condition,
            order: orderBy,
        });
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaInviteTempRepository.find({
            where: condition,
            order: orderBy,
        });
    }
}

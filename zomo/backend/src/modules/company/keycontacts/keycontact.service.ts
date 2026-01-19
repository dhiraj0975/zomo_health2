import { appConstant, CommonFileService, KeyContactsEntity } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from "typeorm";
@Injectable()
export class KeyContactService {
    constructor(
      @InjectRepository(KeyContactsEntity, appConstant.READ_REPLICA.toLowerCase())
      private readonly readReplicaKeyContactsRepository: Repository<KeyContactsEntity>,
      @InjectRepository(KeyContactsEntity, appConstant.MAIN.toLowerCase())
      private readonly writeReplicaKeyContactsRepository: Repository<KeyContactsEntity>,
        private readonly commonFileService: CommonFileService,
    ) {
    }
    async findOne(condition: any) {
        return await this.readReplicaKeyContactsRepository.findOne({
            where: condition,
        });
    }
    async save(data: any) {
        const savedResult = this.writeReplicaKeyContactsRepository.create(data);
        return await this.writeReplicaKeyContactsRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaKeyContactsRepository.metadata);
        return await this.writeReplicaKeyContactsRepository.createQueryBuilder('role')
            .update(KeyContactsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaKeyContactsRepository.find({
            where: condition,
            select: [],
            order: orderBy,
        });
    }
}

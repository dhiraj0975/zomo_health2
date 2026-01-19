import { appConstant, CommonFileService, ZipDownloadsEntity } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class ZipDownloadsService {
    constructor(
        @InjectRepository(ZipDownloadsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaZipDownloadsRepository: Repository<ZipDownloadsEntity>,
        @InjectRepository(ZipDownloadsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaZipDownloadsRepository: Repository<ZipDownloadsEntity>,
        private readonly commonFileService: CommonFileService,
    ) {}
    async save(data: any) {
        const savedResult = this.writeReplicaZipDownloadsRepository.create(data);
        return await this.writeReplicaZipDownloadsRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaZipDownloadsRepository.metadata);
        return await this.writeReplicaZipDownloadsRepository.createQueryBuilder('zd')
            .update(ZipDownloadsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaZipDownloadsRepository.delete(condition);
    }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaZipDownloadsRepository.findOne({
            where: condition,
            order: orderBy,
        });
    }
}

import { appConstant, CensusFrequencyEntity, CommonFileService } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
@Injectable()
export class CensusFrequencyService {
    constructor(
        @InjectRepository(CensusFrequencyEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaCensusFrequencyRepository: Repository<CensusFrequencyEntity>,
        @InjectRepository(CensusFrequencyEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaCensusFrequencyRepository: Repository<CensusFrequencyEntity>,
        private readonly commonFileService: CommonFileService,
    ) {}
    async save(data: any) {
        const savedResult = this.writeReplicaCensusFrequencyRepository.create(data);
        return await this.writeReplicaCensusFrequencyRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaCensusFrequencyRepository.metadata);
        return await this.writeReplicaCensusFrequencyRepository.createQueryBuilder('cf')
            .update(CensusFrequencyEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaCensusFrequencyRepository.delete(condition);
    }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaCensusFrequencyRepository.findOne({
            where: condition,
            order: orderBy,
        });
    }
    async listRecord(fields: any, condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaCensusFrequencyRepository.find({
            select: fields,
            where: condition,
            order: orderBy,
        });
    }
}

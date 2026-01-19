import { appConstant, cCompanySupport, CommonFileService } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
@Injectable()
export class CCompanySupportService {
    constructor(
        @InjectRepository(cCompanySupport, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicacCompanySupportRepository: Repository<cCompanySupport>,
        @InjectRepository(cCompanySupport, appConstant.MAIN.toLowerCase())
        private readonly writeReplicacCompanySupportRepository: Repository<cCompanySupport>,
        private readonly commonFileService: CommonFileService,
    ) {}
    async save(data: any) {
        const savedResult = this.writeReplicacCompanySupportRepository.create(data);
        return await this.writeReplicacCompanySupportRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicacCompanySupportRepository.metadata);
        return await this.writeReplicacCompanySupportRepository.createQueryBuilder('ccs')
            .update(this.writeReplicacCompanySupportRepository)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicacCompanySupportRepository.delete(condition);
    }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicacCompanySupportRepository.findOne({
            where: condition,
            order: orderBy,
        });
    }
    async listRecord(fields: any, condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicacCompanySupportRepository.find({
            select: fields,
            where: condition,
            order: orderBy,
        });
    }
}

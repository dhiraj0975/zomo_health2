import {
    appConstant,
    BaseService,
    BiometricReportsEntity,
    CommonArrayService,
} from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
@Injectable()
export class BiometricReportsService extends BaseService<BiometricReportsEntity> {
    constructor(
        @InjectRepository(BiometricReportsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaBirBiometricReportsRepository: Repository<BiometricReportsEntity>,
        @InjectRepository(BiometricReportsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaBirBiometricReportsRepository: Repository<BiometricReportsEntity>,
        commonArrayService: CommonArrayService,
    ) {
        super(readReplicaBirBiometricReportsRepository, writeReplicaBirBiometricReportsRepository,'birBiometricReports',commonArrayService);
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'ASC' };
        }
        const queryBuilder = this.readReplicaBirBiometricReportsRepository
            .createQueryBuilder()
            .where(condition)
            .orderBy(orderBy);
        const result = await queryBuilder.getMany();
        return result;
    }

    async updateReport() {
        const result = await this.readReplicaBirBiometricReportsRepository
            .createQueryBuilder('birBiometricReports')
            .select('id')
            .where('created_date < NOW() - INTERVAL 2 HOUR')
            .andWhere('status = 2')
            .andWhere('total_download < 4')
            .limit(1)
            .getRawOne();
        if (!result) {
            return;
        }
        const idToUpdate = result.id;
        const mainQuery = this.writeReplicaBirBiometricReportsRepository
            .createQueryBuilder()
            .update()
            .set({
                total_download: () => 'total_download + 1',
                status: 0,
            })
            .where('id = :id', { id: idToUpdate });
        await mainQuery.execute();
    }

    async save(data: any) {
        const savedResult = this.writeReplicaBirBiometricReportsRepository.create(data);
        return await this.writeReplicaBirBiometricReportsRepository.save(savedResult);
    }
}
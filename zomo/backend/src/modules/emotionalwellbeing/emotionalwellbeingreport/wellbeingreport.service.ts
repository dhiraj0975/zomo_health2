import { appConstant, emotionalwellbeingReportsEntity, tableConstant } from "@common-constants";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
@Injectable()
export class WellbeingReportService {
    constructor(
        @InjectRepository(emotionalwellbeingReportsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaWellbeingReportRepository: Repository<emotionalwellbeingReportsEntity>,
        @InjectRepository(emotionalwellbeingReportsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaWellbeingReportRepository: Repository<emotionalwellbeingReportsEntity>,
    ) {
    }
    async updateReport() {
        await this.writeReplicaWellbeingReportRepository.createQueryBuilder('wellbeingReport')
            .update()
            .set({
                total_download: () => 'CAST(total_download AS UNSIGNED) + 1', // Correctly increment `total_download`
                status: 0, // Set `status` to 0
            })
            .where('created_date < NOW() - INTERVAL 2 HOUR') // Condition for `created_date`
            .andWhere('status = 2') // Condition for `status`
            .andWhere('total_download < 4') // Condition for `total_download`
            .limit(1) // Limit to 1 record
            .execute();
    }
    async findOne(condition: any) {
        return await this.readReplicaWellbeingReportRepository.createQueryBuilder('wellbeingReport')
        .leftJoinAndMapOne(
            'wellbeingReport.company',
            tableConstant.COMPANIES.TBL_COMPANY,
            'company',
            `company.id = wellbeingReport.org_id`,
          )
        .where(condition)
        .limit(1)
        .orderBy('wellbeingReport.request_date','ASC')
        .getOne();
    }
    async update(data){
        const savedResult = this.writeReplicaWellbeingReportRepository.create(data);
        return await this.writeReplicaWellbeingReportRepository.save(savedResult);
    }
}
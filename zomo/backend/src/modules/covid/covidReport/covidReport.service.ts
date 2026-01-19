import { appConstant, CovidReportEntity, tableConstant } from "@common-constants";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
@Injectable()
export class CovidReport {
    constructor(
        @InjectRepository(CovidReportEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicacovidReportRepository: Repository<CovidReportEntity>,
        @InjectRepository(CovidReportEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicacovidReportRepository: Repository<CovidReportEntity>,
    ) {
    }
    async updateReport() {
        await this.writeReplicacovidReportRepository.createQueryBuilder('covidReport')
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
        return await this.readReplicacovidReportRepository.createQueryBuilder('covidReport')
        .leftJoinAndMapOne(
            'covidReport.company',
            tableConstant.COMPANIES.TBL_COMPANY,
            'company',
            `company.id = covidReport.org_id`,
          )
        .where(condition)
        .limit(1)
        .orderBy('covidReport.request_date','ASC')
        .getOne();
    }
    async update(data){
        const savedResult = this.writeReplicacovidReportRepository.create(data);
        return await this.writeReplicacovidReportRepository.save(savedResult);
    }
}
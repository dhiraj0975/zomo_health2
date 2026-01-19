import { appConstant, MediaFitnessVideosReportEntity, tableConstant } from "@common-constants";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
@Injectable()
export class MediaFitnessVideoReportService {
    constructor(
        @InjectRepository(MediaFitnessVideosReportEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaFodReportRepository: Repository<MediaFitnessVideosReportEntity>,
        @InjectRepository(MediaFitnessVideosReportEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaFodReportRepository: Repository<MediaFitnessVideosReportEntity>,
    ) {
    }
    async updateReport() {
        await this.writeReplicaFodReportRepository.createQueryBuilder('fodReport')
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
        return await this.readReplicaFodReportRepository.createQueryBuilder('fodReport')
        .leftJoinAndMapOne(
            'fodReport.company',
            tableConstant.COMPANIES.TBL_COMPANY,
            'company',
            `company.id = fodReport.org_id`,
          )
        .where(condition)
        .limit(1)
        .orderBy('fodReport.request_date','ASC')
        .getOne();
    }
    async update(data){
        const savedResult = this.writeReplicaFodReportRepository.create(data);
        return await this.writeReplicaFodReportRepository.save(savedResult);
    }
    async save(data: any) {
        const savedResult = this.writeReplicaFodReportRepository.create(data);
        return await this.writeReplicaFodReportRepository.save(savedResult);
    }
}
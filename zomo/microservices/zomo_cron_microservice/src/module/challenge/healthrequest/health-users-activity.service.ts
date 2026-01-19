import {
    appConstant,
    CommonArrayService,
    CommonFileService,
    HealthRequestEntity,
    HealthUsersActivityEntity,
    HealthActivityEntity,
    tableConstant,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class HealthUsersActivityService {
    constructor(
        @InjectRepository(
            HealthUsersActivityEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaHealthUsersActivityRepository: Repository<HealthUsersActivityEntity>,
        @InjectRepository(
            HealthUsersActivityEntity,
            appConstant.MAIN.toLowerCase(),
        )
        private readonly writeReplicaHealthUsersActivityRepository: Repository<HealthUsersActivityEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {}
    async save(data: any) {
        const savedResult =
            this.writeReplicaHealthUsersActivityRepository.create(data);
        return await this.writeReplicaHealthUsersActivityRepository.save(
            savedResult,
        );
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(
            data,
            this.writeReplicaHealthUsersActivityRepository.metadata,
        );
        return await this.writeReplicaHealthUsersActivityRepository
            .createQueryBuilder('hua')
            .update(HealthUsersActivityEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async getUserActivitySummary(
        orgId: number,
        scheduleId: number,
        userIds: number[],
    ): Promise<
        {
            user_id: number;
            act_id: number;
            act_date: string;
            total: string;
        }[]
    > {
        if (!userIds || userIds.length === 0) return [];

        const userIdsStr = userIds.join(',');

        return await this.readReplicaHealthUsersActivityRepository
            .createQueryBuilder('Challengehealthuseractivities')
            .innerJoin(
                HealthActivityEntity,
                'activity',
                'Challengehealthuseractivities.act_id = activity.id AND activity.status = 1',
            )
            .select([
                'Challengehealthuseractivities.user_id AS user_id',
                'Challengehealthuseractivities.act_id AS act_id',
                'SUM(Challengehealthuseractivities.miles) AS total',
                'DATE_FORMAT(Challengehealthuseractivities.act_date, "%Y-%m-%d") AS act_date',
            ])
            .where('Challengehealthuseractivities.org_id = :orgId', { orgId })
            .andWhere(`Challengehealthuseractivities.user_id IN (${userIdsStr})`)
            .andWhere('Challengehealthuseractivities.status = 1')
            .groupBy(
                'Challengehealthuseractivities.user_id, Challengehealthuseractivities.act_id, act_date',
            )
            .getRawMany();
    }
}

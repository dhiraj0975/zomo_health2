import {
    appConstant,
    BaseService,
    CommonArrayService,
    ScheduleChallengeJoinUsersEntity,
    tableConstant,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class ScheduleChallengeJoinUsersService extends BaseService<ScheduleChallengeJoinUsersEntity> {
    constructor(
        @InjectRepository(
            ScheduleChallengeJoinUsersEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaScheduleChallengeJoinUsersRepository: Repository<ScheduleChallengeJoinUsersEntity>,
        @InjectRepository(
            ScheduleChallengeJoinUsersEntity,
            appConstant.MAIN.toLowerCase(),
        )
        private readonly writeReplicaScheduleChallengeJoinUsersRepository: Repository<ScheduleChallengeJoinUsersEntity>,
        commonArrayService: CommonArrayService,
    ) {
        super(
            readReplicaScheduleChallengeJoinUsersRepository,
            writeReplicaScheduleChallengeJoinUsersRepository,
            'scheduleChallengeJoinUsers',
            commonArrayService,
        );
    }
    async joinUserListRecord(
        condition: any,
        orderBy: object = null,
        fields: string[] = [],
        table: string[] = []
    ) {
        if (!orderBy) {
            orderBy = { 'scj.id': 'DESC' };
        }
        let queryResult: any = this.readReplicaScheduleChallengeJoinUsersRepository.createQueryBuilder('scj')
            .innerJoinAndMapOne(
                'scj.user',
                tableConstant.TBL_USERS,
                'User',
                `User.id = scj.user_id`,
            )
            .leftJoinAndMapOne(
                'User.company',
                tableConstant.COMPANIES.TBL_COMPANY,
                'company',
                `company.id = User.org_id AND company.status = 1`,
            )
            .leftJoinAndMapOne(
                'User.department',
                tableConstant.COMPANIES.TBL_DEPARTMENT,
                'department',
                `department.id = User.department_id`,
            )
            .leftJoinAndMapOne(
                'User.Location',
                tableConstant.COMPANIES.TBL_LOCATION,
                'Location',
                `Location.id = User.location`,
            );
        if (table && table.includes(tableConstant.CHALLENGE.TBL_CH_TEAM_MEMBERS)) {
            queryResult = queryResult.leftJoinAndMapOne(
                    'scj.teamMember',
                    tableConstant.CHALLENGE.TBL_CH_TEAM_MEMBERS,
                    'teamMember',
                    `teamMember.user_id = scj.user_id AND teamMember.status = 1`,
                )
                .innerJoinAndMapOne(
                    'teamMember.team',
                    tableConstant.CHALLENGE.TBL_CH_TEAMS,
                    'team',
                    `teamMember.team_id = team.id AND team.status = 1`,
                );
        }
        queryResult = await queryResult.where(condition)
            .select(fields)
            .orderBy(
                `${Object.keys(orderBy)[0]}`,
                orderBy[Object.keys(orderBy)[0]],
            )
            .getMany();
        return queryResult;
    }
}

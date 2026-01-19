import {
    appConstant,
    tableConstant,
    TeamsEntity
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class TeamsService {
    constructor(
        @InjectRepository(TeamsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaTeamsRepository: Repository<TeamsEntity>,
        @InjectRepository(TeamsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaTeamsRepository: Repository<TeamsEntity>,
    ) {}
    async findOne(condition: any, orderBy: any = null, fields: any = ['team']) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaTeamsRepository
            .createQueryBuilder('team')
            .where(condition)
            .select(fields)
            .orderBy(
                `team.${Object.keys(orderBy)[0]}`,
                orderBy[Object.keys(orderBy)[0]],
            )
            .getOne();
    }
    async getTeamAllReport(
        condition: any,
        field: string[] = ['team.id', 'team.tname'],
    ) {
        const teamDetails = await this.readReplicaTeamsRepository
            .createQueryBuilder('team')
            .leftJoinAndMapOne(
                'team.teamSchedule',
                tableConstant.CHALLENGE.TBL_CH_TEAM_SCHEDULE,
                'teamSchedule',
                `teamSchedule.team_id = team.id`,
            )
            .leftJoinAndMapOne(
                'team.challengeGroups',
                tableConstant.CHALLENGE.TBL_CH_GROUPS,
                'challengeGroups',
                `challengeGroups.id = team.group_id`,
            )
            .leftJoinAndMapOne(
                'team.scj',
                tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE_JOIN_USERS,
                'scj',
                `teamSchedule.schedule_id = scj.schedule_id`,
            )
            .where(condition)
            .select(field)
            .orderBy('team.id', 'ASC')
            .getMany();
        return teamDetails;
    }
    async list(condition: any, orderBy: any = null, fields: any[] = null, groupBy: any = null, joinTable: any = []) {
        try {
            if (!orderBy) {
                orderBy = { 'team.id': 'DESC' };
            }
            let data = this.readReplicaTeamsRepository.createQueryBuilder('team');
            if (joinTable && joinTable.length > 0) {
                for (let i = 0; i < joinTable.length; i++) {
                    if (joinTable[i].type == 'INNER') {
                        data = data.innerJoinAndMapOne(
                            `${joinTable[i].connect}.${joinTable[i].alias}`,
                            joinTable[i].table,
                            joinTable[i].alias,
                            joinTable[i].on,
                        );
                    } else {
                        data = data.leftJoinAndMapOne(
                            `${joinTable[i].connect}.${joinTable[i].alias}`,
                            joinTable[i].table,
                            joinTable[i].alias,
                            joinTable[i].on,
                        );
                    }
                }
            } 
            data = data
                .select(fields)
                .where(condition)
                .orderBy(
                    `${Object.keys(orderBy)[0]}`,
                    orderBy[Object.keys(orderBy)[0]],
                );
            if (groupBy !== null) {
                data.groupBy(groupBy);
            }
            return await data.getMany();
        } catch (error) {
            throw new Error(error.message);
        }
    }
}

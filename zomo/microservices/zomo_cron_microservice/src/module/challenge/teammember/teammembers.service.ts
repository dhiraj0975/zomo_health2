import { appConstant, BaseService, CommonArrayService, TeamMembersEntity } from "@common-constants";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

@Injectable()
export class TeamMembersService extends BaseService<TeamMembersEntity> {
    constructor(
        @InjectRepository(TeamMembersEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaTeamMembersRepository: Repository<TeamMembersEntity>,
        @InjectRepository(TeamMembersEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaTeamMembersRepository: Repository<TeamMembersEntity>,
        commonArrayService: CommonArrayService,
    ) {
        super(
            readReplicaTeamMembersRepository,
            writeReplicaTeamMembersRepository,
            'teamMember',
            commonArrayService,
        );
    }
    
    async list(condition: any, orderBy: any = null, fields: any[] = null, groupBy: any = null, joinTable: any = []) {
        try {
            if (!orderBy) {
                orderBy = { 'teamMember.id': 'DESC' };
            }
            let data = this.readReplicaTeamMembersRepository.createQueryBuilder('teamMember');
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

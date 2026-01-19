import { appConstant, BaseService, ChallengeExternalLinkEntity, CommonArrayService, CommonFileService } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class ChallengeExternalLinkService extends BaseService<ChallengeExternalLinkEntity> {
    constructor(
        @InjectRepository(ChallengeExternalLinkEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaChallengeExternalLinkRepository: Repository<ChallengeExternalLinkEntity>,
        @InjectRepository(ChallengeExternalLinkEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaChallengeExternalLinkRepository: Repository<ChallengeExternalLinkEntity>,
        commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {
        super(readReplicaChallengeExternalLinkRepository, writeReplicaChallengeExternalLinkRepository, 'elu', commonArrayService );
    }
     async listRecord(condition: any, orderBy: any = null, fields: any[] = null, groupBy: any = null, joinTable: any = []) {
        try {
            if (!orderBy) {
                orderBy = { 'elu.id': 'DESC' };
            }
            let data = this.readReplicaChallengeExternalLinkRepository.createQueryBuilder('elu');
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

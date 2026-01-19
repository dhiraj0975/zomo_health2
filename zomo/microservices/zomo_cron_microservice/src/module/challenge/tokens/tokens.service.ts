import {
    appConstant,
    CommonArrayService,
    CommonFileService,
    tableConstant,
    TokensEntity,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
const moment = require('moment-timezone');
const S3_URL = process.env.S3_URL_PROD;
@Injectable()
export class TokensService {
    constructor(
        @InjectRepository(TokensEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaTokensRepository: Repository<TokensEntity>,
        @InjectRepository(TokensEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaTokensRepository: Repository<TokensEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {}
    async list(
        condition: any,
        orderBy: any = null,
        fields: any[] = null,
        groupBy: any = null,
        joinTable: any[] = [],
        parameters: any = {},
    ) {
        try {
            if (!orderBy) {
                orderBy = { 'token.id': 'DESC' };
            }

            // Assuming you have a TypeORM repo named readReplicaTokenRepository (similar to user repo)
            let data =
                this.readReplicaTokensRepository.createQueryBuilder('token');

            // Add joins dynamically based on joinTable array
            if (joinTable && joinTable.length > 0) {
                for (const join of joinTable) {
                    if (join.type === 'INNER') {
                        data = data.innerJoinAndMapOne(
                            `${join.connect}.${join.alias}`,
                            join.table,
                            join.alias,
                            join.on,
                        );
                    } else {
                        data = data.leftJoinAndMapOne(
                            `${join.connect}.${join.alias}`,
                            join.table,
                            join.alias,
                            join.on,
                        );
                    }
                }
            } else {
                // Default joins for tokens if needed
                data = data
                    .leftJoinAndMapOne(
                        'token.fromUser',
                        tableConstant.TBL_USERS,
                        'fromUser',
                        'fromUser.id = token.user_id',
                    )
                    .leftJoinAndMapOne(
                        'token.toUser',
                        tableConstant.TBL_USERS,
                        'toUser',
                        'toUser.id = token.to_user_id',
                    );
            }

            // Select fields
            if (fields && fields.length > 0) {
                data = data.select(fields);
            } else {
                data = data.select('token'); // default to select all token columns
            }

            // Apply condition
            if (condition) {
                data = data.where(condition);
            }
            if (parameters && Object.keys(parameters).length > 0) {
                data = data.setParameters(parameters);
            }
            // Apply orderBy
            data = data.orderBy(
                `${Object.keys(orderBy)[0]}`,
                orderBy[Object.keys(orderBy)[0]],
            );

            // Apply groupBy if provided
            if (groupBy !== null) {
                data = data.groupBy(groupBy);
            }

            return await data.getMany();
        } catch (error) {
            console.log(error);
            throw new Error(error.message);
        }
    }
}

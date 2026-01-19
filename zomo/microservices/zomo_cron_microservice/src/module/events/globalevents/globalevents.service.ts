import {
    appConstant,
    EventGlobalEventsEntity,
    tableConstant,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class EventGlobalEventsService {
    constructor(
        @InjectRepository(
            EventGlobalEventsEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaEventGlobalEventsRepository: Repository<EventGlobalEventsEntity>,
        @InjectRepository(
            EventGlobalEventsEntity,
            appConstant.MAIN.toLowerCase(),
        )
        private readonly writeReplicaEventGlobalEventsRepository: Repository<EventGlobalEventsEntity>,
    ) {}

    async listRecord(
        fields: any,
        condition: any,
        orderBy: any = null,
        tableData: any[] = [],
    ) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        let queryResult: any =
            await this.readReplicaEventGlobalEventsRepository.createQueryBuilder(
                'ge',
            );
        if (tableData.includes(tableConstant.EVENTS.TBL_EV_EVENTS)) {
            queryResult = queryResult.leftJoinAndMapOne(
                'ge.ev',
                tableConstant.EVENTS.TBL_EV_EVENTS,
                'ev',
                `ge.event_id = ev.id`,
            );
        }
        queryResult = await queryResult
            .select(fields)
            .where(condition)
            .orderBy(
                `ge.${Object.keys(orderBy)[0]}`,
                orderBy[Object.keys(orderBy)[0]],
            )
            .getMany();
        return queryResult;
    }
}

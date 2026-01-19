import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { BaseModuleService } from '../shared/base.service';
import { EntityKeyMap, FieldDataResult } from '../shared/types';
import {
    appConstant,
    EventEntity,
    EventCategoryEntity,
} from '@common-constants';
@Injectable()
export class EventModuleService extends BaseModuleService {
    constructor(
        @InjectRepository(EventEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly eventRepo: Repository<EventEntity>,

        @InjectRepository(
            EventCategoryEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly eventCategoryRepo: Repository<EventCategoryEntity>,
    ) {
        super('EventModuleService');
    }

    async getEventList(companyId?: string): Promise<EntityKeyMap> {
        return this.fetchAndMapEntities(
            this.eventRepo,
            this.buildCompanyWhereCondition(
                { status: Not(2) },
                companyId,
                'organization_id',
            ),
            'id',
            'event_name',
            'getEvents',
        );
    }

    async getEventCategoryList(companyId?: string): Promise<EntityKeyMap> {
        return this.fetchAndMapEntities(
            this.eventCategoryRepo,
            this.buildCompanyWhereCondition({ status: Not(2) }, companyId),
            'id',
            'category_name',
            'getEventCategories',
        );
    }

    async getEventFields(eventId: string): Promise<FieldDataResult> {
        return this.fetchSingleEntityFields(
            this.eventRepo,
            eventId,
            { status: Not(2) },
            {
                event_name: 'event_name',
                event_description: 'event_description',
                event_location: 'event_location',
                event_address: 'event_address',
                event_city: 'event_city',
                event_state: 'event_state',
            },
            'getEventFields',
        );
    }

    async getEventCategoryFields(categoryId: string): Promise<FieldDataResult> {
        return this.fetchSingleEntityFields(
            this.eventCategoryRepo,
            categoryId,
            { status: Not(2) },
            { category_name: 'category_name' },
            'getEventCategoryFields',
        );
    }
}

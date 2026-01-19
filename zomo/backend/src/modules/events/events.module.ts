import {
    appConstant, EventCategoryEntity,
    EventDepartmentsEntity,
    EventEntity,
    EventExternalLinkEntity,
    EventGlobalEventsEntity,
    EventLocationsEntity,
    EventRemindersEntity,
    EventSlotsEntity,
    EventSlotsTimingsEntity,
    EventUserBookingListsEntity,
    RequestEventReportsEntity
} from '@common-constants';
import { Module } from '@nestjs/common';
import { ConfigService } from "@nestjs/config";
import { ClientProxyFactory, Transport } from "@nestjs/microservices";
import { TypeOrmModule } from "@nestjs/typeorm";
import { EventCategoryController } from "./eventcategory/eventcategory.controller";
import { EventCategoryService } from "./eventcategory/eventcategory.service";
import { EventDepartmentsController } from "./eventdepartments/eventdepartments.controller";
import { EventDepartmentsService } from "./eventdepartments/eventdepartments.service";
import { RequestEventReportsController } from "./eventreports/eventreports.controller";
import { RequestEventReportsService } from "./eventreports/eventreports.service";
import { EventController } from "./events/events.controller";
import { EventService } from "./events/events.service";
import { ExternalLinkController } from "./externallinkuser/externallinkuser.controller";
import { EventExternalLinkService } from "./externallinkuser/externallinkuser.service";
import { FrontService } from "./front/front.service";
import { EventGlobalEventsController } from "./globalevents/globalevents.controller";
import { EventGlobalEventsService } from "./globalevents/globalevents.service";
import { EventLocationsController } from "./locations/locations.controller";
import { EventLocationsService } from "./locations/locations.service";
import { EventRemindersController } from "./reminders/reminders.controller";
import { EventRemindersService } from "./reminders/reminders.service";
import { EventSlotsController } from "./slots/slots.controller";
import { EventSlotsService } from "./slots/slots.service";
import { EventSlotsTimingsController } from "./slotstimings/slotstimings.controller";
import { EventSlotsTimingsService } from "./slotstimings/slotstimings.service";
import { EventUserBookingListsController } from "./userbookinglists/userbookinglists.controller";
import { EventUserBookingListsService } from "./userbookinglists/userbookinglists.service";
import { UserEventController } from './userevents/userevents.controller';
@Module({
    imports: [
        TypeOrmModule.forFeature([EventDepartmentsEntity, EventCategoryEntity, EventEntity, EventExternalLinkEntity, EventGlobalEventsEntity, EventLocationsEntity, EventRemindersEntity, RequestEventReportsEntity, EventSlotsEntity, EventSlotsTimingsEntity, EventUserBookingListsEntity], appConstant.READ_REPLICA.toLowerCase()),
        TypeOrmModule.forFeature([EventDepartmentsEntity, EventCategoryEntity, EventEntity, EventExternalLinkEntity, EventGlobalEventsEntity, EventLocationsEntity, EventRemindersEntity, RequestEventReportsEntity, EventSlotsEntity, EventSlotsTimingsEntity, EventUserBookingListsEntity], appConstant.MAIN.toLowerCase()),
    ],
    providers: [EventCategoryService, EventDepartmentsService, EventService, EventExternalLinkService, EventGlobalEventsService, EventLocationsService, EventRemindersService, RequestEventReportsService, EventSlotsService, EventSlotsTimingsService, EventUserBookingListsService, FrontService,
        {
            provide: 'TIMEZONE_SERVICE',
            inject: [ConfigService],
            useFactory: () => {
                return ClientProxyFactory.create({
                    transport: Transport.TCP,
                    options: {
                        host: process.env.TIMEZONES_SERVICE_HOST_PROD,
                        port: Number(process.env.TIMEZONES_SERVICE_PORT_PROD),
                    }
                })
            }
        },
        {
            provide: 'COMMON_SERVICE',
            inject: [ConfigService],
            useFactory: () => {
                return ClientProxyFactory.create({
                    transport: Transport.TCP,
                    options: {
                        host: process.env.COMMON_SERVICE_HOST_PROD ,
                        port: Number(process.env.COMMON_SERVICE_PORT_PROD),
                    }
                })
            }
        },
    ],
    controllers: [
        EventCategoryController, EventDepartmentsController, EventController, ExternalLinkController, EventGlobalEventsController, EventLocationsController, EventRemindersController, RequestEventReportsController, EventSlotsController, EventSlotsTimingsController, EventUserBookingListsController, UserEventController
    ],
    exports: [EventCategoryService, EventDepartmentsService, EventService, EventExternalLinkService, EventGlobalEventsService, EventLocationsService, EventRemindersService, RequestEventReportsService, EventSlotsService, EventSlotsTimingsService, EventUserBookingListsService, FrontService],
})
export class EventsModule {}

import {Expose, Transform, Type} from 'class-transformer';
import { UserDto } from '../user';
import { EventSlotsTimingsDto } from './eventslotstimings.dto';
export class UserBookingListsDto {
    @Expose() id: number;
    @Expose() organization_id: number;
    @Expose() ev_events_id: number;
    @Expose() ev_slots_id: number;
    @Expose() ev_user_id: number;
    @Expose() ev_extension: string;
    @Expose() ev_contact: string;
    @Expose() ev_attend_status: number;
    @Expose() attend_by: number;
    @Expose() attend_date: string;
    @Expose() status: number;
    @Expose() slot_selected: string;
    @Expose() activity_id: number;
    @Expose() reminder_limit: number;
    @Expose() lang_id: number;
    @Expose()
    @Type(() => UserDto)
    @Transform(({ value }) => {
        if (value) {
            return {
                id: value.id,
                code: value.code,
                first_name: value.first_name,
                last_name: value.last_name,
                email: value.email,
                full_name: value.full_name ?? value.first_name + ' ' + value.last_name,
            };
        }
        else {
            return null
        }
    })
    user: UserDto;
    @Expose()
    registration_date: string;
    @Expose()
    created: string;
    @Expose()
    modified: string;
    @Expose()
    @Type(() => EventSlotsTimingsDto)
    @Transform(({ value }) => (value ? value : null), {
        toClassOnly: true,
    })
    slotTiming: EventSlotsTimingsDto;
}

import { Expose, Transform, Type } from 'class-transformer';
import { CompaniesDto } from '../company';
import { EventCategoryDto } from './eventcategory.dto';
import { EventSlotsDto } from './eventslots.dto';
import { GlobalEventsDto } from './globalevents.dto';
import { UserBookingListsDto } from './userbookinglists.dto';
export class EventDto {
    @Expose() id: number;
    @Expose() created_by_user_id: number;
    @Expose() event_name: string;
    @Expose() event_description: string;
    @Expose()
    @Type(() => String)
    @Transform(({ obj }) => {
        if (obj) {
            if (obj.event_timezone) {
                return obj.event_timezone;
            } else {
                return null;
            }
        }
    })
    event_timezone: string;
    @Expose() event_location: string;
    @Expose() status: number;
    @Expose() booking_count: number;
    @Expose() category_id: number;
    @Expose() event_address: string;
    @Expose() event_city: string;
    @Expose() event_state: string;
    @Expose() event_zipcode: string;
    @Expose() booking_price: number;
    @Expose() user_id: string;
    @Expose() user_email: string;
    @Expose() signup_more_time: number;
    @Expose() register_count: number;
    @Expose() organization_id: number;
    @Expose() all_locations: string;
    @Expose() all_departments: string;
    @Expose() sync_locations: number;
    @Expose() sync_departments: number;
    @Expose() activity_id: number;
    @Expose() orderid: number;
    @Expose() subject: string;
    @Expose() message: string;
    @Expose() reminder: string;
    @Expose() reminder_limit: number;
    @Expose() ics_message: string;
    @Expose() eligibility: number;
    @Expose() event_type: number;
    @Expose() external_link: string;
    @Expose() tot_register: number;
    // @Expose() healthplanname: string;
    @Expose()
    @Transform(({ value }) => {
        if(value && value?.length>0){
            if(Array.isArray(value)){
                return value;
            }
            else{
                return JSON.parse(value);
            }
        } 
        else {
            return []
        }
    })
    healthplanname: any;
    @Expose()
    start_date: string;
    @Expose()
    end_date: string;
    @Expose()
    created: string;
    @Expose()
    modified: string;
    @Expose()
    @Type(() => CompaniesDto)
    @Transform(({ value }) => {
        if (value && value?.id) {
            return {
                id: value.id,
                company_name: value.company_name,
            };
        }
        else {
            return null
        }
    })
    company: CompaniesDto;
    @Expose()
    @Type(() => GlobalEventsDto)
    @Transform(({ value }) => {
        if (value && value.length) {
            for(let element of value){
                if(element.company){
                    element['id'] = element['company']['id'];
                    element['company_name'] = element['company']['company_name'];
                    Object.keys(element).forEach((key) => {
                        if (!['id','company_name'].includes(key)) {
                        delete element[key];
                        }
                    });
                }
            }
            return value;
        }
        else {
            return []
        }
    })
    companies: GlobalEventsDto[];
    @Expose()
    @Type(() => EventCategoryDto)
    @Transform(({ value }) => {
        if (value && value?.id) {
            return {
                id: value.id,
                category_name: value.category_name,
            };
        }
        else {
            return null
        }
    })
    category: EventCategoryDto;
    @Expose()
    @Type(() => EventSlotsDto)
    @Transform(({ value }) => (value ? value : null), {
        toClassOnly: true,
    })
    slot: EventSlotsDto;
    @Expose()
    @Type(() => UserBookingListsDto)
    @Transform(({ value }) => {
        if (value && value.length) {
            for(let element of value){
                Object.keys(element).forEach((key) => {
                    if (!['id','ev_events_id','ev_user_id','user','status','slotTiming'].includes(key)) {
                      delete element[key];
                    }
                  });
            }
            return value;
        }
        else {
            return []
        }
    })
    bookings: UserBookingListsDto[];
    @Expose() user_count: number;
}

import {Expose, Transform, Type} from 'class-transformer';
import { LocationsDto } from '../company';
export class EventsLocationsDto {
    @Expose() id: number;
    @Expose() ev_events_id: number;
    @Expose() organization_id: number;
    @Expose() locations_id: number;
    @Expose() display_timeslot: number;
    @Expose() status: number;
    @Expose()
    created: string;
    @Expose()
    modified: string;
    @Expose()
    @Type(() => LocationsDto)
    @Transform(({ value }) => {
        if (value && value.id) {
            return {
                id: value.id,
                location_name: value.location_name,
            };
        }
        else {
            return null
        }
    })
    location: LocationsDto;
}

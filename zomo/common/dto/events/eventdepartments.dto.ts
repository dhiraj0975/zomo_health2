import {Expose, Transform, Type} from 'class-transformer';
import {DepartmentsDto} from "../company";
export class EventDepartmentsDto {
    @Expose() id: number;
    @Expose() ev_events_id: number;
    @Expose() organization_id: number;
    @Expose() departments_id: number;
    @Expose() display_timeslot: number;
    @Expose() status: number;
    @Expose()
    created: string;
    @Expose()
    modified: string;
    @Expose()
    @Type(() => DepartmentsDto)
    department: DepartmentsDto;
}

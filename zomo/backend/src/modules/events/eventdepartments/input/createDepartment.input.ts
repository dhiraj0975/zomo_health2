import { Allow } from 'class-validator';
export class CreateEventDepartmentInput {
    @Allow() id: number;
    @Allow() ev_events_id: number;
    @Allow() organization_id: number;
    @Allow() departments_id: number;
    @Allow() display_timeslot: number;
    @Allow() status: number;
}

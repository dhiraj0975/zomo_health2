import { Allow } from 'class-validator';
export class EditGlobalEventsInput {
    @Allow() id: number;
    @Allow() organization_id: number;
    @Allow() event_id: number;
    @Allow() orderid: number;
    @Allow() status: number;
}

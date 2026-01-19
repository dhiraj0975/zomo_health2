import { Allow } from 'class-validator';
export class CreateHealthActivityInput {
    @Allow() id: number;
    @Allow() name: string;
    @Allow() avalue: number;
    @Allow() atype: number;
    @Allow() amax: number;
    @Allow() frequency: number;
    @Allow() is_track: number;
    @Allow() schedule_id: number;
    @Allow() org_id: number;
    @Allow() status: number;
    @Allow() created_by: number;
}

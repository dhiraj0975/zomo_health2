import { Allow } from 'class-validator';
export class CreateWellBeingTagAssignInput {
    @Allow() id: number;
    @Allow() v_id: number;
    @Allow() t_id: string;
    @Allow() cat_id: number;
    @Allow() status: number;
}

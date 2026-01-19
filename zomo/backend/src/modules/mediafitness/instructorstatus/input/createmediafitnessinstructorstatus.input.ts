import { Allow } from 'class-validator';
export class CreateMediaFitnessInstructorStatusInput {
    @Allow() id: number;
    @Allow() i_id: number;
    @Allow() org_id: number;
    @Allow() status: number;
}

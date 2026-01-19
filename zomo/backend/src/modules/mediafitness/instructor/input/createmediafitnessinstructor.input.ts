import { Allow } from 'class-validator';
export class CreateMediaFitnessInstructorInput {
    @Allow() id: number;
    @Allow() e_id: number;
    @Allow() org_id: number;
    @Allow() first_name: string;
    @Allow() last_name: string;
    @Allow() full_name: string;
    @Allow() status: number;
}

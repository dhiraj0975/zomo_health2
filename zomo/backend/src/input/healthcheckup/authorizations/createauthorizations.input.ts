import { Allow } from 'class-validator';
export class CreateAuthorizationsInput {
    @Allow() user_id: number;
    @Allow() signature: string;
    @Allow() type_of_form: string;
    @Allow() date_completed: string;
    @Allow() activity_id: number;
    @Allow() status: number;
}

import { Allow } from 'class-validator';
export class CreateWeeksUsersInput {
    @Allow() id: number;
}

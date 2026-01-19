import { Allow } from 'class-validator';
export class UpdateWeeksUsersInput {
    @Allow() id: number;
}

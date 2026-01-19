import { Allow } from 'class-validator';
export class UpdateOrgWeeksInput {
    @Allow() id: number;
}

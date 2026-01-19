import { Allow } from 'class-validator';
export class CreateOrgWeeksInput {
    @Allow() id: number;
}

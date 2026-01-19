import { Allow } from 'class-validator';
export class CreateDataManagersInput {
    @Allow() id: number;
    @Allow() org_id: number;
    @Allow() user_id: string;
}

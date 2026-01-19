import { Allow } from 'class-validator';
export class DeleteSettingInput {
    @Allow() id: number;
    @Allow() org_id: number;
}

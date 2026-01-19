import { Allow } from 'class-validator';
export class GetoneSettingInput {
    @Allow() id: number;
    @Allow() org_id: number;
}

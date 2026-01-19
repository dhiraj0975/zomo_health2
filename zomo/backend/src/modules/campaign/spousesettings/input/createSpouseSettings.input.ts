import { Allow } from 'class-validator';
export class CreateSpouseSettingsInput {
    @Allow() id: number;
    @Allow() org_id: number;
    @Allow() hide: number;
    @Allow() status: number;
}

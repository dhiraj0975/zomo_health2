import { Allow } from 'class-validator';
export class GetOneAutoReportInput {
    @Allow() id?: number;
    @Allow() org_id?: number;
    @Allow() role_id?: number;
    @Allow() user_id?: number;
}

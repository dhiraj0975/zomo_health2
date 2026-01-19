import { Allow } from 'class-validator';
export class DeleteHealthCheckupInput {
    @Allow() id: number;
    @Allow() user_id: number;
    @Allow() userid: number;
    @Allow() org_id: number;
    @Allow() zip_filename: string;
}

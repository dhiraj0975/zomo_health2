import { Allow } from 'class-validator';
export class GetOneHealthCheckupInput {
    @Allow() id: number;
    @Allow() user_id: number;
    @Allow() userid: number;
    @Allow() org_id: number;
    @Allow() download_type: number;
    @Allow() type: string;
}

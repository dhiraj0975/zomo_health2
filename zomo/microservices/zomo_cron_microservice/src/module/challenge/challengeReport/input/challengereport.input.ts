import { Allow } from 'class-validator';
export class ChallengeReportInput {
    @Allow() auto_request?: number;
    @Allow() role_id?: number;
    @Allow() schedule_id?: number;
    @Allow() org_id?: number;
    @Allow() challenge_id?: number;
    @Allow() challenge_type?: string;
    @Allow() department_id?: string | string[] | number[];
    @Allow() location_id?: string | string[] | number[];
    @Allow() group_id?: string | string[] | number[];
    @Allow() team_id?: string | string[] | number[];
    @Allow() type?: string;
    @Allow() flag?: number;
    @Allow() search_str?: string;
    @Allow() challengestatus?: number;
    @Allow() result_type?: number;
    @Allow() filter_by?: string;
    @Allow() page?: number;
    @Allow() limit?: number;
    @Allow() userDetails?: any;
    @Allow() auto_request_id?: number;
    @Allow() show_terminated_users?: number;
}

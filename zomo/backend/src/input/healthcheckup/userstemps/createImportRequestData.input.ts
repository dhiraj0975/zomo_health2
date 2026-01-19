import {Allow} from 'class-validator';
export class CreateImportRequestDataInput {
    @Allow() id: number;
    @Allow() org_id: number;  
    @Allow() origional_file: string;
    @Allow() created_file: string;
    @Allow() updated_file: string;
    @Allow() rejected_file: string;
    @Allow() user_notify: number;    
    @Allow() file_error: string;   
    @Allow() created_count: number;
    @Allow() updated_count: number;
    @Allow() rejected_count: number;   
    @Allow() upload_type: number;   
    @Allow() status: number;
    @Allow() count: number;
    @Allow() isApprove: number;
}

import { Allow } from 'class-validator';

export class CreateUserNotificationInput {
    @Allow() id?: number;
    @Allow() org_id: number;
    @Allow() user_id: number;
    @Allow() title: string;
    @Allow() message: string;
    @Allow() type: number; 
    @Allow() module_name: string;
    @Allow() submodule_name?: string;
    @Allow() is_read?: number; 
    @Allow() metadata?: Record<string, any>;
    @Allow() status?: number; 
    @Allow() created_at?: string; 
}

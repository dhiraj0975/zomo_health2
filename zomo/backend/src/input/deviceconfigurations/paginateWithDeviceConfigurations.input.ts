import { Allow } from 'class-validator';
export class PaginateWithDeviceConfigurationsInput {
    @Allow() page: number;
    @Allow() limit: number;
    @Allow() order_by: string;
    @Allow() order: string;
    @Allow() search_str: string;
    @Allow() user_id: number;
    @Allow() device_id: number;
}

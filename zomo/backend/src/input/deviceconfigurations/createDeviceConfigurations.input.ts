import { Allow } from 'class-validator';
export class CreateDeviceConfigurationsInput {
    @Allow() id: number;
    @Allow() device_id: number;
    @Allow() consumer_key: string;
    @Allow() consumer_secret: string;
    @Allow() callback_url: string;
    @Allow() endpoint_url: string;
    @Allow() returnpage_url: string;
    @Allow() status: number;
}

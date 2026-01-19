import { Transform, Type, Expose } from 'class-transformer';
export class DeviceConfigurationsDto {
    @Expose() id: number;
    @Expose() device_id: number;
    @Expose() consumer_key: string;
    @Expose() consumer_secret: string;
    @Expose() callback_url: string;
    @Expose() endpoint_url: string;
    @Expose() returnpage_url: string;
    @Expose() status: number;
    @Expose()
    created: string;
    @Expose()
    @Transform(({ obj }) => (obj.device ?? null ), { toClassOnly: true })
    device: any;
}

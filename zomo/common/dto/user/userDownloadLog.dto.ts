import { Transform, Expose } from 'class-transformer';

export class UserDownloadLogDto {
    @Expose() id: number;
    @Expose() user_id: number;
    @Expose() email: string;
    @Expose()
    @Transform(({ value }) => new Date(value).toISOString(), { toClassOnly: true})
    timestamp: string;

    @Expose()
    @Transform(({ value }) => {
        try {
            return JSON.parse(value);
        } catch (e) {
            return value;
        }
    }, {toClassOnly: true })
    metadata: any;
} 
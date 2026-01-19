import { Allow } from 'class-validator';
export class stockImagesInput {
    @Allow() type: string;
    @Allow() device_type: number = 0;
}

import { Allow } from 'class-validator';
export class CreateBodyFeedsInput {
    @Allow() id: number;
    @Allow() user_id: number;
    @Allow() userName: string;
    @Allow() appId: string;
    @Allow() logType: string;
    @Allow() appName: string;
    @Allow() measurementUnit: string;
    @Allow() age: string;
    @Allow() weight: number;
    @Allow() chest: number;
    @Allow() abdominal: number;
    @Allow() thigh: number;
    @Allow() tricep: number;
    @Allow() subscapular: number;
    @Allow() suprailiac: number;
    @Allow() midaxillary: number;
    @Allow() method: string;
    @Allow() date: string;
    @Allow() status: number;
}

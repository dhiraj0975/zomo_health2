import { Transform, Type, Expose } from 'class-transformer';
export class QuizHotspotQuestionsDto {
    @Expose() id: number;
    @Expose() question_id: number;
    @Expose() image1: string;
    @Expose() image2: string;
    @Expose() image3: string;
    @Expose() image4: string;
    @Expose() image5: string;
    @Expose() image6: string;
    @Expose() image7: string;
    @Expose() image8: string;
    @Expose() image9: string;
    @Expose() numopts: string;
    @Expose() correct_block: string;
    @Expose() created: string;
    @Expose() updated: string;
}

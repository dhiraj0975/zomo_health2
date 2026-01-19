import { Allow } from 'class-validator';
export class CreateHotspotQuestionsInput {
    @Allow() question_id: number;
    @Allow() image1: string;
    @Allow() image2: string;
    @Allow() image3: string;
    @Allow() image4: string;
    @Allow() image5: string;
    @Allow() image6: string;
    @Allow() image7: string;
    @Allow() image8: string;
    @Allow() image9: string;
    @Allow() numopts: string;
    @Allow() correct_block: string;
    @Allow() quiz_id: number;
}

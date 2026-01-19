import { Allow } from 'class-validator';
export class CreateQuizDetailsInput {
    @Allow() quiz_id: number;
    @Allow() quiz_type: string;
    @Allow() ques_cat: string; /* ques -> quiz*/
    @Allow() ques_section: string; /* ques -> quiz*/
    @Allow() quiz_question: string;
    @Allow() answer_desc: string;
    @Allow() quest_time: string;
    @Allow() question_type: string;
    @Allow() question_info: string;
    @Allow() quest_order: number;
    @Allow() quest_set_time: string;
    @Allow() status: number;
    @Allow() TrueFalse: string;
    @Allow() MultipleChoice: string;
    @Allow() MultipleResponse: string;
    @Allow() MatchingDropDown: string;
    @Allow() Hotspot: string;
    @Allow() FillInTheBlanks: string;
    @Allow() MatchingDragDrop: string;
    @Allow() MultipleQuestion: string;
}

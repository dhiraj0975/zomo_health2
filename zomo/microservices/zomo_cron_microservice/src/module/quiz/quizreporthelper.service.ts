import {
    appConstant,
    QuizDetailsEntity,
    QuizFillUpQuestionEntity,
    QuizMatchingDragDropQuestionEntity,
    QuizMatchingDropDownQuestionEntity,
    QuizMultipleChoiceQuestionEntity,
    QuizMultipleResponseQuestionEntity,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class QuizReportHelperService {
    constructor(
        @InjectRepository(
            QuizDetailsEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaQzQuizDetailsRepository: Repository<QuizDetailsEntity>,
        @InjectRepository(
            QuizMultipleChoiceQuestionEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaQzQuizMultipleChoiceQuestionRepository: Repository<QuizMultipleChoiceQuestionEntity>,
        @InjectRepository(
            QuizFillUpQuestionEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaQzQuizFillUpQuestionRepository: Repository<QuizFillUpQuestionEntity>,
        @InjectRepository(
            QuizMatchingDragDropQuestionEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaQzQuizMatchingDragDropQuestionRepository: Repository<QuizMatchingDragDropQuestionEntity>,
        @InjectRepository(
            QuizMultipleResponseQuestionEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaQzQuizMultipleResponseQuestionRepository: Repository<QuizMultipleResponseQuestionEntity>,
        @InjectRepository(
            QuizMatchingDropDownQuestionEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaQzQuizMatchingDropDownQuestionRepository: Repository<QuizMatchingDropDownQuestionEntity>,
    ) { }
    async getQzQuizList(condition: any, field: string[] = ['QzQuizDetails']) {
        let data = this.readReplicaQzQuizDetailsRepository.createQueryBuilder('QzQuizDetails')
            .where(condition)
            .select(field)
            .orderBy('QzQuizDetails.quest_order', 'ASC')
            .getMany();
        return data;
    }
    async getQzMultipleChoiceQuestionList(condition: any, field: string[] = ['QzMultipleChoiceQuestionDetails']) {
        let data = this.readReplicaQzQuizMultipleChoiceQuestionRepository.createQueryBuilder('QzMultipleChoiceQuestionDetails')
            .where(condition)
            .select(field)
            .groupBy('QzMultipleChoiceQuestionDetails.question_id')
            .getMany();
        return data;
    }
    async getQzFillUpList(condition: any, field: string[] = ['QzFillUpQuestionDetails']) {
        let data = this.readReplicaQzQuizFillUpQuestionRepository.createQueryBuilder('QzFillUpQuestionDetails')
            .where(condition)
            .select(field)
            .getMany();
        return data;
    }
    async getQzMatchingDragDropList(condition: any, field: string[] = ['QzMatchingDragDropQuestionDetails']) {
        let data = this.readReplicaQzQuizMatchingDragDropQuestionRepository.createQueryBuilder('QzMatchingDragDropQuestionDetails')
            .where(condition)
            .select(field)
            .getMany();
        return data;
    }
    async getQzMultipleResponseList(condition: any, field: string[] = ['QzMultipleResponseQuestionDetails']) {
        let data = this.readReplicaQzQuizMultipleResponseQuestionRepository.createQueryBuilder('QzMultipleResponseQuestionDetails')
            .where(condition)
            .select(field)
            .getMany();
        return data;
    }
    async getQzMatchingDropDownList(condition: any, field: string[] = ['QzMatchingDropDownQuestionDetails']) {
        let data = this.readReplicaQzQuizMatchingDropDownQuestionRepository.createQueryBuilder('QzMatchingDropDownQuestionDetails')
            .where(condition)
            .select(field)
            .getMany();
        return data;
    }
    stripTagsAndDecodeHtml(html: string): string {
        if (!html) return '';
        const txt = document.createElement('textarea');
        txt.innerHTML = html;
        let decoded = txt.value;
        const stripped = decoded.replace(/<[^>]*>/g, '');
        return stripped;
    }
}

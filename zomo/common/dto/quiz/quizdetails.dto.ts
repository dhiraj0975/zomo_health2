import { Expose, Transform, Type } from 'class-transformer';
import {
    QuizFillUpQuestionsDto,
    QuizHotspotQuestionsDto,
    QuizMatchingDragDropQuestionsDto,
    QuizMatchingDropDownQuestionsDto,
    QuizMultipleChoiceQuestionsDto,
    QuizMultipleQuestionsDto,
    QuizMultipleResponseQuestionsDto,
    QuizQuizzesDto, QuizSectionsDto,
    QuizTrueFalseQuestionsDto
} from "./index";
const S3_URL =  process.env.S3_URL_PROD
export class QuizDetailsDto {
    @Expose() id: number;
    @Expose() quiz_id: number;
    @Expose() quiz_type: string;
    @Expose() ques_cat: string; /* ques -> quiz*/
    @Expose() ques_section: string; /* ques -> quiz*/
    @Expose() quiz_question: string;
    @Expose() answer_desc: string;
    @Expose() quest_time: string;
    @Expose() question_type: string;
    @Expose() question_info: string;
    @Expose() quest_order: number;
    @Expose() quest_set_time: string;
    @Expose() status: number;
    @Expose() result: string;
    @Expose() created: string;
    @Expose() updated: string;
    @Expose()
    @Type(() => QuizQuizzesDto)
    @Transform(({ obj }) => {
        if (obj.qz) {
            return obj.qz
        } else {
            return [];
        }
    }, {
        toClassOnly: true,
    })
    qz: QuizQuizzesDto;
    @Expose()
    @Type(() => QuizTrueFalseQuestionsDto)
    @Transform(({ obj }) => {
        if (obj.tf) {
            if (obj.quiz_status != undefined) {
                delete obj.tf.quest_answer
            }
            return obj.tf;
        } else {
            return [];
        }
    }, {
        toClassOnly: true,
    })
    tf: QuizTrueFalseQuestionsDto;
    @Expose()
    @Type(() => QuizMultipleChoiceQuestionsDto)
    @Transform(({ obj }) => {
        if (obj.mc) {
            let options = [];
            for (let i = 1; i <= obj.mc.num_opts; i++) {
                let mcObject = {};
                mcObject = {...mcObject, ...{id: obj.mc.id,question_id: obj.mc.question_id,[`opt_${i}`] : obj.mc[`opt_${i}`],num_opts: obj.mc.num_opts,submited_answer: obj.submited_answer == i ? 1 : 0}}
                if (!obj.quiz_status) {
                    mcObject = {...mcObject, ...{quest_answer: obj.mc.quest_answer}}
                }
                options.push(mcObject);
            }
            return options
        } else {
            return [];
        }
    }, {
        toClassOnly: true,
    })
    mc: QuizMultipleChoiceQuestionsDto;
    @Expose()
    @Type(() => QuizMultipleResponseQuestionsDto)
    @Transform(({ obj }) => {
        if (obj.mr) {
            let options = [];
            let submitedAnswer,correctAnswer;
            correctAnswer = obj.mr.answers.split(",").map(Number);
            let status = (typeof obj.submited_answer === 'string' && obj.submited_answer.trim() !== '')
            if (status) {
                submitedAnswer = obj.submited_answer.split(",").map(Number);
            }
            for (let i = 1; i <= obj.mr.num_choices; i++) {
                let mrObject = {};
                if (status) {
                    mrObject = {...mrObject, ...{submited_answer: submitedAnswer.includes(i) ? 1 : 0,correct_answer: correctAnswer.includes(i) ? 1 : 0}}
                } else {
                    mrObject = {...mrObject, ...{correct_answer: correctAnswer.includes(i) ? 1 : 0}}
                }
                mrObject = {...mrObject, ...{id: obj.mr.id,question_id: obj.mr.question_id,[`choice_${i}`] : obj.mr[`choice_${i}`], num_choices: obj.mr.num_choices}}
                if (!obj.quiz_status) {
                    mrObject = {...mrObject, ...{answers: obj.mr.answers}}
                }
                options.push(mrObject);
            }
            return options
        } else {
            return [];
        }
    }, {
        toClassOnly: true,
    })
    mr: QuizMultipleResponseQuestionsDto;
    @Expose()
    @Type(() => QuizMatchingDropDownQuestionsDto)
    @Transform(({ obj }) => {
        if (obj.mdd && obj.mdd.length > 0) {
            let options = [];
            obj.mdd.sort((a, b) => a.id - b.id);
            for (let i = 0; i < obj.mdd.length; i++) {
                let mddObject = {};
                mddObject = {...mddObject, ...{id: obj.mdd[i].id,question_id: obj.mdd[i].question_id,drop_options: obj.mdd[i].drop_options,submited_answer: obj.submited_answer == i + 1 ? 1 : 0}}
                if (!obj.quiz_status) {
                    mddObject = {...mddObject, ...{right_answer: Number(obj.mdd[i].right_answer)}}
                }
                options.push(mddObject);
            }
            return options
        } else {
            return [];
        }
    }, {
        toClassOnly: true,
    })
    mdd: QuizMatchingDropDownQuestionsDto;
    @Expose()
    @Type(() => QuizHotspotQuestionsDto)
    @Transform(({ obj }) => {
        if (obj.hp) {
            let options = [];
            for (let i = 1; i <= obj.hp.numopts; i++) {
                let hpObject = {};
                hpObject = {...hpObject, ...{id: obj.hp.id,question_id: obj.hp.question_id,[`image${i}`] : obj.hp[`image${i}`] && obj.hp[`image${i}`].includes('image') ? S3_URL + obj.hp[`image${i}`] : obj.hp[`image${i}`], numopts: obj.hp.numopts,submited_answer: obj.submited_answer == i ? 1 : 0}}
                if (!obj.quiz_status) {
                    hpObject = {...hpObject, ...{correct_block: Number(obj.hp.correct_block)}}
                }
                options.push(hpObject);
            }
            return options
        } else {
            return [];
        }
    }, {
        toClassOnly: true,
    })
    hp: QuizHotspotQuestionsDto;
    @Expose()
    @Type(() => QuizFillUpQuestionsDto)
    @Transform(({ obj }) => {
        if (obj.fib && obj.fib.length > 0) {
            let submitedAnswer;
            let status = (typeof obj.submited_answer === 'string' && obj.submited_answer.trim() !== '')
            if (status) {
                submitedAnswer = obj.submited_answer.split(",")
            }
            let options = [];
            obj.fib.sort((a, b) => a.id - b.id);
            for (let i = 0; i < obj.fib.length; i++) {
                let submitedAnswerStatus = 0;
                let fibObject = {};
                if (status) {
                    if ((submitedAnswer[i] == obj.fib[i].blank_options)) {
                        submitedAnswerStatus = 1;
                    }
                    fibObject = {...fibObject, ...{submited_answer: submitedAnswer[i].trim(),submited_answer_status: submitedAnswerStatus}}
                }
                fibObject = {...fibObject, ...{id: obj.fib[i].id,question_id: obj.fib[i].question_id, correct_blank: Number(obj.fib[i].correct_blank)}}
                if (!obj.quiz_status) {
                    fibObject = {...fibObject, ...{blank_options: obj.fib[i].blank_options.trim()}}
                }
                options.push(fibObject)
            }
            return options
        } else {
            return [];
        }
    }, {
        toClassOnly: true,
    })
    fib: QuizFillUpQuestionsDto;
    @Expose()
    @Type(() => QuizMatchingDragDropQuestionsDto)
    @Transform(({ obj }) => {
        if (obj.qdd && obj.qdd.length > 0) {
            obj.qdd.sort((a, b) => a.id - b.id);
            if (obj.quiz_status != undefined) {
                let convertedObj = JSON.parse(JSON.stringify(obj.qdd));
                for (let i = 0; i < convertedObj.length; i++) {
                    const nextIndex = (i + 1) % convertedObj.length;
                    convertedObj[i].answer = obj.qdd[nextIndex].answer;
                    convertedObj[i].key = obj.qdd[nextIndex].id;
                }
                obj.qdd = convertedObj
            }
            return obj.qdd;
        } else {
            return [];
        }
    }, {
        toClassOnly: true,
    })
    qdd: QuizMatchingDragDropQuestionsDto;
    @Expose()
    @Type(() => QuizMultipleQuestionsDto)
    @Transform(({ obj }) => {
        if (obj.mq && obj.mq.length > 0) {
            obj.mq = obj.mq.sort((a, b) => a.id - b.id);
            if (obj.quiz_status != undefined) {
                for (let i = 0; i < obj.mq.length; i++) {
                    delete obj.mq[i].answer
                }
            }
            return obj.mq
        } else {
            return [];
        }
    }, {
        toClassOnly: true,
    })
    mq: QuizMultipleQuestionsDto;
    @Expose()
    @Type(() => QuizSectionsDto)
    @Transform(({ obj }) => {
        if (obj.section) {
            return obj.section
        } else {
            return null;
        }
    }, {
        toClassOnly: true,
    })
    section: QuizSectionsDto;
}

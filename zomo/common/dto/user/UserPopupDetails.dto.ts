import { Expose, Transform, Type } from 'class-transformer';
import * as moment from 'moment-timezone';
const S3_URL =  process.env.S3_URL_PROD
export class UserPopupDetailsDto {
    @Expose() id: number;
    // @Expose() code: string;
    @Expose() role_id: number;
    @Expose() first_name: string;
    @Expose() middle_name: string;
    @Expose() last_name: string;
    @Expose() full_name?: string;
    @Expose() username: string;
    @Expose() timezone: string;
    @Expose() companytype_id: number;
    @Expose() org_id: number;
    @Expose()
    @Type(() => Object)
    @Transform(({ obj }) => {
        let Questionnaire_title;
        let Questionnaire_text,company_logo;
        if (obj && obj.Questionnairesetting) {
            if (obj.Questionnairesetting['eligibility'] === 0) {
                company_logo=`${S3_URL}companylogos/${obj.company.id}/${obj.company.company_logo}`;
                Questionnaire_title = obj.Questionnairesetting.title;
                Questionnaire_text = obj.Questionnairesetting.header_text;
            }
        }
        return {
            Questionnaire_title: Questionnaire_title,
            Questionnaire_text: Questionnaire_text,
            company_logo:company_logo
        };
    })
    QuestionnairDetails: { Questionnaire_title?: string, Questionnaire_text?: string ,company_logo:any};
    @Expose()
    @Type(() => Object)
    @Transform(({ obj }) => {
        return {
            //agreement_text: obj.company?.meta?.agreement_text,
            a_popup_title: obj.company?.meta?.a_popup_title,
            a_popup_text: obj.company?.meta?.a_popup_text
        };
    })
    loginAgreement: {
        // agreement_text?: string,
        a_popup_title?: string,
        a_popup_text?: string
    };
    @Expose()
    @Type(() => Object)
    @Transform(({ obj }) => {
        return {
            agreement_text: obj.company?.meta?.agreement_text,
        };
    })
    spouseAgreement: {
        agreement_text?: string
    };
    @Expose()
    @Type(() => Object)
    @Transform(({ obj }) => {
        return {
            title: obj.company?.meta?.title,
            text: obj.company?.meta?.setting_dic,
            logo: `${S3_URL}${obj.company?.setting?.logo_imagee}`,
        };
    })
    infopopupDetails: {
        title?: string, text?: string
    };
    @Expose()
    @Type(() => Object)
    @Transform(({ obj }) => {
        let data = obj.relayRaceData?.filter(item => item !== null && item !== undefined);
        return {data}
    })
    challengeRelayRaceDetails: {
        data:any
    };
    @Expose()
    @Type(() => Object)
    @Transform(({ obj }) => {
        let title, description,covidOtherQuestion, passport_description, additional_note, need_checkup_text, need_checkup_desc, no_need_checkup_text, no_need_checkup_desc, covid_image, covid_questions, vaccin;
        if (obj.company?.setting?.covid_menu === 1 && obj.company.Covidsettings) {
            title = obj.company.Covidsettings?.title;
            description = obj.company.Covidsettings?.description;
            additional_note = obj.company.Covidsettings?.additional_note;
            need_checkup_text = obj.company.Covidsettings?.need_checkup_text;
            need_checkup_desc = obj.company.Covidsettings?.need_checkup_desc;
            no_need_checkup_text = obj.company.Covidsettings?.no_need_checkup_text;
            no_need_checkup_desc = obj.company.Covidsettings?.no_need_checkup_desc;
            vaccin = obj.company.Covidsettings?.Covidvaccinationtyp?.map(obj => {
                return {
                    name: obj.title,  // Assuming this holds the question text
                    value: obj.id
                };
            }).sort((a, b) => a.value - b.value);
            // covid_questions = obj.company.Covidsettings?.Covidquestions
            covid_questions = obj.company.Covidsettings?.Covidquestions?.map(question => {
                return {
                    question: question.title,  // Assuming this holds the question text
                    value: question.id,
                    answers: question.CovidAnswer?.map(answer => ({
                        name: answer.title,  // Assuming answer_text contains the 'Yes' or 'No'
                        value: answer.id           // Assuming id contains the unique identifier (e.g., 11, 12)
                    })).sort((a, b) => a.value - b.value)
                };
            }).sort((a, b) => a.value - b.value);
            covid_image = `${S3_URL}${obj.company.Covidsettings?.popup_header_image}`
        }
        if (obj.company?.setting?.passport_menu === 1 && obj.company?.Covidsettings?.Covidpassportsetting) {
            passport_description = obj.company.Covidsettings.Covidpassportsetting[0]?.description;
        }
        if(obj.company?.Covidsettings?.status ===1){
            covidOtherQuestion={
                "question": "Are you vaccinated?",
                "answer": [
                  {
                    "id": "1",
                    "label": "Yes",
                    "stepflag": 1,
                    "sub_question": [
                      {
                        "title": "Vaccination Type?",
                        "filetype": "radio",
                        "showfield": 1,
                        "option": obj.company.Covidsettings?.Covidvaccinationtyp?.map(obj => {
                            return {
                                name: obj.title,  // Assuming this holds the question text
                                value: obj.id
                            };
                        }).sort((a, b) => a.value - b.value)
                      },
                      {
                        "title": "Upload Your Vaccination Records",
                        "filetype": "file",
                        "showfield": 1,
                        "option": []
                        //CovidpassportUser
                      },
                      {
                        "title": "Last Vaccination Date",
                        "filetype": "date",
                        "showfield": 1,
                        "option": []
                      }
                    ]
                  },
                  {
                    "id": "2",
                    "label": "No",
                    "stepflag": 1,
                    "sub_question": [
                      {
                        "title": "Have you tested positive for COVID?",
                        "filetype": "radio",
                        "showfield": 1,
                        "option": [
                          {"id": "1", "label": "Yes"},
                          {"id": "2", "label": "No"}
                        ]
                      },
                      {
                        "title": "Upload Your Test Results",
                        "filetype": "file",
                        "showfield": 1,
                        "option": []
                      },
                      {
                        "title": "Last Report Date",
                        "filetype": "date",
                        "showfield": 1,
                        "option": []
                      }
                    ]
                  },
                  {
                    "id": "3",
                    "label": "Decline to answer",
                    "stepflag": 0,
                    "sub_question": []
                  }
                ]
              }
        }
        return {
            title, description, passport_description, additional_note, need_checkup_text, need_checkup_desc, no_need_checkup_text, no_need_checkup_desc, covid_image, covid_questions, vaccin,covidOtherQuestion
        };
    })
    covidQuestionDetails: {
        title: any, description: any, passport_description: any, additional_note: any, need_checkup_text: any, need_checkup_desc: any, no_need_checkup_text: any, no_need_checkup_desc: any, covid_image: any, covid_questions: any, vaccin: any,covidOtherQuestion:any
    };
    @Expose()
    @Type(() => Object)
    @Transform(({ obj }) => {
        let title,survey_popup_id, description, additional_note, pass_need_text, pass_need_desc, fail_need_text, fail_need_desc, survey_image, survey_questions;
        let SurveyRequired=0;
        if (obj.company.Surveypopup && obj.company.Surveypopup['status'] == 1) {
            survey_popup_id=obj.company.Surveypopup?.id
            title = obj.company.Surveypopup?.title;
            description = obj.company.Surveypopup?.description;
            additional_note = obj.company.Surveypopup?.additional_note;
            SurveyRequired = obj.company.Surveypopup['show_required'];
            if (obj.company.Surveypopup?.pass_need_check === 1) {
                pass_need_text = obj.company.Surveypopup?.pass_need_text;
                pass_need_desc = obj.company.Surveypopup?.pass_need_desc;
            }
            if (obj.company.Surveypopup?.fail_need_check === 1) {
                fail_need_text = obj.company.Surveypopup?.fail_need_text;
                fail_need_desc = obj.company.Surveypopup?.fail_need_desc;
            }
            // survey_questions = obj.company.Surveypopup?.Surveyquestions
            survey_questions = obj.company.Surveypopup?.Surveyquestions?.map(question => {
                return {
                    question: question.title,  // Assuming this holds the question text
                    value: question.id,
                    ans_option_type:question.ans_option_type,
                    answers: question.SurveyAnswer?.map(answer => ({
                        name: answer.title,  // Assuming answer_text contains the 'Yes' or 'No'
                        value: answer.id,
                        correct_ans: answer.correct_ans        // Assuming id contains the unique identifier (e.g., 11, 12)
                    })).sort((a, b) => a.value - b.value)
                };
            }).sort((a, b) => a.value - b.value);
            survey_image = `${S3_URL}${obj.company.Surveypopup?.popup_header_image}`
        }
        return {
            title,survey_popup_id, description, additional_note,SurveyRequired, pass_need_text, pass_need_desc, fail_need_text, fail_need_desc, survey_image, survey_questions
        };
    })
    surveyDetails: {
        title: any,survey_popup_id:any, description: any, additional_note: any, pass_need_text: any, pass_need_desc: any, fail_need_text: any, fail_need_desc: any, survey_image: any, survey_questions: any,SurveyRequired:any
    };
    @Expose()
    @Type(() => Object)
    @Transform(({ obj }) => {
        let TempaddReminder = [];
        let TempaddReminderstring = '';
        let returndataid = '';
        let returndatalimit = '';
        if (obj.userBookingList) {
            obj.userBookingList.map((userBookingList) => {
                if (userBookingList.ev_event && userBookingList.ev_slotstimings) {
                    let totalDays = 0;
                    let startDay = moment().startOf('day');
                    let endDay = moment(userBookingList.ev_slotstimings.slotdate, 'YYYY-MM-DD');
                    let dateDiff = endDay.diff(startDay, 'days');
                    totalDays = dateDiff;
                    let daysLabel = totalDays < 2 ? 'day' : 'days';
                    const eventDName = userBookingList.ev_event.event_name;
                    if (userBookingList.ev_event.reminder.includes(totalDays) &&
                        totalDays !== userBookingList.reminder_limit) {
                        TempaddReminder.push({
                            id: userBookingList.id,
                            reminder_limit: totalDays
                        });
                        TempaddReminderstring +=
                            totalDays >= 1
                                ? `<p>Your <b>${eventDName}</b> event is scheduling after ${totalDays} ${daysLabel}</p>`
                                : `<p>Your <b>${eventDName}</b> event is scheduled today</p>`;
                    }
                    else {
                        let printNGE = -1;
                        for (const reminderCount of userBookingList.ev_event.reminder) {
                            if (reminderCount > totalDays) {
                                printNGE = reminderCount;
                                break;
                            }
                        }
                        const reminderNumbers = JSON.parse(userBookingList.ev_event.reminder);
                        const reminderNumbersMapped = reminderNumbers.map(Number);
                        const minReminder = Math.min(...reminderNumbersMapped);
                        if (
                            printNGE !== -1 &&
                            minReminder !== userBookingList.reminder_limit &&
                            printNGE !== userBookingList.reminder_limit
                        ) {
                            TempaddReminder.push({
                                id: userBookingList.id,
                                reminder_limit: printNGE
                            });
                            TempaddReminderstring +=
                                totalDays >= 1
                                    ? `<p>Your <b>${eventDName}</b> event is scheduling after ${totalDays} ${daysLabel}</p>`
                                    : `<p>Your <b>${eventDName}</b> event is scheduled today</p>`;
                        };
                    }
                }
            })
        }
        if(TempaddReminder.length>0){
            returndatalimit=TempaddReminder[0].reminder_limit
            returndataid=TempaddReminder[0].id
        }
        return { eventReminderArray: TempaddReminder, eventReminderstring: TempaddReminderstring ,returndataid,returndatalimit}
    })
    eventDetails: { eventReminderArray?: string, eventReminderstring?: string ,returndatalimit?:any,returndataid?:any };
}

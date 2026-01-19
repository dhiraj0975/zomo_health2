import { Expose, Transform } from 'class-transformer';
const moment = require('moment-timezone');
const S3_URL =  process.env.S3_URL_PROD
export class UserPopupLogin {
    @Expose() id: number;
    @Expose() code: string;
    @Expose() role_id: number;
    @Expose() first_name: string;
    @Expose() middle_name: string;
    @Expose() last_name: string;
    @Expose() full_name?: string;
    @Expose() username: string;
    @Expose() email: string;
    @Expose() p_email: string;
    @Expose() employeeid: string;
    @Expose() securitycode: string;
    @Expose() timezone: string;
    @Expose() docpassword: string;
    @Expose() ssoIdentifier: string;
    @Expose() activation_key: string;
    @Expose() is_camp_eligible: number;
    @Expose() on_insurance_plan: string;
    @Expose() insurance_plan_name: string;
    @Expose() department_id: number;
    @Expose() physiciantype_id: number;
    @Expose() pname: string;
    @Expose() companytype_id: number;
    @Expose() org_id: number;
    @Expose() membership_code: string;
    @Expose() entered_code: string;
    @Expose() num_login: number;
    @Expose() user_type: number;
    @Expose() on_current_census: string;
    @Expose() relationship_id: string;
    @Expose() status: number;
    @Expose() created_by: number;
    @Expose() updated_by: number;
    @Expose()
    @Transform(({ obj }) => {
        let SurveyRequired = 0;
        let userPopupStatus = 0;
        let loginaggrement = 0;
        let Questionnaireuser = 0;
        let agreement = 0;
        let event_remider_popup = 0;
        let reset_popup_status = 0;
        var info_pop_status = 0;
        let health_popup = 0;
        let activity_popup = 0;
        let editemailspaouse = 0;
        let editemailspaouserequired = 0;
        let TokenReceivedPopup = 0;
        let challengeRelayRace = 0;
        let UserServeyPopupShow = 0;
        let loginpointsleaderboardpopup = 0;
        let reimbursement_form = 0;
        let logouttimereceivedtoken = 0;
        let pointsleaderboardpopup = 0;
        let information_popup_logo = 0;
        let covidPassport = 0
        let covidVaccinePopup = 0;
        let covidQuestionsPopup = 0;
        let first_login_by = 0;
        let pre_first_login_by = 0;
        if (obj.setting) {
            reset_popup_status = obj.setting.popup_status;
        }
        if (obj.usercompanySetting) {
            userPopupStatus = obj.usercompanySetting.user_popup_status;
            pointsleaderboardpopup = obj.usercompanySetting.pointsleaderboardpopup;
            //first_login_by = obj.company.setting.first_login_by
            pre_first_login_by = obj.usercompanySetting.pre_first_login_by
        }
        if( obj.new_password === ''){
            //obj.num_login===0
            first_login_by =1
        }
        if (obj && ((obj.role_id == 16 || obj.role_id == 2))) {
            let userTimeZone = 'UTC';
            if (obj.timezone) {
                userTimeZone = obj.timezone
            }
            let infocurrent_date = moment().tz(userTimeZone);
            let infocurrentdate = infocurrent_date.format('YYYY-MM-DD HH:mm:ss');
            let biweekcurrentdate = infocurrent_date.format('YYYY-MM-DD');
            let info_pop_status_table = obj?.settings?.info_popup_status || 1
            if (info_pop_status_table === 0) {
                let inpo_pop_data = obj
                if (inpo_pop_data && inpo_pop_data.usercompanySetting.enable_popup === 1) {
                    if (inpo_pop_data.usercompanySetting.enable_logo === 1) {
                        information_popup_logo = 1
                    }
                    let start_date = moment(inpo_pop_data.usercompanySetting.start_date).startOf('day'); 
                    let end_date = moment(inpo_pop_data.usercompanySetting.end_date).endOf('day'); 
                    let currentdate = moment(infocurrent_date).valueOf();
                    if (currentdate >= start_date.valueOf() && currentdate <= end_date.valueOf()){
                        if (inpo_pop_data.usercompanySetting.frequency_type == 0) {
                            let day_array = inpo_pop_data.meta.selectedweeks ? inpo_pop_data.meta.selectedweeks.split(',') : [];
                            let datePeriodData = [];
                            let tempbioevent = {};
                            for (let d = moment(start_date); d.isSameOrBefore(end_date); d.add(1, 'days')) {
                                let dayOfWeek = d.day(); 
                                if (day_array.includes(dayOfWeek.toString())) {
                                    if (!tempbioevent[dayOfWeek] || tempbioevent[dayOfWeek] === 1) {
                                        datePeriodData.push(d.format('YYYY-MM-DD')); 
                                        tempbioevent[dayOfWeek] = 0;
                                    } else {
                                        tempbioevent[dayOfWeek] = 1;
                                    }
                                }
                            }
                            info_pop_status = datePeriodData.includes(biweekcurrentdate) ? 1 : 0;
                        } else if (inpo_pop_data.usercompanySetting.frequency_type == 1) {
                            let day_array = inpo_pop_data.meta.selectedweeks ? inpo_pop_data.meta.selectedweeks.split(',') : [];
                            let current_day_name = moment(infocurrent_date).format('dddd');
                            info_pop_status = day_array.includes(current_day_name) ? 1 : 0;
                        } else if (inpo_pop_data.usercompanySetting.frequency_type == 2) {
                            let month_array = inpo_pop_data.meta.selectedmonths ? inpo_pop_data.meta.selectedmonths.split(',') : [];
                            let current_month_name = moment(infocurrent_date).format('MMMM');
                            info_pop_status = month_array.includes(current_month_name.toString()) ? 1 : 0;
                        }
                    } else {
                        info_pop_status = 0;
                    }
                } else {
                    info_pop_status = 0;
                }
            }
            if (obj && obj.usercompanySetting?.health_form_popup == 1) {
                if (obj && obj.reimbursement && obj.reimbursement.length) {
                    let reimbursement = obj.reimbursement.sort((a, b) => b['id'] - a['id'])[0];
                    if (reimbursement && reimbursement.popup_status == 0) {
                        if (reimbursement.status === 1) {
                            reimbursement_form = 1;
                        }
                        if (reimbursement.status === 2) {
                            reimbursement_form = 2;
                        }
                    }
                    else {
                        reimbursement_form = 0;
                    }
                }
                if (obj && obj.ac_submitform && obj.ac_submitform.length) {
                    let ac_submitform = obj.ac_submitform.sort((a, b) => b['id'] - a['id'])[0];
                    if (ac_submitform && ac_submitform.popup_status == 0) {
                        if (ac_submitform.status === 1) {
                            activity_popup = 1;
                        }
                        if (ac_submitform.status === 2) {
                            activity_popup = 2;
                        }
                    }
                    else {
                        activity_popup = 0;
                    }
                }
                if (obj && obj.hc_userform && obj.hc_userform.length) { // && decline_user_form == 0
                    let hc_userform = obj.hc_userform.sort((a, b) => b['id'] - a['id'])[0];
                    if (hc_userform && hc_userform.popup_status == 0) {
                        if (hc_userform.status === 2) {
                            health_popup = 1;
                        }
                        if (hc_userform.status === 3) {
                            health_popup = 2;
                        }
                    }
                    else {
                        health_popup = 0;
                    }
                }
            }
            if (obj && obj.Questionnairesetting) {
                let showQuestionnairesetting = false;
                if ((obj.is_camp_eligible == 1 && obj.Questionnairesetting['eligibility'] == 1) || (obj.is_camp_eligible == 0 && obj.Questionnairesetting['eligibility'] == 2)) {
                    showQuestionnairesetting = true;
                }
                if ((obj.role_id == 2 && obj.is_camp_eligible == 1 && obj.Questionnairesetting['eligibility'] == 3) || (obj.role_id == 2 && obj.is_camp_eligible == 0 && obj.Questionnairesetting['eligibility'] == 4)) {
                    showQuestionnairesetting = true;
                }
                if ((obj.role_id == 16 && obj.is_camp_eligible == 1 && obj.Questionnairesetting['eligibility'] == 5) || (obj.role_id == 16 && obj.is_camp_eligible == 0 && obj.Questionnairesetting['eligibility'] == 6)) {
                    showQuestionnairesetting = true;
                }
                if (obj['Questionnairesetting']['eligibility'] == 0 || showQuestionnairesetting) {
                    Questionnaireuser = (obj.Questionnaireuser !== null && typeof (obj.Questionnaireuser) === 'object') ? 0 : 1;
                }
            }
            if (obj.allgetteams && obj.allgetteams > 0) {
                challengeRelayRace = 1;
            }
            else {
                challengeRelayRace = 0;
            }
            if (obj.usercompanySetting.passport_menu === 1) {
                let covid_passport_user = obj?.CovidpassportUser || {}
                if (covid_passport_user) {
                    if (covid_passport_user.approval_status !== 0 && covid_passport_user.is_show_dashboard === 0) {
                        if (covid_passport_user.approval_status === 1) {
                            covidPassport = 1
                        }
                        if (covid_passport_user.approval_status === 2) {
                            covidPassport = 2
                        }
                    }
                    else {
                        covidPassport = 0
                    }
                }
            }
            if (obj.usercompanySetting.covid_menu === 1) {
                let getCovidsetting = obj.Covidsettings || {};
                let covid_is_eligibility = getCovidsetting?.is_eligibility || '0';
                let show_eligibility = '0';
                if ((obj.role_id === 2 || obj.role_id === 16) && (covid_is_eligibility == '0' || covid_is_eligibility === obj?.is_camp_eligible)) {
                    show_eligibility = '1';
                }
                let to_dept_loc_status = 1;
                if (getCovidsetting?.department_string?.includes(obj.department_id)) {
                    to_dept_loc_status = 0;
                }
                if (getCovidsetting?.location_string?.includes(obj.location)) {
                    to_dept_loc_status = 0;
                }
                let show_covid_popup = '0';
                if (getCovidsetting?.status === 1 || getCovidsetting?.symptom_traker_setting === 1) {
                    show_covid_popup = '1';
                }
                let covid_show = '0';
                if (to_dept_loc_status === 1 && show_eligibility === '1' && show_covid_popup === '1') {
                    let userTimeZone = obj.timezone || 'UTC';
                    const covidcurrent_date = moment.tz(userTimeZone).format('YYYY-MM-DD');
                    const covidcurrent_datetime = moment.tz(userTimeZone).format('YYYY-MM-DD HH:mm:ss');
                    const covidDate = covidcurrent_date; 
                    let covid_ts = moment(covidDate).valueOf(); 
                    let covid_year = moment(covid_ts).year();
                    let covid_month = moment(covid_ts).month() + 1; 
                    const today = moment.tz(userTimeZone);
                    const dayOfWeek = today.day(); 
                    const getDayOffset = (day) => {
                        const weekdays = {
                            'sunday': 0,
                            'monday': 1,
                            'tuesday': 2,
                            'wednesday': 3,
                            'thursday': 4,
                            'friday': 5,
                            'saturday': 6
                        };
                        return weekdays[day.toLowerCase()] || 0; 
                    };
                    const selectedWeekDay = getCovidsetting?.selectedweekday || 'monday';
                    const selectedWeekDayOffset = getDayOffset(selectedWeekDay);
                    let daysUntilSelectedWeekday = selectedWeekDayOffset - dayOfWeek;
                    if (daysUntilSelectedWeekday < 0) {
                        daysUntilSelectedWeekday += 7;
                    }
                    if (daysUntilSelectedWeekday < 0) {
                        daysUntilSelectedWeekday = 0;
                    }
                    let weekStartDate = today.clone().add(daysUntilSelectedWeekday, 'days').startOf('day');
                    let weekEndDate = weekStartDate.clone().add(6, 'days'); 
                    const formattedWeekStartDate = weekStartDate.format('YYYY-MM-DD');
                    const formattedWeekEndDate = weekEndDate.format('YYYY-MM-DD');
                    let month_start_date = `${covid_year}-${covid_month.toString().padStart(2, '0')}-01`;
                    const lastDayOfCurrentMonth = today.clone().endOf('month').date();
                    let month_end_date = `${covid_year}-${covid_month.toString().padStart(2, '0')}-${lastDayOfCurrentMonth}`;
                    let year_start_date = `${covid_year}-01-01`;
                    let year_end_date = `${covid_year}-12-31`;
                    let frequency_time = getCovidsetting?.selected_frequency_time || '00:00:00';
                    let m_covidshow = '0';
                    let from_date_covid = '';
                    let to_date_covid = '';
                    switch (getCovidsetting?.selected_frequency) {
                        case 0: 
                            from_date_covid = `${covidcurrent_date} ${frequency_time}`;
                            to_date_covid = `${covidcurrent_date} 23:59:59`;
                            break;
                        case 1: 
                            from_date_covid = `${formattedWeekStartDate} ${frequency_time}`;
                            to_date_covid = `${formattedWeekEndDate} ${frequency_time}`;
                            break;
                        case 2: 
                            from_date_covid = `${month_start_date} 00:00:00`;
                            to_date_covid = `${month_end_date} 23:59:59`;
                            break;
                        case 3: 
                            from_date_covid = `${year_start_date} 00:00:00`;
                            to_date_covid = `${year_end_date} 23:59:59`;
                            break;
                        case 4: 
                            from_date_covid = to_date_covid = '1';
                            m_covidshow = '1';
                            break;
                        default:
                            from_date_covid = to_date_covid = '';
                            break;
                    }
                    if (from_date_covid && to_date_covid && m_covidshow === '0') {
                        if (moment(covidcurrent_datetime).isBetween(moment(from_date_covid), moment(to_date_covid), null, '[]')) {
                            m_covidshow = '1';
                        }
                    }
                    if (m_covidshow === '1') {
                        let datecon = getCovidsetting?.Coviduseranswers.filter(answer => {
                            const isValidOrg = answer.org_id === obj.org_id;
                            const isValidUser = answer.user_id === obj.id;
                            const isValidStatus = answer.status === 1;
                            if (getCovidsetting?.selected_frequency !== 4) {
                                const createdDateUTC = moment(answer.created).tz(userTimeZone);
                                const fromDate = moment(from_date_covid).tz(userTimeZone);
                                const toDate = moment(to_date_covid).tz(userTimeZone);
                                return isValidOrg && isValidUser && isValidStatus && (createdDateUTC.isBetween(fromDate, toDate, null, '[]'));
                            }
                            return isValidOrg && isValidUser && isValidStatus;
                        });
                        if (getCovidsetting?.selected_frequency === 4) {
                            covid_show = datecon.length <= getCovidsetting?.show_login_time ? '1' : '0';
                        } else {
                            covid_show = datecon.length ? '0' : '1';
                        }
                    }
                }
                if (covid_show === '1') {
                    if (getCovidsetting?.status === 1) {
                        covidVaccinePopup = 1
                    }
                    if (getCovidsetting?.symptom_traker_setting === 1) {
                        covidQuestionsPopup = 1
                    }
                }
            }
            if (obj && obj.role_id == 16) {
                const spouseEmail = obj.email || '';
                const spouseEmailCollectionOnOff = obj.setting.spouse_email_collection_on_off || '0';
                const spouseEmailCollectionRequired = obj.setting.spouse_email_collection_required || '0';
                if (spouseEmailCollectionOnOff === 1 && (spouseEmail.includes('@preventioncloud.com') || spouseEmail.includes('@zomohealth.com'))) {
                    editemailspaouse = 1;
                }
                if (spouseEmailCollectionRequired === 1) {
                    editemailspaouserequired = 1;
                }
                if (obj.settings.receivetokens) {
                    logouttimereceivedtoken = obj.settings.receivetokens;
                    if (logouttimereceivedtoken > 0) {
                        TokenReceivedPopup = 1;
                    }
                }
            }
            if (obj.usercompanySetting.pointsleaderboardpopup == 1 && obj.settings.is_pointsleaderboardpopup == 0) {
                loginpointsleaderboardpopup = 1;
            }
        }
        else {
            info_pop_status = 0;
            health_popup = 0;
            activity_popup = 0;
            reimbursement_form = 0;
            challengeRelayRace = 0;
        }
        if (obj && !obj.loginaggrement && obj.meta?.a_popup_status == 1) {
            loginaggrement = 1;
        }
        if (obj && (obj.role_id == 16 && obj.usercompanySetting.agreement_status == 1)) {
            agreement = obj.Spouseagreement ? 0 : 1;
        }
        if (obj?.Surveypopup && obj?.Surveypopup['status'] == 1) {
            SurveyRequired = obj.Surveypopup['show_required'];
            const surveyPopupData = obj;
            const surveyPopupID = surveyPopupData?.Surveypopup?.id || '';
            const surveyIsEligibility = surveyPopupData?.Surveypopup?.is_eligibility || '0';
            const surveyUserEligibility = obj.is_camp_eligible;
            let showEligibility = '0';
            if ((obj.role_id === 2 || obj.role_id === 16) && surveyIsEligibility === '0') {
                showEligibility = '1';
            } else if (obj.role_id === 2 && surveyIsEligibility === surveyUserEligibility) {
                showEligibility = '1';
            } else if (obj.role_id === 16 && surveyIsEligibility === surveyUserEligibility) {
                showEligibility = '1';
            } else {
                showEligibility = '0';
            }
            let toDeptLocStatus = 1;
            if (surveyPopupData?.Surveypopup?.department_string) {
                const departmentIds = JSON.parse(surveyPopupData.Surveypopup.department_string);
                if (!departmentIds.includes(obj.department_id)) {
                    toDeptLocStatus = 0;
                }
            }
            if (surveyPopupData?.Surveypopup?.location_string) {
                const locationIds = JSON.parse(surveyPopupData.Surveypopup.location_string);
                if (!locationIds.includes(obj.location)) {
                    toDeptLocStatus = 0;
                }
            }
            let showSurveyPopup = '0';
            if (surveyPopupData) {
                if (surveyPopupData.Surveypopup.status === 1) {
                    showSurveyPopup = '1';
                }
                const surveyQuestions = obj.SurveyquestionsList ? obj.SurveyquestionsList : 0;
                const surveyQuestionsAnswer = obj.SurveyanswerList ? obj.SurveyanswerList : 0;
                if (surveyQuestions === 0 || surveyQuestionsAnswer === 0) {
                    showSurveyPopup = '0';
                }
            }
            if (surveyPopupData && toDeptLocStatus === 1 && showEligibility === '1' && showSurveyPopup === '1') {
                const surveyQuestions = surveyPopupData.Surveypopup.Surveyanswer;
                let userTimeZone = obj.timezone || 'UTC';
                const surveyCurrentDate = moment.tz(userTimeZone).format('YYYY-MM-DD');
                const surveyCurrentDateTime = moment.tz(userTimeZone).format('YYYY-MM-DD HH:mm:ss');
                const surveyDate = surveyCurrentDate; 
                const surveyTs = moment(surveyDate).valueOf(); 
                const surveyYear = moment(surveyTs).year(); 
                const surveyMonth = moment(surveyTs).month() + 1; 
                const today = moment.tz(userTimeZone);
                const dayOfWeek = today.day(); 
                const getDayOffset = (day) => {
                    const weekdays = {
                        'sunday': 0,
                        'monday': 1,
                        'tuesday': 2,
                        'wednesday': 3,
                        'thursday': 4,
                        'friday': 5,
                        'saturday': 6
                    };
                    return weekdays[day.toLowerCase()] || 0; 
                };
                const selectedWeekDay = surveyPopupData?.Surveypopup?.selectedweekday || 'monday';
                const selectedWeekDayOffset = getDayOffset(selectedWeekDay);
                let daysUntilSelectedWeekday = selectedWeekDayOffset - dayOfWeek;
                if (daysUntilSelectedWeekday < 0) {
                    daysUntilSelectedWeekday += 7;
                }
                if (daysUntilSelectedWeekday < 0) {
                    daysUntilSelectedWeekday = 0;
                }
                let weekStartDate = today.clone().add(daysUntilSelectedWeekday, 'days');
                let weekEndDate = weekStartDate.clone().add(7 - selectedWeekDayOffset, 'days');
                const formattedWeekStartDate = weekStartDate.format('YYYY-MM-DD');
                const formattedWeekEndDate = weekEndDate.format('YYYY-MM-DD');
                const monthStartDate = moment(surveyTs).startOf('month').format('YYYY-MM-DD');
                const lastDayOfCurrentMonth = moment(today).endOf('month').date(); // Get the last day of the month
                const monthEndDate = moment(surveyTs).endOf('month').format('YYYY-MM-DD');
                const yearStartDate = moment(surveyTs).startOf('year').format('YYYY-MM-DD');
                const yearEndDate = moment(surveyTs).endOf('year').format('YYYY-MM-DD');
                const frequencyTime = surveyPopupData?.Surveypopup?.selected_frequency_time || '00:00:00';
                let mSurveyShow = '0';
                let fromDateSurvey = '';
                let toDateSurvey = '';
                if (surveyPopupData?.Surveypopup?.selected_frequency === 0) {
                    fromDateSurvey = `${surveyCurrentDate} ${frequencyTime}`;
                    toDateSurvey = `${surveyCurrentDate} 23:59:59`;
                    if (moment(surveyCurrentDateTime).isBetween(moment(fromDateSurvey), moment(toDateSurvey), null, '[]')) {
                        mSurveyShow = '1';
                    }
                } else if (surveyPopupData?.Surveypopup?.selected_frequency === 1) {
                    fromDateSurvey = `${formattedWeekStartDate} ${frequencyTime}`;
                    toDateSurvey = `${formattedWeekEndDate} ${frequencyTime}`;
                    if (moment(surveyCurrentDateTime).isSameOrAfter(moment(fromDateSurvey)) && moment(surveyCurrentDateTime).isSameOrBefore(moment(toDateSurvey))) {
                        mSurveyShow = '1';
                    }
                } else if (surveyPopupData?.Surveypopup?.selected_frequency === 2) {
                    fromDateSurvey = `${monthStartDate} 00:00:00`;
                    toDateSurvey = `${monthEndDate} 23:59:59`;
                    if (moment(surveyCurrentDateTime).isSameOrAfter(moment(fromDateSurvey)) && moment(surveyCurrentDateTime).isSameOrBefore(moment(toDateSurvey))) {
                        mSurveyShow = '1';
                    }
                } else if (surveyPopupData?.Surveypopup?.selected_frequency === 3) {
                    fromDateSurvey = `${yearStartDate} 00:00:00`;
                    toDateSurvey = `${yearEndDate} 23:59:59`;
                    if (moment(surveyCurrentDateTime).isSameOrAfter(moment(fromDateSurvey)) && moment(surveyCurrentDateTime).isSameOrBefore(moment(toDateSurvey))) {
                        mSurveyShow = '1';
                    }
                } else if (surveyPopupData?.Surveypopup?.selected_frequency === 4) {
                    mSurveyShow = '1';
                    fromDateSurvey = toDateSurvey = '1';
                } else {
                    fromDateSurvey = '';
                    toDateSurvey = '';
                }
                let surveyShow = '0';
                if (surveyPopupID) {
                    if (mSurveyShow === '1') {
                        let datecon = surveyQuestions?.filter((answer) => {
                            const isValidOrg = answer.org_id === obj.org_id;
                            const isValidUser = answer.user_id === obj.id;
                            const isValidStatus = answer.status === 1;
                            if (surveyPopupData.Surveypopup.selected_frequency !== 4) {
                                const createdDateUTC = moment(answer.created).tz(userTimeZone); 
                                const fromDate = moment.tz(fromDateSurvey, userTimeZone); 
                                const toDate = moment.tz(toDateSurvey, userTimeZone); 
                                return isValidOrg && isValidUser && isValidStatus && createdDateUTC.isBetween(fromDate, toDate, null, '[]');
                            }
                            return isValidOrg && isValidUser && isValidStatus;
                        });
                        if (surveyPopupData.Surveypopup.selected_frequency === 4) {
                            surveyShow = datecon.length <= surveyPopupData.Surveypopup.show_login_time ? '1' : '0';
                        } else {
                            surveyShow = datecon.length ? '0' : '1';
                        }
                    }
                }
                if (surveyShow === '1') {
                    UserServeyPopupShow = 1
                }
            }
        }
        if (obj.userBookingList) {
            obj.userBookingList.map((userBookingList) => {
                if (userBookingList.ev_event && userBookingList.ev_slotstimings) {
                    let totalDays = 0;
                    const startDay = moment(); 
                    const endDay = moment(userBookingList.ev_slotstimings.slotdate);
                    totalDays = endDay.diff(startDay, 'days');
                    if (userBookingList.ev_event.reminder.includes(totalDays) &&
                        totalDays !== userBookingList.reminder_limit) {
                        event_remider_popup = 1
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
                            event_remider_popup = 1
                        };
                    }
                }
            })
        }
        obj['popup']['loginaggrement'] = loginaggrement;
        obj['popup']['event_remider_popup'] = event_remider_popup;
        obj['popup']['Questionnaireuser'] = Questionnaireuser;
        obj['popup']['agreement'] = agreement;
        obj['popup']['TokenReceivedPopup'] = TokenReceivedPopup;
        // obj['popup']['logouttimereceivedtoken'] = logouttimereceivedtoken;
        obj['popup']['reimbursement_form'] = reimbursement_form;
        obj['popup']['challengeRelayRace'] = challengeRelayRace;
        obj['popup']['loginpointsleaderboardpopup'] = loginpointsleaderboardpopup;
        obj['popup']['UserServeyPopupShow'] = UserServeyPopupShow;
        obj['popup']['activity_popup'] = activity_popup;
        obj['popup']['health_popup'] = health_popup;
        obj['popup']['editemailspaouse'] = editemailspaouse;
        obj['popup']['editemailspaouserequired'] = editemailspaouserequired;
        obj['popup']['SurveyRequired'] = SurveyRequired;
        obj['popup']['resetpop'] = reset_popup_status;
        obj['popup']['information_popup'] = info_pop_status;
        obj['popup']['information_popup_logo'] = information_popup_logo;
        obj['popup']['user_popup_status'] = userPopupStatus;
        // obj['popup']['pointsleaderboardpopup'] = pointsleaderboardpopup;
        obj['popup']['covidVaccinePopup'] = covidVaccinePopup;
        obj['popup']['covidQuestionsPopup'] = covidQuestionsPopup;
        obj['popup']['covidPassport'] = covidPassport;
        obj['popup']['first_login_by'] = first_login_by;
        obj['popup']['pre_first_login_by'] = pre_first_login_by;
        return obj.popup;
    })
    popup: any;
}

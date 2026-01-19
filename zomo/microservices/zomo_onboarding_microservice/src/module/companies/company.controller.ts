import { CommonService, appConstant } from '@common-constants';
import { Controller, Inject } from '@nestjs/common';
import { ClientProxy, MessagePattern, Payload } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { Not } from 'typeorm';
import { processStepUpdate } from '../../common/commonFunctions';
import { OnboardingService } from '../registration/onboarding.service';
import { UserService } from '../user/user.service';
import { UserSettingsService } from '../user/usersettings.service';
import { ActivePluginService } from './activeplugin.service';
import { CompanyService } from './company.service';
import { DashboardService } from './dashboard.service';
import { DepartmentService } from './department.service';
import { LocationService } from './location.service';
import { MetaService } from './meta.service';
import { OrgThemesService } from './orgthemes.service';
import { SettingsService } from './settings.service';
@Controller('organization')
export class CompanyController {
    constructor(
        private readonly companyService: CompanyService,
        private readonly commonService: CommonService,
        private readonly onboardingService: OnboardingService,
        private readonly companySettingsService: SettingsService,
        private readonly companyMetaService: MetaService,
        private readonly activePluginService: ActivePluginService,
        private readonly userService: UserService,
        private readonly locationService: LocationService,
        private readonly departmentService: DepartmentService,
        private readonly orgThemesService: OrgThemesService,
        private readonly dashboardService: DashboardService,
        private readonly userSettingsService: UserSettingsService,
        @Inject('COMMON_SERVICE')
        private commonMicroservice: ClientProxy,
    ) {}
    @MessagePattern({ cmd: 'verification-company' })
    async companyVerification(@Payload() data: any) {
        try {
            const { user, company_name } = data;
            const [companyExists, onboardCompanyExists] = await Promise.all([
                this.companyService.checkExists({
                    company_name: company_name,
                }),
                this.onboardingService.checkExists({
                    company_name: company_name,
                    id: Not(user.id),
                }),
            ]);
            if (companyExists || onboardCompanyExists) {
                throw new Error('Company name already exist');
            }
            return {
                success: true,
                message: 'Company name available',
                data: {},
            };
        } catch (error) {
            console.error('Company step error', error);
            return {
                success: false,
                message: error.message || 'Failed to save Company',
            };
        }
    }
    @MessagePattern({ cmd: 'company' })
    async company(@Payload() data: any) {
        try {
            const { user, step, ...stepData } = data;
            const onboardingID = user.id;
            const isUpdate = user?.steps_data?.company?.completed === 1;
            let org_id = user?.org_id || null;
            let user_id = user?.user_id || null;
            let orgCode = user?.org_code || null;
            let dept_id = user?.dept_id || null;
            let loc_id = user?.loc_id || null;

            if (stepData.company_name) {
                const [companyExists, onboardCompanyExists] = await Promise.all(
                    [
                        this.companyService.checkExists({
                            company_name: stepData.company_name,
                            ...(isUpdate && { id: Not(org_id) }),
                        }),
                        this.onboardingService.checkExists({
                            company_name: stepData.company_name,
                            id: Not(onboardingID),
                        }),
                    ],
                );

                if (companyExists || onboardCompanyExists) {
                    throw new Error('Company name already exists');
                }
            }

            let stepResult;
            ({ stepResult } = await processStepUpdate(
                this.onboardingService,
                user.id,
                step,
                { ...stepData },
                { company_name: stepData.company_name },
                isUpdate,
            ));

            if (stepResult?.completed !== 1) {
                const requiredFields = [
                    'company_name',
                    'company_logo',
                    'street_address',
                    'phone',
                    'email',
                    'theme_color',
                    'dashboard_data',
                ];

                const companyDetails = stepResult?.data ?? {};
                const allFieldsPresent = requiredFields.every(
                    (field) => field in companyDetails,
                );

                const isDashboardDataValid =
                    companyDetails.dashboard_data &&
                    Array.isArray(companyDetails.dashboard_data) &&
                    companyDetails.dashboard_data.every((item) => {
                        const hasValidImages =
                            item.square_img &&
                            item.mob_square_img &&
                            item.square_img.trim() !== '' &&
                            item.mob_square_img.trim() !== '';

                        const hasValidLinkSetting =
                            item.square_img_link_isin === 0 ||
                            item.square_img_link_isin === 1;

                        const isLinkValid =
                            (item.square_img_link_isin === 1 &&
                                item.square_img_link_id !== undefined &&
                                Number(item.square_img_link_id) > 0) ||
                            (item.square_img_link_isin === 0 &&
                                typeof item.square_img_link === 'string' &&
                                item.square_img_link.trim() !== '');

                        return (
                            hasValidImages && hasValidLinkSetting && isLinkValid
                        );
                    });

                if (!allFieldsPresent || !isDashboardDataValid) {
                    return {
                        success: true,
                        message: 'Company data saved successfully',
                        data: { steps_data: stepResult },
                    };
                }
            }
            const shouldUpsert = (fields: string | string[]) => {
                if (!isUpdate) return true;
                const list = Array.isArray(fields) ? fields : [fields];
                return list.some((f) => stepData[f] !== undefined);
            };
            const defaults = {
                street_address: '1980 Post Oak Blvd., Ste 100',
                city: 'Houston',
                state: 'TX',
                zip: '77001',
                country: 'United States',
            };
            const { street_address, city, state, zip, country } = {
                ...defaults,
                ...stepResult.data,
            };

            const assignUniqueCode = async (service, id, prefix) => {
                let code = this.commonService.generateCode(prefix, id);
                while (await service.checkExists({ code })) {
                    code = this.commonService.generateCode(prefix, id);
                }
                await service.updateRecord({ id }, { code });
                return code;
            };

            if (
                shouldUpsert([
                    'company_name',
                    'company_logo',
                    'street_address',
                    'phone',
                ])
            ) {
                const { entity: companyEntity } =
                    await this.companyService.upsert(
                        { id: org_id },
                        {
                            company_name: stepResult.data.company_name,
                            company_logo: stepResult.data.company_logo,
                            street_address,
                            city,
                            state,
                            zip,
                            country,
                            phone: stepResult.data.phone || '',
                        },
                    );
                org_id = companyEntity.id;
            }

            if (shouldUpsert('company_logo')) {
                const filename = stepResult.data.company_logo;
                if (filename) {
                    const copyJobs = [
                        {
                            s: `companylogos/onboarding/${onboardingID}/orginallogo/${filename}`,
                            d: `companylogos/${org_id}/orginallogo/${filename}`,
                        },
                        {
                            s: `companylogos/onboarding/${onboardingID}/${filename}`,
                            d: `companylogos/${org_id}/${filename}`,
                        },
                    ];
                    await Promise.all(
                        copyJobs.map(({ s, d }) =>
                            lastValueFrom(
                                this.commonMicroservice.send(
                                    { cmd: 'copy_file' },
                                    { source: s, destination: d },
                                ),
                            ),
                        ),
                    );
                }
            }

            if (!isUpdate) {
                orgCode = await assignUniqueCode(
                    this.companyService,
                    org_id,
                    'CI',
                );
            }

            const parallelJobs = [];

            if (shouldUpsert('website')) {
                parallelJobs.push(
                    this.companyMetaService.upsert(
                        { org_id },
                        { website: stepResult.data.website || '' },
                    ),
                );
            }
            if (shouldUpsert('theme_color')) {
                parallelJobs.push(
                    this.orgThemesService.upsert(
                        { org_id },
                        {
                            theme_id: 3,
                            iscustomized: 0,
                            bodycolor: stepResult.data.theme_color,
                            bodyfontcolor: stepResult.data.theme_color,
                            status: 1,
                        },
                    ),
                );
            }
            if (!isUpdate) {
                parallelJobs.push(
                    this.activePluginService.upsert(
                        { company_id: org_id },
                        {
                            plugin_name: JSON.stringify(
                                appConstant.DEFAULT_PLUGINS,
                            ),
                        },
                    ),
                );
                parallelJobs.push(
                    this.companySettingsService.upsert(
                        { org_id },
                        { health_form_mail: 1 },
                    ),
                );
            }

            await Promise.all(parallelJobs);

            if (shouldUpsert('company_name')) {
                const dept_name = `${stepResult.data.company_name}_Default`;
                const { entity: dept } = await this.departmentService.upsert(
                    { company_id: org_id, default_dept: 'Yes' },
                    { dept_name },
                );
                dept_id = dept.id;
                if (!isUpdate) {
                    await assignUniqueCode(
                        this.departmentService,
                        dept.id,
                        'D',
                    );
                }
            }

            if (shouldUpsert('street_address')) {
                const location_name = [
                    street_address,
                    city,
                    state,
                    zip,
                    country,
                ]
                    .filter(Boolean)
                    .join(', ');

                const { entity: loc } = await this.locationService.upsert(
                    { company_id: org_id, is_default: 1 },
                    {
                        location_name,
                        lname: street_address,
                        address1: street_address,
                        city,
                        state,
                        zip,
                        country,
                    },
                );
                loc_id = loc.id;
                if (!isUpdate) {
                    await assignUniqueCode(this.locationService, loc.id, 'L');
                }
            }
            // console.log('isUpdate', isUpdate);
            if (!isUpdate) {
                const dob18 = (() => {
                    const d = new Date();
                    d.setFullYear(d.getFullYear() - 18);
                    return d.toISOString().split('T')[0];
                })();
                const { first_name, last_name, email, password } = user;

                const { entity: createdUser } = await this.userService.upsert(
                    { id: user.user_id },
                    {
                        first_name,
                        last_name,
                        email,
                        new_password: password,
                        password: '',
                        location: loc_id,
                        department_id: dept_id,
                        dob: user.dob || dob18,
                        role_id: 11,
                        username: user.email,
                        middle_name: '',
                        num_login: 0,
                        status: 1,
                        updated_by: 0,
                        org_id,
                        membership_code: orgCode,
                        onboarding: 1,
                    },
                );
                user_id = createdUser.id;
                await assignUniqueCode(this.userService, user_id, 'U');
            }

            if (shouldUpsert('street_address')) {
                await this.userSettingsService.upsert(
                    { user_id },
                    {
                        wphone: stepResult.data.phone || '',
                        cphone: stepResult.data.phone || '',
                        hphone: stepResult.data.phone || '',
                        address: street_address,
                        city,
                        state,
                        zip,
                        country,
                    },
                );
            }

            if (!isUpdate) {
                stepResult = (
                    await processStepUpdate(
                        this.onboardingService,
                        user.id,
                        step,
                        { ...stepData, completed: 1 },
                        { org_id, user_id, dept_id, loc_id, org_code: orgCode },
                        true,
                    )
                ).stepResult;
            }
            stepResult.completed = 1;

            return {
                success: true,
                message: 'Company data saved successfully',
                data: { steps_data: stepResult },
            };
        } catch (error) {
            console.error('Company step error', error);
            return {
                success: false,
                message: error.message || 'Failed to save Company',
            };
        }
    }
    @MessagePattern({ cmd: 'addDashboardData' })
    async addDashboardData(@Payload() data: any) {
        try {
            const { user, step, ...stepData } = data;
            const stepResult = user.steps_data.company;
            const onboardingID = user.id;
            const org_id = user.org_id;
            if (Array.isArray(stepResult.data.dashboard_data)) {
                const dashboards = await Promise.all(
                    stepResult.data.dashboard_data.map(async (d) => {
                        const clone = { ...d, org_id };
                        for (const key of ['square_img', 'mob_square_img']) {
                            if (clone[key]) {
                                const newDest = clone[key].replace(
                                    `dashboardimages/onboarding/${onboardingID}`,
                                    `dashboardimages/${org_id}`,
                                );
                                await lastValueFrom(
                                    this.commonMicroservice.send(
                                        { cmd: 'copy_file' },
                                        {
                                            source: clone[key],
                                            destination: newDest,
                                        },
                                    ),
                                );
                                clone[key] = newDest;
                            } else {
                                clone[key] = '';
                            }
                        }
                        for (const linkField of [
                            'square_img_link_isin',
                            'square_img_link_id',
                            'square_img_link',
                        ]) {
                            if (!clone[linkField]) {
                                clone[linkField] = '';
                            }
                        }
                        return { ...clone, added_by: 1 };
                    }),
                );
                await this.dashboardService.createMany(dashboards);
            }
            return {
                success: true,
                message: 'Dashboard data saved successfully',
                data: { steps_data: stepResult },
            };
        } catch (error) {
            console.error('Wellness error', error);
            return {
                success: false,
                message: error.message || 'Failed to save Wellness',
            };
        }
    }
}

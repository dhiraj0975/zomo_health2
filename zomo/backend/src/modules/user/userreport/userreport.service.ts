import { appConstant, CommonDateService, tableConstant, CommonFileService } from "@common-constants";
import { Injectable } from "@nestjs/common";
import { CensusCustomFieldsService } from "src/modules/company/censuscustomfields/censuscustomfields.service";
import { CensusCustomFieldsValuesService } from "src/modules/company/censuscustomfieldsvalues/censuscustomfieldsvalues.service";
import { CompanyService } from "src/modules/company/companies/company.service";
import { In } from "typeorm";
import { UserService } from "../user/user.service";
import { DepartmentService } from "../../company/departments/department.service";
import { LocationService } from "../../company/locations/location.service";
const path = require('path');

@Injectable()
export class UserReportService {
    constructor(
        private readonly companyService: CompanyService,
        private readonly commonDateService: CommonDateService,
        private readonly censusCustomFieldsService: CensusCustomFieldsService,
        private readonly censusCustomFieldsValuesService: CensusCustomFieldsValuesService,
        private readonly userService: UserService,
        private readonly departmentService: DepartmentService,
        private readonly locationService: LocationService,
        private readonly commonFileService: CommonFileService,
    ) {}

    // userreport.service.ts

    async buildUserExport(orgId: number) {
        // 1. Download template JSON
        const jsonData = await this.download_template(orgId);
        const jsonString = JSON.stringify(jsonData, null, 2);

        // 2. Company info
        const companyData = await this.companyService.findOne(
            `company.id = ${orgId}`,
            [tableConstant.COMPANIES.TBL_COMPANY_SETTINGS],
            ["company.company_name"]
        );
        const companyName: string = companyData?.company_name ?? "";

        // 3. File handling
        const fileName = `${companyName.replace(/\s/g, "_")}_Census_Upload_Template.json`;
        const filePath = path.join(appConstant.CENSUS_FILE_PATH);

        await this.commonFileService.dirIsExist(filePath);

        let finalFile: string;
        let data: string;

        try {
            // write JSON
            const writeFile = await this.commonFileService.writeFile(filePath, jsonString, fileName);
            if (writeFile?.status !== "success") {
                throw new Error("Failed to write JSON file");
            }

            // convert JSON → XLSX (python script)
            const excelData: any = await this.commonFileService.createJsonToFile(
                1,
                `${filePath}/${fileName}`,
                "pythonjsontoxlsx.py"
            );
            if (excelData?.status !== "success") {
                throw new Error("Python script failed to create XLSX");
            }

            // replace extension
            finalFile = `${filePath}/${fileName}`.replace(".json", ".xlsx");

            if (!(await this.commonFileService.fileExist(finalFile))) {
                throw new Error("XLSX file does not exist");
            }

            // convert to Base64
            data = await this.commonFileService.FileToBase64(finalFile);
        } finally {
            // cleanup JSON + XLSX
            await Promise.allSettled([
                this.commonFileService.removeFileFromLocal(`${filePath}/${fileName}`),
                this.commonFileService.removeFileFromLocal(finalFile ?? "")
            ]);
        }

        return {
            excel_data: data,
            sheet_name: fileName.replace(".json", ""),
            extension: "xlsx"
        };
    }

    // userreport.service.ts

    private async download_template(orgId: number) {
        // 1. Company details
        const companyData = await this.companyService.findOne(
            `company.id = ${orgId}`,
            [tableConstant.COMPANIES.TBL_COMPANY_SETTINGS],
            [
                "company.company_name",
                "company.code",
                "companySetting.census_status",
                "companySetting.spouse_option"
            ]
        );

        const membership_code = companyData?.code || "";
        const censusStatus = companyData?.companySetting?.census_status || 0;
        const spouseOption = companyData?.companySetting?.spouse_option || 0;

        // 2. Census setup
        let censusFieldValueMap: Record<string, any> = {};
        let censusFieldTemplate: Record<string, string> = {};

        if (censusStatus === 1) {
            const censusFields = await this.censusCustomFieldsService.listRecord(
                ["id", "title"],
                { status: "1", organization_id: orgId }
            );

            if (censusFields.length > 0) {
                const fieldIds = censusFields.map((f) => Number(f.id));
                censusFieldTemplate = Object.fromEntries(
                    censusFields.map((f) => [f.title, ""])
                );

                const censusValues = await this.censusCustomFieldsValuesService.listRecord(
                    ["field_id", "field_value", "user_id"],
                    { status: "1", organization_id: orgId, field_id: In(fieldIds) }
                );

                for (const { user_id, field_id, field_value } of censusValues) {
                    const fieldTitle = censusFields.find((f) => f.id == field_id)?.title; // use == not ===
                    if (!fieldTitle) continue;

                    const key = String(user_id);  // normalize key
                    if (!censusFieldValueMap[key]) censusFieldValueMap[key] = {};
                    censusFieldValueMap[key][fieldTitle] = field_value;
                }
                /*console.log("Fetched census fields:", censusFields);
                console.log("Fetched census values:", censusValues.slice(0, 5));
                console.log("User IDs in census:", [...new Set(censusValues.map(v => v.user_id))].slice(0, 5));*/
            }
        }

        // 3. Fetch users
        const userData = await this.userService.listRecordTemplate(
            {
                org_id: orgId,
                role_id: In([2, 16])
            },
            null,
            [
                "user.id",
                "user.role_id",
                "user.department_id",
                "user.status",
                "user.relationship_id",
                "user.username",
                "user.first_name",
                "user.middle_name",
                "user.last_name",
                "user.securitycode",
                "user.dob",
                "user.date_of_hire",
                "user.on_insurance_plan",
                "user.insurance_plan_name",
                "user.email",
                "user.employeeid",
                "user.gender",
                "user.code",
                "user.is_camp_eligible",
                "user.location",
                "settings.jobtitle",
                "settings.wphone",
                "settings.wphone_ext",
                "settings.hphone",
                "settings.cphone",
                "settings.address",
                "settings.address2",
                "settings.city",
                "settings.state",
                "settings.zip",
                "settings.country",
                "settings.email_receiving",
                "settings.email_update"
            ]
        );
        /*console.log("User IDs in userData:", userData.map(u => u.id).slice(0, 5));*/
        const headerData = appConstant.HEADER_DATA;
        const jsonData: any[] = [];

        const userStatuses = { 1: "Current", 2: "Terminated", 3: "Retired", 4: "Extended Leave" };
        const genderMap = { m: "Male", f: "Female", o: "Other" };
        const insurancePlanMap = { yes: "Yes", y: "Yes", no: "No", n: "No" };

        const deptIds = [...new Set(userData.map(u => u.department_id).filter(Boolean))];
        const locIds = [...new Set(userData.map(u => u.location).filter(Boolean))];

        const departments = await this.departmentService.listRecord([
            { id: In(deptIds), deleted: 0, company_id: orgId },
            { default_dept: 'Yes', deleted: 0, company_id: orgId }
        ]);
        const deptMap = new Map(departments.map(d => [d.id, d]));
        const defaultDept = departments.find(d => d.default_dept === 'Yes');

        const locations = await this.locationService.listRecord(
            ['id', 'code', 'location_name', 'address1', 'address2', 'city', 'state', 'zip', 'country', 'is_default', 'lname'],
            [
                { id: In(locIds), deleted: 0, company_id: orgId },
                { is_default: 1, deleted: 0, company_id: orgId }
            ]
        );
        const locMap = new Map(locations.map(l => [l.id, l]));
        const defaultLoc = locations.find(l => l.is_default === 1);

        for (const user of userData) {
            const {
                id,
                role_id,
                department_id,
                status,
                relationship_id,
                username,
                first_name,
                middle_name,
                last_name,
                securitycode,
                dob,
                date_of_hire,
                on_insurance_plan,
                insurance_plan_name,
                email,
                settings,
                employeeid,
                gender,
                code,
                is_camp_eligible,
                location
            } = user;

            const userStatus = userStatuses[status] || "Terminated";
            const relationshipCode =
                role_id === appConstant.ROLE.SPOUSE
                    ? spouseOption === 1
                        ? "Spouse / Domestic Partner"
                        : "Spouse"
                    : "";

            const genderStr = genderMap[gender?.toLowerCase()] || "";
            const onInsurancePlanStr = insurancePlanMap[on_insurance_plan?.toLowerCase()] || "";

            const dept = deptMap.get(department_id) || defaultDept;
            const loc = locMap.get(user.location) || defaultLoc;
            if (loc?.country === "United States") loc.country = "USA";
            if (settings?.country === "United States") settings.country = "USA";

            let cleanSecurityCode = securitycode;
            if (securitycode && securitycode.length > 11) {
                cleanSecurityCode = Buffer.from(securitycode, "base64").toString().trim();
            }

            const row: any = {
                [headerData["A"]]: dept?.dept_name || "",
                [headerData["B"]]: userStatus,
                [headerData["C"]]: relationshipCode,
                [headerData["D"]]: relationship_id || "",
                [headerData["E"]]: role_id,
                [headerData["F"]]: "", // supervisor_id placeholder
                [headerData["G"]]: username || "",
                [headerData["H"]]: first_name || "",
                [headerData["I"]]: middle_name || "",
                [headerData["J"]]: last_name || "",
                [headerData["K"]]: settings?.jobtitle || "",
                [headerData["L"]]: cleanSecurityCode || "",
                [headerData["M"]]: employeeid || "",
                [headerData["N"]]: genderStr,
                [headerData["O"]]: await this.commonDateService.DateTimeFormat(dob, "MM-DD-YYYY"),
                [headerData["P"]]: await this.commonDateService.DateTimeFormat(date_of_hire, "MM-DD-YYYY"),
                [headerData["Q"]]: onInsurancePlanStr,
                [headerData["R"]]: insurance_plan_name || "",
                [headerData["S"]]: email || "",
                [headerData["T"]]: settings?.wphone || "",
                [headerData["U"]]: settings?.wphone_ext || "",
                [headerData["V"]]: loc?.lname || "",
                [headerData["W"]]: loc?.address1 || "",
                [headerData["X"]]: loc?.address2 || "",
                [headerData["Y"]]: loc?.city || "",
                [headerData["Z"]]: loc?.state || "",
                [headerData["AA"]]: loc?.zip || "",
                [headerData["AB"]]: loc?.country || "",
                [headerData["AC"]]: settings?.hphone && settings.hphone !== "0" ? settings.hphone : "",
                [headerData["AD"]]: settings?.cphone || "",
                [headerData["AE"]]: settings?.address || "",
                [headerData["AF"]]: settings?.address2 || "",
                [headerData["AG"]]: settings?.city || "",
                [headerData["AH"]]: settings?.state || "",
                [headerData["AI"]]: settings?.zip || "",
                [headerData["AJ"]]: settings?.country || "",
                [headerData["AK"]]: code || "",
                [headerData["AL"]]: is_camp_eligible === 1 ? "Yes" : "No",
                [headerData["AM"]]: settings?.email_receiving === 1 ? "Yes" : "No",
                [headerData["AN"]]: settings?.email_update === 1 ? "Yes" : "No"
            };
            if (censusStatus === 1) {
                const censusValues = censusFieldValueMap[String(id)] || {};
                Object.assign(row, { ...censusFieldTemplate, ...censusValues });
            }
            jsonData.push(row);
        }
        return jsonData;
    }

}
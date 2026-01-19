import { lastValueFrom } from 'rxjs';
import * as jwt from 'jsonwebtoken';
import { ClientProxy } from '@nestjs/microservices';
const merge = require('lodash.merge');

export function generateOtp(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

export async function sendOtpEmail(
    client: ClientProxy,
    email: string,
    subject: string,
    message: string,
    retries: number = 3,
): Promise<void> {
    try {
        const emailDetails = { receiver: email, subject, template: message };

        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                await lastValueFrom(
                    client.send({ cmd: 'send_email' }, emailDetails),
                );
                return;
            } catch (error) {
                if (attempt === retries) {
                    throw error;
                }
                await new Promise((resolve) =>
                    setTimeout(resolve, 1000 * attempt),
                ); // Exponential backoff
            }
        }
    } catch (error) {
        throw new Error(`Email sending failed: ${error.message}`);
    }
}

export function generateJwtToken(payload: any): string {
    const secret =
        process.env.SECRET_KEY_PROD ||
        process.env.JWT_SECRET ||
        'your-secret-key';
    return jwt.sign(payload, secret, {
        expiresIn: '10d',
        issuer: 'zomo-onboarding',
        audience: 'zomo-users',
    });
}

// updateStepsData.ts
export function updateStepsData(
    existing: any,
    step: string,
    submittedData: Record<string, any> = {},
    finalize = true,
): any {
    if (!existing || !step) {
        throw new Error('Invalid parameters for step update');
    }

    const { completed: submittedCompleted, ...data } = submittedData;
    const previousData = existing.steps_data?.[step]?.data || {};
    const version = (existing.steps_data?.[step]?.version || 0) + 1;
    const timestamp = new Date().toISOString();

    const completed = finalize && submittedCompleted === 1 ? 1 : 0;
    const dataEntry =
        finalize && ['company', 'invitation'].includes(step) && completed
            ? 1
            : 0;

    const mergeUpdatedData = merge({}, previousData, data);

    return {
        ...existing.steps_data,
        [step]: {
            completed,
            timestamp,
            dataEntry,
            data: mergeUpdatedData,
            version,
        },
    };
}

export async function processStepUpdate(
    onboardingService: any,
    userId: number,
    step: string,
    stepData: Record<string, any>,
    extraUpdates: Record<string, any> = {},
    finalize = true,
) {
    if (!userId || !step) {
        throw new Error('User ID and step are required');
    }
    const user = await onboardingService.getOne({ id: userId });
    if (!user) throw new Error('User not found');

    const updatedSteps = updateStepsData(user, step, stepData, finalize);

    const stepSequence: Record<string, string> = {
        company: 'wellness',
        wellness: 'user',
        user: 'agreement',
        agreement: 'payment',
        payment: 'invitation',
        invitation: 'completed',
        done: 'completed',
    };

    const currentStepCompleted = updatedSteps[step]?.completed;
    const nextStep = currentStepCompleted ? stepSequence[step] || step : step;

    await onboardingService.updateRecord(
        { id: userId },
        {
            current_step: nextStep,
            steps_data: updatedSteps,
            ...extraUpdates,
        },
    );

    return { user, stepResult: updatedSteps[step], updatedSteps };
}

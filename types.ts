export interface TrialRecord {
    id: string;
    studentName: string;
    wechatId?: string;
    school?: string;
    consultant?: string;
    groupName?: string;
    trialTime: string; // ISO String
    
    // Status
    isTrialCompleted: boolean;
    
    // Payment
    paymentTime: string | null;
    paymentScreenshot: string | null; // Base64
    
    // Enrollment
    isEnrolled: boolean;
    enrollmentDate: string | null;
    
    // Bonus
    bonusAmount: string; // Stored as string to handle empty inputs easily
    bonusPaymentTime: string | null;
    bonusScreenshot: string | null; // Base64
    
    createdAt: string;
}

export type RecordUpdate = Partial<TrialRecord>;

export type ViewState = 'list' | 'detail' | 'stats' | 'add';

export interface CalendarPromptState {
    record: TrialRecord;
    type: 'PLAN' | 'DONE';
}

export interface DetailModalState {
    title: string;
    items: TrialRecord[];
    type: 'TRIAL' | 'BONUS' | 'CONSULTANT';
}

export interface ConsultantStats {
    displayName: string;
    trials: number;
    enrolled: number;
    records: TrialRecord[];
}
import React, { useRef } from 'react';
import Icon from './Icon';
import { TrialRecord } from '../types';

// --- Helper Functions ---
export const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

export const toInputDateTime = (isoString: string | null) => {
    if (!isoString) return '';
    if (isoString.includes('T')) return isoString.substring(0, 16);
    return isoString;
};

export const formatDateTimeDisplay = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
};

export const normalizeName = (name: string | undefined) => (name || '未记录').trim().toLowerCase();

export const downloadICS = (record: TrialRecord, type: 'PLAN' | 'DONE' = 'PLAN') => {
    const { studentName, trialTime, school, consultant } = record;
    if (!trialTime) { alert("未设置试听时间"); return; }
    const startDate = new Date(trialTime);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); 
    const formatICSDate = (date: Date) => date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const now = new Date();
    const titlePrefix = type === 'DONE' ? '✅ [已完成] ' : '📅 [计划] ';
    const uidSuffix = type === 'DONE' ? 'done' : 'plan';
    const icsContent = [
        'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//TrialTracker//CN', 'BEGIN:VEVENT',
        `UID:${record.id || now.getTime()}-${uidSuffix}@trialtracker`,
        `DTSTAMP:${formatICSDate(now)}`, `DTSTART:${formatICSDate(startDate)}`, `DTEND:${formatICSDate(endDate)}`,
        `SUMMARY:${titlePrefix}试听：${studentName}`,
        `DESCRIPTION:状态：${type === 'DONE' ? '已实际试听' : '计划中'}\\n顾问：${consultant || '未填写'}\\n学校：${school || '未填写'}`,
        'END:VEVENT', 'END:VCALENDAR'
    ].join('\r\n');
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `${type === 'DONE' ? '实际' : '计划'}试听_${studentName}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

// --- Components ---

interface ClearableDateInputProps {
    label: string;
    value: string | null;
    onChange: (value: string | null) => void;
}

export const ClearableDateInput: React.FC<ClearableDateInputProps> = ({ label, value, onChange }) => {
    const safeValue = toInputDateTime(value);
    return (
        <div className="mb-3">
            <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
            <div className="flex gap-2">
                <input type="datetime-local" className="flex-1 border border-gray-300 rounded-md shadow-sm p-2 text-sm focus:ring-indigo-500 focus:border-indigo-500" value={safeValue} onChange={(e) => onChange(e.target.value)} />
                {safeValue && <button type="button" onClick={() => onChange(null)} className="p-2 text-red-500 hover:bg-red-50 border border-red-100 rounded-md transition-colors"><Icon name="Trash2" size={16} /></button>}
            </div>
        </div>
    );
};

interface ImageUploaderProps {
    label: string;
    value: string | null;
    onChange: (value: string | null) => void;
    disabled?: boolean;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ label, value, onChange, disabled }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => onChange(reader.result as string); 
        reader.readAsDataURL(file);
    };
    return (
        <div className="mb-4">
            <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
            {value ? (
                <div className="relative group">
                    <img src={value} alt="Proof" className="w-full h-32 object-cover rounded-md border border-gray-300 shadow-sm" />
                    {!disabled && <button onClick={() => onChange(null)} className="absolute top-2 right-2 bg-red-600 text-white p-1.5 rounded-full shadow-lg hover:bg-red-700 transition-colors"><Icon name="Trash2" size={14} /></button>}
                </div>
            ) : (
                <button onClick={() => fileInputRef.current?.click()} disabled={disabled} className="w-full h-20 border-2 border-dashed border-gray-300 bg-gray-50 rounded-md flex flex-col items-center justify-center text-gray-500 hover:bg-indigo-50">
                    <Icon name="Upload" size={18} className="mb-1" />
                    <span className="text-xs">点击上传截图</span>
                    <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                </button>
            )}
        </div>
    );
};

export const StatusBarTriad: React.FC<{ record: TrialRecord }> = ({ record }) => {
    const isTrialCompleted = !!record.isTrialCompleted;
    const isFeePaid = !!record.paymentTime || !!record.paymentScreenshot;
    const isEnrolled = !!record.isEnrolled;
    const isBonusPaid = !!record.bonusPaymentTime || !!record.bonusScreenshot;
    const baseClass = "flex-1 flex flex-col items-center justify-center py-2.5 border-r border-gray-100 last:border-0 transition-colors";
    return (
        <div className="flex border-t border-gray-100 bg-white">
            <div className={`${baseClass} ${isTrialCompleted ? 'bg-blue-50' : ''}`}>
                <div className={`flex items-center gap-1 text-xs font-bold ${isTrialCompleted ? 'text-blue-700' : 'text-gray-400'}`}>
                    {isTrialCompleted ? <Icon name="CheckSquare" size={14}/> : <Icon name="Clock" size={14}/>}
                    {isTrialCompleted ? '已完课' : '待试听'}
                </div>
            </div>
            <div className={`${baseClass} ${isFeePaid ? 'bg-green-50' : ''}`}>
                <div className={`flex items-center gap-1 text-xs font-bold ${isFeePaid ? 'text-green-700' : 'text-gray-400'}`}>
                    <Icon name="DollarSign" size={14} />
                    {isFeePaid ? '费已付' : '费未付'}
                </div>
            </div>
            <div className={`${baseClass} ${isBonusPaid ? 'bg-pink-50' : (isEnrolled ? 'bg-indigo-50' : '')}`}>
                <div className={`flex items-center gap-1 text-xs font-bold ${isBonusPaid ? 'text-pink-700' : (isEnrolled ? 'text-indigo-700' : 'text-gray-400')}`}>
                    {isEnrolled ? <Icon name="CheckCircle" size={14}/> : <Icon name="User" size={14}/>}
                    {isBonusPaid ? '奖金已发' : (isEnrolled ? '已报名' : '未报名')}
                </div>
            </div>
        </div>
    );
};

interface FilterBtnProps {
    label: string;
    active: boolean;
    alert?: boolean;
    onClick: () => void;
}

export const FilterBtn: React.FC<FilterBtnProps> = ({ label, active, alert, onClick }) => (
    <button onClick={onClick} className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${active ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : (alert ? 'bg-white text-orange-600 border-orange-200' : 'bg-white text-gray-600 border-gray-200')}`}>
        {alert && !active && <Icon name="AlertCircle" size={10} className="inline mr-1 mb-0.5"/>}
        {label}
    </button>
);
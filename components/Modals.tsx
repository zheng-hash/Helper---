import React, { useState, useEffect } from 'react';
import Icon from './Icon';
import { TrialRecord, RecordUpdate } from '../types';
import { downloadICS, toInputDateTime } from './Shared';
import { TRIAL_FEE_FIXED } from '../constants';

export const CalendarPromptModal: React.FC<{
    isOpen: boolean;
    record: TrialRecord | null;
    type: 'PLAN' | 'DONE';
    onConfirm: () => void;
    onCancel: () => void;
}> = ({ isOpen, record, type, onConfirm, onCancel }) => {
    if (!isOpen || !record) return null;
    const isDoneType = type === 'DONE';
    return (
        <div className="fixed inset-0 bg-black/50 z-[80] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm animate-slide-up text-center">
                <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4 ${isDoneType ? 'bg-green-100' : 'bg-blue-100'}`}>
                    <Icon name="CalendarCheck" className={isDoneType ? 'text-green-600' : 'text-blue-600'} size={24} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{isDoneType ? '试听已完成！' : '试听已安排！'}</h3>
                <p className="text-sm text-gray-500 mb-6">是否在日历中添加 <span className="font-bold text-gray-800">{isDoneType ? '✅ 实际完课记录' : '📅 计划试听行程'}</span>？</p>
                <div className="flex gap-3">
                    <button onClick={onCancel} className="flex-1 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50">暂不添加</button>
                    <button onClick={() => { downloadICS(record, type); onConfirm(); }} className={`flex-1 py-2.5 text-white rounded-lg font-bold shadow-md flex items-center justify-center gap-2 ${isDoneType ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                        <Icon name="Calendar" size={16} /> 添加到日历
                    </button>
                </div>
            </div>
        </div>
    );
};

export const DeleteConfirmModal: React.FC<{
    isOpen: boolean;
    recordName?: string;
    onConfirm: () => void;
    onCancel: () => void;
}> = ({ isOpen, recordName, onConfirm, onCancel }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm animate-slide-up text-center">
                <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4"><Icon name="Trash2" className="text-red-600" size={24} /></div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">确认删除?</h3>
                <p className="text-sm text-gray-500 mb-6">您确定要删除 <span className="font-bold text-gray-800">{recordName}</span> 的记录吗？<br />此操作无法撤销。</p>
                <div className="flex gap-3">
                    <button onClick={onCancel} className="flex-1 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50">取消</button>
                    <button onClick={onConfirm} className="flex-1 py-2.5 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 shadow-md">确认删除</button>
                </div>
            </div>
        </div>
    );
};

export const EditInfoModal: React.FC<{
    isOpen: boolean;
    record: TrialRecord | null;
    onSave: (data: Partial<TrialRecord>) => void;
    onCancel: () => void;
}> = ({ isOpen, record, onSave, onCancel }) => {
    const [formData, setFormData] = useState<Partial<TrialRecord>>({});
    useEffect(() => {
        if (record) {
            setFormData({
                studentName: record.studentName || '',
                wechatId: record.wechatId || '',
                school: record.school || '',
                consultant: record.consultant || '',
                groupName: record.groupName || '',
                trialTime: toInputDateTime(record.trialTime) || '',
            });
        }
    }, [record]);
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white w-full sm:max-w-md rounded-t-xl sm:rounded-xl shadow-2xl overflow-hidden animate-slide-up h-[90vh] sm:h-auto flex flex-col">
                <div className="bg-indigo-600 p-4 text-white flex justify-between items-center shrink-0">
                    <h3 className="font-bold flex items-center gap-2"><Icon name="Edit2" size={18} /> 修改基本信息</h3>
                    <button onClick={onCancel}><Icon name="X" size={20} /></button>
                </div>
                <div className="p-6 space-y-4 overflow-y-auto flex-1">
                    <div><label className="block text-xs font-bold text-gray-500 mb-1">学生姓名</label><input className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500" value={formData.studentName} onChange={e => setFormData({ ...formData, studentName: e.target.value })} /></div>
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className="block text-xs font-bold text-gray-500 mb-1">试听时间</label><input type="datetime-local" className="w-full border border-gray-300 rounded-lg p-2.5 text-xs" value={formData.trialTime} onChange={e => setFormData({ ...formData, trialTime: e.target.value })} /></div>
                        <div><label className="block text-xs font-bold text-gray-500 mb-1">顾问</label><input className="w-full border border-gray-300 rounded-lg p-2.5" value={formData.consultant} onChange={e => setFormData({ ...formData, consultant: e.target.value })} /></div>
                    </div>
                    <input placeholder="微信号" className="w-full border border-gray-300 rounded-lg p-2.5" value={formData.wechatId} onChange={e => setFormData({ ...formData, wechatId: e.target.value })} />
                    <input placeholder="学校" className="w-full border border-gray-300 rounded-lg p-2.5" value={formData.school} onChange={e => setFormData({ ...formData, school: e.target.value })} />
                    <input placeholder="群名" className="w-full border border-gray-300 rounded-lg p-2.5" value={formData.groupName} onChange={e => setFormData({ ...formData, groupName: e.target.value })} />
                </div>
                <div className="p-4 border-t border-gray-100 bg-gray-50 shrink-0">
                    <button onClick={() => onSave(formData)} className="w-full py-3 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 shadow-md flex items-center justify-center gap-2"><Icon name="Save" size={18} /> 保存修改</button>
                </div>
            </div>
        </div>
    );
};

export const DetailsListModal: React.FC<{
    isOpen: boolean;
    title: string;
    items: TrialRecord[];
    type: 'TRIAL' | 'BONUS' | 'CONSULTANT';
    onClose: () => void;
    onSelectRecord: (r: TrialRecord) => void;
}> = ({ isOpen, title, items, type, onClose, onSelectRecord }) => {
    if (!isOpen) return null;
    const isTrial = type === 'TRIAL';
    const isConsultant = type === 'CONSULTANT';
    return (
        <div className="fixed inset-0 bg-black/50 z-[90] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm animate-slide-up flex flex-col max-h-[80vh]">
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2 text-lg">
                        {isConsultant ? <Icon name="Briefcase" size={20} className="text-blue-500" /> : (isTrial ? <Icon name="DollarSign" size={20} className="text-green-500" /> : <Icon name="Gift" size={20} className="text-pink-500" />)}
                        {title}
                    </h3>
                    <button onClick={onClose}><Icon name="X" size={20} className="text-gray-400 hover:text-gray-600" /></button>
                </div>
                <div className="overflow-y-auto flex-1 space-y-2">
                    {items.length === 0 ? <p className="text-gray-400 text-center py-8 text-sm bg-gray-50 rounded-lg">暂无记录</p> : items.map((item, idx) => (
                        <div key={idx} onClick={() => onSelectRecord(item)} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors cursor-pointer group">
                            <div className="flex-1">
                                <div className="font-bold text-gray-800 text-sm flex items-center gap-2">
                                    {item.studentName}
                                    {isConsultant && <span className={`text-[10px] px-1.5 py-0.5 rounded ${item.isEnrolled ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>{item.isEnrolled ? '已报名' : '试听'}</span>}
                                    <Icon name="ChevronRight" size={14} className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                                <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">{!isConsultant && <><Icon name="User" size={10} /> {item.consultant || '无顾问'} <span className="text-gray-300">|</span></>}<span className="truncate">{new Date(item.trialTime).toLocaleDateString()}</span></div>
                            </div>
                            <div className="text-right">
                                {isConsultant ? <div className="text-xs font-bold text-gray-600">${(item.paymentTime ? TRIAL_FEE_FIXED : 0) + (item.isEnrolled ? Number(item.bonusAmount || 0) : 0)}</div> : <div className="font-mono font-bold text-gray-700 text-sm">${isTrial ? TRIAL_FEE_FIXED : item.bonusAmount}</div>}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="mt-4 pt-3 border-t text-right text-xs text-gray-500 flex justify-between items-center">
                    <span>共 {items.length} 笔</span>
                    {isConsultant ? <span className="text-base font-bold text-gray-900">产出: ${items.reduce((sum, i) => sum + (i.paymentTime ? TRIAL_FEE_FIXED : 0) + (i.isEnrolled ? Number(i.bonusAmount || 0) : 0), 0).toLocaleString()}</span> : <span className="text-base font-bold text-gray-900">${items.reduce((sum, i) => sum + (isTrial ? TRIAL_FEE_FIXED : Number(i.bonusAmount)), 0).toLocaleString()}</span>}
                </div>
            </div>
        </div>
    );
};

export const AIAdvisorModal: React.FC<{ isOpen: boolean; records: TrialRecord[]; onClose: () => void }> = ({ isOpen, records, onClose }) => {
    const [analysis, setAnalysis] = useState('');
    const [loading, setLoading] = useState(false);
    
    // Mock AI for offline functionality as requested
    useEffect(() => {
        if (isOpen && !analysis) {
            setLoading(true);
            setTimeout(() => {
                setAnalysis("AI 分析功能需要在线环境和 API Key。当前为离线版，请使用统计面板查看详细数据。");
                setLoading(false);
            }, 1000);
        }
    }, [isOpen, analysis]);

    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-slide-up flex flex-col max-h-[80vh]">
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 text-white flex justify-between items-center shrink-0">
                    <h3 className="font-bold flex items-center gap-2"><Icon name="Sparkles" size={20} /> AI 智能经营顾问</h3>
                    <button onClick={onClose}><Icon name="X" size={20} /></button>
                </div>
                <div className="p-6 overflow-y-auto flex-1">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-10 space-y-4"><Icon name="Loader2" className="animate-spin text-purple-600" size={40} /><p className="text-gray-500 animate-pulse">正在分析您的业务数据...</p></div>
                    ) : (
                        <div className="prose prose-sm max-w-none">
                            <div className="flex items-start gap-3 mb-4">
                                <div className="bg-purple-100 p-2 rounded-full"><Icon name="Bot" className="text-purple-600" size={24} /></div>
                                <div className="bg-gray-50 p-4 rounded-xl rounded-tl-none border border-gray-100 text-gray-800 leading-relaxed whitespace-pre-wrap">{analysis}</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
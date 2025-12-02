import React, { useState } from 'react';
import { TrialRecord, ViewState, CalendarPromptState } from './types';
import { APP_STORAGE_KEY } from './constants';
import Icon from './components/Icon';
import { generateId, formatDateTimeDisplay, StatusBarTriad, FilterBtn, ClearableDateInput, ImageUploader, toInputDateTime } from './components/Shared';
import StatisticsView from './components/StatisticsView';
import SyncManager from './components/SyncManager';
import { CalendarPromptModal, DeleteConfirmModal, EditInfoModal } from './components/Modals';

const App = () => {
    // History State Initialization
    const [records, setRecords] = useState<TrialRecord[]>(() => {
        try {
            const saved = localStorage.getItem(APP_STORAGE_KEY);
            return saved ? JSON.parse(saved) : [];
        } catch (e) { return []; }
    });

    const [history, setHistory] = useState<TrialRecord[][]>([]); // Stack for undo
    const [future, setFuture] = useState<TrialRecord[][]>([]);   // Stack for redo

    const [view, setView] = useState<ViewState>('list');
    const [selectedRecord, setSelectedRecord] = useState<TrialRecord | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [showSync, setShowSync] = useState(false);

    // Modals
    const [deleteTarget, setDeleteTarget] = useState<TrialRecord | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [calendarPrompt, setCalendarPrompt] = useState<CalendarPromptState | null>(null);

    const [formData, setFormData] = useState<Partial<TrialRecord>>({
        studentName: '', wechatId: '', school: '', consultant: '', groupName: '', trialTime: ''
    });

    // Helper to set records with history tracking
    const updateRecords = (newRecordsOrFn: TrialRecord[] | ((prev: TrialRecord[]) => TrialRecord[])) => {
        // 1. Push current state to history
        setHistory(prev => {
            const newHistory = [...prev, records];
            if (newHistory.length > 50) newHistory.shift(); // Limit history size
            return newHistory;
        });

        // 2. Clear future stack because we branched off
        setFuture([]);

        // 3. Update state
        if (typeof newRecordsOrFn === 'function') {
            setRecords(prev => {
                const newValue = newRecordsOrFn(prev);
                localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(newValue));
                return newValue;
            });
        } else {
            setRecords(newRecordsOrFn);
            localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(newRecordsOrFn));
        }
    };

    const handleUndo = () => {
        if (history.length === 0) return;
        const previous = history[history.length - 1];
        setFuture(prev => [records, ...prev]);
        setRecords(previous);
        localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(previous));
        setHistory(prev => prev.slice(0, -1));
    };

    const handleRedo = () => {
        if (future.length === 0) return;
        const nextState = future[0];
        setHistory(prev => [...prev, records]);
        setRecords(nextState);
        localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(nextState));
        setFuture(prev => prev.slice(1));
    };

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.studentName || !formData.trialTime) return alert("请填写必要信息");
        const newRecord: TrialRecord = {
            id: generateId(),
            studentName: formData.studentName,
            wechatId: formData.wechatId,
            school: formData.school,
            consultant: formData.consultant,
            groupName: formData.groupName,
            trialTime: formData.trialTime,
            isTrialCompleted: false,
            paymentTime: null, paymentScreenshot: null,
            isEnrolled: false, enrollmentDate: null,
            bonusPaymentTime: null, bonusAmount: '', bonusScreenshot: null,
            createdAt: new Date().toISOString()
        };
        updateRecords(prev => [newRecord, ...prev]);
        setFormData({ studentName: '', wechatId: '', school: '', consultant: '', groupName: '', trialTime: '' });
        setView('list');
        setCalendarPrompt({ record: newRecord, type: 'PLAN' });
    };

    const handleUpdate = (id: string, updates: Partial<TrialRecord>) => {
        updateRecords(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
        if (selectedRecord && selectedRecord.id === id) {
            setSelectedRecord(prev => prev ? ({ ...prev, ...updates }) : null);
        }
    };

    const toggleTrialComplete = (record: TrialRecord, e: React.MouseEvent) => {
        e.stopPropagation();
        const newVal = !record.isTrialCompleted;
        updateRecords(prev => prev.map(r => r.id === record.id ? { ...r, isTrialCompleted: newVal } : r));
        if (newVal) setCalendarPrompt({ record: { ...record, isTrialCompleted: true }, type: 'DONE' });
    };

    const confirmDelete = () => {
        if (!deleteTarget) return;
        updateRecords(prev => prev.filter(r => r.id !== deleteTarget.id));
        setDeleteTarget(null);
        if (view === 'detail' && selectedRecord?.id === deleteTarget.id) { setView('list'); setSelectedRecord(null); }
    };

    const saveEditedInfo = (newData: Partial<TrialRecord>) => {
        if (selectedRecord) {
            handleUpdate(selectedRecord.id, newData);
            setIsEditModalOpen(false);
        }
    };

    const handleBatchImport = (importedRecords: TrialRecord[], strategy = 'overwrite') => {
        updateRecords(prev => {
            const currentMap = new Map(prev.map(r => [r.id, r]));
            importedRecords.forEach(r => {
                if (currentMap.has(r.id)) {
                    if (strategy === 'overwrite') {
                        currentMap.set(r.id, r);
                    }
                } else {
                    currentMap.set(r.id, r);
                }
            });
            return Array.from(currentMap.values());
        });
    };

    const handleClearAll = () => {
        updateRecords([]);
        setShowSync(false);
    };

    const filteredRecords = records.filter(r => {
        const s = searchTerm.toLowerCase();
        if (!r.studentName.toLowerCase().includes(s) && !r.consultant?.toLowerCase().includes(s)) return false;
        if (filterStatus === 'planned_pending') return !r.isTrialCompleted;
        if (filterStatus === 'unpaid_trial') return r.isTrialCompleted && !r.paymentTime && !r.paymentScreenshot;
        if (filterStatus === 'enrolled') return r.isEnrolled;
        if (filterStatus === 'not_enrolled') return !r.isEnrolled;
        if (filterStatus === 'unpaid_bonus') return r.isEnrolled && !r.bonusPaymentTime;
        return true;
    }).sort((a, b) => new Date(b.trialTime).getTime() - new Date(a.trialTime).getTime());

    const handleSelectRecordFromStats = (record: TrialRecord) => {
        setSelectedRecord(record);
        setView('detail');
    };

    if (view === 'stats') return <StatisticsView records={records} onBack={() => setView('list')} onSelectRecord={handleSelectRecordFromStats} />;

    return (
        <div className="min-h-screen bg-gray-100 font-sans text-gray-800 pb-20 max-w-md mx-auto shadow-xl min-h-screen bg-white">
            <header className="bg-white shadow-sm sticky top-0 z-50">
                <div className="px-4 py-4 flex flex-col gap-3">

                    {/* Row 1: Title & Cancel Button */}
                    <div className="flex justify-between items-center">
                        <h1 className="text-xl font-bold text-indigo-600 flex items-center gap-2">
                            <Icon name="School" size={24} /> 试听管家 <span className="text-xs bg-gray-100 text-gray-500 px-2 rounded-full">本地版</span>
                        </h1>
                        {view !== 'list' && (
                            <button
                                onClick={() => { setView('list'); setSelectedRecord(null); }}
                                className="text-gray-500 font-medium text-sm bg-gray-100 px-3 py-1 rounded-full hover:bg-gray-200 transition-colors"
                            >
                                取消
                            </button>
                        )}
                    </div>

                    {/* Row 2: Action Buttons (Only in list view) */}
                    {view === 'list' && (
                        <div className="flex justify-between items-center w-full">
                            {/* Left: Undo/Redo */}
                            <div className="flex gap-2">
                                <button
                                    onClick={handleUndo}
                                    disabled={history.length === 0}
                                    className={`p-2 rounded-full transition-colors ${history.length === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100'}`}
                                    title="撤销 (Undo)"
                                >
                                    <Icon name="RotateCcw" size={20} />
                                </button>

                                <button
                                    onClick={handleRedo}
                                    disabled={future.length === 0}
                                    className={`p-2 rounded-full transition-colors ${future.length === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100'}`}
                                    title="重做 (Redo)"
                                >
                                    <Icon name="RotateCw" size={20} />
                                </button>
                            </div>

                            {/* Right: Main Actions */}
                            <div className="flex gap-2 items-center">
                                <button onClick={() => setShowSync(true)} className="bg-white text-indigo-600 px-3 py-2 rounded-full border border-indigo-100 hover:bg-indigo-50 shadow-sm flex items-center gap-1 text-sm font-medium">
                                    <Icon name="Share2" size={18} /> 同步
                                </button>
                                <button onClick={() => setView('stats')} className="bg-indigo-50 text-indigo-600 p-2 rounded-full border border-indigo-100 hover:bg-indigo-100 shadow-sm">
                                    <Icon name="BarChart2" size={20} />
                                </button>
                                <button onClick={() => setView('add')} className="bg-indigo-600 text-white p-2 rounded-full shadow-lg hover:bg-indigo-700">
                                    <Icon name="Plus" size={20} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Filter Bar (Row 3) */}
                {view === 'list' && (
                    <div className="px-4 pb-3 pt-1 flex gap-2 overflow-x-auto no-scrollbar border-t border-gray-50 mt-1">
                        <FilterBtn label="全部" active={filterStatus === 'all'} onClick={() => setFilterStatus('all')} />
                        <div className="w-px h-6 bg-gray-200 mx-1 shrink-0"></div>
                        <FilterBtn label="⏳ 待试听" active={filterStatus === 'planned_pending'} onClick={() => setFilterStatus('planned_pending')} />
                        <FilterBtn label="未付费" active={filterStatus === 'unpaid_trial'} onClick={() => setFilterStatus('unpaid_trial')} alert />
                        <div className="w-px h-6 bg-gray-200 mx-1 shrink-0"></div>
                        <FilterBtn label="✅ 已报名" active={filterStatus === 'enrolled'} onClick={() => setFilterStatus('enrolled')} />
                        <FilterBtn label="❌ 未报名" active={filterStatus === 'not_enrolled'} onClick={() => setFilterStatus('not_enrolled')} />
                        <div className="w-px h-6 bg-gray-200 mx-1 shrink-0"></div>
                        <FilterBtn label="未发奖" active={filterStatus === 'unpaid_bonus'} onClick={() => setFilterStatus('unpaid_bonus')} alert />
                    </div>
                )}
            </header>

            <main className="p-4">
                {view === 'add' && (
                    <div className="bg-white rounded-xl shadow-md p-6 animate-slide-up">
                        <h2 className="text-lg font-bold mb-4 text-gray-800">新建试听</h2>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div><label className="block text-xs text-gray-500 mb-1">学生姓名</label><input required className="w-full border border-gray-300 rounded-lg p-2.5" value={formData.studentName} onChange={e => setFormData({ ...formData, studentName: e.target.value })} /></div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="block text-xs text-gray-500 mb-1">试听时间</label><input required type="datetime-local" className="w-full border-gray-300 rounded-lg p-2.5 text-xs" value={formData.trialTime} onChange={e => setFormData({ ...formData, trialTime: e.target.value })} /></div>
                                <div><label className="block text-xs text-gray-500 mb-1">顾问</label><input className="w-full border border-gray-300 rounded-lg p-2.5" value={formData.consultant} onChange={e => setFormData({ ...formData, consultant: e.target.value })} /></div>
                            </div>
                            <input placeholder="微信号" className="w-full border border-gray-300 rounded-lg p-2.5" value={formData.wechatId} onChange={e => setFormData({ ...formData, wechatId: e.target.value })} />
                            <input placeholder="学校" className="w-full border border-gray-300 rounded-lg p-2.5" value={formData.school} onChange={e => setFormData({ ...formData, school: e.target.value })} />
                            <input placeholder="群名" className="w-full border border-gray-300 rounded-lg p-2.5" value={formData.groupName} onChange={e => setFormData({ ...formData, groupName: e.target.value })} />
                            <button className="w-full bg-indigo-600 text-white py-3.5 rounded-lg font-bold shadow-md hover:bg-indigo-700 mt-2">保存记录</button>
                        </form>
                    </div>
                )}

                {view === 'list' && (
                    <div className="space-y-4">
                        <div className="relative"><Icon name="Search" size={18} className="absolute left-3 top-3 text-gray-400" /><input className="w-full pl-10 p-2.5 rounded-xl border border-gray-200 shadow-sm" placeholder="搜索姓名或顾问..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
                        {filteredRecords.length === 0 && <div className="text-center py-12 text-gray-400"><p>暂无记录</p></div>}
                        {filteredRecords.map(r => (
                            <div key={r.id} onClick={() => { setSelectedRecord(r); setView('detail'); }} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all cursor-pointer relative group">
                                <button onClick={(e) => toggleTrialComplete(r, e)} className={`absolute top-3 right-12 p-2 rounded-full z-10 ${r.isTrialCompleted ? 'text-green-500 bg-green-50' : 'text-gray-300'}`}>{r.isTrialCompleted ? <Icon name="CheckCircle" size={18} /> : <Icon name="Circle" size={18} />}</button>
                                <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(r); }} className="absolute top-3 right-3 p-2 text-gray-300 hover:text-red-500 z-10"><Icon name="Trash2" size={18} /></button>
                                <div className="p-4"><div className="flex justify-between items-start"><div><h3 className="text-lg font-bold text-gray-800">{r.studentName}</h3><div className="text-sm text-gray-500 flex items-center gap-3 mt-1"><span className="flex items-center gap-1"><Icon name="User" size={12} /> {r.consultant || '无顾问'}</span><span className="flex items-center gap-1 text-indigo-600 font-medium"><Icon name="Calendar" size={12} /> {formatDateTimeDisplay(r.trialTime)}</span></div></div></div></div>
                                <StatusBarTriad record={r} />
                            </div>
                        ))}
                    </div>
                )}

                {view === 'detail' && selectedRecord && (
                    <div className="bg-white rounded-xl shadow-lg pb-10 animate-fade-in relative">
                        <div className="bg-indigo-600 p-6 text-white mb-4 rounded-t-xl">
                            <div className="flex justify-between items-start mb-4">
                                <button onClick={() => { setView('list'); setSelectedRecord(null); }} className="flex items-center gap-1 text-indigo-100 hover:text-white"><Icon name="ChevronLeft" size={20} /> 返回列表</button>
                                <div className="flex gap-2">
                                    <button onClick={() => setIsEditModalOpen(true)} className="text-indigo-200 hover:text-white p-1"><Icon name="Edit2" size={20} /></button>
                                    <button onClick={() => setDeleteTarget(selectedRecord)} className="text-indigo-200 hover:text-red-200 p-1"><Icon name="Trash2" size={20} /></button>
                                </div>
                            </div>
                            <h1 className="text-2xl font-bold">{selectedRecord.studentName}</h1>
                            <p className="opacity-80 text-sm mt-1">顾问: {selectedRecord.consultant} | 学校: {selectedRecord.school}</p>
                        </div>
                        <div className="px-6 space-y-8">
                            <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center"><h3 className="font-bold text-gray-700 flex items-center gap-2"><Icon name="DollarSign" size={16} className="text-blue-500" /> 试听费 ($50)</h3><span className={`text-xs font-bold px-2 py-1 rounded-full ${selectedRecord.paymentTime ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>{selectedRecord.paymentTime ? '已支付' : '未支付'}</span></div>
                                <div className="p-4 space-y-4">
                                    <ClearableDateInput label="支付时间" value={selectedRecord.paymentTime} onChange={val => handleUpdate(selectedRecord.id, { paymentTime: val })} />
                                    <ImageUploader label="支付截图" value={selectedRecord.paymentScreenshot} onChange={val => handleUpdate(selectedRecord.id, { paymentScreenshot: val })} />
                                </div>
                            </div>
                            <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center"><h3 className="font-bold text-gray-700 flex items-center gap-2"><Icon name="CheckCircle" size={16} className="text-indigo-500" /> 报名情况</h3><label className="flex items-center gap-2 cursor-pointer"><span className="text-xs text-gray-500">是否报名</span><input type="checkbox" className="ml-2 accent-indigo-600 w-5 h-5" checked={selectedRecord.isEnrolled || false} onChange={e => handleUpdate(selectedRecord.id, { isEnrolled: e.target.checked })} /></label></div>
                                {selectedRecord.isEnrolled && (<div className="p-4 animate-fade-in"><ClearableDateInput label="报名日期" value={selectedRecord.enrollmentDate} onChange={val => handleUpdate(selectedRecord.id, { enrollmentDate: val })} /></div>)}
                            </div>
                            {selectedRecord.isEnrolled && (
                                <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm animate-slide-up">
                                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center"><h3 className="font-bold text-gray-700 flex items-center gap-2"><Icon name="Gift" size={16} className="text-pink-500" /> Bonus 发放</h3></div>
                                    <div className="p-4 space-y-4">
                                        <div><label className="block text-xs font-medium text-gray-500 mb-1">Bonus 金额</label><div className="relative"><span className="absolute left-3 top-2 text-gray-400 text-sm">$</span><input type="number" className="w-full border border-gray-300 rounded-md p-2 pl-7 text-sm" value={selectedRecord.bonusAmount || ''} onChange={e => handleUpdate(selectedRecord.id, { bonusAmount: e.target.value })} /></div></div>
                                        <ClearableDateInput label="发放时间" value={selectedRecord.bonusPaymentTime} onChange={val => handleUpdate(selectedRecord.id, { bonusPaymentTime: val })} />
                                        <ImageUploader label="Bonus 截图" value={selectedRecord.bonusScreenshot} onChange={val => handleUpdate(selectedRecord.id, { bonusScreenshot: val })} />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <CalendarPromptModal isOpen={!!calendarPrompt} record={calendarPrompt?.record || null} type={calendarPrompt?.type || 'PLAN'} onConfirm={() => setCalendarPrompt(null)} onCancel={() => setCalendarPrompt(null)} />
                <DeleteConfirmModal isOpen={!!deleteTarget} recordName={deleteTarget?.studentName} onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />
                <EditInfoModal isOpen={isEditModalOpen} record={selectedRecord} onSave={saveEditedInfo} onCancel={() => setIsEditModalOpen(false)} />
                {showSync && <SyncManager records={records} onImport={handleBatchImport} onClearAll={handleClearAll} isOpen={true} onClose={() => setShowSync(false)} />}
            </main>
        </div>
    );
};

export default App;
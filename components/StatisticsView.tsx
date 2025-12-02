import React, { useState, useMemo } from 'react';
import Icon from './Icon';
import { TrialRecord, ConsultantStats, DetailModalState } from '../types';
import { normalizeName } from './Shared';
import { TRIAL_FEE_FIXED } from '../constants';
import { DetailsListModal, AIAdvisorModal } from './Modals';

interface StatisticsViewProps {
    records: TrialRecord[];
    onBack: () => void;
    onSelectRecord: (r: TrialRecord) => void;
}

const StatisticsView: React.FC<StatisticsViewProps> = ({ records, onBack, onSelectRecord }) => {
    const today = new Date();
    const [startDate, setStartDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0]);
    const [sortBy, setSortBy] = useState<'enrolled' | 'trials' | 'rate'>('enrolled');
    const [detailModal, setDetailModal] = useState<DetailModalState | null>(null);
    const [showAI, setShowAI] = useState(false);

    const stats = useMemo(() => {
        const start = new Date(startDate); start.setHours(0, 0, 0, 0);
        const end = new Date(endDate); end.setHours(23, 59, 59, 999);
        const filtered = records.filter(r => {
            if (!r.trialTime) return false;
            const t = new Date(r.trialTime);
            return t >= start && t <= end;
        });

        let trialIncomePaid = 0, bonusIncomePaid = 0;
        const pendingTrialList: TrialRecord[] = [], pendingBonusList: TrialRecord[] = [], paidTrialList: TrialRecord[] = [], paidBonusList: TrialRecord[] = [];
        let enrolledCount = 0;
        const consultantMap: Record<string, ConsultantStats> = {};

        filtered.forEach(r => {
            const isFeePaid = r.paymentTime || r.paymentScreenshot;
            if (isFeePaid) { trialIncomePaid += TRIAL_FEE_FIXED; paidTrialList.push(r); }
            else if (r.isTrialCompleted) { pendingTrialList.push(r); }

            const bonusVal = parseFloat(r.bonusAmount) || 0;
            const isBonusPaid = r.bonusPaymentTime || r.bonusScreenshot;
            if (r.isEnrolled) {
                enrolledCount++;
                if (bonusVal > 0) {
                    if (isBonusPaid) { bonusIncomePaid += bonusVal; paidBonusList.push(r); }
                    else { pendingBonusList.push(r); }
                }
            }
            const rawName = r.consultant || '未记录';
            const normKey = normalizeName(rawName);
            if (!consultantMap[normKey]) consultantMap[normKey] = { displayName: rawName, trials: 0, enrolled: 0, records: [] };
            const entry = consultantMap[normKey];
            entry.trials++;
            if (r.isEnrolled) entry.enrolled++;
            entry.records.push(r);
        });

        let consultantsList = Object.values(consultantMap);
        consultantsList.sort((a, b) => {
            if (sortBy === 'enrolled') return b.enrolled - a.enrolled;
            if (sortBy === 'trials') return b.trials - a.trials;
            if (sortBy === 'rate') {
                const rateA = a.trials ? a.enrolled / a.trials : 0;
                const rateB = b.trials ? b.enrolled / b.trials : 0;
                return rateB - rateA;
            }
            return 0;
        });

        return {
            total: filtered.length, enrolledCount, rate: filtered.length ? ((enrolledCount / filtered.length) * 100).toFixed(0) : 0,
            trialIncomePaid, bonusIncomePaid, totalReceived: trialIncomePaid + bonusIncomePaid,
            trialIncomePending: pendingTrialList.length * TRIAL_FEE_FIXED, bonusIncomePending: pendingBonusList.reduce((sum, r) => sum + (parseFloat(r.bonusAmount) || 0), 0),
            totalPending: (pendingTrialList.length * TRIAL_FEE_FIXED) + pendingBonusList.reduce((sum, r) => sum + (parseFloat(r.bonusAmount) || 0), 0),
            pendingTrialList, pendingBonusList, paidTrialList, paidBonusList, consultants: consultantsList
        };
    }, [records, startDate, endDate, sortBy]);

    const SortHeader: React.FC<{ label: string, field: typeof sortBy }> = ({ label, field }) => (
        <th onClick={() => setSortBy(field)} className={`px-4 py-3 cursor-pointer hover:bg-gray-100 transition-colors text-right ${sortBy === field ? 'text-indigo-600 bg-indigo-50' : ''}`}>
            <div className="flex items-center justify-end gap-1">{label}<Icon name="ArrowUpDown" size={12} className={sortBy === field ? 'opacity-100' : 'opacity-30'} /></div>
        </th>
    );

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-800 pb-20 animate-fade-in">
            <div className="bg-white px-4 py-4 shadow-sm sticky top-0 z-50 border-b border-gray-100 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <button onClick={onBack} className="flex items-center text-gray-600 mb-0 hover:text-indigo-600"><Icon name="ChevronLeft" size={20} /> 返回列表</button>
                    <h2 className="text-xl font-bold flex items-center gap-2 text-gray-800"><Icon name="TrendingUp" className="text-indigo-600" /> 业务数据分析</h2>
                </div>
                <button onClick={() => setShowAI(true)} className="bg-purple-100 text-purple-700 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 hover:bg-purple-200 transition-colors">
                    <Icon name="Sparkles" size={14} /> AI 顾问
                </button>
            </div>
            <div className="p-4 space-y-4 max-w-3xl mx-auto">
                <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 flex items-center gap-3">
                    <Icon name="Calendar" size={18} className="text-gray-400" />
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="flex-1 text-sm border-none focus:ring-0 text-gray-600 p-0 font-medium" />
                    <span className="text-gray-300">至</span>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="flex-1 text-sm border-none focus:ring-0 text-gray-600 p-0 text-right font-medium" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center justify-center"><Icon name="Users" className="text-blue-500 mb-1" size={20} /><div className="text-gray-400 text-[10px] uppercase font-bold">总试听数</div><div className="text-xl font-bold text-gray-800">{stats.total}</div></div>
                    <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center justify-center"><Icon name="Target" className="text-green-500 mb-1" size={20} /><div className="text-gray-400 text-[10px] uppercase font-bold">总报名数</div><div className="text-xl font-bold text-gray-800">{stats.enrolledCount}</div></div>
                    <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center justify-center"><Icon name="Percent" className="text-purple-500 mb-1" size={20} /><div className="text-gray-400 text-[10px] uppercase font-bold">转化率</div><div className="text-xl font-bold text-gray-800">{stats.rate}%</div></div>
                </div>
                <div className="space-y-3">
                    <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-xl p-4 text-white shadow-md">
                        <div className="text-green-100 text-xs font-bold uppercase mb-1">已实际入账</div><div className="text-2xl font-bold">${stats.totalReceived.toLocaleString()}</div>
                        <div className="mt-2 pt-2 border-t border-white/20 text-xs flex justify-between opacity-90"><span onClick={() => setDetailModal({ title: '已收试听费明细', items: stats.paidTrialList, type: 'TRIAL' })} className="cursor-pointer hover:bg-white/10 px-1 rounded transition-colors">试听费 ${stats.trialIncomePaid}</span><span onClick={() => setDetailModal({ title: '已收 Bonus 明细', items: stats.paidBonusList, type: 'BONUS' })} className="cursor-pointer hover:bg-white/10 px-1 rounded transition-colors">Bonus ${stats.bonusIncomePaid}</span></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div onClick={() => setDetailModal({ title: '待收试听费明细', items: stats.pendingTrialList, type: 'TRIAL' })} className="bg-white p-4 rounded-xl border border-orange-100 shadow-sm cursor-pointer hover:bg-orange-50 transition-colors group relative overflow-hidden"><div className="text-orange-500 text-xs font-bold uppercase mb-1">待收试听费</div><div className="text-xl font-bold text-gray-800">${stats.trialIncomePending.toLocaleString()}</div><div className="text-xs text-gray-400 mt-1">{stats.pendingTrialList.length} 人未付</div></div>
                        <div onClick={() => setDetailModal({ title: '待发 Bonus 明细', items: stats.pendingBonusList, type: 'BONUS' })} className="bg-white p-4 rounded-xl border border-pink-100 shadow-sm cursor-pointer hover:bg-pink-50 transition-colors group relative overflow-hidden"><div className="text-pink-500 text-xs font-bold uppercase mb-1">待收 Bonus</div><div className="text-xl font-bold text-gray-800">${stats.bonusIncomePending.toLocaleString()}</div><div className="text-xs text-gray-400 mt-1">{stats.pendingBonusList.length} 笔待处理</div></div>
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                    <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 font-bold text-sm text-gray-600">顾问业绩排行 <span className="text-xs font-normal text-gray-400">(点击查看详情)</span></div>
                    <table className="w-full text-sm"><thead className="bg-gray-50 text-xs text-gray-500"><tr><th className="px-4 py-2 text-left font-medium">姓名</th><SortHeader label="试听" field="trials" /><SortHeader label="报名" field="enrolled" /><SortHeader label="转化率" field="rate" /></tr></thead>
                        <tbody className="divide-y divide-gray-50">
                            {stats.consultants.map((c, i) => {
                                const rate = c.trials > 0 ? (c.enrolled / c.trials * 100).toFixed(0) : 0; return (
                                    <tr key={i} onClick={() => setDetailModal({ title: `顾问 ${c.displayName} 的学生列表`, items: c.records, type: 'CONSULTANT' })} className="hover:bg-gray-50 transition-colors cursor-pointer">
                                        <td className="px-4 py-3 font-medium text-gray-700"><div className="flex items-center gap-2"><div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] bg-gray-100 text-gray-500`}>{i + 1}</div><span className="capitalize truncate max-w-[80px]">{c.displayName}</span></div></td>
                                        <td className="px-4 py-3 text-right text-gray-600">{c.trials}</td><td className="px-4 py-3 text-right font-bold text-indigo-600">{c.enrolled}</td>
                                        <td className="px-4 py-3 text-right"><span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${Number(rate) >= 30 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{rate}%</span></td>
                                    </tr>
                                );
                            })}
                            {stats.consultants.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-gray-400 text-xs">暂无数据</td></tr>}
                        </tbody></table>
                </div>
            </div>
            {detailModal && <DetailsListModal isOpen={true} title={detailModal.title} items={detailModal.items} type={detailModal.type} onClose={() => setDetailModal(null)} onSelectRecord={onSelectRecord} />}
            <AIAdvisorModal isOpen={showAI} records={records} onClose={() => setShowAI(false)} />
        </div>
    );
};

export default StatisticsView;
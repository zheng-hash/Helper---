import React, { useState, useRef } from 'react';
import Icon from './Icon';
import { TrialRecord } from '../types';

interface SyncManagerProps {
    records: TrialRecord[];
    onImport: (items: TrialRecord[], strategy: 'overwrite' | 'skip') => void;
    onClearAll: () => void;
    isOpen: boolean;
    onClose: () => void;
}

const SyncManager: React.FC<SyncManagerProps> = ({ records, onImport, onClearAll, isOpen, onClose }) => {
    const [mode, setMode] = useState<'export' | 'import'>('export');
    const [importText, setImportText] = useState('');
    const [status, setStatus] = useState<'idle' | 'reading' | 'importing' | 'clearing' | 'confirming' | 'success' | 'error'>('idle');
    const [parsedData, setParsedData] = useState<{ items: TrialRecord[], duplicates: number, new: number } | null>(null);
    const [errorMessage, setErrorMessage] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isClearConfirming, setIsClearConfirming] = useState(false);

    if (!isOpen) return null;

    const handleCopyText = () => {
        const dataStr = JSON.stringify(records);
        navigator.clipboard.writeText(dataStr).then(() => {
            setStatus('success'); setTimeout(() => setStatus('idle'), 2000);
        });
    };

    const handlePasteImport = () => {
        try {
            if (!importText.trim()) return;
            const json = JSON.parse(importText);
            if (Array.isArray(json)) {
                const duplicateCount = json.filter(newItem => records.some(existing => existing.id === newItem.id)).length;
                const newCount = json.length - duplicateCount;
                setParsedData({ items: json, duplicates: duplicateCount, new: newCount });
                setStatus('confirming');
            } else alert("格式错误");
        } catch (e) { alert("解析失败"); }
    };

    const handleExportFile = () => {
        const dataStr = JSON.stringify(records, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `试听记录备份_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setStatus('reading');
        setErrorMessage('');
        setTimeout(() => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const result = e.target?.result;
                    if (typeof result === 'string') {
                        const json = JSON.parse(result);
                        if (Array.isArray(json)) {
                            const duplicateCount = json.filter(newItem => records.some(existing => existing.id === newItem.id)).length;
                            const newCount = json.length - duplicateCount;
                            setParsedData({ items: json, duplicates: duplicateCount, new: newCount });
                            setStatus('confirming');
                        } else {
                            setErrorMessage("文件格式错误");
                            setStatus('error');
                        }
                    }
                } catch (err) {
                    setErrorMessage("文件解析失败");
                    setStatus('error');
                }
            };
            reader.readAsText(file);
        }, 600);
        e.target.value = '';
    };

    const confirmImport = (strategy: 'overwrite' | 'skip') => {
        setStatus('importing');
        setTimeout(() => {
            if (parsedData) {
                onImport(parsedData.items, strategy);
                setStatus('success');
                setTimeout(() => {
                    onClose();
                    setStatus('idle');
                    setParsedData(null);
                }, 1000);
            }
        }, 800);
    };

    const confirmClearAll = () => setIsClearConfirming(true);
    const executeClearAll = () => {
        setStatus('clearing');
        setTimeout(() => {
            onClearAll();
            setStatus('success');
            setIsClearConfirming(false);
            setTimeout(() => {
                onClose();
                setStatus('idle');
            }, 1000);
        }, 800);
    };

    const reset = () => {
        setStatus('idle');
        setErrorMessage('');
        setParsedData(null);
        setIsClearConfirming(false);
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[99] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-up relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10"><Icon name="X" size={20} /></button>
                <div className="bg-indigo-600 p-4 text-white"><h3 className="font-bold flex items-center gap-2"><Icon name="Share2" size={20} /> 数据管理 & 同步</h3></div>
                <div className="p-6">
                    {!isClearConfirming && status === 'idle' && (
                        <div className="space-y-5">
                            <div className="flex border-b pb-2 gap-4 text-sm font-medium text-gray-500">
                                <button onClick={() => setMode('export')} className={`${mode === 'export' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'hover:text-gray-700'}`}>复制/导出</button>
                                <button onClick={() => setMode('import')} className={`${mode === 'import' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'hover:text-gray-700'}`}>粘贴/导入</button>
                            </div>

                            {mode === 'export' && (
                                <div className="space-y-3 animate-fade-in">
                                    <p className="text-xs text-gray-500">方式一：复制文字口令 (适合微信/钉钉)</p>
                                    <button onClick={handleCopyText} className="w-full py-2.5 border border-indigo-200 text-indigo-600 bg-indigo-50 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-indigo-100"><Icon name="Copy" size={16} /> 复制数据口令</button>

                                    <p className="text-xs text-gray-500 mt-4">方式二：导出文件 (适合备份保存)</p>
                                    <button onClick={handleExportFile} className="w-full py-2.5 border border-gray-300 text-gray-700 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-gray-50"><Icon name="Download" size={16} /> 导出 JSON 文件</button>
                                </div>
                            )}

                            {mode === 'import' && (
                                <div className="space-y-3 animate-fade-in">
                                    <p className="text-xs text-gray-500">方式一：粘贴文字口令</p>
                                    <div className="flex gap-2">
                                        <input className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-xs" placeholder="粘贴数据..." value={importText} onChange={e => setImportText(e.target.value)} />
                                        <button onClick={handlePasteImport} disabled={!importText} className="px-4 bg-indigo-600 text-white rounded-lg font-bold text-xs hover:bg-indigo-700 disabled:opacity-50">合并</button>
                                    </div>

                                    <p className="text-xs text-gray-500 mt-2">方式二：导入 JSON 文件</p>
                                    <div className="relative">
                                        <input type="file" accept=".json" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
                                        <button onClick={() => fileInputRef.current?.click()} className="w-full py-2.5 border border-dashed border-gray-400 text-gray-600 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-gray-50"><Icon name="FileJson" size={16} /> 选择文件导入</button>
                                    </div>
                                </div>
                            )}

                            <div className="border-t pt-4 mt-2">
                                <button onClick={confirmClearAll} className="w-full flex items-center justify-center gap-2 text-red-500 text-xs font-bold py-2 hover:bg-red-50 rounded-lg transition-all">
                                    <Icon name="Trash2" size={14} /> ⚠️ 清空所有数据
                                </button>
                            </div>
                        </div>
                    )}

                    {(status === 'reading' || status === 'importing' || status === 'clearing') && (
                        <div className="py-10 flex flex-col items-center justify-center space-y-4 animate-fade-in">
                            <Icon name="Loader2" className="animate-spin text-indigo-600" size={32} />
                            <div className="text-sm text-gray-600 font-medium">
                                {status === 'reading' ? '正在解析数据...' : (status === 'clearing' ? '正在清空数据...' : '智能合并中...')}
                            </div>
                        </div>
                    )}

                    {status === 'confirming' && parsedData && (
                        <div className="space-y-4 animate-fade-in text-center">
                            <div className="bg-green-50 p-4 rounded-lg border border-green-100 flex items-center gap-3 text-left">
                                <div className="bg-green-100 p-2 rounded-full text-green-600"><Icon name="FileText" size={20} /></div>
                                <div>
                                    <div className="text-green-800 font-bold">解析成功</div>
                                    <div className="text-green-600 text-xs">
                                        共 {parsedData.items.length} 条 | 新增 {parsedData.new} | <span className={parsedData.duplicates > 0 ? 'text-orange-600 font-bold' : ''}>重复 {parsedData.duplicates}</span>
                                    </div>
                                </div>
                            </div>
                            <p className="text-xs text-gray-500">检测到重复数据，请选择合并策略：</p>
                            <div className="flex gap-2 pt-2">
                                {parsedData.duplicates > 0 ? (
                                    <>
                                        <button onClick={() => confirmImport('skip')} className="flex-1 py-2.5 border border-gray-300 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 flex flex-col items-center justify-center gap-1">
                                            <span>跳过重复</span>
                                            <span className="text-[10px] text-gray-400">保留现有数据</span>
                                        </button>
                                        <button onClick={() => confirmImport('overwrite')} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 shadow-md flex flex-col items-center justify-center gap-1">
                                            <span>覆盖重复</span>
                                            <span className="text-[10px] text-indigo-200">使用新数据</span>
                                        </button>
                                    </>
                                ) : (
                                    <button onClick={() => confirmImport('overwrite')} className="w-full py-2.5 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 shadow-md">
                                        全部导入 (无冲突)
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {isClearConfirming && status !== 'clearing' && (
                        <div className="space-y-4 animate-fade-in text-center pt-4">
                            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-2"><Icon name="AlertTriangle" className="text-red-600" size={24} /></div>
                            <h4 className="text-lg font-bold text-gray-900">确定要清空吗？</h4>
                            <p className="text-sm text-gray-600">此操作将删除本地所有记录且<strong className="text-red-600">不可恢复</strong>。<br />建议先导出备份。</p>
                            <div className="flex gap-2 pt-4">
                                <button onClick={reset} className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50">我再想想</button>
                                <button onClick={executeClearAll} className="flex-1 py-2.5 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 shadow-md">确认清空</button>
                            </div>
                        </div>
                    )}

                    {status === 'success' && (
                        <div className="py-10 flex flex-col items-center justify-center space-y-4 animate-fade-in">
                            <div className="bg-green-100 p-4 rounded-full text-green-600 mb-2"><Icon name="Check" size={32} /></div>
                            <div className="text-lg font-bold text-green-700">操作成功！</div>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="space-y-4 animate-fade-in">
                            <div className="bg-red-50 p-4 rounded-lg border border-red-100 flex items-center gap-3"><Icon name="AlertCircle" className="text-red-500 shrink-0" size={24} /> <div className="text-red-800 text-sm font-medium">{errorMessage}</div></div>
                            <button onClick={reset} className="w-full py-2.5 bg-gray-800 text-white rounded-lg text-sm font-medium hover:bg-gray-700">返回重试</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SyncManager;
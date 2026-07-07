import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import {
  Calendar as CalendarIcon,
  List,
  Plus,
  CheckCircle,
  AlertCircle,
  Trash2,
  Edit2,
  X,
  ChevronDown,
  ArrowUpDown,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Clock,
  Copy,
  Tag,
} from "lucide-react";

// 型定義
interface ClassInfo {
  id: number;
  name: string;
  year: number;
  semester: string;
  color: string;
}

interface Task {
  id: number;
  title: string;
  dueDate: string;
  estimatedTime: number; // 分単位
  memo: string;
  classId: number;
  class: ClassInfo;
  isCompleted: boolean;
}

interface Template {
  id: number;
  title: string;
  estimatedTime: number; // 分単位
  memo: string;
  classId: number;
  class: ClassInfo;
}

const backendPort = 3000;

// 優先度から色の不透明度(0.2 ~ 1.0)を計算する関数
const getOpacityByPriority = (priorityValue: number) => {
  const opacity = Math.min(Math.max(priorityValue * 2, 0.15), 1.0);
  return opacity;
};

// hexカラーをrgbaに変換するヘルパー
const hexToRgba = (hex: string, opacity: number) => {
  const cleanHex = hex.replace("#", "");
  const r = parseInt(cleanHex.slice(0, 2), 16);
  const g = parseInt(cleanHex.slice(2, 4), 16);
  const b = parseInt(cleanHex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

export default function App() {
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 表示モード ('list' = リスト表示, 'calendar' = カレンダー表示)
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");

  // 現在時刻（優先度算出の基準。1分ごとに更新）
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // カレンダー表示用の選択年月
  const [calendarYear, setCalendarYear] = useState<number>(
    new Date().getFullYear(),
  );
  const [calendarMonth, setCalendarMonth] = useState<number>(
    new Date().getMonth(),
  );

  // ソート基準 ('dueDate' = 期日順, 'priority' = 優先度順)
  const [sortBy, setSortBy] = useState<"dueDate" | "priority">("dueDate");

  // 新規登録マルチモーダルの状態
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [inputTab, setInputTab] = useState<"task" | "class" | "template">(
    "task",
  );

  // 1. 課題登録フォームのState
  const [newTitle, setNewTitle] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [newEstimatedTime, setNewEstimatedTime] = useState(30);
  const [newMemo, setNewMemo] = useState("");
  const [newClassId, setNewClassId] = useState<number | "">("");

  // 2. 授業登録フォームのState
  const [newClassName, setNewClassName] = useState("");
  const [newClassYear, setNewClassYear] = useState<number>(
    new Date().getFullYear(),
  );
  const [newClassSemester, setNewClassSemester] = useState("前期");
  const [newClassColor, setNewClassColor] = useState("#3b82f6");

  // 3. テンプレート登録フォームのState
  const [newTemplateTitle, setNewTemplateTitle] = useState("");
  const [newTemplateEstimatedTime, setNewTemplateEstimatedTime] = useState(30);
  const [newTemplateMemo, setNewTemplateMemo] = useState("");
  const [newTemplateClassId, setNewTemplateClassId] = useState<number | "">("");

  // 編集用モーダル・フォームの状態
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editTaskData, setEditTaskData] = useState<{
    title: string;
    dueDate: string;
    estimatedTime: number;
    memo: string;
    classId: number;
  } | null>(null);

  // APIのURLを取得する関数
  const getEnvUrl = (): string => {
    try {
      const metaObj = import.meta as any;
      if (metaObj && metaObj.env && metaObj.env.VITE_API_BASE_URL) {
        return metaObj.env.VITE_API_BASE_URL;
      }
    } catch (e) {
      // フォールバック
    }

    if (
      typeof window !== "undefined" &&
      !window.location.hostname.includes("localhost")
    ) {
      return "https://campus-tasks-backend.onrender.com"; // ★あなたの本物のURL
    }

    return `http://localhost:${backendPort}`;
  };

  const API_BASE_URL = getEnvUrl();

  // 現在時刻を1分ごとに更新（優先度のリアルタイム更新のため）
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // 初期データ取得
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [classesRes, tasksRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/classes`),
          axios.get(`${API_BASE_URL}/api/tasks`),
        ]);
        setClasses(classesRes.data);
        setTasks(tasksRes.data);

        // テンプレート取得（バックエンドの準備状況に備えてフォールバックを施す）
        try {
          const templatesRes = await axios.get(`${API_BASE_URL}/api/templates`);
          setTemplates(templatesRes.data);
        } catch (templateErr) {
          console.warn(
            "Templates API not available yet, initialized with empty list.",
          );
          setTemplates([]);
        }

        setError(null);
      } catch (err) {
        console.error("Fetch error:", err);
        setError(
          "サーバーに接続できません。バックエンドサーバーが起動しているか確認してください。",
        );
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [API_BASE_URL]);

  // 【新規機能】テンプレートを選択した際の自動入力（呼び出し）処理
  const handleApplyTemplate = (templateIdStr: string) => {
    if (!templateIdStr) return;
    const templateId = Number(templateIdStr);
    const selected = templates.find((t) => t.id === templateId);

    if (selected) {
      setNewTitle(selected.title);
      setNewEstimatedTime(selected.estimatedTime);
      setNewMemo(selected.memo || "");
      setNewClassId(selected.classId);
    }
  };

  // 新規課題の登録処理
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDueDate || !newClassId) return;

    try {
      const response = await axios.post(`${API_BASE_URL}/api/tasks`, {
        title: newTitle,
        dueDate: new Date(newDueDate).toISOString(),
        estimatedTime: Number(newEstimatedTime),
        memo: newMemo,
        classId: Number(newClassId),
      });

      const createdTask = {
        ...response.data,
        class: classes.find((c) => c.id === Number(newClassId))!,
      };

      setTasks([...tasks, createdTask]);
      setIsAddModalOpen(false);

      // フォームの初期化
      setNewTitle("");
      setNewDueDate("");
      setNewEstimatedTime(30);
      setNewMemo("");
      setNewClassId("");
    } catch (err) {
      console.error("Add task error:", err);
      alert("課題の登録に失敗しました。");
    }
  };

  // 授業の新規登録処理
  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim() || !newClassYear) return;

    try {
      const response = await axios.post(`${API_BASE_URL}/api/classes`, {
        name: newClassName,
        year: Number(newClassYear),
        semester: newClassSemester,
        color: newClassColor,
      });

      // 登録した授業をリストに反映
      setClasses([...classes, response.data]);

      // 入力欄をクリアして、登録した授業が即座に選べるように課題タブへ切り替える
      setNewClassName("");
      setNewClassColor("#3b82f6");
      setNewClassId(response.data.id); // 登録した授業をセレクトボックスの選択状態にする
      setInputTab("task");
      alert("授業を新しく登録しました！");
    } catch (err) {
      console.error("Add class error:", err);
      alert("授業の登録に失敗しました。");
    }
  };

  // テンプレートの新規登録処理
  const handleAddTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateTitle.trim() || !newTemplateClassId) return;

    try {
      const response = await axios.post(`${API_BASE_URL}/api/templates`, {
        name: newTemplateTitle, // データベースの title に詰め替えられるよう name で送信
        estimatedTime: Number(newTemplateEstimatedTime),
        memo: newTemplateMemo,
        classId: Number(newTemplateClassId),
      });

      const createdTemplate = {
        ...response.data,
        title: response.data.title || newTemplateTitle,
        class: classes.find((c) => c.id === Number(newTemplateClassId))!,
      };

      setTemplates([...templates, createdTemplate]);

      // 登録完了後に初期化し、課題作成タブで即呼び出せるようにする
      setNewTemplateTitle("");
      setNewTemplateEstimatedTime(30);
      setNewTemplateMemo("");
      setNewTemplateClassId("");
      setInputTab("task");
      alert("頻出課題テンプレートを保存しました！");
    } catch (err) {
      console.error("Add template error:", err);
      alert("テンプレートの登録に失敗しました。");
    }
  };

  // 課題の編集用モーダルを開く
  const openEditModal = (task: Task) => {
    setEditingTask(task);

    const dateObj = new Date(task.dueDate);
    const tzOffset = dateObj.getTimezoneOffset() * 60000;
    const localISODate = new Date(dateObj.getTime() - tzOffset)
      .toISOString()
      .slice(0, 16);

    setEditTaskData({
      title: task.title,
      dueDate: localISODate,
      estimatedTime: task.estimatedTime,
      memo: task.memo || "",
      classId: task.classId,
    });
  };

  // 課題の編集（保存）処理
  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !editingTask ||
      !editTaskData ||
      !editTaskData.title.trim() ||
      !editTaskData.dueDate
    )
      return;

    try {
      await axios.put(`${API_BASE_URL}/api/tasks/${editingTask.id}`, {
        title: editTaskData.title,
        dueDate: new Date(editTaskData.dueDate).toISOString(),
        estimatedTime: Number(editTaskData.estimatedTime),
        memo: editTaskData.memo,
        classId: Number(editTaskData.classId),
      });

      const updatedClass = classes.find(
        (c) => c.id === Number(editTaskData.classId),
      )!;

      setTasks(
        tasks.map((t) =>
          t.id === editingTask.id
            ? {
                ...t,
                title: editTaskData.title,
                dueDate: new Date(editTaskData.dueDate).toISOString(),
                estimatedTime: Number(editTaskData.estimatedTime),
                memo: editTaskData.memo,
                classId: Number(editTaskData.classId),
                class: updatedClass,
              }
            : t,
        ),
      );

      setEditingTask(null);
      setEditTaskData(null);
    } catch (err) {
      console.error("Update task error:", err);
      alert("課題の更新に失敗しました。");
    }
  };

  // 課題の完了・未完了切り替え
  const handleToggleComplete = async (
    taskId: number,
    currentStatus: boolean,
  ) => {
    try {
      await axios.put(`${API_BASE_URL}/api/tasks/${taskId}`, {
        isCompleted: !currentStatus,
      });

      setTasks(
        tasks.map((t) =>
          t.id === taskId ? { ...t, isCompleted: !currentStatus } : t,
        ),
      );
    } catch (err) {
      console.error("Toggle complete error:", err);
    }
  };

  // 課題の削除処理
  const handleDeleteTask = async (taskId: number) => {
    if (!confirm("この課題を削除してもよろしいですか？")) return;

    try {
      await axios.delete(`${API_BASE_URL}/api/tasks/${taskId}`);
      setTasks(tasks.filter((t) => t.id !== taskId));
    } catch (err) {
      console.error("Delete task error:", err);
      alert("課題の削除に失敗しました。");
    }
  };

  // 【最重要ロジック】優先度の自動算出
  // 式: 想定作業時間（時間単位） ÷ 期日までの残り時間（時間単位）
  const calculatePriority = (
    estimatedTimeMinutes: number,
    dueDateStr: string,
  ) => {
    const dueDate = new Date(dueDateStr);
    const diffMs = dueDate.getTime() - currentTime.getTime();
    const diffHours = diffMs / (1000 * 60 * 60); // ミリ秒を時間に変換

    if (diffHours <= 0) {
      return { value: 99.9, isOverdue: true }; // すでに期日を過ぎている場合
    }

    const estimatedHours = estimatedTimeMinutes / 60; // 分を時間に変換
    const priority = estimatedHours / diffHours;
    return { value: Number(priority.toFixed(2)), isOverdue: false };
  };

  // 並び替え・整理された課題のリスト（useMemoで効率化）
  const sortedTasks = useMemo(() => {
    const activeTasks = tasks.filter((t) => !t.isCompleted);
    const completedTasks = tasks.filter((t) => t.isCompleted);

    // 未完了タスクに対してソートをかける
    const sortLogic = (a: Task, b: Task) => {
      if (sortBy === "dueDate") {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      } else {
        const priorityA = calculatePriority(a.estimatedTime, a.dueDate);
        const priorityB = calculatePriority(b.estimatedTime, b.dueDate);

        if (priorityB.value !== priorityA.value) {
          return priorityB.value - priorityA.value;
        }
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
    };

    return {
      active: [...activeTasks].sort(sortLogic),
      completed: completedTasks,
    };
  }, [tasks, sortBy, currentTime]);

  // カレンダーの月移動
  const prevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear(calendarYear - 1);
    } else {
      setCalendarMonth(calendarMonth - 1);
    }
  };

  const nextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear(calendarYear + 1);
    } else {
      setCalendarMonth(calendarMonth + 1);
    }
  };

  // --- カレンダービューのレンダリング関数 ---
  const renderCalendarView = () => {
    const firstDay = new Date(calendarYear, calendarMonth, 1).getDay(); // 月の最初の曜日
    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate(); // 月の日数

    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null); // 前月の空枠
    for (let i = 1; i <= daysInMonth; i++) days.push(i); // 今月の日付

    return (
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm animate-in fade-in duration-200">
        {/* カレンダーヘッダー */}
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={prevMonth}
              className="p-2 hover:bg-slate-200 text-slate-600 rounded-xl transition duration-150"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-black text-slate-800">
              {calendarYear}年 {calendarMonth + 1}月
            </h2>
            <button
              onClick={nextMonth}
              className="p-2 hover:bg-slate-200 text-slate-600 rounded-xl transition duration-150"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <span className="text-xs text-slate-500 font-semibold flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />※
            優先度（着手ストレス）が高いほど自動的に色が濃くなります
          </span>
        </div>

        {/* 曜日・日付グリッド */}
        <div className="grid grid-cols-7 gap-px bg-slate-100">
          {["日", "月", "火", "水", "木", "金", "土"].map((d, idx) => (
            <div
              key={d}
              className={`py-3 text-center text-xs font-bold ${
                idx === 0
                  ? "text-rose-500"
                  : idx === 6
                    ? "text-indigo-500"
                    : "text-slate-500"
              } bg-white`}
            >
              {d}
            </div>
          ))}

          {days.map((day, index) => {
            if (day === null) {
              return (
                <div
                  key={`empty-${index}`}
                  className="bg-slate-50/50 min-h-[110px]"
                />
              );
            }

            // この日に期日を迎える課題をすべて取得
            const dayTasks = tasks.filter((t) => {
              const d = new Date(t.dueDate);
              return (
                d.getFullYear() === calendarYear &&
                d.getMonth() === calendarMonth &&
                d.getDate() === day
              );
            });

            // 本日判定
            const isToday =
              day === new Date().getDate() &&
              calendarMonth === new Date().getMonth() &&
              calendarYear === new Date().getFullYear();

            return (
              <div
                key={day}
                className={`bg-white min-h-[110px] p-2 border-t border-slate-100 flex flex-col justify-between transition duration-150 ${
                  isToday ? "bg-indigo-50/30 ring-1 ring-indigo-500/20" : ""
                }`}
              >
                {/* 日付ラベル */}
                <div className="flex justify-between items-center mb-1">
                  <span
                    className={`text-xs font-black p-1 w-6 h-6 rounded-lg flex items-center justify-center ${
                      isToday
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-slate-600"
                    }`}
                  >
                    {day}
                  </span>
                  {isToday && (
                    <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-wide">
                      Today
                    </span>
                  )}
                </div>

                {/* 課題のミニバッジリスト */}
                <div className="mt-1 space-y-1.5 flex-1 overflow-y-auto max-h-[85px] custom-scrollbar">
                  {dayTasks.map((t) => {
                    const priorityInfo = calculatePriority(
                      t.estimatedTime,
                      t.dueDate,
                    );
                    const opacity = getOpacityByPriority(priorityInfo.value);

                    const bgColor = t.isCompleted
                      ? "#cbd5e1"
                      : hexToRgba(t.class?.color || "#6366f1", opacity);

                    const textColor = t.isCompleted
                      ? "#64748b"
                      : opacity > 0.55
                        ? "#ffffff"
                        : "#1e293b";

                    return (
                      <div
                        key={t.id}
                        onClick={() =>
                          handleToggleComplete(t.id, t.isCompleted)
                        }
                        style={{ backgroundColor: bgColor, color: textColor }}
                        title={`${t.class?.name || "授業"}「${t.title}」\n優先度指数: ${priorityInfo.value}\nクリックで完了切り替え`}
                        className="text-[10px] font-bold p-1 px-1.5 rounded-md leading-snug flex items-center justify-between cursor-pointer hover:scale-[1.02] active:scale-[0.98] hover:shadow-sm transition duration-150 select-none truncate"
                      >
                        <span className="truncate flex-1 pr-1">{t.title}</span>
                        {t.isCompleted && (
                          <CheckCircle className="w-3 h-3 shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      {/* ヘッダー */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-600 text-white p-2 rounded-xl shadow-md">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                CampusTasks
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                大学の課題・スケジュール管理
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setInputTab("task");
              setIsAddModalOpen(true);
            }}
            className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-xl transition duration-200 shadow-md shadow-indigo-100"
          >
            <Plus className="w-4 h-4" />
            <span>新規登録 / 管理</span>
          </button>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3.5 rounded-xl flex items-center space-x-3 mb-6 shadow-sm">
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
            <p className="font-medium text-sm">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-600 border-t-transparent"></div>
            <p className="text-sm font-medium text-slate-500">
              データを読み込んでいます...
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* ビュー切り替え＆操作パネル */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              {/* 表示モードスイッチ */}
              <div className="flex bg-slate-200/80 p-1 rounded-2xl shadow-inner shrink-0">
                <button
                  onClick={() => setViewMode("list")}
                  className={`flex items-center space-x-2 px-5 py-2 rounded-xl text-xs font-black transition duration-200 ${
                    viewMode === "list"
                      ? "bg-white text-indigo-600 shadow-md"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <List className="w-4 h-4" />
                  <span>リスト表示</span>
                </button>
                <button
                  onClick={() => setViewMode("calendar")}
                  className={`flex items-center space-x-2 px-5 py-2 rounded-xl text-xs font-black transition duration-200 ${
                    viewMode === "calendar"
                      ? "bg-white text-indigo-600 shadow-md"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <CalendarIcon className="w-4 h-4" />
                  <span>カレンダー表示</span>
                </button>
              </div>

              {/* リスト表示中のソート操作UI */}
              {viewMode === "list" && (
                <div className="flex items-center space-x-2 bg-slate-200/60 p-1 rounded-xl shadow-sm">
                  <span className="text-xs text-slate-500 font-bold px-2 flex items-center gap-1">
                    <ArrowUpDown className="w-3 h-3" />
                    並び替え:
                  </span>
                  <button
                    onClick={() => setSortBy("dueDate")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition duration-200 ${
                      sortBy === "dueDate"
                        ? "bg-white text-indigo-600 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    期日順
                  </button>
                  <button
                    onClick={() => setSortBy("priority")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition duration-200 ${
                      sortBy === "priority"
                        ? "bg-white text-indigo-600 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    優先度順 (自動計算)
                  </button>
                </div>
              )}
            </div>

            {/* メイン切り替え部分 */}
            {viewMode === "calendar" ? (
              renderCalendarView()
            ) : (
              /* リスト表示エリア */
              <div className="space-y-8 animate-in fade-in duration-200">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2 mb-5">
                    <span>未完了の課題</span>
                    <span className="bg-indigo-100 text-indigo-700 text-xs px-2.5 py-0.5 rounded-full font-bold">
                      {sortedTasks.active.length}件
                    </span>
                  </h2>

                  {sortedTasks.active.length === 0 ? (
                    <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl py-12 px-4 text-center">
                      <CheckCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500 font-medium">
                        現在、未完了の課題はありません！
                      </p>
                      <button
                        onClick={() => {
                          setInputTab("task");
                          setIsAddModalOpen(true);
                        }}
                        className="mt-3 text-sm font-semibold text-indigo-600 hover:text-indigo-800"
                      >
                        新しい課題を登録する
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {sortedTasks.active.map((task) => {
                        const priorityInfo = calculatePriority(
                          task.estimatedTime,
                          task.dueDate,
                        );

                        return (
                          <div
                            key={task.id}
                            className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between relative overflow-hidden"
                          >
                            <div
                              className="absolute left-0 top-0 bottom-0 w-1.5"
                              style={{
                                backgroundColor: task.class?.color || "#6366f1",
                              }}
                            />

                            <div>
                              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                                <span
                                  className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                                  style={{
                                    backgroundColor: `${task.class?.color}15`,
                                    color: task.class?.color,
                                    border: `1px solid ${task.class?.color}30`,
                                  }}
                                >
                                  {task.class?.name || "授業不明"}
                                </span>

                                {priorityInfo.isOverdue ? (
                                  <span className="text-[11px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full flex items-center space-x-1 animate-pulse">
                                    <AlertTriangle className="w-3 h-3 shrink-0" />
                                    <span>期限切れ!</span>
                                  </span>
                                ) : (
                                  <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                    優先度指数:{" "}
                                    <span className="text-indigo-600">
                                      {priorityInfo.value}
                                    </span>
                                  </span>
                                )}
                              </div>

                              <h3 className="font-bold text-slate-800 text-base mb-4 leading-snug">
                                {task.title}
                              </h3>
                            </div>

                            <div className="border-t border-slate-100 pt-4 mt-2">
                              <div className="flex flex-col space-y-2 mb-4">
                                <div className="flex items-center text-slate-500 text-xs font-medium">
                                  <CalendarIcon className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                                  <span>
                                    期日:{" "}
                                    {new Date(
                                      task.dueDate,
                                    ).toLocaleDateString()}{" "}
                                    {new Date(task.dueDate).toLocaleTimeString(
                                      [],
                                      { hour: "2-digit", minute: "2-digit" },
                                    )}
                                  </span>
                                </div>
                                <div className="flex items-center text-slate-500 text-xs font-medium">
                                  <Clock className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                                  <span>
                                    予想所要時間: {task.estimatedTime} 分 (
                                    {Math.round(
                                      (task.estimatedTime / 60) * 10,
                                    ) / 10}{" "}
                                    時間)
                                  </span>
                                </div>
                                {task.memo && (
                                  <div className="bg-slate-50 rounded-lg p-2 text-slate-500 text-xs italic line-clamp-2">
                                    「 {task.memo} 」
                                  </div>
                                )}
                              </div>

                              {!priorityInfo.isOverdue && (
                                <div className="mb-4">
                                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold mb-1">
                                    <span>着手ストレス（優先度）</span>
                                    <span>
                                      {Math.min(
                                        Math.round(priorityInfo.value * 100),
                                        100,
                                      )}
                                      %
                                    </span>
                                  </div>
                                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                    <div
                                      className="h-full rounded-full transition-all duration-500"
                                      style={{
                                        width: `${Math.min(priorityInfo.value * 100, 100)}%`,
                                        backgroundColor:
                                          priorityInfo.value > 0.5
                                            ? "#f43f5e"
                                            : priorityInfo.value > 0.15
                                              ? "#eab308"
                                              : "#10b981",
                                      }}
                                    />
                                  </div>
                                </div>
                              )}

                              <div className="flex items-center justify-between">
                                <button
                                  onClick={() =>
                                    handleToggleComplete(
                                      task.id,
                                      task.isCompleted,
                                    )
                                  }
                                  className="flex items-center space-x-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition duration-150"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  <span>完了にする</span>
                                </button>

                                <div className="flex items-center space-x-1">
                                  <button
                                    onClick={() => openEditModal(task)}
                                    className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition duration-150"
                                    title="編集"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteTask(task.id)}
                                    className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition duration-150"
                                    title="削除"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 完了済みの課題エリア */}
                {sortedTasks.completed.length > 0 && (
                  <div className="border-t border-slate-200 pt-8">
                    <h2 className="text-lg font-bold text-slate-500 mb-4 flex items-center space-x-2">
                      <span>完了した課題</span>
                      <span className="bg-slate-200 text-slate-600 text-xs px-2 py-0.5 rounded-full font-bold">
                        {sortedTasks.completed.length}件
                      </span>
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {sortedTasks.completed.map((task) => (
                        <div
                          key={task.id}
                          className="bg-white/80 border border-slate-200 rounded-2xl p-5 shadow-sm opacity-65 flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center space-x-2 mb-2">
                              <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                                {task.class?.name || "授業不明"}
                              </span>
                            </div>
                            <h3 className="font-bold text-slate-400 text-sm line-through">
                              {task.title}
                            </h3>
                          </div>

                          <div className="border-t border-slate-100 pt-3 mt-3 flex items-center justify-between">
                            <button
                              onClick={() =>
                                handleToggleComplete(task.id, task.isCompleted)
                              }
                              className="flex items-center space-x-1 text-xs font-bold text-slate-500 hover:text-slate-800 bg-slate-100 px-2.5 py-1.5 rounded-lg transition"
                            >
                              <span>未完了に戻す</span>
                            </button>

                            <button
                              onClick={() => handleDeleteTask(task.id)}
                              className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition"
                              title="削除"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* 🚀 新規登録マルチモーダル (課題・授業・テンプレートの統合登録システム) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
            {/* ヘッダー・タブ切り替え */}
            <div className="border-b border-slate-100 bg-slate-50 flex flex-col">
              <div className="flex items-center justify-between px-6 pt-4 pb-2">
                <h3 className="font-black text-slate-800 text-base">
                  CampusTasks 新規登録
                </h3>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200/50 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex border-t border-slate-200">
                {(["task", "class", "template"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setInputTab(tab)}
                    className={`flex-1 py-3 text-xs font-bold text-center border-b-2 transition-colors duration-150 ${
                      inputTab === tab
                        ? "border-indigo-600 text-indigo-600 bg-white"
                        : "border-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                    }`}
                  >
                    {tab === "task" && "課題を登録"}
                    {tab === "class" && "授業を登録"}
                    {tab === "template" && "テンプレート"}
                  </button>
                ))}
              </div>
            </div>

            {/* 各種フォームコンテンツ */}
            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
              {/* 1. 課題追加フォーム */}
              {inputTab === "task" && (
                <form onSubmit={handleAddTask} className="space-y-4">
                  {/* 【新機能】テンプレート呼び出し用ドロップダウン */}
                  {templates.length > 0 && (
                    <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-3">
                      <label className="block text-[10px] font-black text-indigo-600 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <Copy className="w-3.5 h-3.5" />
                        <span>テンプレートから呼び出す（自動入力）</span>
                      </label>
                      <div className="relative">
                        <select
                          onChange={(e) => handleApplyTemplate(e.target.value)}
                          defaultValue=""
                          className="w-full bg-white border border-indigo-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none appearance-none cursor-pointer text-slate-700"
                        >
                          <option value="">-- 保存されたひな形を選択 --</option>
                          {templates.map((t) => (
                            <option key={t.id} value={t.id}>
                              [{t.class?.name || "共通"}] {t.title} (
                              {t.estimatedTime}分)
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-indigo-500 absolute right-2.5 top-2.5 pointer-events-none" />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      授業を選択
                    </label>
                    <div className="relative">
                      <select
                        value={newClassId}
                        onChange={(e) => setNewClassId(Number(e.target.value))}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition outline-none appearance-none cursor-pointer"
                        required
                      >
                        <option value="">授業を選んでください</option>
                        {classes.map((cls) => (
                          <option key={cls.id} value={cls.id}>
                            {cls.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      課題のタイトル
                    </label>
                    <input
                      type="text"
                      placeholder="例: 中間レポート提出"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition outline-none"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        期日
                      </label>
                      <input
                        type="datetime-local"
                        value={newDueDate}
                        onChange={(e) => setNewDueDate(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        予想時間 (分)
                      </label>
                      <input
                        type="number"
                        min="1"
                        placeholder="30"
                        value={newEstimatedTime}
                        onChange={(e) =>
                          setNewEstimatedTime(Number(e.target.value))
                        }
                        className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition outline-none"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      メモ (任意)
                    </label>
                    <textarea
                      placeholder="参考資料や注意点など"
                      value={newMemo}
                      onChange={(e) => setNewMemo(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition outline-none h-20 resize-none"
                    />
                  </div>

                  <div className="flex items-center space-x-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsAddModalOpen(false)}
                      className="w-1/2 border border-slate-200 hover:bg-slate-50 text-slate-500 font-bold py-2.5 rounded-xl text-sm transition"
                    >
                      キャンセル
                    </button>
                    <button
                      type="submit"
                      className="w-1/2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-sm transition shadow-md shadow-indigo-100"
                    >
                      課題を登録
                    </button>
                  </div>
                </form>
              )}

              {/* 2. 授業登録フォーム */}
              {inputTab === "class" && (
                <form onSubmit={handleAddClass} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      授業名
                    </label>
                    <input
                      type="text"
                      placeholder="例: データベース論"
                      value={newClassName}
                      onChange={(e) => setNewClassName(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition outline-none"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        開講年度
                      </label>
                      <input
                        type="number"
                        value={newClassYear}
                        onChange={(e) =>
                          setNewClassYear(Number(e.target.value))
                        }
                        className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        開講学期
                      </label>
                      <div className="relative">
                        <select
                          value={newClassSemester}
                          onChange={(e) => setNewClassSemester(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition outline-none appearance-none cursor-pointer"
                        >
                          <option value="前期">前期</option>
                          <option value="後期">後期</option>
                          <option value="通年">通年</option>
                        </select>
                        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      テーマカラー
                    </label>
                    <div className="flex flex-wrap gap-2.5 p-3 bg-slate-50 rounded-xl border border-slate-200">
                      {[
                        "#ef4444",
                        "#f97316",
                        "#eab308",
                        "#10b981",
                        "#3b82f6",
                        "#8b5cf6",
                        "#ec4899",
                        "#64748b",
                      ].map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setNewClassColor(color)}
                          className={`w-8 h-8 rounded-full border-2 transition-all transform hover:scale-105 active:scale-95 ${
                            newClassColor === color
                              ? "border-slate-800 scale-110 shadow-md shadow-slate-300"
                              : "border-transparent"
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsAddModalOpen(false)}
                      className="w-1/2 border border-slate-200 hover:bg-slate-50 text-slate-500 font-bold py-2.5 rounded-xl text-sm transition"
                    >
                      キャンセル
                    </button>
                    <button
                      type="submit"
                      className="w-1/2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-sm transition shadow-md shadow-indigo-100"
                    >
                      授業を登録
                    </button>
                  </div>
                </form>
              )}

              {/* 3. テンプレート登録フォーム */}
              {inputTab === "template" && (
                <form onSubmit={handleAddTemplate} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      対象の授業を選択
                    </label>
                    <div className="relative">
                      <select
                        value={newTemplateClassId}
                        onChange={(e) =>
                          setNewTemplateClassId(Number(e.target.value))
                        }
                        className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition outline-none appearance-none cursor-pointer"
                        required
                      >
                        <option value="">授業を選択してください</option>
                        {classes.map((cls) => (
                          <option key={cls.id} value={cls.id}>
                            {cls.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      頻出課題のタイトル
                    </label>
                    <input
                      type="text"
                      placeholder="例: 【毎週】演習レポート提出"
                      value={newTemplateTitle}
                      onChange={(e) => setNewTemplateTitle(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      想定される時間 (分)
                    </label>
                    <input
                      type="number"
                      min="1"
                      placeholder="60"
                      value={newTemplateEstimatedTime}
                      onChange={(e) =>
                        setNewTemplateEstimatedTime(Number(e.target.value))
                      }
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      固定メモ (任意)
                    </label>
                    <textarea
                      placeholder="例: 指定のリポジトリにpushすること"
                      value={newTemplateMemo}
                      onChange={(e) => setNewTemplateMemo(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition outline-none h-20 resize-none"
                    />
                  </div>

                  <div className="flex items-center space-x-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsAddModalOpen(false)}
                      className="w-1/2 border border-slate-200 hover:bg-slate-50 text-slate-500 font-bold py-2.5 rounded-xl text-sm transition"
                    >
                      キャンセル
                    </button>
                    <button
                      type="submit"
                      className="w-1/2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-sm transition shadow-md shadow-indigo-100"
                    >
                      テンプレート登録
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. 課題編集用モーダル */}
      {editingTask && editTaskData && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-800">課題の編集</h3>
              <button
                onClick={() => {
                  setEditingTask(null);
                  setEditTaskData(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateTask} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  授業を変更
                </label>
                <div className="relative">
                  <select
                    value={editTaskData.classId}
                    onChange={(e) =>
                      setEditTaskData({
                        ...editTaskData,
                        classId: Number(e.target.value),
                      })
                    }
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition outline-none appearance-none cursor-pointer"
                    required
                  >
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  課題のタイトル
                </label>
                <input
                  type="text"
                  value={editTaskData.title}
                  onChange={(e) =>
                    setEditTaskData({ ...editTaskData, title: e.target.value })
                  }
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    期日
                  </label>
                  <input
                    type="datetime-local"
                    value={editTaskData.dueDate}
                    onChange={(e) =>
                      setEditTaskData({
                        ...editTaskData,
                        dueDate: e.target.value,
                      })
                    }
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    予想時間 (分)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editTaskData.estimatedTime}
                    onChange={(e) =>
                      setEditTaskData({
                        ...editTaskData,
                        estimatedTime: Number(e.target.value),
                      })
                    }
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  メモ (任意)
                </label>
                <textarea
                  value={editTaskData.memo}
                  onChange={(e) =>
                    setEditTaskData({ ...editTaskData, memo: e.target.value })
                  }
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition outline-none h-20 resize-none"
                />
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingTask(null);
                    setEditTaskData(null);
                  }}
                  className="w-1/2 border border-slate-200 hover:bg-slate-50 text-slate-500 font-bold py-2.5 rounded-xl text-sm transition"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="w-1/2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-sm transition shadow-md shadow-indigo-100"
                >
                  変更を保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

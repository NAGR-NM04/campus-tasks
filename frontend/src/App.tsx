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
  Settings,
  Sun,
  Moon,
  Check,
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

  // 🌙 ダークモード用のStateを追加 (初期値はライトモード = false)
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

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

  // 2. 授業登録・編集用のState
  const [newClassName, setNewClassName] = useState("");
  const [newClassYear, setNewClassYear] = useState<number>(
    new Date().getFullYear(),
  );
  const [newClassSemester, setNewClassSemester] = useState("前期");
  const [newClassColor, setNewClassColor] = useState("#3b82f6");
  const [editingClassId, setEditingClassId] = useState<number | null>(null);

  // 3. テンプレート登録・編集用のState
  const [newTemplateTitle, setNewTemplateTitle] = useState("");
  const [newTemplateEstimatedTime, setNewTemplateEstimatedTime] = useState(30);
  const [newTemplateMemo, setNewTemplateMemo] = useState("");
  const [newTemplateClassId, setNewTemplateClassId] = useState<number | "">("");
  const [editingTemplateId, setEditingTemplateId] = useState<number | null>(
    null,
  );

  // 課題編集用モーダル・フォームの状態
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
      // ユーザーの本物のRenderのバックエンドURL
      return "https://campus-tasks-backend.onrender.com";
    }

    return `http://localhost:${backendPort}`;
  };

  const API_BASE_URL = getEnvUrl();

  // 現在時刻を1分ごとに更新
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // 初期データ取得
  const fetchData = async () => {
    try {
      setLoading(true);
      const [classesRes, tasksRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/classes`),
        axios.get(`${API_BASE_URL}/api/tasks`),
      ]);
      setClasses(classesRes.data);
      setTasks(tasksRes.data);

      try {
        const templatesRes = await axios.get(`${API_BASE_URL}/api/templates`);
        setTemplates(templatesRes.data);
      } catch (templateErr) {
        console.warn("Templates API not available yet.");
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

  useEffect(() => {
    fetchData();
  }, [API_BASE_URL]);

  // テンプレート呼び出し（自動入力）処理
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

  // 1-A. 新規課題の登録処理
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

      // フォーム初期化
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

  // 2-A. 授業の新規登録・編集の送信処理
  const handleSaveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim() || !newClassYear) return;

    try {
      if (editingClassId !== null) {
        await axios.put(`${API_BASE_URL}/api/classes/${editingClassId}`, {
          name: newClassName,
          year: Number(newClassYear),
          semester: newClassSemester,
          color: newClassColor,
        });

        setClasses(
          classes.map((c) =>
            c.id === editingClassId
              ? {
                  ...c,
                  name: newClassName,
                  year: Number(newClassYear),
                  semester: newClassSemester,
                  color: newClassColor,
                }
              : c,
          ),
        );

        setTasks(
          tasks.map((t) =>
            t.classId === editingClassId
              ? {
                  ...t,
                  class: {
                    ...t.class,
                    name: newClassName,
                    color: newClassColor,
                  },
                }
              : t,
          ),
        );

        setEditingClassId(null);
        alert("授業を更新しました！");
      } else {
        const response = await axios.post(`${API_BASE_URL}/api/classes`, {
          name: newClassName,
          year: Number(newClassYear),
          semester: newClassSemester,
          color: newClassColor,
        });

        setClasses([...classes, response.data]);
        setNewClassId(response.data.id);
        setInputTab("task");
        alert("授業を新しく登録しました！");
      }

      setNewClassName("");
      setNewClassColor("#3b82f6");
    } catch (err) {
      console.error("Save class error:", err);
      alert("授業の保存に失敗しました。");
    }
  };

  // 2-B. 授業の編集フォーム呼び出し
  const startEditClass = (cls: ClassInfo) => {
    setEditingClassId(cls.id);
    setNewClassName(cls.name);
    setNewClassYear(cls.year);
    setNewClassSemester(cls.semester);
    setNewClassColor(cls.color);
  };

  // 2-C. 授業の削除処理
  const handleDeleteClass = async (classId: number) => {
    const hasAssignments = tasks.some((t) => t.classId === classId);
    const hasTemplates = templates.some((t) => t.classId === classId);

    let warningMsg = "この授業を削除してもよろしいですか？";
    if (hasAssignments || hasTemplates) {
      warningMsg =
        "⚠️警告: この授業に紐づいている課題やテンプレートも一緒にすべて削除されますが、本当によろしいですか？";
    }

    if (!confirm(warningMsg)) return;

    try {
      await axios.delete(`${API_BASE_URL}/api/classes/${classId}`);

      setClasses(classes.filter((c) => c.id !== classId));
      setTasks(tasks.filter((t) => t.classId !== classId));
      setTemplates(templates.filter((t) => t.classId !== classId));

      if (newClassId === classId) setNewClassId("");
      if (editingClassId === classId) setEditingClassId(null);

      alert("授業と紐づく全データを削除しました。");
    } catch (err) {
      console.error("Delete class error:", err);
      alert("授業の削除に失敗しました。");
    }
  };

  // 3-A. テンプレートの新規登録・編集の送信処理
  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateTitle.trim() || !newTemplateClassId) return;

    try {
      if (editingTemplateId !== null) {
        await axios.put(`${API_BASE_URL}/api/templates/${editingTemplateId}`, {
          name: newTemplateTitle,
          estimatedTime: Number(newTemplateEstimatedTime),
          memo: newTemplateMemo,
          classId: Number(newTemplateClassId),
        });

        const updatedClass = classes.find(
          (c) => c.id === Number(newTemplateClassId),
        )!;

        setTemplates(
          templates.map((t) =>
            t.id === editingTemplateId
              ? {
                  ...t,
                  title: newTemplateTitle,
                  estimatedTime: Number(newTemplateEstimatedTime),
                  memo: newTemplateMemo,
                  classId: Number(newTemplateClassId),
                  class: updatedClass,
                }
              : t,
          ),
        );

        setEditingTemplateId(null);
        alert("テンプレートを更新しました！");
      } else {
        const response = await axios.post(`${API_BASE_URL}/api/templates`, {
          name: newTemplateTitle,
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
        setInputTab("task");
        alert("頻出課題テンプレートを保存しました！");
      }

      setNewTemplateTitle("");
      setNewTemplateEstimatedTime(30);
      setNewTemplateMemo("");
      setNewTemplateClassId("");
    } catch (err) {
      console.error("Save template error:", err);
      alert("テンプレートの保存に失敗しました。");
    }
  };

  // 3-B. テンプレートの編集フォーム呼び出し
  const startEditTemplate = (tmpl: Template) => {
    setEditingTemplateId(tmpl.id);
    setNewTemplateTitle(tmpl.title);
    setNewTemplateEstimatedTime(tmpl.estimatedTime);
    setNewTemplateMemo(tmpl.memo || "");
    setNewTemplateClassId(tmpl.classId);
  };

  // 3-C. テンプレートの削除処理
  const handleDeleteTemplate = async (templateId: number) => {
    if (!confirm("このテンプレートを削除してもよろしいですか？")) return;

    try {
      await axios.delete(`${API_BASE_URL}/api/templates/${templateId}`);
      setTemplates(templates.filter((t) => t.id !== templateId));

      if (editingTemplateId === templateId) setEditingTemplateId(null);
      alert("テンプレートを削除しました。");
    } catch (err) {
      console.error("Delete template error:", err);
      alert("テンプレートの削除に失敗しました。");
    }
  };

  // 4-A. 課題の編集用モーダルを開く
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

  // 4-B. 課題 of 編集（保存）処理
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

  // 5. 課題の完了・未完了切り替え
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

  // 6. 課題の削除処理
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

  // 優先度の自動算出
  const calculatePriority = (
    estimatedTimeMinutes: number,
    dueDateStr: string,
  ) => {
    const dueDate = new Date(dueDateStr);
    const diffMs = dueDate.getTime() - currentTime.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours <= 0) {
      return { value: 99.9, isOverdue: true };
    }

    const estimatedHours = estimatedTimeMinutes / 60;
    const priority = estimatedHours / diffHours;
    return { value: Number(priority.toFixed(2)), isOverdue: false };
  };

  // 並び替え・整理されたリスト
  const sortedTasks = useMemo(() => {
    const activeTasks = tasks.filter((t) => !t.isCompleted);
    const completedTasks = tasks.filter((t) => t.isCompleted);

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

  // カレンダー移動
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

  // カレンダービューのレンダリング
  const renderCalendarView = () => {
    const firstDay = new Date(calendarYear, calendarMonth, 1).getDay();
    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();

    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);

    return (
      <div
        className={`rounded-2xl border overflow-hidden shadow-sm transition-colors duration-300 ${
          isDarkMode
            ? "bg-slate-900 border-slate-800"
            : "bg-white border-slate-200"
        }`}
      >
        {/* カレンダーヘッダー */}
        <div
          className={`p-5 border-b flex flex-col sm:flex-row justify-between items-center gap-4 transition-colors duration-300 ${
            isDarkMode
              ? "bg-slate-800/50 border-slate-800"
              : "bg-slate-50 border-slate-200"
          }`}
        >
          <div className="flex items-center space-x-4">
            <button
              onClick={prevMonth}
              className={`p-2 rounded-xl transition duration-150 ${
                isDarkMode
                  ? "hover:bg-slate-800 text-slate-350"
                  : "hover:bg-slate-200 text-slate-600"
              }`}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2
              className={`text-lg font-black ${isDarkMode ? "text-white" : "text-slate-800"}`}
            >
              {calendarYear}年 {calendarMonth + 1}月
            </h2>
            <button
              onClick={nextMonth}
              className={`p-2 rounded-xl transition duration-150 ${
                isDarkMode
                  ? "hover:bg-slate-800 text-slate-350"
                  : "hover:bg-slate-200 text-slate-600"
              }`}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <span
            className={`text-xs font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-full ${
              isDarkMode
                ? "bg-indigo-950/40 text-indigo-300 border border-indigo-900/30"
                : "bg-indigo-50 text-indigo-700 border border-indigo-100"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />※
            優先度（着手ストレス）が高いほど自動的に色が濃くなります
          </span>
        </div>

        {/* 曜日・日付グリッド */}
        <div
          className={`grid grid-cols-7 gap-px ${isDarkMode ? "bg-slate-800" : "bg-slate-100"}`}
        >
          {["日", "月", "火", "水", "木", "金", "土"].map((d, idx) => (
            <div
              key={d}
              className={`py-3 text-center text-xs font-bold transition-colors duration-300 ${
                isDarkMode ? "bg-slate-900" : "bg-white"
              } ${
                idx === 0
                  ? "text-rose-500"
                  : idx === 6
                    ? "text-indigo-500"
                    : isDarkMode
                      ? "text-slate-400"
                      : "text-slate-550"
              }`}
            >
              {d}
            </div>
          ))}

          {days.map((day, index) => {
            if (day === null) {
              return (
                <div
                  key={`empty-${index}`}
                  className={`min-h-[110px] ${isDarkMode ? "bg-slate-950/20" : "bg-slate-50/50"}`}
                />
              );
            }

            // この日に期日を迎える課題
            const dayTasks = tasks.filter((t) => {
              const d = new Date(t.dueDate);
              return (
                d.getFullYear() === calendarYear &&
                d.getMonth() === calendarMonth &&
                d.getDate() === day
              );
            });

            const isToday =
              day === new Date().getDate() &&
              calendarMonth === new Date().getMonth() &&
              calendarYear === new Date().getFullYear();

            return (
              <div
                key={day}
                className={`min-h-[110px] p-2 border-t flex flex-col justify-between transition-all duration-150 ${
                  isDarkMode
                    ? "bg-slate-900 border-slate-800/60"
                    : "bg-white border-slate-100"
                } ${
                  isToday
                    ? isDarkMode
                      ? "bg-indigo-950/20 ring-1 ring-indigo-500/30"
                      : "bg-indigo-50/30 ring-1 ring-indigo-500/20"
                    : ""
                }`}
              >
                {/* 日付ラベル */}
                <div className="flex justify-between items-center mb-1">
                  <span
                    className={`text-xs font-black p-1 w-6 h-6 rounded-lg flex items-center justify-center ${
                      isToday
                        ? "bg-indigo-600 text-white shadow-sm"
                        : isDarkMode
                          ? "text-slate-350"
                          : "text-slate-600"
                    }`}
                  >
                    {day}
                  </span>
                  {isToday && (
                    <span className="text-[9px] font-bold text-indigo-650 uppercase tracking-wide">
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
                      ? isDarkMode
                        ? "#334155"
                        : "#cbd5e1"
                      : hexToRgba(t.class?.color || "#6366f1", opacity);

                    const textColor = t.isCompleted
                      ? isDarkMode
                        ? "#94a3b8"
                        : "#64748b"
                      : opacity > 0.55
                        ? "#ffffff"
                        : isDarkMode
                          ? "#f8fafc"
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
    <div
      className={`min-h-screen transition-colors duration-300 ${
        isDarkMode
          ? "bg-slate-950 text-slate-100"
          : "bg-slate-50 text-slate-800"
      } font-sans`}
    >
      {/* すりガラス調ヘッダー */}
      <header
        className={`border-b sticky top-0 z-40 shadow-sm transition-colors duration-300 ${
          isDarkMode
            ? "bg-slate-900 border-slate-800"
            : "bg-white border-slate-200"
        }`}
      >
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-650 text-white p-2.5 rounded-2xl shadow-md">
              <BookOpen className="w-5.5 h-5.5" />
            </div>
            <div>
              <h1
                className={`text-xl font-black tracking-tight transition-colors duration-350 ${
                  isDarkMode ? "text-white" : "text-slate-900"
                }`}
              >
                CampusTasks
              </h1>
              <p
                className={`text-[10px] font-bold tracking-wider uppercase ${
                  isDarkMode ? "text-slate-400" : "text-slate-450"
                }`}
              >
                Academy Schedule & Task Hub
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* 🌙 ダークモードトグルボタン */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-2.5 rounded-2xl transition-all duration-200 hover:scale-105 active:scale-95 ${
                isDarkMode
                  ? "bg-slate-800 text-amber-400 hover:bg-slate-700"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
              title={
                isDarkMode ? "ライトモードに切り替え" : "ダークモードに切り替え"
              }
            >
              {isDarkMode ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </button>

            <button
              onClick={() => {
                setInputTab("task");
                setIsAddModalOpen(true);
              }}
              className={`flex items-center space-x-2 font-extrabold px-5 py-2.5 rounded-2xl transition-all duration-200 shadow-sm active:scale-95 ${
                isDarkMode
                  ? "bg-slate-800 text-slate-200 hover:bg-slate-750"
                  : "bg-slate-900 text-white hover:bg-slate-800"
              }`}
            >
              <Settings className="w-4.5 h-4.5" />
              <span>新規登録 / 管理</span>
            </button>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {error && (
          <div
            className={`border px-5 py-4 rounded-2xl flex items-center space-x-3 mb-6 shadow-sm ${
              isDarkMode
                ? "bg-rose-950/20 border-rose-900/30 text-rose-300"
                : "bg-rose-50 border-rose-200 text-rose-700"
            }`}
          >
            <AlertCircle className="w-5.5 h-5.5 text-rose-500 shrink-0" />
            <p className="font-bold text-sm">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-600 border-t-transparent"></div>
            <p
              className={`text-sm font-medium ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}
            >
              データを読み込んでいます...
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* 操作パネル（表示切り替え ＆ ソート） */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              {/* 表示モードトグル */}
              <div
                className={`flex p-1 rounded-2xl shadow-inner shrink-0 ${
                  isDarkMode ? "bg-slate-900" : "bg-slate-200/80"
                }`}
              >
                <button
                  onClick={() => setViewMode("list")}
                  className={`flex items-center space-x-2 px-5 py-2 rounded-xl text-xs font-black transition duration-200 ${
                    viewMode === "list"
                      ? isDarkMode
                        ? "bg-slate-800 text-indigo-400 shadow-md"
                        : "bg-white text-indigo-650 shadow-md"
                      : isDarkMode
                        ? "text-slate-400 hover:text-slate-200"
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
                      ? isDarkMode
                        ? "bg-slate-800 text-indigo-400 shadow-md"
                        : "bg-white text-indigo-650 shadow-md"
                      : isDarkMode
                        ? "text-slate-400 hover:text-slate-200"
                        : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <CalendarIcon className="w-4 h-4" />
                  <span>カレンダー表示</span>
                </button>
              </div>

              {/* ソートボタン（リスト表示時のみ） */}
              {viewMode === "list" && (
                <div
                  className={`flex items-center space-x-2 p-1 rounded-xl shadow-sm border ${
                    isDarkMode
                      ? "bg-slate-900 border-slate-800"
                      : "bg-slate-200/60 border-transparent"
                  }`}
                >
                  <span
                    className={`text-xs font-bold px-2 flex items-center gap-1 ${
                      isDarkMode ? "text-slate-400" : "text-slate-500"
                    }`}
                  >
                    <ArrowUpDown className="w-3 h-3" />
                    並び替え:
                  </span>
                  <button
                    onClick={() => setSortBy("dueDate")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition duration-200 ${
                      sortBy === "dueDate"
                        ? isDarkMode
                          ? "bg-slate-800 text-indigo-400"
                          : "bg-white text-indigo-600 shadow-sm"
                        : isDarkMode
                          ? "text-slate-400 hover:text-slate-200"
                          : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    期日順
                  </button>
                  <button
                    onClick={() => setSortBy("priority")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition duration-200 ${
                      sortBy === "priority"
                        ? isDarkMode
                          ? "bg-slate-800 text-indigo-400"
                          : "bg-white text-indigo-600 shadow-sm"
                        : isDarkMode
                          ? "text-slate-400 hover:text-slate-200"
                          : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    優先度順 (自動計算)
                  </button>
                </div>
              )}
            </div>

            {/* 各メインビューの切り替え */}
            {viewMode === "calendar" ? (
              renderCalendarView()
            ) : (
              /* ==================== リスト表示 ==================== */
              <div className="space-y-8 animate-in fade-in duration-200">
                <div>
                  <h2
                    className={`text-lg font-bold flex items-center space-x-2 mb-5 ${
                      isDarkMode ? "text-slate-200" : "text-slate-900"
                    }`}
                  >
                    <span>未完了の課題</span>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                        isDarkMode
                          ? "bg-indigo-950 text-indigo-300"
                          : "bg-indigo-100 text-indigo-700"
                      }`}
                    >
                      {sortedTasks.active.length}件
                    </span>
                  </h2>

                  {sortedTasks.active.length === 0 ? (
                    <div
                      className={`border-2 border-dashed rounded-2xl py-12 px-4 text-center ${
                        isDarkMode
                          ? "border-slate-800 bg-slate-900/30"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <CheckCircle
                        className={`w-12 h-12 mx-auto mb-3 ${isDarkMode ? "text-slate-700" : "text-slate-300"}`}
                      />
                      <p
                        className={`font-medium ${isDarkMode ? "text-slate-400" : "text-slate-550"}`}
                      >
                        現在、未完了の課題はありません！
                      </p>
                      <button
                        onClick={() => {
                          setInputTab("task");
                          setIsAddModalOpen(true);
                        }}
                        className="mt-3 text-sm font-semibold text-indigo-500 hover:text-indigo-400"
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
                            className={`border rounded-2xl p-5 shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between relative overflow-hidden ${
                              isDarkMode
                                ? "bg-slate-900 border-slate-800"
                                : "bg-white border-slate-200"
                            }`}
                          >
                            {/* 授業カラーのインジケータ */}
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
                                    backgroundColor: isDarkMode
                                      ? `${task.class?.color}25`
                                      : `${task.class?.color}15`,
                                    color: task.class?.color,
                                    border: `1px solid ${task.class?.color}30`,
                                  }}
                                >
                                  {task.class?.name || "授業不明"}
                                </span>

                                {priorityInfo.isOverdue ? (
                                  <span className="text-[11px] font-bold text-rose-500 bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 rounded-full flex items-center space-x-1 animate-pulse">
                                    <AlertTriangle className="w-3 h-3 shrink-0" />
                                    <span>期限切れ!</span>
                                  </span>
                                ) : (
                                  <span
                                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                                      isDarkMode
                                        ? "text-slate-455 bg-slate-800/80 border-slate-700/60"
                                        : "text-slate-500 bg-slate-100 border-transparent"
                                    }`}
                                  >
                                    優先度指数:{" "}
                                    <span className="text-indigo-400 font-extrabold">
                                      {priorityInfo.value}
                                    </span>
                                  </span>
                                )}
                              </div>

                              <h3
                                className={`font-bold text-base mb-4 leading-snug ${isDarkMode ? "text-slate-100" : "text-slate-800"}`}
                              >
                                {task.title}
                              </h3>
                            </div>

                            <div
                              className={`border-t pt-4 mt-2 ${isDarkMode ? "border-slate-800" : "border-slate-100"}`}
                            >
                              <div className="flex flex-col space-y-2 mb-4">
                                <div
                                  className={`flex items-center text-xs font-medium ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}
                                >
                                  <CalendarIcon className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
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
                                <div
                                  className={`flex items-center text-xs font-medium ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}
                                >
                                  <Clock className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                                  <span>
                                    予想所要時間: {task.estimatedTime} 分 (
                                    {Math.round(
                                      (task.estimatedTime / 60) * 10,
                                    ) / 10}{" "}
                                    時間)
                                  </span>
                                </div>
                                {task.memo && (
                                  <div
                                    className={`rounded-lg p-2 text-xs italic line-clamp-2 ${
                                      isDarkMode
                                        ? "bg-slate-950 text-slate-450"
                                        : "bg-slate-50 text-slate-500"
                                    }`}
                                  >
                                    「 {task.memo} 」
                                  </div>
                                )}
                              </div>

                              {/* 優先度 リアルタイム進捗ゲージ */}
                              {!priorityInfo.isOverdue && (
                                <div className="mb-4">
                                  <div className="flex items-center justify-between text-[10px] text-slate-450 font-bold mb-1">
                                    <span>着手ストレス（優先度）</span>
                                    <span>
                                      {Math.min(
                                        Math.round(priorityInfo.value * 100),
                                        100,
                                      )}
                                      %
                                    </span>
                                  </div>
                                  <div
                                    className={`w-full h-2 rounded-full overflow-hidden ${isDarkMode ? "bg-slate-800" : "bg-slate-100"}`}
                                  >
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
                                  className={`flex items-center space-x-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition duration-150 ${
                                    isDarkMode
                                      ? "text-indigo-400 bg-indigo-950/40 hover:bg-indigo-900/40"
                                      : "text-indigo-650 bg-indigo-50 hover:bg-indigo-100"
                                  }`}
                                >
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  <span>完了にする</span>
                                </button>

                                <div className="flex items-center space-x-1">
                                  <button
                                    onClick={() => openEditModal(task)}
                                    className={`p-1.5 rounded-lg transition duration-150 ${
                                      isDarkMode
                                        ? "hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                                        : "hover:bg-slate-100 text-slate-400 hover:text-slate-650"
                                    }`}
                                    title="編集"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteTask(task.id)}
                                    className={`p-1.5 rounded-lg transition duration-150 ${
                                      isDarkMode
                                        ? "hover:bg-rose-950/30 text-slate-400 hover:text-rose-400"
                                        : "hover:bg-rose-50 text-slate-400 hover:text-rose-600"
                                    }`}
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
                  <div
                    className={`border-t pt-8 ${isDarkMode ? "border-slate-800" : "border-slate-200"}`}
                  >
                    <h2
                      className={`text-lg font-bold mb-4 flex items-center space-x-2 ${
                        isDarkMode ? "text-slate-400" : "text-slate-500"
                      }`}
                    >
                      <span>完了した課題</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                          isDarkMode
                            ? "bg-slate-800 text-slate-400"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {sortedTasks.completed.length}件
                      </span>
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {sortedTasks.completed.map((task) => (
                        <div
                          key={task.id}
                          className={`border rounded-2xl p-5 shadow-sm flex flex-col justify-between transition duration-200 ${
                            isDarkMode
                              ? "bg-slate-900/60 border-slate-850 opacity-50 hover:opacity-85"
                              : "bg-white/80 border-slate-200 opacity-65"
                          }`}
                        >
                          <div>
                            <div className="flex items-center space-x-2 mb-2">
                              <span
                                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                  isDarkMode
                                    ? "text-slate-400 bg-slate-800"
                                    : "text-slate-450 bg-slate-100"
                                }`}
                              >
                                {task.class?.name || "授業不明"}
                              </span>
                            </div>
                            <h3 className="font-bold text-sm line-through text-slate-400">
                              {task.title}
                            </h3>
                          </div>

                          <div
                            className={`border-t pt-3 mt-3 flex items-center justify-between ${
                              isDarkMode
                                ? "border-slate-800/80"
                                : "border-slate-100"
                            }`}
                          >
                            <button
                              onClick={() =>
                                handleToggleComplete(task.id, task.isCompleted)
                              }
                              className={`flex items-center space-x-1 text-xs font-bold px-2.5 py-1.5 rounded-lg transition ${
                                isDarkMode
                                  ? "text-slate-350 bg-slate-800 hover:bg-slate-700"
                                  : "text-slate-600 bg-slate-100 hover:bg-slate-200"
                              }`}
                            >
                              <span>未完了に戻す</span>
                            </button>

                            <button
                              onClick={() => handleDeleteTask(task.id)}
                              className={`p-1 rounded-lg transition ${
                                isDarkMode
                                  ? "hover:bg-rose-950/20 text-slate-400 hover:text-rose-400"
                                  : "hover:bg-rose-50 text-slate-400 hover:text-rose-600"
                              }`}
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
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div
            className={`rounded-2xl w-full max-w-md shadow-xl border overflow-hidden flex flex-col max-h-[90vh] ${
              isDarkMode
                ? "bg-slate-900 border-slate-800"
                : "bg-white border-slate-100"
            }`}
          >
            {/* ヘッダー・タブ */}
            <div
              className={`border-b flex flex-col ${isDarkMode ? "border-slate-800 bg-slate-900/60" : "border-slate-100 bg-slate-50"}`}
            >
              <div className="flex items-center justify-between px-6 pt-4 pb-2">
                <h3
                  className={`font-black text-base ${isDarkMode ? "text-slate-100" : "text-slate-800"}`}
                >
                  CampusTasks 管理パネル
                </h3>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className={`p-1 rounded-lg transition ${isDarkMode ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800" : "text-slate-400 hover:text-slate-600 hover:bg-slate-200"}`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex border-t border-slate-200/20">
                {(["task", "class", "template"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setInputTab(tab)}
                    className={`flex-1 py-3 text-xs font-bold text-center border-b-2 transition-colors duration-150 ${
                      inputTab === tab
                        ? isDarkMode
                          ? "border-indigo-500 text-indigo-400 bg-slate-900/80"
                          : "border-indigo-600 text-indigo-650 bg-white"
                        : isDarkMode
                          ? "border-transparent text-slate-400 hover:bg-slate-800"
                          : "border-transparent text-slate-550 hover:bg-slate-100"
                    }`}
                  >
                    {tab === "task" && "課題を登録"}
                    {tab === "class" && "授業の管理"}
                    {tab === "template" && "テンプレート"}
                  </button>
                ))}
              </div>
            </div>

            {/* 各フォームコンテンツ */}
            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
              {/* 1. 課題追加フォーム */}
              {inputTab === "task" && (
                <form onSubmit={handleAddTask} className="space-y-4">
                  {/* テンプレートからの自動入力メニュー */}
                  {templates.length > 0 && (
                    <div
                      className={`border rounded-xl p-3 ${
                        isDarkMode
                          ? "bg-indigo-950/20 border-indigo-900/30"
                          : "bg-indigo-50/50 border-indigo-100"
                      }`}
                    >
                      <label
                        className={`block text-[10px] font-black uppercase tracking-wider mb-1 flex items-center gap-1.5 ${
                          isDarkMode ? "text-indigo-400" : "text-indigo-600"
                        }`}
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>テンプレートから呼び出す（自動入力）</span>
                      </label>
                      <div className="relative">
                        <select
                          onChange={(e) => handleApplyTemplate(e.target.value)}
                          defaultValue=""
                          className={`w-full border rounded-lg px-2.5 py-1.5 text-xs font-semibold outline-none appearance-none cursor-pointer ${
                            isDarkMode
                              ? "bg-slate-800 border-slate-700 text-slate-200 focus:ring-2 focus:ring-indigo-500"
                              : "bg-white border-indigo-200 text-slate-700 focus:ring-2 focus:ring-indigo-500"
                          }`}
                        >
                          <option value="">-- 保存されたひな形を選択 --</option>
                          {templates.map((t) => (
                            <option key={t.id} value={t.id}>
                              [{t.class?.name || "共通"}] {t.title} (
                              {t.estimatedTime}分)
                            </option>
                          ))}
                        </select>
                        <ChevronDown
                          className={`w-3.5 h-3.5 absolute right-2.5 top-2.5 pointer-events-none ${isDarkMode ? "text-slate-400" : "text-indigo-500"}`}
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label
                      className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}
                    >
                      授業を選択
                    </label>
                    <div className="relative">
                      <select
                        value={newClassId}
                        onChange={(e) => setNewClassId(Number(e.target.value))}
                        className={`w-full border rounded-xl px-3.5 py-2.5 text-sm font-medium transition outline-none appearance-none cursor-pointer ${
                          isDarkMode
                            ? "bg-slate-800 border-slate-700 text-slate-200 focus:ring-2 focus:ring-indigo-500"
                            : "bg-white border-slate-200 focus:ring-2 focus:ring-indigo-500"
                        }`}
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
                    <label
                      className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}
                    >
                      課題のタイトル
                    </label>
                    <input
                      type="text"
                      placeholder="例: 中間レポート提出"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className={`w-full border rounded-xl px-3.5 py-2.5 text-sm font-medium placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 transition outline-none ${
                        isDarkMode
                          ? "bg-slate-800 border-slate-700 text-slate-100"
                          : "bg-white border-slate-200"
                      }`}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label
                        className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}
                      >
                        期日
                      </label>
                      <input
                        type="datetime-local"
                        value={newDueDate}
                        onChange={(e) => setNewDueDate(e.target.value)}
                        className={`w-full border rounded-xl px-3 py-2.5 text-xs font-medium focus:ring-2 focus:ring-indigo-500 transition outline-none ${
                          isDarkMode
                            ? "bg-slate-800 border-slate-700 text-slate-100"
                            : "bg-white border-slate-200"
                        }`}
                        required
                      />
                    </div>

                    <div>
                      <label
                        className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}
                      >
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
                        className={`w-full border rounded-xl px-3.5 py-2.5 text-sm font-medium placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 transition outline-none ${
                          isDarkMode
                            ? "bg-slate-800 border-slate-700 text-slate-100"
                            : "bg-white border-slate-200"
                        }`}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}
                    >
                      メモ (任意)
                    </label>
                    <textarea
                      placeholder="参考資料や注意点など"
                      value={newMemo}
                      onChange={(e) => setNewMemo(e.target.value)}
                      className={`w-full border rounded-xl px-3.5 py-2.5 text-sm font-medium placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 transition outline-none h-20 resize-none ${
                        isDarkMode
                          ? "bg-slate-800 border-slate-700 text-slate-100"
                          : "bg-white border-slate-200"
                      }`}
                    />
                  </div>

                  <div className="flex items-center space-x-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsAddModalOpen(false)}
                      className={`w-1/2 border font-bold py-2.5 rounded-xl text-sm transition ${
                        isDarkMode
                          ? "border-slate-700 hover:bg-slate-800 text-slate-350"
                          : "border-slate-200 hover:bg-slate-50 text-slate-500"
                      }`}
                    >
                      キャンセル
                    </button>
                    <button
                      type="submit"
                      className="w-1/2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-sm transition shadow-md shadow-indigo-100/10"
                    >
                      課題を登録
                    </button>
                  </div>
                </form>
              )}

              {/* 2. 授業の登録＆一覧管理フォーム */}
              {inputTab === "class" && (
                <div className="space-y-6">
                  <form
                    onSubmit={handleSaveClass}
                    className={`space-y-4 p-4 rounded-xl border ${
                      isDarkMode
                        ? "bg-slate-950 border-slate-850"
                        : "bg-slate-50/50 border-slate-200"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span
                        className={`text-[10px] font-black tracking-wider uppercase ${isDarkMode ? "text-indigo-400" : "text-indigo-650"}`}
                      >
                        {editingClassId !== null
                          ? "● 授業を編集中"
                          : "＋ 新しい授業を登録"}
                      </span>
                      {editingClassId !== null && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingClassId(null);
                            setNewClassName("");
                            setNewClassColor("#3b82f6");
                          }}
                          className="text-[10px] font-bold text-rose-500 hover:underline"
                        >
                          編集をキャンセル
                        </button>
                      )}
                    </div>

                    <div>
                      <label
                        className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}
                      >
                        授業名
                      </label>
                      <input
                        type="text"
                        placeholder="例: データベース論"
                        value={newClassName}
                        onChange={(e) => setNewClassName(e.target.value)}
                        className={`w-full border rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500 ${
                          isDarkMode
                            ? "bg-slate-800 border-slate-700 text-slate-100"
                            : "bg-white border-slate-200"
                        }`}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label
                          className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}
                        >
                          開講年度
                        </label>
                        <input
                          type="number"
                          value={newClassYear}
                          onChange={(e) =>
                            setNewClassYear(Number(e.target.value))
                          }
                          className={`w-full border rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500 ${
                            isDarkMode
                              ? "bg-slate-800 border-slate-700 text-slate-100"
                              : "bg-white border-slate-200"
                          }`}
                          required
                        />
                      </div>

                      <div>
                        <label
                          className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}
                        >
                          学期
                        </label>
                        <div className="relative">
                          <select
                            value={newClassSemester}
                            onChange={(e) =>
                              setNewClassSemester(e.target.value)
                            }
                            className={`w-full border rounded-lg px-3 py-2 text-xs font-semibold outline-none appearance-none ${
                              isDarkMode
                                ? "bg-slate-800 border-slate-700 text-slate-100"
                                : "bg-white border-slate-200"
                            }`}
                          >
                            <option value="前期">前期</option>
                            <option value="後期">後期</option>
                            <option value="通年">通年</option>
                          </select>
                          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label
                        className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}
                      >
                        カラー設定
                      </label>
                      <div
                        className={`flex flex-wrap gap-2 p-2 rounded-lg border ${
                          isDarkMode
                            ? "bg-slate-900 border-slate-800"
                            : "bg-white border-slate-200"
                        }`}
                      >
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
                            className="w-6 h-6 rounded-full border border-slate-200/20 transform hover:scale-110 active:scale-95 transition flex items-center justify-center"
                            style={{ backgroundColor: color }}
                          >
                            {newClassColor === color && (
                              <Check className="w-3.5 h-3.5 text-white drop-shadow-md" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-indigo-650 hover:bg-indigo-700 text-white font-bold py-2 rounded-xl text-xs transition shadow-sm"
                    >
                      {editingClassId !== null
                        ? "変更を保存する"
                        : "授業を登録"}
                    </button>
                  </form>

                  {/* 登録済み授業マネージャー一覧 */}
                  <div className="space-y-2">
                    <h4
                      className={`text-xs font-black border-b pb-1.5 flex items-center gap-1.5 ${
                        isDarkMode
                          ? "text-slate-400 border-slate-800"
                          : "text-slate-500 border-slate-100"
                      }`}
                    >
                      <Settings className="w-3.5 h-3.5" />
                      <span>登録済みの授業一覧（{classes.length}件）</span>
                    </h4>
                    <div className="space-y-1.5 max-h-[160px] overflow-y-auto custom-scrollbar">
                      {classes.map((cls) => (
                        <div
                          key={cls.id}
                          className={`flex items-center justify-between border rounded-xl p-2.5 shadow-xs ${
                            isDarkMode
                              ? "bg-slate-900/60 border-slate-850"
                              : "bg-white border-slate-200"
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <span
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: cls.color }}
                            />
                            <span className="text-xs font-bold">
                              {cls.name}
                            </span>
                            <span
                              className={`text-[10px] font-medium ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}
                            >
                              ({cls.year} {cls.semester})
                            </span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <button
                              type="button"
                              onClick={() => startEditClass(cls)}
                              className={`p-1 rounded transition ${
                                isDarkMode
                                  ? "text-slate-450 hover:text-indigo-400 hover:bg-slate-800"
                                  : "text-slate-400 hover:text-indigo-600 hover:bg-slate-100"
                              }`}
                              title="編集"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteClass(cls.id)}
                              className={`p-1 rounded transition ${
                                isDarkMode
                                  ? "text-slate-450 hover:text-rose-400 hover:bg-slate-800"
                                  : "text-slate-400 hover:text-rose-600 hover:bg-slate-100"
                              }`}
                              title="削除"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 3. テンプレートの登録＆一覧管理フォーム */}
              {inputTab === "template" && (
                <div className="space-y-6">
                  <form
                    onSubmit={handleSaveTemplate}
                    className={`space-y-4 p-4 rounded-xl border ${
                      isDarkMode
                        ? "bg-slate-950 border-slate-850"
                        : "bg-slate-50/50 border-slate-200"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span
                        className={`text-[10px] font-black tracking-wider uppercase ${isDarkMode ? "text-indigo-400" : "text-indigo-650"}`}
                      >
                        {editingTemplateId !== null
                          ? "● テンプレートを編集中"
                          : "＋ ひな形テンプレートを登録"}
                      </span>
                      {editingTemplateId !== null && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTemplateId(null);
                            setNewTemplateTitle("");
                            setNewTemplateEstimatedTime(30);
                            setNewTemplateMemo("");
                            setNewTemplateClassId("");
                          }}
                          className="text-[10px] font-bold text-rose-500 hover:underline"
                        >
                          キャンセル
                        </button>
                      )}
                    </div>

                    <div>
                      <label
                        className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}
                      >
                        対象の授業を選択
                      </label>
                      <div className="relative">
                        <select
                          value={newTemplateClassId}
                          onChange={(e) =>
                            setNewTemplateClassId(Number(e.target.value))
                          }
                          className={`w-full border rounded-lg px-3 py-2 text-xs font-semibold outline-none appearance-none cursor-pointer ${
                            isDarkMode
                              ? "bg-slate-800 border-slate-700 text-slate-100"
                              : "bg-white border-slate-200"
                          }`}
                          required
                        >
                          <option value="">授業を選択してください</option>
                          {classes.map((cls) => (
                            <option key={cls.id} value={cls.id}>
                              {cls.name}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                      </div>
                    </div>

                    <div>
                      <label
                        className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}
                      >
                        ひな形の課題タイトル
                      </label>
                      <input
                        type="text"
                        placeholder="例: 【毎週】演習レポート提出"
                        value={newTemplateTitle}
                        onChange={(e) => setNewTemplateTitle(e.target.value)}
                        className={`w-full border rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500 ${
                          isDarkMode
                            ? "bg-slate-800 border-slate-700 text-slate-100"
                            : "bg-white border-slate-200"
                        }`}
                        required
                      />
                    </div>

                    <div>
                      <label
                        className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}
                      >
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
                        className={`w-full border rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500 ${
                          isDarkMode
                            ? "bg-slate-800 border-slate-700 text-slate-100"
                            : "bg-white border-slate-200"
                        }`}
                        required
                      />
                    </div>

                    <div>
                      <label
                        className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}
                      >
                        固定メモ (任意)
                      </label>
                      <textarea
                        placeholder="例: 指定のリポジトリにpushすること"
                        value={newTemplateMemo}
                        onChange={(e) => setNewTemplateMemo(e.target.value)}
                        className={`w-full border rounded-lg px-3 py-2 text-xs font-semibold outline-none h-16 resize-none focus:ring-2 focus:ring-indigo-500 ${
                          isDarkMode
                            ? "bg-slate-800 border-slate-700 text-slate-100"
                            : "bg-white border-slate-200"
                        }`}
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-indigo-650 hover:bg-indigo-700 text-white font-bold py-2 rounded-xl text-xs transition"
                    >
                      {editingTemplateId !== null
                        ? "変更を保存する"
                        : "テンプレートを保存"}
                    </button>
                  </form>

                  {/* 登録済みテンプレート管理一覧 */}
                  <div className="space-y-2">
                    <h4
                      className={`text-xs font-black border-b pb-1.5 flex items-center gap-1.5 ${
                        isDarkMode
                          ? "text-slate-400 border-slate-800"
                          : "text-slate-500 border-slate-100"
                      }`}
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>
                        登録済みのテンプレート（{templates.length}件）
                      </span>
                    </h4>
                    <div className="space-y-1.5 max-h-[160px] overflow-y-auto custom-scrollbar">
                      {templates.map((tmpl) => (
                        <div
                          key={tmpl.id}
                          className={`flex items-center justify-between border rounded-xl p-2.5 shadow-xs ${
                            isDarkMode
                              ? "bg-slate-900/60 border-slate-850"
                              : "bg-white border-slate-200"
                          }`}
                        >
                          <div className="flex flex-col min-w-0 pr-2">
                            <span className="text-xs font-bold truncate">
                              {tmpl.title}
                            </span>
                            <span className="text-[9px] font-semibold text-slate-400 flex items-center gap-1 mt-0.5">
                              <span
                                className="w-2 h-2 rounded-full inline-block shrink-0"
                                style={{ backgroundColor: tmpl.class?.color }}
                              />
                              <span className="truncate">
                                {tmpl.class?.name || "紐づけなし"}
                              </span>
                              <span>•</span>
                              <span>{tmpl.estimatedTime}分</span>
                            </span>
                          </div>
                          <div className="flex items-center space-x-1 flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => startEditTemplate(tmpl)}
                              className={`p-1 rounded transition ${
                                isDarkMode
                                  ? "text-slate-450 hover:text-indigo-400 hover:bg-slate-800"
                                  : "text-slate-400 hover:text-indigo-600 hover:bg-slate-100"
                              }`}
                              title="編集"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteTemplate(tmpl.id)}
                              className={`p-1 rounded transition ${
                                isDarkMode
                                  ? "text-slate-450 hover:text-rose-400 hover:bg-slate-800"
                                  : "text-slate-400 hover:text-rose-600 hover:bg-slate-100"
                              }`}
                              title="削除"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. 課題の個別編集用モーダル */}
      {editingTask && editTaskData && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div
            className={`rounded-2xl w-full max-w-md shadow-xl border overflow-hidden animate-in fade-in zoom-in-95 duration-150 ${
              isDarkMode
                ? "bg-slate-900 border-slate-800"
                : "bg-white border-slate-100"
            }`}
          >
            <div
              className={`flex items-center justify-between px-6 py-4 border-b ${
                isDarkMode
                  ? "border-slate-800 bg-slate-900/60"
                  : "border-slate-100 bg-slate-50/50"
              }`}
            >
              <h3
                className={`font-bold ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}
              >
                課題の情報を編集
              </h3>
              <button
                onClick={() => {
                  setEditingTask(null);
                  setEditTaskData(null);
                }}
                className={`p-1 rounded-lg transition ${isDarkMode ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800" : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateTask} className="p-6 space-y-4">
              <div>
                <label
                  className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}
                >
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
                    className={`w-full border rounded-xl px-3.5 py-2.5 text-sm font-semibold transition outline-none appearance-none cursor-pointer ${
                      isDarkMode
                        ? "bg-slate-800 border-slate-700 text-slate-200 focus:ring-2 focus:ring-indigo-500"
                        : "bg-white border-slate-200 focus:ring-2 focus:ring-indigo-500"
                    }`}
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
                <label
                  className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}
                >
                  課題のタイトル
                </label>
                <input
                  type="text"
                  value={editTaskData.title}
                  onChange={(e) =>
                    setEditTaskData({ ...editTaskData, title: e.target.value })
                  }
                  className={`w-full border rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-indigo-500 transition outline-none ${
                    isDarkMode
                      ? "bg-slate-800 border-slate-700 text-slate-100"
                      : "bg-white border-slate-200"
                  }`}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}
                  >
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
                    className={`w-full border rounded-xl px-3 py-2.5 text-xs font-medium focus:ring-2 focus:ring-indigo-500 transition outline-none ${
                      isDarkMode
                        ? "bg-slate-800 border-slate-700 text-slate-100"
                        : "bg-white border-slate-200"
                    }`}
                    required
                  />
                </div>

                <div>
                  <label
                    className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}
                  >
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
                    className={`w-full border rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-indigo-500 transition outline-none ${
                      isDarkMode
                        ? "bg-slate-800 border-slate-700 text-slate-100"
                        : "bg-white border-slate-200"
                    }`}
                    required
                  />
                </div>
              </div>

              <div>
                <label
                  className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}
                >
                  メモ (任意)
                </label>
                <textarea
                  value={editTaskData.memo}
                  onChange={(e) =>
                    setEditTaskData({ ...editTaskData, memo: e.target.value })
                  }
                  className={`w-full border rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-indigo-500 transition outline-none h-20 resize-none ${
                    isDarkMode
                      ? "bg-slate-800 border-slate-700 text-slate-100"
                      : "bg-white border-slate-200"
                  }`}
                />
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingTask(null);
                    setEditTaskData(null);
                  }}
                  className={`w-1/2 border font-bold py-2.5 rounded-xl text-sm transition ${
                    isDarkMode
                      ? "border-slate-700 hover:bg-slate-800 text-slate-350"
                      : "border-slate-200 hover:bg-slate-50 text-slate-500"
                  }`}
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="w-1/2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-sm transition shadow-md shadow-indigo-100/10"
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

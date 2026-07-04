import { useState, useEffect } from "react";
import {
  Calendar as CalendarIcon,
  List,
  CheckCircle2,
  Circle,
  Clock,
  BookOpen,
  Plus,
  Filter,
  Trash2,
  AlertCircle,
  RefreshCw,
  Settings,
  ChevronLeft,
  ChevronRight,
  Edit2,
} from "lucide-react";

interface ClassItem {
  id: number;
  name: string;
  year: number;
  semester: string;
  color: string;
}

interface TaskItem {
  id: number;
  classId: number;
  title: string;
  dueDate: string;
  estimatedTime: number; // in minutes
  memo?: string;
  isCompleted: boolean;
  class: ClassItem;
}

export default function App() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [apiError, setApiError] = useState<string | null>(null);

  // サーバーの接続先ポート設定
  const [backendPort, setBackendPort] = useState<string>(() => {
    return localStorage.getItem("campus_tasks_backend_port") || "3000";
  });
  const [showSettings, setShowSettings] = useState<boolean>(false);

  // 画面表示制御
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [filterClass, setFilterClass] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "active" | "completed"
  >("all");

  // カレンダー表示用の選択年月
  const [currentYear, setCurrentYear] = useState<number>(2026);
  const [currentMonth, setCurrentMonth] = useState<number>(5); // 0-indexed (5 = 6月)

  // フォーム入力データ（新規作成用）
  const [newClass, setNewClass] = useState({
    name: "",
    year: 2026,
    semester: "前期",
    color: "#3B82F6",
  });
  const [newTask, setNewTask] = useState({
    classId: "",
    title: "",
    dueDate: "",
    estimatedTime: 60,
    memo: "",
  });

  // 編集用のState
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [editTaskData, setEditTaskData] = useState({
    classId: "",
    title: "",
    dueDate: "",
    estimatedTime: 60,
    memo: "",
  });

  // ES2015ターゲットビルド時の警告およびエラーを安全に回避するためのメタ環境変数読み込み
  const getEnvUrl = (): string => {
    try {
      const metaObj = import.meta as any;
      if (metaObj && metaObj.env && metaObj.env.VITE_API_BASE_URL) {
        return metaObj.env.VITE_API_BASE_URL;
      }
    } catch (e) {
      // フォールバック処理
    }

    // ▼ ここを修正！：もし環境変数がうまく読み込めなかった場合、強制的に本番URLを向くようにします
    // ※ window.location.hostname に "localhost" が含まれていない＝本番環境のときは Render の URL を返す
    if (
      typeof window !== "undefined" &&
      !window.location.hostname.includes("localhost")
    ) {
      return "https://campus-tasks-backend.onrender.com"; // ★RenderのバックエンドURL（末尾の/apiは無し）
    }

    return `http://localhost:${backendPort}`;
  };

  const API_BASE_URL = getEnvUrl();

  const fetchData = async () => {
    setLoading(true);
    setApiError(null);
    try {
      // 授業データを取得
      const classRes = await fetch(`${API_BASE_URL}/api/classes`);
      if (!classRes.ok) throw new Error("授業データの取得に失敗しました");
      const classData = await classRes.json();
      setClasses(classData);

      // 課題データを取得
      const taskRes = await fetch(`${API_BASE_URL}/api/tasks`);
      if (!taskRes.ok) throw new Error("課題データの取得に失敗しました");
      const taskData = await taskRes.json();
      setTasks(taskData);
    } catch (error: any) {
      console.error(error);
      setApiError(
        `サーバーに接続できません。バックエンドサーバーが起動しているか確認してください。`,
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [backendPort]);

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClass.name.trim()) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/classes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newClass),
      });
      if (!res.ok) throw new Error("授業の登録に失敗しました");

      setNewClass({ name: "", year: 2026, semester: "前期", color: "#3B82F6" });
      fetchData();
    } catch (error: any) {
      console.error(error);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.classId || !newTask.title.trim() || !newTask.dueDate) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: parseInt(newTask.classId),
          title: newTask.title,
          dueDate: new Date(newTask.dueDate).toISOString(),
          estimatedTime: newTask.estimatedTime,
          memo: newTask.memo,
        }),
      });
      if (!res.ok) throw new Error("課題の登録に失敗しました");

      setNewTask({
        classId: "",
        title: "",
        dueDate: "",
        estimatedTime: 60,
        memo: "",
      });
      fetchData();
    } catch (error: any) {
      console.error(error);
    }
  };

  // 編集モードを起動し、初期値をフォームに詰める関数
  const openEditModal = (task: TaskItem) => {
    setEditingTask(task);

    // 日付フォーマット調整 (YYYY-MM-DDTHH:MM形式にする)
    const d = new Date(task.dueDate);
    const localDateTime = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);

    setEditTaskData({
      classId: task.classId.toString(),
      title: task.title,
      dueDate: localDateTime,
      estimatedTime: task.estimatedTime,
      memo: task.memo || "",
    });
    setIsEditModalOpen(true);
  };

  // 編集内容をサーバーへ保存する関数
  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !editingTask ||
      !editTaskData.classId ||
      !editTaskData.title.trim() ||
      !editTaskData.dueDate
    )
      return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/tasks/${editingTask.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: parseInt(editTaskData.classId),
          title: editTaskData.title,
          dueDate: new Date(editTaskData.dueDate).toISOString(),
          estimatedTime: editTaskData.estimatedTime,
          memo: editTaskData.memo,
        }),
      });
      if (!res.ok) throw new Error("課題の更新に失敗しました");

      setIsEditModalOpen(false);
      setEditingTask(null);
      fetchData();
    } catch (error: any) {
      console.error(error);
    }
  };

  const toggleTaskCompletion = async (
    taskId: number,
    currentStatus: boolean,
  ) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/tasks/${taskId}/complete`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCompleted: !currentStatus }),
      });
      if (!res.ok) throw new Error("状態の変更に失敗しました");
      fetchData();
    } catch (error: any) {
      console.error(error);
    }
  };

  const deleteTask = async (taskId: number) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("課題の削除に失敗しました");
      fetchData();
    } catch (error: any) {
      console.error(error);
    }
  };

  const calculatePriority = (dueDate: string, estimatedTimeMinutes: number) => {
    const now = new Date();
    const due = new Date(dueDate);
    const remainingMs = due.getTime() - now.getTime();
    const remainingHours = remainingMs / (1000 * 60 * 60);

    if (remainingHours <= 0) return 100; // 期限切れ

    const estimatedHours = estimatedTimeMinutes / 60;
    const ratio = (estimatedHours / remainingHours) * 100;

    return Math.min(Math.max(Math.round(ratio), 0), 100);
  };

  const getPriorityColor = (value: number) => {
    if (value >= 80) return "bg-red-500";
    if (value >= 40) return "bg-amber-500";
    return "bg-blue-500";
  };

  // フィルタリングされた課題
  const filteredTasks = tasks.filter((task) => {
    const matchesClass =
      filterClass === "all" || task.classId.toString() === filterClass;
    const matchesStatus =
      filterStatus === "all"
        ? true
        : filterStatus === "active"
          ? !task.isCompleted
          : task.isCompleted;
    return matchesClass && matchesStatus;
  });

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const renderCalendarGrid = () => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
    const cells = [];

    // 空白のセル（前月の末尾部分）
    for (let i = 0; i < firstDay; i++) {
      cells.push(
        <div
          key={`empty-${i}`}
          className="min-h-[100px] bg-slate-50 border border-slate-100 p-1"
        ></div>,
      );
    }

    // 今月の日付セル
    for (let day = 1; day <= daysInMonth; day++) {
      // 厳格な日付の一致確認
      const dayTasks = filteredTasks.filter((task) => {
        if (!task.dueDate) return false;
        const d = new Date(task.dueDate);
        return (
          d.getFullYear() === currentYear &&
          d.getMonth() === currentMonth &&
          d.getDate() === day
        );
      });

      cells.push(
        <div
          key={`day-${day}`}
          className="min-h-[100px] bg-white border border-slate-200 p-1 flex flex-col justify-between hover:bg-slate-50/50 transition-colors"
        >
          <span className="text-xs font-bold text-slate-500 block mb-1">
            {day}日
          </span>
          <div className="space-y-1 flex-1 overflow-y-auto max-h-[70px]">
            {dayTasks.map((t) => {
              return (
                <div
                  key={t.id}
                  className="text-[10px] text-white font-bold p-1 rounded-sm leading-tight truncate cursor-pointer hover:brightness-95 transition-all"
                  style={{
                    backgroundColor: t.isCompleted
                      ? "#cbd5e1"
                      : t.class?.color || "#3B82F6",
                  }}
                  title={`${t.title} (${t.class?.name || "授業"})`}
                  onClick={() => openEditModal(t)}
                >
                  {t.isCompleted && "✓ "}
                  {t.title}
                </div>
              );
            })}
          </div>
        </div>,
      );
    }

    return cells;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg text-white">
              <BookOpen size={20} />
            </div>
            <h1 className="text-xl font-bold tracking-tight">CampusTasks</h1>
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded font-mono">
              v1.3 (Editable)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                localStorage.setItem("campus_tasks_backend_port", backendPort);
                setShowSettings(!showSettings);
              }}
              className="p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
              title="ポート設定を開く"
            >
              <Settings size={20} />
            </button>
            <button
              onClick={fetchData}
              className="p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
              title="最新データに更新"
            >
              <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
      </header>

      {}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {showSettings && (
          <div className="mb-6 p-4 bg-slate-100 border border-slate-200 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-slate-600">
              <strong>バックエンド接続ポート設定:</strong>
              <p className="text-xs mt-1">
                Expressサーバーのポート番号を指定します。ローカルポートが変更されている場合は調整してください。
              </p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-sm font-mono text-slate-500">
                http://localhost:
              </span>
              <input
                type="text"
                className="w-24 border bg-white p-1.5 rounded text-center font-mono font-bold"
                value={backendPort}
                onChange={(e) => setBackendPort(e.target.value)}
              />
              <button
                onClick={() => {
                  localStorage.setItem(
                    "campus_tasks_backend_port",
                    backendPort,
                  );
                  setShowSettings(false);
                  fetchData();
                }}
                className="bg-slate-800 text-white px-3 py-1.5 rounded font-bold text-sm hover:bg-slate-700"
              >
                保存
              </button>
            </div>
          </div>
        )}

        {apiError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
            <AlertCircle
              className="text-red-500 flex-shrink-0 mt-0.5"
              size={20}
            />
            <div className="text-sm text-red-700 flex-1">
              <p className="font-bold">{apiError}</p>
              <p className="text-xs mt-1">
                Expressサーバーを起動するには、ターミナルでバックエンドのフォルダに移動し、
                <code className="bg-red-100 text-red-800 px-1 py-0.5 rounded ml-1">
                  npx nodemon index.ts
                </code>
                を実行してください。
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Class creation Form */}
          <section className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200">
            <div className="flex items-center gap-2 mb-4">
              <span className="p-1.5 bg-blue-50 text-blue-600 rounded-md font-bold text-xs">
                CLASS
              </span>
              <h2 className="text-lg font-bold text-slate-800">授業の登録</h2>
            </div>
            <form onSubmit={handleAddClass} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  授業名
                </label>
                <input
                  type="text"
                  placeholder="例: データベース論、構造力学"
                  className="w-full border border-slate-200 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  required
                  value={newClass.name}
                  onChange={(e) =>
                    setNewClass({ ...newClass, name: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    年度
                  </label>
                  <input
                    type="number"
                    className="w-full border border-slate-200 p-2 rounded-lg"
                    value={newClass.year}
                    onChange={(e) =>
                      setNewClass({ ...newClass, year: Number(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    学期
                  </label>
                  <select
                    className="w-full border border-slate-200 p-2 rounded-lg bg-white"
                    value={newClass.semester}
                    onChange={(e) =>
                      setNewClass({ ...newClass, semester: e.target.value })
                    }
                  >
                    <option value="前期">前期</option>
                    <option value="後期">後期</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  テーマカラー
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    className="p-1 h-10 w-20 border border-slate-200 rounded-lg cursor-pointer"
                    value={newClass.color}
                    onChange={(e) =>
                      setNewClass({ ...newClass, color: e.target.value })
                    }
                  />
                  <span className="text-xs text-slate-400 font-mono">
                    {newClass.color}
                  </span>
                  <button
                    type="submit"
                    className="ml-auto bg-blue-600 text-white rounded-lg px-5 py-2.5 font-bold text-sm hover:bg-blue-700 transition-colors shadow-xs"
                  >
                    授業を追加
                  </button>
                </div>
              </div>
            </form>
          </section>

          {/* Task creation Form */}
          <section className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200">
            <div className="flex items-center gap-2 mb-4">
              <span className="p-1.5 bg-green-50 text-green-600 rounded-md font-bold text-xs">
                TASK
              </span>
              <h2 className="text-lg font-bold text-slate-800">課題の登録</h2>
            </div>
            <form onSubmit={handleAddTask} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    対象の授業
                  </label>
                  <select
                    className="w-full border border-slate-200 p-2.5 rounded-lg bg-white"
                    required
                    value={newTask.classId}
                    onChange={(e) =>
                      setNewTask({ ...newTask, classId: e.target.value })
                    }
                  >
                    <option value="">選択してください</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    課題名
                  </label>
                  <input
                    type="text"
                    placeholder="例: レポート第1回、期末課題"
                    className="w-full border border-slate-200 p-2.5 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-hidden"
                    required
                    value={newTask.title}
                    onChange={(e) =>
                      setNewTask({ ...newTask, title: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    提出期日
                  </label>
                  <input
                    type="datetime-local"
                    className="w-full border border-slate-200 p-2 rounded-lg"
                    required
                    value={newTask.dueDate}
                    onChange={(e) =>
                      setNewTask({ ...newTask, dueDate: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    予想所要時間 (分)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="例: 90"
                      className="w-full border border-slate-200 p-2 rounded-lg pr-8"
                      required
                      value={newTask.estimatedTime}
                      onChange={(e) =>
                        setNewTask({
                          ...newTask,
                          estimatedTime: Number(e.target.value),
                        })
                      }
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-slate-400">
                      分
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="submit"
                className="w-full bg-green-600 text-white rounded-lg py-2.5 font-bold text-sm hover:bg-green-700 transition-colors shadow-xs"
              >
                課題を登録する
              </button>
            </form>
          </section>
        </div>

        {}
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-6">
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center mb-6 gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 text-slate-500 text-sm">
                <Filter size={16} />
                <span>絞り込み:</span>
              </div>

              <select
                className="border border-slate-200 p-2 rounded-lg text-sm bg-white"
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
              >
                <option value="all">すべての授業</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id.toString()}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                className="border border-slate-200 p-2 rounded-lg text-sm bg-white"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
              >
                <option value="all">すべて表示</option>
                <option value="active">未完了のみ</option>
                <option value="completed">完了済みのみ</option>
              </select>
            </div>

            <div className="flex bg-slate-100 p-1 rounded-lg self-end sm:self-auto">
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 py-1 text-sm rounded-md flex items-center gap-1.5 font-bold transition-colors ${viewMode === "list" ? "bg-white shadow-xs text-blue-600" : "text-slate-500 hover:text-slate-800"}`}
              >
                <List size={16} />
                リスト
              </button>
              <button
                onClick={() => setViewMode("calendar")}
                className={`p-2 py-1 text-sm rounded-md flex items-center gap-1.5 font-bold transition-colors ${viewMode === "calendar" ? "bg-white shadow-xs text-blue-600" : "text-slate-500 hover:text-slate-800"}`}
              >
                <CalendarIcon size={16} />
                カレンダー
              </button>
            </div>
          </div>

          {}
          {loading ? (
            <div className="text-center py-12 text-slate-500">
              <RefreshCw
                className="animate-spin mx-auto mb-2 text-blue-500"
                size={32}
              />
              <p>データを読み込み中...</p>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-center py-12 text-slate-400 border border-dashed rounded-xl border-slate-200">
              <CalendarIcon size={48} className="mx-auto mb-3 text-slate-300" />
              <p className="font-medium">該当する課題はありません</p>
              <p className="text-xs mt-1">
                上のフォームから、授業と課題を新しく追加してみましょう！
              </p>
            </div>
          ) : viewMode === "list" ? (
            <div className="space-y-3">
              {filteredTasks.map((task) => {
                const priority = calculatePriority(
                  task.dueDate,
                  task.estimatedTime,
                );
                const isOverdue =
                  new Date(task.dueDate).getTime() < Date.now() &&
                  !task.isCompleted;

                return (
                  <div
                    key={task.id}
                    className={`flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 border rounded-xl transition-all ${
                      task.isCompleted
                        ? "border-slate-100 bg-slate-50/50 opacity-60"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs"
                    }`}
                  >
                    {/* Completion Check Button */}
                    <button
                      onClick={() =>
                        toggleTaskCompletion(task.id, task.isCompleted)
                      }
                      className="mt-1 sm:mt-0 focus:outline-hidden"
                    >
                      {task.isCompleted ? (
                        <CheckCircle2
                          className="text-emerald-500 hover:text-emerald-600 transition-colors"
                          size={26}
                        />
                      ) : (
                        <Circle
                          className="text-slate-300 hover:text-emerald-500 transition-colors"
                          size={26}
                        />
                      )}
                    </button>

                    {/* Task details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span
                          className="px-2 py-0.5 text-xs text-white rounded-full font-bold"
                          style={{
                            backgroundColor: task.class?.color || "#3B82F6",
                          }}
                        >
                          {task.class?.name || "未指定の授業"}
                        </span>

                        {isOverdue && (
                          <span className="text-[10px] bg-red-100 text-red-600 font-bold px-1.5 py-0.5 rounded-sm animate-pulse">
                            期限超過!
                          </span>
                        )}
                      </div>

                      <h3
                        className={`text-lg font-bold truncate ${task.isCompleted ? "text-slate-400 line-through" : "text-slate-800"}`}
                      >
                        {task.title}
                      </h3>

                      <div className="flex items-center gap-4 text-xs text-slate-500 mt-1">
                        <div className="flex items-center gap-1">
                          <CalendarIcon size={14} />
                          <span>
                            期日:{" "}
                            {new Date(task.dueDate).toLocaleString("ja-JP", {
                              month: "numeric",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock size={14} />
                          <span>予想時間: {task.estimatedTime}分</span>
                        </div>
                      </div>
                    </div>

                    {/* Priority Bar Meter */}
                    {!task.isCompleted && (
                      <div className="w-full sm:w-32 flex flex-col items-end flex-shrink-0 mt-3 sm:mt-0">
                        <span className="text-xs font-bold text-slate-500 mb-1 block">
                          優先度: {priority}%
                        </span>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${getPriorityColor(priority)}`}
                            style={{ width: `${priority}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Action buttons (Edit and Delete) */}
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        onClick={() => openEditModal(task)}
                        className="text-slate-400 hover:text-blue-500 p-1.5 rounded-md hover:bg-slate-50 transition-colors"
                        title="編集"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => deleteTask(task.id)}
                        className="text-slate-300 hover:text-red-500 p-1.5 rounded-md hover:bg-slate-50 transition-colors"
                        title="削除"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-700 flex items-center gap-2">
                  <CalendarIcon size={18} />
                  カレンダー優先度可視化マップ ({currentYear}年{" "}
                  {currentMonth + 1}月)
                </h3>
                <div className="flex items-center gap-1">
                  <button
                    onClick={handlePrevMonth}
                    className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <span className="text-sm font-bold text-slate-600 px-2 font-mono">
                    {currentYear}/{String(currentMonth + 1).padStart(2, "0")}
                  </span>
                  <button
                    onClick={handleNextMonth}
                    className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                期限に近い＆予定時間が多いタスクほど、割り当てられたカラーでカレンダーに表示されます。
              </p>

              <div className="grid grid-cols-7 gap-1">
                {["日", "月", "火", "水", "木", "金", "土"].map((day) => (
                  <div
                    key={day}
                    className="text-center text-xs font-bold py-1 bg-white border border-slate-100 rounded-sm text-slate-500"
                  >
                    {day}
                  </div>
                ))}
                {renderCalendarGrid()}
              </div>
            </div>
          )}
        </div>
      </main>

      {}
      {/* 編集モーダルポップアップ */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Edit2 size={18} className="text-blue-500" />
                課題を編集する
              </h3>
            </div>

            <form onSubmit={handleUpdateTask} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  対象の授業
                </label>
                <select
                  className="w-full border border-slate-200 p-2.5 rounded-lg bg-white"
                  required
                  value={editTaskData.classId}
                  onChange={(e) =>
                    setEditTaskData({
                      ...editTaskData,
                      classId: e.target.value,
                    })
                  }
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  課題名
                </label>
                <input
                  type="text"
                  className="w-full border border-slate-200 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  required
                  value={editTaskData.title}
                  onChange={(e) =>
                    setEditTaskData({ ...editTaskData, title: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    提出期日
                  </label>
                  <input
                    type="datetime-local"
                    className="w-full border border-slate-200 p-2 rounded-lg"
                    required
                    value={editTaskData.dueDate}
                    onChange={(e) =>
                      setEditTaskData({
                        ...editTaskData,
                        dueDate: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    予想所要時間 (分)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      className="w-full border border-slate-200 p-2 rounded-lg pr-8"
                      required
                      value={editTaskData.estimatedTime}
                      onChange={(e) =>
                        setEditTaskData({
                          ...editTaskData,
                          estimatedTime: Number(e.target.value),
                        })
                      }
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-slate-400">
                      分
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  メモ
                </label>
                <textarea
                  className="w-full border border-slate-200 p-2 rounded-lg"
                  rows={2}
                  value={editTaskData.memo}
                  onChange={(e) =>
                    setEditTaskData({ ...editTaskData, memo: e.target.value })
                  }
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingTask(null);
                  }}
                  className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs"
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

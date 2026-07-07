import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";

const app = express();
const prisma = new PrismaClient();

// 画面（フロントエンド）からの通信を許可する設定
app.use(cors());
// 送られてきたデータを読み取るための設定
app.use(express.json());

// --- ここからがデータの窓口（API）です ---

// 1. すべての「授業」のデータを取得する窓口
app.get("/api/classes", async (req, res) => {
  const classes = await prisma.class.findMany();
  res.json(classes);
});

// ==========================================
// 授業（Class）関連の 編集・削除 API
// ==========================================

app.post("/api/classes", async (req, res) => {
  const { name, year, semester, color } = req.body;
  try {
    const newClass = await prisma.class.create({
      data: {
        name,
        year: Number(year),
        semester,
        color,
      },
    });
    res.json(newClass);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "授業の作成に失敗しました。" });
  }
});

// 授業を編集・更新するAPI
app.put("/api/classes/:id", async (req, res) => {
  const { id } = req.params;
  const { name, year, semester, color } = req.body;
  try {
    const updatedClass = await prisma.class.update({
      where: { id: Number(id) },
      data: {
        name,
        year: Number(year),
        semester,
        color,
      },
    });
    res.json(updatedClass);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "授業の更新に失敗しました。" });
  }
});

// 授業を削除するAPI (※ cascade onDelete 的に、紐づく課題やテンプレートも一気に削除します)
app.delete("/api/classes/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const classIdNum = Number(id);

    // 1. 紐づく課題 (Assignment) を一斉削除
    await prisma.task.deleteMany({
      where: { classId: classIdNum },
    });

    // 2. 紐づくテンプレート (Template) を一斉削除
    await prisma.template.deleteMany({
      where: { classId: classIdNum },
    });

    // 3. 最後に授業 (Class) 本体を削除します
    const deletedClass = await prisma.class.delete({
      where: { id: classIdNum },
    });

    res.json(deletedClass);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "授業の削除に失敗しました。" });
  }
});

// 課題を編集（更新）するAPI（修正版）
app.put("/api/tasks/:id", async (req, res) => {
  const { id } = req.params;
  const { title, dueDate, estimatedTime, memo, classId, isCompleted } =
    req.body;

  try {
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (dueDate !== undefined) updateData.dueDate = new Date(dueDate);
    if (estimatedTime !== undefined)
      updateData.estimatedTime = Number(estimatedTime);
    if (memo !== undefined) updateData.memo = memo;
    if (classId !== undefined) updateData.classId = Number(classId);
    if (isCompleted !== undefined) updateData.isCompleted = isCompleted;

    const updatedTask = await prisma.task.update({
      where: {
        id: Number(id),
      },
      data: updateData,
    });
    res.json(updatedTask);
  } catch (error) {
    console.error("Failed to update task:", error);
    res.status(500).json({ error: "課題の更新に失敗しました。" });
  }
});

// 3. すべての「課題」のデータを取得する窓口（紐づく授業データも一緒に持ってくる）
app.get("/api/tasks", async (req, res) => {
  const tasks = await prisma.task.findMany({
    include: { class: true },
  });
  res.json(tasks);
});

// 4. 新しい「課題」を登録する窓口
app.post("/api/tasks", async (req, res) => {
  const { classId, title, dueDate, estimatedTime, memo } = req.body;
  const newTask = await prisma.task.create({
    data: {
      classId: parseInt(classId),
      title,
      dueDate: new Date(dueDate),
      estimatedTime: parseInt(estimatedTime),
      memo,
      isCompleted: false, // 最初は未完了
    },
  });
  res.json(newTask);
});

// 5. 課題の完了状態を切り替える窓口
app.put("/api/tasks/:id/complete", async (req, res) => {
  const taskId = parseInt(req.params.id);
  const { isCompleted } = req.body;
  const updatedTask = await prisma.task.update({
    where: { id: taskId },
    data: { isCompleted },
  });
  res.json(updatedTask);
});

// 課題を削除するAPI
app.delete("/api/tasks/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.task.delete({
      where: { id: Number(id) },
    });
    res.json({ message: "課題を削除しました" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "削除に失敗しました" });
  }
});

// ==========================================
// テンプレート（Template）関連のAPIを追加
// ==========================================

// テンプレート一覧を取得するAPI
app.get("/api/templates", async (req, res) => {
  try {
    const templates = await prisma.template.findMany({
      include: {
        class: true, // 紐づく授業データも一緒に取得
      },
    });
    res.json(templates);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "テンプレートの取得に失敗しました。" });
  }
});

// テンプレートを新規登録するAPI
app.post("/api/templates", async (req, res) => {
  // フロントからは 'name' という名前で送られてくるので、それを受け取ります
  const { name, estimatedTime, memo, classId } = req.body;
  try {
    const newTemplate = await prisma.template.create({
      data: {
        title: name, // ★ここを `name` から `title: name` に書き換えます！
        estimatedTime: Number(estimatedTime),
        memo: memo || "",
        classId: Number(classId),
      },
    });
    res.json(newTemplate);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "テンプレートの保存に失敗しました。" });
  }
});

// テンプレートを編集・更新するAPI
app.put("/api/templates/:id", async (req, res) => {
  const { id } = req.params;
  const { name, estimatedTime, memo, classId } = req.body; // フロントからは `name` として届きます
  try {
    const updatedTemplate = await prisma.template.update({
      where: { id: Number(id) },
      data: {
        title: name, // データベーススキーマのカラム `title` に詰め替えて保存します
        estimatedTime: Number(estimatedTime),
        memo: memo || "",
        classId: Number(classId),
      },
    });
    res.json(updatedTemplate);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "テンプレートの更新に失敗しました。" });
  }
});

// テンプレートを削除するAPI
app.delete("/api/templates/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const deletedTemplate = await prisma.template.delete({
      where: { id: Number(id) },
    });
    res.json(deletedTemplate);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "テンプレートの削除に失敗しました。" });
  }
});

// サーバーを起動する
const PORT = process.env.PORT || 3000; // 元々が3001だった場合は 3001 にしてください

app.listen(PORT, () => {
  console.log(`✅ サーバーが起動しました: http://localhost:${PORT}`);
});

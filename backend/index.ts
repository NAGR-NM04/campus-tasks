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

// 2. 新しい「授業」を登録する窓口
app.post("/api/classes", async (req, res) => {
  const { name, year, semester, color } = req.body;
  const newClass = await prisma.class.create({
    data: { name, year, semester, color },
  });
  res.json(newClass);
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

// サーバーを起動する
const PORT = process.env.PORT || 3000; // 元々が3001だった場合は 3001 にしてください

app.listen(PORT, () => {
  console.log(`✅ サーバーが起動しました: http://localhost:${PORT}`);
});

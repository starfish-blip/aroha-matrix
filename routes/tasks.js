const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const DATA_FILE = path.join(__dirname, '../data/tasks.json');

const readTasks = () => {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      const dir = path.dirname(DATA_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(DATA_FILE, JSON.stringify([]));
      return [];
    }
    const rawData = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(rawData || '[]');
  } catch (error) {
    console.error('Error reading tasks file:', error);
    return [];
  }
};

const writeTasks = (tasks) => {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(tasks, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error writing tasks file:', error);
  }
};

router.post('/sync', (req, res) => {
  const incomingData = req.body;

  if (!incomingData || (Array.isArray(incomingData) && incomingData.length === 0)) {
    return res.status(400).json({ status: 'error', message: 'No payload provided.' });
  }

  const existingTasks = readTasks();
  const incomingTasks = Array.isArray(incomingData) ? incomingData : [incomingData];
  const updatedList = [...existingTasks];

  let addedCount = 0;
  let updatedCount = 0;

  incomingTasks.forEach((task) => {
    const normalizedTask = {
      id: task.id || `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: task.title || 'Untitled Task',
      description: task.description || '',
      status: task.status || 'pending',
      dueDate: task.dueDate || null,
      updatedAt: new Date().toISOString(),
      source: task.source || 'ai_studio_app',
    };

    const index = updatedList.findIndex((t) => t.id === normalizedTask.id);
    if (index !== -1) {
      updatedList[index] = { ...updatedList[index], ...normalizedTask };
      updatedCount++;
    } else {
      updatedList.push(normalizedTask);
      addedCount++;
    }
  });

  writeTasks(updatedList);

  return res.status(200).json({
    status: 'success',
    message: `Tasks synced. ${addedCount} added, ${updatedCount} updated.`,
    totalTasks: updatedList.length,
  });
});

router.get('/', (req, res) => {
  const tasks = readTasks();
  res.status(200).json({ status: 'success', count: tasks.length, tasks });
});

module.exports = router;

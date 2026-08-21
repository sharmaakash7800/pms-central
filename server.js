require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./db');
const { StepTemplate, PmsTask } = require('./models');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

connectDB();

// 1. Create Complete Task with Multiple Custom Steps
app.post('/api/pms/create-custom-package', async (req, res) => {
  try {
    const { projectName, mainItemName, pmsType, startDate, totalQty, steps } = req.body;

    if (!mainItemName) return res.status(400).json({ error: 'Main Task Name is required.' });
    if (!steps || steps.length === 0) return res.status(400).json({ error: 'At least 1 step is required.' });

    const baseDate = new Date(startDate || new Date());
    const datePrefix = baseDate.toISOString().slice(0, 10).replace(/-/g, '');

    const lastTask = await PmsTask.findOne({ uniqueId: new RegExp(`^PMS-${datePrefix}`) }).sort({ createdAt: -1 });
    let counter = 1;
    if (lastTask) {
      const parts = lastTask.uniqueId.split('-');
      if (parts.length >= 3) {
        counter = parseInt(parts[2], 10) + 1;
      }
    }

    const uniqueId = `PMS-${datePrefix}-${String(counter).padStart(3, '0')}`;

    let currentCursor = new Date(baseDate);
    const formattedSteps = steps.map((s, idx) => {
      const days = Math.max(1, parseInt(s.durationDays, 10) || 1);
      const stepStart = new Date(currentCursor);
      const stepEnd = new Date(stepStart);
      stepEnd.setDate(stepEnd.getDate() + days);

      currentCursor = new Date(stepEnd); // Next step starts when previous ends

      return {
        wbsNo: s.wbsNo || String(idx + 1),
        stepTitle: s.stepTitle || `Step ${idx + 1}`,
        assignedEmail: (s.assignedEmail || '').trim().toLowerCase(),
        assignedName: s.assignedName || 'Unassigned',
        plannedStartDate: stepStart,
        plannedEndDate: stepEnd,
        durationDays: days,
        status: 'Pending',
        remarks: '',
        receivedQty: 0,
        attachmentUrl: ''
      };
    });

    const newTask = new PmsTask({
      uniqueId,
      projectName: projectName || 'General Project',
      pmsType: pmsType || 'SUPPLY',
      mainItemName,
      startDate: baseDate,
      totalQty: Number(totalQty) || 1,
      steps: formattedSteps
    });

    await newTask.save();
    res.status(201).json({ success: true, data: newTask });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Update Step Execution Details
app.patch('/api/pms/update-step', async (req, res) => {
  try {
    const { uniqueId, stepId, status, remarks, receivedQty, attachmentUrl } = req.body;

    const updateFields = {
      'steps.$.status': status,
      'steps.$.remarks': remarks,
      'steps.$.receivedQty': Number(receivedQty) || 0,
      'steps.$.attachmentUrl': attachmentUrl || ''
    };

    if (status === 'Completed') {
      updateFields['steps.$.actualEndDate'] = new Date();
    }

    const updatedTask = await PmsTask.findOneAndUpdate(
      { uniqueId, 'steps._id': stepId },
      { $set: updateFields },
      { new: true }
    );

    if (!updatedTask) return res.status(404).json({ error: 'Task or Step not found' });
    res.json({ success: true, data: updatedTask });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Doer Filter API
app.get('/api/pms/my-tasks', async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: 'Email parameter required' });

    const tasks = await PmsTask.aggregate([
      { $unwind: '$steps' },
      { $match: { 'steps.assignedEmail': email.toLowerCase().trim() } },
      {
        $project: {
          uniqueId: 1,
          projectName: 1,
          pmsType: 1,
          mainItemName: 1,
          totalQty: 1,
          step: '$steps'
        }
      },
      { $sort: { 'step.plannedStartDate': 1 } }
    ]);

    res.json({ success: true, count: tasks.length, data: tasks });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Admin All Tasks API
app.get('/api/pms/all', async (req, res) => {
  try {
    const all = await PmsTask.find().sort({ createdAt: -1 });
    res.json({ success: true, count: all.length, data: all });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

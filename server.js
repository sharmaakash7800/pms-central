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

// Bulk Task Create API
app.post('/api/pms/create-bulk', async (req, res) => {
  try {
    const { projectName, pmsType, rawItemsText, startDate, sheetId } = req.body;
    const items = (rawItemsText || '').split('\n').map(i => i.trim()).filter(i => i.length > 0);

    if (items.length === 0) return res.status(400).json({ error: 'Enter at least one item.' });

    const templates = await StepTemplate.find({ pmsType: pmsType || 'SUPPLY' }).sort({ stepNo: 1 });
    if (templates.length === 0) return res.status(404).json({ error: 'No step templates found.' });

    const baseDate = new Date(startDate || new Date());
    const datePrefix = baseDate.toISOString().slice(0, 10).replace(/-/g, '');

    const lastTask = await PmsTask.findOne({ uniqueId: new RegExp(`^PMS-${datePrefix}`) }).sort({ createdAt: -1 });
    let counter = 1;
    if (lastTask) {
      const parts = lastTask.uniqueId.split('-');
      counter = parseInt(parts[2], 10) + 1;
    }

    const createdTasks = [];

    for (const item of items) {
      const uniqueId = `PMS-${datePrefix}-${String(counter).padStart(3, '0')}`;
      counter++;

      let currentStepStart = new Date(baseDate);
      const generatedSteps = [];

      for (const tpl of templates) {
        const stepStart = new Date(currentStepStart);
        const stepEnd = new Date(stepStart);
        stepEnd.setDate(stepEnd.getDate() + tpl.defaultDurationDays);

        generatedSteps.push({
          wbsNo: tpl.stepNo,
          stepTitle: tpl.stepTitle,
          assignedEmail: tpl.defaultOwnerEmail,
          assignedName: tpl.defaultOwnerName,
          plannedStartDate: stepStart,
          plannedEndDate: stepEnd,
          durationDays: tpl.defaultDurationDays,
          status: 'Pending',
          remarks: '',
          receivedQty: 0,
          attachmentUrl: ''
        });

        currentStepStart = new Date(stepEnd);
      }

      const newTask = new PmsTask({
        uniqueId,
        projectName: projectName || 'General Project',
        pmsType: pmsType || 'SUPPLY',
        mainItemName: item,
        startDate: baseDate,
        totalQty: 1,
        sheetId: sheetId || '',
        steps: generatedSteps
      });

      await newTask.save();
      createdTasks.push(newTask);
    }

    res.status(201).json({ success: true, count: createdTasks.length, data: createdTasks });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Doer Task Update API (Remarks, Received Qty, Attachment, Status)
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

// Doer Fetch API
app.get('/api/pms/my-tasks', async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: 'Email parameter required' });

    const tasks = await PmsTask.aggregate([
      { $unwind: '$steps' },
      { $match: { 'steps.assignedEmail': email.toLowerCase() } },
      {
        $project: {
          uniqueId: 1,
          projectName: 1,
          pmsType: 1,
          mainItemName: 1,
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

// Admin All Tasks API
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
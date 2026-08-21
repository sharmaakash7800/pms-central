require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./db');
const { Doer, Vendor, PmsTask } = require('./models');

const app = express();
app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));
app.use(express.static(path.join(__dirname, 'public')));

connectDB();

// ---------------- DOER APIS ----------------
app.get('/api/doers', async (req, res) => {
  try {
    let doers = await Doer.find({ isActive: true }).sort({ name: 1 });
    if (doers.length === 0) {
      const initial = [
        { name: 'Heera Lal Ji', email: 'heeralal@domain.com', role: 'Technical Lead' },
        { name: 'Ronak Ji', email: 'ronak@domain.com', role: 'Commercial Head' },
        { name: 'Aarti Bala', email: 'aarti@domain.com', role: 'Operations & Procurement' },
        { name: 'Mukesh Sharma', email: 'mukesh@domain.com', role: 'Field Engineering' }
      ];
      doers = await Doer.insertMany(initial);
    }
    res.json({ success: true, data: doers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/doers', async (req, res) => {
  try {
    const { name, email, role, phone } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'Name and Email required.' });

    const newDoer = new Doer({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      role: role ? role.trim() : 'Executive',
      phone: phone || ''
    });
    await newDoer.save();
    res.status(201).json({ success: true, data: newDoer });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/doers/:id', async (req, res) => {
  try {
    await Doer.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: 'Doer removed.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- VENDOR APIS ----------------
app.get('/api/vendors', async (req, res) => {
  try {
    const vendors = await Vendor.find().sort({ createdAt: -1 });
    res.json({ success: true, data: vendors });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/vendors', async (req, res) => {
  try {
    const { vendorName, contactPerson, phone, email, poNumber, relatedTaskId, itemName } = req.body;
    if (!vendorName) return res.status(400).json({ error: 'Vendor Name is required.' });

    const newVendor = new Vendor({
      vendorName,
      contactPerson,
      phone,
      email,
      poNumber,
      relatedTaskId,
      itemName
    });
    await newVendor.save();
    res.status(201).json({ success: true, data: newVendor });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- PMS TASK APIS ----------------
app.post('/api/pms/create-custom-package', async (req, res) => {
  try {
    const { projectName, mainItemName, pmsType, startDate, totalQty, steps } = req.body;

    if (!mainItemName) return res.status(400).json({ error: 'Main Task Name required.' });
    if (!steps || steps.length === 0) return res.status(400).json({ error: 'At least 1 step required.' });

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

      currentCursor = new Date(stepEnd);

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
        attachmentUrl: '',
        actualEndDate: null,
        vendorDetails: { vendorName: '', contactPerson: '', phone: '', poNumber: '' }
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

// Update Step Details & Upsert Vendor
app.patch('/api/pms/update-step', async (req, res) => {
  try {
    const { uniqueId, stepId, status, remarks, receivedQty, attachmentUrl, vendorDetails } = req.body;

    const updateFields = {
      'steps.$.status': status,
      'steps.$.remarks': remarks,
      'steps.$.receivedQty': Number(receivedQty) || 0,
      'steps.$.attachmentUrl': attachmentUrl || ''
    };

    if (vendorDetails) {
      updateFields['steps.$.vendorDetails'] = vendorDetails;

      if (vendorDetails.vendorName) {
        await Vendor.findOneAndUpdate(
          { vendorName: vendorDetails.vendorName },
          {
            $set: {
              contactPerson: vendorDetails.contactPerson,
              phone: vendorDetails.phone,
              poNumber: vendorDetails.poNumber,
              relatedTaskId: uniqueId
            }
          },
          { upsert: true, new: true }
        );
      }
    }

    if (status === 'Completed') {
      updateFields['steps.$.actualEndDate'] = new Date();
    } else {
      updateFields['steps.$.actualEndDate'] = null;
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

app.get('/api/pms/history', async (req, res) => {
  try {
    const history = await PmsTask.aggregate([
      { $unwind: '$steps' },
      { $match: { 'steps.status': 'Completed' } },
      {
        $project: {
          uniqueId: 1,
          projectName: 1,
          mainItemName: 1,
          step: '$steps'
        }
      },
      { $sort: { 'step.actualEndDate': -1 } }
    ]);
    res.json({ success: true, count: history.length, data: history });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/pms/my-tasks', async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: 'Email required' });

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

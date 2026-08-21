const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());

// Serve static frontend files from 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://sharmaaakash7800:your_password@cluster0.mongodb.net/pms?retryWrites=true&w=majority";

mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('MongoDB Connected')).catch(err => console.log('DB Error:', err));

// Schemas & Models
const stepSchema = new mongoose.Schema({
  wbsNo: String,
  stepTitle: String,
  assignedName: String,
  assignedEmail: String,
  durationDays: Number,
  plannedStartDate: Date,
  plannedEndDate: Date,
  actualStartDate: Date,
  actualEndDate: Date,
  status: { type: String, default: 'Pending' },
  remarks: String
});

const pmsTaskSchema = new mongoose.Schema({
  uniqueId: { type: String, unique: true },
  projectName: String,
  mainItemName: String,
  pmsType: String,
  startDate: Date,
  totalQty: Number,
  steps: [stepSchema]
});

const siteSchema = new mongoose.Schema({
  siteName: String,
  companyName: String,
  projectTitle: String,
  poNumber: String,
  dataEntryOperator: String,
  processCoordinator: String,
  technicalPerson: String,
  purchaserPerson: String,
  vrePerson: String,
  projectOwner: String
});

const doerSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  role: String
});

const PmsTask = mongoose.models.PmsTask || mongoose.model('PmsTask', pmsTaskSchema);
const Site = mongoose.models.Site || mongoose.model('Site', siteSchema);
const Doer = mongoose.models.Doer || mongoose.model('Doer', doerSchema);

// --- PMS ROUTES ---
app.get('/api/pms/all', async (req, res) => {
  try {
    const tasks = await PmsTask.find({});
    res.json({ success: true, data: tasks });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/pms/create-custom-package', async (req, res) => {
  try {
    const { projectName, mainItemName, pmsType, startDate, totalQty, steps } = req.body;
    const count = await PmsTask.countDocuments();
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const uniqueId = `PMS-${dateStr}-${String(count + 1).padStart(3, '0')}`;

    const newTask = new PmsTask({
      uniqueId,
      projectName,
      mainItemName,
      pmsType,
      startDate,
      totalQty,
      steps
    });

    await newTask.save();
    res.json({ success: true, data: newTask });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/pms/update-package', async (req, res) => {
  try {
    const { uniqueId, projectName, mainItemName, pmsType, startDate, totalQty, steps } = req.body;
    const task = await PmsTask.findOne({ uniqueId });
    if (!task) return res.status(404).json({ success: false, error: 'Task not found' });

    task.projectName = projectName || task.projectName;
    task.mainItemName = mainItemName || task.mainItemName;
    task.pmsType = pmsType || task.pmsType;
    task.startDate = startDate || task.startDate;
    task.totalQty = totalQty || task.totalQty;
    task.steps = steps;

    await task.save();
    res.json({ success: true, data: task });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/pms/delete/:uniqueId', async (req, res) => {
  try {
    const { uniqueId } = req.params;
    await PmsTask.findOneAndDelete({ uniqueId });
    res.json({ success: true, message: 'Task package deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.patch('/api/pms/update-step', async (req, res) => {
  try {
    const { uniqueId, stepId, status, remarks } = req.body;
    const task = await PmsTask.findOne({ uniqueId });
    if (!task) return res.status(404).json({ success: false, error: 'Task not found' });

    const step = task.steps.id(stepId);
    if (!step) return res.status(404).json({ success: false, error: 'Step not found' });

    if (status) step.status = status;
    if (remarks !== undefined) step.remarks = remarks;

    await task.save();
    res.json({ success: true, data: task });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- SITES ROUTES ---
app.get('/api/sites', async (req, res) => {
  try {
    const sites = await Site.find({});
    res.json({ success: true, data: sites });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/sites', async (req, res) => {
  try {
    const newSite = new Site(req.body);
    await newSite.save();
    res.json({ success: true, data: newSite });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/sites/:id', async (req, res) => {
  try {
    const updated = await Site.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/sites/:id', async (req, res) => {
  try {
    await Site.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Site deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- DOERS ROUTES ---
app.get('/api/doers', async (req, res) => {
  try {
    const doers = await Doer.find({});
    res.json({ success: true, data: doers });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/doers', async (req, res) => {
  try {
    const newDoer = new Doer(req.body);
    await newDoer.save();
    res.json({ success: true, data: newDoer });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

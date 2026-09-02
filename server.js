const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));

const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://sharmaaakash7800:your_password@cluster0.mongodb.net/pms?retryWrites=true&w=majority";

mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('MongoDB Connected')).catch(err => console.log('DB Error:', err));

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

// Added isHidden field to siteSchema
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
  projectOwner: String,
  isHidden: { type: Boolean, default: false }
});

const doerSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  role: String
});

const vendorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true }
});

const settingSchema = new mongoose.Schema({
  key: { type: String, unique: true, required: true },
  value: mongoose.Schema.Types.Mixed
});

const PmsTask = mongoose.models.PmsTask || mongoose.model('PmsTask', pmsTaskSchema);
const Site = mongoose.models.Site || mongoose.model('Site', siteSchema);
const Doer = mongoose.models.Doer || mongoose.model('Doer', doerSchema);
const Vendor = mongoose.models.Vendor || mongoose.model('Vendor', vendorSchema);
const Setting = mongoose.models.Setting || mongoose.model('Setting', settingSchema);

async function triggerGoogleSheetSync(payload) {
  try {
    let webhookUrl = process.env.GOOGLE_SHEET_WEBHOOK_URL;
    if (!webhookUrl) {
      const setting = await Setting.findOne({ key: 'googleSheetWebhookUrl' });
      if (setting && setting.value) webhookUrl = setting.value;
    }
    if (!webhookUrl) return;

    if (typeof fetch === 'function') {
      fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(err => console.error('Google Sheet Sync Error:', err.message));
    }
  } catch (e) {
    console.error('Trigger GSheet Error:', e.message);
  }
}

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
    const { uniqueId, projectName, mainItemName, pmsType, startDate, totalQty, steps } = req.body;
    let finalUniqueId = (uniqueId && uniqueId.trim()) ? uniqueId.trim() : null;
    if (!finalUniqueId) {
      const count = await PmsTask.countDocuments();
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      finalUniqueId = `PMS-${dateStr}-${String(count + 1).padStart(3, '0')}`;
    }

    const newTask = new PmsTask({ uniqueId: finalUniqueId, projectName, mainItemName, pmsType, startDate, totalQty, steps });
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

    if (Array.isArray(steps)) {
      const existingById = new Map();
      const existingByWbs = new Map();
      if (task.steps) {
        task.steps.forEach(s => {
          if (s._id) existingById.set(String(s._id), s);
          if (s.wbsNo) existingByWbs.set(String(s.wbsNo), s);
        });
      }

      task.steps = steps.map(newStep => {
        let existing = null;
        if (newStep._id && existingById.has(String(newStep._id))) {
          existing = existingById.get(String(newStep._id));
        } else if (newStep.wbsNo && existingByWbs.has(String(newStep.wbsNo))) {
          existing = existingByWbs.get(String(newStep.wbsNo));
        }

        return {
          _id: newStep._id || (existing ? existing._id : undefined),
          wbsNo: newStep.wbsNo,
          stepTitle: newStep.stepTitle,
          assignedName: newStep.assignedName,
          assignedEmail: newStep.assignedEmail,
          durationDays: newStep.durationDays,
          plannedStartDate: newStep.plannedStartDate,
          plannedEndDate: newStep.plannedEndDate,
          actualStartDate: newStep.actualStartDate || (existing ? existing.actualStartDate : undefined),
          actualEndDate: newStep.actualEndDate || (existing ? existing.actualEndDate : undefined),
          status: newStep.status || (existing ? existing.status : 'Pending'),
          remarks: (newStep.remarks !== undefined && newStep.remarks !== '') ? newStep.remarks : (existing ? existing.remarks : '')
        };
      });
    }

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
    const { uniqueId, stepId, status, remarks, actualEndDate, actualStartDate, attachmentUrl } = req.body;
    const task = await PmsTask.findOne({ uniqueId });
    if (!task) return res.status(404).json({ success: false, error: 'Task not found' });

    const step = task.steps.id(stepId);
    if (!step) return res.status(404).json({ success: false, error: 'Step not found' });

    if (status) step.status = status;
    if (remarks !== undefined) step.remarks = remarks;
    if (actualEndDate !== undefined) step.actualEndDate = actualEndDate;
    if (actualStartDate !== undefined) step.actualStartDate = actualStartDate;
    if (attachmentUrl !== undefined) step.attachmentUrl = attachmentUrl;

    await task.save();

    triggerGoogleSheetSync({
      action: 'UPDATE_STEP',
      uniqueId: task.uniqueId,
      projectName: task.projectName,
      mainItemName: task.mainItemName,
      wbsNo: step.wbsNo,
      stepTitle: step.stepTitle,
      assignedName: step.assignedName,
      assignedEmail: step.assignedEmail,
      status: step.status,
      remarks: step.remarks,
      actualStartDate: step.actualStartDate,
      actualEndDate: step.actualEndDate,
      attachmentUrl: step.attachmentUrl
    });

    res.json({ success: true, data: task });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

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

app.get('/api/vendors', async (req, res) => {
  try {
    const vendors = await Vendor.find({});
    res.json({ success: true, data: vendors });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/vendors', async (req, res) => {
  try {
    const { name, phone } = req.body;
    const newVendor = new Vendor({ name, phone });
    await newVendor.save();
    res.json({ success: true, data: newVendor });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/vendors/:id', async (req, res) => {
  try {
    const { name, phone } = req.body;
    const updatedVendor = await Vendor.findByIdAndUpdate(req.params.id, { name, phone }, { new: true });
    res.json({ success: true, data: updatedVendor });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/vendors/:id', async (req, res) => {
  try {
    await Vendor.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Vendor deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/settings', async (req, res) => {
  try {
    const settings = await Setting.find({});
    const map = {};
    settings.forEach(s => map[s.key] = s.value);
    res.json({ success: true, data: map });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/settings', async (req, res) => {
  try {
    const { key, value } = req.body;
    if (!key) return res.status(400).json({ success: false, error: 'Key required' });
    const setting = await Setting.findOneAndUpdate({ key }, { key, value }, { upsert: true, new: true });
    res.json({ success: true, data: setting });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/pms/sync-gsheet', async (req, res) => {
  try {
    const payload = req.body;
    await triggerGoogleSheetSync(payload);
    res.json({ success: true, message: 'Google Sheet sync triggered' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));


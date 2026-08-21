const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// MongoDB Connection (Apna connection string yahan check kar lein agar alag hai)
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://sharmaaakash7800:your_password@cluster0.mongodb.net/pms?retryWrites=true&w=majority";

mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('MongoDB Connected')).catch(err => console.log('DB Error:', err));

// Define Schema Directly in server.js to avoid Missing Model errors
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

const PmsTask = mongoose.models.PmsTask || mongoose.model('PmsTask', pmsTaskSchema);

// PUT: Update an existing task package and its steps
app.put('/api/pms/update-package', async (req, res) => {
  try {
    const { uniqueId, projectName, mainItemName, pmsType, startDate, totalQty, steps } = req.body;
    
    const task = await PmsTask.findOne({ uniqueId });
    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    task.projectName = projectName || task.projectName;
    task.mainItemName = mainItemName || task.mainItemName;
    task.pmsType = pmsType || task.pmsType;
    task.startDate = startDate || task.startDate;
    task.totalQty = totalQty || task.totalQty;
    task.steps = steps; // Overwrite old steps with updated array

    await task.save();
    res.json({ success: true, data: task });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE: Delete task package
app.delete('/api/pms/delete/:uniqueId', async (req, res) => {
  try {
    const { uniqueId } = req.params;
    await PmsTask.findOneAndDelete({ uniqueId });
    res.json({ success: true, message: 'Task package deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET: Fetch all PMS tasks
app.get('/api/pms/all', async (req, res) => {
  try {
    const tasks = await PmsTask.find({});
    res.json({ success: true, data: tasks });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

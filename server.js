const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// PmsTask Schema & Model (Ensure these are defined)
const PmsTask = require('./models/PmsTask'); // Assuming your model path

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
    task.steps = steps; // This will overwrite existing steps with the new array

    await task.save();
    res.json({ success: true, data: task });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE: Delete task
app.delete('/api/pms/delete/:uniqueId', async (req, res) => {
  try {
    const { uniqueId } = req.params;
    await PmsTask.findOneAndDelete({ uniqueId });
    res.json({ success: true, message: 'Task package deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

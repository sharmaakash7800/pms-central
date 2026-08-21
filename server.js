// PUT: Update an existing task package and its steps
app.put('/api/pms/update-package', async (req, res) => {
  try {
    const { uniqueId, projectName, mainItemName, pmsType, startDate, totalQty, steps } = req.body;
    
    // Find the task by uniqueId
    const task = await PmsTask.findOne({ uniqueId });
    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found in database.' });
    }

    // Update main task fields
    task.projectName = projectName || task.projectName;
    task.mainItemName = mainItemName || task.mainItemName;
    task.pmsType = pmsType || task.pmsType;
    task.startDate = startDate || task.startDate;
    task.totalQty = totalQty || task.totalQty;
    
    // Completely overwrite the old steps with the new updated steps
    task.steps = steps;

    // Save to database
    await task.save();
    
    res.json({ success: true, data: task });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

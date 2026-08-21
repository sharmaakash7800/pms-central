require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./db');
const { Doer, Vendor, Site, PmsTask } = require('./models');

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
        { name: 'Aarti Bala', email: 'aarti@domain.com', role: 'VRE' },
        { name: 'Heera Lal Ji', email: 'heeralal@domain.com', role: 'Technical Person' },
        { name: 'Ronak Ji', email: 'ronak@domain.com', role: 'Purchaser Person' },
        { name: 'Tulsi Sen', email: 'tulsi@domain.com', role: 'Process Coordinator' }
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

app.put('/api/doers/:id', async (req, res) => {
  try {
    const { name, email, role, phone } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'Name and Email required.' });

    const updated = await Doer.findByIdAndUpdate(
      req.params.id,
      {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        role: role ? role.trim() : 'Executive',
        phone: phone || ''
      },
      { new: true }
    );

    if (!updated) return res.status(404).json({ error: 'Member not found' });
    res.json({ success: true, data: updated });
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

// ---------------- SITE / PROJECT MASTER APIS ----------------
app.get('/api/sites', async (req, res) => {
  try {
    let sites = await Site.find().sort({ siteName: 1 });
    if (sites.length === 0) {
      const defaultSites = [
        { siteName: 'EV Charging_CLZS', projectTitle: 'SUPPLY PMS: EV Charging', poNumber: '5100033887' },
        { siteName: 'DSC Smelter' }, { siteName: 'DSC Common-RD' }, { siteName: 'SKM' },
        { siteName: 'Debari' }, { siteName: 'Zawar' }, { siteName: 'HO' }, { siteName: 'Agucha' },
        { siteName: 'All Site Cable Tray' }, { siteName: 'NFA_PO' }
      ];
      sites = await Site.insertMany(defaultSites);
    }
    res.json({ success: true, data: sites });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/sites', async (req, res) => {
  try {
    const { siteName, companyName, projectTitle, poNumber, dataEntryOperator, processCoordinator, technicalPerson, purchaserPerson, vrePerson, projectOwner } = req.body;
    if (!siteName) return res.status(400).json({ error: 'Site name is required.' });

    const existing = await Site.findOne({ siteName: siteName.trim() });
    if (existing) return res.status(400).json({ error: 'Site already exists.' });

    const newSite = new Site({
      siteName: siteName.trim(),
      companyName: companyName || 'MAHESHWARI DISTRIBUTORS',
      projectTitle: projectTitle || '',
      poNumber: poNumber || '',
      dataEntryOperator: dataEntryOperator || '',
      processCoordinator: processCoordinator || 'Tulsi Sen',
      technicalPerson: technicalPerson || 'Heera lal Ji (8003698656)',
      purchaserPerson: purchaserPerson || 'Ronak Ji (8107688615)',
      vrePerson: vrePerson || 'Aarti Bala (8824133320)',
      projectOwner: projectOwner || ''
    });

    await newSite.save();
    res.status(201).json({ success: true, data: newSite });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/sites/:id', async (req, res) => {
  try {
    const { siteName, companyName, projectTitle, poNumber, dataEntryOperator, processCoordinator, technicalPerson, purchaserPerson, vrePerson, projectOwner } = req.body;
    const oldSite = await Site.findById(req.params.id);
    if (!oldSite) return res.status(404).json({ error: 'Site not found.' });

    if (siteName && siteName.trim() !== oldSite.siteName) {
      await PmsTask.updateMany({ projectName: oldSite.siteName }, { $set: { projectName: siteName.trim() } });
    }

    const updated = await Site.findByIdAndUpdate(
      req.params.id,
      {
        siteName: siteName ? siteName.trim() : oldSite.siteName,
        companyName: companyName || oldSite.companyName,
        projectTitle: projectTitle !== undefined ? projectTitle : oldSite.projectTitle,
        poNumber: poNumber !== undefined ? poNumber : oldSite.poNumber,
        dataEntryOperator: dataEntryOperator !== undefined ? dataEntryOperator : oldSite.dataEntryOperator,
        processCoordinator: processCoordinator !== undefined ? processCoordinator : oldSite.processCoordinator,
        technicalPerson: technicalPerson !== undefined ? technicalPerson : oldSite.technicalPerson,
        purchaserPerson: purchaserPerson !== undefined ? purchaserPerson : oldSite.purchaserPerson,
        vrePerson: vrePerson !== undefined ? vrePerson : oldSite.vrePerson,
        projectOwner: projectOwner !== undefined ? projectOwner : oldSite.projectOwner
      },
      { new: true }
    );

    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/sites/:id', async (req, res) => {
  try {
    const site = await Site.findById(req.params.id);
    if (site) {
      await Site.findByIdAndDelete(req.params.id);
    }
    res.json({ success: true, message: 'Site deleted successfully.' });
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

app.patch('/api/pms/update-step', async (req, res) => {
  try {
    const { uniqueId, stepId, status, remarks, receivedQty, attachmentUrl, vendorDetails } = req.body;

    const task = await PmsTask.findOne({ uniqueId });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const sortedSteps = [...task.steps].sort((a, b) => (parseInt(a.wbsNo, 10) || 0) - (parseInt(b.wbsNo, 10) || 0));
    const targetIndex = sortedSteps.findIndex(s => s._id.toString() === stepId.toString());

    if (targetIndex === -1) return res.status(404).json({ error: 'Step not found' });

    if (status === 'Completed' && targetIndex > 0) {
      const prevStep = sortedSteps[targetIndex - 1];
      if (prevStep.status !== 'Completed') {
        return res.status(400).json({
          error: `Sequential Lock: Cannot complete Step #${sortedSteps[targetIndex].wbsNo} because previous Step #${prevStep.wbsNo} (${prevStep.stepTitle}) is not yet Completed.`
        });
      }
    }

    const stepToUpdate = task.steps.id(stepId);
    stepToUpdate.status = status;
    stepToUpdate.remarks = remarks;
    stepToUpdate.receivedQty = Number(receivedQty) || 0;
    stepToUpdate.attachmentUrl = attachmentUrl || '';

    if (status === 'Completed') {
      stepToUpdate.actualEndDate = new Date();
    } else {
      stepToUpdate.actualEndDate = null;
    }

    if (vendorDetails) {
      stepToUpdate.vendorDetails = vendorDetails;
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

    await task.save();
    res.json({ success: true, data: task });
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

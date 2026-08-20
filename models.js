const mongoose = require('mongoose');

const StepTemplateSchema = new mongoose.Schema({
  pmsType: { type: String, enum: ['SUPPLY', 'SERVICE'], required: true },
  stepNo: { type: String, required: true },
  stepTitle: { type: String, required: true },
  defaultOwnerEmail: { type: String, default: '' },
  defaultOwnerName: { type: String, default: '' },
  defaultDurationDays: { type: Number, default: 1 }
}, { timestamps: true });

const SubStepSchema = new mongoose.Schema({
  wbsNo: { type: String, required: true },
  stepTitle: { type: String, required: true },
  assignedEmail: { type: String, required: true, index: true },
  assignedName: { type: String, default: '' },
  plannedStartDate: { type: Date, required: true },
  plannedEndDate: { type: Date, required: true },
  actualStartDate: { type: Date },
  actualEndDate: { type: Date },
  durationDays: { type: Number, required: true },
  status: { type: String, default: 'Pending', enum: ['Pending', 'In Progress', 'Completed', 'Delayed'] },
  remarks: { type: String, default: '' },
  receivedQty: { type: Number, default: 0 },
  attachmentUrl: { type: String, default: '' },
  percentComplete: { type: Number, default: 0 }
});

const PmsTaskSchema = new mongoose.Schema({
  uniqueId: { type: String, required: true, unique: true, index: true },
  projectName: { type: String, required: true },
  pmsType: { type: String, enum: ['SUPPLY', 'SERVICE'], required: true },
  mainItemName: { type: String, required: true },
  startDate: { type: Date, required: true },
  totalQty: { type: Number, default: 1 },
  sheetId: { type: String, default: '' },
  steps: [SubStepSchema]
}, { timestamps: true });

module.exports = {
  StepTemplate: mongoose.model('StepTemplate', StepTemplateSchema),
  PmsTask: mongoose.model('PmsTask', PmsTaskSchema)
};
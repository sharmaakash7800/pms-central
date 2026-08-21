const mongoose = require('mongoose');

const DoerSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  role: { type: String, default: 'Executive' },
  phone: { type: String, default: '' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const VendorSchema = new mongoose.Schema({
  vendorName: { type: String, required: true, trim: true },
  contactPerson: { type: String, default: '' },
  phone: { type: String, default: '' },
  email: { type: String, default: '' },
  poNumber: { type: String, default: '' },
  relatedTaskId: { type: String, default: '' },
  itemName: { type: String, default: '' }
}, { timestamps: true });

// Dedicated Site Master Schema with All Requested Metadata
const SiteSchema = new mongoose.Schema({
  siteName: { type: String, required: true, unique: true, trim: true },
  companyName: { type: String, default: 'MAHESHWARI DISTRIBUTORS' },
  projectTitle: { type: String, default: '' },
  poNumber: { type: String, default: '' },
  dataEntryOperator: { type: String, default: '' },
  processCoordinator: { type: String, default: 'Tulsi Sen' },
  technicalPerson: { type: String, default: 'Heera lal Ji (8003698656)' },
  purchaserPerson: { type: String, default: 'Ronak Ji (8107688615)' },
  vrePerson: { type: String, default: 'Aarti Bala (8824133320)' },
  projectOwner: { type: String, default: '' }
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
  vendorDetails: {
    vendorName: { type: String, default: '' },
    contactPerson: { type: String, default: '' },
    phone: { type: String, default: '' },
    poNumber: { type: String, default: '' }
  }
});

const PmsTaskSchema = new mongoose.Schema({
  uniqueId: { type: String, required: true, unique: true, index: true },
  projectName: { type: String, required: true },
  pmsType: { type: String, enum: ['SUPPLY', 'SERVICE'], required: true },
  mainItemName: { type: String, required: true },
  startDate: { type: Date, required: true },
  totalQty: { type: Number, default: 1 },
  steps: [SubStepSchema]
}, { timestamps: true });

module.exports = {
  Doer: mongoose.model('Doer', DoerSchema),
  Vendor: mongoose.model('Vendor', VendorSchema),
  Site: mongoose.model('Site', SiteSchema),
  PmsTask: mongoose.model('PmsTask', PmsTaskSchema)
};

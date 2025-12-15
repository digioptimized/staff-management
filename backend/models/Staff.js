const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  clickedItem: {
    type: String,
    required: false,
    default: 'Pending'
  },
  teamId: {
    type: Number,
    required: false,
    min: 0,
    max: 4,
    default: 0
  },
  teamName: {
    type: String,
    required: false,
    default: 'Pending'
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Staff', staffSchema);

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');

dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://staff-management-ozdp.vercel.app', 'https://staff-management-ikjw.vercel.app', 'https://staff-management-ddlv.vercel.app']
    : 'http://localhost:3000',
  credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/staff-teams';

mongoose.connect(MONGODB_URI)
.then(() => console.log('✅ MongoDB Connected Successfully'))
.catch(err => console.error('❌ MongoDB Connection Error:', err));

// Models
const Staff = require('./models/Staff');

// Team items configuration
const teamItems = [
  { id: 1, label: 'Red', color: '#e74c3c' },
  { id: 2, label: 'Blue', color: '#3498db' },
  { id: 3, label: 'Green', color: '#2ecc71' },
  { id: 4, label: 'Yellow', color: '#f39c12' }
];

// Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Get all staff
app.get('/api/staff', async (req, res) => {
  try {
    const staff = await Staff.find().sort({ timestamp: -1 });
    res.json(staff);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get team statistics
app.get('/api/stats', async (req, res) => {
  try {
    const staff = await Staff.find({ teamId: { $gt: 0 } });
    const stats = teamItems.map(team => ({
      ...team,
      count: staff.filter(s => s.teamId === team.id).length
    }));
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Register staff on login (without team assignment)
app.post('/api/staff/register', async (req, res) => {
  try {
    const { name, email } = req.body;

    // Check if user already exists
    const existingStaff = await Staff.findOne({ email });
    if (existingStaff) {
      return res.json({
        success: true,
        staff: existingStaff,
        message: 'User already registered'
      });
    }

    // Create new staff entry without team assignment
    const newStaff = new Staff({
      name,
      email,
      clickedItem: 'Pending',
      teamId: 0,
      teamName: 'Pending'
    });

    await newStaff.save();

    res.status(201).json({
      success: true,
      staff: newStaff,
      message: 'User registered successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Register staff and assign to team
app.post('/api/staff', async (req, res) => {
  try {
    const { name, email, clickedItem, staffId } = req.body;

    // Get all existing staff with assigned teams
    const allStaff = await Staff.find({ teamId: { $gt: 0 } });
    
    // Count team sizes
    const teamCounts = [0, 0, 0, 0];
    allStaff.forEach(staff => {
      if (staff.teamId > 0) {
        teamCounts[staff.teamId - 1]++;
      }
    });

    // Find team(s) with minimum count
    const minCount = Math.min(...teamCounts);
    const teamsWithMinCount = teamCounts
      .map((count, index) => count === minCount ? index : -1)
      .filter(index => index !== -1);

    // Randomly select from teams with minimum count
    const randomTeamIndex = teamsWithMinCount[
      Math.floor(Math.random() * teamsWithMinCount.length)
    ];
    const assignedTeamId = randomTeamIndex + 1;
    const assignedTeam = teamItems[randomTeamIndex];

    // Update existing staff entry if staffId provided, otherwise create new
    let updatedStaff;
    if (staffId) {
      updatedStaff = await Staff.findByIdAndUpdate(
        staffId,
        {
          clickedItem,
          teamId: assignedTeamId,
          teamName: assignedTeam.label
        },
        { new: true }
      );
    } else {
      updatedStaff = new Staff({
        name,
        email,
        clickedItem,
        teamId: assignedTeamId,
        teamName: assignedTeam.label
      });
      await updatedStaff.save();
    }

    res.status(201).json({
      success: true,
      staff: updatedStaff,
      assignedTeam: assignedTeam
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete all staff (admin only)
app.delete('/api/staff', async (req, res) => {
  try {
    await Staff.deleteMany({});
    res.json({ success: true, message: 'All staff data cleared' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get team configuration
app.get('/api/teams', (req, res) => {
  res.json(teamItems);
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

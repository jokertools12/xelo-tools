const asyncHandler = require('express-async-handler');
const pool = require('../config/mysql');

// @desc    Extract user data from Data_Secret table
// @route   POST /api/extract-user-data
// @access  Private
const extractUserData = asyncHandler(async (req, res) => {
  const { userIds } = req.body;
  
  // Validate input
  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    res.status(400);
    throw new Error('يرجى تقديم معرفات المستخدمين المطلوبة');
  }

  try {
    // Format the user IDs for SQL query
    const formattedIds = userIds.map(id => id.toString().trim());
    
    // Query the Data_Secret table for the user data
    const [rows] = await pool.query(
      'SELECT * FROM Data_Secret WHERE id_User IN (?)',
      [formattedIds]
    );
    
    res.json({
      success: true,
      users: rows
    });
  } catch (error) {
    console.error('Error extracting user data:', error);
    res.status(500);
    throw new Error(`حدث خطأ أثناء استخراج بيانات المستخدمين: ${error.message}`);
  }
});

module.exports = { extractUserData };
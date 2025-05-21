const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
require('dotenv').config();

/**
 * This script fixes any achievement transactions with negative amounts by converting them to positive values.
 * It scans the database for transactions of type 'achievement' with negative amounts and updates them.
 */
async function fixAchievementTransactions() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('Connected to MongoDB');
    
    // Find all achievement transactions with negative amounts
    const negativeTransactions = await Transaction.find({
      type: 'achievement',
      amount: { $lt: 0 }
    });
    
    console.log(`Found ${negativeTransactions.length} achievement transactions with negative amounts`);
    
    if (negativeTransactions.length === 0) {
      console.log('No negative achievement transactions found. All data is correct.');
      process.exit(0);
    }
    
    // Update each transaction to have a positive amount
    let updatedCount = 0;
    
    for (const transaction of negativeTransactions) {
      const originalAmount = transaction.amount;
      transaction.amount = Math.abs(transaction.amount);
      
      await transaction.save();
      
      console.log(`Updated transaction ${transaction._id}: ${originalAmount} -> ${transaction.amount}`);
      updatedCount++;
    }
    
    console.log(`Successfully updated ${updatedCount} achievement transactions`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error fixing achievement transactions:', error);
    process.exit(1);
  }
}

// Run the function
fixAchievementTransactions();
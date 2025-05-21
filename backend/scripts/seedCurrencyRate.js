/**
 * Script to seed default currency exchange rate into the database
 * Run with: node backend/scripts/seedCurrencyRate.js
 */

// Load environment variables
require('dotenv').config();

const mongoose = require('mongoose');
const CurrencyRate = require('../models/CurrencyRate');

// MongoDB connection string
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('MongoDB URI is not defined in environment variables');
  console.error('Please make sure your .env file contains a MONGO_URI variable');
  process.exit(1);
}

// Connect to database
mongoose
  .connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => console.log('MongoDB Connected...'))
  .catch(err => {
    console.error('Failed to connect to MongoDB', err);
    process.exit(1);
  });

// Default currency exchange rate
const defaultRate = {
  baseCurrency: 'USD',
  targetCurrency: 'EGP',
  rate: 52.0, // 1 USD = 52 EGP
  note: 'Initial exchange rate',
  isActive: true
};

// Function to seed currency rate
const seedCurrencyRate = async () => {
  try {
    // Check if a rate already exists
    const count = await CurrencyRate.countDocuments();
    
    if (count > 0) {
      console.log(`${count} currency rates already exist. Do you want to add a new rate? (y/n)`);
      // In an interactive environment, you would wait for user input here
      // For simplicity in this script, we'll just log and proceed
      console.log('Proceeding with updating exchange rate...');
      
      // Find the current active rate
      const currentActiveRate = await CurrencyRate.findOne({ isActive: true });
      
      if (currentActiveRate) {
        console.log(`Current active rate: 1 ${currentActiveRate.baseCurrency} = ${currentActiveRate.rate} ${currentActiveRate.targetCurrency}`);
        
        // Create a new rate
        defaultRate.note = `Updated exchange rate (previous: ${currentActiveRate.rate})`;
      }
    }
    
    // Insert new rate (will automatically set previous rates to inactive)
    const result = await CurrencyRate.create(defaultRate);
    console.log(`Successfully set exchange rate: 1 ${result.baseCurrency} = ${result.rate} ${result.targetCurrency}`);
    
    mongoose.disconnect();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error seeding currency rate:', error);
    mongoose.disconnect();
    process.exit(1);
  }
};

// Run the seeding function
seedCurrencyRate();
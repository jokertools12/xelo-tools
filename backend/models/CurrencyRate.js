const mongoose = require('mongoose');

const currencyRateSchema = mongoose.Schema({
  // Base currency is USD
  baseCurrency: {
    type: String,
    default: 'USD',
    required: true
  },
  // Target currency is EGP
  targetCurrency: {
    type: String,
    default: 'EGP',
    required: true
  },
  // Exchange rate (1 USD = X EGP)
  rate: {
    type: Number,
    required: true,
    min: 0
  },
  // Admin who updated the rate
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Optional note about rate update
  note: {
    type: String
  },
  // Flag to indicate if this is the active rate
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Ensure only one active rate at a time
currencyRateSchema.pre('save', async function(next) {
  if (this.isActive) {
    // Set all other rates to inactive
    await this.constructor.updateMany(
      { _id: { $ne: this._id }, isActive: true },
      { isActive: false }
    );
  }
  next();
});

// Create index for faster queries
currencyRateSchema.index({ isActive: 1 });

const CurrencyRate = mongoose.model('CurrencyRate', currencyRateSchema);

module.exports = CurrencyRate;
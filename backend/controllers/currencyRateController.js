const asyncHandler = require('express-async-handler');
const CurrencyRate = require('../models/CurrencyRate');
const UserAction = require('../models/UserAction');

// @desc    Get current exchange rate
// @route   GET /api/currency-rates/current
// @access  Public
const getCurrentRate = asyncHandler(async (req, res) => {
  try {
    const rate = await CurrencyRate.findOne({ isActive: true }).sort({ createdAt: -1 });
    
    if (!rate) {
      // If no rate exists, create a default one (52 EGP per 1 USD)
      const defaultRate = await CurrencyRate.create({
        rate: 52.0,
        note: 'Default exchange rate',
        isActive: true
      });
      
      return res.json(defaultRate);
    }
    
    res.json(rate);
  } catch (error) {
    console.error('Error fetching current exchange rate:', error);
    res.status(500);
    throw new Error('حدث خطأ أثناء جلب سعر الصرف الحالي');
  }
});

// @desc    Get exchange rate history
// @route   GET /api/currency-rates/history
// @access  Admin
const getRateHistory = asyncHandler(async (req, res) => {
  try {
    const history = await CurrencyRate.find()
      .sort({ createdAt: -1 })
      .populate('updatedBy', 'name username');
    
    res.json(history);
  } catch (error) {
    console.error('Error fetching exchange rate history:', error);
    res.status(500);
    throw new Error('حدث خطأ أثناء جلب سجل أسعار الصرف');
  }
});

// @desc    Update exchange rate
// @route   POST /api/currency-rates
// @access  Admin
const updateExchangeRate = asyncHandler(async (req, res) => {
  try {
    const { rate, note } = req.body;
    
    if (!rate || rate <= 0) {
      res.status(400);
      throw new Error('يرجى تقديم سعر صرف صالح');
    }
    
    // Create new exchange rate
    const newRate = await CurrencyRate.create({
      rate,
      note: note || `تحديث سعر الصرف إلى ${rate} جنيه مصري لكل دولار أمريكي`,
      updatedBy: req.user._id,
      isActive: true
    });
    
    // Log admin action
    await UserAction.create({
      userId: req.user._id,
      actionType: 'settings',
      details: {
        action: 'update_exchange_rate',
        oldRate: req.body.oldRate,
        newRate: rate,
        note: note || `تحديث سعر الصرف من ${req.body.oldRate} إلى ${rate}`,
        isAdminAction: true
      },
      module: 'settings'
    });
    
    res.status(201).json({
      message: 'تم تحديث سعر الصرف بنجاح',
      rate: newRate
    });
  } catch (error) {
    console.error('Error updating exchange rate:', error);
    res.status(error.statusCode || 500);
    throw new Error(error.message || 'حدث خطأ أثناء تحديث سعر الصرف');
  }
});

// @desc    Convert USD to EGP
// @route   GET /api/currency-rates/convert
// @access  Public
const convertUsdToEgp = asyncHandler(async (req, res) => {
  try {
    const { amount } = req.query;
    
    if (!amount || isNaN(amount)) {
      res.status(400);
      throw new Error('يرجى تقديم مبلغ صالح للتحويل');
    }
    
    // Get current exchange rate
    const rate = await CurrencyRate.findOne({ isActive: true }).sort({ createdAt: -1 });
    
    if (!rate) {
      // If no rate exists, use a default rate (52 EGP per 1 USD)
      const egpAmount = parseFloat(amount) * 52.0;
      
      return res.json({
        usdAmount: parseFloat(amount),
        egpAmount,
        rate: 52.0,
        isDefaultRate: true
      });
    }
    
    // Calculate EGP amount
    const egpAmount = parseFloat(amount) * rate.rate;
    
    res.json({
      usdAmount: parseFloat(amount),
      egpAmount,
      rate: rate.rate,
      updatedAt: rate.updatedAt
    });
  } catch (error) {
    console.error('Error converting currency:', error);
    res.status(error.statusCode || 500);
    throw new Error(error.message || 'حدث خطأ أثناء تحويل العملة');
  }
});

module.exports = {
  getCurrentRate,
  getRateHistory,
  updateExchangeRate,
  convertUsdToEgp
};
const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const pageMessageController = require('../../controllers/pageMessageController');
const pageMessageCampaignController = require('../../controllers/pageMessageCampaignController');

// Page Message Routes
router.route('/tokens')
  .get(protect, pageMessageController.getUserAccessTokens);

router.route('/extract-pages')
  .post(protect, pageMessageController.extractPages)
  .get(protect, pageMessageController.extractPages);

router.route('/extract-senders')
  .post(protect, pageMessageController.extractMessageSenders)
  .get(protect, pageMessageController.extractMessageSenders);

router.route('/pages')
  .get(protect, pageMessageController.getExtractedPages);

router.route('/senders/:pageId')
  .get(protect, pageMessageController.getPageSenders);

router.route('/send')
  .post(protect, pageMessageController.sendMessage);

router.route('/bulk-send')
  .post(protect, pageMessageController.bulkSendMessage);

// Queue status endpoint
router.route('/queue-status')
  .get(protect, pageMessageController.getQueueStatus);

// Page Message Campaign Routes
router.route('/campaigns')
  .get(protect, pageMessageCampaignController.getUserCampaigns)
  .post(protect, pageMessageCampaignController.createCampaign);

router.route('/campaigns/:id')
  .get(protect, pageMessageCampaignController.getCampaign)
  .put(protect, pageMessageCampaignController.updateCampaign)
  .delete(protect, pageMessageCampaignController.deleteCampaign);

router.route('/campaigns/:id/recipients')
  .post(protect, pageMessageCampaignController.addRecipients)
  .delete(protect, pageMessageCampaignController.removeRecipients);

router.route('/campaigns/:id/reschedule')
  .post(protect, pageMessageCampaignController.rescheduleCampaign);

router.route('/campaigns/:id/pause')
  .post(protect, pageMessageCampaignController.pauseCampaign);

router.route('/campaigns/:id/resume')
  .post(protect, pageMessageCampaignController.resumeCampaign);

router.route('/campaigns/:id/cancel')
  .post(protect, pageMessageCampaignController.cancelCampaign);

router.route('/campaigns/:id/stats')
  .get(protect, pageMessageCampaignController.getCampaignStats);

// مسارات استرداد النقاط للرسائل الفاشلة
router.route('/campaigns/:id/refund-failed')
  .post(protect, pageMessageCampaignController.refundFailedMessages);

// مسار معالجة الاكتمال التلقائي واسترداد النقاط
router.route('/campaigns/:id/process-completion')
  .post(protect, pageMessageCampaignController.processCompletion);


module.exports = router;
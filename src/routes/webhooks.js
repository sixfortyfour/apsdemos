const express = require('express');
const { APS_WEBHOOK_SECRET } = require('../config');
const { recordFinished } = require('../services/webhookEvents');
const { createModelDerivativeWebhookHandler } = require('./webhookHandlers');

let router = express.Router();

router.post('/api/webhooks/model-derivative', createModelDerivativeWebhookHandler(APS_WEBHOOK_SECRET, recordFinished));

module.exports = router;

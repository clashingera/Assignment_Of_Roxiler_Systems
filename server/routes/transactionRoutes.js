// server/routes/transactionRoutes.js
const express = require('express');
const {
    listTransactions,
    getStatistics,
    getBarChart,
    getPieChart,
    getCombinedData,
    initializeDB,
} = require('../controllers/transactionController');

const router = express.Router();

// Define your routes
router.get('/transactions', listTransactions);
router.get('/statistics', getStatistics);
router.get('/bar-chart', getBarChart);
router.get('/pie-chart', getPieChart);
router.get('/combined-data', getCombinedData);
router.get('/initialize', initializeDB);

module.exports = router;

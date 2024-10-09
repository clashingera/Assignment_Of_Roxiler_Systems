// server/controllers/transactionController.js
const axios = require('axios'); // This should appear only once at the top
const Transaction = require('../models/Transaction');


// List transactions with pagination and search
const listTransactions = async (req, res) => {
    const { month, page = 1, perPage = 10, search = '' } = req.query;

    const monthIndex = new Date(Date.parse(month + " 1, 2020")).getMonth() + 1; // Months are 1-12

    const query = {
        $expr: {
            $eq: [{ $month: '$dateOfSale' }, monthIndex]
        }
    };

    if (search) {
        query.$and = [
            query.$expr,
            {
                $or: [
                    { title: { $regex: search, $options: 'i' } },
                    { description: { $regex: search, $options: 'i' } },
                    { price: { $regex: search } }
                ]
            }
        ];
        delete query.$expr;
    }

    const transactions = await Transaction.find(query)
        .skip((page - 1) * perPage)
        .limit(parseInt(perPage));

    const total = await Transaction.countDocuments(query);

    res.json({ transactions, total });
};

// server/controllers/transactionController.js

const initializeDB = async (req, res) => {
    try {
        const response = await axios.get('https://s3.amazonaws.com/roxiler.com/product_transaction.json');
        
        console.log('API Response:', response.data); // Log the API response to check if data is received
        
        const transactions = response.data;

        // Clear existing data (optional)
        await Transaction.deleteMany({});
        
        // Insert the new data into the MongoDB collection
        await Transaction.insertMany(transactions);

        res.status(200).json({ message: 'Database initialized with seed data' });
    } catch (error) {
        console.error('Error initializing database:', error.message); // Log error message
        res.status(500).json({ message: 'Error initializing database', error: error.message });
    }
};

module.exports = {
    initializeDB,
    // Add your other functions here
};

// Get statistics
const getStatistics = async (req, res) => {
    const { month } = req.query;

    const monthIndex = new Date(Date.parse(month + " 1, 2020")).getMonth() + 1;

    try {
        const pipeline = [
            {
                $match: {
                    $expr: {
                        $eq: [{ $month: '$dateOfSale' }, monthIndex]
                    }
                }
            },
            {
                $group: {
                    _id: null,
                    totalSaleAmount: { $sum: '$price' },
                    totalSoldItems: { $sum: { $cond: ['$sold', 1, 0] } },
                    totalNotSoldItems: { $sum: { $cond: ['$sold', 0, 1] } }
                }
            }
        ];

        const result = await Transaction.aggregate(pipeline);

        if (result.length > 0) {
            res.json(result[0]);
        } else {
            res.json({
                totalSaleAmount: 0,
                totalSoldItems: 0,
                totalNotSoldItems: 0
            });
        }
    } catch (error) {
        res.status(500).json({ error: 'Error fetching statistics.' });
    }
};

// Get bar chart data
const getBarChart = async (req, res) => {
    const { month } = req.query;

    const monthIndex = new Date(Date.parse(month + " 1, 2020")).getMonth() + 1;

    const priceRanges = [
        { label: '0-100', min: 0, max: 100 },
        { label: '101-200', min: 101, max: 200 },
        { label: '201-300', min: 201, max: 300 },
        { label: '301-400', min: 301, max: 400 },
        { label: '401-500', min: 401, max: 500 },
        { label: '501-600', min: 501, max: 600 },
        { label: '601-700', min: 601, max: 700 },
        { label: '701-800', min: 701, max: 800 },
        { label: '801-900', min: 801, max: 900 },
        { label: '901-above', min: 901, max: Number.MAX_SAFE_INTEGER }
    ];

    try {
        const data = await Promise.all(priceRanges.map(async range => {
            const count = await Transaction.countDocuments({
                $expr: {
                    $and: [
                        { $eq: [{ $month: '$dateOfSale' }, monthIndex] },
                        { $gte: ['$price', range.min] },
                        { $lte: ['$price', range.max] }
                    ]
                }
            });
            return { range: range.label, count };
        }));

        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching bar chart data.' });
    }
};

// Get pie chart data
const getPieChart = async (req, res) => {
    const { month } = req.query;

    const monthIndex = new Date(Date.parse(month + " 1, 2020")).getMonth() + 1;

    try {
        const pipeline = [
            {
                $match: {
                    $expr: {
                        $eq: [{ $month: '$dateOfSale' }, monthIndex]
                    }
                }
            },
            {
                $group: {
                    _id: '$category',
                    items: { $sum: 1 }
                }
            }
        ];

        const result = await Transaction.aggregate(pipeline);

        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching pie chart data.' });
    }
};

// Get combined data from the three APIs
const getCombinedData = async (req, res) => {
    try {
        const { month } = req.query;

        const [statistics, barChartData, pieChartData] = await Promise.all([
            getStatisticsData(month),
            getBarChartData(month),
            getPieChartData(month)
        ]);

        res.json({
            statistics,
            barChartData,
            pieChartData
        });
    } catch (error) {
        res.status(500).json({ error: 'Error fetching combined data.' });
    }
};

// Helper functions for combined data
const getStatisticsData = async (month) => {
    const monthIndex = new Date(Date.parse(month + " 1, 2020")).getMonth() + 1;

    const pipeline = [
        {
            $match: {
                $expr: {
                    $eq: [{ $month: '$dateOfSale' }, monthIndex]
                }
            }
        },
        {
            $group: {
                _id: null,
                totalSaleAmount: { $sum: '$price' },
                totalSoldItems: { $sum: { $cond: ['$sold', 1, 0] } },
                totalNotSoldItems: { $sum: { $cond: ['$sold', 0, 1] } }
            }
        }
    ];

    const result = await Transaction.aggregate(pipeline);

    if (result.length > 0) {
        return result[0];
    } else {
        return {
            totalSaleAmount: 0,
            totalSoldItems: 0,
            totalNotSoldItems: 0
        };
    }
};

const getBarChartData = async (month) => {
    const monthIndex = new Date(Date.parse(month + " 1, 2020")).getMonth() + 1;

    const priceRanges = [
        { label: '0-100', min: 0, max: 100 },
        { label: '101-200', min: 101, max: 200 },
        { label: '201-300', min: 201, max: 300 },
        { label: '301-400', min: 301, max: 400 },
        { label: '401-500', min: 401, max: 500 },
        { label: '501-600', min: 501, max: 600 },
        { label: '601-700', min: 601, max: 700 },
        { label: '701-800', min: 701, max: 800 },
        { label: '801-900', min: 801, max: 900 },
        { label: '901-above', min: 901, max: Number.MAX_SAFE_INTEGER }
    ];

    const data = await Promise.all(priceRanges.map(async range => {
        const count = await Transaction.countDocuments({
            $expr: {
                $and: [
                    { $eq: [{ $month: '$dateOfSale' }, monthIndex] },
                    { $gte: ['$price', range.min] },
                    { $lte: ['$price', range.max] }
                ]
            }
        });
        return { range: range.label, count };
    }));

    return data;
};

const getPieChartData = async (month) => {
    const monthIndex = new Date(Date.parse(month + " 1, 2020")).getMonth() + 1;

    const pipeline = [
        {
            $match: {
                $expr: {
                    $eq: [{ $month: '$dateOfSale' }, monthIndex]
                }
            }
        },
        {
            $group: {
                _id: '$category',
                items: { $sum: 1 }
            }
        }
    ];

    const result = await Transaction.aggregate(pipeline);

    return result;
};


module.exports = {
    listTransactions,
    initializeDB,
    getStatistics,
    getBarChart,
    getPieChart,
    initializeDB,
    getCombinedData,
};

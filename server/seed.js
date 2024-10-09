const mongoose = require('mongoose');
const axios = require('axios');
const Transaction = require('./models/Transaction');
const connectDB = require('./config/db');

connectDB();

const seedData = async () => {
    try {
        const response = await axios.get('https://s3.amazonaws.com/roxiler.com/product_transaction.json');
        const transactions = response.data.map(item => ({
            title: item.productTitle,
            description: item.productDescription,
            price: parseFloat(item.price),
            dateOfSale: new Date(item.dateOfSale),
            category: item.category,
            sold: item.sold === 'true',
        }));

        await Transaction.deleteMany({});
        await Transaction.insertMany(transactions);
        console.log('Database seeded!');
        mongoose.connection.close();
    } catch (err) {
        console.error(err);
        mongoose.connection.close();
    }
};

seedData();

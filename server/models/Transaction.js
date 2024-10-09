// server/models/Transaction.js
const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    id: { type: String, required: true },
    title: { type: String, required: true },
    price: { type: Number, required: true },
    description: { type: String },
    dateOfSale: { type: Date, required: true },
    category: { type: String, required: true },
    sold: { type: Boolean, required: true },
});

const Transaction = mongoose.model('Transaction', transactionSchema);
module.exports = Transaction;

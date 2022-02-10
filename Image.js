const mongoose = require('mongoose');

const ImageSchema = new mongoose.Schema(
    {
        img: {
            data: Buffer,
            contentType: String,
            to: String,
            from: String
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model('Images', ImageSchema);